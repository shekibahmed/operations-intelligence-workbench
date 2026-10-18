import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";

import type { CommandRequest, CommandResult } from "./command.js";
import { createOiwServer, type OiwServerOptions } from "./index.js";

const clients: Client[] = [];

async function connect(options: OiwServerOptions = {}): Promise<Client> {
  const server = createOiwServer({ env: {}, ...options });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  clients.push(client);
  return client;
}

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
});

interface TextResult {
  isError?: boolean;
  content: { type: string; text: string }[];
}

async function call(client: Client, name: string, args: Record<string, unknown> = {}) {
  const result = (await client.callTool({ name, arguments: args })) as TextResult;
  expect(result.content).toHaveLength(1);
  expect(result.content[0]?.type).toBe("text");
  const text = result.content[0]!.text;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { isError: result.isError === true, text, json: JSON.parse(text) as Record<string, any> };
}

function recordingRunner(result: Partial<CommandResult> = {}) {
  const requests: CommandRequest[] = [];
  return {
    requests,
    commandRunner: async (request: CommandRequest): Promise<CommandResult> => {
      requests.push(request);
      return { exitCode: 0, stdout: "", stderr: "", timedOut: false, ...result };
    },
  };
}

describe("tool surface", () => {
  it("exposes exactly the seven documented tools", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.map(({ name }) => name).sort()).toEqual(
      ["get_casebook", "get_pack_manifest", "list_fixtures", "list_packs", "run_eval", "scaffold_pack", "validate_packs"],
    );
  });

  it("states that fixture text is untrusted data on every tool that returns it", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    for (const name of ["list_fixtures", "get_casebook", "get_pack_manifest"]) {
      const description = tools.find((tool) => tool.name === name)?.description ?? "";
      expect(description, name).toMatch(/untrusted data/i);
      expect(description, name).toMatch(/not instructions|never (?:treat|follow)/i);
    }
  });
});

describe("list_packs", () => {
  it("returns compact JSON describing loaded packs", async () => {
    const client = await connect();
    const { json, isError, text } = await call(client, "list_packs");
    expect(isError).toBe(false);
    expect(text).not.toContain("\n");
    expect(json.packs.length).toBeGreaterThan(0);
    for (const pack of json.packs) {
      expect(pack).toMatchObject({
        id: expect.any(String),
        version: expect.any(String),
        name: expect.any(String),
        description: expect.any(String),
        entityTypes: expect.any(Array),
        eventTypes: expect.any(Array),
        fixtureCounts: { smoke: expect.anything(), demo: expect.anything(), "edge-cases": expect.anything() },
      });
    }
    expect(Array.isArray(json.invalid)).toBe(true);
    expect(json.skipped.some((entry: { directory: string }) => entry.directory.startsWith("_"))).toBe(true);
  });
});

describe("get_pack_manifest", () => {
  it("returns the manifest and rejects an unknown pack", async () => {
    const client = await connect();
    const packs = (await call(client, "list_packs")).json.packs as { id: string }[];
    const manifest = await call(client, "get_pack_manifest", { packId: packs[0]!.id });
    expect(manifest.json.manifest.id).toBe(packs[0]!.id);

    const missing = await call(client, "get_pack_manifest", { packId: "does-not-exist" });
    expect(missing.isError).toBe(true);
    expect(missing.json.available).toContain(packs[0]!.id);
  });
});

describe("list_fixtures", () => {
  async function packWithEdgeCases(client: Client): Promise<string> {
    const packs = (await call(client, "list_packs")).json.packs as { id: string; fixtureCounts: Record<string, number> }[];
    const pack = packs.find((entry) => (entry.fixtureCounts["edge-cases"] ?? 0) > 0);
    expect(pack).toBeDefined();
    return pack!.id;
  }

  it("returns edge cases with their gold expected outcome and no content by default", async () => {
    const client = await connect();
    const packId = await packWithEdgeCases(client);
    const { json } = await call(client, "list_fixtures", { packId });
    expect(json.set).toBe("edge-cases");
    expect(json.count).toBeGreaterThan(0);
    expect(json.notice).toMatch(/untrusted data/i);
    expect(json.goldSet).toMatch(/edge-cases\.gold\.json$/);
    for (const artifact of json.artifacts) {
      expect(artifact).toMatchObject({ id: expect.any(String), sha256: expect.stringMatching(/^[0-9a-f]{64}$/), byteLength: expect.any(Number) });
      expect(artifact).not.toHaveProperty("untrustedContent");
      expect(artifact).not.toHaveProperty("expectedExtraction");
    }
    const withGold = json.artifacts.filter((artifact: { expectedOutcome: unknown }) => artifact.expectedOutcome !== null);
    expect(withGold.length).toBeGreaterThan(0);
    expect(withGold[0].expectedOutcome).toMatchObject({
      expectedObservations: expect.any(Array),
      notes: expect.any(String),
    });
    expect(withGold[0].expectedOutcome).not.toHaveProperty("fixtureId");
  });

  it("labels raw content as untrusted and honours the artifact filter", async () => {
    const client = await connect();
    const packId = await packWithEdgeCases(client);
    const all = (await call(client, "list_fixtures", { packId })).json;
    const first = all.artifacts[0].id as string;
    const { json } = await call(client, "list_fixtures", {
      packId,
      includeContent: true,
      includeExtraction: true,
      artifactIds: [first, "no-such-artifact"],
    });
    expect(json.count).toBe(1);
    expect(json.unknownArtifactIds).toEqual(["no-such-artifact"]);
    expect(json.artifacts[0].untrustedContent).toMatchObject({ encoding: expect.stringMatching(/^(utf8|base64)$/), data: expect.any(String) });
    expect(json.artifacts[0].expectedExtraction).toBeDefined();
  });

  it("rejects an unknown pack and an unknown set", async () => {
    const client = await connect();
    expect((await call(client, "list_fixtures", { packId: "does-not-exist" })).isError).toBe(true);
    const packId = await packWithEdgeCases(client);
    await expect(client.callTool({ name: "list_fixtures", arguments: { packId, set: "bogus" } })).resolves.toMatchObject({ isError: true });
  });
});

