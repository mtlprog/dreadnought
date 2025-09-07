import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="mb-8">
          <h1 className="text-6xl font-black text-primary uppercase tracking-tighter mb-4">
            404
          </h1>
          <h2 className="text-2xl font-bold text-foreground uppercase mb-4">
            PROJECT NOT FOUND
          </h2>
          <p className="text-lg font-mono text-muted-foreground mb-8">
            The project you're looking for doesn't exist or has been removed.
          </p>
        </div>
        
        <div className="space-y-4">
          <Link href="/">
            <Button size="lg" className="w-full text-xl py-4">
              BACK TO PROJECTS
            </Button>
          </Link>
          
          <div className="text-sm font-mono text-muted-foreground">
            <p>Looking for a specific project?</p>
            <p>Check the project code and try again.</p>
          </div>
        </div>
      </div>
    </div>
  );
}