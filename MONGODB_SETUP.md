# FinTrack MongoDB Integration — Phase 1

This migration keeps the existing React UI, Express API routes, Gemini logic, WhatsApp webhook logic, and in-memory business logic intact while adding MongoDB persistence.

## 1. Create MongoDB Atlas

Create a MongoDB Atlas cluster and a database named `fintrack` (the database name is also read from the connection string).

Create a database user and allow your development machine/server IP to connect.

## 2. Add the connection string

For local development, create `.env` in the project root:

```env
GEMINI_API_KEY=your_gemini_key
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/fintrack
```

Do not commit `.env` or expose the MongoDB password.

For Google AI Studio/Cloud Run, add `MONGODB_URI` as a secret/environment variable using the platform's Secrets configuration. Do not put the real connection string in source code.

## 3. Install dependencies

Using npm:

```bash
npm install
```

Using Bun:

```bash
bun install
```

The project now includes `mongoose` as a dependency.

## 4. Start the application

```bash
npm run dev
```

On the first startup with a valid `MONGODB_URI`, FinTrack seeds the current demo data from `src/data/initialData.ts` into MongoDB.

You should see logs similar to:

```text
[MongoDB] Connected successfully.
[MongoDB] FinTrack demo data seeded.
[MongoDB] Loaded 10 transactions, 4 clients and 6 chat messages.
```

## 5. What is stored

The database uses these collections:

- `fintrackbusinesses`
- `fintrackclients`
- `fintracktransactions`
- `fintrackchatmessages`

The existing frontend continues receiving the same `/api/data` response shape.

## 6. Persistence behavior in Phase 1

The existing server still works with its current arrays so the UI/business logic does not need to be rewritten at once. When MongoDB is connected:

- application state is loaded from MongoDB at startup;
- transaction/client/chat mutations are mirrored to MongoDB;
- `/api/reset` restores the demo data in MongoDB;
- restarting the server reloads the persisted state.

This is intentionally a compatibility bridge for the first database migration. A later phase can replace the arrays with direct repository/database queries once the database behavior is verified.

## 7. Health check

Open:

```text
http://localhost:3000/api/health
```

With MongoDB configured it should report:

```json
{
  "status": "ok",
  "database": "mongodb"
}
```

If `MONGODB_URI` is missing, the app intentionally falls back to the existing in-memory mode and reports `database: "in-memory"`.
