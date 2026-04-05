## Expense Tracker (Next.js)

Full-stack expense tracker built with Next.js App Router, PostgreSQL + Prisma, and NextAuth (credentials).

## Getting Started

### 1) Environment variables

Copy `.env.example` to `.env` and set values:

```bash
cp .env.example .env
```

Make sure `NEXTAUTH_URL` matches your dev port (you mentioned `3001`).

### 2) Database (PostgreSQL)

Use OrbStack to run PostgreSQL in a container (no Docker Desktop required).

#### macOS (OrbStack)

```bash
brew install orbstack
open -a OrbStack
```

Make sure OrbStack's Docker engine is enabled (it is by default), then start the Postgres container:

```bash
docker compose up -d
```

Set `DATABASE_URL` in your `.env` (example):

```bash
DATABASE_URL="postgresql://expense:expense@localhost:5432/expense_tracker?schema=public"
```

Then run migrations and generate Prisma client:

```bash
npm run prisma:migrate
npm run prisma:generate
```

### 3) Start the app

Run the development server:

```bash
npm run dev
```

Open the app at your configured `NEXTAUTH_URL` (e.g. `http://localhost:3001`).

### Pages

- `/register` – create account
- `/login` – sign in
- `/forgot-password` – email magic link to `/reset-password`
- `/dashboard` – charts + insights
- `/expenses` – add/list/sort/delete expenses
- `/summary` – monthly summary + budgets with 80% warning
- `/recurring` – recurring rules + generate expenses for current month
- `/admin` – admin only: view, edit, and delete users

### Accessing the database & admin

**Option 1: Prisma Studio (GUI)**  
Open a browser UI to view and edit data (including users):

```bash
npm run prisma:studio
```

Then open the URL shown (e.g. http://localhost:5555). You can delete users or change fields there.

**Option 2: Admin panel in the app**  
Only users with role `ADMIN` can open `/admin` to list users, edit (email, name, role, password), and delete users.

**Create the first admin**  
After running migrations, promote a user by email:

```bash
npx tsx scripts/promote-admin.ts your@email.com
```

Or in Prisma Studio: open the `User` table and set that user’s `role` to `ADMIN`.

### Deployment (Vercel)

1. **Database** – Create a hosted Postgres database (e.g. [Neon](https://neon.tech)) and copy its connection string.
2. **Env vars** in the Vercel project (**Settings → Environment Variables**):
   - `DATABASE_URL` – production Postgres URL (SSL).
   - `NEXTAUTH_SECRET` – long random string (`openssl rand -base64 32`).
   - `NEXTAUTH_URL` – your live site origin, e.g. `https://your-app.vercel.app` (must match the URL users open; no trailing path).
   - `NEXT_PUBLIC_APP_URL` – same as `NEXTAUTH_URL` if you use a single domain (improves Open Graph / PWA `metadataBase`; optional on Vercel if `NEXTAUTH_URL` is set).
3. **Migrations** – After the first deploy (or from CI), apply schema to production:
   ```bash
   DATABASE_URL="your-production-url" npx prisma migrate deploy
   ```
4. **Redeploy** after changing env vars.
5. **Password reset** – set `RESEND_API_KEY` (and optional `RESEND_FROM`) so “Forgot password” can send email. Without it, production returns an error; in development the reset URL is logged on the server.

**Install on a phone (PWA):** After the app is live on **HTTPS**, Android Chrome can offer “Install app”. On iOS, open the site in Safari → Share → **Add to Home Screen**.

### Tests

```bash
npm test
```

