import Link from "next/link";
import { Button } from "@dreadnought/ui";
import { Header } from "@/components/header";
import postgres from "postgres";

interface Course {
  id: number;
  slug: string;
  title: string;
  description: string;
  author: string | null;
  tags: string[] | null;
}

async function getCourses(): Promise<Course[]> {
  const sql = postgres(process.env["DATABASE_URL"]!);

  try {
    const courses = await sql<Course[]>`
      SELECT id, slug, title, description, author, tags
      FROM courses
      ORDER BY created_at DESC
    `;

    return courses.map((course) => ({
      ...course,
      // Parse JSONB tags if they come as string
      tags: typeof course.tags === "string" ? JSON.parse(course.tags) : course.tags,
    }));
  } finally {
    await sql.end();
  }
}

export default async function CoursesPage() {
  const courses = await getCourses();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-12">
        {/* Page Header */}
        <div className="border-4 border-primary bg-card p-8 mb-12">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">
            ALL COURSES
          </h1>
          <p className="text-lg font-mono text-muted-foreground">
            Free educational courses on panarchy, governance, and adaptive systems
          </p>
        </div>

        {/* Courses Grid */}
        {courses.length === 0 ? (
          <div className="border-4 border-secondary bg-card p-12 text-center">
            <p className="text-xl font-bold uppercase text-muted-foreground">
              NO COURSES AVAILABLE YET
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.slug}`}
                className="block group"
              >
                <div className="border-4 border-border bg-card hover:border-primary transition-colors h-full flex flex-col">
                  {/* Course Header */}
                  <div className="border-b-4 border-border bg-muted p-4">
                    <h2 className="text-2xl font-black uppercase tracking-tight group-hover:text-primary transition-colors line-clamp-2">
                      {course.title}
                    </h2>
                  </div>

                  {/* Course Content */}
                  <div className="p-6 flex-1 flex flex-col">
                    <p className="font-mono text-sm text-muted-foreground mb-6 line-clamp-3">
                      {course.description}
                    </p>

                    {/* Tags */}
                    {course.tags && course.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-6">
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

                    {/* Author */}
                    {course.author && (
                      <p className="text-sm font-mono text-muted-foreground mb-4">
                        BY: {course.author.toUpperCase()}
                      </p>
                    )}

                    {/* CTA */}
                    <div className="mt-auto">
                      <Button className="w-full" size="lg">
                        START COURSE
                      </Button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
