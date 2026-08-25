// app/homestay/dat-phong/DatPhongClient.tsx
"use client";

/**
 * TRANG ĐẶT PHÒNG homestay — lịch phòng ĐỒNG BỘ với sổ phòng nội bộ:
 * phòng đã kín (do khách Agoda, khách web khác, hay kế toán nhập tay) hiện
 * đỏ và không bấm được. Khách đặt xong, booking rơi thẳng vào sổ homestay
 * trên trang kế toán (/baocao/homestay) — không ai phải gõ lại.
 *
 * Một đơn GOM ĐƯỢC NHIỀU PHÒNG: bấm vào phòng là chọn, rồi tăng giảm SỐ
 * LƯỢNG ngay trên thẻ (nhà có 2 phòng đôi, 3 gác mái… khách đoàn hay lấy
 * vài phòng một lúc). Lịch chỉ cho chọn những đêm đủ chỗ cho CẢ GIỎ phòng.
 *
 * Giá và phòng trống đều do MÁY CHỦ quyết (API /api/homestay/*) — trang này
 * chỉ hiển thị; con số khách thấy là con số máy chủ sẽ tính lại lúc lưu.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { PageBackground } from "@/components/page-background";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/footer";
import { useLanguage } from "@/contexts/language-context";
import {
  CHECK_IN_TIME,
  CHECK_OUT_TIME,
  COMBO_COMPONENTS,
  HOMESTAY_ROOMS,
  homestayPrice,
  nightsBetween,
  type HomestayBedKind,
  type HomestayFeature,
  type HomestayRoom,
} from "@/lib/baobay/homestay";
import { locationInfo, type HomestayLang } from "@/lib/homestay-data";

/* ================= i18n (đủ 6 ngôn ngữ của site) ================= */

type Dict = {
  title: string;
  subtitle: string;
  timeInfo: string;
  facilities: string;
  pickRoom: string;
  pickRoomHint: string;
  pickDates: string;
  checkIn: string;
  checkOut: string;
  nights: (n: number) => string;
  full: string;
  left: (n: number) => string;
  guests: string;
  adults: string;
  children: string;
  contact: string;
  name: string;
  phone: string;
  email: string;
  note: string;
  total: string;
  payAtHome: string;
  submit: string;
  submitting: string;
  doneTitle: string;
  doneBody: (ref: string) => string;
  back: string;
  errName: string;
  errPhone: string;
  errDates: string;
  errRooms: string;
  loading: string;
  perNight: string;
  maxLabel: (a: number, c: number) => string;
  /** "Chỉ còn 1/2 phòng" — số còn trống trên TỔNG số phòng của hạng đó. */
  availLeft: (free: number, units: number) => string;
  /** Bản cho SÀN CỘNG ĐỒNG (bán theo chỗ nằm): "Chỉ còn 3/12 chỗ". */
  availLeftBed: (free: number, units: number) => string;
  /** Đơn vị giá của sàn cộng đồng — "đ/chỗ/đêm" thay cho "đ/phòng/đêm". */
  perNightBed: string;
  /** Sức chứa sàn cộng đồng: mỗi chỗ 1 người, cả sàn N chỗ, nên nằm M. */
  dormCapacity: (units: number, comfort: number) => string;
  /** Nhắc khi khách chưa chọn ngày: phòng chưa bấm được. */
  pickRoomLocked: string;
  availNone: string;
  availOk: string;
  availSome: string;
  availFull: string;
  availInCombo: string;
  maxGuests: (max: number, comfort: number) => string;
  monthPrev: string;
  monthNext: string;
  weekdays: string[];
  roomNames: Record<string, string>;
  features: Record<HomestayFeature, string>;
  beds: (kind: HomestayBedKind, count: number) => string;
};

