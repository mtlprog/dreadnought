import * as S from "@effect/schema/Schema";

// Course metadata from metadata.json
export const CourseMetadata = S.Struct({
  slug: S.String,
  title: S.String,
  description: S.String,
  author: S.optional(S.String),
  tags: S.optional(S.Array(S.String)),
  lessons: S.Array(
    S.Struct({
      slug: S.String,
      title: S.String,
    })
  ),
});

export type CourseMetadata = S.Schema.Type<typeof CourseMetadata>;

// Database models
export interface Course {
  id: number;
  slug: string;
  title: string;
  description: string;
  author: string | null;
  tags: string[] | null;
  created_at: Date;
  updated_at: Date;
}

export interface Lesson {
  id: number;
  course_id: number;
  slug: string;
  title: string;
  order_index: number;
  markdown: string;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: number;
  stellar_account_id: string;
  created_at: Date;
  last_login: Date | null;
}

export interface LessonProgress {
  id: number;
  user_id: number;
  lesson_id: number;
  completed: boolean;
  completed_at: Date | null;
}

export interface Achievement {
  id: number;
  user_id: number;
  course_id: number;
  earned_at: Date;
}
