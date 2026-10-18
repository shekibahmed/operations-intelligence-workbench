import { execFile, spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { encodeAll } from "./encode.js";

const exec = promisify(execFile);
const root = resolve(import.meta.dirname, "../..");
const outDirectory = resolve(root, "docs/media");

function requireThat(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Server and Playwright output can echo connection strings and workspace slugs; keep logs shareable. */
function publicLog(bytes: Buffer): string {
  return bytes
    .toString()
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "[database connection]")
    .replace(/\/w\/[^/\s?]+/g, "/w/[workspace]");
}

async function run(command: string, args: string[], env: NodeJS.ProcessEnv, cwd = root): Promise<void> {
  const child = spawn(command, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout?.on("data", (bytes: Buffer) => process.stdout.write(publicLog(bytes)));
  child.stderr?.on("data", (bytes: Buffer) => process.stderr.write(publicLog(bytes)));
  await new Promise<void>((accept, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => (code === 0 ? accept() : reject(new Error(`${command} exited ${code}`))));
  });
}

async function unusedPort(): Promise<number> {
  const socket = createServer();
  await new Promise<void>((accept, reject) => {
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", accept);
  });
  const address = socket.address();
  requireThat(address !== null && typeof address === "object", "Could not reserve a server port");
  await new Promise<void>((accept, reject) => socket.close((error) => (error ? reject(error) : accept())));
  return address.port;
}

async function stop(child: ChildProcess | undefined): Promise<void> {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((accept) => {
    const force = setTimeout(() => child.kill("SIGKILL"), 5_000);
    child.once("exit", () => {
      clearTimeout(force);
      accept();
    });
    child.kill("SIGTERM");
  });
}

async function verifyTool(name: string): Promise<void> {
  try {
    await exec(name, ["-version"]);
  } catch {
    throw new Error(`${name} is required (install ffmpeg) but was not found on PATH`);
  }
}

/**
 * Builds the app (unless MEDIA_SKIP_BUILD=1), serves it on a free port against
 * the caller's DATABASE_URL, records every pack's guided tour with Playwright,
 * then encodes the outputs. Pass --no-music (or MEDIA_NO_MUSIC=1) to skip the
 * background track. MEDIA_CAPTURE_PACKS=a,b limits which packs are recorded.
 */
export async function capture(argv: string[]): Promise<void> {
  const noMusic = argv.includes("--no-music") || process.env.MEDIA_NO_MUSIC === "1";
  requireThat(process.env.DATABASE_URL, "Set DATABASE_URL to a migrated database; capture creates synthetic guest workspaces in it");
  await verifyTool("ffmpeg");
  await verifyTool("ffprobe");

  const port = await unusedPort();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    SCENARIO_PACKS_DIR: resolve(root, "scenario-packs"),
    SESSION_SECRET: randomUUID() + randomUUID(),
    OIW_RATE_LIMIT_STORE: "memory",
    MEDIA_CAPTURE: "1",
    MEDIA_CAPTURE_PORT: String(port),
    MEDIA_CAPTURE_OUT: outDirectory,
  };

  let server: ChildProcess | undefined;
  const interrupt = () => void stop(server);
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", interrupt);
  try {
    if (process.env.MEDIA_SKIP_BUILD !== "1") {
      await run("pnpm", ["--filter", "!@oiw/web", "--recursive", "--if-present", "run", "build"], env);
      await run("pnpm", ["--filter", "@oiw/web", "exec", "next", "build"], env);
    }
    server = spawn(
      process.execPath,
      [resolve(root, "apps/web/node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)],
      { cwd: resolve(root, "apps/web"), env, stdio: ["ignore", "pipe", "pipe"] },
    );
    const owned = server;
    await new Promise<void>((accept, reject) => {
      const timeout = setTimeout(() => reject(new Error("Capture server did not become ready")), 60_000);
      owned.once("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      owned.once("exit", () => {
        clearTimeout(timeout);
        reject(new Error("Capture server exited before it was ready"));
      });
      owned.stderr?.on("data", (bytes: Buffer) => process.stderr.write(publicLog(bytes)));
      owned.stdout?.on("data", (bytes: Buffer) => {
        process.stdout.write(publicLog(bytes));
        if (bytes.toString().includes("Ready in")) {
          clearTimeout(timeout);
          accept();
        }
      });
    });
    await run(
      process.execPath,
      [resolve(root, "apps/web/node_modules/@playwright/test/cli.js"), "test", "--config", "playwright.media.config.ts"],
      env,
      resolve(root, "apps/web"),
    );
  } finally {
    await stop(server);
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", interrupt);
  }

  const selected = (process.env.MEDIA_CAPTURE_PACKS ?? "").split(",").map((entry) => entry.trim()).filter(Boolean);
  await encodeAll({ noMusic, ...(selected.length > 0 ? { packs: selected } : {}) });
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  capture(process.argv.slice(2)).catch((error: unknown) => {
    console.error(publicLog(Buffer.from(error instanceof Error ? error.message : String(error))));
    process.exitCode = 1;
  });
}
