import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createOiwServer } from "./server.js";
import { assertPublicHttpSafe, startHttpServer } from "./http.js";
import { resolveEnabledTools, type ToolSelection } from "./tools.js";

const HELP = `oiw-mcp — Operations Intelligence Workbench MCP server

Usage:
  oiw-mcp                         stdio (default)
  oiw-mcp --http [--host H] [--port N]

Options:
  --http                 Streamable HTTP at /mcp. Responses use SSE. Default bind 127.0.0.1:8787.
  --stdio                Force stdio.
  --host <host>          HTTP bind address. Default 127.0.0.1, or OIW_MCP_HOST.
  --port <port>          HTTP port. Default 8787, or OIW_MCP_PORT.
  --allow-write          Also register scaffold_pack. Same as OIW_MCP_ALLOW_WRITE=1.
  --allow-eval           Also register run_eval. Same as OIW_MCP_ALLOW_EVAL=1.
                         run_eval writes to the database in DATABASE_URL.
  --allowed-tools <list> Comma-separated allow list. Same as OIW_MCP_ALLOWED_TOOLS.
                         Intersected with the tools this process may register.
                         Cannot turn a tool on by itself.
  --auth-token <token>   Require Authorization: Bearer on /mcp. Prefer OIW_MCP_AUTH_TOKEN
                         so the token is not visible in the process list.
  -h, --help             Show this help.

HTTP starts with the read-only tools: list_packs, get_pack_manifest, list_fixtures,
get_casebook, validate_packs. stdio registers every tool. scaffold_pack still
refuses to write unless write access is enabled. A non-loopback host will not
start with --allow-write or --allow-eval unless a bearer token is set.

There is no authentication when --auth-token and OIW_MCP_AUTH_TOKEN are unset.
Do not publish a loopback URL; hosted clients need a public HTTPS address you run.
`;

export interface CliOptions {
  help: boolean;
  transport: "stdio" | "http";
  host: string;
  port: number;
  allowWrite: boolean;
  allowEval: boolean;
  allowedTools?: string[];
  authToken?: string;
}

function present(value: string | undefined): string | undefined {
  if (value === undefined || value.length === 0) return undefined;
  return value;
}

export function parseCli(argv: readonly string[], env: Record<string, string | undefined>): CliOptions {
  let values: {
    http: boolean;
    stdio: boolean;
    host?: string;
    port?: string;
    "allow-write": boolean;
    "allow-eval": boolean;
    "allowed-tools"?: string;
    "auth-token"?: string;
    help: boolean;
  };
  try {
    const parsed = parseArgs({
      args: [...argv],
      strict: true,
      options: {
        http: { type: "boolean", default: false },
        stdio: { type: "boolean", default: false },
        host: { type: "string" },
        port: { type: "string" },
        "allow-write": { type: "boolean", default: false },
        "allow-eval": { type: "boolean", default: false },
        "allowed-tools": { type: "string" },
        "auth-token": { type: "string" },
        help: { type: "boolean", short: "h", default: false },
      },
    });
    values = parsed.values;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}\n\n${HELP}`);
  }

  if (values.http && values.stdio) {
    throw new Error("Pass only one of --http and --stdio.");
  }
  const envTransport = env.OIW_MCP_TRANSPORT;
  const wantsHttp = values.http || (!values.stdio && envTransport === "http");
  const resolvedTransport = wantsHttp ? "http" : "stdio";

  const host = present(values.host) ?? present(env.OIW_MCP_HOST) ?? "127.0.0.1";
  const portText = present(values.port) ?? present(env.OIW_MCP_PORT) ?? "8787";
  if (!/^\d+$/u.test(portText)) throw new Error(`Port must be an integer, received ${JSON.stringify(portText)}.`);
  const port = Number(portText);
  if (port > 65535) throw new Error(`Port must be between 0 and 65535, received ${port}.`);

  const allowedRaw = values["allowed-tools"] ?? env.OIW_MCP_ALLOWED_TOOLS;
  const authToken = present(values["auth-token"]) ?? present(env.OIW_MCP_AUTH_TOKEN);

  return {
    help: values.help === true,
    transport: resolvedTransport,
    host,
    port,
    allowWrite: values["allow-write"] || env.OIW_MCP_ALLOW_WRITE === "1",
    allowEval: values["allow-eval"] || env.OIW_MCP_ALLOW_EVAL === "1",
    ...(allowedRaw !== undefined ? { allowedTools: allowedRaw.split(",") } : {}),
    ...(authToken !== undefined ? { authToken } : {}),
  };
}

export function selectionFromCli(options: CliOptions): ToolSelection {
  return {
    profile: options.transport === "http" ? "read-only" : "all",
    allowWrite: options.allowWrite,
    allowEval: options.allowEval,
    ...(options.allowedTools !== undefined ? { allowedTools: options.allowedTools } : {}),
  };
}

export async function main(argv: readonly string[] = process.argv.slice(2), env: Record<string, string | undefined> = process.env): Promise<void> {
  const options = parseCli(argv, env);
  if (options.help) {
    process.stdout.write(HELP);
    return;
  }
  const enabledTools = resolveEnabledTools(selectionFromCli(options));
  const serverOptions = {
    allowWrite: options.allowWrite,
    enabledTools,
    env,
  };

  if (options.transport === "http") {
    assertPublicHttpSafe({
      host: options.host,
      allowWrite: options.allowWrite,
      allowEval: options.allowEval,
      ...(options.authToken !== undefined ? { authToken: options.authToken } : {}),
    });
    const running = await startHttpServer({
      host: options.host,
      port: options.port,
      serverOptions,
      ...(options.authToken !== undefined ? { authToken: options.authToken } : {}),
    });
    console.error(`oiw-mcp: streamable HTTP on ${running.url}`);
    console.error(`oiw-mcp: tools: ${enabledTools.join(", ")}`);
    if (options.authToken === undefined) {
      console.error("oiw-mcp: /mcp has no bearer token. Keep the bind on loopback, or set OIW_MCP_AUTH_TOKEN.");
    }
    await new Promise<void>((resolvePromise) => {
      const stop = () => resolvePromise();
      process.once("SIGINT", stop);
      process.once("SIGTERM", stop);
    });
    await running.close();
    return;
  }

  const server = createOiwServer(serverOptions);
  await server.connect(new StdioServerTransport());
  console.error("oiw-mcp: ready on stdio");
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(resolve(entry)).href) {
  await main().catch((error: unknown) => {
    console.error(`oiw-mcp: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
