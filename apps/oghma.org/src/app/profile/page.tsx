import { Button } from "@dreadnought/ui";
import { Header } from "@/components/header";
import { User, Award, BookOpen, CheckCircle2 } from "lucide-react";

export default function ProfilePage() {
  // TODO: Replace with actual user data from SEP-10 authentication
  const isAuthenticated = false;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />

        <main className="flex-1 flex items-center justify-center">
          <div className="container mx-auto px-4 py-24 text-center">
            <div className="border-4 border-secondary bg-card p-12 max-w-2xl mx-auto">
              <User className="w-16 h-16 mx-auto mb-6 text-secondary" />

              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-6">
                NOT AUTHENTICATED
              </h1>

              <p className="text-lg font-mono text-muted-foreground mb-8">
                Connect your Stellar wallet to track progress and earn achievements
              </p>

              <Button size="lg" className="uppercase">
                CONNECT WALLET
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Authenticated view (placeholder)
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-6xl">
        {/* Profile Header */}
        <div className="border-4 border-primary bg-card p-8 md:p-12 mb-12">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-24 h-24 border-4 border-secondary bg-secondary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-12 h-12 text-secondary" />
            </div>

            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4">
                YOUR PROFILE
              </h1>

              <div className="font-mono text-sm space-y-2">
                <p>
                  <span className="text-muted-foreground">WALLET: </span>
                  <span className="font-bold">GBZXN...MADI</span>
                </p>
                <p>
                  <span className="text-muted-foreground">JOINED: </span>
                  <span className="font-bold">OCTOBER 2025</span>
                </p>
              </div>
            </div>

            <Button variant="outline" size="lg">
              DISCONNECT
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="border-4 border-border bg-card p-8">
            <div className="flex items-center gap-4 mb-4">
              <BookOpen className="w-8 h-8 text-primary" />
              <div className="text-4xl font-black">3</div>
            </div>
            <h3 className="text-lg font-bold uppercase">COURSES ENROLLED</h3>
          </div>

          <div className="border-4 border-border bg-card p-8">
            <div className="flex items-center gap-4 mb-4">
              <CheckCircle2 className="w-8 h-8 text-secondary" />
              <div className="text-4xl font-black">12</div>
            </div>
            <h3 className="text-lg font-bold uppercase">LESSONS COMPLETED</h3>
          </div>

          <div className="border-4 border-border bg-card p-8">
            <div className="flex items-center gap-4 mb-4">
              <Award className="w-8 h-8 text-secondary" />
              <div className="text-4xl font-black">2</div>
            </div>
            <h3 className="text-lg font-bold uppercase">ACHIEVEMENTS EARNED</h3>
          </div>
        </div>

        {/* In Progress */}
        <div className="border-4 border-border bg-card mb-12">
          <div className="border-b-4 border-border bg-muted p-6">
            <h2 className="text-2xl font-black uppercase tracking-tight">
              IN PROGRESS
            </h2>
          </div>

          <div className="divide-y-4 divide-border">
            <div className="p-6">
              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <h3 className="text-xl font-bold uppercase mb-2">
                    Introduction to Panarchy
                  </h3>
                  <p className="text-sm font-mono text-muted-foreground">
                    2 of 3 lessons completed
                  </p>
                </div>
                <div className="text-3xl font-black text-secondary">
                  67%
                </div>
              </div>
            </div>

            <div className="p-6 text-center text-muted-foreground">
              <p className="font-mono text-sm">
                START NEW COURSES TO SEE THEM HERE
              </p>
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div className="border-4 border-border bg-card">
          <div className="border-b-4 border-border bg-muted p-6">
            <h2 className="text-2xl font-black uppercase tracking-tight">
              ACHIEVEMENTS
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6">
            <div className="border-4 border-secondary bg-secondary/10 p-6 text-center">
              <Award className="w-12 h-12 mx-auto mb-3 text-secondary" />
              <p className="text-sm font-bold uppercase">FIRST STEPS</p>
            </div>

            <div className="border-4 border-secondary bg-secondary/10 p-6 text-center">
              <Award className="w-12 h-12 mx-auto mb-3 text-secondary" />
              <p className="text-sm font-bold uppercase">KNOWLEDGE SEEKER</p>
            </div>

            <div className="border-4 border-border bg-muted p-6 text-center opacity-50">
              <Award className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-bold uppercase text-muted-foreground">LOCKED</p>
            </div>

            <div className="border-4 border-border bg-muted p-6 text-center opacity-50">
              <Award className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-bold uppercase text-muted-foreground">LOCKED</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
