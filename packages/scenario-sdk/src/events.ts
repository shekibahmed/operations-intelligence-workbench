import type { EventDefinition } from "@oiw/contracts";

import type { LoadedScenarioPack } from "./loader.js";

/** Returns one validated pack-owned Event definition by its eventType. */
export function getEventDefinition(
  pack: LoadedScenarioPack,
  eventType: string,
): EventDefinition | undefined {
  return pack.eventDefinitions.get(eventType);
}
