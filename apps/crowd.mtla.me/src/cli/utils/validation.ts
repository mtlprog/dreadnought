import { type ProjectData, ProjectDataSchema } from "@/lib/stellar/types";
import * as S from "@effect/schema/Schema";
import { Effect } from "effect";
import { ValidationError } from "../types";

export const validateProjectData = (data: Readonly<unknown>): Effect.Effect<ProjectData, ValidationError> =>
  Effect.try({
    try: () => S.decodeUnknownSync(ProjectDataSchema)(data),
    catch: (error) =>
      new ValidationError({
        field: "project_data",
        message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
      }),
  });
