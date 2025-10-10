import { Effect, Runtime } from "effect";

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
export function runClientEffect<A, E = never, R = never>(
  effect: Effect.Effect<A, E, R>,
): Promise<A> {
  return Effect.runPromise(effect as Effect.Effect<A, E, never>);
}
