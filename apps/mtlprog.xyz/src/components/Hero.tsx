export function Hero() {
  return (
    <section className="min-h-screen flex items-center justify-center border-b-4 border-primary snap-start snap-always">
      <div className="container mx-auto px-4 py-12 md:px-6 md:py-24">
        <div className="max-w-6xl mx-auto text-center space-y-8 md:space-y-12">
          {/* Title - Mobile-first scaling */}
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-8xl font-black text-foreground uppercase tracking-tighter leading-none animate-fade-in">
            MTL
            <br />
            PROGRAMMERS
            <br />
            <span className="text-primary">GUILD</span>
          </h1>

          {/* Subtitle - Responsive text size */}
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground font-mono max-w-3xl mx-auto">
            Гильдия программистов — проекты и программы для IT-специалистов
          </p>

          {/* CTA Buttons - Stack on mobile, row on desktop */}
          <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center animate-slide-up">
            <a
              href="https://discord.gg/YOUR_DISCORD_INVITE"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-12 sm:h-14 md:h-16 px-8 md:px-12 py-3 md:py-4 bg-primary text-primary-foreground text-base md:text-xl font-bold uppercase tracking-wide border-2 border-primary transition-all duration-300 hover:bg-accent hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              JOIN DISCORD
            </a>

            <a
              href="mailto:contact@mtlprog.xyz"
              className="inline-flex items-center justify-center h-12 sm:h-14 md:h-16 px-8 md:px-12 py-3 md:py-4 border-2 border-border bg-background text-foreground text-base md:text-xl font-bold uppercase tracking-wide transition-all duration-300 hover:bg-destructive hover:text-white hover:border-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              EMAIL US
            </a>
          </div>

          {/* Decorative element - Responsive spacing */}
          <div className="mt-12 md:mt-20 flex items-center gap-3 md:gap-4">
            <div className="h-1 w-12 md:w-20 bg-primary animate-pulse" />
            <span className="text-muted-foreground text-xs md:text-sm uppercase tracking-widest font-mono">
              SCROLL FOR MORE
            </span>
            <div className="h-1 flex-1 bg-border" />
          </div>
        </div>
      </div>
    </section>
  );
}
