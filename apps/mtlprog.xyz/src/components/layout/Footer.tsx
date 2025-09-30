"use client";

import { ExternalLink, Github, Mail, MessageCircle } from "lucide-react";
import Link from "next/link";
import { use } from "react";

interface FooterProps {
  contentPromise: Promise<{
    site: {
      shortName: string;
      description: string;
      copyright: string;
    };
    footer: {
      columns: ReadonlyArray<{
        readonly title: string;
        readonly description?: string | undefined;
        readonly links?:
          | ReadonlyArray<{
            readonly label: string;
            readonly icon: string;
          }>
          | undefined;
      }>;
    };
  }>;
  linksPromise: Promise<{
    social: {
      discord: string;
      github: string;
      email: string;
      telegram: {
        montelibero: string;
        guild: string;
      };
    };
    docs: {
      main: string;
    };
  }>;
}

export function Footer({ contentPromise, linksPromise }: FooterProps) {
  const content = use(contentPromise);
  const links = use(linksPromise);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "Github":
        return <Github className="w-6 h-6" />;
      case "MessageCircle":
        return <MessageCircle className="w-6 h-6" />;
      case "Mail":
        return <Mail className="w-6 h-6" />;
      case "ExternalLink":
        return <ExternalLink className="w-6 h-6" />;
      default:
        return null;
    }
  };

  const getLinkHref = (label: string) => {
    switch (label) {
      case "GITHUB":
        return links.social.github;
      case "ДОКУМЕНТАЦИЯ":
        return links.docs.main;
      case "DISCORD":
        return links.social.discord;
      case "EMAIL":
        return links.social.email;
      case "MONTELIBERO":
        return links.social.telegram.montelibero;
      case "ГИЛЬДИЯ ПРОГРАММИСТОВ":
        return links.social.telegram.guild;
      default:
        return "#";
    }
  };

  return (
    <footer className="border-t-4 border-primary bg-muted snap-start snap-always">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {content.footer.columns.map((column, index) => (
            <div key={index}>
              <h3
                className={`${index === 0 ? "text-2xl" : "text-xl"} font-black text-${
                  index === 0 ? "primary" : "foreground"
                } uppercase mb-6 tracking-wider`}
              >
                {column.title}
              </h3>

              {column.description && (
                <p className="text-base font-mono text-muted-foreground leading-relaxed">
                  {column.description}
                </p>
              )}

              {column.links && (
                <div className="space-y-4">
                  {column.links.map((link) => (
                    <Link
                      key={link.label}
                      href={getLinkHref(link.label)}
                      target={link.label === "EMAIL" ? undefined : "_blank"}
                      className="flex items-center gap-3 text-lg font-mono text-muted-foreground hover:text-primary transition-colors"
                    >
                      {getIcon(link.icon)}
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="border-t-2 border-border pt-8 mt-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-base font-mono text-muted-foreground uppercase tracking-wider">
              {content.site.copyright}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
