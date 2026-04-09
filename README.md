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

**If `npm install` fails with `ETIMEDOUT` / `ECANCELED` on `read` during `prisma generate`:** the folder is often on **iCloud Drive** (e.g. `Documents`). Move the repo to a **fully local** path such as `~/Developer/ExpenseTracker-React`, then `rm -rf node_modules && npm install`. As a one-off you can run `npm install --ignore-scripts` and then `npx prisma generate` after files are local.

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
5. **Password reset** – configure one of:
   - **Resend:** `RESEND_API_KEY` (optional `RESEND_FROM`), or  
   - **SMTP:** `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` (optional `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM`).  
   Without either, production returns an error; in development the reset URL is logged on the server.

### Mobile install options

**iOS (PWA Add to Home Screen):**
- Open your HTTPS site in **Safari** (not Chrome on iOS).
- Tap **Share** -> **Add to Home Screen**.
- If icon/title does not refresh, remove old shortcut and add again after a hard refresh.

**Android APK (Capacitor wrapper):**

Release builds (`apk:release`, `aab:release`) need **JDK 17 or newer** on your PATH. If you see “This build uses a Java 8 JVM”, install a modern JDK and point `JAVA_HOME` at it, for example on macOS:

```bash
brew install temurin@17
export JAVA_HOME="$(/usr/libexec/java_home -v 17)"
java -version   # should show 17.x
```

Alternatively use **Android Studio → Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK** and pick **Embedded JDK** or **17**.

1. Set `CAP_SERVER_URL` to your deployed HTTPS app URL:
   ```bash
   export CAP_SERVER_URL="https://your-app.vercel.app"
   ```
2. Create the Android project once:
   ```bash
   npx cap add android
   ```
3. Sync web config into Android (this also copies `public/logo.png` into `cap-web/` so the **native shell** shows your logo before the remote app loads):
   ```bash
   npm run cap:sync:android
   ```
   **App icon / splash:** icons are built from `public/logo.png`. After you change that file, regenerate native assets and sync:
   ```bash
   npm run android:icons
   npm run cap:sync:android
   ```
4. Build debug APK:
   ```bash
   npm run apk:debug
   ```
5. APK output:
   `android/app/build/outputs/apk/debug/app-debug.apk`

#### Getting a downloadable APK (copy-paste)

Use this when you want a file you can AirDrop, upload to Drive, or sideload.

**Debug APK** (no Play signing; fine for testing):

```bash
cd /path/to/ExpenseTracker-React
export CAP_SERVER_URL="https://your-app.vercel.app"
export JAVA_HOME="$(/usr/libexec/java_home -v 21 2>/dev/null || /usr/libexec/java_home -v 17)"
npm run apk:debug
```

**Your file is here:**

`android/app/build/outputs/apk/debug/app-debug.apk`

Open that folder in Finder:

```bash
open android/app/build/outputs/apk/debug
```

**Release APK** (needs `android/keystore.properties` + keystore configured in Gradle):

```bash
export CAP_SERVER_URL="https://your-app.vercel.app"
export JAVA_HOME="$(/usr/libexec/java_home -v 21 2>/dev/null || /usr/libexec/java_home -v 17)"
npm run apk:release
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

You can also open Android Studio via:
```bash
npm run cap:open:android
```

### Tests

```bash
npm test
```

