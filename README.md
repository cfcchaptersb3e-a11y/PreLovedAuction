# CFC SB3E Pre-Loved Auction

[![CI](https://github.com/cfcchaptersb3e-a11y/PreLovedAuction/actions/workflows/ci.yml/badge.svg)](https://github.com/cfcchaptersb3e-a11y/PreLovedAuction/actions/workflows/ci.yml)

An online auction for our chapter's fundraising drives. Members provide pre-loved
items, organisers list them, and members' family and friends bid from their
phones. When an auction ends the app records the winners, emails them, and gives
organisers a list to reconcile payments against.

Each fundraiser is a separate **auction event** with its own items, its own goal
and its own running total — so when the chapter fundraises again, the "raised so
far" figure starts back at zero and the previous auction is kept as a record.

## What it does

**For bidders**
- Browse live items, search and filter by category, sort by what's ending soonest
- Sign in with an email address and password
- Place bids, with a clear minimum and one-tap suggested amounts
- Get an email the moment someone outbids them, and another if they win
- Star items to a personal watchlist
- See every bid they've placed and everything they've won, with payment details

**Roles**

Four roles, so helpers can be given the least access that lets them do their
job and nobody breaks the auction by accident:

| Role | Can | Cannot |
| --- | --- | --- |
| **Bidder** | Browse and bid. Everyone starts here. | Anything in the organiser tools |
| **Cataloguer** | Add and edit items, upload photos | Open or close an auction; see winners or payments |
| **Treasurer** | Work the winners list, mark paid and collected, export the CSV | Change items or auctions |
| **Organiser** | Everything, including granting roles | — |

Organisers change roles under **People**. Anyone whose address is listed in
`ADMIN_EMAILS` becomes an organiser when they sign up.

**For organisers**
- Create an auction, set the goal, the currency and the payment/pickup instructions
- Add items with photos (upload from a phone, or paste image links), a starting
  bid, a bid increment and an optional hidden reserve price
- Open the auction, end a single item early, or close the whole thing at once
- See a live fundraising total against the goal
- Work a winners list showing contact details, amounts and paid/collected status,
  and export it to CSV for reconciliation
- Grant organiser access to other members

**Fair bidding, built in**
- A bid placed in the final 2 minutes pushes the closing time out by 2 minutes, so
  an item can't be won by sniping at the buzzer
- Simultaneous bids are settled at serializable isolation, so two people bidding
  the same amount at the same instant can never both "win"
- Bidders see each other as "Maria S.", never by email address

## Running it locally

You need Node 20+ and a PostgreSQL database.

```bash
npm install
cp .env.example .env      # then fill in DATABASE_URL and AUTH_SECRET
npm run db:push           # create the tables
npm run seed              # optional: a demo auction with six items
npm run dev
```

Open http://localhost:3000.

To become an organiser, put your email in `ADMIN_EMAILS` in `.env`, then create
an account at `/signup` with that address — it is made an admin automatically.

Without an email provider configured, no mail is actually sent; each message is
printed in the terminal running `npm run dev`. That is enough to follow a
password-reset link during development.

Useful commands:

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run db:push` | Apply the schema to the database |
| `npm run db:studio` | Browse the data in Prisma Studio |
| `npm run seed` | Load a demo auction |
| `npm run check` | Run the auction-rules checks against the database |
| `npm run check:auth` | Run the password and sign-in checks |
| `npm run check:roles` | Run the role permission checks |

> Both `check` scripts write to whatever `DATABASE_URL` points at. Point it at a
> scratch database, not the live one.

Every push and pull request runs the build (which type-checks the whole project)
and the auction-rule checks against a throwaway PostgreSQL service, via
`.github/workflows/ci.yml`.

## Deploying to Vercel

1. Push this repository to GitHub.
2. In Vercel, **Add New → Project** and import the repository. Framework is
   detected as Next.js; leave the build settings alone.
3. Under **Storage**, create a Postgres database and connect it to the project.
   That sets `DATABASE_URL` for you.
4. Under **Settings → Environment Variables**, add:

   | Variable | Value |
   | --- | --- |
   | `AUTH_SECRET` | A random string. Generate with `openssl rand -base64 32`. |
   | `APP_URL` | Your deployed URL, e.g. `https://sb3e-auction.vercel.app` |
   | `ADMIN_EMAILS` | Organisers' emails, comma separated |
   | `CRON_SECRET` | Another random string (Vercel sends it to the closing job) |
   | `RESEND_API_KEY` | Optional but recommended — see below |
   | `EMAIL_FROM` | e.g. `CFC SB3E Auction <auction@yourdomain.org>` |
   | `BLOB_READ_WRITE_TOKEN` | Set automatically if you add Vercel Blob storage |

5. Deploy. The database tables are created for you — `vercel.json` sets a build
   command that applies the schema before building, so there is no terminal step
   and nothing to run from a laptop.

6. Visit `/login`, sign in with an email from `ADMIN_EMAILS`, and you'll land in
   the organiser tools.

### How items close

An item closes and its winner is emailed through three mechanisms, so nothing
depends on a single one working:

1. **The countdown.** When an item's clock reaches zero, any open page refreshes
   itself, which settles the item there and then. In practice this is what closes
   most items — people are watching as an auction ends.
2. **Any page view.** Every page settles overdue items when it loads, so the
   first person to open the site catches anything missed.
3. **A daily cron job**, registered in `vercel.json`, as a backstop.

The cron runs only once a day because Vercel's free Hobby plan allows no more
than that (and only guarantees the hour it runs in). That is fine here: the cron
is the last line of defence, not the primary one.

The practical consequence is that if an item ends when nobody is on the site,
its winner's email can be delayed until someone next opens a page. Bidding is
still correctly closed the instant the clock runs out — a late bid is rejected
whatever the item's recorded status — so no one can win an item after time.
Upgrading to Vercel Pro would allow a per-minute cron if you ever want the
notification to be immediate regardless.

### About the automatic schema step

The build runs `prisma db push`, which is safe to repeat: on the first deploy it
creates the tables, and on every deploy after that it does nothing unless the
schema changed. Existing auction data is untouched.

It deliberately runs *without* `--accept-data-loss`. If a future schema change
would destroy data — dropping a column that still holds bids, say — the deploy
fails rather than going through with it. That is the behaviour you want mid-
auction, but it does mean such a change needs handling deliberately: make the
change in two steps (add the new shape, migrate the data, then remove the old),
or apply it by hand with `npm run db:push` against the production database.

### Email

Email is optional in the sense that the app runs without it — messages are
written to the server log instead — but for a real auction you need it, because
it carries the outbid and winner notifications, and the password-reset links.
The organiser tools show a warning until it is set up.

Two providers are supported. Set **one**.

**Brevo — no domain needed.** Brevo verifies a single sender address, so the
chapter can send from an address it already owns. Free tier is 300 emails a day,
comfortably more than an auction needs.

1. Sign up at [brevo.com](https://www.brevo.com)
2. **Senders, Domains & Dedicated IPs → Senders → Add a sender** — use the
   chapter's own address, then enter the 6-digit code Brevo emails to it
3. **SMTP & API → API Keys** — create one and set it as `BREVO_API_KEY`
4. Set `EMAIL_FROM` to exactly that verified address, e.g.
   `CFC SB3E Auction <sb3echapter@gmail.com>`

**Resend — needs a verified domain.** A new Resend account only delivers to the
address it was registered with, so with the default `onboarding@resend.dev`
sender your bidders receive nothing. Add your domain under Domains, add the DNS
records it gives you, set `RESEND_API_KEY`, and set `EMAIL_FROM` to an address
at that domain.

If both keys are set, Brevo is used.

A send that fails is never silent: someone who can't be sent a password-reset
link is told so rather than being shown "check your inbox", and failed outbid or
winner emails are logged with a line naming the person to contact. Bidding and
closing never fail because of email — the bid is recorded and the item is
settled regardless.

Note that signing in does **not** depend on email. That is deliberate: a mail
problem should cost people their notifications, not their access to the
auction.

### Photos

Photos are shrunk in the browser before they are sent — long edge 1600px, saved
as JPEG. A 4 MB phone photo becomes a few hundred kilobytes, which keeps uploads
quick on mobile data, keeps item pages light for bidders, and stays under
Vercel's 4.5 MB request limit (which it enforces before the app ever sees the
request).

**On Vercel you need Blob storage.** Add it under Storage in the dashboard and
`BLOB_READ_WRITE_TOKEN` is set for you. Without it uploads are refused with a
message saying so, because Vercel's filesystem is read-only and there is nowhere
to put the file.

**Self-hosting**, uploads are written to `public/uploads` and served back
through `/api/uploads/<file>`. They are read through a route rather than as
static files because anything written into `public/` after the build is not
served by Next's production server.

Pasting an image link always works, whatever the storage setup.

## Running an auction

1. **Organiser tools → New auction.** Name it, set the goal and the currency,
   and write the payment and pickup instructions — winners get these by email.
2. **Add the items.** Photos, an honest description, who provided it, a starting
   bid and an increment. Set a reserve if an item shouldn't sell below a price.
   Items start as drafts and aren't visible to anyone yet.
3. **Open for bidding.** Every draft item goes live at once. Share the link.
4. **While it runs**, items close on their own at their end times, winners are
   emailed, and the fundraising total climbs. You can add items mid-auction (they
   go live immediately) or end one early.
5. **Close the auction** when you're done. Anything still running ends right away
   and those winners are notified too.
6. **Winners & payments.** Work down the list, tick off each payment and handover
   as it happens, and export the CSV for the chapter's records.
7. **Next time**, create a new auction. The goal and the total start from zero;
   the old one stays in *Past auctions* as a record of what was raised.

## How it's built

Next.js (App Router) with server actions, Prisma and PostgreSQL, Tailwind CSS,
and passwordless email sign-in. No payment processor — winners pay the chapter
directly by whatever means you put in the payment instructions, and organisers
mark each one paid.

```
app/                 pages, server actions and API routes
  actions/           bidding, auth and organiser mutations
  admin/             organiser tools
  api/               magic-link verification, uploads, the closing cron job
components/          UI, split into shared and admin/
lib/
  auction.ts         bidding rules, anti-sniping, closing, fundraising totals
  auth.ts            passwords (scrypt), lockout, resets, session cookies
  permissions.ts     what each role may do — read by both guards and the UI
  email.ts           Resend, or the server log when no key is set
  money.ts           integer minor units — no floating point in bid maths
prisma/schema.prisma the data model
scripts/check-rules.ts  auction-rule checks
```

Money is stored in integer centavos throughout, so bid arithmetic is exact.
Passwords are hashed with scrypt and never stored in the clear, repeated failed
sign-ins lock an account for 15 minutes, and password-reset tokens are stored
only as SHA-256 hashes, so a database leak hands nobody a usable password or a
working reset link.
