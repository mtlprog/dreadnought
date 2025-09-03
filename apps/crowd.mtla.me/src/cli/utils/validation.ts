import { type ProjectData, ProjectDataSchema } from "@/lib/stellar/types";
import * as S from "@effect/schema/Schema";
import { Effect, pipe } from "effect";
import { ValidationError } from "../types";

export const validateProjectData = (data: Readonly<unknown>): Effect.Effect<ProjectData, ValidationError> =>
  pipe(
    S.decodeUnknown(ProjectDataSchema)(data),
    Effect.mapError(error =>
      new ValidationError({
        field: "project_data",
        message: `Validation failed: ${error.message}`,
      })
    ),
  );
