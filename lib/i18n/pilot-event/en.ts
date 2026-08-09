// lib/i18n/pilot-event/en.ts
import type { PilotDict } from "./types";

export const en: PilotDict = {
  altHero: "Golden rice terraces at Khau Pha Pass",
  altQr: "Bank transfer QR code",
  minusOne: "Remove one person",
  plusOne: "Add one person",
  heroBadge: "🪂 For pilots only",
  heroWelcome: "Welcome to",
  heroPlace: "Khau Pha · Tu Le · Mu Cang Chai",
  chipFestival: "Flying over the golden season · 29–31 Aug",
  chipCom: "Tu Le Green Rice Festival · 21–23 Aug",
  chipAltitude: "Launch at 1,268 m",
  heroCta: "Register to fly",
  heroCtaNote: "Pilots must register before flying at the site",

  periodsTitle: "Choose when you fly",
  periodsSubtitle:
    "Neither festival charges a site fee. The site fee applies only to regular flying days outside those two periods.",
  periodName: {
    mua_vang: "Flying over Golden Season 2026",
    le_hoi_com: "Tu Le Green Rice Festival",
    ngay_thuong: "Regular days",
  },
  periodNote: {
    mua_vang:
      "The all-inclusive package is required. Paramotor pilots join free of charge.",
    le_hoi_com:
      "No site fee. Paraglider pilots cover their own food and lodging.",
    ngay_thuong: "Outside the festivals. Please register before you fly.",
  },
  openingMuaVang: "Opening ceremony 08:00 on 30 Aug at the paragliding landing zone",
  openingCom: "Opening ceremony 08:00 on 22 Aug in Tu Le village centre",
  normalDates: "outside the festivals",
  muaVangLines: ["**Paramotor pilots: FREE**", "Sold as one package only"],
  comLines: [
    "No site fee",
    "Free flying for every pilot",
    "Paraglider pilots cover their own food and lodging",
  ],
  normalLines: [
    "Please register before you fly",
    "Food, lodging and transport not included",
    "Site fee:",
  ],
  discountText:
    "Pilots get 20% off everything at the site (rooms, food and drink).",
  comboTitle: "All-inclusive package for the Golden Season 2026 Paragliding Festival",
  comboSubtitle:
    "The organisers cover everything from the afternoon of 29 Aug to midday on 31 Aug.",
  comboItems: [
    "Two nights' accommodation (29 and 30 Aug)",
    "Dinner on 29 Aug",
    "Breakfast and lunch on 30 Aug",
    "Gala dinner on the night of 30 Aug",
    "Breakfast and lunch on 31 Aug",
    "Event T-shirt",
    "16-seat shuttle up and down the mountain, running non-stop",
    "Drinking water at the site",
    "10 days free of site fees, 26 Aug to 4 Sep (once the event fee is paid)",
    "Prizes — a competition will be held if enough pilots register",
  ],

  placesTitle: "Event locations",
  placesSubtitle: "Tap any card to open directions in Google Maps.",
  placeRoles: [
    "Paragliding launch",
    "Paramotor launch",
    "Paragliding landing",
    "Accommodation and social area",
  ],
  placeNames: [
    "Khau Pha Pass summit",
    "Lim Mong valley",
    "Lim Mong valley",
    "Mebayluon Clubhouse",
  ],
  placeDetails: [
    "Altitude 1,268 m",
    "Airfield at Mebayluon Clubhouse",
    "Landing at Mebayluon Clubhouse",
    "Rooms, meals and the gala dinner",
  ],
  contactsTitle: "Golden Season 2026 event team",
  radioLabel: "Radio frequency",
  contactRole: {
    shuttle: "Transport coordination",
    flightOps: "Flight coordination",
    tech: "Technical support",
    launch: "Launch support",
    lead: "Overall lead",
    band: "Gala live band",
    media: "Media",
    catering: "Catering",
  },
  viewMap: "Open map",
  viewHomestay: "See Clubhouse & Homestay",

  galleryTitle: "Moments from the golden season",
  gallerySubtitle: "Photos from past flying seasons at Khau Pha.",
  close: "Close",
  prevPhoto: "Previous photo",
  nextPhoto: "Next photo",
  guideTitle: "Worth reading before you set off",
  guideSubtitle:
    "Routes, coaches and what to do in Mu Cang Chai — useful for the family joining you too.",
  guideLinks: [
    "Golden Season 2026 Paragliding Festival at Khau Pha Pass",
    "Flying over the green rice season in Mu Cang Chai",
    "Ultra Trail Golden Season 2026: trail running & paragliding",
    "How to reach the Khau Pha Pass flying site",
    "Hanoi to Mu Cang Chai via the IC14 junction",
    "From Noi Bai airport to Mu Cang Chai",
    "Coaches to Mu Cang Chai",
    "What are the Khau Pha launch and landing zones like?",
    "Mu Cang Chai travel guide",
  ],

  formTitle: "Flight registration",
  formTitleEdit: "Edit your registration",
  formSubtitle: "Fill in every field marked * then confirm.",
  formSubtitleEdit: (code) =>
    `Editing registration ${code} — sending again updates this registration rather than creating a new one.`,

  step1: "What do you fly?",
  kind: {
    paragliding: "Paragliding",
    paramotor: "Paramotor",
    both: "Both paragliding and paramotor",
  },
  kindParaDesc: "Free flight, no engine",
  ppgPerk: "Paramotor pilots get free food and lodging during the festivals",

  step2: "Pilot details",
  fFullName: "Full name",
  fFullNamePh: "John Smith",
  fId: "ID / Passport number",
  fIdHint: "for accommodation registration",
  fIdPh: "e.g. C1234567",
  fNationality: "Nationality",
  fPhone: "Phone number",
  fPhonePh: "+33 6 12 34 56 78",
  fEmail: "Email (optional)",
  fEmailPh: "We will send your confirmation here",
  fAddress: "Address",
  fAddressPh: "Street, city, country",
  fClub: "Club / association",
  fClubPh: "e.g. HNAA, VWHN, SGPG, …",
  fRequest: "Special requests",
  fRequestHint: "optional",
  fRequestPh:
    "e.g. vegetarian, sharing a room with a friend, arriving late on the 29th, need parking…",

  step3: "Flying period",
  openingLabel: "Opening ceremony",
  slotsLeft: "Pilot places left",
  slotsLine: (n, r) => `${n} pilots registered, ${r} slots left`,
  slotsFullNote:
    "The limit has been reached, but go ahead and register — the organisers will find a place for you.",
  slotsListTitle: "Registered pilots",
  slotsEmpty: "No pilot has registered yet — you could be the first.",
  kindShort: { paragliding: "paraglider", paramotor: "paramotor", both: "both" },

  step4: "Flying dates",
  hint: {
    mua_vang:
      "The three festival days come as one package and are already selected.",
    le_hoi_com: "Tick the days you will fly during the Green Rice Festival.",
    ngay_thuong:
      "Tick the days you plan to fly — they need not be consecutive, you pay for the days you pick.",
  },
  extraDaysLabel: "I want to fly extra days",
  extraDaysNote: "Days outside the free window are charged the usual site fee.",
  weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  months: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ],
  chosenDays: (n) => `${n} day${n > 1 ? "s" : ""} selected:`,
  festivalDateTip:
    "This day belongs to a festival — pick that period above instead",
  feeModeDay: (p) => `${p} / day`,
  feeModeMonth: (p) => `${p} / month`,
  feeModeDayDesc: "Pay only for the days you picked",
  feeModeMonthDesc: "Same price as 7 single days, fly all month",

  companionTitle: "Family or friends joining you",
  companionDesc: (p) => `${p} per person. They eat and stay with the group,`,
  companionNoRoom: "no private room",
  muaVangCheckbox:
    "I have registered and paid for the Golden Season 2026 Festival — 10 days free of site fees, 26 Aug to 4 Sep.",
  muaVangCheckboxNote: "The organisers will confirm this when you arrive.",

  step5: "Equipment",
  step5Hint: "Please tell us your wing class.",
  motor: { trike: "Trike", foot: "Foot launch" },
  fuelPerk: "We stock A95 petrol — no E10 to worry about",
  motorLocked:
    "Pick a paramotor option in step 1 and the machine choice will appear.",
  wingLabel: "Wing class — please declare",
  wingPpg: "PPG wing",

  feeTitle: "Registration cost",
  feeTotal: "Total",
  feeFree: "Free",
  feeFreePpg: "Free for PPG pilots",
  feeEmpty: "Choose what you fly and when to see the cost.",
  payNotice: "Your registration is confirmed only once the fee has been transferred.",
  payRefund: "Rest assured — if you cancel, you get your money back.",

  zaloInlineTitle: "This event has its own Zalo group",
  zaloInlineDesc: "Join it after registering to get the daily flying schedule.",
  zaloInlineBtn: "Join the Zalo group",
  zaloTitle: "Please join the event Zalo group",
  zaloDesc:
    "Over the three days the schedule shifts with the wind — the organisers post updates in the group rather than calling each pilot.",
  zaloBtn: "Join the event Zalo group",

  submit: "Confirm registration",
  submitEdit: "Update registration",
  submitting: "Sending…",
  submitFoot: "Your details go to the Mebayluon Paragliding organisers.",
  needHelp: "Need help? Call",

  err: {
    kind: "Please choose what you fly",
    period: "Please choose a flying period",
    name: "Please enter your full name",
    id: "Please enter your ID or passport number",
    phone: "Phone number is required",
    phoneBad: "That phone number does not look right, please check it",
    dates: "Please pick at least one flying day",
    motor: "Please choose your machine type",
  },
  errNetwork: "Connection lost, please try again",
  errSubmit: "Could not send your registration, please try again",

  okTitle: "You are registered — see you over the golden fields!",
  okSubtitle:
    "The organisers have your details and will contact you to confirm the schedule.",
  okCode: "Registration code",
  okEmailSent: "A full confirmation has been sent to your email.",
  okNoEmail:
    "You did not give an email, so the organisers will call you instead.",
  payTitle: "Deposit transfer",
  payScanHint:
    "Scan with your banking app — the amount and reference are already filled in.",
  payMaking: "Generating QR code…",
  payBank: "Bank",
  payAccount: "Account number",
  payOwner: "Account holder",
  payNote: "Reference",
  payButton: "I have sent the deposit",
  payButtonBusy: "Recording…",
  payDone:
    "✓ Noted. The organisers will check the bank statement and get back to you.",
  noFeeTitle: "No fee for this period",
  noFeeDesc: "Nothing to transfer — just turn up on the day.",
  callBtn: "Call the organisers: +84 964 073 555",
  editBtn: "Edit my registration",
  againBtn: "Register another pilot",

  fee: {
    combo: () => "All-inclusive Golden Season 2026 Festival package",
    companions: (n) => `Guests joining you × ${n}`,
    extraFree: (n) =>
      `${n} extra day${n > 1 ? "s" : ""} (within the 10 free days)`,
    extraPaid: (n, u) =>
      `Site fee ${u} × ${n} day${n > 1 ? "s" : ""} (outside the free window)`,
    comFree: () => "Flying fee during the Tu Le Green Rice Festival",
    siteMonth: () => "Monthly site fee",
    siteDay: (n, u) => `Site fee ${u} × ${n} day${n > 1 ? "s" : ""}`,
    siteFreeDays: (n) =>
      `${n} day${n > 1 ? "s" : ""} free (registered and paid for the Festival)`,
    siteNone: () => "Site fee",
  },

  note: {
    muaVangMotor:
      "Paramotor pilots get the package free. Guests pay per head. 10 days free of site fees, 26 Aug to 4 Sep — for pilots who have registered and paid for the event.",
    muaVangPara:
      "Sold as one package; individual items are not sold separately. 10 days free of site fees, 26 Aug to 4 Sep — for pilots who have registered and paid for the event.",
    com: "No fee during the Tu Le Green Rice Festival; pilots cover their own food, lodging and transport.",
    month:
      "The monthly pass costs the same as 7 single days — from the 8th day of the month you fly at no extra cost. Food, lodging and transport not included.",
    dayFree:
      "Festival pilots get 10 days free of site fees, 26 Aug to 4 Sep. Food, lodging and transport not included.",
    day: "You pay for the days you pick and they need not be consecutive. From 8 days in a month the monthly pass is cheaper. Food, lodging and transport not included.",
  },
};