const L: Record<HomestayLang, Dict> = {
  vi: {
    title: "Đặt phòng Clubhouse Mebayluon",
    subtitle: "Homestay dưới chân điểm bay Khau Phạ — lịch phòng cập nhật trực tiếp",
    timeInfo: `Nhận phòng từ ${CHECK_IN_TIME} · Trả phòng trước ${CHECK_OUT_TIME}`,
    facilities: "4 nhà vệ sinh · 3 nhà tắm chung · 6 chậu rửa mặt",
    pickRoom: "2 · Chọn phòng",
    pickRoomHint: "Bấm vào phòng rồi chọn số lượng — gom được nhiều phòng một đơn",
    pickDates: "1 · Chọn ngày nhận – trả phòng",
    checkIn: "Nhận phòng",
    checkOut: "Trả phòng",
    nights: (n) => `${n} đêm`,
    full: "kín",
    left: (n) => `còn ${n}`,
    guests: "3 · Số khách",
    adults: "Người lớn",
    children: "Trẻ em (< 6 tuổi)",
    contact: "4 · Thông tin liên hệ",
    name: "Họ tên",
    phone: "Số điện thoại (Zalo)",
    email: "Email (không bắt buộc)",
    note: "Ghi chú (giờ đến, ăn tối…)",
    total: "Tạm tính",
    payAtHome: "Thanh toán khi nhận phòng — chúng tôi sẽ gọi xác nhận trong ngày.",
    submit: "Đặt phòng",
    submitting: "Đang gửi…",
    doneTitle: "Đã nhận đặt phòng!",
    doneBody: (ref) =>
      `Mã đặt phòng của bạn là ${ref}. Nhận phòng từ ${CHECK_IN_TIME}, trả phòng trước ${CHECK_OUT_TIME}. Chúng tôi sẽ gọi điện xác nhận trong ngày — cần gấp xin gọi ${locationInfo.phone}.`,
    back: "← Về trang homestay",
    errName: "Bạn chưa ghi tên",
    errPhone: "Số điện thoại chưa đúng",
    errDates: "Bạn chưa chọn ngày nhận và trả phòng",
    errRooms: "Bạn chưa chọn phòng nào",
    loading: "Đang tải lịch phòng…",
    perNight: "đ/phòng/đêm",
    maxLabel: (a, c) => `Tối đa ${a} người lớn${c ? ` + ${c} trẻ dưới 6 tuổi` : ""}`,
    availLeft: (f, u) => (u > 1 ? `Chỉ còn ${f}/${u} phòng` : "Còn trống cho ngày đã chọn"),
    availLeftBed: (f, u) => `Chỉ còn ${f}/${u} chỗ nằm`,
    perNightBed: "đ/chỗ nằm/đêm",
    dormCapacity: (u, c) => `1 người mỗi chỗ nằm · cả sàn ${u} chỗ, nằm thoải mái ${c} người`,
    pickRoomLocked: "⤴ Chọn ngày ở bên trên trước — phòng còn trống sẽ sáng lên",
    availNone: "Hết phòng cho ngày đã chọn",
    availOk: "Còn phòng",
    availSome: "Kín một số đêm 2 tuần tới",
    availFull: "Kín 2 tuần tới",
    availInCombo: "Đã gồm trong gói đã chọn",
    maxGuests: (max, comfort) => `Tối đa ${max} người · khuyến cáo ${comfort} (gồm trẻ em)`,
    monthPrev: "‹",
    monthNext: "›",
    weekdays: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
    roomNames: {
      "double-room": "Phòng giường đôi view suối",
      dormitory: "Chỗ nằm sàn cộng đồng",
      "single-room": "Phòng giường đơn view dù lượn",
      "couple-attic-single": "Phòng gác mái nhỏ",
      "couple-attic-double": "Phòng áp mái lớn",
      "whole-home-small": "Phòng gia đình",
      "floor-combo": "Nguyên sàn (trừ 2 phòng đôi)",
      "whole-home-large": "Nguyên nhà sàn",
    },
    features: {
      "stilt-house": "Nhà sàn",
      "private-room": "Phòng riêng",
      "shared-bathroom": "Vệ sinh ngoài",
      "ensuite-bathroom": "Vệ sinh khép kín",
      "stream-view": "View suối",
      "paragliding-view": "View dù lượn",
      attic: "Áp mái",
      "big-family": "Gia đình lớn",
      company: "Công ty",
      karaoke: "Karaoke",
      "campfire-camp": "Đốt lửa & camp",
      teambuilding: "Teambuilding",
      "view-both": "View dù lượn & suối lớn",
      "free-pool": "Bể bơi miễn phí",
    },
    beds: (kind, count) =>
      `${count} ${kind === "double-bed" ? "giường đôi" : kind === "single-bed" ? "giường đơn" : "nệm đơn"}`,
  },
  en: {
    title: "Book your stay — Clubhouse Mebayluon",
    subtitle: "Homestay at the foot of Khau Pha flying site — live availability",
    timeInfo: `Check-in from ${CHECK_IN_TIME} · Check-out by ${CHECK_OUT_TIME}`,
    facilities: "4 toilets · 3 shared showers · 6 washbasins",
    pickRoom: "2 · Choose rooms",
    pickRoomHint: "Tap a room, then set the quantity — mix several rooms in one booking",
    pickDates: "1 · Pick check-in – check-out dates",
    checkIn: "Check-in",
    checkOut: "Check-out",
    nights: (n) => `${n} night${n > 1 ? "s" : ""}`,
    full: "full",
    left: (n) => `${n} left`,
    guests: "3 · Guests",
    adults: "Adults",
    children: "Children (< 6)",
    contact: "4 · Contact details",
    name: "Full name",
    phone: "Phone (WhatsApp/Zalo)",
    email: "Email (optional)",
    note: "Notes (arrival time, dinner…)",
    total: "Estimated total",
    payAtHome: "Pay on arrival — we will call to confirm within the day.",
    submit: "Book now",
    submitting: "Sending…",
    doneTitle: "Booking received!",
    doneBody: (ref) =>
      `Your booking code is ${ref}. Check-in from ${CHECK_IN_TIME}, check-out by ${CHECK_OUT_TIME}. We will call to confirm within the day — in a hurry? Call ${locationInfo.phone}.`,
    back: "← Back to homestay",
    errName: "Please enter your name",
    errPhone: "Phone number looks wrong",
    errDates: "Please pick check-in and check-out dates",
    errRooms: "Please select at least one room",
    loading: "Loading availability…",
    perNight: "VND/room/night",
    maxLabel: (a, c) => `Up to ${a} adult${a > 1 ? "s" : ""}${c ? ` + ${c} child under 6` : ""}`,
    availLeft: (f, u) => (u > 1 ? `Only ${f}/${u} left` : "Available for your dates"),
    availLeftBed: (f, u) => `Only ${f}/${u} beds left`,
    perNightBed: "VND/bed/night",
    dormCapacity: (u, c) => `1 person per bed · ${u} beds on the floor, comfortable for ${c}`,
    pickRoomLocked: "⤴ Pick your dates above first — available rooms will light up",
    availNone: "Sold out for your dates",
    availOk: "Available",
    availSome: "Some nights full (next 2 weeks)",
    availFull: "Fully booked next 2 weeks",
    availInCombo: "Included in selected package",
    maxGuests: (max, comfort) => `Up to ${max} guests · ${comfort} recommended (incl. children)`,
    monthPrev: "‹",
    monthNext: "›",
    weekdays: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
    roomNames: {
      "double-room": "Double bed room — stream view",
      dormitory: "Shared dorm bed",
      "single-room": "Single bed room — paragliding view",
      "couple-attic-single": "Small attic room",
      "couple-attic-double": "Large attic room",
      "whole-home-small": "Family room",
      "floor-combo": "Whole floor (excl. 2 double rooms)",
      "whole-home-large": "Entire stilt house",
    },
    features: {
      "stilt-house": "Stilt house",
      "private-room": "Private room",
      "shared-bathroom": "Shared bathroom",
      "ensuite-bathroom": "En-suite bathroom",
      "stream-view": "Stream view",
      "paragliding-view": "Paragliding view",
      attic: "Attic",
      "big-family": "Big family",
      company: "Company retreat",
      karaoke: "Karaoke",
      "campfire-camp": "Campfire & camping",
      teambuilding: "Teambuilding",
      "view-both": "Paragliding & river view",
      "free-pool": "Free pool",
    },
    beds: (kind, count) =>
      `${count} ${kind === "double-bed" ? `double bed${count > 1 ? "s" : ""}` : kind === "single-bed" ? `single bed${count > 1 ? "s" : ""}` : `single mattress${count > 1 ? "es" : ""}`}`,
  },
  fr: {
    title: "Réserver — Clubhouse Mebayluon",
    subtitle: "Homestay au pied du site de vol de Khau Pha — disponibilités en direct",
    timeInfo: `Arrivée à partir de ${CHECK_IN_TIME} · Départ avant ${CHECK_OUT_TIME}`,
    facilities: "4 WC · 3 douches communes · 6 lavabos",
    pickRoom: "2 · Choisir les chambres",
    pickRoomHint: "Touchez une chambre puis choisissez la quantité — plusieurs chambres par réservation",
    pickDates: "1 · Choisir les dates d'arrivée – départ",
    checkIn: "Arrivée",
    checkOut: "Départ",
    nights: (n) => `${n} nuit${n > 1 ? "s" : ""}`,
    full: "complet",
    left: (n) => `${n} rest.`,
    guests: "3 · Voyageurs",
    adults: "Adultes",
    children: "Enfants (< 6 ans)",
    contact: "4 · Coordonnées",
    name: "Nom complet",
    phone: "Téléphone (WhatsApp/Zalo)",
    email: "E-mail (facultatif)",
    note: "Remarques (heure d'arrivée, dîner…)",
    total: "Total estimé",
    payAtHome: "Paiement à l'arrivée — nous vous appellerons pour confirmer dans la journée.",
    submit: "Réserver",
    submitting: "Envoi…",
    doneTitle: "Réservation reçue !",
    doneBody: (ref) =>
      `Votre code de réservation est ${ref}. Arrivée à partir de ${CHECK_IN_TIME}, départ avant ${CHECK_OUT_TIME}. Nous vous appellerons pour confirmer — urgent ? Appelez ${locationInfo.phone}.`,
    back: "← Retour au homestay",
    errName: "Veuillez saisir votre nom",
    errPhone: "Numéro de téléphone invalide",
    errDates: "Veuillez choisir les dates d'arrivée et de départ",
    errRooms: "Veuillez sélectionner au moins une chambre",
    loading: "Chargement des disponibilités…",
    perNight: "VND/chambre/nuit",
    maxLabel: (a, c) => `Jusqu'à ${a} adulte${a > 1 ? "s" : ""}${c ? ` + ${c} enfant de moins de 6 ans` : ""}`,
    availLeft: (f, u) => (u > 1 ? `Plus que ${f}/${u}` : "Disponible pour vos dates"),
    availLeftBed: (f, u) => `Plus que ${f}/${u} lits`,
    perNightBed: "VND/lit/nuit",
    dormCapacity: (u, c) => `1 personne par lit · ${u} lits au total, confortable pour ${c}`,
    pickRoomLocked: "⤴ Choisissez d'abord vos dates ci-dessus — les chambres libres s'allumeront",
    availNone: "Complet pour vos dates",
    availOk: "Disponible",
    availSome: "Certaines nuits complètes (2 sem.)",
    availFull: "Complet les 2 prochaines semaines",
    availInCombo: "Inclus dans le forfait choisi",
    maxGuests: (max, comfort) => `Jusqu'à ${max} pers. · ${comfort} recommandé (enfants inclus)`,
    monthPrev: "‹",
    monthNext: "›",
    weekdays: ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"],
    roomNames: {
      "double-room": "Chambre lit double — vue ruisseau",
      dormitory: "Lit en dortoir",
      "single-room": "Chambre lit simple — vue parapentes",
      "couple-attic-single": "Petite chambre mansardée",
      "couple-attic-double": "Grande chambre mansardée",
      "whole-home-small": "Chambre familiale",
      "floor-combo": "Étage entier (hors 2 ch. doubles)",
      "whole-home-large": "Maison sur pilotis entière",
    },
    features: {
      "stilt-house": "Maison sur pilotis",
      "private-room": "Chambre privée",
      "shared-bathroom": "Salle de bain commune",
      "ensuite-bathroom": "Salle de bain privée",
      "stream-view": "Vue sur le ruisseau",
      "paragliding-view": "Vue sur les parapentes",
      attic: "Mansarde",
      "big-family": "Grande famille",
      company: "Séminaire d'entreprise",
      karaoke: "Karaoké",
      "campfire-camp": "Feu de camp & camping",
      teambuilding: "Teambuilding",
      "view-both": "Vue parapentes & rivière",
      "free-pool": "Piscine gratuite",
    },
    beds: (kind, count) =>
      `${count} ${kind === "double-bed" ? `lit${count > 1 ? "s" : ""} double${count > 1 ? "s" : ""}` : kind === "single-bed" ? `lit${count > 1 ? "s" : ""} simple${count > 1 ? "s" : ""}` : `matelas simple${count > 1 ? "s" : ""}`}`,
  },
  ru: {
    title: "Бронирование — Clubhouse Mebayluon",
    subtitle: "Хоумстей у подножия лётной точки Кхау Фа — доступность в реальном времени",
    timeInfo: `Заезд с ${CHECK_IN_TIME} · Выезд до ${CHECK_OUT_TIME}`,
    facilities: "4 туалета · 3 общих душа · 6 раковин",
    pickRoom: "2 · Выберите номера",
    pickRoomHint: "Нажмите на номер и выберите количество — можно несколько номеров в одном заказе",
    pickDates: "1 · Выберите даты заезда – выезда",
    checkIn: "Заезд",
    checkOut: "Выезд",
    nights: (n) => `${n} ноч.`,
    full: "занято",
    left: (n) => `ост. ${n}`,
    guests: "3 · Гости",
    adults: "Взрослые",
    children: "Дети (до 6 лет)",
    contact: "4 · Контакты",
    name: "Имя и фамилия",
    phone: "Телефон (WhatsApp/Zalo)",
    email: "E-mail (необязательно)",
    note: "Примечания (время приезда, ужин…)",
    total: "Итого (предварительно)",
    payAtHome: "Оплата при заселении — мы позвоним для подтверждения в течение дня.",
    submit: "Забронировать",
    submitting: "Отправка…",
    doneTitle: "Бронь получена!",
    doneBody: (ref) =>
      `Код вашей брони: ${ref}. Заезд с ${CHECK_IN_TIME}, выезд до ${CHECK_OUT_TIME}. Мы позвоним для подтверждения — срочно? Звоните ${locationInfo.phone}.`,
    back: "← Назад к хоумстею",
    errName: "Укажите имя",
    errPhone: "Неверный номер телефона",
    errDates: "Выберите даты заезда и выезда",
    errRooms: "Выберите хотя бы один номер",
    loading: "Загрузка календаря…",
    perNight: "VND/номер/ночь",
    maxLabel: (a, c) => `До ${a} взросл.${c ? ` + ${c} ребёнок до 6 лет` : ""}`,
    availLeft: (f, u) => (u > 1 ? `Осталось ${f}/${u}` : "Свободно на ваши даты"),
    availLeftBed: (f, u) => `Осталось ${f}/${u} мест`,
    perNightBed: "VND/место/ночь",
    dormCapacity: (u, c) => `1 человек на место · всего ${u} мест, комфортно для ${c}`,
    pickRoomLocked: "⤴ Сначала выберите даты выше — свободные номера подсветятся",
    availNone: "Нет мест на ваши даты",
    availOk: "Есть места",
    availSome: "Некоторые ночи заняты (2 нед.)",
    availFull: "Занято на 2 недели вперёд",
    availInCombo: "Входит в выбранный пакет",
    maxGuests: (max, comfort) => `До ${max} чел. · рекомендуем ${comfort} (включая детей)`,
    monthPrev: "‹",
    monthNext: "›",
    weekdays: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
    roomNames: {
      "double-room": "Номер с двуспальной кроватью — вид на ручей",
      dormitory: "Место в общем зале",
      "single-room": "Номер с односпальной кроватью — вид на парапланы",
      "couple-attic-single": "Малая мансарда",
      "couple-attic-double": "Большая мансарда",
      "whole-home-small": "Семейный номер",
      "floor-combo": "Весь этаж (кроме 2 двухместных)",
      "whole-home-large": "Весь дом на сваях",
    },
    features: {
      "stilt-house": "Дом на сваях",
      "private-room": "Отдельная комната",
      "shared-bathroom": "Общая ванная",
      "ensuite-bathroom": "Собственная ванная",
      "stream-view": "Вид на ручей",
      "paragliding-view": "Вид на парапланы",
      attic: "Мансарда",
      "big-family": "Большая семья",
      company: "Корпоратив",
      karaoke: "Караоке",
      "campfire-camp": "Костёр и кемпинг",
      teambuilding: "Тимбилдинг",
      "view-both": "Вид на парапланы и реку",
      "free-pool": "Бесплатный бассейн",
    },
    beds: (kind, count) =>
      `${count} ${kind === "double-bed" ? "двуспальная кровать" : kind === "single-bed" ? "односпальная кровать" : "односпальный матрас"}`,
  },
  zh: {
    title: "预订住宿 — Clubhouse Mebayluon",
    subtitle: "考帕飞行点山脚下的民宿 — 实时房态",
    timeInfo: `${CHECK_IN_TIME} 后入住 · ${CHECK_OUT_TIME} 前退房`,
    facilities: "4间卫生间 · 3间公共淋浴 · 6个洗手台",
    pickRoom: "2 · 选择房间",
    pickRoomHint: "点击房间后选择数量 — 一个订单可订多间房",
    pickDates: "1 · 选择入住 – 退房日期",
    checkIn: "入住",
    checkOut: "退房",
    nights: (n) => `${n} 晚`,
    full: "已满",
    left: (n) => `剩 ${n}`,
    guests: "3 · 客人",
    adults: "成人",
    children: "儿童（6岁以下）",
    contact: "4 · 联系方式",
    name: "姓名",
    phone: "电话（WhatsApp/Zalo）",
    email: "邮箱（选填）",
    note: "备注（到达时间、晚餐…）",
    total: "预计总价",
    payAtHome: "到店付款 — 我们会在当天致电确认。",
    submit: "立即预订",
    submitting: "提交中…",
    doneTitle: "已收到预订！",
    doneBody: (ref) =>
      `您的预订编号是 ${ref}。${CHECK_IN_TIME} 后入住，${CHECK_OUT_TIME} 前退房。我们会在当天致电确认 — 着急请拨打 ${locationInfo.phone}。`,
    back: "← 返回民宿页面",
    errName: "请填写姓名",
    errPhone: "电话号码有误",
    errDates: "请选择入住和退房日期",
    errRooms: "请至少选择一间房",
    loading: "正在加载房态…",
    perNight: "越南盾/间/晚",
    maxLabel: (a, c) => `最多 ${a} 名成人${c ? ` + ${c} 名6岁以下儿童` : ""}`,
    availLeft: (f, u) => (u > 1 ? `仅剩 ${f}/${u} 间` : "所选日期有空房"),
    availLeftBed: (f, u) => `仅剩 ${f}/${u} 个床位`,
    perNightBed: "越南盾/床位/晚",
    dormCapacity: (u, c) => `每个床位 1 人 · 全层共 ${u} 个床位，${c} 人最舒适`,
    pickRoomLocked: "⤴ 请先在上方选择日期 — 可订房间会亮起",
    availNone: "所选日期已满",
    availOk: "有空房",
    availSome: "未来两周部分夜晚已满",
    availFull: "未来两周已满",
    availInCombo: "已包含在所选套餐中",
    maxGuests: (max, comfort) => `最多 ${max} 人 · 建议 ${comfort} 人（含儿童）`,
    monthPrev: "‹",
    monthNext: "›",
    weekdays: ["一", "二", "三", "四", "五", "六", "日"],
    roomNames: {
      "double-room": "双人床房 — 溪流景观",
      dormitory: "多人间床位",
      "single-room": "单人床房 — 滑翔伞景观",
      "couple-attic-single": "小阁楼房",
      "couple-attic-double": "大阁楼房",
      "whole-home-small": "家庭房",
      "floor-combo": "整层包场（不含2间双人房）",
      "whole-home-large": "整栋高脚屋",
    },
    features: {
      "stilt-house": "高脚屋",
      "private-room": "独立房间",
      "shared-bathroom": "公共卫生间",
      "ensuite-bathroom": "独立卫生间",
      "stream-view": "溪流景观",
      "paragliding-view": "滑翔伞景观",
      attic: "阁楼",
      "big-family": "大家庭",
      company: "公司团建",
      karaoke: "卡拉OK",
      "campfire-camp": "篝火露营",
      teambuilding: "团队建设",
      "view-both": "滑翔伞与大溪景观",
      "free-pool": "免费泳池",
    },
    beds: (kind, count) =>
      `${count}${kind === "double-bed" ? "张双人床" : kind === "single-bed" ? "张单人床" : "张单人床垫"}`,
  },
  hi: {
    title: "बुकिंग — Clubhouse Mebayluon",
    subtitle: "खाउ फा उड़ान स्थल की तलहटी में होमस्टे — लाइव उपलब्धता",
    timeInfo: `चेक-इन ${CHECK_IN_TIME} से · चेक-आउट ${CHECK_OUT_TIME} तक`,
    facilities: "4 शौचालय · 3 साझा स्नानघर · 6 वॉशबेसिन",
    pickRoom: "2 · कमरे चुनें",
    pickRoomHint: "कमरे पर टैप करें फिर संख्या चुनें — एक बुकिंग में कई कमरे",
    pickDates: "1 · चेक-इन – चेक-आउट तारीखें चुनें",
    checkIn: "चेक-इन",
    checkOut: "चेक-आउट",
    nights: (n) => `${n} रात`,
    full: "पूर्ण",
    left: (n) => `${n} शेष`,
    guests: "3 · मेहमान",
    adults: "वयस्क",
    children: "बच्चे (6 वर्ष से कम)",
    contact: "4 · संपर्क विवरण",
    name: "पूरा नाम",
    phone: "फ़ोन (WhatsApp/Zalo)",
    email: "ईमेल (वैकल्पिक)",
    note: "टिप्पणी (आगमन समय, रात का खाना…)",
    total: "अनुमानित कुल",
    payAtHome: "आगमन पर भुगतान — हम उसी दिन पुष्टि के लिए कॉल करेंगे।",
    submit: "बुक करें",
    submitting: "भेजा जा रहा है…",
    doneTitle: "बुकिंग प्राप्त हुई!",
    doneBody: (ref) =>
      `आपका बुकिंग कोड ${ref} है। चेक-इन ${CHECK_IN_TIME} से, चेक-आउट ${CHECK_OUT_TIME} तक। हम उसी दिन पुष्टि के लिए कॉल करेंगे — जल्दी है? ${locationInfo.phone} पर कॉल करें।`,
    back: "← होमस्टे पेज पर वापस",
    errName: "कृपया नाम लिखें",
    errPhone: "फ़ोन नंबर सही नहीं लगता",
    errDates: "कृपया चेक-इन व चेक-आउट तारीखें चुनें",
    errRooms: "कृपया कम से कम एक कमरा चुनें",
    loading: "उपलब्धता लोड हो रही है…",
    perNight: "VND/कमरा/रात",
    maxLabel: (a, c) => `अधिकतम ${a} वयस्क${c ? ` + ${c} बच्चा (6 वर्ष से कम)` : ""}`,
    availLeft: (f, u) => (u > 1 ? `केवल ${f}/${u} शेष` : "आपकी तारीखों के लिए उपलब्ध"),
    availLeftBed: (f, u) => `केवल ${f}/${u} बेड शेष`,
    perNightBed: "VND/बेड/रात",
    dormCapacity: (u, c) => `प्रति बेड 1 व्यक्ति · कुल ${u} बेड, ${c} लोगों के लिए आरामदायक`,
    pickRoomLocked: "⤴ पहले ऊपर तारीखें चुनें — उपलब्ध कमरे रोशन हो जाएंगे",
    availNone: "आपकी तारीखों के लिए पूर्ण",
    availOk: "उपलब्ध",
    availSome: "कुछ रातें पूर्ण (2 सप्ताह)",
    availFull: "अगले 2 सप्ताह पूर्ण",
    availInCombo: "चुने गए पैकेज में शामिल",
    maxGuests: (max, comfort) => `अधिकतम ${max} लोग · ${comfort} अनुशंसित (बच्चों सहित)`,
    monthPrev: "‹",
    monthNext: "›",
    weekdays: ["सो", "मं", "बु", "गु", "शु", "श", "र"],
    roomNames: {
      "double-room": "डबल बेड कमरा — नदी का दृश्य",
      dormitory: "डॉर्मिटरी बेड",
      "single-room": "सिंगल बेड कमरा — पैराग्लाइडिंग दृश्य",
      "couple-attic-single": "छोटा अटारी कमरा",
      "couple-attic-double": "बड़ा अटारी कमरा",
      "whole-home-small": "फ़ैमिली कमरा",
      "floor-combo": "पूरी मंज़िल (2 डबल कमरों को छोड़कर)",
      "whole-home-large": "पूरा स्टिल्ट हाउस",
    },
    features: {
      "stilt-house": "स्टिल्ट हाउस",
      "private-room": "निजी कमरा",
      "shared-bathroom": "साझा बाथरूम",
      "ensuite-bathroom": "संलग्न बाथरूम",
      "stream-view": "नदी का दृश्य",
      "paragliding-view": "पैराग्लाइडिंग दृश्य",
      attic: "अटारी",
      "big-family": "बड़ा परिवार",
      company: "कंपनी आयोजन",
      karaoke: "कराओके",
      "campfire-camp": "कैम्पफ़ायर व कैम्पिंग",
      teambuilding: "टीमबिल्डिंग",
      "view-both": "पैराग्लाइडिंग व नदी का दृश्य",
      "free-pool": "निःशुल्क पूल",
    },
    beds: (kind, count) =>
      `${count} ${kind === "double-bed" ? "डबल बेड" : kind === "single-bed" ? "सिंगल बेड" : "सिंगल गद्दा"}`,
  },
};

