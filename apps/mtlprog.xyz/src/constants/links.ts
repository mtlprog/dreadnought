import * as S from "@effect/schema/Schema";
import { Context, Effect, Layer, pipe } from "effect";

// Schema for links validation
export const LinksSchema = S.Struct({
  social: S.Struct({
    discord: S.String,
    github: S.String,
    email: S.String,
    telegram: S.Struct({
      montelibero: S.String,
      guild: S.String,
    }),
  }),
  projects: S.Struct({
    mtlCrowd: S.String,
  }),
  docs: S.Struct({
    main: S.String,
  }),
  programs: S.Struct({
    itAcceleration: S.String,
  }),
  organizations: S.Struct({
    montelibero: S.String,
  }),
});

export type Links = S.Schema.Type<typeof LinksSchema>;

// Service interface
export interface LinksService {
  readonly getLinks: () => Effect.Effect<Links, never>;
}

export const LinksServiceTag = Context.GenericTag<LinksService>(
  "@mtlprog.xyz/LinksService",
);

// Service implementation
const LINKS_DATA: Links = {
  social: {
    discord: "https://discord.gg/Mmt4NAPb",
    github: "https://github.com/mtlprog",
    email: "mailto:stas@mtlprog.xyz",
    telegram: {
      montelibero: "https://t.me/Montelibero_ru",
      guild: "https://t.me/montelibero_agora/43852",
    },
  },
  projects: {
    mtlCrowd: "https://crowd.mtla.me",
  },
  docs: {
    main: "https://github.com/mtlprog/dreadnought/tree/master/docs",
  },
  programs: {
    itAcceleration: "https://forms.gle/5nYVN2bEBNxhnCpP9",
  },
  organizations: {
    montelibero: "https://montelibero.org",
  },
};

export const LinksServiceLive = Layer.succeed(LinksServiceTag, {
  getLinks: () =>
    pipe(
      Effect.succeed(LINKS_DATA),
      Effect.tap(() => Effect.log("Links loaded successfully")),
    ),
});
