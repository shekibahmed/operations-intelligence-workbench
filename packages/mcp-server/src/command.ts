import { execFile } from "node:child_process";

export interface CommandResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export interface CommandRequest {
  command: string;
  args: readonly string[];
  cwd: string;
  env: Record<string, string | undefined>;
  timeoutMs: number;
}

export type CommandRunner = (request: CommandRequest) => Promise<CommandResult>;

/** Runs a command with `execFile`; there is never a shell, so arguments cannot be re-parsed. */
export const runCommand: CommandRunner = ({ command, args, cwd, env, timeoutMs }) =>
  new Promise((resolvePromise) => {
    execFile(
      command,
      [...args],
      { cwd, env: env as NodeJS.ProcessEnv, timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024, encoding: "utf8" },
      (error, stdout, stderr) => {
        if (error === null) {
          resolvePromise({ exitCode: 0, stdout, stderr, timedOut: false });
          return;
        }
        const failure = error as NodeJS.ErrnoException & { killed?: boolean; code?: number | string };
        resolvePromise({
          exitCode: typeof failure.code === "number" ? failure.code : null,
          stdout,
          stderr: typeof failure.code === "string" ? `${stderr}${failure.message}` : stderr,
          timedOut: failure.killed === true,
        });
      },
    );
  });

const OUTPUT_LIMIT = 6000;

/** Keeps the tail of command output, where failures are reported. */
export function tail(text: string, limit = OUTPUT_LIMIT): string {
  const trimmed = text.trim();
  return trimmed.length <= limit ? trimmed : `...[truncated ${trimmed.length - limit} chars]\n${trimmed.slice(-limit)}`;
}
