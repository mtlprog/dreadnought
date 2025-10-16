# oghma.org - Architecture & Implementation Plan

Free course platform with Stellar authentication and progress tracking.

**Parent**: `/CLAUDE.md` - Monorepo guidelines, Effect-TS patterns, design system

## MVP Overview

**Purpose**: Platform for free educational courses with optional Stellar authentication for progress tracking

**Key Features**:
- Browse courses without authentication
- Markdown-based lessons with video embeds
- SEP-10 Stellar authentication (Freighter wallet)
- Progress tracking for authenticated users
- Achievement badges for course completion
- Retrofuturistic design system

**Tech Stack**: Next.js 15, Effect-TS, PostgreSQL, Stellar SDK, Tailwind CSS 4

## Project Structure

```
apps/oghma.org/
├── courses/                    # Course content (git-tracked)
│   ├── intro-to-panarchy/
│   │   ├── metadata.json
│   │   ├── 01-welcome.md
│   │   ├── 02-what-is-panarchy.md
│   │   └── 03-adaptive-cycles.md
│   └── stellar-basics/
│       ├── metadata.json
│       └── 01-what-is-stellar.md
├── src/
│   ├── app/                   # Next.js 15 App Router
│   │   ├── courses/
│   │   │   ├── page.tsx       # Course listing
│   │   │   └── [slug]/
│   │   │       └── [lesson]/
│   │   │           └── page.tsx
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── sep10/     # SEP-10 callback
│   │   │   └── progress/      # Progress endpoints
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── course-card.tsx
│   │   ├── lesson-viewer.tsx
│   │   ├── progress-tracker.tsx
│   │   └── header.tsx
│   ├── lib/
│   │   ├── db/
│   │   │   ├── pg-client.ts
│   │   │   ├── migrations/
│   │   │   └── repositories/
│   │   │       ├── course-repository.ts
│   │   │       ├── lesson-repository.ts
│   │   │       ├── progress-repository.ts
│   │   │       └── user-repository.ts
│   │   ├── services/
│   │   │   ├── course-parser.ts   # Парсинг /courses
│   │   │   ├── auth-service.ts    # SEP-10 auth
│   │   │   └── progress-service.ts
│   │   ├── stellar/
│   │   │   ├── config.ts
│   │   │   └── sep10.ts
│   │   └── markdown/
│   │       └── processor.ts       # MD → HTML + video embeds
│   └── cli/
│       ├── migrate.ts
│       └── parse-courses.ts
└── public/
    └── achievements/              # Achievement badge images
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  stellar_account_id VARCHAR(56) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_stellar_account ON users(stellar_account_id);
```

### Courses Table
```sql
CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  author VARCHAR(255),
  tags JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_courses_slug ON courses(slug);
```

### Lessons Table
```sql
CREATE TABLE lessons (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  slug VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  order_index INTEGER NOT NULL,
  markdown TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (course_id, slug)
);

CREATE INDEX idx_lessons_course_order ON lessons(course_id, order_index);
CREATE INDEX idx_lessons_course_slug ON lessons(course_id, slug);
```

### Lesson Progress Table
```sql
CREATE TABLE lesson_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (user_id, lesson_id)
);

CREATE INDEX idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_lesson ON lesson_progress(lesson_id);
```

### Achievements Table
```sql
CREATE TABLE achievements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, course_id)
);

CREATE INDEX idx_achievements_user ON achievements(user_id);
```

## Course File Structure

### metadata.json
```json
{
  "slug": "intro-to-panarchy",
  "title": "Introduction to Panarchy",
  "description": "Learn the fundamentals of panarchy theory and its applications",
  "author": "John Doe",
  "tags": ["panarchy", "politics", "theory"],
  "lessons": [
    { "slug": "welcome", "title": "Welcome to Panarchy" },
    { "slug": "what-is-panarchy", "title": "What is Panarchy?" },
    { "slug": "adaptive-cycles", "title": "Adaptive Cycles" }
  ]
}
```

