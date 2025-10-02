import { type Effect, Runtime } from "effect";

/**
 * Default runtime for client-side Effect execution
 */
export const clientRuntime = Runtime.defaultRuntime;

/**
 * Helper to run Effect in client components
 */
export function runClientEffect<A, E>(
  effect: Effect.Effect<A, E>,
): Promise<A> {
  return Runtime.runPromise(clientRuntime)(effect);
}