describe("get_casebook", () => {
  it("lists casebooks and reports a pack without one as an error", async () => {
    const client = await connect();
    const { json } = await call(client, "get_casebook");
    expect(Array.isArray(json.casebooks)).toBe(true);
    const shipped = json.casebooks as { packId: string; casebookId: string }[];
    if (shipped.length > 0) {
      const detail = await call(client, "get_casebook", { packId: shipped[0]!.packId });
      expect(detail.json.casebook.id).toBe(shipped[0]!.casebookId);
      expect(detail.json.files["case.json"]).toMatch(/casebook\/case\.json$/);
      expect(detail.json.notice).toMatch(/untrusted data/i);
    }
    const packs = (await call(client, "list_packs")).json.packs as { id: string }[];
    const without = packs.find((pack) => !shipped.some((entry) => entry.packId === pack.id));
    if (without !== undefined) expect((await call(client, "get_casebook", { packId: without.id })).isError).toBe(true);
  });
});

describe("scaffold_pack", () => {
  const args = { id: "example-pack", name: "Example", description: "A synthetic example." };

  it("is refused unless OIW_MCP_ALLOW_WRITE=1 and never starts a process", async () => {
    const runner = recordingRunner();
    const client = await connect({ commandRunner: runner.commandRunner });
    const refused = await call(client, "scaffold_pack", args);
    expect(refused.isError).toBe(true);
    expect(refused.json.error).toContain("OIW_MCP_ALLOW_WRITE=1");
    expect(runner.requests).toHaveLength(0);
  });

  it("reads the write gate from the environment", async () => {
    const runner = recordingRunner();
    const client = await connect({ commandRunner: runner.commandRunner, env: { OIW_MCP_ALLOW_WRITE: "1" } });
    expect((await call(client, "scaffold_pack", args)).isError).toBe(false);
    expect(runner.requests).toHaveLength(1);
  });

  it.each(["Bad Id", "UPPER", "-lead", "trail-", "double--dash", "../escape", "a/b", "template", ""])(
    "rejects invalid id %j before running anything",
    async (id) => {
      const runner = recordingRunner();
      const client = await connect({ commandRunner: runner.commandRunner, allowWrite: true });
      const result = await call(client, "scaffold_pack", { ...args, id });
      expect(result.isError).toBe(true);
      expect(runner.requests).toHaveLength(0);
    },
  );

  it("passes a valid id as discrete pnpm arguments", async () => {
    const runner = recordingRunner({ stdout: "Scaffolded" });
    const client = await connect({ commandRunner: runner.commandRunner, allowWrite: true });
    const result = await call(client, "scaffold_pack", { ...args, description: "x; rm -rf / $(whoami)" });
    expect(result.isError).toBe(false);
    expect(runner.requests[0]).toMatchObject({
      command: "pnpm",
      args: ["pack:scaffold", "example-pack", "--name", "Example", "--description", "x; rm -rf / $(whoami)"],
    });
  });
});

describe("validate_packs and run_eval", () => {
  it("runs pnpm validate:packs and parses per-directory results", async () => {
    const runner = recordingRunner({
      stdout: "OK    scenario-packs/one (one@1.0.0)\nFAIL  scenario-packs/two\nTEMPLATE OK    scenario-packs/_template (template@1.0.0)\n",
      exitCode: 1,
    });
    const client = await connect({ commandRunner: runner.commandRunner });
    const { json, isError } = await call(client, "validate_packs");
    expect(isError).toBe(true);
    expect(runner.requests[0]).toMatchObject({ command: "pnpm", args: ["validate:packs"] });
    expect(json.ok).toBe(false);
    expect(json.results).toEqual([
      { status: "OK", template: false, directory: "scenario-packs/one", identity: "one@1.0.0" },
      { status: "FAIL", template: false, directory: "scenario-packs/two", identity: null },
      { status: "OK", template: true, directory: "scenario-packs/_template", identity: "template@1.0.0" },
    ]);
  });

  it("runs the evaluation with an optional validated pack id", async () => {
    const runner = recordingRunner({ stdout: "Fixture evaluation: PASS" });
    const client = await connect({ commandRunner: runner.commandRunner, repositoryRoot: "/nonexistent-root" });
    const result = await call(client, "run_eval", { packId: "some-pack" });
    expect(runner.requests[0]?.args).toEqual(["eval", "--pack", "some-pack"]);
    expect(result.json.ok).toBe(true);

    const rejected = await call(client, "run_eval", { packId: "--provider=live" });
    expect(rejected.isError).toBe(true);
    expect(runner.requests).toHaveLength(1);
  });
});
