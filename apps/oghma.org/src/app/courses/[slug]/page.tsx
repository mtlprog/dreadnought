import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@dreadnought/ui";
import { Header } from "@/components/header";
import postgres from "postgres";
import { ArrowLeft } from "lucide-react";

interface Course {
  id: number;
  slug: string;
  title: string;
  description: string;
  author: string | null;
  tags: string[] | null;
}

interface Lesson {
  id: number;
  course_id: number;
  slug: string;
  title: string;
  order_index: number;
}

async function getCourse(slug: string): Promise<Course | null> {
  const sql = postgres(process.env["DATABASE_URL"]!);

  try {
    const courses = await sql<Course[]>`
      SELECT id, slug, title, description, author, tags
      FROM courses
      WHERE slug = ${slug}
    `;

    if (courses.length === 0) {
      return null;
    }

    const course = courses[0]!;
    return {
      ...course,
      tags: typeof course.tags === "string" ? JSON.parse(course.tags) : course.tags,
    } as Course;
  } finally {
    await sql.end();
  }
}

async function getLessons(courseId: number): Promise<Lesson[]> {
  const sql = postgres(process.env["DATABASE_URL"]!);

  try {
    const lessons = await sql<Lesson[]>`
      SELECT id, course_id, slug, title, order_index
      FROM lessons
      WHERE course_id = ${courseId}
      ORDER BY order_index ASC
    `;

    return lessons;
  } finally {
    await sql.end();
  }
}

export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await getCourse(slug);

  if (!course) {
    notFound();
  }

  const lessons = await getLessons(course.id);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-12">
        {/* Back Button */}
        <Link
          href="/courses"
          className="inline-flex items-center gap-2 font-bold uppercase text-sm hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          BACK TO COURSES
        </Link>

        {/* Course Header */}
        <div className="border-4 border-primary bg-card p-8 md:p-12 mb-12">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-6">
            {course.title}
          </h1>

          <p className="text-lg md:text-xl font-mono text-muted-foreground mb-8">
            {course.description}
          </p>

          {/* Meta Info */}
          <div className="flex flex-wrap gap-6 items-center">
            {course.author && (
              <div className="font-mono text-sm">
                <span className="text-muted-foreground">BY: </span>
                <span className="font-bold">{course.author.toUpperCase()}</span>
              </div>
            )}

            <div className="font-mono text-sm">
              <span className="text-muted-foreground">LESSONS: </span>
              <span className="font-bold">{lessons.length}</span>
            </div>

            {course.tags && course.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {course.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 border-2 border-secondary bg-secondary/10 text-xs font-bold uppercase tracking-wide"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Lessons List */}
        <div className="border-4 border-border bg-card">
          <div className="border-b-4 border-border bg-muted p-6">
            <h2 className="text-2xl font-black uppercase tracking-tight">
              COURSE CONTENTS
            </h2>
          </div>

          {lessons.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-lg font-bold uppercase text-muted-foreground">
                NO LESSONS AVAILABLE
              </p>
            </div>
          ) : (
            <div className="divide-y-4 divide-border">
              {lessons.map((lesson, index) => (
                <Link
                  key={lesson.id}
                  href={`/courses/${course.slug}/${lesson.slug}`}
                  className="block group hover:bg-muted transition-colors"
                >
                  <div className="p-6 md:p-8 flex items-center gap-6">
                    {/* Lesson Number */}
                    <div className="flex-shrink-0 w-16 h-16 border-4 border-secondary bg-secondary/10 flex items-center justify-center">
                      <span className="text-2xl font-black text-secondary">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>

                    {/* Lesson Title */}
                    <div className="flex-1">
                      <h3 className="text-xl md:text-2xl font-bold uppercase tracking-tight group-hover:text-primary transition-colors">
                        {lesson.title}
                      </h3>
                    </div>

                    {/* Arrow */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 border-2 border-border group-hover:border-primary flex items-center justify-center transition-colors">
                        <span className="text-xl font-black">→</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Start Button */}
          {lessons.length > 0 && (
            <div className="p-6 md:p-8 border-t-4 border-border bg-muted">
              <Link href={`/courses/${course.slug}/${lessons[0]!.slug}`}>
                <Button size="lg" className="w-full md:w-auto">
                  START FIRST LESSON
                </Button>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
