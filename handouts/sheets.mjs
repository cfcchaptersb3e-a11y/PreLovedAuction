/**
 * What each handout says.
 *
 * Everything here is meant to be true of the app as it stands — if a label or
 * a rule changes, this file changes with it. Written for chapter members and
 * helpers, not for developers.
 */

export const SHEETS = [
  {
    id: "create-an-account",
    title: 'How to <em>create your account</em>',
    standfirst:
      "Anyone can look around the auction. You only need an account when you want to " +
      "<strong>place a bid</strong>. It takes about a minute.",
    steps: [
      { title: "Open the auction", shot: "account-home", alt: "The auction's front page",
        body: ["Type the address above into any browser on your phone."] },
      { title: 'Tap "Create an account"', shot: "account-login", alt: "The sign-in page",
        body: ["It sits just under the <strong>Sign in</strong> button."] },
      { title: "Say how to reach you", shot: "account-signup", alt: "The sign-up form",
        body: ["Your name, then an email address or a mobile number &mdash; or both."] },
      { title: "Pick a password, and you're in", shot: "account-items", alt: "Items up for bidding",
        body: ["<strong>Eight characters or more</strong>, typed twice. Then start bidding."] },
    ],
    panel: {
      title: "An email address, a mobile number, or both",
      lead: "Either one signs you in. What differs is whether the auction can reach you.",
      left: { title: "With an email address", points: [
        "We email you the moment someone outbids you",
        "You get a notice if you win, with how to pay",
        "You can reset your own password any time",
      ]},
      right: { title: "With a number only", points: [
        "You can bid perfectly well &mdash; but nothing will chase you",
        "Check the auction yourself so you don&rsquo;t miss the close",
        "Add an email later from <strong>My bids</strong> and the alerts start",
      ]},
    },
    notes: [
      { title: "Your name stays private",
        body: "Other bidders only ever see your first name and last initial &mdash; never your email or number." },
      { title: "Forgot your password?",
        body: "Tap <strong>Forgot your password?</strong> on the sign-in page. Signed up with a number? Enter it and say where to send the link &mdash; an organizer checks it first." },
      { title: "Add your mobile number",
        body: "It is how organizers reach you about payment and pickup if you win an item." },
    ],
  },

  {
    id: "how-to-place-a-bid",
    title: 'How to <em>place a bid</em>',
    standfirst:
      "Every peso goes to the chapter, so bid like you mean it. " +
      "A bid cannot be taken back, and the highest one when the clock runs out wins.",
    steps: [
      { title: "Open an item", shot: "bid-item", alt: "An item's page",
        body: ["Tap any card to see the photos, the condition, and who provided it."] },
      { title: "Check the minimum", shot: "bid-form", alt: "The bidding box",
        body: ["The box shows the smallest bid allowed. Tap one of the three suggested amounts, or type your own."] },
      { title: "Tap Place bid", shot: "bid-placed", alt: "Confirmation that the bid was placed",
        body: ["You become the highest bidder straight away, and we email you the moment somebody passes you."] },
      { title: "Follow how it goes", shot: "bid-account", alt: "My bids",
        body: ["<strong>Watch this item</strong> keeps it on your list. <strong>My bids</strong> shows everything you have bid on and won."] },
    ],
    panel: {
      title: "Two rules worth knowing before you bid",
      lead: "Both exist so the auction is fair to everyone, not just whoever is watching at the last second.",
      left: { title: "The clock can extend", points: [
        "A bid in the <strong>last 2 minutes</strong> pushes the closing time out by two more",
        "So nobody can swoop in at the buzzer and take an item",
        "Keep bidding as long as the clock keeps moving",
      ]},
      right: { title: "Some items have a reserve", points: [
        "A hidden minimum the provider is willing to let it go for",
        "If the bidding never reaches it, the item does not sell",
        "You are not told the figure &mdash; only whether it sold",
      ]},
    },
    notes: [
      { title: "You cannot take a bid back",
        body: "A placed bid stands. Check the amount before you tap &mdash; especially if you typed it yourself." },
      { title: "If you win",
        body: "You get an email with the amount and how to pay, and it appears under <strong>My bids</strong> with the payment details." },
      { title: "Paying and collecting",
        body: "Payment is arranged with the chapter directly &mdash; GCash, bank or in person. An organizer confirms it once received." },
    ],
  },

  {
    id: "the-live-auction-night",
    title: 'How the <em>live auction night</em> works',
    standfirst:
      "A few of the best lots are held back from the online close and sold by an auctioneer " +
      "on the night &mdash; with the room and the people at home bidding into the same lot.",
    steps: [
      { title: "Open the live page", shot: "live-audience", alt: "The live auction page",
        body: ["Everyone watches the same page. It shows the lot on the block and the bid to beat, and refreshes itself every couple of seconds."] },
      { title: "The room bids out loud", shot: "live-roombid", alt: "The operator recording a bid from the room",
        body: ["The auctioneer calls the lot. Somebody in the room raises a paddle, and an organizer records it against that paddle number."] },
      { title: "You bid from home", shot: "live-home", alt: "Bidding on the live lot from a phone",
        body: ["Your bid goes into the same lot from the same page. When the auctioneer calls it sold, the winner is recorded there and then."] },
    ],
    panel: {
      title: "Whether you are in the hall or at home",
      lead: "One lot, one price, one running order. Nobody is bidding in a separate queue.",
      left: { title: "In the room", tone: "info", points: [
        "Raise your paddle and the auctioneer takes it",
        "An organizer records it against your paddle number",
        "You will hear the current bid called as it climbs",
      ]},
      right: { title: "At home", tone: "info", points: [
        "The page shows the same lot and the same price",
        "Bid from it exactly as you would on any other item",
        "The auctioneer sees your bid and calls it to the room",
      ]},
    },
    notes: [
      { title: "Live lots do not close on a clock",
        body: "Online bidding beforehand sets the opening price. The lot ends when the auctioneer says sold, not at a set time." },
      { title: "If the hall's signal drops",
        body: "The auctioneer keeps going on paper and the bids are entered afterwards. The night does not stop for a bad connection." },
      { title: "Winning a live lot",
        body: "It joins the same winners list as everything else, with the same payment and pickup arrangements." },
    ],
    scan: {
      title: "Scan to follow the live auction",
      body: "Open the auction and tap <strong>Live auction</strong>. Have it open before the first lot is called.",
      ask: "Bidding from home? Sit somewhere with a decent signal &mdash; and keep the page open.",
    },
  },

  {
    id: "role-cataloger",
    scan: {
      title: "Scan to open the auction",
      body: "Sign in and the organizer tools appear in the menu. Or type <strong>cfc-sb3e-auctions.vercel.app</strong> into any browser.",
      ask: "Not sure whether something should be listed? Ask an organizer before you publish it.",
    },
    forWhom: "For the cataloger",
    title: 'Listing the <em>items</em>',
    standfirst:
      "You put the chapter's donations in front of the bidders. An honest description and a decent " +
      "photo are worth more to the total than anything else on this page.",
    steps: [
      { title: "Open the organizer tools", shot: "cat-tools", alt: "The organizer tools menu",
        body: ["Sign in and the tools appear in the menu. You will see <strong>Auctions</strong> &mdash; that is yours."] },
      { title: "Pick the auction, then Manage items", shot: "cat-list", alt: "The items list",
        body: ["Everything already listed sits here, with its bids and closing time."] },
      { title: "Describe it honestly", shot: "cat-form", alt: "The item form",
        body: ["Title, condition, who provided it. Say what is worn &mdash; bidders trust a listing that admits a scratch."] },
      { title: "Set the money and the clock", shot: "cat-prices", alt: "Starting bid, increment, reserve and closing time",
        body: ["A starting bid, the step between bids, and when it closes. A reserve is optional and never shown to bidders."] },
    ],
    panel: {
      title: "What the cataloger role can and cannot do",
      lead: "Deliberately narrow: it is the access that lets you do the job, and nothing that could break an auction in progress.",
      left: { title: "You can", points: [
        "Add, edit and withdraw items in any auction",
        "Upload photos &mdash; they are shrunk for you, so phone photos are fine",
        "Mark a lot to be held back for the live finale, with its lot number",
      ]},
      right: { title: "You cannot", points: [
        "Open or close an auction",
        "See the winners list, payments or anyone&rsquo;s contact details",
        "Change what anyone else is allowed to do",
      ]},
    },
    notes: [
      { title: "Items go live immediately",
        body: "If the auction is already open, an item you add is biddable the moment you save it. Add it when it is ready, not before." },
      { title: "Photos do the selling",
        body: "Daylight, a plain background, and one photo of any flaw. Several photos are better than one." },
      { title: "The reserve is a hidden floor",
        body: "If bidding never reaches it the item does not sell. Set it only where the provider truly needs a minimum." },
    ],
  },

  {
    id: "role-treasurer",
    scan: {
      title: "Scan to open the auction",
      body: "Sign in and go to <strong>Winners &amp; payments</strong>. On the night, <strong>Live auction</strong> is the console.",
      ask: "Rehearse the console once before the night &mdash; fifteen minutes with the auctioneer is enough.",
    },
    forWhom: "For the treasurer",
    title: 'Collecting <em>what was raised</em>',
    standfirst:
      "The app records who won what. Turning that into money in the chapter's hands is yours, " +
      "and so is the console on live auction night.",
    steps: [
      { title: "Open Winners & payments", shot: "tre-winners", alt: "The winners list",
        body: ["Every sold item, its winner, and how to reach them. Filter to <strong>Unpaid</strong> to see what is outstanding."] },
      { title: "Tick each one off", shot: "tre-mark", alt: "Marking a payment received",
        body: ["<strong>Mark paid</strong> when the money arrives, <strong>Mark collected</strong> when the item is handed over. The winner sees it on their own page."] },
      { title: "Run the console on the night", shot: "live-console", alt: "The live auction console",
        body: ["The auctioneer calls the room; you record each bid and tap <strong>Sold</strong>. Keeping the record is a two-person job for a reason."] },
    ],
    panel: {
      title: "What the treasurer role can and cannot do",
      lead: "Enough to settle up and to run the finale &mdash; and nothing that could alter what was sold.",
      left: { title: "You can", points: [
        "See every winner, their bid and their contact details",
        "Mark payments received and items collected",
        "Download the CSV, and run the live auction console",
      ]},
      right: { title: "You cannot", points: [
        "Add, edit or withdraw items",
        "Open, close or create an auction",
        "Change what anyone else is allowed to do",
      ]},
    },
    notes: [
      { title: "Marking paid emails nobody",
        body: "It is a record for the chapter, not a receipt. Thank people yourself &mdash; it lands better anyway." },
      { title: "The CSV is the chapter's copy",
        body: "<strong>Download CSV</strong> gives every winner, amount and status in one file for the chapter's records." },
      { title: "Winners without an email",
        body: "Somebody who signed up with a mobile number only shows their number instead. Ring them &mdash; they will not have been emailed." },
    ],
  },

  {
    id: "role-organizer",
    scan: {
      title: "Scan to open the auction",
      body: "Sign in and the organizer tools appear in the menu. Share this same square with the chapter to bring people in.",
      ask: "Print the member sheets too &mdash; creating an account, placing a bid, and the live auction night.",
    },
    forWhom: "For the organizer",
    title: 'Running <em>the whole drive</em>',
    standfirst:
      "You set the auction up, decide when it opens and closes, and give the helpers the access they need. " +
      "Each drive is its own auction, and each one starts its total from zero.",
    steps: [
      { title: "Create the auction", shot: "org-newevent", alt: "The new auction form",
        body: ["A name, the goal, and the payment and pickup instructions &mdash; those go out to every winner, so write them once and write them well."] },
      { title: "Fill it and open it", shot: "org-auctions", alt: "The auctions list",
        body: ["Items start as drafts. <strong>Open for bidding</strong> puts them all live at once. Share the link and let it run."] },
      { title: "Give helpers their access", shot: "org-people", alt: "The People page",
        body: ["Least access that lets them do the job: cataloger for listing, treasurer for money and the live console."] },
    ],
    panel: {
      title: "Two things to check before you invite the chapter",
      lead: "Both appear as a banner in the organizer tools if they are wrong, and both are quick to fix.",
      left: { title: "Do the rehearsal", points: [
        "A throwaway auction, one cheap item closing in ten minutes",
        "Bid from two accounts and let it close on its own",
        "Confirm the outbid email really lands in a real inbox",
      ]},
      right: { title: "Watch for these", points: [
        "A red banner means outbid and winner emails are not sending",
        "Brevo&rsquo;s free tier stops at <strong>300 emails a day</strong>",
        "Assign the cataloger and treasurer roles while it is quiet",
      ]},
    },
    notes: [
      { title: "Closing the auction",
        body: "Items close on their own clocks. <strong>Close auction</strong> ends anything still running immediately and notifies those winners." },
      { title: "Somebody locked out",
        body: "People &rarr; <strong>Reset password</strong> gives you a one-time link to pass on. Requests from members appear at the top of the same page." },
      { title: "Next time, a new auction",
        body: "Create another one and the goal and the total start from zero. The old drive stays as a record of what it raised." },
    ],
  },
];
