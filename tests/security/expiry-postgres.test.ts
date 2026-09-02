import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepareOperationalAudit, WorkspaceExpirySweep } from "@oiw/application";
import { createDatabase, createPostgresRepositories } from "../../packages/persistence/src/index.js";

const connection = createDatabase();
const repositories = createPostgresRepositories(connection.database);
const cleanupIds: string[] = [];

beforeAll(async () => {
  // Opens the lazy Postgres connection before the assertions begin.
  await repositories.workspaces.listExpired("1900-01-01T00:00:00.000Z");
});

afterAll(async () => {
  for (const workspaceId of cleanupIds) await repositories.workspaces.delete(workspaceId);
  await connection.close();
});

describe("Postgres workspace expiry entrypoint", () => {
  it("deletes an expired guest and its audit chain while preserving non-guests and active guests", async () => {
    const expiredGuestId = randomUUID();
    const activeGuestId = randomUUID();
    const privateId = randomUUID();
    cleanupIds.push(expiredGuestId, activeGuestId, privateId);

    await repositories.workspaces.insert({
      id: expiredGuestId,
      name: "Expired synthetic guest",
      slug: `expired-${expiredGuestId}`,
      activePackId: null,
      mode: "public-demo",
      createdAt: "1999-01-01T00:00:00.000Z",
      resetAt: null,
      expiresAt: "2000-01-01T00:00:00.000Z",
    });
    await repositories.workspaces.insert({
      id: activeGuestId,
      name: "Active synthetic guest",
      slug: `active-${activeGuestId}`,
      activePackId: null,
      mode: "public-demo",
      createdAt: "1999-01-01T00:00:00.000Z",
      resetAt: null,
      expiresAt: "2099-01-01T00:00:00.000Z",
    });
    await repositories.workspaces.insert({
      id: privateId,
      name: "Private synthetic workspace",
      slug: `private-${privateId}`,
      activePackId: null,
      mode: "private-pilot",
      createdAt: "1999-01-01T00:00:00.000Z",
      resetAt: null,
      expiresAt: "2000-01-01T00:00:00.000Z",
    });

    const audit = await prepareOperationalAudit(repositories.auditEntries, {
      workspaceId: expiredGuestId,
      occurredAt: "1999-01-01T00:00:00.000Z",
      action: "workspace-created",
      actorId: "expiry-security-test",
      subject: { type: "workspace", id: expiredGuestId },
      cause: "Synthetic expiry sweep verification",
      data: {},
    });
    await repositories.auditEntries.insert(expiredGuestId, audit);

    const result = await new WorkspaceExpirySweep(repositories.workspaces).run("2001-01-01T00:00:00.000Z");

    expect(result.deletedWorkspaceIds).toContain(expiredGuestId);
    expect(await repositories.workspaces.findById(expiredGuestId)).toBeNull();
    expect(await repositories.auditEntries.list(expiredGuestId)).toEqual([]);
    expect(await repositories.workspaces.findById(activeGuestId)).not.toBeNull();
    expect(await repositories.workspaces.findById(privateId)).not.toBeNull();
  });
});
