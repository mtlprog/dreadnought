# oghma.org - Free Course Platform

Educational platform with Stellar authentication and progress tracking.

## Quick Start

```bash
# Install dependencies
bun install

# Setup environment
cp .env.example .env
# Edit .env with your DATABASE_URL and STELLAR credentials

# Run database migrations
bun run db:migrate

# Parse courses (sync /courses directory to database)
bun run db:parse-courses

# Start development server
bun dev
```

Visit http://localhost:3000

## Project Structure

```
apps/oghma.org/
├── courses/                    # Course content (git-tracked)
│   └── intro-to-panarchy/
│       ├── metadata.json
│       └── *.md
├── src/
│   ├── app/                   # Next.js App Router
│   ├── components/            # React components
│   ├── lib/
│   │   ├── db/                # PostgreSQL with Effect-TS
│   │   ├── services/          # Business logic
│   │   ├── stellar/           # SEP-10 authentication
│   │   └── markdown/          # Markdown processor
│   └── cli/                   # Database & parser tools
└── public/
```

## Development

### Available Commands

```bash
bun dev                 # Start dev server
bun build              # Production build
bun lint               # Run linter
bun db:migrate         # Run database migrations
bun db:parse-courses   # Sync courses to database
```

### Adding a New Course

1. Create directory: `courses/your-course-slug/`
2. Create `metadata.json`:
   ```json
   {
     "slug": "your-course-slug",
     "title": "Your Course Title",
     "description": "Course description",
     "author": "Your Name",
     "tags": ["tag1", "tag2"],
     "lessons": [
       { "slug": "lesson-1", "title": "Lesson 1 Title" },
       { "slug": "lesson-2", "title": "Lesson 2 Title" }
     ]
   }
   ```
3. Create lesson files: `01-lesson-1.md`, `02-lesson-2.md`
4. Run `bun run db:parse-courses` to sync to database

### Lesson Markdown Format

```markdown
# Lesson Title

Introduction text...

## Video Embed

![Video Title](https://www.youtube.com/embed/VIDEO_ID)

## Content

Regular markdown content with **bold**, *italic*, lists, etc.
```

## Documentation

- **ARCHITECTURE.md** - Complete technical specification
- **CLAUDE.md** - Quick reference for development
- **FRONTEND.md** - Legacy UX documentation

## Tech Stack

- Next.js 15 + React 19
- Effect-TS (async operations)
- PostgreSQL (via Railway)
- Stellar SDK (SEP-10 auth)
- Tailwind CSS 4 (retrofuturistic design)

## Environment Variables

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/oghma
STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_NETWORK=testnet
STELLAR_SERVER_ACCOUNT=G...
JWT_SECRET=your-secret-key
```

## Deployment

**Platform**: Vercel

**Environment**: Set all environment variables in Vercel dashboard

**Build Command**: `bun run build`

**Database**: Railway PostgreSQL

## License

MIT
