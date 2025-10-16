# oghma.org - Free Course Platform

Educational platform with Stellar authentication and progress tracking.

**Parent**: `/CLAUDE.md` - Monorepo guidelines, Effect-TS patterns, design system, testing

## Quick Reference

**Purpose**: Free course platform with optional Stellar (SEP-10) auth for progress tracking

**Architecture**: See `ARCHITECTURE.md` for complete technical specification

**Tech Stack**: Next.js 15, Effect-TS, PostgreSQL, Stellar SDK, Tailwind CSS 4

## Project Structure

```
apps/oghma.org/
├── courses/                    # Course content (git-tracked)
├── src/
│   ├── app/                   # Next.js App Router
│   ├── lib/
│   │   ├── db/                # PostgreSQL with Effect-TS
│   │   ├── services/          # Business logic
│   │   ├── stellar/           # SEP-10 authentication
│   │   └── markdown/          # Markdown → HTML processor
│   └── cli/                   # Database & course parser tools
└── public/
```

## Core Concepts

### Course Structure (File-Based)

```
courses/
└── intro-to-panarchy/
    ├── metadata.json          # Course info + lesson list
    ├── 01-welcome.md
    ├── 02-what-is-panarchy.md
    └── 03-adaptive-cycles.md
```

**Course parsing**: Automatic sync on server startup (async, doesn't block)

### Authentication Flow

**SEP-10 Stellar Auth** (Freighter wallet):
1. User clicks "Connect Wallet"
2. Freighter signs challenge transaction
3. Server verifies signature → creates session
4. Progress tracking enabled

**No auth required** for browsing and reading courses.

### Database Schema

**Tables**: users, courses, lessons, lesson_progress, achievements

**See**: `ARCHITECTURE.md` for complete schema

## Development

```bash
# Setup
bun install
cp .env.example .env
bun run db:migrate

# Development
bun dev                 # Start dev server
bun run parse-courses   # Sync courses to DB
bun run db:migrate      # Run migrations
bun build               # Production build
bun lint                # Linter
```

## Key Services (Effect-TS)

### 1. CourseParserService
Reads `/courses` directory → syncs to PostgreSQL

### 2. AuthService
SEP-10 authentication flow with Stellar

### 3. ProgressService
Lesson completion + achievement tracking

### 4. MarkdownProcessor
Markdown → HTML with YouTube embed support

**See**: `ARCHITECTURE.md` for detailed service interfaces

## Design System

**Retrofuturistic Brutalism** (see `/docs/guides/design-system.md`):
- Zero `border-radius` (sharp edges)
- `uppercase tracking-wide` headers
- `font-mono` for body text
- High contrast (7:1 ratio)
- 48px minimum touch targets

**Colors**: Cyber green, electric cyan, purple (Evangelion-inspired)

## Dependencies

All Effect packages use `catalog:default` (version sync across monorepo).

**Key packages**:
- `effect`, `@effect/platform`, `@effect/sql-pg`
- `@stellar/stellar-sdk@12.3.0`
- `unified`, `remark-*`, `rehype-*` (Markdown)
- `@dreadnought/ui`, `@dreadnought/stellar-core`

## Testing

**Effect services** (ManagedRuntime pattern):
```typescript
test("should work", async () => {
  const testRuntime = ManagedRuntime.make(ServiceLive);
  try {
    const result = await testRuntime.runPromise(program);
    expect(result).toBe(expected);
  } finally {
    await testRuntime.dispose(); // CRITICAL!
  }
});
```

**See**: `/docs/guides/effect-ts-testing.md`

## Common Patterns

### Server Action (Progress Tracking)
```typescript
"use server";

export async function completeLesson(lessonId: number) {
  const session = await getSession();
  // Mark lesson complete
  // Check for course completion
  // Award achievement if last lesson
  revalidateTag("progress");
}
```

### API Route (Direct postgres)
```typescript
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

export async function GET() {
  const courses = await sql`SELECT * FROM courses`;
  return NextResponse.json(courses);
}
```

**Note**: Next.js API routes use direct `postgres`, not Effect layers.

**See**: `/apps/stat.mtlf.me/docs/guides/postgresql-effect-integration.md`

## Pages & Routes

**Public** (no auth):
- `/courses` - Course listing
- `/courses/[slug]/[lesson]` - Lesson viewer

**Authenticated only**:
- Progress tracking (session-based)
- Achievement badges

## Environment Variables

```bash
DATABASE_URL=postgresql://...
STELLAR_NETWORK=testnet
STELLAR_SERVER_ACCOUNT=G...
JWT_SECRET=...
NEXT_PUBLIC_STELLAR_NETWORK=testnet
```

## MVP Scope

**Included**:
- ✅ Browse courses (no auth required)
- ✅ SEP-10 Stellar authentication
- ✅ Progress tracking (authenticated)
- ✅ Achievement badges (visual)
- ✅ Markdown + YouTube embeds
- ✅ Retrofuturistic design

**Excluded from MVP**:
- ❌ i18n (add later)
- ❌ NFT certificates
- ❌ Comments/discussions
- ❌ Course search

## References

- **Architecture**: `ARCHITECTURE.md`
- **Frontend UX** (legacy): `FRONTEND.md`
- **Parent Guide**: `/CLAUDE.md`
- **PostgreSQL with Effect**: `/apps/stat.mtlf.me/docs/guides/postgresql-effect-integration.md`
- **Design System**: `/docs/guides/design-system.md`
- **SEP-10 Spec**: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0010.md
