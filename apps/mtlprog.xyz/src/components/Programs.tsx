export function Programs() {
  const programs = [
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
  ];

  return (
    <section className="min-h-screen py-8 md:py-12 lg:py-20 snap-start snap-always">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Section Header - Mobile-first */}
          <div className="mb-12 md:mb-20">
            <h2 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-foreground mb-4 md:mb-6 uppercase tracking-tighter">
              PROGRAMS
            </h2>
            <div className="h-1 md:h-2 w-32 md:w-40 bg-secondary" />
          </div>

          {/* Programs Grid - Stack on mobile, 2 cols on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {programs.map((program, index) => (
              <article
                key={program.id}
                className="group border-2 md:border-4 border-border p-6 md:p-8 transition-all duration-500 hover:border-secondary hover:shadow-[0_0_40px_rgba(0,255,255,0.3)] animate-slide-up"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                {/* Status Badge */}
                <div
                  className={`inline-block mb-4 md:mb-6 px-4 md:px-6 py-2 text-xs md:text-sm font-bold uppercase tracking-widest ${
                    program.status === "OPEN"
                      ? "bg-primary text-primary-foreground"
                      : "bg-warning-amber text-background"
                  }`}
                >
                  {program.status}
                </div>

                {/* Title */}
                <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-foreground mb-2 md:mb-3 uppercase tracking-tight">
                  {program.title}
                </h3>

                {/* Tagline */}
                <p className="text-xs sm:text-sm md:text-base text-secondary mb-4 md:mb-6 uppercase tracking-widest font-bold">
                  {program.tagline}
                </p>

                {/* Description */}
                <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-6 md:mb-8 leading-relaxed font-mono">
                  {program.description}
                </p>

                {/* Features */}
                <ul className="space-y-2 md:space-y-3 mb-6 md:mb-8">
                  {program.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 md:gap-3 text-foreground font-mono text-xs sm:text-sm"
                    >
                      <span className="text-primary text-base md:text-xl mt-[-2px]">
                        ▸
                      </span>
                      <span className="flex-1">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action */}
                {program.status === "OPEN"
                  ? (
                    <button className="w-full h-12 md:h-14 px-6 md:px-8 py-3 md:py-4 bg-secondary text-secondary-foreground text-base md:text-lg font-bold uppercase tracking-wide border-2 border-secondary transition-all duration-300 hover:bg-foreground hover:text-background hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                      APPLY NOW
                    </button>
                  )
                  : (
                    <div className="w-full h-12 md:h-14 px-6 md:px-8 py-3 md:py-4 border-2 border-dashed border-border text-muted-foreground flex items-center justify-center text-base md:text-lg font-bold uppercase tracking-wide">
                      COMING SOON
                    </div>
                  )}
              </article>
            ))}
          </div>

          {/* Footer CTA - Responsive spacing */}
          <div className="mt-12 md:mt-20 text-center">
            <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-foreground mb-6 md:mb-8 uppercase tracking-wide font-black">
              READY TO JOIN?
            </p>
            <a
              href="https://discord.gg/YOUR_DISCORD_INVITE"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-14 md:h-16 lg:h-20 px-12 md:px-16 py-4 md:py-6 bg-primary text-primary-foreground text-base sm:text-xl md:text-2xl font-bold uppercase tracking-wide border-2 border-primary transition-all duration-300 hover:bg-secondary hover:border-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 animate-pulse-glow"
            >
              JOIN COMMUNITY
            </a>
          </div>

          {/* Footer - Responsive */}
          <footer className="mt-12 md:mt-20 pt-8 md:pt-12 border-t-2 border-border text-center">
            <p className="text-muted-foreground text-xs md:text-sm uppercase tracking-widest mb-3 md:mb-4 font-mono">
              MTL PROGRAMMERS GUILD © 2025
            </p>
            <div className="flex justify-center gap-4 md:gap-6">
              <a
                href="mailto:contact@mtlprog.xyz"
                className="text-muted-foreground hover:text-primary transition-colors uppercase text-xs tracking-wider font-mono"
              >
                EMAIL
              </a>
              <span className="text-muted-foreground">|</span>
              <a
                href="https://discord.gg/YOUR_DISCORD_INVITE"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors uppercase text-xs tracking-wider font-mono"
              >
                DISCORD
              </a>
            </div>
          </footer>
        </div>
      </div>
    </section>
  );
}
