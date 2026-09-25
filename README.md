# Our Little House

Two people share one room, one cat, and one furniture puzzle. Each person can finish work, study, or movement once a day, and that adds one piece. When the puzzle is full, the furniture or outfit appears in the room.

The interface is English by default. A toggle in the panel switches it to Chinese.

## Run locally

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5173 . The dev server uses this port only. If it says the port is already in use, stop the previous dev server and start again.

Without Supabase, two windows on the same computer can still share a room. Progress stays on that machine.

## Connect Supabase

1. Create a project at [Supabase](https://supabase.com).
2. In the SQL Editor, run all of `supabase/schema.sql`.
3. Turn on Email login under Authentication. Turn off Confirm email if a new account should enter immediately after signing up.
4. Put the project URL and anon key in `.env`. Do not commit this file.

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Copy `.env.example` and replace the values. Restart `npm run dev` after changing `.env`.

After login, creating a home, joining a room, and checking in are stored under that account’s user id. Signing in on another device brings back the same room and puzzle. A new home gets a 6-digit invite code, and the link looks like `/room/123456`.

## What counts as a day

The check-in day starts at 4:00 AM in Asia/Shanghai. Each person can mark a module “Nailed It!” once per day and receive one piece. “Resting Today” does not remove pieces already earned.
