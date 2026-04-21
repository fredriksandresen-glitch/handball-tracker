import { mockBackend } from "../mocks/backend";
import type { backendInterface } from "../backend";

export function useMockActor(): { actor: backendInterface; isFetching: boolean } {
  return { actor: mockBackend, isFetching: false };
}
