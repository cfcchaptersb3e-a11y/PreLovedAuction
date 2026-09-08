/**
 * The questions people actually ask, and the answers.
 *
 * Kept alongside the printed handouts in handouts/sheets.mjs — the two say the
 * same things in different shapes, one to be read on a page and one to be
 * scanned on a phone. Change a rule in the app and both want revisiting.
 *
 * Answers are plain text with **bold** for emphasis; see renderRich in
 * components/Faq.tsx. Deliberately not HTML: nothing in this app renders raw
 * markup, and a FAQ is a poor reason to start.
 */

export type Question = {
  /** Used as the link anchor, so it has to stay put once it is out there. */
  id: string;
  q: string;
  a: string[];
};

export type FaqSection = {
  id: string;
  title: string;
  blurb: string;
  questions: Question[];
};

// ------------------------------------------------------------ for everybody

export const MEMBER_FAQ: FaqSection[] = [
  {
    id: "getting-started",
    title: "Getting started",
    blurb: "Anyone can look around. You only need an account to place a bid.",
    questions: [
      {
        id: "need-account",
        q: "Do I need an account just to look?",
        a: ["No. Browsing every item, its photos and the current bid is open to everyone. An account is only needed when you want to place a bid."],
      },
      {
        id: "sign-up-with",
        q: "What do I need to sign up?",
        a: [
          "Your name, a password of **at least 8 characters**, and either an email address or a mobile number — or both.",
          "Mobile numbers go in as **09XXXXXXXXX**. Typing it with spaces or with +63 in front is fine; it finds the same account either way.",
        ],
      },
      {
        id: "email-or-number",
        q: "Should I give an email address or a mobile number?",
        a: [
          "Either one signs you in. The difference is whether the auction can reach you.",
          "**With an email address** you get a message the moment somebody outbids you, a notice if you win, and you can reset your own password.",
          "**With a number only** you can bid perfectly well, but nothing will chase you — you have to check the auction yourself. You can add an address later from **My bids** and the alerts start.",
        ],
      },
      {
        id: "who-sees-me",
        q: "Can other bidders see my email or my number?",
        a: ["Never. Other bidders see your first name and last initial — Ana S. Your address and number are visible only to the organizers, and only so they can arrange payment and pickup if you win."],
      },
      {
        id: "forgot-password",
        q: "I have forgotten my password.",
        a: [
          "Tap **Forgot your password?** on the sign-in page and we email you a link. It works once and expires in an hour.",
          "If you signed up with a mobile number and no address, enter the number instead: you will be asked where to send the link, and a chapter organizer checks the request before anything is sent. That check is deliberate — without it, somebody could put your number with their own address.",
        ],
      },
      {
        id: "locked-out",
        q: "It says too many attempts.",
        a: ["Eight wrong passwords in a row locks an account for fifteen minutes. Wait it out, or reset the password — a reset clears the lock straight away."],
      },
    ],
  },
  {
    id: "bidding",
    title: "Bidding",
    blurb: "The highest bid when the clock runs out wins. A bid cannot be taken back.",
    questions: [
      {
        id: "how-to-bid",
        q: "How do I place a bid?",
        a: ["Open the item and look for the bidding box. It shows the smallest bid allowed — tap one of the three suggested amounts, or type your own, then tap **Place bid**."],
      },
      {
        id: "minimum",
        q: "Why can't I bid the amount I wanted?",
        a: ["Every item has a step between bids set by the organizers, so the next bid has to be at least the current one plus that step. The box tells you the minimum, and refuses anything under it."],
      },
      {
        id: "undo",
        q: "Can I take a bid back?",
        a: ["No. A placed bid stands, so check the amount before you tap — particularly if you typed it yourself rather than using one of the suggested amounts."],
      },
      {
        id: "outbid",
        q: "How will I know if somebody outbids me?",
        a: ["If you have an email address on your account, we email you the moment it happens, with a link straight back to the item. If you signed up with only a number, nothing is sent — check the item yourself before it closes."],
      },
      {
        id: "last-minute",
        q: "What happens if somebody bids in the last few seconds?",
        a: [
          "The clock extends. A bid in the **last two minutes** pushes the closing time out by two more, and it keeps doing that for as long as bids keep coming.",
          "So nobody can swoop in at the buzzer and take an item. If you are still bidding, keep going — the clock will wait for you.",
        ],
      },
      {
        id: "reserve",
        q: "What does it mean when an item does not sell?",
        a: ["Some items carry a reserve — a hidden minimum the provider is willing to let it go for. If the bidding never reaches it, the item does not sell, even though there were bids. You are never told the figure, only whether it sold."],
      },
      {
        id: "watchlist",
        q: "How do I keep an eye on something without bidding?",
        a: ["Tap **Watch this item** on its page. Everything you are watching is on your **Watchlist**, and everything you have bid on is under **My bids**."],
      },
      {
        id: "won",
        q: "I won. What now?",
        a: [
          "You get an email with the amount and how to pay, and it appears under **My bids** with the same details.",
          "Payment is arranged with the chapter directly — GCash, bank transfer or in person. An organizer marks it received once it arrives, and again when you collect the item.",
        ],
      },
    ],
  },
  {
    id: "live-night",
    title: "The live auction night",
    blurb: "A few lots are held back and sold by an auctioneer, with the room and the people at home bidding into the same lot.",
    questions: [
      {
        id: "what-is-live",
        q: "What is the live auction?",
        a: ["A few of the best lots do not close online. They are held back and sold by an auctioneer at the gathering, with everybody watching the same page as it happens."],
      },
      {
        id: "join-from-home",
        q: "Can I take part if I cannot be there?",
        a: ["Yes. Open **Live auction** and you see the lot on the block and the bid to beat, refreshing itself every couple of seconds. Bid from that page exactly as you would on any other item — the auctioneer sees it and calls it to the room."],
      },
      {
        id: "live-close",
        q: "When does a live lot close?",
        a: ["When the auctioneer says sold. Live lots have no clock — online bidding beforehand only sets the opening price."],
      },
      {
        id: "in-the-room",
        q: "What if I am in the room?",
        a: ["Raise your paddle and the auctioneer takes it. An organizer records it against your paddle number, so it lands in the same running order as the bids from home."],
      },
      {
        id: "signal-drops",
        q: "What if the hall's connection drops?",
        a: ["The auctioneer keeps going on paper and the bids are entered afterwards. The night does not stop for a bad signal. Bidding from home, sit somewhere with a decent connection and keep the page open."],
      },
    ],
  },
];

