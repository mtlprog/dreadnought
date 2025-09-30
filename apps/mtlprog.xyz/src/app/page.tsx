import { Hero } from "@/components/Hero";
import { Projects } from "@/components/Projects";
import { Programs } from "@/components/Programs";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Hero />
      <Projects />
      <Programs />
    </main>
  );
}