import type * as Filesystem from "node:fs/promises";
import type * as OperatingSystem from "node:os";

import { EventEmitter } from "node:events";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const transport = vi.hoisted(() => ({
  git: vi.fn(),
  spawn: vi.fn(),
  database: vi.fn(),
  socket: vi.fn(),
  stagingRoot: vi.fn(),
  recordingPath: "",
}));

vi.mock("node:child_process", () => {
  const execFile = vi.fn();
  Object.defineProperty(execFile, Symbol.for("nodejs.util.promisify.custom"), { value: transport.git });
  return { execFile, spawn: transport.spawn };
});
vi.mock("../../packages/persistence/src/database.js", () => ({ createDatabase: transport.database }));
vi.mock("node:net", () => ({ createServer: transport.socket }));
vi.mock("node:os", async (original) => ({ ...await original<typeof OperatingSystem>(), tmpdir: transport.stagingRoot }));
vi.mock("node:fs/promises", async (original) => {
  const fs = await original<typeof Filesystem>();
  const redirect = (path: string) => /\/casebook\/recording\.json(?:\.[^/]+\.tmp)?$/.test(path)
    ? transport.recordingPath + path.slice(path.indexOf("/recording.json") + "/recording.json".length)
    : path;
  return {
    ...fs,
    writeFile: (path: string, data: string, options?: { flag: string }) => fs.writeFile(redirect(path), data, options),
    rename: (from: string, to: string) => fs.rename(redirect(from), redirect(to)),
    rm: (path: string, options: Parameters<typeof fs.rm>[1]) => fs.rm(redirect(path), options),
  };
});

import { capture } from "./capture.js";

const root = resolve(import.meta.dirname, "../..");
const priorRecording = "previous validated recording\n";
type Fault = "migration" | "server-signal" | "server-signal-after-ready" | "playwright" | "SIGINT" | "SIGTERM";

class OwnedChild extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  exitCode: number | null = null;
  signalCode: NodeJS.Signals | null = null;
  kill = vi.fn((signal: NodeJS.Signals) => {
    if (this.exitCode !== null || this.signalCode !== null) return false;
    queueMicrotask(() => this.finish(null, signal));
    return true;
  });

  finish(code: number | null, signal: NodeJS.Signals | null = null) {
    this.exitCode = code;
    this.signalCode = signal;
    this.emit("exit", code, signal);
  }
}

let directory: string;
let fault: Fault;
let server: OwnedChild | undefined;
let pending: Promise<void> | undefined;
let commands: Array<{ command: string; args: string[]; env: NodeJS.ProcessEnv }>;
let unsafe: ReturnType<typeof vi.fn>;
let close: ReturnType<typeof vi.fn>;
let initialSignalListeners: number[];

