import { type Effect, Runtime } from "effect";

/**
 * Default runtime for client-side Effect execution
 */
export const clientRuntime = Runtime.defaultRuntime;

/**
 * Helper to run Effect in client components
 *
 * @param effect - The Effect to run
 * @returns Promise that resolves with the Effect result
 *
 * @example
 * const program = Effect.succeed(42);
 * const result = await runClientEffect(program);
 */
export function runClientEffect<A, E>(
  effect: Effect.Effect<A, E>,
): Promise<A> {
  return Runtime.runPromise(clientRuntime)(effect);
}