/* ================= helpers ================= */

type Availability = {
  from: string;
  to: string;
  dates: string[];
  rooms: Array<{ id: string; units: number; free: number[] }>;
};

/** Chỉ các phòng cho đặt online — sàn cộng đồng/nguyên căn thì liên hệ trực tiếp. */
const WEB_ROOMS: HomestayRoom[] = HOMESTAY_ROOMS.filter((r) => r.webBookable);

function todayKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function shiftKey(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function vnd(n: number): string {
  return n.toLocaleString("vi-VN") + " đ";
}

export default function DatPhongClient() {
  const { language } = useLanguage();
  const raw = (language ?? "vi").toString().slice(0, 2).toLowerCase();
  const langKey = (raw in L ? raw : "vi") as HomestayLang;
  const s = L[langKey];
  const today = todayKey();

  const [avail, setAvail] = useState<Availability | null>(null);
  /** GIỎ PHÒNG: hạng phòng -> số lượng. 0/không có = chưa chọn. */
  const [qty, setQty] = useState<Record<string, number>>({});
  const [checkIn, setCheckIn] = useState<string>("");
  const [checkOut, setCheckOut] = useState<string>("");
  /** Tháng đang xem trên lịch — "YYYY-MM-01". */
  const [month, setMonth] = useState<string>(today.slice(0, 8) + "01");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ ref: string } | null>(null);

  /** Lịch trống 62 đêm từ hôm nay — đủ cho hai tháng khách hay xem. */
  const loadAvail = useCallback(() => {
    fetch(`/api/homestay/availability?from=${today}&to=${shiftKey(today, 62)}`)
      .then((r) => r.json())
      .then(setAvail)
      .catch(() => setError("Không tải được lịch phòng — tải lại trang giúp mình."));
  }, [today]);

  useEffect(() => {
    loadAvail();
  }, [loadAvail]);

  /** free[roomId][date] — tra nhanh khi vẽ lịch. */
  const freeMap = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    if (avail) {
      for (const row of avail.rooms) {
        const m = new Map<string, number>();
        avail.dates.forEach((d, i) => m.set(d, row.free[i]));
        map.set(row.id, m);
      }
    }
    return map;
  }, [avail]);

  /** Các dòng phòng đã chọn (số lượng > 0). */
  const lines = useMemo(
    () => WEB_ROOMS.filter((r) => (qty[r.id] ?? 0) > 0).map((r) => ({ room: r, qty: qty[r.id] ?? 0 })),
    [qty],
  );

  /** Đã chốt đủ ngày nhận + trả chưa — mốc mở khoá phần chọn phòng. */
  const datesPicked = Boolean(checkIn && checkOut);
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const total = nights > 0 ? lines.reduce((t, l) => t + homestayPrice(l.room.id, nights, l.qty), 0) : 0;
  const totalPerNight = lines.reduce((t, l) => t + l.room.pricePerNight * l.qty, 0);

  /** Sức chứa của giỏ — để chặn khai số khách vượt phòng đã lấy. */
  const capAdults = lines.reduce((t, l) => t + l.room.maxAdults * l.qty, 0);
  const capChildren = lines.reduce((t, l) => t + l.room.maxChildren * l.qty, 0);

  useEffect(() => {
    if (capAdults > 0 && adults > capAdults) setAdults(capAdults);
    if (children > capChildren) setChildren(capChildren);
  }, [capAdults, capChildren, adults, children]);

  /**
   * PHÒNG CÒN BAO NHIÊU cho khoảng ngày ĐÃ CHỌN (đêm ít nhất quyết định) —
   * null khi chưa chọn ngày hoặc khoảng vượt cửa sổ 62 đêm đã tải.
   */
  const rangeFree = useCallback(
    (roomId: string): number | null => {
      if (!checkIn || !checkOut || checkOut <= checkIn) return null;
      let min = Infinity;
      for (let d = checkIn; d < checkOut; d = shiftKey(d, 1)) {
        const f = freeMap.get(roomId)?.get(d);
        if (f === undefined) return null;
        min = Math.min(min, f);
      }
      return min === Infinity ? null : min;
    },
    [checkIn, checkOut, freeMap],
  );

  /** Chưa chọn ngày thì nhìn 14 ĐÊM TỚI: "ok" còn đủ · "some" kín vài đêm · "full" kín hết. */
  const twoWeekStatus = useCallback(
    (roomId: string): "ok" | "some" | "full" | null => {
      const m = freeMap.get(roomId);
      if (!m || m.size === 0) return null;
      let fullNights = 0;
      for (let i = 0; i < 14; i++) {
        const f = m.get(shiftKey(today, i));
        if (f !== undefined && f <= 0) fullNights++;
      }
      return fullNights === 0 ? "ok" : fullNights >= 14 ? "full" : "some";
    },
    [freeMap, today],
  );

  /**
   * GÓI NGUYÊN SÀN đã bao các phòng thành phần: giỏ có gói thì phòng trong
   * gói bị khoá (kẻo tính tiền trùng), và ngược lại — máy chủ cũng giữ luật
   * này, đây chỉ là chặn sớm cho khỏi bấm nhầm.
   */
  const cartBlocked = useCallback(
    (roomId: string): boolean =>
      lines.some((l) => {
        const a = l.room.id;
        if (a === roomId) return false;
        const compsA = COMBO_COMPONENTS[a];
        const compsB = COMBO_COMPONENTS[roomId];
        if (compsA?.includes(roomId)) return true;
        if (compsB?.includes(a)) return true;
        return Boolean(compsA && compsB && compsA.some((c) => compsB.includes(c)));
      }),
    [lines],
  );

  /** Trần số lượng của một phòng: đã chọn ngày thì không cho lấy quá số còn trống. */
  const capOf = useCallback(
    (r: HomestayRoom): number => {
      const free = rangeFree(r.id);
      return free === null ? r.units : Math.min(r.units, free);
    },
    [rangeFree],
  );

  /**
   * Đêm này CÒN ĐẶT ĐƯỢC không.
   *
   * Khách chọn NGÀY TRƯỚC nên lúc bấm lịch giỏ thường còn rỗng — khi ấy đêm
   * nào còn BẤT KỲ hạng phòng nào trống là bấm được (kín hết mọi hạng mới gạch
   * đỏ). Giỏ đã có phòng rồi thì siết lại: phải đủ chỗ cho CẢ GIỎ, thiếu một
   * hạng là coi như kín.
   */
  const nightOk = useCallback(
    (d: string) => {
      if (d < today) return false;
      if (lines.length === 0) {
        const known = WEB_ROOMS.some((r) => freeMap.get(r.id)?.has(d));
        return known && WEB_ROOMS.some((r) => (freeMap.get(r.id)?.get(d) ?? 0) > 0);
      }
      return lines.every((l) => (freeMap.get(l.room.id)?.get(d) ?? -1) >= l.qty);
    },
    [freeMap, lines, today],
  );

  /**
   * Đêm này còn dư mấy "suất giỏ" nữa — để nhắc vàng khi sắp hết. Giỏ còn rỗng
   * thì chưa có "suất" nào để đếm, trả số lớn để khỏi nhắc oan.
   */
  const slotsLeft = useCallback(
    (d: string) => {
      if (lines.length === 0) return 99;
      return Math.min(...lines.map((l) => Math.floor((freeMap.get(l.room.id)?.get(d) ?? 0) / l.qty)));
    },
    [freeMap, lines],
  );

  function setRoomQty(id: string, next: number) {
    setError(null);
    // Ngày đã chọn GIỮ NGUYÊN: nút + đã bị trần "còn bao nhiêu cho ngày này"
    // chặn sẵn nên giỏ không bao giờ vượt phòng trống — khỏi bắt chọn lại ngày
    setQty((p) => ({ ...p, [id]: Math.max(0, next) }));
  }

  /** Bấm một ngày trên lịch: lần đầu là nhận phòng, lần sau là trả phòng. */
  function pickDate(d: string) {
    setError(null);
    if (!checkIn || (checkIn && checkOut) || d <= checkIn) {
      setCheckIn(d);
      setCheckOut("");
      return;
    }
    // Mọi đêm từ checkIn tới d-1 phải còn chỗ — vướng đêm nào thì bắt đầu lại từ d
    for (let x = checkIn; x < d; x = shiftKey(x, 1)) {
      if (!nightOk(x)) {
        setCheckIn(d);
        setCheckOut("");
        return;
      }
    }
    setCheckOut(d);
  }

  async function submit() {
    setError(null);
    if (lines.length === 0) return setError(s.errRooms);
    if (!checkIn || !checkOut) return setError(s.errDates);
    if (!guestName.trim()) return setError(s.errName);
    if (phone.replace(/\D/g, "").length < 8) return setError(s.errPhone);
    setBusy(true);
    try {
      const res = await fetch(`/api/homestay/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: lines.map((l) => ({ roomTypeId: l.room.id, qty: l.qty })),
          checkIn,
          checkOut,
          adults,
          children,
          guestName,
          phone,
          email,
          note,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || "Không đặt được phòng");
      setDone({ ref: body.ref });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đặt được phòng");
      loadAvail(); // phòng có thể vừa bị người khác lấy — vẽ lại lịch
    } finally {
      setBusy(false);
    }
  }

  /* ---------- lịch tháng ---------- */
  const monthDays = useMemo(() => {
    const first = new Date(`${month}T00:00:00Z`);
    const days: Array<string | null> = [];
    // Thứ 2 đứng đầu tuần: getUTCDay() 0=CN
    const lead = (first.getUTCDay() + 6) % 7;
    for (let i = 0; i < lead; i++) days.push(null);
    const d = new Date(first);
    while (d.getUTCMonth() === first.getUTCMonth()) {
      days.push(d.toISOString().slice(0, 10));
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return days;
  }, [month]);

  const monthLabel = new Date(`${month}T00:00:00Z`).toLocaleDateString(
    langKey === "vi" ? "vi-VN" : langKey === "zh" ? "zh-CN" : langKey === "ru" ? "ru-RU" : langKey === "fr" ? "fr-FR" : langKey === "hi" ? "hi-IN" : "en-US",
    { month: "long", year: "numeric", timeZone: "UTC" },
  );

  if (done) {
    return (
      <>
        <PageBackground src="/homestay/nguyen-can.jpg" alt="Clubhouse Mebayluon" />
        <div className="fixed inset-0 -z-10 bg-black/40" />
        <main className="container mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
          <div className="rounded-3xl bg-white/95 p-8 shadow-xl">
            <div className="text-5xl">🎉</div>
            <h1 className="mt-3 text-2xl font-extrabold text-slate-900">{s.doneTitle}</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.doneBody(done.ref)}</p>
            <Button asChild className="mt-5 w-full bg-accent hover:bg-accent/90">
              <Link href="/homestay">{s.back}</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <PageBackground src="/homestay/nguyen-can.jpg" alt="Clubhouse Mebayluon" />
      <div className="fixed inset-0 -z-10 bg-black/40" />
      <main className="container mx-auto max-w-3xl px-4 pb-16 pt-24">
        <h1 className="text-hero-shadow text-3xl font-extrabold text-white md:text-4xl">{s.title}</h1>
        <p className="text-hero-shadow-soft mt-1 font-medium text-white/90">{s.subtitle}</p>
        {/* Giờ nhận/trả cố định + tiện nghi chung — nói ngay từ đầu, khỏi ai phải hỏi lại */}
        <p className="mt-2 flex flex-wrap gap-2">
          <span className="inline-block rounded-full bg-black/50 px-4 py-1.5 text-sm font-semibold text-amber-300">
            🕐 {s.timeInfo}
          </span>
          <span className="inline-block rounded-full bg-black/50 px-4 py-1.5 text-sm font-semibold text-sky-200">
            🚿 {s.facilities}
          </span>
        </p>

        {/* ---- 1. LỊCH — CHỌN NGÀY TRƯỚC ----
            Khách chọn ngày trước rồi mới chọn phòng: chọn 1/9 thì phòng nào
            còn trống sẽ sáng lên, phòng kín thì mờ đi và ghi "hết". Trước đây
            ngược lại (chọn phòng rồi mới mở lịch) nên khách phải đoán xem
            phòng mình thích có trống hôm đó không, chọn xong mới biết là kín. */}
        <h2 className="text-hero-shadow mt-8 text-lg font-bold text-white">{s.pickDates}</h2>
        <div className="mt-2 rounded-3xl bg-white/95 p-4 shadow-xl">
              {!avail ? (
                <p className="py-8 text-center text-sm text-slate-500">{s.loading}</p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setMonth(shiftKey(month, -1).slice(0, 8) + "01")}
                      disabled={month <= today.slice(0, 8) + "01"}
                      className="h-9 w-9 rounded-full text-lg font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                      aria-label="previous month"
                    >
                      {s.monthPrev}
                    </button>
                    <div className="text-sm font-bold capitalize text-slate-900">{monthLabel}</div>
                    <button
                      type="button"
                      onClick={() => setMonth(shiftKey(month, 32).slice(0, 8) + "01")}
                      className="h-9 w-9 rounded-full text-lg font-bold text-slate-600 hover:bg-slate-100"
                      aria-label="next month"
                    >
                      {s.monthNext}
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-7 gap-1 text-center">
                    {s.weekdays.map((w) => (
                      <div key={w} className="py-1 text-[11px] font-bold text-slate-400">
                        {w}
                      </div>
                    ))}
                    {monthDays.map((d, i) => {
                      if (!d) return <div key={`x${i}`} />;
                      /** Đã tải được số liệu của đêm này chưa (ngoài cửa sổ 62 đêm thì chưa). */
                      const known =
                        lines.length === 0
                          ? WEB_ROOMS.some((r) => freeMap.get(r.id)?.has(d))
                          : lines.every((l) => freeMap.get(l.room.id)?.has(d));
                      const ok = nightOk(d);
                      const inRange = checkIn && checkOut && checkIn <= d && d < checkOut;
                      const isIn = d === checkIn;
                      const isOut = d === checkOut;
                      /**
                       * Ngày TRẢ PHÒNG được phép là ngày ngay sau đêm cuối còn
                       * trống — nên nút chỉ khoá khi ngày đó không làm đêm ở
                       * lẫn ngày trả được (hết cửa dùng).
                       */
                      const canCheckout =
                        Boolean(checkIn) && !checkOut && d > checkIn && nightOk(shiftKey(d, -1));
                      const clickable = ok || canCheckout;
                      const left = known && ok ? slotsLeft(d) : 0;
                      return (
                        <button
                          key={d}
                          type="button"
                          disabled={!clickable}
                          onClick={() => pickDate(d)}
                          className={
                            "flex h-11 flex-col items-center justify-center rounded-lg text-sm font-semibold transition " +
                            (isIn || isOut
                              ? "bg-accent text-white shadow"
                              : inRange
                                ? "bg-accent/20 text-slate-900"
                                : !known
                                  ? "text-slate-300"
                                  : ok
                                    ? "bg-emerald-50 text-slate-800 hover:bg-emerald-100"
                                    : "bg-rose-50 text-rose-300 line-through")
                          }
                        >
                          {Number(d.slice(8))}
                          {known && ok && left <= 1 && (
                            <span className="text-[9px] font-bold leading-none text-amber-600">{s.left(left)}</span>
                          )}
                          {known && !ok && <span className="text-[9px] leading-none">{s.full}</span>}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span>
                      <strong>{s.checkIn}:</strong>{" "}
                      {checkIn ? `${checkIn.split("-").reverse().join("/")} · ${CHECK_IN_TIME}` : "—"}
                    </span>
                    <span>
                      <strong>{s.checkOut}:</strong>{" "}
                      {checkOut ? `${checkOut.split("-").reverse().join("/")} · ${CHECK_OUT_TIME}` : "—"}
                    </span>
                    {nights > 0 && <span className="font-bold text-accent">{s.nights(nights)}</span>}
                  </div>
                </>
              )}
        </div>

        {/* ---- 2. CHỌN PHÒNG + SỐ LƯỢNG (mở sau khi đã có ngày) ---- */}
        <h2 className="text-hero-shadow mt-8 text-lg font-bold text-white">{s.pickRoom}</h2>
        <p className="text-hero-shadow-soft text-sm text-white/85">
          {datesPicked ? s.pickRoomHint : s.pickRoomLocked}
        </p>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {WEB_ROOMS.map((r) => {
            const n = qty[r.id] ?? 0;
            const picked = n > 0;
            /**
             * TÌNH TRẠNG CÒN/HẾT ngay trên thẻ: đã chọn ngày thì đếm đúng số
             * phòng còn cho khoảng đó (hết = thẻ mờ, không bấm được); chưa
             * chọn ngày thì báo tổng quan 14 đêm tới.
             */
            const free = rangeFree(r.id);
            const soldOut = free !== null && free <= 0;
            const blocked = !picked && cartBlocked(r.id);
            /** Chưa chọn ngày thì chưa biết phòng nào trống — không cho bấm. */
            const locked = !datesPicked || soldOut || blocked;
            const status = free === null ? twoWeekStatus(r.id) : null;
            return (
              <div
                key={r.id}
                role="button"
                tabIndex={0}
                aria-disabled={locked}
                onClick={() => !picked && !locked && setRoomQty(r.id, 1)}
                onKeyDown={(e) => e.key === "Enter" && !picked && !locked && setRoomQty(r.id, 1)}
                className={
                  "rounded-2xl border-2 p-3 text-left transition " +
                  (picked
                    ? "border-accent bg-white shadow-lg"
                    : locked
                      ? "border-transparent bg-white/50 opacity-70"
                      : "cursor-pointer border-transparent bg-white/85 hover:bg-white")
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold leading-tight text-slate-900">
                      {s.roomNames[r.id] ?? r.id}
                    </div>
                    <div className="mt-0.5 text-xs font-semibold text-accent">
                      {r.pricePerNight.toLocaleString("vi-VN")}{" "}
                      {/* Sàn cộng đồng bán theo CHỖ NẰM — in "đ/phòng/đêm" là khách
                          tưởng 200k được cả sàn 12 đệm */}
                      <span className="font-normal text-slate-500">{r.perBed ? s.perNightBed : s.perNight}</span>
                    </div>
                  </div>
                  {/* Bộ đếm SỐ LƯỢNG hiện ngay trên thẻ khi đã chọn — bấm − về 0 là bỏ chọn */}
                  {picked ? (
                    <div
                      className="flex shrink-0 items-center overflow-hidden rounded-xl border border-slate-300 bg-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setRoomQty(r.id, n - 1)}
                        className="h-9 w-9 text-lg font-bold text-slate-500 hover:bg-slate-100"
                        aria-label="bớt một phòng"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-bold tabular-nums text-slate-900">{n}</span>
                      <button
                        type="button"
                        onClick={() => setRoomQty(r.id, Math.min(capOf(r), n + 1))}
                        disabled={n >= capOf(r)}
                        className="h-9 w-9 text-lg font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                        aria-label="thêm một phòng"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <span className="shrink-0 rounded-full bg-slate-900/10 px-2 py-1 text-[11px] font-bold text-slate-600">
                      ×{r.units}
                    </span>
                  )}
                </div>
                {/* Giường + tiện nghi + sức chứa — đúng lời chủ nhà khai */}
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {r.beds.map((b) => (
                    <span key={b.kind} className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-900">
                      🛏 {s.beds(b.kind, b.count)}
                    </span>
                  ))}
                  {r.features.map((f) => (
                    <span key={f} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                      {s.features[f]}
                    </span>
                  ))}
                </div>
                <div className="mt-1 text-[11px] font-medium text-slate-500">
                  {/* Sàn cộng đồng: maxAdults là sức chứa MỘT CHỖ còn comfort là
                      của CẢ SÀN — in chung công thức phòng lẻ sẽ ra "tối đa 1
                      người · khuyến cáo 10", đọc không hiểu gì. */}
                  👥{" "}
                  {r.perBed
                    ? s.dormCapacity(r.units, r.comfort ?? r.units)
                    : r.comfort
                      ? s.maxGuests(r.maxAdults, r.comfort)
                      : s.maxLabel(r.maxAdults, r.maxChildren)}
                </div>
                {/* CÒN / HẾT — theo ngày đã chọn, chưa chọn thì nhìn 14 đêm tới */}
                <div className="mt-1.5">
                  {blocked ? (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      ⊂ {s.availInCombo}
                    </span>
                  ) : free !== null ? (
                    soldOut ? (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                        ✕ {s.availNone}
                      </span>
                    ) : (
                      <span
                        className={
                          /* Sắp hết (còn chưa tới nửa số phòng) thì vàng để khách biết mà nhanh tay */
                          "rounded-full px-2 py-0.5 text-[10px] font-bold " +
                          (free * 2 <= r.units ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800")
                        }
                      >
                        ✓ {r.perBed ? s.availLeftBed(free, r.units) : s.availLeft(free, r.units)}
                      </span>
                    )
                  ) : status === "full" ? (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                      ✕ {s.availFull}
                    </span>
                  ) : status === "some" ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      ◐ {s.availSome}
                    </span>
                  ) : status === "ok" ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      ✓ {s.availOk}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* ---- 3. KHÁCH + 4. LIÊN HỆ + TỔNG ---- */}
        {lines.length > 0 && checkIn && checkOut && (
          <>
            <h2 className="text-hero-shadow mt-8 text-lg font-bold text-white">{s.guests}</h2>
            <Card className="mt-2 border-none bg-white/95 shadow-xl">
              <CardContent className="flex flex-wrap items-end gap-4 p-4">
                <Counter label={s.adults} value={adults} min={1} max={Math.max(1, capAdults)} onChange={setAdults} />
                <Counter label={s.children} value={children} min={0} max={capChildren} onChange={setChildren} />
              </CardContent>
            </Card>

            <h2 className="text-hero-shadow mt-8 text-lg font-bold text-white">{s.contact}</h2>
            <Card className="mt-2 border-none bg-white/95 shadow-xl">
              <CardContent className="grid gap-3 p-4 md:grid-cols-2">
                <input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder={s.name + " *"}
                  className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-accent"
                />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={s.phone + " *"}
                  inputMode="tel"
                  className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-accent"
                />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={s.email}
                  inputMode="email"
                  className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-accent"
                />
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={s.note}
                  className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-accent"
                />
              </CardContent>
            </Card>

            <div className="mt-5 rounded-3xl bg-white/95 p-4 shadow-xl">
              {/* Bảng kê từng dòng phòng — khách soát lại được mình lấy gì */}
              <ul className="divide-y divide-slate-100 text-sm">
                {lines.map((l) => (
                  <li key={l.room.id} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="min-w-0 flex-1 text-slate-700">
                      {s.roomNames[l.room.id] ?? l.room.id} × {l.qty}
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-500">
                      {vnd(l.room.pricePerNight * l.qty)}/{s.nights(1)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
                <span className="text-sm font-semibold text-slate-700">
                  {s.total} · {s.nights(nights)} · {vnd(totalPerNight)}/{s.nights(1)}
                </span>
                <strong className="text-xl font-extrabold tabular-nums text-slate-900">{vnd(total)}</strong>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                🕐 {s.timeInfo} · {s.payAtHome}
              </p>
              {error && <p className="mt-2 text-sm font-semibold text-rose-600">{error}</p>}
              <Button
                type="button"
                onClick={submit}
                disabled={busy}
                className="mt-3 h-12 w-full bg-accent text-base font-bold hover:bg-accent/90"
              >
                {busy ? s.submitting : s.submit}
              </Button>
            </div>
          </>
        )}

        <div className="mt-8">
          <Link href="/homestay" className="text-hero-shadow-soft text-sm font-semibold text-white/90 underline">
            {s.back}
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Counter({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-600">{label}</div>
      <div className="mt-1 flex h-11 items-center overflow-hidden rounded-xl border border-slate-300">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="h-full w-10 text-lg font-bold text-slate-500 hover:bg-slate-100"
        >
          −
        </button>
        <span className="w-10 text-center text-sm font-bold tabular-nums text-slate-900">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="h-full w-10 text-lg font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}