async function boundedCapture() {
  pending = capture();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      pending,
      new Promise<never>((_accept, reject) => {
        timer = setTimeout(() => reject(new Error("Capture did not finish owned cleanup after the server's exit event")), 2_500);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

beforeEach(async () => {
  vi.clearAllMocks();
  // Real filesystem staging is confined to this test's directory; production output is redirected too.
  const os = await vi.importActual<typeof OperatingSystem>("node:os");
  directory = await mkdtemp(join(os.tmpdir(), "oiw-capture-lifecycle-test-"));
  transport.recordingPath = join(directory, "recording.json");
  await writeFile(transport.recordingPath, priorRecording);
  transport.stagingRoot.mockReturnValue(directory);
  vi.stubEnv("CASEBOOK_ADMIN_DATABASE_URL", "postgres://localhost/synthetic-admin");
  initialSignalListeners = [process.listenerCount("SIGINT"), process.listenerCount("SIGTERM")];
  commands = [];
  server = undefined;
  pending = undefined;
  fault = "playwright";
  const sources = JSON.parse(await readFile(resolve(root, "scenario-packs/asset-reliability/casebook/sources.json"), "utf8")) as { files: Array<{ path: string; text: string }> };
  transport.git.mockImplementation(async (_command: string, args: string[]) => {
    if (args[0] === "status") return { stdout: "", stderr: "" };
    if (args[0] === "rev-parse") return { stdout: "a".repeat(40), stderr: "" };
    if (args[0] === "show") {
      const file = sources.files.find((entry) => args[1]?.endsWith(`:${entry.path}`));
      if (!file) throw new Error("Unexpected historical source lookup");
      return { stdout: file.text, stderr: "" };
    }
    throw new Error("Unexpected command lookup");
  });
  unsafe = vi.fn().mockResolvedValue([]);
  close = vi.fn().mockResolvedValue(undefined);
  transport.database.mockReturnValue({ client: { unsafe }, close });
  transport.socket.mockImplementation(() => {
    const socket = new EventEmitter();
    return Object.assign(socket, {
      listen: (_port: number, _host: string, callback: () => void) => queueMicrotask(callback),
      address: () => ({ port: 4319 }),
      close: (callback: () => void) => queueMicrotask(callback),
    });
  });
  transport.spawn.mockImplementation((command: string, args: string[], options: { env: NodeJS.ProcessEnv }) => {
    const child = new OwnedChild();
    commands.push({ command, args, env: options.env });
    if (args.includes("start")) {
      server = child;
      queueMicrotask(() => {
        if (fault === "server-signal") child.finish(null, "SIGTERM");
        else child.stdout.emit("data", Buffer.from("Ready in 1ms\n"));
      });
    } else {
      queueMicrotask(() => {
        const playwright = args.some((arg) => arg.endsWith("@playwright/test/cli.js"));
        if (playwright && fault === "server-signal-after-ready") server?.finish(null, "SIGTERM");
        if (playwright && (fault === "SIGINT" || fault === "SIGTERM")) process.emit(fault);
        child.finish(args.includes("db:migrate") && fault === "migration" || playwright && fault === "playwright" ? 1 : 0);
      });
    }
    return child;
  });
});

afterEach(async () => {
  // Release a deliberately reproduced lost-event wait if a pre-fix regression run times out.
  server?.emit("exit", server.exitCode, server.signalCode);
  await pending?.catch(() => undefined);
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});

async function expectCleanup() {
  const create = unsafe.mock.calls.find(([sql]) => String(sql).startsWith("CREATE DATABASE"));
  expect(create).toBeDefined();
  const databaseName = String(create?.[0]).match(/"(oiw_casebook_[^"]+)"/)?.[1];
  expect(databaseName).toBeDefined();
  expect(unsafe).toHaveBeenLastCalledWith(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
  expect(close).toHaveBeenCalledOnce();
  expect(await readdir(directory)).toEqual(["recording.json"]);
  expect(await readFile(transport.recordingPath, "utf8")).toBe(priorRecording);
  expect([process.listenerCount("SIGINT"), process.listenerCount("SIGTERM")]).toEqual(initialSignalListeners);
  if (server) expect(server.exitCode !== null || server.signalCode !== null).toBe(true);
}

describe("explicit casebook capture lifecycle", () => {
  it("rejects a dirty checkout before acquiring any capture resources", async () => {
    transport.git.mockResolvedValue({ stdout: " M scripts/casebook/capture.ts\n", stderr: "" });
    await expect(boundedCapture()).rejects.toThrow("clean committed tree");
    expect(transport.database).not.toHaveBeenCalled();
    expect(transport.socket).not.toHaveBeenCalled();
    expect(transport.spawn).not.toHaveBeenCalled();
    expect(await readdir(directory)).toEqual(["recording.json"]);
    expect(await readFile(transport.recordingPath, "utf8")).toBe(priorRecording);
  });

  it.each([
    ["migration", "pnpm exited 1"],
    ["server-signal", "Owned capture server exited before ready"],
    ["playwright", `${process.execPath} exited 1`],
    ["server-signal-after-ready", "Capture server did not remain owned and running"],
    ["SIGINT", "Capture server did not remain owned and running"],
    ["SIGTERM", "Capture server did not remain owned and running"],
  ] as const)("preserves the recording and releases owned resources after %s", async (failure, message) => {
    fault = failure;
    // Emulate sensitive raw exports left by an interrupted browser, using actual private staging files.
    unsafe.mockImplementation(async (sql: string) => {
      if (sql.startsWith("CREATE DATABASE")) {
        const staging = (await readdir(directory)).find((name) => name.startsWith("oiw-casebook-capture-"));
        expect(staging).toBeDefined();
        await writeFile(join(directory, staging!, "raw.json"), "private synthetic export\n");
      }
      return [];
    });
    await expect(boundedCapture()).rejects.toThrow(message);
    await expectCleanup();
    if (failure === "migration") {
      expect(commands).toHaveLength(1);
      expect(server).toBeUndefined();
    } else if (failure === "server-signal") {
      expect(commands).toHaveLength(4);
      expect(server?.exitCode).toBeNull();
      expect(server?.signalCode).toBe("SIGTERM");
      expect(server?.kill).not.toHaveBeenCalled();
    } else if (failure === "server-signal-after-ready") {
      expect(commands).toHaveLength(5);
      expect(server?.signalCode).toBe("SIGTERM");
      expect(server?.kill).not.toHaveBeenCalled();
    } else {
      expect(commands).toHaveLength(5);
      expect(server?.kill).toHaveBeenCalledWith("SIGTERM");
    }
  });

  it("pins every capture command and owned server to checkout packs despite an inherited external directory", async () => {
    vi.stubEnv("SCENARIO_PACKS_DIR", join(directory, "external-packs"));
    fault = "playwright";
    await expect(boundedCapture()).rejects.toThrow(`${process.execPath} exited 1`);
    expect(commands).toHaveLength(5);
    for (const command of commands) {
      expect(command.env.SCENARIO_PACKS_DIR).toBe(resolve(root, "scenario-packs"));
      expect(command.env.CASEBOOK_CAPTURE).toBe("1");
      expect(command.env.DATABASE_URL).toContain("/oiw_casebook_");
      expect(command.env.CASEBOOK_CAPTURE_RAW).toMatch(/\/oiw-casebook-capture-[^/]+\/raw\.json$/);
    }
    expect(commands.find((command) => command.args.includes("start"))).toBeDefined();
    await expectCleanup();
  });
});
