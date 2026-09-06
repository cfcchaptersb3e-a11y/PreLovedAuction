# Dry run — 5 September 2026

A rehearsal of a whole auction, start to finish, before the chapter is invited
in. Everything below was done through the real pages on a phone-sized screen
(390px wide), not by writing to the database directly, so what is recorded here
is what a bidder or an organizer would actually have seen.

The run used a local copy of the code at commit `eeb6a38`. That matters for
what it proves and what it doesn't — see [What this did not
prove](#what-this-did-not-prove) at the end.

## What was set up

An organizer signed up, created **Dry Run Auction** with a ₱10,000 goal and
GCash payment instructions, listed three items, and opened it for bidding.

| Item | Starting bid | Increment | Reserve | Meant to test |
| --- | --- | --- | --- | --- |
| Rice cooker | ₱200 | ₱50 | ₱250 | A normal contested sale |
| Table lamp | ₱300 | ₱50 | ₱5,000 | A reserve nobody meets |
| Leather bag | ₱300 | ₱100 | — | An item nobody bids on |

Two bidders, Ana and Ben, signed up with an email address and a password.

## What happened

**The bidding.** Ana ₱200 → Ben ₱250 → Ana ₱400 → Ben ₱450 → Ana ₱500. A
₱220 bid from Ben while the minimum stood at ₱250 was refused with *"Your bid
must be at least ₱250. Someone may have bid just before you."*

**Outbid emails.** Sent every time, in both directions — Ana when Ben passed
her, Ben when she came back over him.

**Anti-sniping.** The point of the feature is that nobody can steal an item at
the buzzer, so it was tested at the buzzer:

| Bid placed | Closing time was | Closing time became |
| --- | --- | --- |
| 17:43:41 (79 seconds left) | 17:45:00 | 17:45:41 |
| 17:44:16 (85 seconds left) | 17:45:41 | 17:46:16 |

Two minutes from each bid, exactly. Note that the page shows closing times to
the minute, so a two-minute extension is not always visible as a changed
number — the clock is what to watch, not the printed time.

**Closing.** A bidder left the item page open and the clock ran out on it. The
page turned itself over to *"WINNING BID ₱500 · Bidding on this item has
closed"* with nobody touching anything. Ana received *"You won 'Rice
cooker'!"*, with the auction's GCash instructions in the body.

**The two awkward endings.** The lamp, bid to ₱300 against a ₱5,000 reserve,
ended **NO WINNING BID** and gave nobody the item. The bag, which nobody bid
on, ended the same way without incident.

**Settling up.** The winners list showed one winner, ₱500 won, ₱0 collected.
Marking it paid was one tap and showed as **Paid** on Ana's own page a moment
later. The auction page then read ₱500 of ₱10,000, items sold 1 / 3, 6 bids,
2 bidders. The CSV downloaded with the right figures and a TOTAL row; a bidder
who was handed that same download link got a 403 instead of the file.

**The nightly job.** Run by hand afterwards, it correctly found nothing left
to close — the pages had already done the work.

## What it turned up

The organizer's warning shown when no email service is configured still said
bidders *"can't get in"* and that sign-in links were being written to the
server log. That was true of the original magic-link sign-in and false since
the switch to passwords: people can sign in perfectly well without email
working, they just miss outbid alerts, winner notices and password resets. An
organizer reading it an hour before an auction would reasonably conclude the
whole thing was broken. Reworded to say what is actually lost.

Fixed alongside it: two British spellings that had survived the earlier pass
("finalise", "defence"), and a README line describing an API route for
magic-link verification that no longer exists.

## What this did not prove

The run was local. It says nothing about the two things that depend on the
deployment rather than the code:

- whether **Brevo actually delivers** to real inboxes, and
- whether **photo uploads** work against the Blob store.

Both are worth ten minutes on a phone before the chapter is invited: make a
throwaway auction with one item closing in ten minutes, upload a photo to it,
bid from two accounts, and confirm the outbid email really lands. Then delete
the auction.

The live finale has its own rehearsal, and it needs people rather than a
script: an auctioneer calling the room, the treasurer on the console, and
somebody at home on `/live` to confirm the two stay in step.
