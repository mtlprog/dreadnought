import { Hero } from "@/components/Hero";
import { Programs } from "@/components/Programs";
import { Projects } from "@/components/Projects";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Hero />
      <Projects />
      <Programs />
    </main>
  );
}
