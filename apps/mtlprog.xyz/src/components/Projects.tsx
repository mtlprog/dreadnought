export function Projects() {
  const projects = [
    {
      id: "mtl-crowd",
      title: "MTL CROWD",
      description:
        "Платформа для коллективного финансирования проектов на блокчейне Stellar. Прозрачность, безопасность и децентрализация.",
      status: "ACTIVE",
      link: "https://crowd.mtla.me",
      tech: ["STELLAR", "NEXT.JS", "EFFECT-TS"],
    },
  ];

  return (
    <section className="min-h-screen py-8 md:py-12 lg:py-20 border-b-4 border-border snap-start snap-always">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Section Header - Mobile-first */}
          <div className="mb-12 md:mb-20">
            <h2 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-foreground mb-4 md:mb-6 uppercase tracking-tighter">
              PROJECTS
            </h2>
            <div className="h-1 md:h-2 w-32 md:w-40 bg-primary" />
          </div>

          {/* Projects Grid */}
          <div className="grid gap-6 md:gap-8">
            {projects.map((project, index) => (
              <article
                key={project.id}
                className="group border-2 md:border-4 border-border p-6 md:p-8 lg:p-12 transition-all duration-500 hover:border-primary hover:shadow-[0_0_40px_rgba(0,255,0,0.3)] animate-slide-up"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                {/* Status Badge */}
                <div className="inline-block mb-4 md:mb-6 px-4 md:px-6 py-2 bg-primary text-primary-foreground text-xs md:text-sm font-bold uppercase tracking-widest">
                  {project.status}
                </div>

                {/* Title */}
                <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-foreground mb-4 md:mb-6 uppercase tracking-tight">
                  {project.title}
                </h3>

                {/* Description */}
                <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 md:mb-8 leading-relaxed max-w-3xl font-mono">
                  {project.description}
                </p>

                {/* Tech Stack */}
                <div className="flex flex-wrap gap-2 md:gap-3 mb-6 md:mb-8">
                  {project.tech.map((tech) => (
                    <span
                      key={tech}
                      className="px-3 md:px-4 py-1.5 md:py-2 border-2 border-border text-muted-foreground text-xs md:text-sm uppercase tracking-wider font-mono group-hover:border-primary group-hover:text-primary transition-colors"
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                {/* Link */}
                <a
                  href={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center h-12 md:h-14 px-6 md:px-8 py-3 md:py-4 bg-foreground text-background text-base md:text-lg font-bold uppercase tracking-wide border-2 border-foreground transition-all duration-300 hover:bg-accent hover:border-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  VISIT PROJECT →
                </a>
              </article>
            ))}
          </div>

          {/* More projects coming soon */}
          <div className="mt-12 md:mt-16 p-6 md:p-8 border-2 border-dashed border-border text-center">
            <p className="text-muted-foreground text-base md:text-xl uppercase tracking-widest font-mono">
              MORE PROJECTS COMING SOON...
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
