import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@dreadnought/ui";
import { Header } from "@/components/header";
import { renderMarkdown } from "@/lib/markdown";
import postgres from "postgres";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

interface Course {
  id: number;
  slug: string;
  title: string;
}

interface Lesson {
  id: number;
  course_id: number;
  slug: string;
  title: string;
  markdown: string;
  order_index: number;
}

async function getCourseBySlug(slug: string): Promise<Course | null> {
  const sql = postgres(process.env["DATABASE_URL"]!);

  try {
    const courses = await sql<Course[]>`
      SELECT id, slug, title
      FROM courses
      WHERE slug = ${slug}
    `;

    return courses[0] ?? null;
  } finally {
    await sql.end();
  }
}

async function getLesson(
  courseId: number,
  lessonSlug: string
): Promise<Lesson | null> {
  const sql = postgres(process.env["DATABASE_URL"]!);

  try {
    const lessons = await sql<Lesson[]>`
      SELECT id, course_id, slug, title, markdown, order_index
      FROM lessons
      WHERE course_id = ${courseId} AND slug = ${lessonSlug}
    `;

    return lessons[0] ?? null;
  } finally {
    await sql.end();
  }
}

async function getAdjacentLessons(courseId: number, currentOrderIndex: number) {
  const sql = postgres(process.env["DATABASE_URL"]!);

  try {
    const [prev, next] = await Promise.all([
      // Previous lesson
      sql<Lesson[]>`
        SELECT id, slug, title, order_index
        FROM lessons
        WHERE course_id = ${courseId} AND order_index < ${currentOrderIndex}
        ORDER BY order_index DESC
        LIMIT 1
      `,
      // Next lesson
      sql<Lesson[]>`
        SELECT id, slug, title, order_index
        FROM lessons
        WHERE course_id = ${courseId} AND order_index > ${currentOrderIndex}
        ORDER BY order_index ASC
        LIMIT 1
      `,
    ]);

    return {
      prev: prev[0] ?? null,
      next: next[0] ?? null,
    };
  } finally {
    await sql.end();
  }
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lesson: string }>;
}) {
  const { slug, lesson: lessonSlug } = await params;

  const course = await getCourseBySlug(slug);
  if (!course) {
    notFound();
  }

  const lesson = await getLesson(course.id, lessonSlug);
  if (!lesson) {
    notFound();
  }

  const { prev, next } = await getAdjacentLessons(course.id, lesson.order_index);
  const htmlContent = await renderMarkdown(lesson.markdown);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 font-mono text-sm mb-8">
          <Link
            href="/courses"
            className="hover:text-primary transition-colors uppercase"
          >
            COURSES
          </Link>
          <span className="text-muted-foreground">/</span>
          <Link
            href={`/courses/${course.slug}`}
            className="hover:text-primary transition-colors uppercase"
          >
            {course.title}
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground uppercase">{lesson.title}</span>
        </nav>

        {/* Lesson Header */}
        <div className="border-4 border-primary bg-card p-8 mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 border-4 border-secondary bg-secondary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-black text-secondary">
                {String(lesson.order_index).padStart(2, "0")}
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">
              {lesson.title}
            </h1>
          </div>
        </div>

        {/* Lesson Content */}
        <article className="border-4 border-border bg-card p-8 md:p-12 mb-8">
          <div
            className="prose prose-lg prose-invert max-w-none
              prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight
              prose-h1:text-4xl prose-h1:mb-6
              prose-h2:text-3xl prose-h2:mb-4 prose-h2:mt-12
              prose-h3:text-2xl prose-h3:mb-3 prose-h3:mt-8
              prose-p:font-mono prose-p:text-base prose-p:leading-relaxed
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-strong:text-secondary prose-strong:font-black
              prose-code:text-secondary prose-code:bg-secondary/10 prose-code:px-2 prose-code:py-1 prose-code:border prose-code:border-secondary
              prose-pre:bg-muted prose-pre:border-4 prose-pre:border-border
              prose-ul:font-mono prose-ol:font-mono
              prose-li:marker:text-primary
              prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-6
              prose-hr:border-t-4 prose-hr:border-border"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: Markdown is sanitized by unified/rehype
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </article>

        {/* Complete Lesson Button */}
        <div className="border-4 border-secondary bg-card p-6 mb-8">
          <div className="flex items-center gap-4">
            <CheckCircle2 className="w-8 h-8 text-secondary" />
            <div className="flex-1">
              <p className="font-bold uppercase text-lg">
                MARK AS COMPLETE
              </p>
              <p className="text-sm font-mono text-muted-foreground">
                Connect wallet to track your progress
              </p>
            </div>
            <Button size="lg" disabled>
              COMPLETE LESSON
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Previous Lesson */}
          {prev ? (
            <Link
              href={`/courses/${course.slug}/${prev.slug}`}
              className="block group"
            >
              <div className="border-4 border-border bg-card hover:border-primary transition-colors p-6 h-full">
                <div className="flex items-center gap-4">
                  <ArrowLeft className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  <div>
                    <p className="text-xs font-bold uppercase text-muted-foreground mb-1">
                      PREVIOUS
                    </p>
                    <p className="font-bold uppercase group-hover:text-primary transition-colors">
                      {prev.title}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <Link
              href={`/courses/${course.slug}`}
              className="block group"
            >
              <div className="border-4 border-border bg-card hover:border-primary transition-colors p-6 h-full">
                <div className="flex items-center gap-4">
                  <ArrowLeft className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  <div>
                    <p className="text-xs font-bold uppercase text-muted-foreground mb-1">
                      BACK TO
                    </p>
                    <p className="font-bold uppercase group-hover:text-primary transition-colors">
                      COURSE OVERVIEW
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Next Lesson */}
          {next ? (
            <Link
              href={`/courses/${course.slug}/${next.slug}`}
              className="block group"
            >
              <div className="border-4 border-border bg-card hover:border-primary transition-colors p-6 h-full">
                <div className="flex items-center gap-4 justify-end">
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase text-muted-foreground mb-1">
                      NEXT
                    </p>
                    <p className="font-bold uppercase group-hover:text-primary transition-colors">
                      {next.title}
                    </p>
                  </div>
                  <ArrowRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </Link>
          ) : (
            <div className="border-4 border-secondary bg-secondary/10 p-6 h-full">
              <div className="flex items-center gap-4 justify-center h-full">
                <CheckCircle2 className="w-6 h-6 text-secondary" />
                <p className="font-bold uppercase text-secondary">
                  COURSE COMPLETE!
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
