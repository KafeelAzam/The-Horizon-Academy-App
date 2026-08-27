# The Horizon Academy — Fees Management System
Powered by ANASH · developed by Kafeel Azam

A complete, self-hosted fees management system for a coaching centre:
Node.js + Express backend, a real SQLite database, and a single-page
frontend — all included in this folder.

## What's inside

```
horizon-academy-app/
├── server.js         → the backend (Express + SQLite)
├── package.json
├── data/
│   └── horizon.db     → created automatically on first run — this IS your database
└── public/
    └── index.html     → the entire frontend app
```

## Requirements

- **Node.js version 22.5.0 or newer.** This app uses Node's built-in SQLite
  support, so there is nothing extra to compile or install for the database —
  just Node itself. Check your version with:
  ```
  node -v
  ```
  If it's older than 22.5.0, download a newer version from https://nodejs.org.

## Running it

1. Open a terminal in this folder.
2. Install the one dependency (Express):
   ```
   npm install
   ```
3. Start the server:
   ```
   npm start
   ```
4. You'll see something like:
   ```
   Server running at http://localhost:3000
   ```
5. Open that address in your browser. That's the whole app.

Leave the terminal window open — closing it stops the server. To run it in
the background on a real server/PC, look into a process manager like `pm2`
(`npm install -g pm2`, then `pm2 start server.js --name horizon-academy`).

## How multi-device / multi-staff sync actually works

Every browser that opens the app **from the same running server** reads and
writes the same SQLite database (`data/horizon.db`) through the server's API.
There is nothing to configure — it's automatic.

- **On one computer only:** open `http://localhost:3000` — that's it.
- **Across multiple devices on the same office/WiFi network:** find this
  computer's local IP address (e.g. `192.168.1.24` — on Windows run
  `ipconfig`, on Mac/Linux run `ifconfig` or `ip addr`), then on any other
  phone/laptop on the same network open `http://192.168.1.24:3000`. They'll
  all see and edit the same data live.
- **Across the internet (different locations):** you need to deploy this
  server somewhere reachable from the internet — a small VPS (DigitalOcean,
  a cheap Linode, etc.), or a platform like Render/Railway/Fly.io that can
  run a persistent Node.js process (not a static-site host — this needs an
  actual server process running, plus persistent disk storage for
  `data/horizon.db` so the database survives restarts/deploys). The exact
  steps depend on which host you pick; ask if you'd like help with a
  specific one.

**Important — this is not a multi-account system.** Anyone who can reach the
server's address can view and edit *everything* — there are no separate
staff logins or permission levels. The in-app PIN lock (Settings → PIN Lock)
is a simple shared gate, not per-user accounts. If you need individual staff
logins and audit trails down the line, that's a further step up from what's
here — let me know if you want that built out.

## Backing up your data

Two ways:
1. **The database file itself** — `data/horizon.db` is your entire
   database. Copy this file somewhere safe periodically (e.g. cron job,
   or just manually). Stop the server first for a perfectly consistent
   copy, though SQLite's WAL mode makes a live copy reasonably safe too.
2. **In-app backups** — Settings → Backup & Restore still works exactly as
   before: Export/Import as JSON (full-fidelity) or Excel (.xlsx, good for
   bulk editing rosters outside the app), and PDF export for sharing/printing.

## Everything else

All the features from earlier versions are unchanged and still work exactly
the same — students, discounts, admission-fee installments, two-copy fee
slips sized for half an A4 page, late fees, WhatsApp reminders, expenses,
daily/weekly/monthly/yearly records, bulk actions, promote-to-next-year,
printable ID cards, income/expense charts, the demo-data button, and the
Trash/undo safety net. The only thing that changed under the hood is *where*
the data lives — a real server-side database instead of the browser.