// -------------------------------------------------------- for helpers only

export const HELPER_FAQ: FaqSection[] = [
  {
    id: "cataloger",
    title: "Cataloger",
    blurb: "Listing the items. Deliberately narrow access: everything you need, nothing that could break an auction in progress.",
    questions: [
      {
        id: "cat-where",
        q: "Where do I add an item?",
        a: ["Organizer tools → **Auctions** → **Manage items** on the auction you are filling, then **Add an item**."],
      },
      {
        id: "cat-live",
        q: "When does an item become biddable?",
        a: ["Immediately, if the auction is already open. Items added to an auction that has not opened yet stay as drafts until an organizer opens it. Add an item when it is ready, not before."],
      },
      {
        id: "cat-photos",
        q: "My photos are too big to upload.",
        a: ["They are shrunk for you before they are sent, so photos straight from a phone are fine. Up to eight per item, and the first is used as the cover. Daylight, a plain background, and one photo of any flaw."],
      },
      {
        id: "cat-reserve",
        q: "What is the reserve for?",
        a: ["A hidden minimum. If the bidding never reaches it, the item does not sell. Bidders are never shown the figure. Set one only where the provider genuinely needs a floor — a reserve that is too high just means the item comes home again."],
      },
      {
        id: "cat-live-lot",
        q: "How do I hold something back for the live auction?",
        a: ["Tick **Save this for the live auction** on the item, and give it a lot number for the order the auctioneer calls them. Online bidding still runs and sets the opening price, but the lot will not close on its own."],
      },
      {
        id: "cat-cannot",
        q: "Why can't I see the winners or open the auction?",
        a: ["The cataloger role covers items and nothing else. Opening and closing an auction, the winners list and payments, and changing anyone's access all sit with other roles. If you need one of those, ask an organizer rather than working around it."],
      },
    ],
  },
  {
    id: "treasurer",
    title: "Treasurer",
    blurb: "Turning the record of who won what into money in the chapter's hands — and running the console on live auction night.",
    questions: [
      {
        id: "tre-where",
        q: "Where is the list of who owes what?",
        a: ["Organizer tools → **Winners & payments**. Every sold item with its winner and how to reach them. Set **Show** to **Unpaid** to see only what is outstanding."],
      },
      {
        id: "tre-mark",
        q: "What do Mark paid and Mark collected do?",
        a: [
          "**Mark paid** records that the money arrived. **Mark collected** records that the item was handed over. The winner sees both on their own page.",
          "Neither sends anything. They are the chapter's record, not a receipt — thank people yourself, it lands better anyway.",
        ],
      },
      {
        id: "tre-no-email",
        q: "A winner has no email address.",
        a: ["Somebody who signed up with a mobile number only shows their number instead. Ring them — they will not have been emailed about winning, so they may not know."],
      },
      {
        id: "tre-csv",
        q: "How do I get a copy for the chapter's records?",
        a: ["**Download CSV** gives every winner, amount and status in one file, with a total row. It is the chapter's copy of the drive."],
      },
      {
        id: "tre-console",
        q: "What am I doing on live auction night?",
        a: [
          "Running the console while the auctioneer calls the room. Start a lot, record each bid against a paddle number or a name as it is called, and tap **Sold** when the auctioneer sells it.",
          "It is two people for a reason: one calling, one recording. Rehearse it once beforehand — fifteen minutes with the auctioneer is enough.",
        ],
      },
      {
        id: "tre-offline",
        q: "What if the connection goes during the live auction?",
        a: ["Keep calling lots on paper and enter them once it returns. Nothing about the console needs to be live for the auction to continue; the record just catches up."],
      },
    ],
  },
  {
    id: "organizer",
    title: "Organizer",
    blurb: "Setting the drive up, opening and closing it, and giving helpers the access they need.",
    questions: [
      {
        id: "org-new",
        q: "How do I start a new drive?",
        a: [
          "Organizer tools → **New auction**. Each drive is its own auction with its own items, goal and running total — a new one starts from zero and the old one stays as a record of what it raised.",
          "The payment and pickup instructions go out to every winner, so write them once and write them well.",
        ],
      },
      {
        id: "org-open",
        q: "When do items become visible?",
        a: ["Items start as drafts and nobody can see them. **Open for bidding** puts every draft item live at once. Items added after that go live immediately."],
      },
      {
        id: "org-roles",
        q: "How do I give somebody access?",
        a: ["**People**, then the role picker on their row. Give the least access that lets them do the job: cataloger for listing items, treasurer for payments and the live console. Assign them while it is quiet, not on the night."],
      },
      {
        id: "org-reset",
        q: "Somebody cannot get into their account.",
        a: [
          "**People** → **Reset password** on their row gives you a one-time link to read out or text over. It expires in an hour and works once.",
          "Requests from members who signed up with a mobile number appear at the top of the same page. Check the number belongs to who you think it does before approving — anyone can type a number into that form.",
        ],
      },
      {
        id: "org-banner",
        q: "There is a red banner in the organizer tools.",
        a: [
          "It means outbid alerts and winner notices are not being sent, and it names what to set in the deployment settings. Fix it before opening an auction.",
          "A second banner appears if the nightly closing job cannot run. That one is not urgent — items still close whenever anyone opens a page — but it is a backstop worth having.",
        ],
      },
      {
        id: "org-close",
        q: "How does the auction end?",
        a: ["Items close on their own clocks and their winners are emailed. **Close auction** ends anything still running immediately and notifies those winners too."],
      },
      {
        id: "org-rehearse",
        q: "What should I check before inviting the chapter?",
        a: [
          "Run a throwaway auction with one cheap item closing in ten minutes. Bid from two accounts, let it close on its own, and confirm the outbid email really lands in a real inbox.",
          "Watch the email allowance too: the free tier stops at **300 emails a day**, and a busy evening with a lot of outbidding can approach it.",
        ],
      },
    ],
  },
];
