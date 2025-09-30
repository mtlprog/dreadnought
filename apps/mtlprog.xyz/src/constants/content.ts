import * as S from "@effect/schema/Schema";
import { Context, Effect, Layer, pipe } from "effect";

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
  readonly getContent: () => Effect.Effect<Content, never>;
}

export const ContentServiceTag = Context.GenericTag<ContentService>(
  "@mtlprog.xyz/ContentService",
);

// Service implementation
const CONTENT_DATA: Content = {
  site: {
    name: "Montelibero Programmers Guild",
    shortName: "MONTELIBERO",
    description: "Гильдия программистов — проекты и программы для IT-специалистов",
    copyright: "MONTELIBERO PROGRAMMERS GUILD © 2025",
  },
  hero: {
    title: {
      line1: "MONTELIBERO",
      line2: "PROGRAMMERS",
      line3: "GUILD",
    },
    subtitle: "Гильдия программистов — проекты и программы для IT-специалистов",
    cta: {
      primary: "JOIN DISCORD",
      secondary: "EMAIL US",
    },
    scroll: "SCROLL FOR MORE",
  },
  projects: {
    sectionLabel: "Featured Work",
    title: "PROJECTS",
    items: [
      {
        id: "mtl-crowd",
        title: "MTL CROWD",
        description:
          "Платформа для коллективного финансирования проектов на блокчейне Stellar. Прозрачность, безопасность и децентрализация.",
        status: "ACTIVE",
        tech: ["STELLAR", "NEXT.JS", "EFFECT-TS"],
      },
    ],
    cta: "VISIT PROJECT",
    comingSoon: "MORE PROJECTS COMING SOON...",
  },
  programs: {
    sectionLabel: "Learning Paths",
    title: "PROGRAMS",
    items: [
      {
        id: "it-acceleration",
        title: "IT ACCELERATION",
        tagline: "ACCELERATE YOUR TECH CAREER",
        description:
          "Программа акселерации для IT-специалистов. Менторинг, практические проекты, развитие навыков работы в команде и подготовка к реальным вызовам индустрии.",
        features: [
          "МЕНТОРИНГ ОТ ОПЫТНЫХ РАЗРАБОТЧИКОВ",
          "РЕАЛЬНЫЕ ПРОЕКТЫ НА PRODUCTION",
          "CODE REVIEW И BEST PRACTICES",
          "КАРЬЕРНОЕ КОНСУЛЬТИРОВАНИЕ",
        ],
        status: "OPEN",
      },
      {
        id: "sdf-integration",
        title: "SDF INTEGRATION",
        tagline: "BUILD ON STELLAR BLOCKCHAIN",
        description:
          "Интеграция с Stellar Development Foundation. Обучение разработке на блокчейне Stellar, участие в экосистеме, грантовая поддержка проектов.",
        features: [
          "ОБУЧЕНИЕ STELLAR SDK",
          "ГРАНТОВАЯ ПРОГРАММА",
          "ДОСТУП К SDF РЕСУРСАМ",
          "COMMUNITY SUPPORT",
        ],
        status: "COMING SOON",
      },
    ],
    cta: {
      apply: "APPLY NOW",
      comingSoon: "COMING SOON",
    },
    footer: {
      label: "Join Us",
      title: "READY TO JOIN?",
      button: "JOIN COMMUNITY",
    },
  },
  footer: {
    columns: [
      {
        title: "MONTELIBERO PROGRAMMERS GUILD",
        description: "Гильдия программистов — проекты и программы для IT-специалистов",
      },
      {
        title: "РЕСУРСЫ",
        links: [
          {
            label: "GITHUB",
            icon: "Github",
          },
          {
            label: "ДОКУМЕНТАЦИЯ",
            icon: "ExternalLink",
          },
        ],
      },
      {
        title: "СООБЩЕСТВО",
        links: [
          {
            label: "DISCORD",
            icon: "MessageCircle",
          },
          {
            label: "EMAIL",
            icon: "Mail",
          },
          {
            label: "MONTELIBERO",
            icon: "MessageCircle",
          },
          {
            label: "ГИЛЬДИЯ ПРОГРАММИСТОВ",
            icon: "MessageCircle",
          },
        ],
      },
    ],
  },
};

export const ContentServiceLive = Layer.succeed(ContentServiceTag, {
  getContent: () =>
    pipe(
      Effect.succeed(CONTENT_DATA),
      Effect.tap(() => Effect.log("Content loaded successfully")),
    ),
});