### Lesson Markdown (01-welcome.md)
```markdown
# Welcome to Panarchy

This course introduces you to panarchy theory.

## Video Introduction

![Introduction](https://www.youtube.com/embed/VIDEO_ID)

## What You'll Learn

- Core concepts
- Adaptive cycles
- Real-world applications
```

**Video Embed**: Parser converts YouTube URLs to iframe embeds automatically.

## Core Services (Effect-TS)

### 1. CourseParserService (`src/lib/services/course-parser.ts`)

Reads `/courses` directory and syncs to database.

```typescript
interface CourseParserService {
  readonly parseAllCourses: () => Effect.Effect<
    ParseResult,
    FileSystemError | DatabaseError
  >;

  readonly syncCourse: (courseSlug: string) => Effect.Effect<
    Course,
    FileSystemError | DatabaseError
  >;
}
```

**Triggers**:
- Server startup (async, doesn't block)
- Manual CLI: `bun run parse-courses`

**Logic**:
1. Read all directories in `/courses`
2. Parse `metadata.json`
3. Read all `*.md` files
4. Upsert courses and lessons to DB
5. Delete courses/lessons not in filesystem

### 2. AuthService (`src/lib/services/auth-service.ts`)

SEP-10 Stellar authentication flow.

```typescript
interface AuthService {
  readonly initiateSEP10: () => Effect.Effect<
    { challengeTx: string },
    StellarError
  >;

  readonly verifySEP10: (signedTx: string) => Effect.Effect<
    { userId: number; stellarAccountId: string },
    AuthError
  >;
}
```

**Flow**:
1. User clicks "Connect Wallet" → opens Freighter
2. Freighter signs SEP-10 challenge transaction
3. Signed tx sent to `/api/auth/sep10/callback`
4. Server verifies signature → creates/updates user → sets session cookie

**Session**: JWT in HTTP-only cookie (7 days expiry)

### 3. ProgressService (`src/lib/services/progress-service.ts`)

Progress tracking for authenticated users.

```typescript
interface ProgressService {
  readonly completeLesson: (
    userId: number,
    lessonId: number
  ) => Effect.Effect<
    { achievement?: Achievement },
    ProgressError
  >;

  readonly getUserProgress: (userId: number, courseSlug: string) => Effect.Effect<
    CourseProgress,
    ProgressError
  >;
}
```

**Logic**:
- Mark lesson as complete
- Check if all lessons in course completed
- If yes → award achievement badge
- Return updated progress + optional achievement

### 4. MarkdownProcessor (`src/lib/markdown/processor.ts`)

Converts Markdown to HTML with video embeds.

```typescript
export function processMarkdown(markdown: string): Promise<string> {
  // 1. Preprocess YouTube embeds
  const withEmbeds = replaceYouTubeLinks(markdown);

  // 2. unified pipeline
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(withEmbeds);

  return result.toString();
}
```

**YouTube Detection**:
```typescript
function replaceYouTubeLinks(md: string): string {
  return md.replace(
    /!\[.*?\]\((https:\/\/www\.youtube\.com\/embed\/[^)]+)\)/g,
    '<iframe width="560" height="315" src="$1" frameborder="0" allowfullscreen></iframe>'
  );
}
```

## API Routes

### Authentication

**POST /api/auth/sep10/initiate**
```typescript
// Request: {}
// Response: { challengeTx: string, networkPassphrase: string }
```

**POST /api/auth/sep10/verify**
```typescript
// Request: { signedTx: string }
// Response: { success: boolean, user: { id, stellarAccountId } }
// Sets session cookie
```

### Progress

**POST /api/progress/complete**
```typescript
// Request: { lessonId: number }
// Headers: Cookie (session)
// Response: {
//   success: boolean,
//   achievement?: { courseSlug, courseName }
// }
```

**GET /api/progress/course/:slug**
```typescript
// Headers: Cookie (session)
// Response: {
//   courseSlug: string,
//   totalLessons: number,
//   completedLessons: number,
//   completedLessonIds: number[]
// }
```

## Pages & UX

### /courses - Course Listing

**Layout**:
- Header with wallet button (unauthenticated)
- Header with user account + disconnect (authenticated)
- Grid of course cards (2-3 columns desktop, 1 column mobile)

**Course Card**:
- Title
- Description (truncated)
- Progress bar (if authenticated and started)
- "Start Course" button

**No authentication required** - anyone can browse.

### /courses/[slug]/[lesson] - Lesson Page

**Layout**:
- Header (same as listing)
- Sidebar with lesson list (optional in MVP - can simplify)
- Main content: Markdown rendering
- "Complete Lesson" button (bottom)

**Logic**:
- Unauthenticated: can read, button shows "Login to track progress"
- Authenticated: button completes lesson + navigates to next
- Last lesson: shows achievement modal on completion

**Navigation**:
- "Previous" / "Next" buttons
- Or just sequential flow triggered by "Complete Lesson"

## Stellar Integration (SEP-10)

### Setup

**Package**: `@stellar/stellar-sdk@12.3.0`

**Network**: Testnet for MVP (env var `STELLAR_NETWORK=testnet`)

### SEP-10 Authentication Flow

**Reference**: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0010.md

```typescript
// 1. Server generates challenge
const { transaction } = await server
  .accounts()
  .accountId(SERVER_ACCOUNT_ID)
  .operations()
  .forAccount(SERVER_ACCOUNT_ID)
  .call();

// 2. Send challenge to client
// 3. Client signs with Freighter
const signedTx = await window.freighter.signTransaction(challengeTx, {
  network: 'TESTNET',
  networkPassphrase: Networks.TESTNET
});

// 4. Server verifies signature
const tx = new Transaction(signedTx, Networks.TESTNET);
const isValid = tx.signatures.some(sig => {
  return sourceAccount.verify(tx.hash(), sig.signature());
});

// 5. Create session
```

**Implementation**: Use `@dreadnought/stellar-core` for network config.

## Retrofuturistic Design

**Color Scheme** (example - Evangelion theme):
```css
:root {
  --background: #1a0d29;     /* Dark purple */
  --foreground: #00ff41;     /* Cyber green */
  --primary: #6b2e8f;        /* Purple */
  --secondary: #ff6b00;      /* Orange */
  --destructive: #ff0066;    /* Pink */
  --border: #333333;
  --cyber-green: #00ff41;
  --electric-cyan: #00ffff;
  --warning-amber: #ff6b00;
}
```

**Typography**:
- Headers: `uppercase tracking-wide font-black`
- Body: `font-mono` for technical feel
- Buttons: `uppercase tracking-wide`

**Components** (shadcn/ui customized):
- Zero `border-radius` (sharp edges)
- `border-2` or `border-4` on all cards/buttons
- Minimum 48px touch targets
- High contrast (7:1 ratio)

## Development Workflow

### 1. Initial Setup
```bash
cd apps/oghma.org
bun install
```

### 2. Database Setup
```bash
# Set DATABASE_URL in .env
DATABASE_URL=postgresql://user:pass@host:port/oghma

# Run migrations
bun run db:migrate
```

### 3. Parse Courses
```bash
# Initial sync
bun run parse-courses

# Or automatic on server start (async)
bun dev
```

### 4. Development
```bash
bun dev              # Dev server
bun build            # Production build
bun lint             # Linter
```

## Dependencies

**Add to catalog** (`root package.json`):
```json
{
  "catalogs": {
    "default": {
      "effect": "latest",
      "@effect/platform": "latest",
      "@effect/platform-node": "latest",
      "@effect/schema": "latest",
      "@effect/sql": "latest",
      "@effect/sql-pg": "latest",
      "@stellar/stellar-sdk": "^12.3.0",
      "postgres": "^3.4.5",
      "react": "^19.0.0",
      "next": "15.5.2",
      "unified": "^11.0.0",
      "remark-parse": "^11.0.0",
      "remark-gfm": "^4.0.0",
      "remark-rehype": "^11.0.0",
      "rehype-stringify": "^10.0.0"
    }
  }
}
```

**App dependencies**:
```json
{
  "dependencies": {
    "effect": "catalog:default",
    "@effect/platform": "catalog:default",
    "@effect/platform-node": "catalog:default",
    "@effect/schema": "catalog:default",
    "@effect/sql": "catalog:default",
    "@effect/sql-pg": "catalog:default",
    "@stellar/stellar-sdk": "catalog:default",
    "postgres": "catalog:default",
    "react": "catalog:default",
    "next": "catalog:default",
    "unified": "catalog:default",
    "remark-parse": "catalog:default",
    "remark-gfm": "catalog:default",
    "remark-rehype": "catalog:default",
    "rehype-stringify": "catalog:default",
    "@dreadnought/ui": "workspace:*",
    "@dreadnought/utils": "workspace:*",
    "@dreadnought/stellar-core": "workspace:*",
    "next-themes": "^0.4.0",
    "sonner": "^1.0.0",
    "lucide-react": "^0.400.0"
  }
}
```

## Testing Strategy

**Effect-TS Services** (ManagedRuntime pattern):
```typescript
test("should parse course", async () => {
  const testRuntime = ManagedRuntime.make(CourseParserServiceLive);
  try {
    const result = await testRuntime.runPromise(
      program
    );
    expect(result.courses).toHaveLength(1);
  } finally {
    await testRuntime.dispose();
  }
});
```

**React Components**:
```typescript
import { render, screen } from "@testing-library/react";

test("renders course card", () => {
  render(<CourseCard course={mockCourse} />);
  expect(screen.getByText("Course Title")).toBeInTheDocument();
});
```

## Deployment

**Platform**: Vercel (Next.js optimized)

**Database**: Railway PostgreSQL

**Environment Variables**:
```bash
DATABASE_URL=postgresql://...
STELLAR_NETWORK=testnet
STELLAR_SERVER_ACCOUNT=G...
JWT_SECRET=...
NEXT_PUBLIC_STELLAR_NETWORK=testnet
```

**Build Command**: `bun run build`

**Serverless Functions**:
- API routes run as serverless functions
- Use direct `postgres` client (not Effect layers)
- See `/apps/stat.mtlf.me/docs/guides/postgresql-effect-integration.md`

## MVP Scope

**Included**:
- ✅ Browse courses (unauthenticated)
- ✅ Read lessons (unauthenticated)
- ✅ SEP-10 Stellar auth (Freighter)
- ✅ Progress tracking (authenticated)
- ✅ Achievement badges (visual only)
- ✅ Markdown rendering with YouTube embeds
- ✅ Retrofuturistic design
- ✅ Dark/light theme toggle
- ✅ Mobile-first responsive

**Excluded from MVP**:
- ❌ i18n (add later)
- ❌ NFT certificates (add later)
- ❌ Comments/discussions
- ❌ Course search/filtering
- ❌ User profiles (beyond achievements)
- ❌ Course creation UI (file-based only)

## Future Enhancements

**Phase 2**:
- NFT achievement certificates on Stellar (Soroban)
- User profiles with public achievement showcase
- Course completion certificates (downloadable)
- Course search and tag filtering

**Phase 3**:
- Interactive quizzes and assessments
- Course creator dashboard
- Community features (discussions, Q&A)
- Course ratings and reviews

**Phase 4**:
- Video hosting (not just embeds)
- Live cohorts and scheduling
- Peer review and mentorship
- Tokenized incentives for completion

## References

- **Parent Guide**: `/CLAUDE.md`
- **Effect-TS Patterns**: `/docs/guides/effect-ts-patterns.md`
- **PostgreSQL Integration**: `/apps/stat.mtlf.me/docs/guides/postgresql-effect-integration.md`
- **Design System**: `/docs/guides/design-system.md`
- **Stellar Integration**: `/docs/guides/stellar-integration.md`
- **SEP-10 Spec**: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0010.md
