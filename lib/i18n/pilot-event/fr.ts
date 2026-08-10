// lib/i18n/pilot-event/fr.ts
import type { PilotDict } from "./types";

export const fr: PilotDict = {
  altHero: "Rizières en terrasses dorées au col de Khau Pha",
  altQr: "QR code de virement",
  minusOne: "Retirer une personne",
  plusOne: "Ajouter une personne",
  heroBadge: "🪂 Réservé aux pilotes",
  heroWelcome: "Bienvenue à",
  heroPlace: "Khau Pha · Tu Le · Mu Cang Chai",
  chipFestival: "Vol au-dessus de la saison dorée · 29–31 août",
  chipCom: "Fête du riz vert de Tu Le · 21–23 août",
  chipAltitude: "Décollage à 1 268 m",
  heroCta: "S'inscrire pour voler",
  heroCtaNote: "Les pilotes doivent s'inscrire avant de voler sur le site",

  periodsTitle: "Choisissez votre période de vol",
  periodsSubtitle:
    "Aucune des deux fêtes ne facture de redevance de site. Celle-ci ne s'applique qu'aux jours de vol ordinaires, hors de ces deux périodes.",
  periodName: {
    mua_vang: "Vol au-dessus de la Saison Dorée 2026",
    le_hoi_com: "Fête du riz vert de Tu Le",
    ngay_thuong: "Jours ordinaires",
  },
  periodNote: {
    mua_vang:
      "La formule tout compris est obligatoire. Les pilotes de paramoteur participent gratuitement.",
    le_hoi_com:
      "Pas de redevance de site. Les parapentistes prennent en charge leurs repas et leur hébergement.",
    ngay_thuong: "Hors périodes de fête. Merci de vous inscrire avant de voler.",
  },
  openingMuaVang:
    "Cérémonie d'ouverture le 30 août à 8h00 sur l'aire d'atterrissage",
  openingCom:
    "Cérémonie d'ouverture le 22 août à 8h00 au centre du village de Tu Le",
  normalDates: "hors périodes de fête",
  muaVangLines: [
    "**Pilotes de paramoteur : GRATUIT**",
    "Vendu uniquement en formule complète",
  ],
  comLines: [
    "Pas de redevance de site",
    "Vol gratuit pour tous les pilotes",
    "Les parapentistes paient leurs repas et leur hébergement",
  ],
  normalLines: [
    "Merci de vous inscrire avant de voler",
    "Repas, hébergement et transport non compris",
    "Redevance de site :",
  ],
  discountText:
    "Les pilotes bénéficient de 20 % de réduction sur tout sur le site (chambres, repas et boissons).",
  comboTitle:
    "Formule tout compris du Festival de parapente Saison Dorée 2026",
  comboSubtitle:
    "Les organisateurs prennent tout en charge de l'après-midi du 29 août au midi du 31 août.",
  comboItems: [
    "Deux nuits d'hébergement (29 et 30 août)",
    "Dîner du 29 août",
    "Petit-déjeuner et déjeuner du 30 août",
    "Dîner de gala le soir du 30 août",
    "Petit-déjeuner et déjeuner du 31 août",
    "T-shirt de l'événement (réservé aux pilotes inscrits avant le 15/08)",
    "Navette de 16 places entre la vallée et le sommet, en continu",
    "Eau potable sur le site",
    "10 jours sans redevance de site, du 26 août au 4 septembre (une fois les frais réglés)",
    "Prix — une compétition sera organisée si les inscriptions sont assez nombreuses",
  ],

  placesTitle: "Lieux de l'événement",
  placesSubtitle:
    "Touchez une carte pour ouvrir l'itinéraire dans Google Maps.",
  placeRoles: [
    "Décollage parapente",
    "Décollage paramoteur",
    "Atterrissage parapente",
    "Hébergement et vie collective",
  ],
  placeNames: [
    "Sommet du col de Khau Pha",
    "Vallée de Lim Mong",
    "Vallée de Lim Mong",
    "Mebayluon Clubhouse",
  ],
  placeDetails: [
    "Altitude 1 268 m",
    "Terrain au Mebayluon Clubhouse",
    "Atterrissage au Mebayluon Clubhouse",
    "Chambres, repas et dîner de gala",
  ],
  contactsTitle: "Équipe de l'événement Saison Dorée 2026",
  radioLabel: "Fréquence radio",
  contactRole: {
    shuttle: "Coordination des transports",
    flightOps: "Coordination des vols",
    tech: "Assistance technique",
    launch: "Assistance au décollage",
    lead: "Responsable général",
    band: "Groupe live du gala",
    media: "Médias",
    catering: "Restauration",
  },
  viewMap: "Voir la carte",
  viewHomestay: "Voir le Clubhouse & Homestay",

  galleryTitle: "Instants de la saison dorée",
  gallerySubtitle: "Photos des saisons de vol précédentes à Khau Pha.",
  close: "Fermer",
  prevPhoto: "Photo précédente",
  nextPhoto: "Photo suivante",
  guideTitle: "À lire avant de partir",
  guideSubtitle:
    "Itinéraires, bus et que faire à Mu Cang Chai — utile aussi pour vos proches.",
  guideLinks: [
    "Festival de parapente Saison Dorée 2026 au col de Khau Pha",
    "Voler pendant la saison du riz vert à Mu Cang Chai",
    "Ultra Trail Saison Dorée 2026 : trail et parapente",
    "Comment rejoindre le site de vol du col de Khau Pha",
    "De Hanoi à Mu Cang Chai par l'échangeur IC14",
    "De l'aéroport de Noi Bai à Mu Cang Chai",
    "Les bus pour Mu Cang Chai",
    "À quoi ressemblent les aires de décollage et d'atterrissage de Khau Pha ?",
    "Guide de voyage de Mu Cang Chai",
  ],

  formTitle: "Fiche d'inscription",
  formTitleEdit: "Modifier votre inscription",
  formSubtitle: "Remplissez tous les champs marqués d'un * puis confirmez.",
  formSubtitleEdit: (code) =>
    `Modification de l'inscription ${code} — un nouvel envoi met à jour cette inscription au lieu d'en créer une autre.`,

  step1: "Que pilotez-vous ?",
  kind: {
    paragliding: "Parapente",
    paramotor: "Paramoteur",
    both: "Parapente et paramoteur",
  },
  kindParaDesc: "Vol libre, sans moteur",
  ppgPerk: "GRATUIT pour les pilotes paramoteur du spectacle d'ouverture",
  flagFlight: "Je participe au vol du drapeau à l'ouverture (paramoteur)",
  flagFlightNote: "Participer au vol du drapeau dispense de tous les frais de l'événement. Sinon, le tarif normal s'applique.",

  step2: "Informations du pilote",
  fFullName: "Nom complet",
  fFullNamePh: "Jean Dupont",
  fId: "Numéro de pièce d'identité / passeport",
  fIdHint: "pour la déclaration d'hébergement",
  fIdPh: "ex. C1234567",
  fNationality: "Nationalité",
  fPhone: "Numéro de téléphone",
  fPhonePh: "+33 6 12 34 56 78",
  fEmail: "E-mail (facultatif)",
  fEmailPh: "Votre confirmation sera envoyée ici",
  fAddress: "Adresse",
  fAddressPh: "Rue, ville, pays",
  fClub: "Club / association",
  fClubPh: "ex. HNAA, VWHN, SGPG, …",
  fRequest: "Demandes particulières",
  fRequestHint: "facultatif",
  fRequestPh:
    "ex. végétarien, partage de chambre avec un ami, arrivée tardive le 29, besoin d'un parking…",

  fShirt: "Taille du T-shirt de l'événement",
  fShirtHint: "inclus dans le forfait Saison Dorée — réservé aux pilotes inscrits avant le 15/08",
  fShirtPh: "Choisir une taille",

  step3: "Période de vol",
  openingLabel: "Cérémonie d'ouverture",
  slotsLeft: "Places de pilote restantes",
  slotsLine: (n, r, max) => `${n} pilotes inscrits, ${r}/${max} places restantes`,
  slotsFullNote:
    "La limite est atteinte, mais inscrivez-vous quand même — les organisateurs vous trouveront une place.",
  slotsListTitle: "Pilotes inscrits",
  slotsEmpty:
    "Aucun pilote inscrit pour l'instant — vous pouvez être le premier.",
  kindShort: {
    paragliding: "parapente",
    paramotor: "paramoteur",
    both: "les deux",
  },

  step4: "Dates de vol",
  pickPeriodFirst: "Choisissez une période à l'étape 3 et le calendrier apparaîtra.",
  hint: {
    mua_vang:
      "Les trois jours de fête forment un tout et sont déjà sélectionnés.",
    le_hoi_com:
      "Cochez les jours où vous volerez pendant la Fête du riz vert.",
    ngay_thuong:
      "Cochez les jours où vous comptez voler — ils n'ont pas à se suivre, vous payez les jours choisis.",
  },
  extraDaysLabel: "Je souhaite voler des jours supplémentaires",
  extraDaysNote:
    "Les jours hors de la période gratuite restent soumis à la redevance de site habituelle.",
  weekdays: ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"],
  months: [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
  ],
  chosenDays: (n) => `${n} jour${n > 1 ? "s" : ""} sélectionné${n > 1 ? "s" : ""} :`,
  festivalDateTip:
    "Ce jour appartient à une fête — choisissez plutôt cette période ci-dessus",
  feeModeDay: (p) => `${p} / jour`,
  feeModeMonth: (p) => `${p} / mois`,
  feeModeDayDesc: "Vous ne payez que les jours choisis",
  feeModeMonthDesc: "Le prix de 7 jours isolés, pour voler tout le mois",

  companionTitle: "Proches qui vous accompagnent",
  companionDesc: (p) => `${p} par personne. Ils mangent et logent avec le groupe,`,
  companionNoRoom: "sans chambre privée",
  muaVangCheckbox:
    "Je me suis inscrit et j'ai payé le Festival Saison Dorée 2026 — 10 jours sans redevance de site, du 26 août au 4 septembre.",
  muaVangCheckboxNote:
    "Les organisateurs le vérifieront à votre arrivée sur le site.",

  step5: "Matériel",
  step5Hint: "Merci d'indiquer la catégorie de votre aile.",
  motor: { trike: "Chariot (trike)", foot: "Décollage à pied" },
  fuelPerk: "Nous avons de l'essence A95 — pas de E10, soyez tranquilles",
  motorLocked:
    "Choisissez une option paramoteur à l'étape 1 et le choix de la machine apparaîtra.",
  wingLabel: "Catégorie d'aile — merci de l'indiquer",
  wingPpg: "Aile PPG",

  feeTitle: "Coût de l'inscription",
  feeTotal: "Total",
  feeFree: "Gratuit",
  feeFreePpg: "Gratuit pour les pilotes PPG",
  feeEmpty:
    "Choisissez ce que vous pilotez et votre période pour voir le coût.",
  monthNotice: (from, to) =>
    `Vous avez le forfait mensuel — vols illimités du ${from} au ${to}.`,
  payNotice:
    "Votre inscription n'est validée qu'après le virement des frais d'inscription.",
  payRefund: "Rassurez-vous — en cas d'annulation, vous êtes remboursé.",

  zaloInlineTitle: "L'événement a son propre groupe Zalo",
  zaloInlineDesc:
    "Rejoignez-le après votre inscription pour recevoir le programme de vol quotidien.",
  zaloInlineBtn: "Rejoindre le groupe Zalo",
  zaloTitle: "Merci de rejoindre le groupe Zalo de l'événement",
  zaloDesc:
    "Pendant les trois jours, le programme change avec le vent — les organisateurs publient les mises à jour dans le groupe plutôt que d'appeler chaque pilote.",
  zaloBtn: "Rejoindre le groupe Zalo de l'événement",

  submit: "Confirmer l'inscription",
  submitEdit: "Mettre à jour l'inscription",
  submitting: "Envoi…",
  submitFoot:
    "Vos informations sont transmises aux organisateurs de Mebayluon Paragliding.",
  needHelp: "Besoin d'aide ? Appelez",

  err: {
    kind: "Merci de choisir ce que vous pilotez",
    period: "Merci de choisir une période de vol",
    name: "Merci d'indiquer votre nom complet",
    id: "Merci d'indiquer votre numéro de pièce d'identité ou de passeport",
    phone: "Le numéro de téléphone est obligatoire",
    phoneBad: "Ce numéro de téléphone semble incorrect, merci de le vérifier",
    dates: "Merci de choisir au moins un jour de vol",
    motor: "Merci de choisir votre type de machine",
  },
  errNetwork: "Connexion perdue, merci de réessayer",
  errSubmit: "Impossible d'envoyer votre inscription, merci de réessayer",

  okTitle: "Inscription enregistrée — rendez-vous au-dessus des rizières dorées !",
  okSubtitle:
    "Les organisateurs ont vos informations et vous contacteront pour confirmer le programme.",
  okCode: "Code d'inscription",
  okEmailSent: "Une confirmation complète a été envoyée à votre adresse e-mail.",
  okNoEmail:
    "Vous n'avez pas indiqué d'e-mail : les organisateurs vous appelleront.",
  payTitle: "Virement de l'acompte",
  payScanHint:
    "Scannez avec votre application bancaire — le montant et le motif sont déjà remplis.",
  payMaking: "Création du code QR…",
  payBank: "Banque",
  payAccount: "Numéro de compte",
  payOwner: "Titulaire du compte",
  payNote: "Motif",
  payButton: "J'ai envoyé l'acompte",
  payButtonBusy: "Enregistrement…",
  payDone:
    "✓ C'est noté. Les organisateurs vérifieront le relevé bancaire et reviendront vers vous.",
  noFeeTitle: "Aucun frais pour cette période",
  noFeeDesc: "Rien à virer — présentez-vous simplement le jour venu.",
  callBtn: "Appeler les organisateurs : +84 964 073 555",
  editBtn: "Modifier mon inscription",
  againBtn: "Inscrire un autre pilote",

  fee: {
    combo: () => "Formule tout compris du Festival Saison Dorée 2026",
    companions: (n) => `Accompagnants × ${n}`,
    extraFree: (n) =>
      `${n} jour${n > 1 ? "s" : ""} supplémentaire${n > 1 ? "s" : ""} (dans les 10 jours gratuits)`,
    extraPaid: (n, u) =>
      `Redevance de site ${u} × ${n} jour${n > 1 ? "s" : ""} (hors période gratuite)`,
    comFree: () => "Frais de vol pendant la Fête du riz vert de Tu Le",
    siteMonth: () => "Redevance de site mensuelle",
    siteDay: (n, u) => `Redevance de site ${u} × ${n} jour${n > 1 ? "s" : ""}`,
    siteFreeDays: (n) =>
      `${n} jour${n > 1 ? "s" : ""} gratuit${n > 1 ? "s" : ""} (inscrit et payé pour le Festival)`,
    siteNone: () => "Redevance de site",
  },

  note: {
    muaVangMotor:
      "Les pilotes de paramoteur bénéficient de la formule gratuitement. Les accompagnants paient par personne. 10 jours sans redevance de site, du 26 août au 4 septembre — pour les pilotes inscrits et ayant réglé l'événement.",
    muaVangPara:
      "Vendu en formule complète ; les prestations ne sont pas vendues séparément. 10 jours sans redevance de site, du 26 août au 4 septembre — pour les pilotes inscrits et ayant réglé l'événement.",
    com: "Aucun frais pendant la Fête du riz vert de Tu Le ; les pilotes prennent en charge repas, hébergement et transport.",
    month:
      "Le forfait mensuel coûte le prix de 7 jours isolés — à partir du 8e jour du mois, vous volez sans supplément. Repas, hébergement et transport non compris.",
    dayFree:
      "Les pilotes du Festival bénéficient de 10 jours sans redevance de site, du 26 août au 4 septembre. Repas, hébergement et transport non compris.",
    day: "Vous payez les jours choisis, qui n'ont pas à se suivre. À partir de 8 jours dans le mois, le forfait mensuel revient moins cher. Repas, hébergement et transport non compris.",
  },
};
