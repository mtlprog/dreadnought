import { useLocale } from "@/components/locale-client-provider";
import { Progress } from "@/components/ui/progress";
import { formatNumber } from "@/lib/format";
import { truncateAccountId } from "@/lib/stellar-validation";
import type { Project } from "@/types/project";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { TopSupporters } from "./top-supporters";

interface ProjectInfoProps {
  project: Project;
}

// Function to check if string is valid base64
const isValidBase64 = (str: string): boolean => {
  try {
    const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Pattern.test(str)) {
      return false;
    }
    return globalThis.btoa(globalThis.atob(str)) === str;
  } catch {
    return false;
  }
};

// Function to decode base64 fulldescription with proper UTF-8 support
const decodeFullDescription = (base64String: string): string => {
  try {
    if (base64String === "" || base64String.trim() === "") {
      console.warn("Empty fulldescription provided");
      return "No detailed description available";
    }

    const trimmedString = base64String.trim();

    if (!isValidBase64(trimmedString)) {
      console.warn("fulldescription is not valid base64, treating as plain text");
      return trimmedString;
    }

    const binaryString = globalThis.atob(trimmedString);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const decoder = new globalThis.TextDecoder("utf-8");
    const decoded = decoder.decode(bytes);

    return decoded;
  } catch (error) {
    console.error("Failed to decode fulldescription:", error);
    return base64String !== "" ? base64String : "Failed to decode project description";
  }
};

export function ProjectInfo({ project }: ProjectInfoProps) {
  const { t, locale } = useLocale();

  const isCompleted = project.status === "completed";

  // If project is completed and current_amount is 0, it means it was fully funded
  // (funds were distributed and tokens were clawed back)
  const currentAmount = parseFloat(project.current_amount);
  const targetAmount = parseFloat(project.target_amount);
  const progressPercentage = isCompleted && currentAmount === 0 && targetAmount > 0
    ? 100
    : Math.min((currentAmount / targetAmount) * 100, 100);

  return (
    <div className="space-y-6">
      {/* Project Details */}
      <div className="border-2 border-border bg-card p-6">
        <h2 className="text-2xl font-bold text-primary uppercase mb-6">
          {t("project.details.title")}
        </h2>
        <div className="space-y-6 text-base font-mono">
          <div>
            <span className="text-muted-foreground">{t("project.details.description")}</span>
            <div className="text-foreground mt-3 leading-relaxed prose prose-sm max-w-none prose-invert">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  h1: ({ children }) => <h1 className="text-lg font-bold text-primary uppercase mb-2">{children}</h1>,
                  h2: ({ children }) => (
                    <h2 className="text-base font-bold text-foreground uppercase mb-2">{children}</h2>
                  ),
                  h3: ({ children }) => <h3 className="text-sm font-bold text-foreground uppercase mb-1">{children}
                  </h3>,
                  p: ({ children }) => (
                    <p className="mb-2 text-foreground font-mono text-sm leading-relaxed">{children}</p>
                  ),
                  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                  li: ({ children }) => <li className="text-foreground font-mono text-sm">{children}</li>,
                  strong: ({ children }) => <strong className="font-bold text-primary">{children}</strong>,
                  em: ({ children }) => <em className="italic text-accent">{children}</em>,
                  code: ({ children }) => (
                    <code className="bg-muted px-1 py-0.5 text-xs font-mono text-primary">{children}</code>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground">
                      {children}
                    </blockquote>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      className="text-primary hover:text-accent underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {decodeFullDescription(project.fulldescription)}
              </ReactMarkdown>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-muted-foreground">{t("project.details.contactAccount")}</span>
              <a
                href={`https://bsn.expert/accounts/${project.contact_account_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-accent mt-1 block text-sm font-mono underline cursor-pointer transition-colors"
                title={project.contact_account_id}
              >
                {project.contact_name !== undefined
                  ? project.contact_name
                  : truncateAccountId(project.contact_account_id)}
              </a>
            </div>
            <div>
              <span className="text-muted-foreground">{t("project.details.projectAccount")}</span>
              <a
                href={`https://bsn.expert/accounts/${project.project_account_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-accent mt-1 block text-sm font-mono underline cursor-pointer transition-colors"
                title={project.project_account_id}
              >
                {project.project_name !== undefined
                  ? project.project_name
                  : truncateAccountId(project.project_account_id)}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Funding Status */}
      <div className="border-2 border-border bg-card p-6">
        <h2 className="text-2xl font-bold text-primary uppercase mb-6">
          {t("project.funding.title")}
        </h2>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xl font-bold text-foreground">{t("project.funding.progress")}</span>
              <span className="text-xl font-mono text-primary">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <Progress value={progressPercentage} className="h-8" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border-2 border-border bg-muted p-4 text-center">
              <div className="text-xs font-mono text-muted-foreground mb-2">{t("project.funding.raised")}</div>
              <div className="text-xl font-black text-primary leading-tight">
                {formatNumber(parseInt(project.current_amount), locale)}
              </div>
            </div>
            <div className="border-2 border-border bg-muted p-4 text-center">
              <div className="text-xs font-mono text-muted-foreground mb-2">{t("project.funding.target")}</div>
              <div className="text-xl font-black text-foreground leading-tight">
                {formatNumber(parseInt(project.target_amount), locale)}
              </div>
            </div>
            <div className="border-2 border-border bg-muted p-4 text-center">
              <div className="text-xs font-mono text-muted-foreground mb-2">{t("project.funding.supporters")}</div>
              <div className="text-xl font-black text-secondary leading-tight">
                {project.supporters_count}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Supporters */}
      {project.supporters !== undefined && project.supporters.length > 0 && (
        <div className="border-2 border-border bg-card p-6">
          <TopSupporters supporters={project.supporters} />
        </div>
      )}
    </div>
  );
}
