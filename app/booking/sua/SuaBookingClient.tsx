"use client";

/**
 * KHÁCH TỰ SỬA BOOKING (30/09/2026). Bước 1: mã booking + số điện thoại.
 * Bước 2: sửa ngày, giờ, số khách, liên hệ, điểm đón, thông tin khách, ghi
 * chú — hoặc gửi yêu cầu huỷ. Máy chủ quyết định khoá (hạn 18:00 hôm trước,
 * đã xuất vé, đã chốt…); trang chỉ hiện lý do.
 */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useLangCode } from "@/lib/booking/translations-booking";

type Lang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";
type Khach = { fullName: string; dob: string; gender: string; idNumber: string; weightKg: number | null; nationality: string };
type BookingXem = {
  ma: string;
  locationName: string;
  location: string;
  goi: string;
  dateISO: string;
  timeSlot: string;
  guestsCount: number;
  contact: { phone: string; email: string; pickupLocation: string; specialRequest: string };
  guests: Khach[];
  dichVu: string[];
  gia: { tong: number; tienTe: string };
  status: string;
  queueNo: number | null;
  han: { ngay: string; gio: string } | null;
  khoa: { khoa: boolean; lyDo: string };
  yeuCauHuy: { at: string; lyDo?: string } | null;
};

const T: Record<Lang, Record<string, string>> = {
  vi: {
    tieuDe: "Sửa booking", phu: "Nhập mã booking (trong email xác nhận hoặc màn hình đặt xong) và số điện thoại đã dùng khi đặt.",
    ma: "Mã booking", sdt: "Số điện thoại", traCuu: "Tra cứu", dangTai: "Đang xử lý…",
    diem: "Điểm bay", goi: "Gói", dichVu: "Dịch vụ", tong: "Tổng tiền", stt: "Số thứ tự bay",
    han: "Được sửa đến", khoa: "Không sửa được", ngay: "Ngày bay", gio: "Giờ bay", soKhach: "Số khách",
    email: "Email", don: "Điểm đón (khách sạn / địa chỉ)", ghiChu: "Ghi chú / yêu cầu",
    khach: "Thông tin khách bay", ten: "Họ tên", ns: "Ngày sinh", can: "Cân nặng (kg)", qt: "Quốc tịch",
    luu: "Lưu thay đổi", daLuu: "Đã lưu. Chúng tôi đã nhận thay đổi của bạn:", khongDoi: "Bạn chưa thay đổi gì.",
    giaNote: "Giá được tính lại khi đổi ngày hoặc số khách; dịch vụ thêm sẽ được nhân viên xác nhận.",
    huyTieuDe: "Muốn huỷ booking?", huyPhu: "Gửi yêu cầu, nhân viên sẽ gọi lại để xử lý cọc và hoàn tiền (nếu có).",
    lyDo: "Lý do (không bắt buộc)", guiHuy: "Gửi yêu cầu huỷ", xacNhanHuy: "Gửi yêu cầu huỷ booking này?",
    daHuy: "Đã gửi yêu cầu huỷ. Nhân viên sẽ liên hệ với bạn.", khac: "Tra mã khác", doiSdt: "Muốn đổi số điện thoại? Gọi hotline 0964 073 555.",
  },
  en: {
    tieuDe: "Manage your booking", phu: "Enter your booking code (in the confirmation email or on the booking screen) and the phone number you booked with.",
    ma: "Booking code", sdt: "Phone number", traCuu: "Find booking", dangTai: "Working…",
    diem: "Flying site", goi: "Package", dichVu: "Extras", tong: "Total", stt: "Flight queue number",
    han: "Editable until", khoa: "Cannot be changed", ngay: "Flight date", gio: "Flight time", soKhach: "Guests",
    email: "Email", don: "Pickup (hotel / address)", ghiChu: "Notes / requests",
    khach: "Passenger details", ten: "Full name", ns: "Date of birth", can: "Weight (kg)", qt: "Nationality",
    luu: "Save changes", daLuu: "Saved. We have received your changes:", khongDoi: "Nothing has changed.",
    giaNote: "The price is recalculated when you change the date or number of guests; extras will be confirmed by our staff.",
    huyTieuDe: "Need to cancel?", huyPhu: "Send a request and our staff will call you to handle the deposit and refund (if any).",
    lyDo: "Reason (optional)", guiHuy: "Request cancellation", xacNhanHuy: "Send a cancellation request for this booking?",
    daHuy: "Cancellation request sent. Our staff will contact you.", khac: "Look up another code", doiSdt: "To change the phone number, call +84 964 073 555.",
  },
  fr: {
    tieuDe: "Gérer votre réservation", phu: "Saisissez votre code de réservation (dans l’e-mail de confirmation) et le numéro de téléphone utilisé.",
    ma: "Code de réservation", sdt: "Téléphone", traCuu: "Rechercher", dangTai: "Traitement…",
    diem: "Site de vol", goi: "Formule", dichVu: "Options", tong: "Total", stt: "Numéro d’ordre de vol",
    han: "Modifiable jusqu’au", khoa: "Modification impossible", ngay: "Date du vol", gio: "Heure du vol", soKhach: "Passagers",
    email: "E-mail", don: "Prise en charge (hôtel / adresse)", ghiChu: "Remarques / demandes",
    khach: "Passagers", ten: "Nom complet", ns: "Date de naissance", can: "Poids (kg)", qt: "Nationalité",
    luu: "Enregistrer", daLuu: "Enregistré. Nous avons bien reçu vos modifications :", khongDoi: "Aucune modification.",
    giaNote: "Le prix est recalculé si vous changez la date ou le nombre de passagers ; les options seront confirmées par notre équipe.",
    huyTieuDe: "Besoin d’annuler ?", huyPhu: "Envoyez une demande, notre équipe vous rappellera pour l’acompte et le remboursement éventuel.",
    lyDo: "Motif (facultatif)", guiHuy: "Demander l’annulation", xacNhanHuy: "Envoyer une demande d’annulation ?",
    daHuy: "Demande envoyée. Notre équipe vous contactera.", khac: "Autre code", doiSdt: "Pour changer de numéro, appelez le +84 964 073 555.",
  },
  ru: {
    tieuDe: "Изменить бронирование", phu: "Введите код бронирования (из письма-подтверждения) и номер телефона, указанный при бронировании.",
    ma: "Код бронирования", sdt: "Телефон", traCuu: "Найти", dangTai: "Обработка…",
    diem: "Площадка", goi: "Пакет", dichVu: "Доп. услуги", tong: "Итого", stt: "Номер очереди",
    han: "Изменить можно до", khoa: "Изменение невозможно", ngay: "Дата полёта", gio: "Время полёта", soKhach: "Гостей",
    email: "Email", don: "Трансфер (отель / адрес)", ghiChu: "Примечания / пожелания",
    khach: "Данные пассажиров", ten: "ФИО", ns: "Дата рождения", can: "Вес (кг)", qt: "Гражданство",
    luu: "Сохранить", daLuu: "Сохранено. Мы получили ваши изменения:", khongDoi: "Изменений нет.",
    giaNote: "Цена пересчитывается при смене даты или числа гостей; доп. услуги подтвердит наш сотрудник.",
    huyTieuDe: "Нужно отменить?", huyPhu: "Отправьте запрос — сотрудник перезвонит по поводу депозита и возврата.",
    lyDo: "Причина (необязательно)", guiHuy: "Запросить отмену", xacNhanHuy: "Отправить запрос на отмену?",
    daHuy: "Запрос отправлен. Мы свяжемся с вами.", khac: "Другой код", doiSdt: "Чтобы сменить номер, позвоните +84 964 073 555.",
  },
  zh: {
    tieuDe: "修改预订", phu: "请输入预订编号（见确认邮件）和预订时使用的电话号码。",
    ma: "预订编号", sdt: "电话号码", traCuu: "查询", dangTai: "处理中…",
    diem: "飞行点", goi: "套餐", dichVu: "附加服务", tong: "总价", stt: "飞行排队号",
    han: "可修改至", khoa: "无法修改", ngay: "飞行日期", gio: "飞行时间", soKhach: "人数",
    email: "邮箱", don: "接送（酒店 / 地址）", ghiChu: "备注 / 要求",
    khach: "乘客信息", ten: "姓名", ns: "出生日期", can: "体重（公斤）", qt: "国籍",
    luu: "保存修改", daLuu: "已保存，我们已收到您的修改：", khongDoi: "没有任何修改。",
    giaNote: "更改日期或人数时会重新计算价格；附加服务由工作人员确认。",
    huyTieuDe: "需要取消？", huyPhu: "提交申请后，工作人员会联系您处理订金和退款。",
    lyDo: "原因（可选）", guiHuy: "申请取消", xacNhanHuy: "确定提交取消申请？",
    daHuy: "已提交取消申请，工作人员会与您联系。", khac: "查询其他编号", doiSdt: "如需更换电话号码，请致电 +84 964 073 555。",
  },
  hi: {
    tieuDe: "बुकिंग बदलें", phu: "अपना बुकिंग कोड (पुष्टि ईमेल में) और बुकिंग के समय दिया गया फ़ोन नंबर डालें।",
    ma: "बुकिंग कोड", sdt: "फ़ोन नंबर", traCuu: "खोजें", dangTai: "प्रक्रिया जारी…",
    diem: "उड़ान स्थल", goi: "पैकेज", dichVu: "अतिरिक्त सेवाएँ", tong: "कुल", stt: "उड़ान क्रमांक",
    han: "बदलाव की अंतिम समय-सीमा", khoa: "बदलाव संभव नहीं", ngay: "उड़ान तिथि", gio: "उड़ान समय", soKhach: "मेहमान",
    email: "ईमेल", don: "पिकअप (होटल / पता)", ghiChu: "टिप्पणी / अनुरोध",
    khach: "यात्री विवरण", ten: "पूरा नाम", ns: "जन्म तिथि", can: "वज़न (किग्रा)", qt: "राष्ट्रीयता",
    luu: "बदलाव सहेजें", daLuu: "सहेजा गया। हमें आपके बदलाव मिल गए:", khongDoi: "कोई बदलाव नहीं।",
    giaNote: "तारीख या मेहमानों की संख्या बदलने पर कीमत दोबारा गिनी जाती है; अतिरिक्त सेवाएँ स्टाफ़ पुष्टि करेगा।",
    huyTieuDe: "रद्द करना है?", huyPhu: "अनुरोध भेजें, स्टाफ़ जमा राशि और रिफ़ंड के लिए आपसे संपर्क करेगा।",
    lyDo: "कारण (वैकल्पिक)", guiHuy: "रद्द करने का अनुरोध", xacNhanHuy: "इस बुकिंग को रद्द करने का अनुरोध भेजें?",
    daHuy: "अनुरोध भेज दिया गया। स्टाफ़ आपसे संपर्क करेगा।", khac: "दूसरा कोड", doiSdt: "फ़ोन नंबर बदलने के लिए +84 964 073 555 पर कॉल करें।",
  },
};

