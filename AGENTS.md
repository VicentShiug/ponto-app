# AGENTS.md - PontoApp

Guidance for agentic coding agents working on this codebase.

## Build & Development Commands

```bash
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run Next.js lint

# Database
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed database with initial data
npm run db:studio    # Open Prisma Studio
```

**No test framework is installed.**

## Project Structure

```
ponto-app/
├── app/                    # Next.js 14 App Router
│   ├── api/               # API routes (auth, employee, manager)
│   ├── employee/          # Employee pages (dashboard, history)
│   ├── manager/           # Manager pages (dashboard, employees, reports, audit)
│   └── login/             # Login page
├── components/            # React components (AppLayout, ClockButton, Toaster)
├── lib/                   # Utilities (auth, prisma, hours, audit)
├── prisma/                # Schema and seed
└── middleware.ts          # Route protection
```

## Code Style Guidelines

### Imports
- Use path alias `@/*` (resolves to project root)
- Order: external libs → internal imports → local components
- Named imports preferred

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, signToken } from "@/lib/auth";
import { z } from "zod";
import { clsx } from "clsx";
```

### TypeScript
- Strict mode enabled
- Define return types for API routes
- Use Zod for request validation

```typescript
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const data = loginSchema.parse(body);
  // ...
}
```

### Naming
- Components: PascalCase (`ClockButton.tsx`)
- Utils: camelCase (`signToken`)
- API routes: lowercase with params (`employees/[id]/route.ts`)
- DB models: PascalCase (`User`, `TimeEntry`)
- DB fields: snake_case with `@map`

```prisma
model TimeEntry {
  clockIn DateTime? @map("clock_in")
}
```

### Error Handling
- Use try-catch with error type checking
- HTTP status codes: 400, 401, 500
- Portuguese error messages

```typescript
} catch (err) {
  if (err instanceof z.ZodError) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
  console.error(err);
  return NextResponse.json({ error: "Erro interno" }, { status: 500 });
}
```

### CSS & Styling
- Tailwind CSS with CSS variables
- Use `clsx` + `tailwind-merge` for conditional classes

```typescript
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}
```

### Authentication
- JWT in HttpOnly cookie
- Use `getSession()`, `requireSession()`, `requireManager()`
- Session payload: `userId`, `email`, `name`, `role`

### Database (Prisma)
- Singleton pattern in `lib/prisma.ts`
- Async/await, not `.then()` chains

### React Components
- `"use client"` for client-side components
- Define prop interfaces explicitly
- Early returns for loading states

## Key Libraries

- **next**: 14.1.3 (App Router)
- **typescript**: 5 (strict mode)
- **tailwindcss**: 3.3
- **prisma**: 5.10 + PostgreSQL
- **zod**: 3.22 (validation)
- **jose**: 5.2 (JWT)
- **bcryptjs**: 2.4 (hashing)
- **recharts**: 2.12 (charts)
- **jspdf** + **jspdf-autotable**: PDF export
- **xlsx**: Excel export
- **lucide-react**: icons
- **date-fns** + **date-fns-tz**: dates
- **clsx** + **tailwind-merge**: className utility

## Environment Variables

```bash
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
```

## Common Patterns

**New API endpoint**: Create `app/api/feature/route.ts`, define Zod schema, implement handler with try-catch, use `requireSession()` or `requireManager()` for auth.

**New page**: Create `app/section/page.tsx` or `app/section/[id]/page.tsx`. For client components, create `*Client.tsx` and import from page.

**Database changes**: Edit `prisma/schema.prisma`, run `npm run db:push` (dev) or `npm run db:migrate`.

## Seed Credentials

| Role     | Email                | Password  |
|----------|---------------------|-----------|
| Manager  | manager@empresa.com | manager123|
| Employee | ana@empresa.com     | senha123  |
| Employee | bruno@empresa.com  | senha123  |
| Employee | carla@empresa.com  | senha123  |
