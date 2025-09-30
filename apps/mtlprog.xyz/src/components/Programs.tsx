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
    <section className="min-h-screen px-6 py-20">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="mb-20">
          <h2 className="text-4xl md:text-7xl font-bold text-foreground mb-6 uppercase tracking-tighter">
            PROGRAMS
          </h2>
          <div className="h-2 w-40 bg-electric-cyan" />
        </div>

        {/* Programs Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {programs.map((program, index) => (
            <article
              key={program.id}
              className="group border-4 border-foreground p-8 transition-all duration-500 hover:border-electric-cyan hover:shadow-[0_0_40px_rgba(0,255,255,0.3)] animate-slide-up"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              {/* Status Badge */}
              <div
                className={`inline-block mb-6 px-6 py-2 text-background text-sm font-bold uppercase tracking-widest ${
                  program.status === "OPEN"
                    ? "bg-cyber-green"
                    : "bg-warning-amber"
                }`}
              >
                {program.status}
              </div>

              {/* Title */}
              <h3 className="text-2xl md:text-4xl font-bold text-foreground mb-3 uppercase tracking-tight">
                {program.title}
              </h3>

              {/* Tagline */}
              <p className="text-sm md:text-base text-electric-cyan mb-6 uppercase tracking-widest font-bold">
                {program.tagline}
              </p>

              {/* Description */}
              <p className="text-base md:text-lg text-steel-gray mb-8 leading-relaxed">
                {program.description}
              </p>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {program.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-foreground font-mono text-sm"
                  >
                    <span className="text-cyber-green text-xl mt-[-2px]">
                      ▸
                    </span>
                    <span className="flex-1">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Action */}
              {program.status === "OPEN" ? (
                <button className="w-full px-8 py-4 bg-electric-cyan text-background text-lg font-bold uppercase tracking-wider transition-all duration-300 hover:bg-foreground">
                  APPLY NOW
                </button>
              ) : (
                <div className="w-full px-8 py-4 border-2 border-dashed border-steel-gray text-steel-gray text-center text-lg font-bold uppercase tracking-wider">
                  COMING SOON
                </div>
              )}
            </article>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-20 text-center">
          <p className="text-2xl md:text-4xl text-foreground mb-8 uppercase tracking-wide">
            READY TO JOIN?
          </p>
          <a
            href="https://discord.gg/YOUR_DISCORD_INVITE"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-16 py-6 bg-cyber-green text-background text-xl md:text-2xl font-bold uppercase tracking-wider transition-all duration-300 hover:bg-electric-cyan animate-pulse-glow"
          >
            JOIN COMMUNITY
          </a>
        </div>

        {/* Footer */}
        <footer className="mt-20 pt-12 border-t-2 border-steel-gray text-center">
          <p className="text-steel-gray text-sm uppercase tracking-widest mb-4">
            MTL PROGRAMMERS GUILD © 2025
          </p>
          <div className="flex justify-center gap-6">
            <a
              href="mailto:contact@mtlprog.xyz"
              className="text-steel-gray hover:text-cyber-green transition-colors uppercase text-xs tracking-wider"
            >
              EMAIL
            </a>
            <span className="text-steel-gray">|</span>
            <a
              href="https://discord.gg/YOUR_DISCORD_INVITE"
              target="_blank"
              rel="noopener noreferrer"
              className="text-steel-gray hover:text-cyber-green transition-colors uppercase text-xs tracking-wider"
            >
              DISCORD
            </a>
          </div>
        </footer>
      </div>
    </section>
  );
}