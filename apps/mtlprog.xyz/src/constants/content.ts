import * as S from "@effect/schema/Schema";
import { Context, Effect, Layer, pipe } from "effect";
import { LocaleServiceServerTag, type LocaleError, type TranslationError } from "@/services/locale-server";

// Schemas for runtime validation
export const ContentItemSchema = S.Struct({
  id: S.String,
  title: S.String,
  description: S.String,
  status: S.String,
  tech: S.optional(S.Array(S.String)),
  tagline: S.optional(S.String),
  features: S.optional(S.Array(S.String)),
});

export const ContentSchema = S.Struct({
  site: S.Struct({
    name: S.String,
    shortName: S.String,
    description: S.String,
    copyright: S.String,
  }),
  hero: S.Struct({
    title: S.Struct({
      line1: S.String,
      line2: S.String,
      line3: S.String,
    }),
    subtitle: S.String,
    cta: S.Struct({
      primary: S.String,
      secondary: S.String,
    }),
    scroll: S.String,
  }),
  projects: S.Struct({
    sectionLabel: S.String,
    title: S.String,
    items: S.Array(ContentItemSchema),
    cta: S.String,
    comingSoon: S.String,
  }),
  programs: S.Struct({
    sectionLabel: S.String,
    title: S.String,
    items: S.Array(ContentItemSchema),
    cta: S.Struct({
      apply: S.String,
      comingSoon: S.String,
    }),
    footer: S.Struct({
      label: S.String,
      title: S.String,
      button: S.String,
    }),
  }),
  footer: S.Struct({
    columns: S.Array(
      S.Struct({
        title: S.String,
        description: S.optional(S.String),
        links: S.optional(
          S.Array(
            S.Struct({
              label: S.String,
              icon: S.String,
            }),
          ),
        ),
      }),
    ),
  }),
});

export type Content = S.Schema.Type<typeof ContentSchema>;

// Service interface
export interface ContentService {
  readonly getContent: () => Effect.Effect<Content, TranslationError | LocaleError>;
}

export const ContentServiceTag = Context.GenericTag<ContentService>(
  "@mtlprog.xyz/ContentService",
);

// Service implementation using LocaleServiceServer for translations
export const ContentServiceLive = Layer.effect(
  ContentServiceTag,
  Effect.gen(function* () {
    const localeService = yield* LocaleServiceServerTag;

    return {
      getContent: () =>
        pipe(
          Effect.gen(function* () {
            const site = {
              name: yield* localeService.t("site.name"),
              shortName: yield* localeService.t("site.shortName"),
              description: yield* localeService.t("site.description"),
              copyright: yield* localeService.t("site.copyright"),
            };

            const hero = {
              title: {
                line1: yield* localeService.t("hero.title.line1"),
                line2: yield* localeService.t("hero.title.line2"),
                line3: yield* localeService.t("hero.title.line3"),
              },
              subtitle: yield* localeService.t("hero.subtitle"),
              cta: {
                primary: yield* localeService.t("hero.cta.primary"),
                secondary: yield* localeService.t("hero.cta.secondary"),
              },
              scroll: yield* localeService.t("hero.scroll"),
            };

            const projects = {
              sectionLabel: yield* localeService.t("projects.sectionLabel"),
              title: yield* localeService.t("projects.title"),
              cta: yield* localeService.t("projects.cta"),
              comingSoon: yield* localeService.t("projects.comingSoon"),
              items: [
                {
                  id: "mtl-crowd",
                  title: yield* localeService.t("projects.items.mtl-crowd.title"),
                  description: yield* localeService.t(
                    "projects.items.mtl-crowd.description"
                  ),
                  status: yield* localeService.t("projects.items.mtl-crowd.status"),
                  tech: ["STELLAR", "NEXT.JS", "EFFECT-TS"],
                },
              ],
            };

            const programs = {
              sectionLabel: yield* localeService.t("programs.sectionLabel"),
              title: yield* localeService.t("programs.title"),
              cta: {
                apply: yield* localeService.t("programs.cta.apply"),
                comingSoon: yield* localeService.t("programs.cta.comingSoon"),
              },
              footer: {
                label: yield* localeService.t("programs.footer.label"),
                title: yield* localeService.t("programs.footer.title"),
                button: yield* localeService.t("programs.footer.button"),
              },
              items: [
                {
                  id: "it-acceleration",
                  title: yield* localeService.t(
                    "programs.items.it-acceleration.title"
                  ),
                  tagline: yield* localeService.t(
                    "programs.items.it-acceleration.tagline"
                  ),
                  description: yield* localeService.t(
                    "programs.items.it-acceleration.description"
                  ),
                  status: yield* localeService.t(
                    "programs.items.it-acceleration.status"
                  ),
                  features: [
                    yield* localeService.t(
                      "programs.items.it-acceleration.features.0"
                    ),
                    yield* localeService.t(
                      "programs.items.it-acceleration.features.1"
                    ),
                    yield* localeService.t(
                      "programs.items.it-acceleration.features.2"
                    ),
                    yield* localeService.t(
                      "programs.items.it-acceleration.features.3"
                    ),
                  ],
                },
                {
                  id: "sdf-integration",
                  title: yield* localeService.t(
                    "programs.items.sdf-integration.title"
                  ),
                  tagline: yield* localeService.t(
                    "programs.items.sdf-integration.tagline"
                  ),
                  description: yield* localeService.t(
                    "programs.items.sdf-integration.description"
                  ),
                  status: yield* localeService.t(
                    "programs.items.sdf-integration.status"
                  ),
                  features: [
                    yield* localeService.t(
                      "programs.items.sdf-integration.features.0"
                    ),
                    yield* localeService.t(
                      "programs.items.sdf-integration.features.1"
                    ),
                    yield* localeService.t(
                      "programs.items.sdf-integration.features.2"
                    ),
                    yield* localeService.t(
                      "programs.items.sdf-integration.features.3"
                    ),
                  ],
                },
              ],
            };

            const footer = {
              columns: [
                {
                  title: yield* localeService.t("footer.columns.about.title"),
                  description: yield* localeService.t(
                    "footer.columns.about.description"
                  ),
                },
                {
                  title: yield* localeService.t("footer.columns.resources.title"),
                  links: [
                    {
                      label: yield* localeService.t(
                        "footer.columns.resources.links.github.label"
                      ),
                      icon: "Github",
                    },
                    {
                      label: yield* localeService.t(
                        "footer.columns.resources.links.docs.label"
                      ),
                      icon: "ExternalLink",
                    },
                  ],
                },
                {
                  title: yield* localeService.t("footer.columns.community.title"),
                  links: [
                    {
                      label: yield* localeService.t(
                        "footer.columns.community.links.discord.label"
                      ),
                      icon: "MessageCircle",
                    },
                    {
                      label: yield* localeService.t(
                        "footer.columns.community.links.email.label"
                      ),
                      icon: "Mail",
                    },
                    {
                      label: yield* localeService.t(
                        "footer.columns.community.links.montelibero.label"
                      ),
                      icon: "MessageCircle",
                    },
                    {
                      label: yield* localeService.t(
                        "footer.columns.community.links.guild.label"
                      ),
                      icon: "MessageCircle",
                    },
                  ],
                },
              ],
            };

            return { site, hero, projects, programs, footer };
          }),
          Effect.tap(() => Effect.log("Content loaded successfully")),
        ),
    };
  })
);
