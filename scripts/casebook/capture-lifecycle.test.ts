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
  failStaging: false,
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
    mkdtemp: (prefix: string) => {
      if (transport.failStaging && prefix.endsWith("oiw-casebook-capture-")) return Promise.reject(new Error("Private staging allocation failed"));
      return fs.mkdtemp(prefix);
    },
    writeFile: (path: string, data: string, options?: { flag: string }) => fs.writeFile(redirect(path), data, options),
    rename: (from: string, to: string) => fs.rename(redirect(from), redirect(to)),
    rm: (path: string, options: Parameters<typeof fs.rm>[1]) => fs.rm(redirect(path), options),
  };
});

import { capture, projectCapture, type RecordedProjection } from "./capture.js";
import { exportsInput } from "./capture-fixture.js";

const root = resolve(import.meta.dirname, "../..");
const captureTime = "2026-10-02T13:00:00.000Z";
const priorRecording = "previous validated recording\n";
type Fault = "success" | "migration" | "server-signal" | "server-signal-after-ready" | "playwright" | "SIGINT" | "SIGTERM";

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
let raw: ReturnType<typeof exportsInput>;
let story: { capture: { approvalComment: string }; capabilities: Array<{ paths: string[] }> };
let missingPath: string | undefined;
let objectKind: string;
let socketFault: "listen" | "close" | undefined;
let finalDirty: boolean;

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
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(captureTime));
  transport.failStaging = false;
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
  missingPath = undefined;
  objectKind = "blob";
  socketFault = undefined;
  finalDirty = false;
  story = JSON.parse(await readFile(resolve(root, "scenario-packs/asset-reliability/casebook/case.json"), "utf8"));
  raw = exportsInput(story.capture.approvalComment);
  const sources = JSON.parse(await readFile(resolve(root, "scenario-packs/asset-reliability/casebook/sources.json"), "utf8")) as { files: Array<{ path: string; text: string }> };
  let statuses = 0;
  const paths = new Set([...sources.files.map((file) => file.path), ...story.capabilities.flatMap((capability) => capability.paths)]);
  transport.git.mockImplementation(async (command: string, args: string[]) => {
    expect(command).toBe("git");
    if (args[0] === "status") return { stdout: ++statuses > 1 && finalDirty ? " M case.json\n" : "", stderr: "" };
    if (args[0] === "cat-file") {
      expect(args[1]).toBe("-t");
      expect(args[2]?.slice(0, 41)).toBe(`${"a".repeat(40)}:`);
      const path = args[2]?.slice(41);
      expect(path !== undefined && paths.has(path)).toBe(true);
      if (path === missingPath) {
        if (objectKind === "missing") throw new Error("Git object does not exist");
        return { stdout: objectKind, stderr: "" };
      }
      return { stdout: "blob\n", stderr: "" };
    }
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
      listen: (_port: number, _host: string, callback: () => void) => queueMicrotask(() => socketFault === "listen" ? socket.emit("error", new Error("Socket listen failed")) : callback()),
      address: () => ({ port: 4319 }),
      close: (callback: (error?: Error) => void) => queueMicrotask(() => callback(socketFault === "close" ? new Error("Socket close failed") : undefined)),
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
        void (async () => {
          const playwright = args.some((arg) => arg.endsWith("@playwright/test/cli.js"));
          if (playwright) await writeFile(options.env.CASEBOOK_CAPTURE_RAW!, JSON.stringify(raw));
          if (playwright && fault === "server-signal-after-ready") server?.finish(null, "SIGTERM");
          if (playwright && (fault === "SIGINT" || fault === "SIGTERM")) process.emit(fault);
          child.finish(args.includes("db:migrate") && fault === "migration" || playwright && fault === "playwright" ? 1 : 0);
        })().catch((error: unknown) => child.emit("error", error));
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
  vi.useRealTimers();
  await rm(directory, { recursive: true, force: true });
});

