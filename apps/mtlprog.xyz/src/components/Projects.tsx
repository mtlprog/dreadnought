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
    <section className="min-h-screen px-6 py-20 border-b-4 border-steel-gray">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="mb-20">
          <h2 className="text-4xl md:text-7xl font-bold text-foreground mb-6 uppercase tracking-tighter">
            PROJECTS
          </h2>
          <div className="h-2 w-40 bg-cyber-green" />
        </div>

        {/* Projects Grid */}
        <div className="grid gap-8">
          {projects.map((project, index) => (
            <article
              key={project.id}
              className="group border-4 border-foreground p-8 md:p-12 transition-all duration-500 hover:border-cyber-green hover:shadow-[0_0_40px_rgba(0,255,0,0.3)] animate-slide-up"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              {/* Status Badge */}
              <div className="inline-block mb-6 px-6 py-2 bg-cyber-green text-background text-sm font-bold uppercase tracking-widest">
                {project.status}
              </div>

              {/* Title */}
              <h3 className="text-3xl md:text-5xl font-bold text-foreground mb-6 uppercase tracking-tight">
                {project.title}
              </h3>

              {/* Description */}
              <p className="text-lg md:text-xl text-steel-gray mb-8 leading-relaxed max-w-3xl">
                {project.description}
              </p>

              {/* Tech Stack */}
              <div className="flex flex-wrap gap-3 mb-8">
                {project.tech.map((tech) => (
                  <span
                    key={tech}
                    className="px-4 py-2 border-2 border-steel-gray text-steel-gray text-sm uppercase tracking-wider font-mono group-hover:border-cyber-green group-hover:text-cyber-green transition-colors"
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
                className="inline-block px-8 py-4 bg-foreground text-background text-lg font-bold uppercase tracking-wider transition-all duration-300 hover:bg-electric-cyan group-hover:translate-x-2"
              >
                VISIT PROJECT →
              </a>
            </article>
          ))}
        </div>

        {/* More projects coming soon */}
        <div className="mt-16 p-8 border-2 border-dashed border-steel-gray text-center">
          <p className="text-steel-gray text-xl uppercase tracking-widest">
            MORE PROJECTS COMING SOON...
          </p>
        </div>
      </div>
    </section>
  );
}