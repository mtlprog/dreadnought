export function Hero() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 py-20 border-b-4 border-cyber-green">
      <div className="max-w-6xl w-full animate-fade-in">
        {/* Title */}
        <h1 className="text-6xl md:text-9xl font-bold text-foreground mb-8 tracking-tighter uppercase">
          MTL
          <br />
          PROGRAMMERS
          <br />
          <span className="text-cyber-green">GUILD</span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-3xl text-steel-gray mb-16 max-w-3xl uppercase tracking-wide">
          Гильдия программистов — проекты и программы для IT-специалистов
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 animate-slide-up">
          <a
            href="https://discord.gg/YOUR_DISCORD_INVITE"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative px-12 py-6 bg-cyber-green text-background text-xl md:text-2xl font-bold uppercase tracking-wider transition-all duration-300 hover:bg-electric-cyan hover:animate-pulse-glow"
          >
            <span className="relative z-10">JOIN DISCORD</span>
            <div className="absolute inset-0 bg-foreground opacity-0 group-hover:opacity-10 transition-opacity" />
          </a>

          <a
            href="mailto:contact@mtlprog.xyz"
            className="group relative px-12 py-6 border-4 border-foreground text-foreground text-xl md:text-2xl font-bold uppercase tracking-wider transition-all duration-300 hover:border-electric-cyan hover:text-electric-cyan"
          >
            <span className="relative z-10">EMAIL US</span>
            <div className="absolute inset-0 bg-electric-cyan opacity-0 group-hover:opacity-10 transition-opacity" />
          </a>
        </div>

        {/* Decorative element */}
        <div className="mt-20 flex items-center gap-4">
          <div className="h-1 w-20 bg-cyber-green animate-pulse" />
          <span className="text-steel-gray text-sm uppercase tracking-widest">
            SCROLL FOR MORE
          </span>
          <div className="h-1 flex-1 bg-steel-gray" />
        </div>
      </div>
    </section>
  );
}