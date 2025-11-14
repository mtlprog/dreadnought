import * as S from "@effect/schema/Schema";

export class HorizonError extends S.TaggedError<HorizonError>()(
  "HorizonError",
  {
    message: S.String,
    accountId: S.optional(S.String),
    cause: S.optional(S.Unknown),
  },
) {}

export class IPFSError extends S.TaggedError<IPFSError>()(
  "IPFSError",
  {
    message: S.String,
    cid: S.optional(S.String),
    cause: S.optional(S.Unknown),
  },
) {}

export class ValidationError extends S.TaggedError<ValidationError>()(
  "ValidationError",
  {
    message: S.String,
    field: S.optional(S.String),
  },
) {}
