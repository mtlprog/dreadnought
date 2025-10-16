import Link from "next/link";
import { Button } from "@dreadnought/ui";
import { Header } from "@/components/header";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center">
        <div className="container mx-auto px-4 py-24 text-center">
          <div className="border-4 border-primary bg-card p-12 max-w-2xl mx-auto">
            <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-6 text-primary">
              404
            </h1>
            <h2 className="text-2xl md:text-3xl font-black uppercase mb-4">
              PAGE NOT FOUND
            </h2>
            <p className="text-lg font-mono text-muted-foreground mb-8">
              The page you&apos;re looking for doesn&apos;t exist.
            </p>
            <Link href="/">
              <Button size="lg">
                BACK TO HOME
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
