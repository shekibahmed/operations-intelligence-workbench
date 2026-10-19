import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { readFileSync } from "node:fs";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { afterEach, describe, expect, it } from "vitest";

import { parseCli, selectionFromCli } from "./cli.js";
import { discoverPackRoots } from "./config.js";
import { assertPublicHttpSafe, startHttpServer, type RunningHttpServer } from "./http.js";
import { READ_ONLY_TOOL_NAMES, resolveEnabledTools, TOOL_NAMES } from "./tools.js";

const servers: RunningHttpServer[] = [];
const clients: Client[] = [];

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close().catch(() => undefined)));
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

async function connect(options: Parameters<typeof startHttpServer>[0], token?: string): Promise<Client> {
  const running = await startHttpServer(options);
  servers.push(running);
  const client = new Client({ name: "http-test", version: "0.0.0" });
  clients.push(client);
  const transport = new StreamableHTTPClientTransport(
    new URL(running.url),
    token === undefined ? {} : { requestInit: { headers: { authorization: `Bearer ${token}` } } },
  );
  await client.connect(transport as unknown as Transport);
  return client;
}

function readOnlyOptions(extra: { authToken?: string; enabledTools?: readonly string[] } = {}) {
  return {
    host: "127.0.0.1",
    port: 0,
    serverOptions: {
      env: {},
      enabledTools: extra.enabledTools ?? resolveEnabledTools(selectionFromCli(parseCli(["--http"], {}))),
    },
    ...(extra.authToken !== undefined ? { authToken: extra.authToken } : {}),
  };
}

describe("streamable HTTP", () => {
  it("lists the read-only tools and returns packs", async () => {
    const client = await connect(readOnlyOptions());
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual([...READ_ONLY_TOOL_NAMES].sort());
    expect(tools.map((tool) => tool.name)).not.toContain("scaffold_pack");
    expect(tools.map((tool) => tool.name)).not.toContain("run_eval");

    const result = await client.callTool({ name: "list_packs", arguments: {} });
    expect(result.isError).not.toBe(true);
    const text = (result.content as { type: string; text: string }[])[0]?.text ?? "";
    const body = JSON.parse(text) as { packs: unknown[] };
    expect(body.packs.length).toBeGreaterThan(0);
  });

  it("registers write and evaluation tools only when opted in", async () => {
    const enabled = resolveEnabledTools(
      selectionFromCli(parseCli(["--http", "--allow-write", "--allow-eval"], {})),
    );
    const client = await connect(readOnlyOptions({ enabledTools: enabled }));
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual([...TOOL_NAMES].sort());
  });

  it("honours an allow list over HTTP", async () => {
    const enabled = resolveEnabledTools(selectionFromCli(parseCli(["--http", "--allowed-tools", "list_packs,get_casebook"], {})));
    const client = await connect(readOnlyOptions({ enabledTools: enabled }));
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name)).toEqual(["list_packs", "get_casebook"]);
  });

  it("requires the bearer token on /mcp and leaves /health open", async () => {
    const running = await startHttpServer(readOnlyOptions({ authToken: "test-token" }));
    servers.push(running);
    const health = await fetch(running.url.replace(/\/mcp$/u, "/health"));
    expect(health.status).toBe(200);
    expect(await health.json()).toMatchObject({ ok: true, transport: "streamable-http" });

    const denied = await fetch(running.url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(denied.status).toBe(401);

    const client = new Client({ name: "http-test", version: "0.0.0" });
    clients.push(client);
    await client.connect(
      new StreamableHTTPClientTransport(new URL(running.url), {
        requestInit: { headers: { authorization: "Bearer test-token" } },
      }) as unknown as Transport,
    );
    const { tools } = await client.listTools();
    expect(tools.length).toBe(READ_ONLY_TOOL_NAMES.length);
  });
});

describe("tool selection", () => {
  it("keeps every tool on stdio and the read-only set on HTTP", () => {
    expect(resolveEnabledTools(selectionFromCli(parseCli([], {})))).toEqual([...TOOL_NAMES]);
    expect(resolveEnabledTools(selectionFromCli(parseCli(["--http"], {})))).toEqual([...READ_ONLY_TOOL_NAMES]);
  });

  it("refuses an allow list that names a tool the flags have not enabled", () => {
    expect(() => resolveEnabledTools(selectionFromCli(parseCli(["--http", "--allowed-tools", "scaffold_pack"], {})))).toThrow(
      /not enabled/,
    );
    expect(resolveEnabledTools(selectionFromCli(parseCli(["--allowed-tools", "scaffold_pack"], { OIW_MCP_ALLOW_WRITE: "1" })))).toEqual([
      "scaffold_pack",
    ]);
  });

  it("refuses write and evaluation tools on a public bind without a token", () => {
    expect(() => assertPublicHttpSafe({ host: "0.0.0.0", allowWrite: true, allowEval: false })).toThrow(/AUTH_TOKEN/);
    expect(() => assertPublicHttpSafe({ host: "0.0.0.0", allowWrite: false, allowEval: false })).not.toThrow();
    expect(() =>
      assertPublicHttpSafe({ host: "127.0.0.1", allowWrite: true, allowEval: true }),
    ).not.toThrow();
    expect(() =>
      assertPublicHttpSafe({ host: "0.0.0.0", allowWrite: true, allowEval: true, authToken: "t" }),
    ).not.toThrow();
  });
});

describe("pack discovery and package identity", () => {
  it("uses a checkout when one is above this module, and shipped packs otherwise", async () => {
    const checkout = discoverPackRoots();
    expect(checkout.repositoryRoot).toBe(resolve(import.meta.dirname, "..", "..", ".."));
    expect(checkout.scenarioPacksDirectory).toBe(join(checkout.repositoryRoot, "scenario-packs"));

    const root = await mkdtemp(join(tmpdir(), "oiw-mcp-roots-"));
    try {
      const moduleDirectory = join(root, "pkg", "dist");
      await mkdir(join(root, "pkg", "scenario-packs", "example"), { recursive: true });
      const shipped = discoverPackRoots(moduleDirectory);
      expect(shipped.scenarioPacksDirectory).toBe(join(root, "pkg", "scenario-packs"));
      expect(shipped.repositoryRoot).toBe(join(root, "pkg"));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps package.json, the server version and server.json on one identity", () => {
    const directory = resolve(import.meta.dirname, "..");
    const pkg = JSON.parse(readFileSync(join(directory, "package.json"), "utf8")) as {
      name: string;
      version: string;
      private?: boolean;
      mcpName: string;
      bin: { "oiw-mcp": string };
    };
    const serverJson = JSON.parse(readFileSync(join(directory, "server.json"), "utf8")) as {
      name: string;
      version: string;
      description: string;
      packages: { identifier: string; version: string; registryType: string }[];
    };
    expect(pkg.private).toBeUndefined();
    expect(pkg.name).toBe("@oiw/mcp-server");
    expect(pkg.bin["oiw-mcp"]).toBe("./dist/cli.js");
    expect(pkg.mcpName).toBe(serverJson.name);
    expect(pkg.mcpName).toBe("io.github.shekibahmed/oiw-mcp");
    expect(pkg.version).toBe(serverJson.version);
    expect(serverJson.packages[0]?.identifier).toBe(pkg.name);
    expect(serverJson.packages[0]?.version).toBe(pkg.version);
    expect(serverJson.packages[0]?.registryType).toBe("npm");
    expect(serverJson.description.length).toBeGreaterThan(0);
    expect(serverJson.description.length).toBeLessThanOrEqual(100);
  });
});
