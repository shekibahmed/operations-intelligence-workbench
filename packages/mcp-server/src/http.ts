import { createHash, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

import type { OiwServerOptions } from "./config.js";
import { createOiwServer } from "./server.js";

/**
 * SDK transports type optional callbacks as `T | undefined`. This repo's
 * `exactOptionalPropertyTypes` rejects that shape on `Transport`, so the
 * connect call goes through one assertion.
 */
function asTransport(transport: StreamableHTTPServerTransport): Transport {
  return transport as unknown as Transport;
}

export const MCP_PATH = "/mcp";
export const HEALTH_PATH = "/health";

export interface HttpServerOptions {
  host: string;
  port: number;
  /** When set, `/mcp` requires `Authorization: Bearer <token>`. `/health` stays open. */
  authToken?: string;
  serverOptions: OiwServerOptions;
}

export interface RunningHttpServer {
  url: string;
  port: number;
  close: () => Promise<void>;
}

export function isLoopbackHost(host: string): boolean {
  return host === "127.0.0.1" || host === "localhost" || host === "::1" || host === "[::1]";
}

/**
 * Write and evaluation tools on a reachable interface need a bearer token.
 * The read-only set may be bound more widely; it does not write files or the database.
 */
export function assertPublicHttpSafe(options: { host: string; authToken?: string; allowWrite: boolean; allowEval: boolean }): void {
  if (isLoopbackHost(options.host)) return;
  if ((options.allowWrite || options.allowEval) && options.authToken === undefined) {
    throw new Error(
      "Refusing to expose scaffold_pack or run_eval on a non-loopback host without OIW_MCP_AUTH_TOKEN (or --auth-token). " +
        "Bind 127.0.0.1, or set a bearer token.",
    );
  }
}

function tokenMatches(presented: string, expected: string): boolean {
  const left = createHash("sha256").update(presented).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

function authorized(req: IncomingMessage, authToken: string | undefined): boolean {
  if (authToken === undefined) return true;
  const header = req.headers.authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer ")) return false;
  return tokenMatches(header.slice("Bearer ".length), authToken);
}

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
  });
  res.end(payload);
}

function pathnameOf(req: IncomingMessage): string {
  const raw = req.url ?? "/";
  try {
    return new URL(raw, "http://127.0.0.1").pathname;
  } catch {
    return raw;
  }
}

function loopbackHosts(port: number): string[] {
  return [`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`];
}

async function handleMcp(req: IncomingMessage, res: ServerResponse, options: HttpServerOptions, port: number): Promise<void> {
  if (!authorized(req, options.authToken)) {
    writeJson(res, 401, { jsonrpc: "2.0", error: { code: -32001, message: "Authorization required" }, id: null });
    return;
  }
  const server = createOiwServer(options.serverOptions);
  const loopback = isLoopbackHost(options.host);
  const transport = new StreamableHTTPServerTransport(
    loopback ? { enableDnsRebindingProtection: true, allowedHosts: loopbackHosts(port) } : {},
  );
  res.on("close", () => {
    void transport.close();
    void server.close();
  });
  try {
    await server.connect(asTransport(transport));
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error("oiw-mcp: HTTP request failed", error instanceof Error ? error.message : error);
    if (!res.headersSent) {
      writeJson(res, 500, { jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
    }
  }
}

/**
 * Stateless streamable HTTP. Each request gets a new server. POST responses
 * stream as SSE. GET and DELETE are answered by the SDK (405 in stateless mode),
 * which clients treat as "no standalone SSE session".
 */
export function startHttpServer(options: HttpServerOptions): Promise<RunningHttpServer> {
  const httpServer = createServer((req, res) => {
    const path = pathnameOf(req);
    if (req.method === "GET" && path === HEALTH_PATH) {
      writeJson(res, 200, { ok: true, transport: "streamable-http" });
      return;
    }
    if (path !== MCP_PATH) {
      writeJson(res, 404, { error: "Not found" });
      return;
    }
    const address = httpServer.address();
    const port = address !== null && typeof address === "object" ? address.port : options.port;
    void handleMcp(req, res, options, port);
  });

  return new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(options.port, options.host, () => {
      const address = httpServer.address();
      if (address === null || typeof address === "string") {
        reject(new Error("HTTP server did not bind a TCP port"));
        return;
      }
      const host = options.host === "::1" || options.host === "[::1]" ? "[::1]" : address.address;
      resolve({
        url: `http://${host}:${address.port}${MCP_PATH}`,
        port: address.port,
        close: () =>
          new Promise<void>((done, fail) => {
            httpServer.close((error) => (error ? fail(error) : done()));
          }),
      });
    });
  });
}
