import * as S from "@effect/schema/Schema";

export class FundDataFetchError extends S.TaggedError<FundDataFetchError>()(
  "FundDataFetchError",
  {
    status: S.Number,
    message: S.String,
    cause: S.optional(S.Unknown),
  },
) {}

export class FundDataParseError extends S.TaggedError<FundDataParseError>()(
  "FundDataParseError",
  {
    message: S.String,
    cause: S.optional(S.Unknown),
  },
) {}

export class FundDataNetworkError extends S.TaggedError<FundDataNetworkError>()(
  "FundDataNetworkError",
  {
    message: S.String,
    cause: S.optional(S.Unknown),
  },
) {}
