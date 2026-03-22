import type { SelectFlightStepLocale } from "./types";
import { EN_SELECT_FLIGHT_LOCALE } from "./en";

export const FR_SELECT_FLIGHT_LOCALE: SelectFlightStepLocale = {
  ...EN_SELECT_FLIGHT_LOCALE,
  ui: {
    ...EN_SELECT_FLIGHT_LOCALE.ui,
    title: "Réserver votre vol",
    locationsTitle: "Veuillez choisir un site de vol",
    selectedLocationTitle: "Site sélectionné",
    serviceSectionTitle: "Veuillez choisir les services de vol",
    selectFlightType: "Veuillez choisir le type de vol",
    chooseLocationPrompt:
      "Veuillez choisir un site pour afficher les détails.",
    chooseFlightTypePrompt:
      "Veuillez choisir un type de vol pour voir la description détaillée.",
    choosePackagePrompt:
      "Veuillez choisir une option de jour de vol pour afficher les services.",
    noVisibleServices:
      "Aucun service n’est actuellement disponible pour cette sélection.",
    guestsLabel: "Voyageurs",
    flightPrice: "Prix du vol",
    optionalPrice: "Services optionnels",
    totalPrice: "Total",
    continue: "CONTINUER",
    pickupLocationLabel: "Lieu de prise en charge",
    pickupPointLabel: "Point de prise en charge",
    includedLabel: "Inclus",
    groupDiscountTitle: "Réduction directe pour inscription en groupe",
    freeGopro: "Enregistrement standard du vol avec Gopro",
    optionalServiceTitle: "Services optionnels",
    fromLabel: "À partir de",
    paraglidingTitle: "Parapente",
    paramotorTitle: "Paramoteur",
    weekdayFlightTitle: "Vols du lundi au vendredi",
    weekendFlightTitle: "Vols samedi, dimanche et jours fériés",
    khauPhaPromoTitle:
      "OFFRE D’HÉBERGEMENT GRATUIT AU CLUBHOUSE MEBAYLUON",
    khauPhaPromoSub:
      "(non applicable pendant la haute saison et les jours fériés)",
    paramotorDiscountBefore: "Prix du vol ",
    paramotorDiscountAfter: " réduit à 2.390.000 VND",
    paraglidingDescription: [
      "Décollage depuis le sommet du col de Khau Pha, l’un des quatre grands cols du Vietnam, à 1 268 m d’altitude, puis atterrissage dans la splendide vallée en rizières en terrasses de Lim Mong.",
      "Le parapente sans moteur dépend entièrement du vent naturel et procure une véritable sensation de liberté en plein ciel.",
    ],
    paramotorDescription: [
      "Le paramoteur décolle depuis la vallée de Lim Mong (au Clubhouse Mebayluon), remonte vers le col de Khau Pha puis revient au point de départ. Le vol dure environ 10 à 25 minutes selon la condition du passager.",
      "Comme il est motorisé, ce vol dépend moins du vent, monte plus facilement et offre des angles de vue uniques.",
    ],
    locationDescription: {
      ha_noi: [
        "Découvrez un autre visage de Hanoï grâce à une expérience de parapente au-dessus des montagnes, des champs et des villages périphériques.",
        "Le site de vol se situe à seulement 50 km à l’ouest du centre-ville de Hanoï.",
      ],
      khau_pha: [],
      sapa: [
        "Survolez la vallée de Lao Chai - Ta Van avec ses montagnes majestueuses et ses célèbres rizières en terrasses.",
      ],
      da_nang: [
        "Décollage depuis Ban Co Peak sur la montagne Son Tra à 600 m d’altitude.",
        "Profitez d’une vue panoramique sur Da Nang, la mer et la rivière Han.",
      ],
      quan_ba: [
        "Profitez d’une sensation unique de vol libre et admirez l’ensemble du plateau karstique de Ha Giang.",
      ],
    },
    hanoiMountainWarning:
      "Les passagers devraient utiliser le service spécial de véhicule tout-terrain. Nous utilisons des SUV off-road pour garantir la sécurité pendant le trajet.\nAvertissement : La route de montagne est difficile, il n'est pas recommandé de conduire son propre véhicule.",
    daNangMountainWarning:
      "Nous recommandons fortement d’utiliser le service de transfert vers la montagne pour plus de sécurité et de flexibilité.",
    paraglidingNoPickupWarning:
      "REMARQUE : Le vol ne comprend pas la navette montée/descente. Veuillez arriver au point de décollage 15 minutes avant le vol.",
    paramotorNoPickupWarning:
      "REMARQUE : Le vol ne comprend pas le transport jusqu’au point de vol. Veuillez arriver au Clubhouse Mebayluon 15 minutes avant le vol.",
    quanBaPickupWarning:
      "Remarque : les passagers devraient utiliser le service de transport vers la montagne pour une organisation plus rapide et plus flexible. Si vous vous déplacez par vos propres moyens, veuillez arriver 15 minutes avant le vol.",
    selectedFlightLabel: "Vol sélectionné",
    selectedOptionsLabel: "Services sélectionnés",
    noOptionalSelected: "Aucun service optionnel sélectionné.",
    noMapInfo:
      "Ha Giang n’affiche pas les coordonnées du décollage et de l’atterrissage.",
    flycamDescription:
      "Vue aérienne complète de la vallée et du parcours de vol. La vidéo brute sera envoyée juste après le vol.",
    camera360Description:
      "Vidéo 360° impressionnante du vol. La vidéo éditée sera envoyée sous 24 heures.",
    optionalServicesFlightLocation: "Lieu de vol : Doi Bu, Hanoï",
    optionalServicesFixedPickupLocation: "Point de prise en charge : Centre commercial GO! Thang Long, Hanoï",
    optionalServicesFixedPickupDeparture: "Départ : 8:00am~11:00am tous les jours – l'heure exacte dépend de la météo et sera communiquée avant le jour du vol.",
    optionalServicesPrivatePickupNote1: "Le coût de la prise en charge peut varier en fonction du lieu de l'hôtel et du nombre de passagers.",
    optionalServicesPrivatePickupNote2: "1–3 personnes : tarif fixe 1.500.000 VND / voiture.",
    optionalServicesPrivatePickupNote3: "À partir du 4e passager : ajouter 350.000 VND / personne.",
    optionalServicesMountainShuttleDesc: "Utilisation d'un véhicule SUV Offroad du pied de la montagne (zone d'atterrissage) au sommet de la montagne (zone de décollage).",
    optionalServicesSunsetDesc: "Le vol a lieu entre 16h30 et 17h30 pour profiter du coucher de soleil. Cependant, la météo peut changer et le coucher de soleil n'est pas toujours garanti. S'il n'y a pas de coucher de soleil, ces frais seront remboursés.",
    optionalServicesFlycamNotice: "Au site de vol de Doi Bu, Hanoï, le service flycam/drone n'est parfois pas disponible. NE VOUS INQUIÉTEZ PAS, après la réservation, nous confirmerons sa disponibilité pour vous. En cas d'indisponibilité, les frais de flycam seront remboursés à 100%.",
    groupGuestsSuffix: "passagers",
    perPersonWord: "personne",
    carUnit: "voiture",
    mapDoiBuLabel: "Lieu de vol : Doi Bu, Hanoï - Voir la carte",
    mapVienNamLabel: "Vien Nam - Voir la carte",
    mapGoThangLongLabel: "Point de prise en charge fixe depuis Hanoï : GO! Thang Long - Voir la carte",
    mapKhauPhaTakeoffLabel: "Sommet de Khau Pha - Voir la carte",
    mapKhauPhaLandingLabel: "Atterrissage Clubhouse - Voir la carte",
    mapKhauPhaClubhouseLabel: "Clubhouse Mebayluon - Voir la carte",
    mapDaNangTakeoffLabel: "Sommet Son Tra - Voir la carte",
    mapDaNangLandingLabel: "Sanctuaire Ngu Ong - Voir la carte",
    mapSapaTakeoffLabel: "Point de décollage - Voir la carte",
    mapSapaLandingLabel: "Point d’atterrissage - Voir la carte",
  },
  locationCards: {
    ha_noi: { title: "HANOÏ", subtitle: "Doi Bu - Vien Nam" },
    khau_pha: { title: "KHAU PHA", subtitle: "Mu Cang Chai - Tu Le" },
    sapa: { title: "SAPA", subtitle: "Lao Chai - Ta Van" },
    quan_ba: { title: "HA GIANG", subtitle: "Quan Ba" },
    da_nang: { title: "DA NANG", subtitle: "Péninsule de Son Tra" },
  },
};