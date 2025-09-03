import { Context, Effect, Layer, pipe } from "effect";
import { EnvironmentError } from "../types";

export interface EnvironmentService {
  readonly getRequired: (key: Readonly<string>) => Effect.Effect<string, EnvironmentError>;
  readonly getOptional: (key: Readonly<string>, defaultValue: Readonly<string>) => Effect.Effect<string, never>;
}

export const EnvironmentServiceCli = Context.GenericTag<EnvironmentService>(
  "@crowd.mtla.me/cli/EnvironmentService",
);

export const EnvironmentServiceLive = Layer.succeed(
  EnvironmentServiceCli,
  EnvironmentServiceCli.of({
    getRequired: (key: Readonly<string>) =>
      pipe(
        Effect.sync(() => process.env[key]),
        Effect.flatMap(value =>
          value !== undefined && value !== ""
            ? Effect.succeed(value)
            : Effect.fail(new EnvironmentError({ variable: key }))
        ),
      ),

    getOptional: (key: Readonly<string>, defaultValue: Readonly<string>) =>
      Effect.sync(() => process.env[key] ?? defaultValue),
  }),
);
