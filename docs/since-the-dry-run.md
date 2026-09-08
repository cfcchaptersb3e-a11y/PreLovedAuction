# What changed after the first live check

The rehearsal is recorded in [dry-run.md](dry-run.md). This is everything that
followed: what the chapter's own check turned up, what a security pass found,
and what was done about each. Written down so nobody has to reconstruct it from
commit messages a year from now.

Five changes, in the order they happened.

## 1. Signing in with a mobile number

Plenty of the family and friends we want bidding are easier to reach on
`09XXXXXXXXX` than by email. An account now needs an email address, a mobile
number, or both, and either one signs the person in with their password.

A number typed `0917 555 0101`, `09175550101`, `+639175550101` or `9175550101`
all reach the same account, and no two accounts can hold the same number.

Two consequences were handled rather than left to be discovered mid-auction:

- **Nothing chases a number-only account.** Outbid alerts, winner notices and
  reset links all travel by email. The sign-up form says so the moment a number
  is typed without an address, and an address can be added later. Nothing breaks
  where a message would have gone — a winner with no address simply is not
  emailed, and the winners list and CSV carry their number instead.
- **Getting back in without an inbox.** A mobile-only member enters their number
  on the forgot-password page and is asked where to send the link. The request
  goes to the top of **People** for an organizer to approve. That approval *is*
  the security of it: a number typed into a form is no proof of ownership and
  the address given is unverified, so without it anyone could pair a member's
  number with their own address and take the account. Approving saves the
  address to the account and emails the link.

The same confirmation appears whether or not the number matches an account, so
the form cannot be used to discover who has one. Requests matching nothing are
still shown to organizers with a warning, so somebody who mistyped gets told.

**A note for whoever changes the schema next.** Mobile numbers are unique
through a partial index created by `scripts/ensure-indexes.ts`, not through
`@unique` in `schema.prisma`. Declaring it the Prisma way makes `prisma db push`
demand `--accept-data-loss`, and that flag would then sit in the deploy waving
through every future destructive change — including the ones it exists to catch.
The deploy and CI both run the index step immediately after the push.

## 2. Four security findings, fixed

A pass over sign-in. Dependencies were clean (`npm audit`: 0), as were the
upload routes, email escaping, CSV handling and the capability guards.

| Finding | Fix |
| --- | --- |
| A session survived a password reset — a stolen cookie kept working, and could still change the account's email address, which made the takeover permanent | Every cookie carries its issue time, checked against a `sessionsValidFrom` stamp the reset moves forward |
| Changing an email address or mobile number needed no proof | The current password is required to change either; changing a name is not |
| Anyone could flood the reset-request queue — 21 requests in 34 seconds from one browser, one with a 4,012-character address | Unattached requests stop at 40, stale ones clear after a fortnight, addresses over 254 characters refused. A request matching a real account is never dropped |
| Two ways to discover whether an address had an account: a passwordless account announced itself, and a locked account said so after eight guesses | Both now give the same answer as any other failure. The lockout still engages, and is still explained to whoever gives the right password |

`/api/cron/close` also treated a missing `CRON_SECRET` as "no key needed". It
now fails closed in production, and organizers see a banner until the secret is
set. Items still close whenever anyone opens a page, so the backstop being off
is not an emergency — but a backstop that goes quiet stops being one.

Each fix was re-tested with the probe that found the problem.

## 3. Browsing hundreds of items

The item list did not adapt to how many items there were: one card per row below
640px, and every matching item loaded. A few hundred donations meant a few
hundred cards in one column.

- **Two to a row on a phone**, three on a tablet, four on a desktop.
- **20 items to a page** by default, with 50, 100 and All. The control is links
  rather than a dropdown with an Apply button, and the choice is in the URL so a
  page can be shared or reloaded and come back the same.
- **Search, category, sort and a Show filter** on each auction's own page, not
  just the home page. The form is now shared between the two so they cannot
  drift into answering the same question differently.

Three bugs surfaced while testing this and were fixed: Clear left the dropdowns
claiming filters that were no longer applied; `?page=999` rendered the "nothing
here yet" panel as though the auction were empty; and the item count started
showing the size of the page rather than the number of items.

## 4. The organizer menu

It was four grey words that read as body text. It is now a bordered panel with
the current tab picked out, two columns on a phone.

## 5. Why the organizer tabs felt slow

Two causes, both measured against five auctions and 1,440 bids.

**The Auctions tab fired 30 database queries.** The totals helper ran six
queries for one auction, and both the organizer list and the public list of past
drives called it once per auction in a loop. One of the six re-fetched an
auction the caller already had; another read every bid row to count distinct
bidders in JavaScript. It is now four queries whatever the number of auctions —
`/admin` went from 30 to 8.

**Nothing acknowledged the tap.** Every organizer page renders fresh on each
visit, and with no loading state Next keeps the previous page on screen for the
whole round trip: you tap, nothing changes, you tap again. There is now a
skeleton for the section, and the tapped tab marks itself with a spinner.

Locally these pages render in 10–26ms either way, because the database is a
socket here. On the deployment every query is a network round trip, which is why
the count is what mattered.

## Two things that happened on deploy

- **Everyone was signed out once**, when the session cookie changed shape. Same
  passwords, one fresh sign-in.
- **The `CRON_SECRET` banner** appears in the organizer tools if that secret is
  not set in Vercel.

## Still worth doing

- **Rehearse the live finale** with three people: an auctioneer calling the
  room, the treasurer on the console, and somebody at home on `/live`. It needs
  people rather than a script, and it is the one part of the app that has never
  been exercised end to end.
- **Assign the Cataloger and Treasurer roles** to helpers while it is quiet.
- **Watch Brevo's 300-a-day ceiling** on the free tier. A busy evening with a
  lot of outbidding can approach it.
