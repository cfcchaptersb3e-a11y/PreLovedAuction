# CFC SB3E Pre-Loved Auction

[![CI](https://github.com/cfcchaptersb3e-a11y/PreLovedAuction/actions/workflows/ci.yml/badge.svg)](https://github.com/cfcchaptersb3e-a11y/PreLovedAuction/actions/workflows/ci.yml)

An online auction for our chapter's fundraising drives. Members donate pre-loved
items, organisers list them, and members' family and friends bid from their
phones. When an auction ends the app records the winners, emails them, and gives
organisers a list to reconcile payments against.

Each fundraiser is a separate **auction event** with its own items, its own goal
and its own running total — so when the chapter fundraises again, the "raised so
far" figure starts back at zero and the previous auction is kept as a record.

## What it does

**For bidders**
- Browse live items, search and filter by category, sort by what's ending soonest
- Sign in with a one-time emailed link — no password to remember
- Place bids, with a clear minimum and one-tap suggested amounts
- Get an email the moment someone outbids them, and another if they win
- Star items to a personal watchlist
- See every bid they've placed and everything they've won, with payment details

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

To sign in, put your email in `ADMIN_EMAILS` in `.env`, go to `/login` and enter
it. Without `RESEND_API_KEY` set, no email is actually sent — the sign-in link is
printed in the terminal running `npm run dev`. Copy it into the browser.

Useful commands:

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run db:push` | Apply the schema to the database |
| `npm run db:studio` | Browse the data in Prisma Studio |
| `npm run seed` | Load a demo auction |
| `npm run check` | Run the auction-rules checks against the database |

> `npm run check` writes to whatever `DATABASE_URL` points at. Point it at a
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

`vercel.json` also registers a cron job that closes finished items every five
minutes. Pages close overdue items when they're viewed too, so results stay
correct even if a cron run is missed.

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

Email is optional. Without `RESEND_API_KEY` the app works fine and writes each
message to the server log — but then bidders can't receive sign-in links, so in
practice you want it for a real auction.

Sign up at [resend.com](https://resend.com) (the free tier covers an auction this
size), create an API key, and add it as `RESEND_API_KEY`. To send from your own
domain rather than Resend's test address, verify the domain with them and set
`EMAIL_FROM` to match.

### Photos

With Vercel Blob storage connected, organisers can upload photos straight from a
phone. Without it, uploads fall back to writing into `public/uploads` — fine when
self-hosting, but Vercel's filesystem is read-only, so add Blob storage there.
Pasting image links always works.

## Running an auction

1. **Organiser tools → New auction.** Name it, set the goal and the currency,
   and write the payment and pickup instructions — winners get these by email.
2. **Add the items.** Photos, an honest description, who donated it, a starting
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
  auth.ts            magic links and signed session cookies
  email.ts           Resend, or the server log when no key is set
  money.ts           integer minor units — no floating point in bid maths
prisma/schema.prisma the data model
scripts/check-rules.ts  auction-rule checks
```

Money is stored in integer centavos throughout, so bid arithmetic is exact.
Sign-in tokens are stored only as SHA-256 hashes, so a database leak doesn't hand
anyone a working login link.
