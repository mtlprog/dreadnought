import { Effect } from "effect";
import { SqlClient } from "@effect/sql";

export default Effect.flatMap(
  SqlClient.SqlClient,
  (sql) =>
    Effect.gen(function* () {
      // Users table
      yield* sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        stellar_public_key VARCHAR(56) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

      // Create index only if column exists (handles case where table already exists with old schema)
      yield* sql`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'stellar_public_key'
        ) THEN
          CREATE INDEX IF NOT EXISTS idx_users_stellar_public_key ON users(stellar_public_key);
        END IF;
      END $$;
    `;

      // Courses table
      yield* sql`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        author VARCHAR(255),
        tags JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

      yield* sql`
      CREATE INDEX IF NOT EXISTS idx_courses_slug
      ON courses(slug)
    `;

      // Lessons table (flat structure, no chapters)
      yield* sql`
      CREATE TABLE IF NOT EXISTS lessons (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        slug VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        order_index INTEGER NOT NULL,
        markdown TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (course_id, slug)
      )
    `;

      yield* sql`
      CREATE INDEX IF NOT EXISTS idx_lessons_course_order
      ON lessons(course_id, order_index)
    `;

      yield* sql`
      CREATE INDEX IF NOT EXISTS idx_lessons_course_slug
      ON lessons(course_id, slug)
    `;

      // Lesson Progress table
      yield* sql`
      CREATE TABLE IF NOT EXISTS lesson_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP WITH TIME ZONE,
        UNIQUE (user_id, lesson_id)
      )
    `;

      yield* sql`
      CREATE INDEX IF NOT EXISTS idx_lesson_progress_user
      ON lesson_progress(user_id)
    `;

      yield* sql`
      CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson
      ON lesson_progress(lesson_id)
    `;

      // Achievements table
      yield* sql`
      CREATE TABLE IF NOT EXISTS achievements (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, course_id)
      )
    `;

      yield* sql`
      CREATE INDEX IF NOT EXISTS idx_achievements_user
      ON achievements(user_id)
    `;

      yield* Effect.log("Initial schema created successfully");
    })
);
