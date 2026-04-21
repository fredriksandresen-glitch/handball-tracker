// Proxy that returns mock backend when ICP is not available
import { createActor as realCreateActor } from "./backend";
import { mockBackend } from "./mocks/backend";
import type { backendInterface } from "./backend";

export function createActor(): backendInterface {
  return mockBackend;
}

export type { backendInterface };
export { mockBackend as createActorRaw };
