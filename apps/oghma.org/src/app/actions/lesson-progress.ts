"use server";

import { revalidateTag } from "next/cache";
import postgres from "postgres";
import { getSession } from "@/lib/stellar/session";

export async function completeLesson(lessonId: number) {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return {
        success: false,
        error: "You must be authenticated to track progress",
      };
    }

    const sql = postgres(process.env["DATABASE_URL"]!);

    try {
      // Mark lesson as complete
      await sql`
        INSERT INTO lesson_progress (user_id, lesson_id, completed, completed_at)
        VALUES (${session.userId}, ${lessonId}, true, NOW())
        ON CONFLICT (user_id, lesson_id)
        DO UPDATE SET completed = true, completed_at = NOW()
      `;

      // Check if all lessons in the course are completed
      const courseResult = await sql<
        {
          course_id: number;
          total_lessons: string;
          completed_lessons: string;
        }[]
      >`
        SELECT l.course_id, COUNT(l.id) as total_lessons,
               COUNT(lp.id) FILTER (WHERE lp.completed = true) as completed_lessons
        FROM lessons l
        LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = ${session.userId}
        WHERE l.course_id = (SELECT course_id FROM lessons WHERE id = ${lessonId})
        GROUP BY l.course_id
      `;

      if (courseResult.length > 0) {
        const { course_id, total_lessons, completed_lessons } = courseResult[0]!;

        // Award achievement if all lessons completed
        if (Number(completed_lessons) === Number(total_lessons)) {
          await sql`
            INSERT INTO achievements (user_id, course_id)
            VALUES (${session.userId}, ${course_id})
            ON CONFLICT (user_id, course_id) DO NOTHING
          `;
        }
      }

      revalidateTag("progress");
      revalidateTag("achievements");

      return { success: true };
    } finally {
      await sql.end();
    }
  } catch (error) {
    console.error("Complete lesson error:", error);
    return {
      success: false,
      error: "Failed to mark lesson as complete",
    };
  }
}
