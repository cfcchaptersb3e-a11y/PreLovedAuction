# Telling people how it works

The rehearsal is in [dry-run.md](dry-run.md); what the chapter's own first live
check changed is in [since-the-dry-run.md](since-the-dry-run.md). This picks up
after that, and it is not about the auction working. It is about people knowing
how to use it, which turned out to need its own set of decisions.

Two things were built, four weeks before the drive: six printable sheets and two
pages inside the app.

## Six one-page sheets

`handouts/` renders six A4 sheets at 300dpi, in the auction's own colours:
`create-an-account`, `how-to-place-a-bid`, `the-live-auction-night`, and one
each for the cataloger, the treasurer and the organizer. The PDFs are committed
because they are what gets printed; `handouts/README.md` says how to rebuild
them.

Three decisions worth keeping:

- **Real screenshots, not drawings of the app.** The sheets are photographed
  from the app actually running against a seeded auction, so a button on a sheet
  is the button on the screen. The cost is that a sheet is only as current as
  the last time it was built — hence the warning in that README to rebuild after
  anything that changes a label or a page.
- **The build fails on overflow.** A footer sliding off the bottom of the page
  is exactly the thing nobody notices until it has been printed forty times, so
  the renderer checks every sheet fits and refuses rather than quietly cropping.
- **Playwright and qrcode are not project dependencies.** They are needed only
  to build handouts. They get installed for the job and removed afterwards, so
  the deployment never carries a browser it has no use for.

## Two pages the app can point at

A sheet is a thing you have to still be holding. The same content now lives in
the app.

**`/faq`** is public — no sign-in — and carries 19 questions in three sections
(*Getting started*, *Bidding*, *The live auction night*), drawn from the three
member sheets. It is linked from the top nav as **Questions** and from the
footer. Answers stay collapsed until tapped, with jump links at the top.

It deliberately leads with the four things that catch people out, because each
one produces a message to an organizer when it isn't said in advance:

- a bid cannot be taken back
- the last two minutes keep extending, so a late bid never steals a lot
- a reserve can leave an item unsold even though there were bids
- an account with only a mobile number gets no outbid alerts

**`/admin/help`** is the same idea for the people running it: 19 questions
across *Cataloger*, *Treasurer* and *Organizer*, built from those three sheets,
shown only to staff. Whoever opens it gets their own role's section first, so a
cataloger doesn't scroll past the treasurer's work to find theirs. A helper who
lands on the public page is pointed at it.

Access was checked in a browser rather than reasoned about:

```
/admin/help signed out    → /login
/admin/help as bidder     → /
/admin/help as cataloger  → in, first section "Cataloger"
/admin/help as treasurer  → in, first section "Treasurer"
/admin/help as organizer  → in, first section "Organizer"
```

### Why the answers are plain text

Everything lives in `lib/faq.ts` as plain strings with `**bold**`, rendered into
React nodes rather than through `dangerouslySetInnerHTML`. It would have been
half the code to store a little HTML per answer. But this file is the one people
will edit — it is prose, it invites editing, and it will eventually be edited by
somebody who is thinking about wording rather than about markup. Plain text
means no edit to it can put markup on the page. That is worth more than the
saved lines.

### What `check:faq` is actually guarding

`npm run check:faq` runs in CI. It is not testing that the FAQ renders; it is
holding the things that rot silently as the app changes around it:

- anchors stay unique and link-safe, so a link to a question keeps working
- every helper role keeps a section — add a fourth role and this fails
- the public page never sends a member to an organizer-only screen
- the four surprises above stay answered, by name

That last one is the point of the whole file. A well-meaning trim of the FAQ
that drops "you can't undo a bid" is the failure mode, and it now can't ship.

## The thing to be careful about

The sheets and `lib/faq.ts` are two copies of the same knowledge. Change how the
app works and both need changing, or the chapter ends up with a printed sheet
that contradicts the page. `check:faq` cannot catch that — it does not know what
the sheets say. Nothing does, except remembering.

## Still worth doing

Unchanged from last time, and the first one has now been outstanding a while:

- **Rehearse the live finale** with three people: an auctioneer calling the
  room, the treasurer on the console, and somebody at home on `/live`. It needs
  people rather than a script, and it is the one part of the app that has never
  been exercised end to end.
- **Assign the Cataloger and Treasurer roles** to helpers while it is quiet.
- **Watch Brevo's 300-a-day ceiling** on the free tier. A busy evening with a
  lot of outbidding can approach it.