const ngayVN = (d: string) => (d?.length === 10 ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : d || "—");
const tien = (v: number, cur: string) => (cur === "USD" ? `${v.toLocaleString("en-US")} USD` : `${v.toLocaleString("vi-VN")} đ`);
const o = "w-full rounded-lg border border-[#DCE7F3] bg-white px-3 py-2.5 text-[15px] text-[#1C2930] outline-none focus:border-[#0194F3] focus:ring-1 focus:ring-[#0194F3] disabled:bg-slate-50 disabled:text-slate-500";

export default function SuaBookingClient() {
  const lang = (useLangCode() || "vi") as Lang;
  const t = T[lang] ?? T.vi;
  const sp = useSearchParams();

  const [ma, setMa] = useState(sp.get("ma") || "");
  const [sdt, setSdt] = useState("");
  const [the, setThe] = useState("");
  const [bk, setBk] = useState<BookingXem | null>(null);
  const [nhap, setNhap] = useState<BookingXem | null>(null);
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState("");
  const [daLuu, setDaLuu] = useState<Array<{ truong: string; cu: string; moi: string }> | null>(null);
  const [lyDo, setLyDo] = useState("");
  const [daHuy, setDaHuy] = useState(false);

  useEffect(() => {
    const m = sp.get("ma");
    if (m) setMa(m);
  }, [sp]);

  const goi = async (method: "POST" | "PATCH" | "PUT", body: unknown) => {
    setDang(true);
    setLoi("");
    try {
      const r = await fetch("/api/booking/sua", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.message || "Lỗi");
      return j;
    } catch (e: any) {
      setLoi(e?.message || "Lỗi");
      return null;
    } finally {
      setDang(false);
    }
  };

  const nhan = (b: BookingXem) => {
    setBk(b);
    const soDong = Math.max(b.guestsCount, b.guests.length);
    const guests = Array.from({ length: soDong }, (_, i) => b.guests[i] ?? { fullName: "", dob: "", gender: "", idNumber: "", weightKg: null, nationality: "" });
    setNhap({ ...b, guests });
  };

  const traCuu = async () => {
    const j = await goi("POST", { ma, sdt });
    if (j) {
      setThe(j.the);
      nhan(j.booking);
      setDaLuu(null);
      setDaHuy(false);
    }
  };

  const luu = async () => {
    if (!nhap || !bk) return;
    const j = await goi("PATCH", {
      the,
      thayDoi: {
        dateISO: nhap.dateISO,
        timeSlot: nhap.timeSlot,
        guestsCount: nhap.guestsCount,
        contact: { email: nhap.contact.email, pickupLocation: nhap.contact.pickupLocation, specialRequest: nhap.contact.specialRequest },
        guests: nhap.guests.slice(0, nhap.guestsCount).filter((g) => g.fullName.trim() || g.dob || g.weightKg),
      },
    });
    if (j) {
      nhan(j.booking);
      setDaLuu(j.thayDoi || []);
    }
  };

  const guiHuy = async () => {
    if (!window.confirm(t.xacNhanHuy)) return;
    const j = await goi("PUT", { the, lyDo });
    if (j) {
      nhan(j.booking);
      setDaHuy(true);
    }
  };

  const minNgay = useMemo(() => {
    const d = new Date(Date.now() + 7 * 3600 * 1000 + 24 * 3600 * 1000).toISOString().slice(0, 10);
    return bk?.location === "quan_ba" && d < "2026-10-15" ? "2026-10-15" : d;
  }, [bk]);

  const khoa = !!bk?.khoa.khoa;
  const sua = (p: Partial<BookingXem>) => nhap && setNhap({ ...nhap, ...p });
  const suaKhach = (i: number, p: Partial<Khach>) => {
    if (!nhap) return;
    const g = nhap.guests.slice();
    g[i] = { ...g[i], ...p };
    setNhap({ ...nhap, guests: g });
  };

  return (
    <main className="min-h-screen bg-[#F5F7FA] px-4 pb-16 pt-28 text-[#1C2930]">
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold md:text-3xl">{t.tieuDe}</h1>

        {!bk ? (
          <section className="space-y-3 rounded-xl border border-[#DCE7F3] bg-white p-4 shadow-sm">
            <p className="text-sm text-[#5B6B7A]">{t.phu}</p>
            <label className="block text-sm font-semibold">
              {t.ma}
              <input value={ma} onChange={(e) => setMa(e.target.value.toUpperCase())} placeholder="MBL7K3Q9P" className={`${o} mt-1 font-mono tracking-widest`} autoCapitalize="characters" />
            </label>
            <label className="block text-sm font-semibold">
              {t.sdt}
              <input value={sdt} onChange={(e) => setSdt(e.target.value)} inputMode="tel" placeholder="0912 345 678" className={`${o} mt-1`} />
            </label>
            {loi ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{loi}</p> : null}
            <button type="button" disabled={dang || !ma.trim() || !sdt.trim()} onClick={traCuu} className="w-full rounded-lg bg-[#0194F3] py-3 font-bold text-white disabled:opacity-50">
              {dang ? t.dangTai : t.traCuu}
            </button>
          </section>
        ) : (
          <>
            <section className="rounded-xl border border-[#DCE7F3] bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="font-mono text-xl font-black tracking-widest text-[#0194F3]">{bk.ma}</div>
                {bk.queueNo ? <div className="text-sm font-semibold">{t.stt}: #{bk.queueNo}</div> : null}
              </div>
              <dl className="mt-2 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="text-[#5B6B7A]">{t.diem}</dt><dd className="font-semibold">{bk.locationName}</dd>
                {bk.goi ? (<><dt className="text-[#5B6B7A]">{t.goi}</dt><dd>{bk.goi}</dd></>) : null}
                {bk.dichVu.length ? (<><dt className="text-[#5B6B7A]">{t.dichVu}</dt><dd>{bk.dichVu.join(" · ")}</dd></>) : null}
                <dt className="text-[#5B6B7A]">{t.tong}</dt><dd className="font-bold">{tien(bk.gia.tong, bk.gia.tienTe)}</dd>
                {bk.han && !khoa ? (<><dt className="text-[#5B6B7A]">{t.han}</dt><dd>{bk.han.gio} {ngayVN(bk.han.ngay)}</dd></>) : null}
              </dl>
              {khoa ? <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{t.khoa}: {bk.khoa.lyDo}</p> : null}
            </section>

            {daLuu ? (
              <section className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                {daLuu.length ? (
                  <>
                    <p className="font-semibold">{t.daLuu}</p>
                    <ul className="mt-1 list-disc pl-5">
                      {daLuu.map((d, i) => (
                        <li key={i}>{d.truong === "total" ? `${t.tong}: ${tien(Number(d.cu), bk.gia.tienTe)} → ${tien(Number(d.moi), bk.gia.tienTe)}` : `${({ dateISO: t.ngay, timeSlot: t.gio, guestsCount: t.soKhach, email: t.email, pickupLocation: t.don, specialRequest: t.ghiChu, guests: t.khach } as Record<string, string>)[d.truong] ?? d.truong}: ${d.cu || "—"} → ${d.moi || "—"}`}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p>{t.khongDoi}</p>
                )}
              </section>
            ) : null}
            {daHuy ? <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">{t.daHuy}</section> : null}

            {nhap ? (
              <section className="space-y-3 rounded-xl border border-[#DCE7F3] bg-white p-4 shadow-sm">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="text-sm font-semibold">{t.ngay}
                    <input type="date" value={nhap.dateISO} min={minNgay} disabled={khoa} onChange={(e) => sua({ dateISO: e.target.value })} className={`${o} mt-1`} />
                  </label>
                  <label className="text-sm font-semibold">{t.gio}
                    <select value={nhap.timeSlot} disabled={khoa} onChange={(e) => sua({ timeSlot: e.target.value })} className={`${o} mt-1`}>
                      {Array.from({ length: 12 }, (_, i) => `${String(7 + i).padStart(2, "0")}:00`).map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-semibold">{t.soKhach}
                    <input type="number" min={1} max={30} value={nhap.guestsCount} disabled={khoa} onChange={(e) => {
                      const n = Math.max(1, Math.min(30, Number(e.target.value) || 1));
                      const g = nhap.guests.slice();
                      while (g.length < n) g.push({ fullName: "", dob: "", gender: "", idNumber: "", weightKg: null, nationality: "" });
                      setNhap({ ...nhap, guestsCount: n, guests: g });
                    }} className={`${o} mt-1`} />
                  </label>
                </div>
                <label className="block text-sm font-semibold">{t.email}
                  <input type="email" value={nhap.contact.email} disabled={khoa} onChange={(e) => sua({ contact: { ...nhap.contact, email: e.target.value } })} className={`${o} mt-1`} />
                </label>
                <label className="block text-sm font-semibold">{t.don}
                  <input value={nhap.contact.pickupLocation} disabled={khoa} onChange={(e) => sua({ contact: { ...nhap.contact, pickupLocation: e.target.value } })} className={`${o} mt-1`} />
                </label>
                <label className="block text-sm font-semibold">{t.ghiChu}
                  <textarea value={nhap.contact.specialRequest} disabled={khoa} onChange={(e) => sua({ contact: { ...nhap.contact, specialRequest: e.target.value } })} rows={3} className={`${o} mt-1`} />
                </label>
                <p className="text-xs text-[#5B6B7A]">{t.doiSdt}</p>

                <div>
                  <div className="mb-2 text-sm font-bold">{t.khach}</div>
                  <div className="space-y-2">
                    {nhap.guests.slice(0, nhap.guestsCount).map((g, i) => (
                      <div key={i} className="grid grid-cols-2 gap-2 rounded-lg bg-[#F5F7FA] p-2 sm:grid-cols-4">
                        <input value={g.fullName} disabled={khoa} placeholder={`${t.ten} ${i + 1}`} onChange={(e) => suaKhach(i, { fullName: e.target.value })} className={`${o} col-span-2`} />
                        <input type="date" value={g.dob} disabled={khoa} title={t.ns} onChange={(e) => suaKhach(i, { dob: e.target.value })} className={o} />
                        <input type="number" value={g.weightKg ?? ""} disabled={khoa} placeholder={t.can} onChange={(e) => suaKhach(i, { weightKg: e.target.value ? Number(e.target.value) : null })} className={o} />
                        <input value={g.nationality} disabled={khoa} placeholder={t.qt} onChange={(e) => suaKhach(i, { nationality: e.target.value })} className={`${o} col-span-2 sm:col-span-4`} />
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-[#5B6B7A]">{t.giaNote}</p>
                {loi ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{loi}</p> : null}
                {!khoa ? (
                  <button type="button" disabled={dang} onClick={luu} className="w-full rounded-lg bg-[#0194F3] py-3 font-bold text-white disabled:opacity-50">
                    {dang ? t.dangTai : t.luu}
                  </button>
                ) : null}
              </section>
            ) : null}

            {!khoa && !bk.yeuCauHuy ? (
              <section className="space-y-2 rounded-xl border border-red-100 bg-white p-4 shadow-sm">
                <div className="font-bold text-red-700">{t.huyTieuDe}</div>
                <p className="text-sm text-[#5B6B7A]">{t.huyPhu}</p>
                <textarea value={lyDo} onChange={(e) => setLyDo(e.target.value)} rows={2} placeholder={t.lyDo} className={o} />
                <button type="button" disabled={dang} onClick={guiHuy} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-bold text-red-700 disabled:opacity-50">
                  {t.guiHuy}
                </button>
              </section>
            ) : null}

            <button type="button" onClick={() => { setBk(null); setNhap(null); setThe(""); setDaLuu(null); setLoi(""); }} className="text-sm font-semibold text-[#0194F3] underline">
              {t.khac}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
