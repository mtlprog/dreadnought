import { Hero } from "@/components/Hero";
import { Programs } from "@/components/Programs";
import { Projects } from "@/components/Projects";

export default function Home() {
  return (
    <main className="h-screen overflow-y-scroll snap-y snap-mandatory bg-background">
      <Hero />
      <Projects />
      <Programs />
    </main>
  );
}
