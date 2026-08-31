import type { Entity } from "@oiw/contracts";

import { entityIds, workspaceId } from "@/lib/stub/ids";

export const stubEntities: Entity[] = [
  {
    id: entityIds.assetPrimary,
    workspaceId,
    entityType: "asset",
    displayName: "AR-1042",
    externalReference: "AR-1042",
    aliases: ["Unit 1042"],
    attributes: { assetClass: "rotating-equipment", location: "North loop" },
    status: "in-service",
    createdAt: "2026-01-10T08:00:00.000Z",
    updatedAt: "2026-08-31T09:14:30.000Z",
  },
  {
    id: entityIds.assetSecondary,
    workspaceId,
    entityType: "asset",
    displayName: "AR-1024",
    externalReference: "AR-1024",
    aliases: [],
    attributes: { assetClass: "rotating-equipment", location: "North loop" },
    status: "in-service",
    createdAt: "2026-01-10T08:00:00.000Z",
    updatedAt: "2026-07-02T10:00:00.000Z",
  },
  {
    id: entityIds.assetTertiary,
    workspaceId,
    entityType: "asset",
    displayName: "AR-2071",
    externalReference: "AR-2071",
    aliases: [],
    attributes: { assetClass: "static-equipment", location: "South yard" },
    status: "out-of-service",
    createdAt: "2026-02-04T08:00:00.000Z",
    updatedAt: "2026-06-11T08:00:00.000Z",
  },
  {
    id: entityIds.location,
    workspaceId,
    entityType: "location",
    displayName: "North loop",
    externalReference: "SITE-NORTH",
    aliases: [],
    attributes: {},
    status: "active",
    createdAt: "2026-01-10T08:00:00.000Z",
    updatedAt: "2026-01-10T08:00:00.000Z",
  },
];

export function findEntityById(id: string): Entity | undefined {
  return stubEntities.find((entity) => entity.id === id);
}
