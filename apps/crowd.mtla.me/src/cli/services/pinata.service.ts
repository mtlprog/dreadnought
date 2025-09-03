import type { ProjectData } from "@/lib/stellar/types";
import { Context, Effect, Layer, pipe } from "effect";
import { PinataSDK } from "pinata";
import { type EnvironmentError, PinataError } from "../types";
import { type EnvironmentService, EnvironmentServiceCli } from "./environment.service";

export interface PinataService {
  readonly upload: (
    data: Readonly<ProjectData>,
  ) => Effect.Effect<string, PinataError | EnvironmentError, EnvironmentService>;
}

export const PinataServiceCli = Context.GenericTag<PinataService>(
  "@crowd.mtla.me/cli/PinataService",
);

export const PinataServiceLive = Layer.succeed(
  PinataServiceCli,
  PinataServiceCli.of({
    upload: (data: Readonly<ProjectData>) =>
      pipe(
        Effect.all([
          pipe(EnvironmentServiceCli, Effect.flatMap(env => env.getRequired("PINATA_TOKEN"))),
          pipe(EnvironmentServiceCli, Effect.flatMap(env => env.getRequired("PINATA_GROUP_ID"))),
        ]),
        Effect.flatMap(([token, groupId]) =>
          Effect.tryPromise({
            try: async () => {
              const pinata = new PinataSDK({
                pinataJwt: token,
              });

              const result = await pinata.upload.public.json(data, {
                metadata: {
                  name: `project-${data.code}`,
                },
                groupId,
              });

              return result.cid;
            },
            catch: (error) =>
              new PinataError({
                cause: error,
                operation: "upload",
              }),
          })
        ),
      ),
  }),
);