async function expectCleanup(preserved = true, created = true) {
  const create = unsafe.mock.calls.find(([sql]) => String(sql).startsWith("CREATE DATABASE"));
  if (created) {
    expect(create).toBeDefined();
    const databaseName = String(create?.[0]).match(/"(oiw_casebook_[^"]+)"/)?.[1];
    expect(databaseName).toBeDefined();
    expect(unsafe).toHaveBeenLastCalledWith(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
  } else expect(unsafe).not.toHaveBeenCalled();
  expect(close).toHaveBeenCalledOnce();
  expect(await readdir(directory)).toEqual(["recording.json"]);
  if (preserved) expect(await readFile(transport.recordingPath, "utf8")).toBe(priorRecording);
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

  it.each(["missing", "tree"])("rejects a %s capability target at the reviewed revision before acquiring resources", async (kind) => {
    missingPath = story.capabilities[0]!.paths[0]!;
    objectKind = kind;
    fault = "success";
    await expect(boundedCapture()).rejects.toThrow(`Evidence path missing at capture revision: ${missingPath}`);
    expect(transport.database).not.toHaveBeenCalled();
    expect(transport.socket).not.toHaveBeenCalled();
    expect(transport.spawn).not.toHaveBeenCalled();
    expect(await readdir(directory)).toEqual(["recording.json"]);
    expect(await readFile(transport.recordingPath, "utf8")).toBe(priorRecording);
  });

  it("closes admin access when private staging allocation fails", async () => {
    transport.failStaging = true;
    await expect(boundedCapture()).rejects.toThrow("Private staging allocation failed");
    expect(transport.socket).not.toHaveBeenCalled();
    expect(transport.spawn).not.toHaveBeenCalled();
    await expectCleanup(true, false);
  });

  it.each(["listen", "close"] as const)("closes admin access and removes private staging after socket %s failure", async (failure) => {
    socketFault = failure;
    await expect(boundedCapture()).rejects.toThrow(`Socket ${failure} failed`);
    expect(transport.spawn).not.toHaveBeenCalled();
    await expectCleanup(true, false);
  });

  it("publishes a complete validated capture with public aliases and releases its resources", async () => {
    fault = "success";
    await boundedCapture();
    await expectCleanup(false);
    const bytes = await readFile(transport.recordingPath, "utf8");
    const published = JSON.parse(bytes) as RecordedProjection & {
      capturedAt: string; sourceRevision: string; captureRevision: string; harness: { revision: string };
      inputs: Array<{ path: string; sha256: string }>;
    };
    expect(published.capturedAt).toBe(captureTime);
    expect(published.sourceRevision).toBe("a".repeat(40));
    expect(published.captureRevision).toBe(published.sourceRevision);
    expect(published.harness.revision).toBe(published.sourceRevision);
    expect(published.inputs).toHaveLength(5);
    expect(published.inputs.every((input) => /^[a-f0-9]{64}$/.test(input.sha256))).toBe(true);
    expect(published.review).toMatchObject({ excerpt: raw.stages.excerpt, displayedConfidence: "70%", before: "pending", after: "accepted" });
    expect(published.rule).toMatchObject({ relatedEventCount: 4, withinHours: 1440, minimumRelatedEvents: 2 });
    expect(published.proposal).toMatchObject({ ref: "decision-1", status: "awaiting-approval", approvalPolicyId: "asset-removal-approval" });
    expect(published.approval).toMatchObject({ decisionRef: "decision-1", outcome: "approved", comment: story.capture.approvalComment, approvedAt: "2026-10-02T12:00:00.000Z" });
    expect(published.case).toMatchObject({ ref: "case-1", status: "open", decisionStatus: "approved" });
    expect(published.case.actionItems[0]).toMatchObject({ status: "open", completedAt: null });
    expect(published.audit.entries.map((entry) => entry.action)).toEqual(["observation-accepted", "rule-evaluated", "decision-proposed", "decision-approved"]);
    expect(bytes).not.toMatch(/workspace-private|session-private|decision-private|case-private|event-private|postgres:\/\/|synthetic-admin|oiw_casebook_|oiw-capture-lifecycle-test/);
    expect(commands).toHaveLength(5);
  });

  it("preserves the prior recording when inputs become dirty during capture", async () => {
    fault = "success";
    finalDirty = true;
    await expect(boundedCapture()).rejects.toThrow("Capture inputs changed during execution");
    await expectCleanup();
    expect(commands).toHaveLength(5);
  });

  it.each(["proposal-policy", "rule-actor"])("rejects %s data accepted by export projection before replacing the recording", async (invalid) => {
    fault = "success";
    if (invalid === "proposal-policy") {
      raw.pending.records[0]!.decisions[0]!.approvalPolicyId = "unsupported-policy";
      raw.final.records[0]!.decisions[0]!.approvalPolicyId = "unsupported-policy";
      const proposed = raw.audit.records.find((entry) => entry.action === "decision-proposed")!;
      Object.assign(proposed.data, { approvalPolicyId: "unsupported-policy" });
    } else raw.audit.records.find((entry) => entry.action === "rule-evaluated")!.actor.type = "human";
    expect(() => projectCapture(raw)).not.toThrow();
    await expect(boundedCapture()).rejects.toThrow(invalid === "proposal-policy" ? "Recorded proposal differs from the frozen rule action" : "Recorded audit relationship mismatch: audit-2");
    await expectCleanup();
    expect(commands).toHaveLength(5);
  });

  it("keeps its interruption handler through a second SIGTERM during database cleanup", async () => {
    fault = "SIGTERM";
    let cleanupSignal = false;
    unsafe.mockImplementation(async (sql: string) => {
      if (sql.startsWith("DROP DATABASE")) {
        expect(process.listenerCount("SIGTERM")).toBe(initialSignalListeners[1]! + 1);
        process.emit("SIGTERM");
        cleanupSignal = true;
      }
      return [];
    });
    await expect(boundedCapture()).rejects.toThrow("Capture server did not remain owned and running");
    expect(cleanupSignal).toBe(true);
    await expectCleanup();
  });

  it("removes private staging even when closing the admin connection fails", async () => {
    close.mockRejectedValue(new Error("Admin close failed"));
    await expect(boundedCapture()).rejects.toThrow("Admin close failed");
    await expectCleanup();
  });

});
