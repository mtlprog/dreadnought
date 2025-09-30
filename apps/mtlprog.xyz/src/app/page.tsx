import { Hero } from "@/components/Hero";
import { Footer } from "@/components/layout/Footer";
import { Programs } from "@/components/Programs";
import { Projects } from "@/components/Projects";
import { ContentServiceTag, ContentServiceLive } from "@/constants/content";
import { LinksServiceTag, LinksServiceLive } from "@/constants/links";
import { Effect, Layer, pipe } from "effect";

// Create the application layer
const AppLayer = Layer.merge(ContentServiceLive, LinksServiceLive);

// Server component that fetches data
export default async function Home() {
  // Create Effect program to fetch content
  const contentProgram = pipe(
    Effect.gen(function*() {
      const contentService = yield* ContentServiceTag;
      return yield* contentService.getContent();
    }),
    Effect.provide(AppLayer),
  );

  // Create Effect program to fetch links
  const linksProgram = pipe(
    Effect.gen(function*() {
      const linksService = yield* LinksServiceTag;
      return yield* linksService.getLinks();
    }),
    Effect.provide(AppLayer),
  );

  // Run both programs
  const content = await Effect.runPromise(contentProgram);
  const links = await Effect.runPromise(linksProgram);

  // Convert to promises for client components
  const contentPromise = Promise.resolve(content);
  const linksPromise = Promise.resolve(links);

  return (
    <main className="h-screen overflow-y-scroll snap-y snap-mandatory bg-background">
      <Hero contentPromise={contentPromise} linksPromise={linksPromise} />
      <Projects contentPromise={contentPromise} linksPromise={linksPromise} />
      <Programs contentPromise={contentPromise} linksPromise={linksPromise} />
      <Footer contentPromise={contentPromise} linksPromise={linksPromise} />
    </main>
  );
}
