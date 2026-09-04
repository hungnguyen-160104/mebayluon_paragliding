// app/baocao/components/BookingCard.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { formatDateKeyVN, shiftDateKey, toDateKeyVN, todayInVN } from "@/lib/baobay/date";
import { parseQuickBooking } from "@/lib/baobay/booking-quick-parse";
import { buildTransferNote } from "@/lib/baobay/transfer-note";
import { spotName } from "@/lib/baobay/spots";
import type { BookingDTO, CollectDTO } from "@/lib/baobay/types";

import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "./client-api";
import { useBaobaySession } from "./session";
import { shareBookingImage } from "./booking-image";
import { InsuranceBox } from "./InsuranceBox";
import { insuranceState } from "@/lib/baobay/insurance";
import {
  COMMISSION_PER_GUEST,
  FLIGHT_KIND_LABEL,
  FLIGHT_KIND_SHORT,
  MOUNTAIN_CAR_PRICE,
  SERVICE_PRICE_LABEL,
  servicePriceOf,
  bookingTotal as computeBookingTotal,
  defaultFlightKind,
  flightKindsOf,
  comboDiscount,
  flightUnitPrice,
  priceNote,
  servicesAmount,
  type FlightKind,
} from "@/lib/baobay/flight-price";
import { PaymentQrButton } from "./PaymentQr";
import { Banner, Button, CollapseCard, CountInput, DoneTag, Field, MoneyInput, ServiceBox, TextArea, TextInput, useDoneFlag } from "./ui";

/**
 * Bấm "Sửa" ở banner booking hôm nay thì thẻ 📒 BOOKING MỚI (ở dưới, có thể
 * đang gập) phải mở ra và nạp đúng booking đó. Hai mảnh này là hai component
 * đứng cạnh nhau, không cha con, nên nói với nhau bằng một sự kiện của trang —
 * gọn hơn là kéo trạng thái lên tận trang rồi truyền xuống hai nhánh.
 */
const EDIT_EVENT = "baobay:edit-booking";

function requestEditBooking(b: BookingDTO) {
  window.dispatchEvent(new CustomEvent<BookingDTO>(EDIT_EVENT, { detail: b }));
}

/**
 * BOOKING đặt trước: khách chốt hôm nay nhưng bay ngày khác (qua Klook, FB,
 * Zalo…). Điều phối nhập NGAY HÔM KHÁCH ĐẶT — thời điểm nhập tự ghi lại.
 *
 * Hai mảnh dùng chung API /api/baocao/booking:
 *  - `BookingTodayBanner`: đầu trang điều phối — booking bay ĐÚNG ngày đang
 *    xem, kèm nút "✓ Hoàn thành" để ẩn sau khi bay xong.
 *  - `BookingCard`: thẻ nhập booking mới + danh sách chữ nhỏ các booking sắp tới.
 */

export const BOOKING_SOURCES = ["TẠI CHỖ", "Facebook", "TikTok", "Zalo", "Klook", "SEEK", "GYG", "KKday"];

const PICKUP_LABEL: Record<BookingDTO["pickup"], string> = {
  self: "tự đến",
  bigc: "đón BigC",
  hotel: "đón KS",
  other: "đón",
};

/** "20/08 · Klook #KLK123 · anh Tú · 2 khách · 1×cam360 · đón KS 09:30 · cọc 500k" */
function BookingSummary({
  b,
  withDate,
  dim,
  hideNote,
}: {
  b: BookingDTO;
  withDate?: boolean;
  dim?: boolean;
  /** Nơi gọi đã tự vẽ khối ghi chú vàng riêng — đừng lặp lại trong dòng tóm tắt. */
  hideNote?: boolean;
}) {
  /**
   * Ba thứ quầy phải đọc được ngay giữa một dòng dài: TÊN KHÁCH, SỐ ĐIỆN THOẠI
   * và CÒN THU. Tách khỏi chuỗi chữ xám để tô nền riêng, phần còn lại vẫn là
   * chữ nhỏ liền mạch cho gọn.
   */
  const head: string[] = [];
  if (withDate) head.push(formatDateKeyVN(b.flightDate));
  head.push([b.source, b.bookingCode && `#${b.bookingCode}`].filter(Boolean).join(" ") || "booking");

  const parts: string[] = [];
  /**
   * SỐ GỐC = đang chạy + đã huỷ bớt: đăng ký 2 huỷ 1 thì dòng vẫn ghi
   * "2 khách" — phần huỷ in ĐỎ ở cuối (khối huyBits), tiền thì đã trừ sẵn.
   */
  const cxlG = b.cancelledGuests ?? 0;
  parts.push(`${b.guestCount + cxlG} khách`);
  if (b.flycam + (b.cancelledFlycam ?? 0)) parts.push(`${b.flycam + (b.cancelledFlycam ?? 0)}×flycam`);
  if (b.video360 + (b.cancelledVideo360 ?? 0)) parts.push(`${b.video360 + (b.cancelledVideo360 ?? 0)}×cam360`);
  if (b.redFlag + (b.cancelledRedFlag ?? 0)) parts.push(`${b.redFlag + (b.cancelledRedFlag ?? 0)}×cờ đỏ`);
  if (b.sunset + (b.cancelledSunset ?? 0)) parts.push(`${b.sunset + (b.cancelledSunset ?? 0)}×hoàng hôn/săn mây`);
  if (b.mountainCar) parts.push(`${b.mountainCar}×xe núi`);
  /**
   * PPG hiện thành CỜ NỔI riêng (luật chủ 04/09 — "tìm rất khó nhìn" khi lẫn
   * trong chữ thường), không nhét vào parts nữa. M650/M850 vẫn là chữ thường.
   */
  const ppgBadge =
    b.flightKind === "ppg"
      ? `PPG ×${b.guestCount}`
      : (b.ppgGuests ?? 0) > 0
        ? `${b.guestCount - (b.ppgGuests ?? 0)}PG + ${b.ppgGuests}PPG`
        : "";
  if (!ppgBadge && b.flightKind && b.flightKind !== "pg") {
    parts.push(FLIGHT_KIND_SHORT[b.flightKind]);
  }
  if (b.flagFlight + (b.cancelledFlagFlight ?? 0))
    parts.push(`${b.flagFlight + (b.cancelledFlagFlight ?? 0)}×kéo cờ`);
  /** Khối ĐỎ "huỷ …" — đứng ngay sau danh sách dịch vụ. */
  const huyBits = [
    cxlG ? `huỷ ${cxlG} khách` : "",
    (b.cancelledFlycam ?? 0) ? `huỷ ${b.cancelledFlycam}×flycam` : "",
    (b.cancelledVideo360 ?? 0) ? `huỷ ${b.cancelledVideo360}×cam360` : "",
    (b.cancelledRedFlag ?? 0) ? `huỷ ${b.cancelledRedFlag}×cờ đỏ` : "",
    (b.cancelledSunset ?? 0) ? `huỷ ${b.cancelledSunset}×hoàng hôn` : "",
    (b.cancelledFlagFlight ?? 0) ? `huỷ ${b.cancelledFlagFlight}×kéo cờ` : "",
  ].filter(Boolean);
  parts.push(
    [b.pickup === "other" ? `đón ${b.pickupNote || "?"}` : PICKUP_LABEL[b.pickup], b.expectedTime]
      .filter(Boolean)
      .join(" "),
  );
  if (b.totalAmount) parts.push(`tổng ${Math.round(b.totalAmount / 1000).toLocaleString("vi-VN")}k`);
  /**
   * VỆT TIỀN đọc đúng như đã xảy ra: cọc bao nhiêu → đã thanh toán bao nhiêu →
   * hoàn lại bao nhiêu → còn thu bao nhiêu.
   *
   * Trước đây chỉ in mỗi "cọc {deposit}" — mà `deposit` là số ròng (cọc + đã thu
   * − đã hoàn). Khách trả một lần 3.290k rồi được hoàn 400k thì màn hình ghi
   * "cọc 2.890k": con số chưa từng xảy ra, đọc lại không ai lần ra tiền đi đâu.
   */
  const paidTotal = (b.collected ?? []).reduce((t, c) => t + (c.amount || 0), 0);
  const refunded = b.refunded ?? 0;
  /** Cọc GÕ TAY lúc nhận booking = số ròng − đã thu + đã hoàn. */
  const depositBase = Math.max(0, (b.deposit || 0) - paidTotal + refunded);
  const k = (n: number) => `${Math.round(n / 1000).toLocaleString("vi-VN")}k`;
  /**
   * MÃ GD của TỪNG LỆNH THU đã in trong chip "… đã thu 8.200k CK #0610", nên mã
   * còn lại trên booking chính là mã của KHOẢN CỌC GÕ TAY (không đi qua lệnh
   * thu nào). Có mã tức là khoản cọc ấy đi bằng chuyển khoản.
   */
  const inlineCodes = new Set(
    (b.collected ?? []).filter((c) => c.method === "transfer" && c.code).map((c) => c.code as string),
  );
  const depositCode = b.transferCode && !inlineCodes.has(b.transferCode) ? b.transferCode : "";
  /**
   * Ghi thẳng ĐƯỜNG TIỀN vào ngay số cọc:
   *    cọc 500k TM            — khách đưa tiền mặt, nằm trong phần người lập
   *                             booking đang giữ, KHÔNG phải soát sao kê
   *    cọc 500k CK #1424…     — chuyển khoản, phải dò ra trong sao kê
   *    cọc 500k               — bản ghi cũ chưa ai hỏi đường nào, không đoán bừa
   *
   * Ưu tiên `depositMethod` (quầy chọn tay), thiếu thì suy từ mã GD. Cờ cũ
   * `depositToCompany` KHÔNG dùng nữa: nó bật cho mọi khoản cọc nên nói sai với
   * 29/93 booking.
   */
  const depositWay =
    b.depositMethod === "cash" ? " TM" : b.depositMethod === "transfer" || depositCode ? ` CK${depositCode ? ` #${depositCode}` : ""}` : "";
  if (depositBase) parts.push(`cọc ${k(depositBase)}${depositWay}`);
  else if (paidTotal || refunded) parts.push("cọc 0");
  // Đại lý thu hộ: chip đậm xanh riêng (khối JSX bên dưới) — không nằm trong chuỗi xám
  /** "còn thu" tách khỏi chuỗi để tô ĐỎ — đây là số quầy phải nhớ thu trước khi bay. */
  const tail: string[] = [];
  /** Mã cọc còn sót khi KHÔNG còn phần cọc gõ tay (đã thu hết qua lệnh thu). */
  if (depositCode && !depositBase) tail.push(`GD cọc #${depositCode}`);
  if (b.note) tail.push(b.note);

  return (
    <span className={dim ? "text-xs leading-snug text-slate-500" : "text-sm leading-snug text-slate-700"}>
      {/* SỐ THỨ TỰ trong ngày — đỏ đậm, đứng đầu, KHÔNG đổi kể cả đã bay/huỷ */}
      {b.daySeq > 0 && (
        <strong className="mr-1 rounded bg-red-600 px-1.5 font-bold text-white">{b.daySeq}</strong>
      )}
      {/* Đã khoá: ai mở dòng ra cũng thấy ngay, khỏi bấm rồi mới biết bị chặn */}
      {b.locked && (
        <strong
          className="mr-1 rounded bg-slate-800 px-1.5 font-bold text-white"
          title={`Kế toán đã khoá${b.lockedBy ? ` (${b.lockedBy})` : ""} — không sửa được`}
        >
          🔒
        </strong>
      )}
      {head.filter(Boolean).join(" · ")}
      {b.contactName ? (
        <>
          {" · "}
          <strong className="rounded bg-sky-100 px-1 font-bold text-sky-900">{b.contactName}</strong>
        </>
      ) : null}
      {b.phone ? (
        <>
          {" · "}
          <strong className="rounded bg-amber-100 px-1 font-bold tabular-nums text-amber-900">📞 {b.phone}</strong>
        </>
      ) : null}
      {ppgBadge ? (
        <>
          {" · "}
          <strong className="rounded bg-indigo-600 px-1.5 font-bold text-white" title="Đoàn có khách bay PPG (dù động cơ)">
            🪂 {ppgBadge}
          </strong>
        </>
      ) : null}
      {/* GIỜ XUẤT VÉ = giờ khách có mặt (luật chủ 04/09) — soát lại ai đến lúc nào */}
      {b.ticketIssued && b.ticketIssuedAt ? (
        <>
          {" · "}
          <span className="whitespace-nowrap text-slate-600">
            🎫 xuất vé{" "}
            <strong className="tabular-nums">
              {new Date(b.ticketIssuedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })}
            </strong>
          </span>
        </>
      ) : null}
      {" · "}
      {parts.filter(Boolean).join(" · ")}
      {huyBits.length > 0 && (
        <>
          {" · "}
          <strong className="rounded bg-rose-100 px-1 font-bold text-rose-700">{huyBits.join(" · ")}</strong>
        </>
      )}
      {/* LỆCH SỔ: các lệnh thu cộng lại nhiều hơn số booking đang ghi "đã trả"
          — dấu hiệu thu nhầm sang booking khác rồi sửa tay ô cọc (ca #16/#17
          ngày 21/08). Phải kêu lên, không thì tiền treo lơ lửng không ai biết.
          TRỪ phần đã nối theo khách tách-dời (movedPaidOut): mã CK vẫn ở đây
          nhưng "của ai" đã đi theo người — hai booking bản chất là MỘT đoàn,
          không phải lệch (ca Nhã Uyên/Thành Gia 02-03/09). */}
      {paidTotal > (b.deposit ?? 0) + refunded + (b.movedPaidOut ?? 0) && (
        <>
          {" · "}
          <strong
            className="rounded bg-rose-600 px-1 font-bold text-white"
            title="Tổng các lệnh thu đang lớn hơn số tiền booking ghi nhận — mở 'Sửa khoản đã thu' để soát, có thể có khoản thu nhầm của khách khác"
          >
            ⚠ LỆCH SỔ: lệnh thu {k(paidTotal)} ≠ booking ghi {k(b.deposit ?? 0)}
          </strong>
        </>
      )}
      {/* Đoàn tách-dời đã trả đủ: nói thẳng cho quầy — không phải lỗi gì cả */}
      {(b.movedPaidOut ?? 0) > 0 && (
        <>
          {" · "}
          <strong
            className="rounded bg-emerald-100 px-1 font-bold text-emerald-800"
            title="Lệnh thu/mã CK của cả đoàn nằm ở booking này; phần tiền của khách dời đã nối sang booking ngày mới — hai booking là một đoàn"
          >
            ✓ đã thanh toán đủ {k((b.deposit ?? 0) + (b.movedPaidOut ?? 0))} — {k(b.movedPaidOut ?? 0)} theo khách dời
          </strong>
        </>
      )}
      {/* LỆCH TIỀN: khách trả nhiều hơn tổng — hầu như luôn do sửa/bỏ lệnh dịch
          vụ sau khi đã thu. Kêu to ngay trên dòng để kế toán bù/hoàn. */}
      {(b.overpaid ?? 0) > 0 && (
        <>
          {" · "}
          <strong
            className="rounded bg-rose-600 px-1 font-bold text-white"
            title="Khách đã trả nhiều hơn tổng phải trả — kiểm lại lệnh thêm/bớt dịch vụ, bù hoặc hoàn cho khách"
          >
            ⚠ THU THỪA {k(b.overpaid ?? 0)} — kế toán xử lý
          </strong>
        </>
      )}
      {/* ĐẠI LÝ THU HỘ — chip đậm xanh mang TÊN đại lý: tiền của chuyến đang nằm
          bên đại lý, cuối kỳ phải đòi về. "ĐL thu" chung chung thì không biết đòi ai. */}
      {(b.agencyPaidAmount ?? 0) > 0 ? (
        <>
          {" · "}
          <strong
            className="rounded bg-emerald-100 px-1 font-bold uppercase text-emerald-800"
            title={`Khách đã trả ${(b.agencyPaidAmount ?? 0).toLocaleString("vi-VN")} đ bên đại lý${b.agencyName ? ` ${b.agencyName}` : ""} — đại lý đang giữ hộ, công ty phải đòi về`}
          >
            {/* Thiếu ô tên đại lý thì lấy NGUỒN ĐẶT: khách đặt qua đại lý nào
                thì nguồn chính là đại lý đó (BLUEHOME, KHANGDUNG…) */}
            {(b.agencyName || b.source || "Đại lý").toUpperCase()} thu {k(b.agencyPaidAmount ?? 0)}
          </strong>
        </>
      ) : null}
      {paidTotal > 0 ? (
        <>
          {/*
            MỘT CHIP CHO MỖI NGƯỜI THU, LIỆT KÊ ĐỦ TỪNG KHOẢN:
                Ms Duyên đã thu 8.200k CK + 900k TM · Ms Thuỷ đã thu 500k TM

            KHÔNG cộng gộp các khoản thành một số ("9.100k CK (2 lần)"): kế toán
            phải đối được TỪNG con số với sao kê, thấy số tổng thì không soát nổi.
            KHÔNG gộp tên người thu: ai thao tác thu khoản nào phải đứng tên
            khoản đó, có chuyện còn biết hỏi ai.
          */}
          {(() => {
            const list = b.collected ?? [];
            /** Giữ nguyên thứ tự thu; mỗi người một chip, trong chip liệt kê từng khoản. */
            const order: string[] = [];
            const byPerson = new Map<string, typeof list>();
            for (const c of list) {
              const who = c.byName || "";
              if (!byPerson.has(who)) {
                byPerson.set(who, []);
                order.push(who);
              }
              byPerson.get(who)!.push(c);
            }
            return order.map((who) => {
              const mine = byPerson.get(who)!;
              return (
                <span key={who}>
                  {" · "}
                  <strong
                    className="rounded bg-emerald-100 px-1 font-bold text-emerald-800"
                    title={mine
                      .map((c) => `${k(c.amount)} ${c.method === "cash" ? "TM" : "CK"}${c.code ? ` #${c.code}` : ""}`)
                      .join(" · ")}
                  >
                    {/*
                      Khoản CHUYỂN KHOẢN luôn kèm MÃ GD ngay sau số tiền — không
                      có mã thì nhìn dòng này chẳng đối được với sao kê, mà đối
                      soát mới là việc chính của con số ấy. Khoản chưa ai ghi mã
                      thì nói thẳng "chưa có mã" để biết đường đi hỏi.
                      Tiền mặt không có mã GD nên không gắn gì.
                    */}
                    {who ? `${who} ` : ""}đã thu{" "}
                    {mine.map((c, i) => (
                      <span key={i}>
                        {i > 0 ? " + " : ""}
                        {c.method === "cash"
                          ? `${k(c.amount)} TM`
                          : `${k(c.amount)} CK ${c.code ? `#${c.code}` : "(chưa có mã)"}`}
                        {/*
                          TÍCH XANH NGAY SAU TỪNG KHOẢN: kế toán bấm "Đã nhận"
                          cho mã nào thì mã đó có tích — nhìn dòng là biết mã CK
                          nào đã đối chiếu với sao kê, mã nào còn phải soát.
                          Tích chung cho cả booking không nói được điều đó.
                        */}
                        {c.verified ? (
                          <span className="ml-0.5 text-emerald-700" title="Kế toán đã soát sao kê và nhận khoản này">
                            ✓
                          </span>
                        ) : null}
                      </span>
                    ))}
                  </strong>
                </span>
              );
            });
          })()}
          {/* TÍCH XANH ĐẬM của kế toán: đã "Đã nhận" đủ khoản CK / khoản TM của booking */}
          {b.ckChecked && (
            /* Xanh DƯƠNG cùng tông với "Đã soát đủ": cả hai đều là dấu của kế
               toán soát sao kê, khác với tích xanh lá "đã thu tiền" của quầy. */
            <strong className="ml-0.5 rounded bg-sky-500 px-1 font-bold text-white" title="Kế toán đã nhận đủ các khoản CHUYỂN KHOẢN">
              ✓CK
            </strong>
          )}
          {b.tmChecked && (
            <strong className="ml-0.5 rounded bg-emerald-700 px-1 font-bold text-white" title="Kế toán đã nhận đủ các khoản TIỀN MẶT">
              ✓TM
            </strong>
          )}
          {/*
            ĐÃ SOÁT ĐỦ — mọi lệnh thu của booking này đã soát xong.
            TIỀN MẶT tính là soát xong NGAY: tiền trao tay tại bãi, không có
            sao kê nào để đối chiếu, người thu đã đứng tên trong sổ. Chỉ khoản
            CHUYỂN KHOẢN mới phải dò sao kê, nên booking toàn tiền mặt là xanh
            luôn, còn có CK thì đợi kế toán bấm "Đã nhận" đủ các khoản CK.
          */}
          {(() => {
            const txs = (b.collected ?? []).filter((c) => c.method === "transfer");
            /**
             * Cọc TIỀN MẶT không phải soát sao kê — tiền trao tay, đã nằm trong
             * phần người lập booking đang giữ. Chỉ cọc CHUYỂN KHOẢN mới bắt đợi
             * kế toán bấm "Đã nhận". Bản ghi cũ chưa ghi đường tiền và cũng
             * không có mã GD thì coi như không có khoản CK nào phải soát — thà
             * xanh sớm còn hơn treo vĩnh viễn 16 booking không ai gỡ được.
             */
            const cocLaCK = depositBase > 0 && (b.depositMethod === "transfer" || Boolean(depositCode));
            const coCK = txs.length > 0 || cocLaCK;
            /**
             * "ĐỦ" nghĩa là đủ thật: booking còn "còn thu" thì mới trả một
             * phần — dù các khoản ĐÃ chuyển đều soát xong cũng chưa được gọi
             * là soát đủ, không thì kế toán nhìn tích mà bỏ qua phần chưa thu.
             */
            const conThu = (b.remaining ?? 0) > 0;
            const soatDu = !conThu && (coCK ? Boolean(b.ckChecked) : true);
            if (!soatDu) return null;
            return (
              <strong
                className="ml-0.5 rounded bg-sky-500 px-1 font-bold text-white"
                title={
                  coCK
                    ? "Mọi khoản chuyển khoản của booking này kế toán đã soát và nhận đủ"
                    : "Booking chỉ thu tiền mặt — tiền trao tay tại bãi, không cần đối soát sao kê"
                }
              >
                ✓ Đã soát đủ
              </strong>
            );
          })()}
        </>
      ) : null}
      {refunded > 0 ? (
        <>
          {" · "}
          <strong className="rounded bg-amber-100 px-1 font-bold text-amber-900">đã hoàn {k(refunded)}</strong>
        </>
      ) : null}
      {b.remaining ? (
        <>
          {" · "}
          <strong className="rounded bg-rose-100 px-1 font-bold text-rose-700">
            còn thu {Math.round(b.remaining / 1000).toLocaleString("vi-VN")}k
          </strong>
        </>
      ) : null}
      {/* BAY KHÔNG VÉ — chữ vàng ngay trên dòng: kế toán soát vé giấy phải thấy
          từ xa, không phải mở từng booking ra dò. */}
      {b.noTicketFlight ? (
        <>
          {" · "}
          <strong
            className="rounded bg-amber-400 px-1 font-bold text-amber-950"
            title={b.noTicketReason ? `Lý do: ${b.noTicketReason}` : "Chuyến có thật nhưng không xé vé"}
          >
            🎫✕ không vé
          </strong>
        </>
      ) : null}
      {/**
       * CÓ THAY ĐỔI CHƯA BÁO KHÁCH.
       *
       * App không tự gửi thư, nên phải có chỗ nhắc — không thì nhân viên sửa
       * xong đóng máy, khách vẫn ra theo giờ cũ. Nút gửi nằm trong "⋯ Thêm".
       *
       * Gửi HỎNG cũng vào đây (dấu chờ báo giữ nguyên khi gửi hỏng), nhưng in
       * đỏ đậm: người ta đã bấm gửi và tưởng xong rồi.
       */}
      {(b.pendingNotify?.length ?? 0) > 0 ? (
        <>
          {" · "}
          <strong
            className={
              "rounded px-1 font-bold " +
              (b.lastNotify?.includes("GỬI HỎNG") ? "bg-rose-600 text-white" : "bg-amber-400 text-amber-950")
            }
            title={
              (b.lastNotify?.includes("GỬI HỎNG") ? `${b.lastNotify}\n\n` : "") +
              `Chưa báo khách:\n${(b.pendingNotify ?? []).join("\n")}\n\nBấm "⋯ Thêm" → "Gửi mail báo khách"`
            }
          >
            ✉ chưa báo khách ({b.pendingNotify!.length})
          </strong>
        </>
      ) : null}
      {/* CHIẾT KHẤU ĐẠI LÝ — khoản trả ngoài, kế toán cần thấy để trừ sổ người chi */}
      {(b.commission?.amount ?? 0) > 0 ? (
        <>
          {" · "}
          <strong
            className="rounded bg-violet-100 px-1 font-bold text-violet-800"
            title={`Chiết khấu đại lý${b.commission!.agencyName ? ` ${b.commission!.agencyName}` : ""} — ${COMMISSION_WAY_TITLE[b.commission!.method] ?? "trả tiền mặt"}${b.commission!.byName ? ` bởi ${b.commission!.byName}` : ""}`}
          >
            CKĐL {k(b.commission!.amount)} {COMMISSION_WAY_CHIP[b.commission!.method] ?? "TM"}
          </strong>
        </>
      ) : null}
      {tail.length ? ` · ${tail.join(" · ")}` : ""}
      {/* Ghi chú gọi khách hiện ngay trong dòng tóm tắt — chỗ nào có booking là thấy */}
      {b.contactNote && !hideNote ? (
        <span className="ml-1 rounded bg-amber-100 px-1 font-medium text-amber-900">📝 {b.contactNote}</span>
      ) : null}
      {/* Vệt thu tiền từng khoản ĐÃ BỎ: nó lặp y nguyên chip tổng ngay trên
          ("đã tt 5.380k by Ms Duyên" rồi lại "đã thu 5.380k TM - Ms Duyên").
          Chia nhiều lần thu thì chip tổng ghi "(N lần)" và rê chuột ra đủ từng
          khoản kèm mã GD — đủ dùng mà không rác mắt. */}
    </span>
  );
}

/** "HH:MM" hiện tại theo giờ Việt Nam — giờ dự kiến hôm nay không được sớm hơn. */
function nowHHMMVN(): string {
  return new Date().toLocaleTimeString("en-GB", { hour12: false, timeZone: "Asia/Ho_Chi_Minh" }).slice(0, 5);
}

/** Giờ nhập booking, hiện d/m + giờ VN — "13/08 20:15". */
function stampVN(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });
}

/** Người được giao lịch — badge tím hiện ở mọi nơi booking xuất hiện. */
function AssignedBadge({ b }: { b: BookingDTO }) {
  if (!b.assignedToName) return null;
  return (
    <span
      className="ml-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-800"
      title={b.assignedBy ? `Người giao: ${b.assignedBy}` : undefined}
    >
      → giao cho {b.assignedToName}
      {b.assignedBy ? ` by ${b.assignedBy}` : ""}
    </span>
  );
}

/**
 * Nút "⇢ Chuyển": xổ danh sách nhân sự ĐANG LÀM VIỆC tại điểm, chọn một người
 * rồi bấm chuyển — booking hiện lên trang của người đó (đón khách, tiếp khách,
 * có SĐT để gọi).
 */
function AssignControl({
  spot,
  booking,
  onDone,
  buttonClassName,
  label,
}: {
  spot: string;
  booking: BookingDTO;
  onDone: () => void;
  /** Xếp nút vào đúng ô của lưới nút (vd. cột phải, dưới nút Sửa). */
  buttonClassName?: string;
  /** Chữ trên nút khi chưa mở — menu gọn dùng "Giao PC". */
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [staff, setStaff] = useState<Array<{ username: string; name: string; roleLabel: string }>>([]);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openList() {
    setOpen(true);
    setError(null);
    if (staff.length) return;
    try {
      // Danh sách TẤT CẢ nhân sự đang làm tại điểm (phi công, camera man, kế toán…)
      const r = await apiGet<{ staff: Array<{ username: string; name: string; roleLabel: string }> }>(
        `/api/baocao/booking?date=${todayInVN()}&spot=${spot}`,
      );
      setStaff(r.staff ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không tải được danh sách nhân sự");
    }
  }

  async function send() {
    if (!pick) return;
    setBusy(true);
    setError(null);
    try {
      await apiPatch(`/api/baocao/booking?spot=${spot}`, { id: booking.id, action: "assign", assignee: pick });
      setOpen(false);
      setPick("");
      onDone();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không chuyển được");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={openList}
        className={
          "h-7 rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium text-slate-600 hover:border-indigo-500 hover:text-indigo-700" +
          (buttonClassName ? ` ${buttonClassName}` : "")
        }
      >
        {label ? `⇢ ${label}` : booking.assignedToName ? "⇢ Chuyển người khác" : "⇢ Chuyển"}
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={pick}
        onChange={(e) => setPick(e.target.value)}
        className="h-9 min-w-44 flex-1 rounded-lg border border-indigo-300 bg-white px-2 text-sm"
      >
        <option value="">— người tiếp nhận —</option>
        {staff.map((a) => (
          <option key={a.username} value={a.username}>
            {a.name} — {a.roleLabel}
          </option>
        ))}
      </select>
      <Button type="button" className="h-9 px-3 text-xs" disabled={busy || !pick} onClick={send}>
        {busy ? "Đang chuyển…" : "✓ Chuyển"}
      </Button>
      <Button type="button" variant="ghost" className="h-9 bg-white px-3 text-xs" onClick={() => setOpen(false)}>
        Thôi
      </Button>
      {error && <span className="w-full text-xs text-rose-600">{error}</span>}
    </div>
  );
}


/**
 * SỬA CÁC KHOẢN ĐÃ THU của một booking — gõ nhầm số, nhầm TM/CK, nhầm mã.
 *
 * Chỉ điều phối / quầy vé / kế toán bấm được (máy chủ chốt lại quyền). Sửa xong
 * "đã cọc / còn thu" của booking dựng lại từ chính các khoản thu, nên sửa mấy
 * lần sổ vẫn khớp.
 */
function EditCollectsControl({
  spot,
  booking,
  onDone,
}: {
  spot: string;
  booking: BookingDTO;
  onDone: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<CollectDTO[]>([]);
  const [draft, setDraft] = useState<Record<string, { amount: number; method: "cash" | "transfer"; code: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const r = await apiGet<{ collects: CollectDTO[] }>(
        `/api/baocao/booking/collect?spot=${spot}&booking=${booking.id}`,
      );
      setRows(r.collects);
      setDraft(
        Object.fromEntries(
          r.collects.map((c) => [c.id, { amount: c.amount, method: c.method, code: c.transferCode || "" }]),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đọc được danh sách khoản thu");
    }
  }

  async function save(c: CollectDTO, remove = false) {
    const d = draft[c.id];
    if (remove && !window.confirm(`Xoá khoản thu ${c.amount.toLocaleString("vi-VN")} đ khỏi booking này?`)) return;
    setBusy(c.id);
    setError(null);
    try {
      await apiPatch(`/api/baocao/booking/collect?spot=${spot}`, {
        id: c.id,
        ...(remove ? { remove: true } : { amount: d.amount, method: d.method, transferCode: d.code }),
      });
      onDone(remove ? "✓ Đã xoá khoản thu — số còn thu tính lại." : "✓ Đã sửa khoản thu — số còn thu tính lại.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không sửa được khoản thu");
    } finally {
      setBusy(null);
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        className="h-7 shrink-0 border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700"
        onClick={() => {
          setOpen(true);
          setError(null);
          void load();
        }}
        title="Sửa lại khoản đã thu nếu nhập nhầm"
      >
        ✎ Sửa tiền đã thu
      </Button>
    );
  }

  return (
    <div className="w-full max-w-[19rem] rounded-lg border border-emerald-300 bg-emerald-50/60 p-1.5">
      <div className="mb-1 text-[11px] font-bold text-emerald-900">
        Khoản đã thu — {booking.contactName || "khách"}
      </div>
      {rows.length === 0 && <div className="text-[11px] text-slate-500">Chưa có khoản thu nào qua nút Thu tiền.</div>}
      <ul className="space-y-1.5">
        {rows.map((c) => {
          const d = draft[c.id] ?? { amount: c.amount, method: c.method, code: c.transferCode || "" };
          return (
            <li key={c.id} className="rounded-lg bg-white p-1.5">
              <div className="mb-1 text-[10px] text-slate-500">
                {c.collectorName || c.createdByName} · {formatDateKeyVN(c.date)}
              </div>
              <MoneyInput value={d.amount} onChange={(v) => setDraft((p) => ({ ...p, [c.id]: { ...d, amount: v } }))} />
              <div className="mt-1 flex h-7 overflow-hidden rounded-lg border border-slate-300">
                {(
                  [
                    ["cash", "TM"],
                    ["transfer", "CK"],
                  ] as Array<["cash" | "transfer", string]>
                ).map(([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, [c.id]: { ...d, method: m } }))}
                    className={
                      d.method === m
                        ? "flex-1 bg-emerald-600 text-[11px] font-bold text-white"
                        : "flex-1 bg-white text-[11px] font-medium text-slate-500"
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              {d.method === "transfer" && (
                <TextInput
                  value={d.code}
                  onChange={(e) => setDraft((p) => ({ ...p, [c.id]: { ...d, code: e.target.value } }))}
                  placeholder="Mã giao dịch…"
                  className="mt-1 h-7 rounded-lg text-xs"
                />
              )}
              <div className="mt-1 flex gap-1">
                <Button
                  type="button"
                  className="h-7 flex-1 bg-emerald-600 px-2 text-[11px] hover:bg-emerald-700"
                  disabled={busy === c.id}
                  onClick={() => save(c)}
                >
                  ✓ Lưu sửa
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-7 bg-white px-2 text-[11px] text-rose-700"
                  disabled={busy === c.id}
                  onClick={() => save(c, true)}
                >
                  🗑 Xoá
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      {error && <div className="mt-1 text-[11px] font-semibold text-rose-700">{error}</div>}
      <Button
        type="button"
        variant="ghost"
        className="mt-1 h-7 w-full bg-white px-2 text-[11px]"
        onClick={() => setOpen(false)}
      >
        Đóng
      </Button>
    </div>
  );
}

/**
 * BỎ BOOKING khỏi sổ: nhập nhầm hoặc nhập TRÙNG với một booking thật.
 *
 * Không xoá bản ghi — bỏ có lý do, có tên người bỏ, và lấy lại được. Trùng thì
 * bắt chọn đích danh bản GIỮ LẠI: máy chuyển tiền đã thu sang bản đó, nên không
 * ai bỏ booking để giấu tiền được (tiền chỉ đổi chỗ, tổng không đổi).
 */
function VoidBookingControl({
  spot,
  booking,
  onDone,
}: {
  spot: string;
  booking: BookingDTO;
  onDone: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paid = booking.deposit > 0 || (booking.collected ?? []).length > 0;

  async function send() {
    if (!reason.trim()) return setError("Ghi giúp lý do — sổ cần biết vì sao bỏ");
    setBusy(true);
    setError(null);
    try {
      await apiDelete(`/api/baocao/booking?spot=${spot}`, { id: booking.id, reason });
      onDone("✓ Đã bỏ booking khỏi sổ (nhập nhầm) — không cộng vào số của ngày, vẫn lấy lại được.");
      setOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không bỏ được booking");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        className="h-7 shrink-0 border-slate-300 bg-white px-2 text-xs font-semibold text-slate-600"
        onClick={() => {
          setReason("");
          setError(null);
          setOpen(true);
        }}
        title="Nhập nhầm — bỏ khỏi sổ, không cộng vào số của ngày, vẫn lấy lại được"
      >
        🗑 Nhập nhầm
      </Button>
    );
  }

  return (
    <div className="flex w-full max-w-[17rem] flex-col gap-1 rounded-lg border border-slate-300 bg-slate-50 p-1.5">
      <div className="text-[11px] font-bold text-slate-800">Nhập nhầm — {booking.contactName || "khách"}</div>
      {/**
       * KHÔNG còn "gộp booking trùng". Gộp phải dời tiền ngầm giữa hai booking rồi
       * tính lại "còn thu" — đã làm sai số tiền thu thật (cặp trùng SĐT ngày 16/08).
       * Có tiền rồi thì sửa tiền trước, xong mới bỏ booking.
       */}
      {paid ? (
        <p className="text-[10px] font-semibold leading-tight text-rose-700">
          Booking này đã có tiền — mở ⋯ Thêm → “Sửa tiền đã thu” để xoá hoặc chuyển khoản thu sang booking đúng, rồi
          mới bỏ được. Khách bỏ bay thì dùng ✕ Huỷ booking.
        </p>
      ) : (
        <p className="text-[10px] leading-tight text-slate-500">
          Bỏ khỏi sổ: booking này không được cộng vào số khách, dịch vụ hay tiền của ngày. Vẫn lấy lại được.
        </p>
      )}

      <TextInput
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Lý do · VD: gõ hai lần, khách gọi lại đặt mới…"
        className="h-8 rounded-lg text-xs"
      />
      {error && <div className="text-[11px] font-semibold text-rose-700">{error}</div>}
      <div className="flex gap-1">
        <Button
          type="button"
          className="h-8 flex-1 bg-slate-800 px-2 text-xs hover:bg-slate-900"
          disabled={busy || paid}
          onClick={send}
        >
          {busy ? "Đang bỏ…" : "✓ Bỏ khỏi sổ"}
        </Button>
        <Button type="button" variant="ghost" className="h-8 bg-white px-2 text-xs" onClick={() => setOpen(false)}>
          Thôi
        </Button>
      </div>
    </div>
  );
}


/**
 * BAY KHÔNG VÉ — chuyến có thật nhưng không xé vé giấy.
 *
 * Bắt ghi lý do rồi mới đánh dấu được: bay không vé mà không ai giải thích thì
 * đúng là chỗ tiền chảy ra ngoài. Ở Khau Phạ, dấu này cũng là đường duy nhất để
 * tích "đã bay" khi quầy không xuất vé.
 */
/**
 * GỬI MAIL BÁO KHÁCH những thay đổi chưa báo.
 *
 * Cố ý là NÚT BẤM chứ không tự động: người vừa sửa mới biết thay đổi này đã
 * chốt với khách hay còn đang trao đổi dở. Sửa tới sửa lui ba lượt rồi mới ngã
 * ngũ là chuyện thường — tự gửi mỗi lượt một thư thì khách nhận ba thư đá nhau.
 *
 * Bấm lần đầu thì XEM TRƯỚC đúng những dòng khách sẽ đọc, rồi mới gửi thật.
 */
function NotifyGuestControl({
  spot,
  booking,
  onDone,
}: {
  spot: string;
  booking: BookingDTO;
  onDone: (message?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = booking.pendingNotify ?? [];

  async function send() {
    setBusy(true);
    setError(null);
    try {
      await apiPatch(`/api/baocao/booking?spot=${spot}`, { id: booking.id, action: "notify-guest" });
      onDone(`✓ Đã gửi thư báo khách tới ${booking.email}.`);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không gửi được thư");
    } finally {
      setBusy(false);
    }
  }

  // Không có gì chưa báo thì không bày nút — menu đã dài sẵn
  if (pending.length === 0) return null;

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        className="h-7 shrink-0 border-amber-400 bg-amber-50 px-2 text-xs font-semibold text-amber-900"
        onClick={() => setOpen(true)}
        title={`Chưa báo khách:\n${pending.join("\n")}`}
      >
        ✉ Gửi mail báo khách ({pending.length})
      </Button>
    );
  }

  return (
    <div className="w-full rounded-lg border border-amber-300 bg-amber-50 p-2">
      <p className="text-xs font-bold text-amber-900">Thư sẽ báo khách những thay đổi này:</p>
      <ul className="mt-1 list-disc pl-4 text-[11px] leading-snug text-amber-950">
        {pending.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ul>
      <p className="mt-1 text-[11px] text-amber-800">
        Gửi tới: <strong>{booking.email || "chưa có email"}</strong>
        {booking.email ? "" : " — sửa booking để điền email trước"}
      </p>
      {error && <p className="mt-1 text-[11px] font-bold text-rose-700">{error}</p>}
      <div className="mt-2 flex gap-1">
        <Button
          type="button"
          disabled={busy || !booking.email}
          onClick={send}
          className="h-7 bg-amber-600 px-2 text-xs font-bold text-white hover:bg-amber-700"
        >
          {busy ? "Đang gửi…" : "Gửi ngay"}
        </Button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-7 px-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          Thôi
        </button>
      </div>
    </div>
  );
}

function NoTicketControl({
  spot,
  booking,
  onDone,
}: {
  spot: string;
  booking: BookingDTO;
  onDone: (message?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(booking.noTicketReason ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(on: boolean) {
    if (on && !reason.trim()) return setError("Ghi giúp lý do bay không vé");
    setBusy(true);
    setError(null);
    try {
      await apiPatch(`/api/baocao/booking?spot=${spot}`, { id: booking.id, action: "noticket", on, reason });
      onDone(on ? "✓ Đã đánh dấu bay không vé." : "✓ Đã bỏ dấu bay không vé.");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đánh dấu được");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        className={
          "h-7 shrink-0 px-2 text-xs font-semibold " +
          (booking.noTicketFlight ? "border-orange-400 bg-orange-100 text-orange-900" : "bg-white text-slate-700")
        }
        onClick={() => {
          setReason(booking.noTicketReason ?? "");
          setError(null);
          setOpen(true);
        }}
        title={
          booking.noTicketFlight
            ? `Bay không vé — ${booking.noTicketReason} (${booking.noTicketBy})`
            : "Chuyến bay thật nhưng không xé vé — ghi lý do"
        }
      >
        {booking.noTicketFlight ? "🎫✕ Bay không vé ✓" : "🎫✕ Bay không vé"}
      </Button>
    );
  }

  return (
    <div className="w-full max-w-[17rem] rounded-lg border border-orange-300 bg-orange-50 p-1.5">
      <div className="text-[11px] font-bold text-orange-900">Bay không vé — {booking.contactName || "khách"}</div>
      <TextInput
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Lý do · khách ngoại giao, bay bù, quầy hết vé…"
        className="mt-1 h-8 rounded-lg text-xs"
      />
      {error && <div className="mt-1 text-[11px] font-semibold text-rose-700">{error}</div>}
      <div className="mt-1 flex gap-1">
        <Button
          type="button"
          className="h-8 flex-1 bg-orange-600 px-2 text-xs hover:bg-orange-700"
          disabled={busy}
          onClick={() => save(true)}
        >
          ✓ Đánh dấu
        </Button>
        {booking.noTicketFlight && (
          <Button
            type="button"
            variant="ghost"
            className="h-8 bg-white px-2 text-xs text-rose-700"
            disabled={busy}
            onClick={() => save(false)}
          >
            Bỏ dấu
          </Button>
        )}
        <Button type="button" variant="ghost" className="h-8 bg-white px-2 text-xs" onClick={() => setOpen(false)}>
          Thôi
        </Button>
      </div>
    </div>
  );
}

/**
 * TỜ GIẤY NHỚ + nút "Đã liên hệ" cho một booking.
 *
 * Khách đặt qua web/OTA chỉ có mấy dòng máy gửi về. Điều phối phải gọi xác
 * nhận, hẹn giờ, có khi đổi luôn lịch — những gì nói qua điện thoại mà không
 * ghi lại thì hôm sau chẳng ai biết đã hẹn khách mấy giờ. Nên ghi chú hiện
 * NGAY TRÊN DÒNG, màu vàng như tờ giấy dán, không phải bấm vào mới thấy.
 */
function ContactNote({
  spot,
  booking,
  onDone,
}: {
  spot: string;
  booking: BookingDTO;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(booking.contactNote ?? "");
  const [busy, setBusy] = useState(false);

  /** Khách tự đặt trên web/OTA thì BẮT BUỘC gọi xác nhận — nhắc bằng màu. */
  const fromOnline = /web|klook|gyg|getyourguide|kkday|seek|viator|trip/i.test(booking.source || "");
  const needCall = fromOnline && !booking.contactedAt && booking.status === "open";

  async function save(contacted?: boolean) {
    setBusy(true);
    try {
      await apiPatch(`/api/baocao/booking?spot=${spot}`, {
        id: booking.id,
        action: "contact",
        contactNote: text,
        ...(contacted === undefined ? {} : { contacted }),
      });
      setOpen(false);
      onDone();
    } finally {
      setBusy(false);
    }
  }

  /**
   * Chỉ có NÚT ở đây; nội dung ghi chú do dòng booking tự hiện (khối vàng dưới
   * phần chữ, hoặc nhãn trong dòng tóm tắt). Trước đây vẽ cả hai nên cùng một
   * câu hiện hai lần trên một dòng.
   */
  return (
    <>
      {open && (
        <div className="mt-1 rounded-lg border border-amber-400 bg-amber-50 p-1.5">
          <TextArea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Gọi khách xong ghi lại · VD: đã hẹn 8h30, khách xin đón tại Bluehome, đi 3 người"
            className="min-h-16 text-xs"
          />
          <div className="mt-1 flex gap-1">
            <Button
              type="button"
              className="h-8 flex-1 bg-amber-600 px-2 text-xs hover:bg-amber-700"
              disabled={busy}
              onClick={() => save(true)}
            >
              ✓ Lưu & đánh dấu đã liên hệ
            </Button>
            <Button type="button" variant="ghost" className="h-8 bg-white px-2 text-xs" disabled={busy} onClick={() => save()}>
              Chỉ lưu
            </Button>
            <Button type="button" variant="ghost" className="h-8 bg-white px-2 text-xs" onClick={() => setOpen(false)}>
              Thôi
            </Button>
          </div>
        </div>
      )}

      {!open && (
        <Button
          type="button"
          variant="ghost"
          className={
            "h-7 shrink-0 px-2 text-xs font-semibold " +
            (booking.contactedAt
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : needCall
                ? "border-amber-400 bg-amber-100 text-amber-900"
                : "bg-white text-slate-600")
          }
          disabled={busy}
          onClick={() => {
            setText(booking.contactNote ?? "");
            setOpen(true);
          }}
          title={
            booking.contactedAt
              ? `${booking.contactedBy} đã gọi xác nhận — bấm để ghi thêm`
              : "Gọi xác nhận khách rồi ghi lại đã hẹn gì"
          }
        >
          {booking.contactedAt ? "☎ Đã liên hệ ✓" : needCall ? "☎ Cần gọi xác nhận" : "📝 Ghi chú"}
        </Button>
      )}
    </>
  );
}

/**
 * CHI TIẾT THANH TOÁN — bóc ô "cọc" cộng dồn ra thành từng lần trả.
 *
 * Ô `deposit` trên booking KHÔNG phải tiền cọc theo nghĩa thường: mỗi lệnh thu
 * tại quầy đều cộng thẳng vào đó. Khách cọc 500k, trả tiếp 1.000k rồi 700k thì
 * ô ấy ghi 2.200k — một con số chưa từng có ai đưa lần nào, và nhìn vào không
 * biết khoản nào tiền mặt khoản nào chuyển khoản.
 *
 * Bảng này tách lại đúng như đã xảy ra: cọc lúc đặt đứng riêng, rồi từng lần
 * thu kèm đường tiền, mã giao dịch, người thu và dấu đã soát sao kê.
 */
function PaymentBreakdown({
  spot,
  booking,
  onDone,
}: {
  spot: string;
  booking: BookingDTO;
  onDone: (message?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const lines = booking.collected ?? [];
  const paidTotal = lines.reduce((t, c) => t + (c.amount || 0), 0);
  const refunded = booking.refunded ?? 0;
  /** Cọc GÕ TAY lúc nhận booking = số cộng dồn − đã thu qua lệnh thu + đã hoàn. */
  const cocGoc = Math.max(0, (booking.deposit || 0) - paidTotal + refunded);
  const cocWay =
    booking.depositMethod === "cash"
      ? "TM"
      : booking.depositMethod === "transfer"
        ? "CK"
        : booking.transferCode
          ? "CK"
          : "";
  const tm = lines.filter((c) => c.method === "cash").reduce((t, c) => t + c.amount, 0) + (cocWay === "TM" ? cocGoc : 0);
  const ck = lines.filter((c) => c.method === "transfer").reduce((t, c) => t + c.amount, 0) + (cocWay === "CK" ? cocGoc : 0);
  const mu = cocWay ? 0 : cocGoc;
  const vnd = (n: number) => n.toLocaleString("vi-VN");
  const gio = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  if (!open) {
    return (
      <button
        type="button"
        className="shrink-0 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        onClick={() => setOpen(true)}
        title="Bóc ô cọc cộng dồn thành từng lần trả: TM hay CK, ai thu, mã GD"
      >
        💰 Chi tiết thanh toán
      </button>
    );
  }

  return (
    <div className="w-full rounded-lg border border-slate-300 bg-slate-50 p-2">
      <div className="mb-1 flex items-center justify-between">
        <strong className="text-[11px] font-bold text-slate-800">
          CHI TIẾT THANH TOÁN — {booking.contactName || booking.bookingCode || "khách"}
        </strong>
        <button type="button" className="px-1 text-xs text-slate-400 hover:text-slate-700" onClick={() => setOpen(false)}>
          ✕
        </button>
      </div>
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="py-0.5 pr-1 font-semibold">Lần</th>
            <th className="py-0.5 pr-1 text-right font-semibold">Số tiền</th>
            <th className="py-0.5 pr-1 font-semibold">Đường</th>
            <th className="py-0.5 pr-1 font-semibold">Mã GD</th>
            <th className="py-0.5 pr-1 font-semibold">Người thu</th>
            <th className="py-0.5 font-semibold">Lúc</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {cocGoc > 0 && (
            <tr className="border-t border-slate-200">
              <td className="py-0.5 pr-1 font-semibold text-slate-700">Cọc lúc đặt</td>
              <td className="py-0.5 pr-1 text-right font-bold">{vnd(cocGoc)}</td>
              <td className="py-0.5 pr-1">
                {cocWay ? (
                  <span className={cocWay === "TM" ? "font-bold text-emerald-700" : "font-bold text-sky-700"}>{cocWay}</span>
                ) : (
                  <span className="font-bold text-amber-700" title="Bản ghi cũ chưa ai bấm TM hay CK — khoản này không nằm trong sổ tiền của ai">
                    chưa rõ
                  </span>
                )}
              </td>
              <td className="py-0.5 pr-1 text-slate-600">{booking.transferCode || "—"}</td>
              <td className="py-0.5 pr-1 text-slate-600">{booking.createdByName || "—"}</td>
              {/**
               * Cột "Lúc" của dòng cọc là NGÀY KHÁCH TRẢ, không phải giờ gõ máy.
               * Quầy nhập ngày cọc thì lấy ngày ấy (in đậm cho thấy nó khác
               * ngày lập booking); chưa nhập thì vẫn là giờ lập như cũ.
               */}
              <td className="py-0.5 text-slate-500">
                {booking.depositDate ? (
                  <span
                    className="font-bold text-sky-700"
                    title={`Khách trả cọc ngày ${formatDateKeyVN(booking.depositDate)}${
                      booking.depositDateBy ? ` — ${booking.depositDateBy} nhập` : ""
                    }. Booking lập lúc ${gio(booking.createdAt)}.`}
                  >
                    {formatDateKeyVN(booking.depositDate)}
                  </span>
                ) : (
                  gio(booking.createdAt)
                )}
              </td>
            </tr>
          )}
          {lines.map((c, i) => (
            <tr key={i} className="border-t border-slate-200">
              <td className="py-0.5 pr-1 text-slate-700">
                Thu lần {i + 1}
                {c.kind === "full" ? " (trả nốt)" : ""}
              </td>
              <td className="py-0.5 pr-1 text-right font-bold">{vnd(c.amount)}</td>
              <td className="py-0.5 pr-1">
                <span className={c.method === "cash" ? "font-bold text-emerald-700" : "font-bold text-sky-700"}>
                  {c.method === "cash" ? "TM" : "CK"}
                </span>
                {c.method === "cash" ? (
                  <span className="text-emerald-700" title="Tiền mặt trao tay — đã cộng vào tiền người thu đang giữ, không phải soát sao kê">
                    {" "}
                    ✓
                  </span>
                ) : c.verified ? (
                  <span className="text-emerald-700" title="Kế toán đã soát sao kê và nhận khoản này">
                    {" "}
                    ✓
                  </span>
                ) : (
                  <span className="text-rose-600" title="Chưa dò ra trong sao kê"> chưa soát</span>
                )}
              </td>
              <td className="py-0.5 pr-1 text-slate-600">{c.method === "transfer" ? c.code || "—" : "—"}</td>
              <td className="py-0.5 pr-1 text-slate-600">{c.byName || "—"}</td>
              <td className="py-0.5 text-slate-500">{gio(c.at)}</td>
            </tr>
          ))}
          {refunded > 0 && (
            <tr className="border-t border-slate-200 text-amber-800">
              <td className="py-0.5 pr-1 font-semibold">Đã hoàn khách</td>
              <td className="py-0.5 pr-1 text-right font-bold">−{vnd(refunded)}</td>
              <td className="py-0.5 pr-1" colSpan={4} />
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-300 font-bold">
            <td className="py-1 pr-1">Cộng</td>
            <td className="py-1 pr-1 text-right">{vnd(cocGoc + paidTotal - refunded)}</td>
            <td className="py-1" colSpan={4}>
              <span className="text-emerald-700">TM {vnd(tm)}</span>
              {" · "}
              <span className="text-sky-700">CK {vnd(ck)}</span>
              {mu > 0 ? (
                <>
                  {" · "}
                  <span className="text-amber-700">chưa rõ {vnd(mu)}</span>
                </>
              ) : null}
            </td>
          </tr>
        </tfoot>
      </table>
      {booking.agencyPaidAmount > 0 && (
        <p className="mt-1 text-[10px] leading-tight text-slate-600">
          Ngoài ra <strong className="text-emerald-700">{booking.agencyName || "đại lý"}</strong> đã thu hộ{" "}
          <strong>{vnd(booking.agencyPaidAmount)}</strong> — tiền nằm ở đại lý, chưa về công ty.
        </p>
      )}
      {mu > 0 && (
        <p className="mt-1 rounded bg-amber-100 px-1.5 py-1 text-[10px] leading-tight text-amber-900">
          Khoản cọc {vnd(mu)} là bản ghi cũ, chưa ai bấm TM hay CK nên không nằm trong sổ tiền mặt của
          ai. Sửa booking rồi bấm TM/CK để đưa vào đúng sổ.
        </p>
      )}
      {cocGoc > 0 && <DepositDateControl spot={spot} booking={booking} onDone={onDone} />}
      {/* Đã báo khách chưa — trả lời được câu "sao không ai báo tôi" */}
      {booking.email ? (
        <p
          className={
            "mt-1 rounded px-1.5 py-1 text-[10px] leading-tight " +
            (booking.lastNotify?.includes("GỬI HỎNG")
              ? "bg-rose-100 font-semibold text-rose-900"
              : "bg-slate-100 text-slate-600")
          }
        >
          ✉ {booking.email}
          {booking.lastNotify ? ` — ${booking.lastNotify}` : " — chưa gửi lần nào"}
        </p>
      ) : (
        <p className="mt-1 rounded bg-slate-100 px-1.5 py-1 text-[10px] leading-tight text-slate-500">
          ✉ Chưa có email khách — sửa booking để điền, app sẽ tự báo khi có thay đổi.
        </p>
      )}
    </div>
  );
}

/**
 * NGÀY CỌC — khách trả cọc KHÔNG cùng hôm lập booking thì nhập ở đây.
 *
 * Vì sao đáng một ô riêng: đối soát sao kê xếp tiền theo ngày ghi trên sao kê.
 * Khách chuyển hôm 20 mà quầy gõ vào app hôm 23 thì dòng sao kê nằm ở ngày 20,
 * khoản cọc nằm ở ngày 23 — kế toán soát ngày 20 không thấy khoản nào để khớp,
 * soát ngày 23 lại thấy một khoản không có tiền về. Nhập đúng ngày là hai bên
 * gặp nhau, máy tự khớp.
 *
 * Mặc định KHÔNG bắt ai gõ: trống nghĩa là trả đúng hôm lập booking, đúng với
 * phần lớn booking. Chỉ khi lệch ngày mới phải bấm.
 */
function DepositDateControl({
  spot,
  booking,
  onDone,
}: {
  spot: string;
  booking: BookingDTO;
  onDone: (message?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(booking.depositDate || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(value: string) {
    setBusy(true);
    setError(null);
    try {
      await apiPatch(`/api/baocao/booking?spot=${spot}`, {
        id: booking.id,
        action: "deposit-date",
        depositDate: value,
      });
      onDone(value ? `✓ Ngày cọc: ${formatDateKeyVN(value)}` : "✓ Đã bỏ ngày cọc riêng.");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được ngày cọc");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          "mt-1 w-full rounded px-1.5 py-1 text-left text-[10px] font-semibold leading-tight " +
          (booking.depositDate
            ? "bg-sky-100 text-sky-900 hover:bg-sky-200"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200")
        }
        title="Khách trả cọc hôm khác hôm lập booking thì nhập vào đây — đối soát sao kê mới xếp đúng ngày"
      >
        📅 Ngày cọc:{" "}
        {booking.depositDate ? (
          <>
            <strong>{formatDateKeyVN(booking.depositDate)}</strong>
            {booking.depositDateBy ? ` · ${booking.depositDateBy} nhập` : ""} — bấm để sửa
          </>
        ) : (
          "đúng hôm lập booking — bấm nếu khách trả hôm khác"
        )}
      </button>
    );
  }

  return (
    <div className="mt-1 rounded border border-sky-300 bg-sky-50 p-1.5">
      <p className="text-[10px] leading-tight text-sky-900">
        Khách <strong>thực sự trả cọc</strong> ngày nào? Không phải ngày gõ vào app.
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <input
          type="date"
          value={date}
          max={todayInVN()}
          onChange={(e) => setDate(e.target.value)}
          className="h-7 rounded border border-slate-300 px-1.5 text-xs"
        />
        <Button
          type="button"
          disabled={busy || !date}
          onClick={() => save(date)}
          className="h-7 bg-sky-600 px-2 text-xs font-bold text-white hover:bg-sky-700"
        >
          {busy ? "…" : "Xác nhận"}
        </Button>
        {booking.depositDate && (
          <button
            type="button"
            disabled={busy}
            onClick={() => save("")}
            className="h-7 rounded border border-slate-300 px-2 text-xs font-semibold text-slate-600 hover:bg-white"
            title="Quay về mặc định: trả đúng hôm lập booking"
          >
            Bỏ ngày riêng
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-7 px-1.5 text-xs text-slate-500 hover:text-slate-800"
        >
          Thôi
        </button>
      </div>
      {error && <p className="mt-1 text-[10px] font-semibold text-rose-700">{error}</p>}
    </div>
  );
}

/**
 * CỤM NÚT ÍT DÙNG của một dòng booking — bấm "⋯ Thêm" mới xổ.
 *
 * Trước đây năm nút nằm phơi hết trên dòng, đọc thông tin khách phải len lỏi
 * giữa rừng nút. Việc làm thường xuyên (Đã bay · Thu tiền · Xuất vé) vẫn để
 * ngoài; đổi lịch, chuyển người, huỷ, sửa, chiết khấu nằm trong này.
 */
function RowMenu({
  spot,
  booking,
  onMove,
  onEdit,
  onDone,
}: {
  spot: string;
  booking: BookingDTO;
  onMove: () => void;
  onEdit: () => void;
  onDone: (message?: string) => void;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        className={
          "h-7 bg-white px-2 text-xs " + (booking.commission ? "border-violet-400 text-violet-800" : "")
        }
        onClick={() => setOpen(true)}
        title="Đổi lịch · Chuyển người · Chiết khấu đại lý · Huỷ · Sửa"
      >
        ⋯ Thêm{booking.commission ? " 🤝" : ""}
      </Button>
    );
  }

  /** Mọi mục chung một cỡ chữ, một hàng ngang — đọc lướt là thấy hết việc. */
  const item = "shrink-0 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50";

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-300 bg-white p-1.5 shadow-lg">
      <PaymentBreakdown spot={spot} booking={booking} onDone={onDone} />
      <button
        type="button"
        className={item}
        onClick={() => {
          onMove();
          setOpen(false);
        }}
      >
        ⇢ Đổi lịch
      </button>
      <AssignControl
        spot={spot}
        booking={booking}
        onDone={() => {
          onDone();
          setOpen(false);
        }}
        label="Giao PC"
      />
      {/* CK đại lý chỉ có ở Khau Phạ — nơi khách đi theo đại lý / hướng dẫn viên */}
      {spot === "khau-pha" && (
        <CommissionControl
          spot={spot}
          booking={booking}
          onDone={(m) => {
            onDone(m);
            setOpen(false);
          }}
        />
      )}
      <button
        type="button"
        className={item}
        onClick={() => {
          onEdit();
          setOpen(false);
        }}
      >
        ✎ Sửa booking
      </button>
      <CancelBookingControl
        spot={spot}
        booking={booking}
        onDone={(m) => {
          onDone(m);
          setOpen(false);
        }}
      />
      <NotifyGuestControl
        spot={spot}
        booking={booking}
        onDone={(m) => {
          onDone(m);
          setOpen(false);
        }}
      />
      <NoTicketControl
        spot={spot}
        booking={booking}
        onDone={(m) => {
          onDone(m);
          setOpen(false);
        }}
      />
      {/* Sửa khoản đã thu — chỉ hiện khi booking đã có tiền vào */}
      {(booking.collected?.length ?? 0) > 0 && (
        <EditCollectsControl
          spot={spot}
          booking={booking}
          onDone={(m) => {
            onDone(m);
            setOpen(false);
          }}
        />
      )}
      <VoidBookingControl
        spot={spot}
        booking={booking}
        onDone={(m) => {
          onDone(m);
          setOpen(false);
        }}
      />
      <button
        type="button"
        className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-50"
        onClick={() => setOpen(false)}
      >
        ✕
      </button>
    </div>
  );
}

/**
 * BA ĐƯỜNG TRẢ CHIẾT KHẤU ĐẠI LÝ — khác nhau ở chỗ tiền ra khỏi túi ai:
 *  - TM: người bấm rút ví trả tại bãi, trừ vào phần họ đang giữ;
 *  - CK: công ty chuyển từ tài khoản, phải có mã giao dịch;
 *  - trừ vào tiền ĐL đang cầm: không ai chi, đại lý giữ lại rồi hoàn phần còn
 *    lại — chỉ làm công nợ đại lý nhỏ đi.
 */
type CommissionWay = "cash" | "transfer" | "agency";

const COMMISSION_WAYS: Array<{ key: CommissionWay; label: string; hint: string }> = [
  { key: "cash", label: "TM (trừ tiền tôi giữ)", hint: "Rút ví trả ngay tại bãi" },
  { key: "transfer", label: "CK từ TK công ty", hint: "Công ty chuyển khoản, phải ghi mã giao dịch" },
  {
    key: "agency",
    label: "Trừ vào tiền ĐL đang cầm",
    hint: "Đại lý giữ lại phần chiết khấu, chỉ hoàn công ty phần còn lại",
  },
];

const COMMISSION_WAY_CHIP: Record<CommissionWay, string> = {
  cash: "TM",
  transfer: "CK",
  agency: "trừ tiền ĐL cầm",
};

const COMMISSION_WAY_TITLE: Record<CommissionWay, string> = {
  cash: "trả tiền mặt",
  transfer: "trả chuyển khoản",
  agency: "trừ vào tiền đại lý đang cầm",
};

/**
 * CHI CHIẾT KHẤU cho đại lý / hướng dẫn viên dẫn đoàn.
 *
 * Khoản TRẢ NGOÀI: không cộng vào tiền khách, KHÔNG lên phiếu gửi khách. Mặc
 * định 150k/khách nhưng sửa được vì mỗi đại lý một mức thoả thuận.
 */
function CommissionControl({
  spot,
  booking,
  onDone,
}: {
  spot: string;
  booking: BookingDTO;
  onDone: (message: string) => void;
}) {
  const paid = booking.commission;
  /**
   * SỐ TIỀN và TÊN ĐẠI LÝ tự điền sẵn, vẫn sửa tay được:
   *  - tiền = số khách × đơn giá chiết khấu (đã chi rồi thì giữ số cũ)
   *  - tên đại lý = đại lý khách đã đặt qua (ô "Đại lý đã thu" trên booking)
   */
  const suggestAmount = paid?.amount || booking.guestCount * COMMISSION_PER_GUEST;
  const suggestAgency = paid?.agencyName || booking.agencyName || "";
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(suggestAmount);
  const [method, setMethod] = useState<CommissionWay>(paid?.method ?? "cash");
  /** Đại lý đang cầm bao nhiêu của booking này — có thì mới cấn trừ được. */
  const agencyHolding = Math.max(0, booking.agencyPaidAmount || 0);
  const [code, setCode] = useState(paid?.transferCode ?? "");
  const [agency, setAgency] = useState(suggestAgency);
  const [bankAccount, setBankAccount] = useState(paid?.bankAccount ?? "");
  const [bankName, setBankName] = useState(paid?.bankAccountName ?? "");
  const [note2, setNote2] = useState(paid?.note2 ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * TỰ ĐIỀN SỐ TÀI KHOẢN của đại lý theo lần chi gần nhất — chỉ điền khi ô còn
   * trống, không đè lên số người dùng vừa gõ.
   */
  useEffect(() => {
    if (!open || method !== "transfer") return;
    const name = agency.trim();
    if (!name || bankAccount.trim()) return;
    let alive = true;
    apiGet<{ bank: { bankAccount: string; bankAccountName: string } | null }>(
      `/api/baocao/booking?spot=${spot}&agencyBank=${encodeURIComponent(name)}`,
    )
      .then((r) => {
        if (!alive || !r.bank) return;
        setBankAccount((prev) => prev || r.bank!.bankAccount);
        setBankName((prev) => prev || r.bank!.bankAccountName);
      })
      .catch(() => {
        /* không tra được thì gõ tay, không phải lỗi */
      });
    return () => {
      alive = false;
    };
  }, [open, method, agency, bankAccount, spot]);

  async function send() {
    if (amount <= 0) return setError("Chưa nhập số tiền chiết khấu");
    if (method === "transfer" && !code.trim()) return setError("Chuyển khoản phải ghi mã giao dịch");
    setBusy(true);
    setError(null);
    try {
      await apiPatch(`/api/baocao/booking?spot=${spot}`, {
        id: booking.id,
        action: "commission",
        amount,
        method,
        transferCode: code,
        agencyName: agency,
        bankAccount,
        bankAccountName: bankName,
        note2,
      });
      onDone(
        method === "cash"
          ? `✓ Đã chi CK ĐL ${amount.toLocaleString("vi-VN")} đ TM — trừ vào tiền bạn đang giữ.`
          : method === "agency"
            ? `✓ CK ĐL ${amount.toLocaleString("vi-VN")} đ trừ vào tiền đại lý đang cầm — đại lý chỉ còn phải hoàn ${Math.max(0, agencyHolding - amount).toLocaleString("vi-VN")} đ.`
            : `✓ Đã ghi CK ĐL ${amount.toLocaleString("vi-VN")} đ chuyển khoản từ TK công ty (#${code}).`,
      );
      setOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không ghi nhận được khoản chi");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className={
          "shrink-0 rounded-lg border px-2 py-1 text-xs font-semibold " +
          (paid ? "border-violet-400 bg-violet-100 text-violet-900" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50")
        }
        onClick={() => {
          setAmount(suggestAmount);
          setMethod(paid?.method ?? "cash");
          setCode(paid?.transferCode ?? "");
          setAgency(suggestAgency);
          setBankAccount(paid?.bankAccount ?? "");
          setBankName(paid?.bankAccountName ?? "");
          setNote2(paid?.note2 ?? "");
          setOpen(true);
          setError(null);
        }}
      >
        {paid
          ? `🤝 CK ĐL ${(paid.amount / 1000).toLocaleString("vi-VN")}k ${COMMISSION_WAY_CHIP[paid.method] ?? "TM"}${paid.agencyName ? ` · ${paid.agencyName}` : ""}`
          : "🤝 CK đại lý"}
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-violet-300 bg-violet-50 p-2">
      <div className="text-[11px] font-bold text-violet-900">
        CK ĐL — {booking.guestCount} khách × {(COMMISSION_PER_GUEST / 1000).toLocaleString("vi-VN")}k
      </div>
      <p className="mb-1 text-[10px] leading-tight text-violet-900/70">Trả ngoài — không hiện ở phiếu khách.</p>
      {/* Tên đại lý điền sẵn theo đại lý khách đặt qua; sửa tay được */}
      <TextInput
        value={agency}
        onChange={(e) => setAgency(e.target.value)}
        placeholder="Tên đại lý nhận chiết khấu"
        className="mb-1 h-8 rounded-lg text-xs"
      />
      <MoneyInput value={amount} onChange={setAmount} />
      {/* BA ĐƯỜNG TRẢ — xếp dọc vì nhãn dài, bấm nhầm là sai sổ tiền của người khác */}
      <div className="mt-1 overflow-hidden rounded-lg border border-slate-300">
        {COMMISSION_WAYS.map((w) => {
          const off = w.key === "agency" && !agencyHolding;
          return (
            <button
              key={w.key}
              type="button"
              disabled={off}
              onClick={() => setMethod(w.key)}
              title={off ? "Booking này đại lý không cầm tiền nào để trừ" : w.hint}
              className={
                "block w-full border-b border-slate-200 px-2 py-1.5 text-left text-xs last:border-b-0 " +
                (method === w.key
                  ? "bg-violet-600 font-bold text-white"
                  : off
                    ? "bg-slate-50 font-medium text-slate-300"
                    : "bg-white font-medium text-slate-600")
              }
            >
              {w.label}
              {w.key === "agency" && agencyHolding > 0 ? (
                <span className={method === "agency" ? "text-violet-100" : "text-slate-400"}>
                  {" "}
                  — đang cầm {(agencyHolding / 1000).toLocaleString("vi-VN")}k
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {method === "agency" && (
        <p className="mt-1 rounded bg-amber-100 px-1.5 py-1 text-[10px] leading-tight text-amber-900">
          Không ai chi tiền: đại lý giữ lại {(amount / 1000).toLocaleString("vi-VN")}k trong khoản
          đang cầm, chỉ hoàn công ty{" "}
          <strong>{(Math.max(0, agencyHolding - amount) / 1000).toLocaleString("vi-VN")}k</strong>.
        </p>
      )}
      {method === "transfer" && (
        <>
          {/* STK + mã GD xếp CẶP cho hẹp bề ngang — thẻ này nổi cạnh dòng
              booking, để mỗi ô một hàng là đẩy cả sổ giãn ra. Số tài khoản tự
              điền theo lần chi gần nhất cho đại lý đó. */}
          <div className="mt-1 grid grid-cols-2 gap-1">
            <TextInput
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              placeholder="Số TK"
              inputMode="numeric"
              className="h-8 rounded-lg text-xs"
            />
            <TextInput
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Mã GD"
              className="h-8 rounded-lg text-xs"
            />
          </div>
          <TextInput
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="Tên chủ TK / ngân hàng"
            className="mt-1 h-8 rounded-lg text-xs"
          />
        </>
      )}
      <TextInput
        value={note2}
        onChange={(e) => setNote2(e.target.value)}
        placeholder="Ghi chú (không bắt buộc)"
        className="mt-1 h-8 rounded-lg text-xs"
      />
      {error && <div className="mt-1 text-[11px] font-semibold text-rose-700">{error}</div>}
      <div className="mt-1.5 flex gap-1">
        <Button type="button" className="h-8 flex-1 bg-violet-600 px-2 text-xs hover:bg-violet-700" disabled={busy} onClick={send}>
          {busy ? "Đang ghi…" : "✓ Xác nhận chi"}
        </Button>
        <Button type="button" variant="ghost" className="h-8 bg-white px-2 text-xs" onClick={() => setOpen(false)}>
          Thôi
        </Button>
      </div>
    </div>
  );
}

/**
 * Nút 💵 THU TIỀN dùng chung cho cả hai danh sách (chờ bay hôm nay + sắp tới).
 *
 * Thu được từ xa: khách chuyển khoản trước ngày bay thì điều phối/kế toán ghi
 * nhận ngay, khỏi đợi tới bãi. Hai đường tiền vẫn tách bạch — CK về TK công ty,
 * TM vào tiền giữ hộ của chính người bấm.
 */
/**
 * KẾ TOÁN SỬA / TÍCH "ĐÃ NHẬN ĐỦ" TỪNG KHOẢN THU của một booking.
 *
 * Hai việc sổ sách quen thuộc:
 *  - Chia bill nhầm (1,8tr TM + 3,2tr CK trong khi thực tế ngược lại), gán
 *    nhầm người thu, gõ sai mã CK → sửa tại chỗ, máy tự đắp lại tiền booking
 *    và bản chụp thanh toán; số đã đổi thì mọi tích soát cũ tự rụng.
 *  - Soát xong một khoản (kể cả tiền mặt) → tích "Đã nhận" ngay trên booking,
 *    khỏi mở bảng soát chuyển khoản dò lại từ đầu.
 */
function CollectFixControl({
  spot,
  booking,
  onDone,
}: {
  spot: string;
  booking: BookingDTO;
  onDone: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [staff, setStaff] = useState<Array<{ username: string; name: string; roleLabel: string }>>([]);
  const [drafts, setDrafts] = useState<
    Record<string, { amount: number; method: "cash" | "transfer"; code: string; collector: string }>
  >({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = (booking.collected ?? []).filter((c) => c.collectId);
  const orphan = (booking.collected ?? []).length - rows.length;
  if (!(booking.collected ?? []).length) return null;

  const draftOf = (c: NonNullable<BookingDTO["collected"]>[number]) =>
    drafts[c.collectId!] ?? {
      amount: c.amount,
      method: c.method,
      code: c.code ?? "",
      collector: c.collectorUsername ?? "",
    };

  async function openPanel() {
    setOpen(true);
    if (staff.length) return;
    try {
      const r = await apiGet<{ staff: Array<{ username: string; name: string; roleLabel: string }> }>(
        `/api/baocao/booking?date=${todayInVN()}&spot=${spot}`,
      );
      setStaff(r.staff ?? []);
    } catch {
      /* không có danh sách thì vẫn sửa được tiền/mã */
    }
  }

  async function save(c: NonNullable<BookingDTO["collected"]>[number]) {
    const d = draftOf(c);
    if (d.amount <= 0) return setError("Số tiền phải lớn hơn 0");
    setBusy(c.collectId!);
    setError(null);
    try {
      await apiPatch(`/api/baocao/collect?spot=${spot}`, {
        id: c.collectId,
        action: "edit",
        amount: d.amount,
        method: d.method,
        transferCode: d.method === "transfer" ? d.code : "",
        collectorUsername: d.method === "cash" ? d.collector : "",
      });
      onDone("✓ Đã sửa khoản thu — tiền booking đã đắp lại, các tích soát cũ được gỡ để soát lại.");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không sửa được khoản thu");
    } finally {
      setBusy(null);
    }
  }

  async function verify(c: NonNullable<BookingDTO["collected"]>[number], on: boolean) {
    setBusy(c.collectId!);
    setError(null);
    try {
      await apiPatch(`/api/baocao/bank-check?spot=${spot}`, {
        action: "confirm",
        refId: `collect:${c.collectId}`,
        on,
      });
      onDone(on ? "✓ Đã tích NHẬN ĐỦ cho khoản thu." : "Đã bỏ tích nhận của khoản thu.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đổi được trạng thái nhận");
    } finally {
      setBusy(null);
    }
  }

  /** Xoá khoản ghi TRÙNG/nhầm — xoá mềm (còn vết), tiền booking trả về như chưa thu. */
  async function remove(c: NonNullable<BookingDTO["collected"]>[number]) {
    const reason = window.prompt(
      `XOÁ khoản thu ${(c.amount || 0).toLocaleString("vi-VN")}đ ${c.method === "transfer" ? "CK" : "TM"}?\n\n` +
        `Dùng khi nhân viên lỡ ghi thu HAI LẦN hoặc ghi nhầm. Booking sẽ cộng lại "còn thu" đúng bằng số này; ` +
        `lệnh chuyển sang mục từ chối (vẫn còn vết, không mất hẳn).\n\nGhi lý do:`,
      "thu trùng",
    );
    if (reason === null) return;
    setBusy(c.collectId!);
    setError(null);
    try {
      await apiPatch(`/api/baocao/collect?spot=${spot}`, { id: c.collectId, action: "remove", reason });
      onDone("✓ Đã xoá khoản thu — tiền booking đã cộng lại phần còn thu, lệnh nằm ở mục từ chối để lần vết.");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xoá được khoản thu");
    } finally {
      setBusy(null);
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        className="h-7 shrink-0 border-slate-300 bg-white px-2 text-xs font-semibold text-slate-600"
        title="Kế toán: sửa chia bill TM/CK, đổi người thu, tích 'đã nhận đủ' từng khoản"
        onClick={openPanel}
      >
        🧾 Sửa thu
      </Button>
    );
  }

  return (
    <div className="w-72 max-w-full rounded-lg border border-indigo-300 bg-indigo-50/70 p-1.5 text-left">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-bold text-indigo-900">Khoản thu của booking</span>
        <button type="button" className="text-xs text-slate-500" onClick={() => setOpen(false)}>
          ✕ đóng
        </button>
      </div>
      {error && <p className="mb-1 text-[11px] font-semibold text-rose-700">{error}</p>}
      {rows.map((c) => {
        const d = draftOf(c);
        const set = (patch: Partial<typeof d>) => setDrafts((prev) => ({ ...prev, [c.collectId!]: { ...d, ...patch } }));
        return (
          <div key={c.collectId} className="mb-1.5 rounded-lg border border-slate-200 bg-white p-1.5">
            <div className="flex flex-wrap items-center gap-1">
              <span className="w-24">
                <MoneyInput value={d.amount} onChange={(v) => set({ amount: v })} />
              </span>
              <span className="flex h-7 overflow-hidden rounded-lg border border-slate-300">
                {(
                  [
                    ["cash", "TM"],
                    ["transfer", "CK"],
                  ] as Array<["cash" | "transfer", string]>
                ).map(([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => set({ method: m })}
                    className={
                      d.method === m
                        ? "bg-indigo-600 px-2 text-[11px] font-bold text-white"
                        : "bg-white px-2 text-[11px] font-medium text-slate-500"
                    }
                  >
                    {label}
                  </button>
                ))}
              </span>
              {c.verified ? (
                <span className="rounded bg-sky-500 px-1 text-[11px] font-bold text-white">✓ đã nhận</span>
              ) : null}
            </div>
            {d.method === "transfer" ? (
              <TextInput
                value={d.code}
                onChange={(e) => set({ code: e.target.value })}
                placeholder="Mã giao dịch CK"
                className="mt-1 h-7 w-full rounded-lg text-[11px]"
              />
            ) : (
              <select
                value={d.collector}
                onChange={(e) => set({ collector: e.target.value })}
                className="mt-1 h-7 w-full rounded-lg border border-slate-300 bg-white px-1 text-[11px]"
              >
                <option value="">— người thu (giữ nguyên: {c.byName || "?"}) —</option>
                {staff.map((a) => (
                  <option key={a.username} value={a.username}>
                    {a.name} ({a.roleLabel})
                  </option>
                ))}
              </select>
            )}
            <div className="mt-1 flex items-center gap-1">
              <Button
                type="button"
                className="h-6 px-2 text-[11px]"
                disabled={busy === c.collectId}
                onClick={() => save(c)}
              >
                Lưu sửa
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={
                  "h-6 px-2 text-[11px] font-semibold " +
                  (c.verified ? "border-sky-500 bg-sky-100 text-sky-800" : "border-slate-300 bg-white text-slate-600")
                }
                disabled={busy === c.collectId}
                title={c.verified ? "Bỏ tích đã nhận (soát lại)" : "Kế toán xác nhận khoản này ĐÃ NHẬN ĐỦ — tiền đã về đúng chỗ"}
                onClick={() => verify(c, !c.verified)}
              >
                {c.verified ? "↺ Bỏ nhận" : "✓ Nhận đủ"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="ml-auto h-6 border-rose-300 bg-white px-2 text-[11px] font-semibold text-rose-700"
                disabled={busy === c.collectId}
                title="Xoá khoản ghi trùng/nhầm — booking cộng lại còn thu, lệnh vào mục từ chối (còn vết)"
                onClick={() => remove(c)}
              >
                🗑 Xoá
              </Button>
            </div>
          </div>
        );
      })}
      {orphan > 0 && (
        <p className="text-[10px] text-slate-500">
          {orphan} khoản cũ không nối được lệnh thu gốc — sửa qua chỗ Sửa booking nếu cần.
        </p>
      )}
    </div>
  );
}

function CollectMoneyControl({
  spot,
  booking,
  onDone,
  big,
}: {
  spot: string;
  booking: BookingDTO;
  onDone: (message: string) => void;
  /** Bản NÚT TO cho trang phi công — bấm giữa nắng, đeo găng, phải to mới trúng. */
  big?: boolean;
}) {
  const [open, setOpen] = useState(false);
  /** "deposit" = thu cọc (gõ số tuỳ ý) · "full" = thu nốt toàn bộ còn phải thu. */
  const [kind, setKind] = useState<"deposit" | "full">("full");
  /**
   * HAI Ô TIỀN RIÊNG: khách hay trả một phần tiền mặt, phần còn lại chuyển
   * khoản. Nhập cả hai trong một lần xác nhận; máy tách thành hai lệnh thu để
   * tiền mặt vào phần người thu đang giữ, còn CK vào thẳng TK công ty.
   */
  const collectFromAfar = booking.flightDate !== todayInVN();
  const [cash, setCash] = useState(0);
  /**
   * Mỗi BILL chuyển khoản một dòng: khách hay chuyển làm 2-3 lần (vượt hạn mức
   * chuyển, hoặc mấy người trong đoàn tự chuyển phần của mình), mỗi lần một mã
   * giao dịch riêng — gộp một mã thì kế toán không dò được sao kê.
   */
  const [bills, setBills] = useState<Array<{ amount: number; code: string }>>([{ amount: 0, code: "" }]);
  /**
   * TÍCH CHỌN ĐƯỜNG TIỀN: bật TM là số còn thu nhảy vào ô TM, bật CK là nhảy
   * vào ô CK — khỏi gõ lại số. Bật cả hai thì tự chia: gõ bên này, bên kia
   * tự bù cho đủ. Mọi con số vẫn sửa tay được như thường.
   */
  const [pay, setPay] = useState<{ cash: boolean; transfer: boolean }>({ cash: true, transfer: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const left = booking.remaining || 0;
  const transfer = bills.reduce((t, b) => t + (b.amount || 0), 0);
  const total = cash + transfer;

  /** Mục tiêu tự điền: thu đủ nhắm "còn phải thu"; thu cọc thì tổng hiện có. */
  const target = () => (kind === "full" ? left : Math.max(left, total));

  /** Bù phần còn thiếu vào MỘT bill (trừ bill đang gõ) — các số khác giữ nguyên. */
  const balanced = (bs: Array<{ amount: number; code: string }>, cashNow: number, skip: number) => {
    if (bs.length === 0) return bs;
    let t = bs.length - 1;
    if (t === skip) t = bs.length >= 2 ? bs.length - 2 : -1;
    if (t < 0) return bs;
    const others = bs.reduce((s, b, k) => (k === t ? s : s + (b.amount || 0)), 0);
    const next = [...bs];
    next[t] = { ...next[t], amount: Math.max(0, target() - cashNow - others) };
    return next;
  };

  const setBill = (i: number, patch: Partial<{ amount: number; code: string }>) =>
    setBills((prev) => {
      const next = prev.map((b, k) => (k === i ? { ...b, ...patch } : b));
      // Chia bill: gõ bill này thì bill kia tự nhận "số còn lại tương ứng"
      return patch.amount !== undefined && kind === "full" && next.length > 1 ? balanced(next, cash, i) : next;
    });

  /** Gõ ô TM: đang bật cả CK thì phần còn lại tự chảy sang bill CK. */
  const setCashSmart = (v: number) => {
    setCash(v);
    if (pay.transfer && kind === "full") setBills((prev) => balanced(prev, v, -1));
  };

  /** Bật/tắt TM·CK: dồn số còn thu vào đúng ô theo lựa chọn — không phải nhập lại. */
  function setPayMode(next: { cash: boolean; transfer: boolean }) {
    if (!next.cash && !next.transfer) return; // phải còn ít nhất một đường
    setPay(next);
    /**
     * Số tiền dồn sang đường mới = số ĐANG NHẬP (nếu có), không thì phần còn
     * phải thu. Giữ số đang nhập để người vừa gõ 500k rồi đổi TM→CK không mất
     * con số đó.
     */
    const amount = total > 0 ? total : left;
    if (next.cash && !next.transfer) {
      setCash(amount);
      setBills([{ amount: 0, code: "" }]);
    } else if (!next.cash && next.transfer) {
      setCash(0);
      setBills((prev) =>
        prev.length <= 1 ? [{ amount, code: prev[0]?.code ?? "" }] : balanced(prev, 0, -1),
      );
    } else {
      // bật cả hai: giữ TM đang gõ, phần còn thiếu bù vào bill CK cuối
      setBills((prev) => balanced(prev.length ? prev : [{ amount: 0, code: "" }], cash, -1));
    }
  }

  /** Mở bảng: mặc định dồn hết vào một đường theo tình huống, sửa lại được. */
  function reset() {
    setKind("full");
    if (collectFromAfar) {
      setPay({ cash: false, transfer: true });
      setBills([{ amount: left, code: "" }]);
      setCash(0);
    } else {
      setPay({ cash: true, transfer: false });
      setCash(left);
      setBills([{ amount: 0, code: "" }]);
    }
    setError(null);
  }

  /**
   * NGÀY KHÁCH CHUYỂN KHOẢN — mặc định hôm nay, bấm vào đổi được.
   *
   * Nhân viên hay bấm thu tiền sau khi tiền đã về mấy hôm (lúc nhớ ra, lúc
   * rảnh tay). Ghi hôm nay thì lệnh thu nằm ở danh sách soát của hôm nay còn
   * dòng sao kê nằm ở ngày tiền thật sự về — kế toán soát ngày nào cũng lệch.
   *
   * Chỉ hỏi cho phần CK. Tiền mặt luôn là hôm nay: nó vào túi người thu ngay
   * lúc bấm.
   */
  const [ckDate, setCkDate] = useState(todayInVN());

  async function send() {
    if (total <= 0) return setError("Chưa nhập số tiền thu");
    const used = bills.filter((b) => b.amount > 0);
    if (used.some((b) => !b.code.trim())) return setError("Mỗi bill chuyển khoản phải có mã giao dịch riêng");
    const who = `#${booking.daySeq || "?"} ${booking.contactName || booking.phone || "khách"}`;
    if (
      left <= 0 &&
      total > 0 &&
      !window.confirm(`${who} ĐÃ THU ĐỦ rồi. Vẫn ghi thêm ${total.toLocaleString("vi-VN")} đ cho khách này?`)
    )
      return;
    if (
      total > left &&
      left > 0 &&
      !window.confirm(
        `Thu ${total.toLocaleString("vi-VN")} đ cho ${who}, NHIỀU HƠN phần còn phải thu (${left.toLocaleString("vi-VN")} đ).\n\nKiểm lại xem có nhầm sang booking khác không. Vẫn ghi?`,
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      await apiPatch(`/api/baocao/booking?spot=${spot}`, {
        id: booking.id,
        action: "collect",
        kind,
        cash,
        transfers: used,
        transferDate: ckDate,
      });
      const parts = [
        cash > 0 ? `${cash.toLocaleString("vi-VN")} đ TM (vào tiền bạn giữ)` : "",
        transfer > 0
          ? `${transfer.toLocaleString("vi-VN")} đ CK${used.length > 1 ? ` (${used.length} bill)` : ""} (vào TK công ty)`
          : "",
      ].filter(Boolean);
      onDone(`✓ Thu ${total.toLocaleString("vi-VN")} đ — ${parts.join(" + ")}.`);
      setOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không ghi nhận được khoản thu");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        className={
          big
            ? "h-11 w-full bg-rose-600 px-3 text-base font-bold text-white hover:bg-rose-700"
            : "h-7 bg-rose-600 px-2 text-xs font-bold text-white hover:bg-rose-700"
        }
        title="Thu tiền cho booking này — tiền mặt tại bãi hoặc khách chuyển khoản trước"
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        {big ? "✅ ĐÃ THU — nhập tiền mặt / chuyển khoản" : "💵 Thu tiền"}
      </Button>
    );
  }

  return (
    <div className="flex w-60 flex-col gap-1 rounded-lg border border-rose-300 bg-rose-50/60 p-1.5">
      {/* ĐANG THU CHO AI — bảng cũ chỉ có ô số tiền nên rất dễ gõ nhầm sang
          booking bên cạnh (đã xảy ra: một mã CK vào hai booking). */}
      <div className="rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-bold leading-tight text-white">
        Thu tiền cho #{booking.daySeq || "?"} · {booking.contactName || booking.phone || "khách"}
        <span className="font-medium opacity-90">
          {" "}
          · còn thu {left.toLocaleString("vi-VN")} đ
        </span>
      </div>
      {/* Cọc = gõ số tuỳ ý · Thu đủ = lấy trọn phần còn phải thu, khỏi tự tính */}
      <div className="flex h-8 overflow-hidden rounded-lg border border-slate-300">
        {(
          [
            ["deposit", "Cọc"],
            ["full", "Thu đủ"],
          ] as Array<["deposit" | "full", string]>
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setKind(k);
              if (k === "full") {
                // Thu nốt: dồn phần còn thiếu vào đúng đường đang bật
                if (pay.cash && !pay.transfer) setCash(Math.max(0, left - transfer));
                else if (!pay.cash && pay.transfer) setBills((prev) => balanced(prev, 0, -1));
                else setBills((prev) => balanced(prev, cash, -1));
              }
            }}
            className={
              kind === k
                ? "flex-1 bg-slate-800 px-1 text-xs font-semibold text-white"
                : "flex-1 bg-white px-1 text-xs font-medium text-slate-500"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Khách trả một phần TM + một phần CK: nhập cả hai, xác nhận một lần.
          Một booking thu được NHIỀU LẦN — mỗi lần một lệnh thu riêng. */}
      <div className="text-[11px] font-semibold text-slate-700">
        Còn phải thu: <span className="tabular-nums">{left.toLocaleString("vi-VN")} đ</span>
        {booking.deposit > 0 && (
          <span className="font-normal text-slate-500">
            {" "}
            · đã thanh toán {booking.deposit.toLocaleString("vi-VN")} đ
          </span>
        )}
      </div>
      {/* TÍCH ĐƯỜNG TIỀN: bật ô nào là số còn thu tự nhảy vào ô đó, khỏi gõ lại */}
      <div className="flex h-8 overflow-hidden rounded-lg border border-slate-300">
        {(
          [
            ["cash", "TM — tiền mặt"],
            ["transfer", "CK — chuyển khoản"],
          ] as Array<["cash" | "transfer", string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            /**
             * BẤM LÀ CHUYỂN HẲN, không phải bật/tắt.
             *
             * Bản cũ dùng kiểu bật/tắt: đang ở TM mà bấm CK thì thành "chia hai
             * đường" — tiền vẫn nằm ở TM, ô CK về 0 nên nhân viên phải gõ lại
             * số. Nay bấm ô nào là toàn bộ số tiền nhảy sang ô đó luôn (vẫn sửa
             * tay được); muốn chia hai đường thì bấm nút "TM + CK" bên dưới.
             */
            onClick={() =>
              setPayMode(key === "cash" ? { cash: true, transfer: false } : { cash: false, transfer: true })
            }
            className={
              pay[key]
                ? "flex-1 " + (key === "cash" ? "bg-emerald-600" : "bg-indigo-600") + " px-1 text-xs font-bold text-white"
                : "flex-1 bg-white px-1 text-xs font-medium text-slate-400"
            }
          >
            {pay[key] ? "✓ " : ""}
            {label}
          </button>
        ))}
      </div>
      {/* Khách trả một phần TM + một phần CK — trường hợp ít gặp nên để riêng
          một nút, khỏi làm hỏng thao tác một chạm ở trên */}
      <button
        type="button"
        onClick={() =>
          pay.cash && pay.transfer
            ? setPayMode({ cash: true, transfer: false })
            : setPayMode({ cash: true, transfer: true })
        }
        className={
          "h-7 rounded-lg border text-[11px] font-semibold " +
          (pay.cash && pay.transfer
            ? "border-slate-700 bg-slate-800 text-white"
            : "border-slate-300 bg-white text-slate-500")
        }
      >
        {pay.cash && pay.transfer ? "✓ Đang chia TM + CK — bấm để bỏ" : "⇄ Khách trả cả TM lẫn CK"}
      </button>
      {pay.cash && (
        <label className="flex items-center gap-1.5">
          <span className="w-8 shrink-0 text-xs font-bold text-emerald-800">TM</span>
          <span className="min-w-0 flex-1">
            <MoneyInput value={cash} onChange={setCashSmart} />
          </span>
        </label>
      )}
      {/* Mỗi bill CK một dòng: số tiền + mã giao dịch riêng, đối soát sao kê được */}
      {pay.transfer && bills.map((b, i) => (
        <div key={i} className="space-y-1">
          <label className="flex items-center gap-1.5">
            <span className="w-8 shrink-0 text-xs font-bold text-indigo-800">
              CK{bills.length > 1 ? ` ${i + 1}` : ""}
            </span>
            <span className="min-w-0 flex-1">
              <MoneyInput value={b.amount} onChange={(v) => setBill(i, { amount: v })} />
            </span>
            {bills.length > 1 && (
              <button
                type="button"
                onClick={() => setBills((prev) => prev.filter((_, k) => k !== i))}
                className="h-8 w-7 shrink-0 rounded-lg border border-slate-300 bg-white text-slate-400 hover:text-rose-600"
                aria-label="Bỏ bill này"
              >
                ×
              </button>
            )}
          </label>
          {b.amount > 0 && (
            <div className="flex items-center gap-1">
              <span className="min-w-0 flex-1">
                <TextInput
                  value={b.code}
                  onChange={(e) => setBill(i, { code: e.target.value })}
                  placeholder={bills.length > 1 ? `Mã GD bill ${i + 1} — 4 số cuối là đủ…` : "Mã GD — 4 số cuối là đủ…"}
                  className="h-8 rounded-lg text-xs"
                />
              </span>
              {/* MỖI BILL MỘT MÃ QR: khách chuyển làm mấy lần thì gửi mấy mã, mỗi
                  mã đúng số tiền của lần đó và nội dung có đuôi .1 .2 để kế toán
                  dò được từng dòng sao kê. */}
              <PaymentQrButton
                amount={b.amount}
                note={buildTransferNote({
                  spot: booking.spot,
                  flightDate: booking.flightDate,
                  daySeq: booking.daySeq,
                  bookingCode: booking.bookingCode,
                  phone: booking.phone,
                  part: bills.length > 1 ? i + 1 : undefined,
                })}
                purpose={`Tiền bay${bills.length > 1 ? ` (bill ${i + 1}/${bills.length})` : ""} — ${booking.contactName || booking.phone || "khách"}`}
                label={bills.length > 1 ? `QR ${i + 1}` : "QR"}
              />
            </div>
          )}
        </div>
      ))}
      {pay.transfer && (
        <label
          className={
            "flex items-center gap-1.5 rounded-lg px-1.5 py-1 " +
            (ckDate === todayInVN() ? "bg-slate-50" : "bg-amber-100")
          }
          title="Ngày tiền thật sự về tài khoản — để kế toán soát đúng ngày trên sao kê"
        >
          <span className="shrink-0 text-[11px] font-bold text-slate-700">Ngày thu</span>
          <input
            type="date"
            value={ckDate}
            max={todayInVN()}
            onChange={(e) => setCkDate(e.target.value || todayInVN())}
            className="h-8 min-w-0 flex-1 rounded-lg border border-slate-300 px-1.5 text-xs"
          />
          {ckDate !== todayInVN() && (
            <button
              type="button"
              onClick={() => setCkDate(todayInVN())}
              className="shrink-0 rounded px-1 text-[11px] font-bold text-amber-800 hover:underline"
            >
              hôm nay
            </button>
          )}
        </label>
      )}
      {pay.transfer && (
        <button
          type="button"
          onClick={() => setBills((prev) => [...prev, { amount: Math.max(0, target() - total), code: "" }])}
          className="rounded-lg border border-dashed border-indigo-300 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50"
        >
          ＋ Chia bill CK (khách chuyển làm nhiều lần)
        </button>
      )}

      <div
        className={
          "flex items-center justify-between rounded-lg border-2 px-2 py-1 " +
          (total > left ? "border-amber-400 bg-amber-50" : "border-slate-300 bg-white")
        }
      >
        <span className="text-xs font-semibold text-slate-600">Tổng thu lần này</span>
        <strong className="text-base tabular-nums text-slate-900">{total.toLocaleString("vi-VN")} đ</strong>
        {/* Khách chuyển khoản một lần: đưa mã QR cho quét tại chỗ, hoặc gửi Zalo
            trả sau. Số tiền lấy đúng số vừa gõ, nội dung là "ngày bay · STT ·
            mã booking" để kế toán dò sao kê.
            Đã CHIA BILL thì ẩn mã gộp này đi — mỗi bill có mã QR riêng ở trên,
            đưa nhầm mã gộp là khách chuyển một cục, hỏng cả việc chia. */}
        {bills.length <= 1 && (
          <PaymentQrButton
            amount={total > 0 ? total : left}
            note={buildTransferNote({
              spot: booking.spot,
              flightDate: booking.flightDate,
              daySeq: booking.daySeq,
              bookingCode: booking.bookingCode,
              phone: booking.phone,
            })}
            purpose={`Tiền bay — ${booking.contactName || booking.phone || "khách"}`}
          />
        )}
      </div>

      <div className="text-[11px] leading-tight text-slate-600">
        {cash > 0 ? "TM cộng vào TIỀN GIỮ HỘ của bạn. " : ""}
        {transfer > 0 ? "CK vào thẳng TK CÔNG TY. " : ""}
        {total > 0 && total < left ? `Thu xong còn lại ${(left - total).toLocaleString("vi-VN")} đ — thu tiếp lần sau được. ` : ""}
        {total > left ? "⚠ Nhiều hơn phần còn phải thu." : ""}
        {collectFromAfar && cash > 0 ? " Khách đặt trước, ở xa — chắc chắn thu được tiền mặt chứ?" : ""}
      </div>
      {error && <div className="text-[11px] font-medium leading-tight text-rose-700">{error}</div>}
      <div className="flex gap-1">
        <Button
          type="button"
          className="h-7 flex-1 bg-emerald-600 px-2 text-xs hover:bg-emerald-700"
          disabled={busy || total <= 0}
          onClick={send}
        >
          {busy ? "Đang lưu…" : "✓ Xác nhận"}
        </Button>
        <Button type="button" variant="ghost" className="h-7 bg-white px-2 text-xs" onClick={() => setOpen(false)}>
          Thôi
        </Button>
      </div>
    </div>
  );
}


/**
 * Nút ✕ HUỶ BAY kèm luồng hỏi cho đủ:
 *
 *  - Điểm có vé (Khau Phạ, Sa Pa): hỏi ĐÃ XUẤT VÉ CHƯA. Đã xuất thì phải ghi mã
 *    vé để thu hồi; chưa xuất thì bỏ qua phần mã.
 *  - Đã phát sinh tiền (cọc hoặc đã thu) mới hỏi HOÀN bao nhiêu và hoàn bằng gì:
 *    CK là tiền ra từ TK công ty, TM là nhân viên chi tại chỗ.
 *  - Booking chưa thu đồng nào: không hỏi tiền, bấm xác nhận là huỷ.
 */
function CancelBookingControl({
  spot,
  booking,
  onDone,
}: {
  spot: string;
  booking: BookingDTO;
  onDone: (message: string) => void;
}) {
  /** Số tiền khách đã trả cho booking này — mốc để đề xuất tiền hoàn. */
  const paid = booking.deposit || Math.max(0, (booking.totalAmount || 0) - (booking.remaining || 0));
  const hasTicketFlow = spot !== "ha-noi";

  const [open, setOpen] = useState(false);
  /** Cả đoàn nghỉ bay, hay chỉ vài người trong đoàn? */
  const [scope, setScope] = useState<"all" | "part">("all");
  const [partGuests, setPartGuests] = useState(1);
  const [ticketIssued, setTicketIssued] = useState(false);
  const [codes, setCodes] = useState("");
  const [refund, setRefund] = useState(paid);
  const [refundMethod, setRefundMethod] = useState<"cash" | "transfer">("transfer");
  /** Khách đã dùng gì và bị thu lại bao nhiêu — giống hệt thẻ Khách huỷ bên dưới. */
  const [usedServices, setUsedServices] = useState("");
  const [usedFee, setUsedFee] = useState(0);
  const [bankAccount, setBankAccount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (hasTicketFlow && ticketIssued && !codes.trim()) return setError("Đã xuất vé thì phải ghi mã vé thu hồi");
    if (scope === "part" && (partGuests < 1 || partGuests >= booking.guestCount)) {
      return setError(`Số khách huỷ phải từ 1 đến ${booking.guestCount - 1} (huỷ hết thì chọn “cả đoàn”)`);
    }
    if (refund > 0 && refundMethod === "transfer" && !bankAccount.trim()) {
      return setError("Hoàn chuyển khoản thì phải có số tài khoản của khách");
    }
    setBusy(true);
    setError(null);
    try {
      if (scope === "part") {
        /**
         * HUỶ MỘT PHẦN = MỘT DÒNG DUY NHẤT: trước đây đi đường "split" nên đẻ
         * thêm một booking con đã-huỷ trùng tên trùng SĐT (vụ Hà Văn Thận
         * #2/#7) — ai nhìn sổ cũng tưởng nhập trùng. Nay booking gốc giữ
         * nguyên, in "N khách (huỷ M)" đỏ, tiền tự trừ, hoàn tiền đi đường
         * lệnh hoàn chuẩn.
         */
        await apiPatch(`/api/baocao/booking?spot=${spot}`, {
          id: booking.id,
          action: "cancel-guests",
          count: partGuests,
          reason: note,
          refund: paid > 0 ? refund : 0,
          refundMethod,
          bankAccount,
        });
        onDone(
          `✓ Đã huỷ ${partGuests} khách trong đoàn (còn ${booking.guestCount - partGuests} khách bay)` +
            (refund > 0 ? `, hoàn ${refund.toLocaleString("vi-VN")} đ.` : "."),
        );
      } else {
        await apiPatch(`/api/baocao/booking?spot=${spot}`, {
          id: booking.id,
          action: "cancel",
          ticketIssued: hasTicketFlow ? ticketIssued : false,
          ticketCodesText: codes,
          refund: paid > 0 ? refund : 0,
          refundMethod,
          usedServices,
          usedFee,
          bankAccount,
          note,
        });
        onDone(
          paid > 0 && refund > 0
            ? `✓ Đã huỷ bay và hoàn ${refund.toLocaleString("vi-VN")} đ bằng ${refundMethod === "cash" ? "tiền mặt" : "chuyển khoản"}.`
            : "✓ Đã huỷ bay (không phát sinh hoàn tiền).",
        );
      }
      setOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không huỷ được booking");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        className="h-7 shrink-0 border-rose-300 bg-white px-2 text-xs font-semibold text-rose-700"
        onClick={() => {
          setRefund(paid);
          setScope("all");
          setPartGuests(1);
          setTicketIssued(Boolean(booking.ticketIssued));
          setCodes("");
          setUsedServices("");
          setUsedFee(0);
          setBankAccount("");
          setNote("");
          setRefundMethod("transfer");
          setError(null);
          setOpen(true);
        }}
      >
        ✕ Huỷ booking
      </Button>
    );
  }

  /* Khung xổ: rộng hết dòng trên khổ hẹp (trước đây cố định 15rem nên tràn ra ngoài viền) */
  return (
    <div className="flex w-full max-w-[15rem] flex-col gap-1 rounded-lg border border-rose-300 bg-rose-50/60 p-1.5">
      <div className="text-[11px] font-bold text-rose-900">
        Huỷ bay — {booking.contactName || "khách"} ({booking.guestCount} khách)
      </div>

      {/* Đoàn 10 người bay được 6 là chuyện thường — huỷ được đúng phần không bay */}
      {booking.guestCount > 1 && (
        <div className="flex h-8 overflow-hidden rounded-lg border border-slate-300">
          {(
            [
              ["all", "Huỷ cả đoàn"],
              ["part", "Huỷ một phần"],
            ] as Array<["all" | "part", string]>
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setScope(v)}
              className={
                scope === v
                  ? "flex-1 bg-rose-600 px-1 text-xs font-bold text-white"
                  : "flex-1 bg-white px-1 text-xs font-medium text-slate-500"
              }
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {scope === "part" && (
        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-900">
          Số khách huỷ:
          <MiniCount value={partGuests} onChange={setPartGuests} max={Math.max(1, booking.guestCount - 1)} />
          <span className="font-normal text-slate-500">còn {Math.max(0, booking.guestCount - partGuests)} khách bay</span>
        </label>
      )}

      {hasTicketFlow && (
        <>
          <div className="flex h-8 overflow-hidden rounded-lg border border-slate-300">
            {(
              [
                [false, "Chưa xuất vé"],
                [true, "Đã xuất vé"],
              ] as Array<[boolean, string]>
            ).map(([v, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => setTicketIssued(v)}
                className={
                  ticketIssued === v
                    ? "flex-1 bg-slate-800 px-1 text-xs font-semibold text-white"
                    : "flex-1 bg-white px-1 text-xs font-medium text-slate-500"
                }
              >
                {label}
              </button>
            ))}
          </div>
          {ticketIssued && (
            <TextInput
              value={codes}
              onChange={(e) => setCodes(e.target.value.toUpperCase())}
              placeholder="Mã vé thu hồi · MBL0005 MBL0006"
              autoCapitalize="characters"
              spellCheck={false}
              className="h-8 rounded-lg text-xs"
            />
          )}
        </>
      )}

      <TextInput
        value={usedServices}
        onChange={(e) => setUsedServices(e.target.value)}
        placeholder="Dịch vụ đã dùng · xe đón, flycam đã quay…"
        className="h-8 rounded-lg text-xs"
      />
      {paid > 0 ? (
        <>
          <div className="text-[11px] leading-tight text-slate-600">
            Khách đã trả {paid.toLocaleString("vi-VN")} đ — trừ phí đã dùng rồi hoàn phần còn lại:
          </div>
          <div className="flex items-center gap-1">
            <span className="w-10 shrink-0 text-[11px] font-semibold text-slate-600">Phí</span>
            <span className="min-w-0 flex-1">
              <MoneyInput
                value={usedFee}
                onChange={(v) => {
                  setUsedFee(v);
                  setRefund(Math.max(0, paid - v));
                }}
              />
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-10 shrink-0 text-[11px] font-semibold text-slate-600">Hoàn</span>
            <span className="min-w-0 flex-1">
              <MoneyInput value={refund} onChange={setRefund} />
            </span>
          </div>
          <div className="flex h-8 overflow-hidden rounded-lg border border-slate-300">
            {(
              [
                ["transfer", "CK"],
                ["cash", "TM"],
              ] as Array<["transfer" | "cash", string]>
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setRefundMethod(k)}
                className={
                  refundMethod === k
                    ? "flex-1 bg-emerald-600 px-1 text-xs font-semibold text-white"
                    : "flex-1 bg-white px-1 text-xs font-medium text-slate-500"
                }
              >
                {label}
              </button>
            ))}
          </div>
          {refund > 0 && refundMethod === "transfer" && (
            <TextInput
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              placeholder="Số TK khách nhận…"
              className="h-8 rounded-lg text-xs"
            />
          )}
          <div className="text-[11px] leading-tight text-slate-600">
            {refundMethod === "transfer"
              ? "CK: lệnh hoàn nhảy sang trang KẾ TOÁN để chuyển và xác nhận."
              : "TM: bạn chi tại chỗ — số này trừ vào tiền bạn đang giữ."}
          </div>
        </>
      ) : (
        <div className="text-[11px] leading-tight text-slate-600">
          Booking chưa phát sinh cọc hay thanh toán — không cần hoàn tiền.
        </div>
      )}

      {/* Ghi chú: vì sao huỷ — thẻ bên dưới có, ở đây trước không có nên mất thông tin */}
      <TextInput
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Ghi chú · lý do huỷ…"
        className="h-8 rounded-lg text-xs"
      />

      {error && <div className="text-[11px] font-medium leading-tight text-rose-700">{error}</div>}
      <div className="flex gap-1">
        <Button
          type="button"
          className="h-7 flex-1 bg-rose-600 px-2 text-xs hover:bg-rose-700"
          disabled={busy}
          onClick={send}
        >
          {busy ? "Đang huỷ…" : "✕ Xác nhận huỷ"}
        </Button>
        <Button type="button" variant="ghost" className="h-7 bg-white px-2 text-xs" onClick={() => setOpen(false)}>
          Thôi
        </Button>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Banner đầu trang: booking bay đúng ngày đang xem                     */
/* ================================================================== */

/**
 * SỔ BOOKING DẠNG BẢNG (luật chủ 05/09) — mỗi booking một dòng kiểu Excel,
 * bấm đầu cột để xếp theo cột đó (bấm lại đảo chiều). Dành cho lúc ngày đông
 * cần QUÉT MẮT; thao tác (thu tiền, dời, sửa…) vẫn ở chế độ thẻ.
 */
function BookingDayTable({ open, closed, movedOut }: { open: BookingDTO[]; closed: BookingDTO[]; movedOut: BookingDTO[] }) {
  const [sort, setSort] = useState<{ col: string; dir: 1 | -1 }>({ col: "seq", dir: 1 });
  type R = { b: BookingDTO; moved: boolean };
  const all: R[] = [
    ...open.map((b) => ({ b, moved: false })),
    ...closed.map((b) => ({ b, moved: false })),
    ...movedOut.map((b) => ({ b, moved: true })),
  ];
  const ppgOf = (b: BookingDTO) => (b.flightKind === "ppg" ? b.guestCount : Math.min(b.guestCount, b.ppgGuests || 0));
  const dichVu = (b: BookingDTO) =>
    [
      b.flycam ? `${b.flycam}✈` : "",
      b.video360 ? `${b.video360}×360` : "",
      b.redFlag ? `${b.redFlag}🚩` : "",
      b.sunset ? `${b.sunset}🌅` : "",
      b.flagFlight ? `${b.flagFlight}🎌` : "",
    ]
      .filter(Boolean)
      .join(" ");
  const trangThai = (r: R) => (r.moved ? "dời" : r.b.status === "done" ? "đã bay" : r.b.status === "cancelled" ? "huỷ" : "chờ");
  const gioVe = (b: BookingDTO) =>
    b.ticketIssued && b.ticketIssuedAt
      ? new Date(b.ticketIssuedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })
      : "";
  const val = (r: R, col: string): string | number => {
    switch (col) {
      case "seq": return r.b.daySeq || 0;
      case "name": return (r.b.contactName || "").toLowerCase();
      case "guests": return r.b.guestCount;
      case "kind": return ppgOf(r.b) > 0 ? 1 : 0;
      case "sv": return dichVu(r.b);
      case "ticket": return r.b.ticketIssuedAt ? Date.parse(r.b.ticketIssuedAt) : Number.MAX_SAFE_INTEGER;
      case "total": return r.b.totalAmount || 0;
      case "paid": return (r.b.deposit || 0) + (r.b.movedPaidOut ?? 0);
      case "remaining": return r.b.remaining || 0;
      case "status": return trangThai(r);
      default: return 0;
    }
  };
  const sorted = [...all].sort((x, y) => {
    const a = val(x, sort.col);
    const b2 = val(y, sort.col);
    const c = typeof a === "number" && typeof b2 === "number" ? a - b2 : String(a).localeCompare(String(b2), "vi");
    return (c || (x.b.daySeq || 0) - (y.b.daySeq || 0)) * sort.dir;
  });
  const Th = ({ col, label, right }: { col: string; label: string; right?: boolean }) => (
    <th
      onClick={() => setSort((s) => ({ col, dir: s.col === col ? ((s.dir * -1) as 1 | -1) : 1 }))}
      className={
        "cursor-pointer select-none whitespace-nowrap border-b border-slate-300 bg-slate-100 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-200 " +
        (right ? "text-right" : "text-left")
      }
      title="Bấm để xếp theo cột này — bấm lại để đảo chiều"
    >
      {label}
      {sort.col === col ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
    </th>
  );
  const k = (n: number) => (n ? `${Math.round(n / 1000).toLocaleString("vi-VN")}k` : "—");
  return (
    <div className="mt-2 max-h-[72vh] overflow-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full border-collapse text-[13px]">
        <thead className="sticky top-0 z-10">
          <tr>
            <Th col="seq" label="#" />
            <Th col="name" label="Khách" />
            <Th col="guests" label="SL" right />
            <Th col="kind" label="Loại" />
            <Th col="sv" label="Dịch vụ" />
            <Th col="ticket" label="🎫 Xuất vé" />
            <Th col="total" label="Tổng" right />
            <Th col="paid" label="Đã trả" right />
            <Th col="remaining" label="Còn thu" right />
            <Th col="status" label="TT" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => {
            const b = r.b;
            const tt = trangThai(r);
            return (
              <tr
                key={`${b.id}-${r.moved ? "m" : ""}`}
                className={
                  (i % 2 ? "bg-slate-50/60 " : "bg-white ") +
                  (tt === "huỷ" ? "text-rose-700 " : tt === "dời" ? "text-amber-700 " : "") +
                  (b.locked ? "opacity-60 " : "")
                }
              >
                <td className="border-b border-slate-100 px-2 py-1 font-bold tabular-nums text-rose-600">{b.daySeq || "?"}</td>
                <td className="max-w-[220px] border-b border-slate-100 px-2 py-1">
                  <div className="truncate font-semibold text-slate-900" title={b.contactName}>{b.contactName || "—"}</div>
                  {b.phone && <div className="text-[11px] tabular-nums text-slate-500">📞 {b.phone}</div>}
                </td>
                <td className="border-b border-slate-100 px-2 py-1 text-right tabular-nums">{b.guestCount}</td>
                <td className="border-b border-slate-100 px-2 py-1">
                  {ppgOf(b) > 0 ? (
                    <span className="rounded bg-indigo-600 px-1 text-[10px] font-bold text-white">
                      🪂 {b.flightKind === "ppg" ? "PPG" : `${b.guestCount - ppgOf(b)}PG+${ppgOf(b)}PPG`}
                    </span>
                  ) : (
                    <span className="text-slate-500">{FLIGHT_KIND_SHORT[b.flightKind] || "PG"}</span>
                  )}
                </td>
                <td className="whitespace-nowrap border-b border-slate-100 px-2 py-1 text-[12px]" title="✈ flycam · 360 cam360 · 🚩 cờ đỏ · 🌅 hoàng hôn · 🎌 kéo cờ">
                  {dichVu(b) || "—"}
                </td>
                <td className="whitespace-nowrap border-b border-slate-100 px-2 py-1 tabular-nums">
                  {gioVe(b) ? `🎫 ${gioVe(b)}` : b.noTicketFlight ? "🎫✕ không vé" : "—"}
                </td>
                <td className="whitespace-nowrap border-b border-slate-100 px-2 py-1 text-right tabular-nums">{k(b.totalAmount || 0)}</td>
                <td className="whitespace-nowrap border-b border-slate-100 px-2 py-1 text-right tabular-nums text-emerald-700">
                  {k((b.deposit || 0) + (b.movedPaidOut ?? 0))}
                </td>
                <td className="whitespace-nowrap border-b border-slate-100 px-2 py-1 text-right tabular-nums font-bold text-rose-700">
                  {(b.remaining || 0) > 0 ? k(b.remaining || 0) : "✓"}
                </td>
                <td className="whitespace-nowrap border-b border-slate-100 px-2 py-1">
                  <span
                    className={
                      "rounded px-1.5 py-0.5 text-[10px] font-bold " +
                      (tt === "đã bay"
                        ? "bg-emerald-100 text-emerald-800"
                        : tt === "huỷ"
                          ? "bg-rose-100 text-rose-700"
                          : tt === "dời"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-sky-100 text-sky-800")
                    }
                  >
                    {tt}
                    {r.moved ? ` → ${formatDateKeyVN(b.flightDate).slice(0, 5)}` : ""}
                  </span>
                  {b.locked ? " 🔒" : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-slate-100 px-3 py-1.5 text-[11px] text-slate-500">
        Bấm đầu cột để xếp · thao tác (thu tiền, dời, sửa, xuất vé…) chuyển về chế độ ☰ Thẻ.
      </p>
    </div>
  );
}


export function BookingTodayBanner({
  spot,
  date,
  collapsible = false,
  defaultOpen = false,
}: {
  spot: string;
  date: string;
  /** Gập được — bấm tiêu đề là thu gọn/xổ ra. */
  collapsible?: boolean;
  /**
   * Mở sẵn khi vào trang. Điều phối cần nhìn thấy danh sách ngay (việc chính của
   * họ), nhưng vẫn gập được khi muốn xem phần khác; kế toán thì để gập sẵn.
   */
  defaultOpen?: boolean;
}) {
  /**
   * Ai được KHOÁ dòng: kế toán và quản trị. Hỏi phiên đăng nhập ngay tại đây
   * thay vì truyền prop từ ba trang gọi vào — thẻ này nằm ở cả trang điều phối,
   * kế toán và phi công.
   */
  const { user } = useBaobaySession();
  const canLock = Boolean(
    user &&
      (user.role === "accountant" ||
        user.role === "admin" ||
        (user.extraRoles ?? []).includes("accountant") ||
        // Quản trị đang "xem hộ" một tài khoản khác — máy chủ vẫn cho khoá
        (user as { viaAdmin?: boolean }).viaAdmin),
  );
  const [rows, setRows] = useState<BookingDTO[]>([]);
  const [moved, setMoved] = useState<{ bookings: number; guests: number }>({ bookings: 0, guests: 0 });
  /** Booking đã bỏ khỏi sổ hôm nay — mục nhỏ cuối danh sách, bấm lấy lại được. */
  const [voided, setVoided] = useState<BookingDTO[]>([]);
  /**
   * Khách ĐÃ DỜI KHỎI ngày này. Giữ lại một dòng vàng trong danh sách chứ không
   * để booking biến mất: điều phối nhìn sổ hôm nay phải thấy "khách này có đăng
   * ký nhưng đã dời sang 25/08", không thì tưởng nhập thiếu và nhập lại lần nữa.
   */
  const [movedOut, setMovedOut] = useState<BookingDTO[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Danh sách dài thì gập lại còn 10 dòng. */
  const [showAll, setShowAll] = useState(false);
  /**
   * Xếp thứ tự danh sách: theo số booking (mặc định), đưa "đã bay" lên trước,
   * hay đưa "đã xuất vé" lên trước. Hai kiểu sau vẫn tie-break theo số booking
   * để thứ tự ổn định, không nhảy lung tung mỗi lần tải lại.
   */
  const [sortBy, setSortBy] = useState<"seq" | "flown" | "ticket">("seq");
  /**
   * LỌC "CHƯA THU ĐỦ" cho kế toán truy thu (luật chủ 03/09): bật lên là danh
   * sách chỉ còn booking còn nợ tiền — nhất là nhóm ĐÃ BAY mà chưa trả hết,
   * phải đòi trước khi khách rời bãi/về nhà.
   */
  const [onlyUnpaid, setOnlyUnpaid] = useState(false);
  /** LỌC PPG (luật chủ 03/09): PPG khác giá, khác phi công, phải soát riêng được. */
  const [onlyPpg, setOnlyPpg] = useState(false);
  /** LỌC ĐÃ XUẤT VÉ (luật chủ 04/09) — bật kèm xếp theo giờ xuất là ra thứ tự khách đến. */
  const [onlyTicketed, setOnlyTicketed] = useState(false);
  /**
   * HAI KIỂU XEM (luật chủ 05/09): "thẻ" như cũ (đầy đủ nút thao tác) và
   * "bảng" kiểu Excel — mỗi booking một dòng, bấm đầu cột để xếp, dễ quét mắt
   * khi ngày đông chi tiết. Ghi nhớ lựa chọn theo máy.
   */
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  useEffect(() => {
    try {
      const v = localStorage.getItem("baobay-booking-view");
      if (v === "table") setViewMode("table");
    } catch {
      /* không đọc được thì mặc định thẻ */
    }
  }, []);
  const switchView = (v: "cards" | "table") => {
    setViewMode(v);
    try {
      localStorage.setItem("baobay-booking-view", v);
    } catch {
      /* không lưu được thì thôi */
    }
  };
  /** Ô TÌM KIẾM: gõ tên / SĐT / mã booking là lọc ngay — ngày 40+ booking không dò mắt nổi. */
  const [q, setQ] = useState("");
  /**
   * BOOKING MỚI NỔI LÊN ĐẦU cho tới khi NGƯỜI XEM THẤY (luật chủ 03/09): máy
   * này đã mở danh sách có booking đó một lần thì lần mở SAU badge tự ẩn.
   * "Đã thấy" lưu localStorage theo TỪNG MÁY — điều phối và kế toán mỗi người
   * đều được thấy badge ít nhất một lần; refresh 30s giữa chừng KHÔNG tính là
   * "lần sau" (bộ nhớ đã-thấy chỉ nạp lúc mở trang). Chỉ tính booking nhập
   * trong 24h để badge cũ không đeo bám mãi trên máy chưa từng mở.
   */
  const seenRef = useRef<Set<string>>(new Set());
  const [seenLoaded, setSeenLoaded] = useState(false);
  useEffect(() => {
    try {
      seenRef.current = new Set(JSON.parse(localStorage.getItem("baobay-seen-bookings") ?? "[]"));
    } catch {
      /* máy chặn localStorage thì badge hiện mỗi lần — thà thừa còn hơn sót */
    }
    setSeenLoaded(true);
  }, []);
  const isNewBooking = useCallback(
    (b: BookingDTO) =>
      seenLoaded &&
      b.status === "open" &&
      Boolean(b.createdAt) &&
      Date.now() - new Date(b.createdAt).getTime() < 24 * 3600_000 &&
      !seenRef.current.has(b.id),
    [seenLoaded],
  );
  /** id booking đang mở ô chọn ngày dời + ngày đã chọn. `guests` > 0 = chỉ dời bấy nhiêu khách. */
  const [moving, setMoving] = useState<{
    id: string;
    toDate: string;
    guests?: number;
    /** Phí đã phát sinh khi dời (xe đã chạy…) — khách TRẢ THÊM, không hoàn. */
    feeCash?: number;
    feeTransfer?: number;
    feeCode?: string;
    note?: string;
    /** Dời một phần: số DỊCH VỤ mang theo nhóm dời (flycam/360/cờ…) người bấm chọn. */
    services?: Record<string, number>;
    /** Đoàn ĐÃ XUẤT VÉ: mã vé khách dời mang theo — ngày mới tự khớp nhờ mã này. */
    codes?: string;
  } | null>(null);
  /** Câu báo sau khi thu tiền xong — hiện trên đầu banner. */
  const [collectDone, setCollectDone] = useState<string | null>(null);

  const load = useCallback(() => {
    apiGet<{
      forDate: BookingDTO[];
      voided?: BookingDTO[];
      movedOut?: BookingDTO[];
      moved?: { bookings: number; guests: number };
    }>(
      `/api/baocao/booking?date=${date}&spot=${spot}`,
    )
      .then((r) => {
        setRows(r.forDate);
        setVoided(r.voided ?? []);
        setMovedOut(r.movedOut ?? []);
        setMoved(r.moved ?? { bookings: 0, guests: 0 });
      })
      .catch(() => {
        /* không có booking thì thôi */
      });
  }, [spot, date]);

  useEffect(() => {
    load();
    // Booking đồng nghiệp vừa nhập cũng hiện trong vòng nửa phút
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, [load]);

  /**
   * ĐÁNH DẤU "ĐÃ THẤY" vào kho máy này ngay khi danh sách hiện ra — nhưng KHÔNG
   * đụng seenRef của phiên đang mở, để badge còn nổi suốt lượt xem này; lần MỞ
   * TRANG sau kho mới được nạp lại và badge tự ẩn. Giữ tối đa 500 id gần nhất.
   */
  useEffect(() => {
    if (!seenLoaded || !rows.length) return;
    try {
      const stored: string[] = JSON.parse(localStorage.getItem("baobay-seen-bookings") ?? "[]");
      const merged = [...new Set([...stored, ...rows.map((b) => b.id)])].slice(-500);
      localStorage.setItem("baobay-seen-bookings", JSON.stringify(merged));
    } catch {
      /* không lưu được thì badge hiện lại lần sau — không sao */
    }
  }, [rows, seenLoaded]);

  /**
   * NÚT KHOÁ của một dòng — dùng cho CẢ dòng chờ bay và dòng đã bay/đã huỷ.
   *
   * Kế toán chỉ khoá SAU khi đã soát xong tiền của khách đó, mà lúc ấy khách
   * thường đã bay rồi — nên nút chỉ có ở dòng chờ bay là vô dụng. Khoá rồi thì
   * chính dòng đó không còn nút sửa nào nữa, chỉ còn nút mở khoá của kế toán.
   */
  const lockButton = (b: BookingDTO) =>
    canLock ? (
      <Button
        type="button"
        variant="ghost"
        className={
          "h-7 shrink-0 px-2 text-xs font-semibold " +
          (b.locked ? "border-slate-800 bg-slate-800 text-white" : "border-slate-300 bg-white text-slate-600")
        }
        disabled={busy === b.id}
        title={
          b.locked
            ? `Đã khoá${b.lockedBy ? ` bởi ${b.lockedBy}` : ""} — bấm để mở khoá`
            : "Khoá dòng này: không ai sửa, thu tiền hay tích đã bay được nữa"
        }
        onClick={() => act(b, b.locked ? "unlock" : "lock")}
      >
        {b.locked ? "🔒 Mở khoá" : "🔓 Khoá"}
      </Button>
    ) : null;

  /**
   * Van "HIỆN TIỀN CHO PHI CÔNG" — chỉ Khau Phạ cần (luật: phi công KP không
   * thấy tiền; bật van này là phi công được giao khách ấy thấy đủ tổng/cọc/còn
   * thu của ĐÚNG booking đó để thu hộ). Cùng người bấm với nút khoá: kế toán.
   */
  const pilotMoneyButton = (b: BookingDTO) =>
    canLock && spot === "khau-pha" ? (
      <Button
        type="button"
        variant="ghost"
        className={
          "h-7 shrink-0 px-2 text-xs font-semibold " +
          (b.pilotMoney ? "border-amber-500 bg-amber-400 text-amber-950" : "border-slate-300 bg-white text-slate-600")
        }
        disabled={busy === b.id}
        title={
          b.pilotMoney
            ? `Phi công đang THẤY tiền booking này${b.pilotMoneyBy ? ` (${b.pilotMoneyBy} bật)` : ""} — bấm để ẩn lại`
            : "Bật cho phi công được giao khách này thấy tổng/cọc/còn thu — dùng khi cần phi công thu hộ"
        }
        onClick={async () => {
          setBusy(b.id);
          try {
            await apiPatch(`/api/baocao/booking?spot=${spot}`, { id: b.id, action: "pilot-money", on: !b.pilotMoney });
            load();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Không đổi được");
          } finally {
            setBusy(null);
          }
        }}
      >
        {b.pilotMoney ? "👁 PC thấy tiền" : "👁̶ PC ẩn tiền"}
      </Button>
    ) : null;

  const bookingCmp = (a: BookingDTO, b: BookingDTO) => {
    if (sortBy === "flown") {
      const d = Number(b.status === "done") - Number(a.status === "done");
      if (d) return d;
    }
    if (sortBy === "ticket") {
      const d = Number(Boolean(b.ticketIssued)) - Number(Boolean(a.ticketIssued));
      if (d) return d;
      // Cùng đã xuất vé thì xếp theo GIỜ XUẤT (= thứ tự khách đến) — luật chủ 04/09
      const ta = a.ticketIssuedAt ? Date.parse(a.ticketIssuedAt) : Number.MAX_SAFE_INTEGER;
      const tb = b.ticketIssuedAt ? Date.parse(b.ticketIssuedAt) : Number.MAX_SAFE_INTEGER;
      if (ta !== tb) return ta - tb;
    }
    return (a.daySeq || 0) - (b.daySeq || 0);
  };
  /** So khớp tìm kiếm KHÔNG DẤU: gõ "ngoc anh" phải ra "Ngọc Anh". */
  const norm = (s: string) =>
    (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
  const needle = norm(q.trim());
  const matchQ = (b: BookingDTO) =>
    !needle ||
    norm(b.contactName).includes(needle) ||
    norm(b.phone ?? "").includes(needle) ||
    norm(b.bookingCode ?? "").includes(needle);
  /** Bộ lọc truy thu: chỉ giữ booking còn nợ (khách huỷ không tính — nợ của họ xử theo đường hoàn/huỷ). */
  const unpaidOk = (b: BookingDTO) => !onlyUnpaid || ((b.remaining ?? 0) > 0 && b.status !== "cancelled");
  /** Booking dính PPG: cả đoàn PPG, hoặc đoàn PG chở lẫn vài khách PPG. */
  const isPpgBooking = (b: BookingDTO) => b.flightKind === "ppg" || (b.ppgGuests ?? 0) > 0;
  const ppgOk = (b: BookingDTO) => !onlyPpg || isPpgBooking(b);
  const ticketedOk = (b: BookingDTO) => !onlyTicketed || b.ticketIssued;
  const open = rows
    .filter((b) => b.status === "open" && matchQ(b) && unpaidOk(b) && ppgOk(b) && ticketedOk(b))
    // BOOKING MỚI chưa ai thấy trên máy này: nổi LÊN ĐẦU, bất kể kiểu xếp
    .sort((a, b) => Number(isNewBooking(b)) - Number(isNewBooking(a)) || bookingCmp(a, b));
  const doneGuestsAll = rows.filter((b) => b.status === "done").reduce((t, b) => t + b.guestCount, 0);
  const cancelledGuests = rows.filter((b) => b.status === "cancelled").reduce((t, b) => t + b.guestCount, 0);
  const closed = rows.filter((b) => b.status !== "open" && matchQ(b) && unpaidOk(b) && ppgOk(b) && ticketedOk(b)).sort(bookingCmp);
  /** Ngày đông khách: chỉ hiện 10 dòng đầu, bấm mũi tên mới xổ hết. ĐANG TÌM thì hiện hết kết quả. */
  const openShown = showAll || needle ? open : open.slice(0, 10);
  if (!rows.length) return null;

  async function act(
    b: BookingDTO,
    action: "flown" | "cancel" | "move" | "ticket" | "lock" | "unlock",
    toDate?: string,
  ) {
    const name = b.contactName || b.bookingCode || b.source;
    if (action === "lock" && !window.confirm(`KHOÁ booking ${name}? Khoá rồi thì không ai sửa, thu tiền hay tích đã bay được nữa — chỉ kế toán mở lại.`)) return;
    if (action === "flown" && !window.confirm(`Xác nhận khách ${name} ĐÃ BAY?`)) return;
    if (action === "cancel" && !window.confirm(`Xác nhận booking ${name} bị HUỶ? Hệ thống sẽ báo huỷ, không làm gì thêm.`)) return;
    /**
     * XUẤT VÉ = GỬI BẢO HIỂM. Hồ sơ thiếu thì máy KHÔNG gửi được, nghĩa là
     * khách bay mà không có bảo hiểm — phải nói thẳng ra chứ không nhắc mơ hồ.
     * Vẫn chỉ NHẮC, không chặn: khách đã đứng ở bãi mà app khoá vé thì quầy sẽ
     * tìm đường lách, dữ liệu càng không có.
     */
    if (action === "ticket" && !b.ticketIssued) {
      const st = insuranceState(b.insured, b.guestCount);
      if (!st.ok && !window.confirm(
        `Khách ${name} còn THIẾU hồ sơ bảo hiểm (mới đủ ${st.ready}/${st.need} người).\n\n` +
          "Xuất vé là lúc máy GỬI BẢO HIỂM — thiếu thế này thì KHÔNG GỬI ĐƯỢC, khách bay mà không có bảo hiểm.\n\n" +
          "Vẫn xuất vé chứ? Bấm Huỷ để quay ra nhập nốt giấy tờ.",
      )) return;
    }
    /** Bỏ tích vé = thu hồi bảo hiểm, nói trước cho khỏi bấm hớ. */
    if (action === "ticket" && b.ticketIssued && b.insuranceSentAt &&
      !window.confirm(`Bỏ tích ĐÃ XUẤT VÉ của ${name}?\n\nBảo hiểm đã gửi sẽ bị THU HỒI theo.`)) return;
    setBusy(b.id);
    setError(null);
    try {
      await apiPatch(`/api/baocao/booking?spot=${spot}`, { id: b.id, action, toDate });
      setMoving(null);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không cập nhật được");
    } finally {
      setBusy(null);
    }
  }

  /**
   * Đếm CẢ ngày, không riêng nhóm chờ bay: xem lại ngày cũ thì đa số booking đã
   * "đã bay" — chỉ đếm chờ bay sẽ ra "1 booking" trong khi danh sách có 10.
   * Khách huỷ không tính (họ không bay), nhưng vẫn nằm trong danh sách bên dưới.
   */
  /**
   * Thống kê CẢ NGÀY ngay trên tiêu đề: tổng book (kể cả huỷ + dời đi), tổng
   * khách, rồi đã bay / dời / huỷ — nhìn một dòng là biết ngày đó chốt ra sao.
   */
  // Vé đã xuất = tổng KHÁCH của các booking đã tích 🎫 (khách huỷ không tính)
  const issuedGuests = rows
    .filter((b) => b.ticketIssued && b.status !== "cancelled")
    .reduce((t, b) => t + b.guestCount, 0);
  /**
   * Số khách ĐANG CHỜ (chưa bay, chưa huỷ, chưa dời). Thiếu con số này thì
   * dòng tiêu đề đọc như một phép cộng sai: "Tổng 106 - bay 93 - dời 4 - huỷ
   * 5" — 4 khách còn lại đi đâu? Chính là 4 khách đang chờ, nhưng người đọc
   * không có cách nào biết (chủ đã bắt đúng ca này ngày 01/09). Bày đủ bốn
   * nhóm thì Tổng = bay + chờ + dời + huỷ, cộng nhẩm là khớp.
   */
  const openGuests = open.reduce((t, b) => t + b.guestCount, 0);
  /**
   * TÁCH TỔNG THEO LOẠI BAY (luật chủ 03/09): "Tổng 46k" phải kể rõ bao nhiêu
   * PG bao nhiêu PPG — hai loại khác giá, khác phi công, khác cách chốt sổ.
   * Booking PG có thể chở lẫn vài khách PPG (ppgGuests) nên đếm theo đầu khách
   * chứ không theo booking. Cộng cả nhóm đã dời đi cho khớp con số Tổng.
   */
  const kindTotals = { pg: 0, ppg: 0, m650: 0, m850: 0 };
  for (const b of [...rows, ...movedOut]) {
    if (b.flightKind === "ppg") kindTotals.ppg += b.guestCount;
    else if (b.flightKind === "m650") kindTotals.m650 += b.guestCount;
    else if (b.flightKind === "m850") kindTotals.m850 += b.guestCount;
    else {
      const p = Math.min(b.guestCount, b.ppgGuests || 0);
      kindTotals.ppg += p;
      kindTotals.pg += b.guestCount - p;
    }
  }
  const kindBits = [
    kindTotals.pg ? `${kindTotals.pg}×PG` : "",
    kindTotals.ppg ? `${kindTotals.ppg}×PPG` : "",
    kindTotals.m650 ? `${kindTotals.m650}×M650` : "",
    kindTotals.m850 ? `${kindTotals.m850}×M850` : "",
  ]
    .filter(Boolean)
    .join(" + ");
  const stats = [
    `${rows.length + moved.bookings} Book`,
    `Tổng ${rows.reduce((t, b) => t + b.guestCount, 0) + moved.guests}k${kindBits ? ` (${kindBits})` : ""}`,
    issuedGuests ? `Đã xuất vé ${issuedGuests}k` : "",
    doneGuestsAll ? `Đã bay ${doneGuestsAll}k` : "",
    openGuests ? `Chờ ${openGuests}k` : "",
    // Dời cũng tách loại bay (luật chủ 04/09): "Dời 2k" phải nói rõ 2×PPG hay 2×PG
    moved.guests
      ? (() => {
          const mk = { pg: 0, ppg: 0, m650: 0, m850: 0 };
          for (const b of movedOut) {
            if (b.flightKind === "ppg") mk.ppg += b.guestCount;
            else if (b.flightKind === "m650") mk.m650 += b.guestCount;
            else if (b.flightKind === "m850") mk.m850 += b.guestCount;
            else {
              const p = Math.min(b.guestCount, b.ppgGuests || 0);
              mk.ppg += p;
              mk.pg += b.guestCount - p;
            }
          }
          const bits = [
            mk.pg ? `${mk.pg}×PG` : "",
            mk.ppg ? `${mk.ppg}×PPG` : "",
            mk.m650 ? `${mk.m650}×M650` : "",
            mk.m850 ? `${mk.m850}×M850` : "",
          ]
            .filter(Boolean)
            .join(" + ");
          return `Dời ${moved.guests}k${bits ? ` (${bits})` : ""}`;
        })()
      : "",
    cancelledGuests ? `Huỷ ${cancelledGuests}k` : "",
  ].filter(Boolean);
  /** Dời lịch: cả đoàn thì đổi ngày tại chỗ, một phần thì tách nhóm sang ngày mới. */
  async function moveBooking(
    b: BookingDTO,
    m: {
      toDate: string;
      guests?: number;
      feeCash?: number;
      feeTransfer?: number;
      feeCode?: string;
      note?: string;
      services?: Record<string, number>;
      codes?: string;
    },
  ) {
    /** Đoàn đã xuất vé mà không ghi mã mang theo: cảnh báo trước khi cho qua. */
    if (
      b.ticketIssued &&
      !(m.codes ?? "").trim() &&
      !window.confirm(
        "Đoàn ĐÃ XUẤT VÉ nhưng chưa ghi MÃ VÉ khách dời mang theo.\n\n" +
          "Không có mã thì máy chỉ đếm được số lượng — ngày mới sẽ không tự khớp từng vé.\n\nVẫn dời mà không ghi mã?",
      )
    )
      return;
    const part = m.guests ?? 0;
    const fee = (m.feeCash ?? 0) + (m.feeTransfer ?? 0);
    if (fee > 0 && (m.feeTransfer ?? 0) > 0 && !m.feeCode?.trim()) {
      setError("Thu phí bằng chuyển khoản phải ghi mã giao dịch");
      return;
    }
    /** Thu phí phát sinh trước, rồi mới đổi ngày — thu xong booking mới đổi chỗ. */
    const collectFee = async () => {
      if (fee <= 0) return;
      await apiPatch(`/api/baocao/booking?spot=${spot}`, {
        id: b.id,
        action: "collect",
        kind: "deposit",
        cash: m.feeCash ?? 0,
        transfers: (m.feeTransfer ?? 0) > 0 ? [{ amount: m.feeTransfer, code: m.feeCode }] : [],
      });
    };
    if (part <= 0) {
      // Dời CẢ ĐOÀN — gửi kèm mã vé mang theo (act() không có chỗ cho mã)
      await collectFee();
      setBusy(b.id);
      setError(null);
      try {
        await apiPatch(`/api/baocao/booking?spot=${spot}`, {
          id: b.id,
          action: "move",
          toDate: m.toDate,
          ticketCodesText: m.codes ?? "",
        });
        setMoving(null);
        setCollectDone(`✓ Đã dời cả đoàn sang ${formatDateKeyVN(m.toDate)}.`);
        load();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Không dời được");
      } finally {
        setBusy(null);
      }
      return;
    }
    await collectFee();
    setBusy(b.id);
    setError(null);
    try {
      await apiPatch(`/api/baocao/booking?spot=${spot}`, {
        id: b.id,
        action: "split",
        mode: "move",
        guests: part,
        toDate: m.toDate,
        services: m.services,
        ticketCodesText: m.codes ?? "",
      });
      setMoving(null);
      const no =
        (b.remaining ?? 0) > 0
          ? ` Nợ đoàn ${Math.round((b.remaining ?? 0) / 1000).toLocaleString("vi-VN")}k nối theo nhóm dời — thu khi khách đến.`
          : (b.deposit ?? 0) > 0
            ? " Tiền đoàn đã trả tự chia theo giá gộp — phần dư nối theo nhóm dời."
            : "";
      setCollectDone(
        `✓ Đã dời ${part} khách sang ${formatDateKeyVN(m.toDate)} — còn ${b.guestCount - part} khách bay hôm nay.${no}`,
      );
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không dời được");
    } finally {
      setBusy(null);
    }
  }

  /** Hoàn tác: bấm nhầm "đã bay" hoặc "huỷ" thì trả booking về chờ bay. */
  async function restore(b: BookingDTO) {
    const what = b.status === "done" ? "về CHƯA BAY" : "về CHỜ BAY";
    if (!window.confirm(`Hoàn tác booking ${b.contactName || ""} ${what}?`)) return;
    setBusy(b.id);
    setError(null);
    try {
      await apiPatch(`/api/baocao/booking?spot=${spot}`, { id: b.id, action: "restore" });
      setCollectDone("✓ Đã hoàn tác — booking trở lại danh sách chờ bay.");
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không hoàn tác được");
    } finally {
      setBusy(null);
    }
  }

  const title = <>🛫 Booking bay ngày {formatDateKeyVN(date)} ({stats.join(" - ")})</>;
  const body = (
    <>
      <p className="mt-0.5 text-[11px] text-sky-800/70">
        Chỉ gồm khách ĐẶT TRƯỚC — khách đến đột xuất bay luôn thì vẫn báo số chuyến/dịch vụ trong báo cáo ngày
        như thường, không cần khớp với danh sách này.
      </p>
      {/* MỘT HÀNG gọn: ô tìm + xếp + các bộ lọc (luật chủ 04/09) — flex-wrap
          nên màn hẹp tự xuống dòng, màn rộng nằm chung một dải. */}
      {rows.length > 1 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
          <TextInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="🔍 Tìm tên · SĐT · mã booking"
            className="h-8 w-full rounded-lg text-sm sm:w-60"
          />
          {needle && (
            <span className="shrink-0 text-xs font-semibold text-sky-800">
              {open.length + closed.length} kết quả
              <button type="button" className="ml-1.5 text-slate-500 underline" onClick={() => setQ("")}>
                xoá
              </button>
            </span>
          )}
          {/* Chuyển kiểu xem: THẺ (đủ nút thao tác) ↔ BẢNG kiểu Excel (quét mắt, xếp theo cột) */}
          <span className="flex h-7 overflow-hidden rounded-md border border-slate-300">
            {(
              [
                ["cards", "☰ Thẻ"],
                ["table", "▦ Bảng"],
              ] as Array<["cards" | "table", string]>
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => switchView(v)}
                className={
                  viewMode === v
                    ? "bg-slate-700 px-2 text-[11px] font-bold text-white"
                    : "bg-white px-2 text-[11px] font-medium text-slate-500 hover:bg-slate-50"
                }
              >
                {label}
              </button>
            ))}
          </span>
          <span className="text-sky-800/70">Xếp:</span>
          {(
            [
              ["seq", "Số booking"],
              ["flown", "Đã bay trước"],
              ["ticket", "🎫 Đã xuất vé trước"],
            ] as Array<["seq" | "flown" | "ticket", string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSortBy(key)}
              className={
                sortBy === key
                  ? "rounded-md bg-sky-600 px-2 py-0.5 font-semibold text-white"
                  : "rounded-md border border-sky-300 bg-white px-2 py-0.5 font-medium text-sky-800 hover:bg-sky-50"
              }
            >
              {label}
            </button>
          ))}
          {/* LỌC PPG — mọi vai trò: PPG khác giá, khác phi công, soát riêng một phát ra hết */}
          {(() => {
            const ppgRows = rows.filter(isPpgBooking);
            const ppgGuests = ppgRows.reduce(
              (t, b) => t + (b.flightKind === "ppg" ? b.guestCount : Math.min(b.guestCount, b.ppgGuests || 0)),
              0,
            );
            if (!ppgRows.length && !onlyPpg) return null;
            return (
              <button
                type="button"
                onClick={() => setOnlyPpg((v) => !v)}
                className={
                  onlyPpg
                    ? "rounded-md bg-indigo-600 px-2 py-0.5 font-bold text-white"
                    : "rounded-md border border-indigo-300 bg-white px-2 py-0.5 font-semibold text-indigo-700 hover:bg-indigo-50"
                }
                title="Chỉ hiện booking có khách bay PPG (cả đoàn PPG lẫn đoàn PG chở kèm khách PPG)"
              >
                🪂 PPG ({ppgRows.length} book · {ppgGuests}k)
              </button>
            );
          })()}
          {/* LỌC ĐÃ XUẤT VÉ — bật là tự chuyển xếp theo giờ xuất = thứ tự khách đến */}
          {(() => {
            const n = rows.filter((b) => b.ticketIssued && b.status !== "cancelled").length;
            if (!n && !onlyTicketed) return null;
            return (
              <button
                type="button"
                onClick={() => {
                  setOnlyTicketed((v) => !v);
                  if (!onlyTicketed) setSortBy("ticket");
                }}
                className={
                  onlyTicketed
                    ? "rounded-md bg-emerald-600 px-2 py-0.5 font-bold text-white"
                    : "rounded-md border border-emerald-300 bg-white px-2 py-0.5 font-semibold text-emerald-700 hover:bg-emerald-50"
                }
                title="Chỉ hiện booking đã xuất vé, xếp theo giờ xuất — chính là thứ tự khách đến quầy"
              >
                🎫 Đã xuất vé ({n})
              </button>
            );
          })()}
          {/* LỌC TRUY THU — chỉ kế toán: booking còn nợ, nhất là ĐÃ BAY chưa trả hết */}
          {canLock &&
            (() => {
              const unpaid = rows.filter((b) => (b.remaining ?? 0) > 0 && b.status !== "cancelled");
              const owed = unpaid.reduce((t, b) => t + (b.remaining ?? 0), 0);
              if (!unpaid.length && !onlyUnpaid) return null;
              return (
                <button
                  type="button"
                  onClick={() => setOnlyUnpaid((v) => !v)}
                  className={
                    onlyUnpaid
                      ? "rounded-md bg-rose-600 px-2 py-0.5 font-bold text-white"
                      : "rounded-md border border-rose-300 bg-white px-2 py-0.5 font-semibold text-rose-700 hover:bg-rose-50"
                  }
                  title="Chỉ hiện booking còn nợ tiền — truy thu trước khi khách rời bãi"
                >
                  💰 Chưa thu đủ ({unpaid.length} book · {Math.round(owed / 1000).toLocaleString("vi-VN")}k)
                </button>
              );
            })()}
        </div>
      )}
      {error && (
        <div className="mt-2">
          <Banner tone="error">{error}</Banner>
        </div>
      )}
      {collectDone && (
        <div className="mt-2">
          <Banner tone="success" onClose={() => setCollectDone(null)}>
            {collectDone}
          </Banner>
        </div>
      )}
      {/* GRID chứ không phải CSS columns: columns chảy theo CHIỀU CAO nên một
          dòng nở ra (bấm "thêm"/thu tiền) là các dòng sau nhảy từ cột này sang
          cột kia — người đang nhìn dễ bấm nhầm booking (chuyện thật 03/09).
          Grid gán ô theo THỨ TỰ: dòng nở chỉ đẩy dọc, không ai đổi cột. */}
      {viewMode === "table" ? (
        <BookingDayTable open={open} closed={closed} movedOut={movedOut.filter(matchQ)} />
      ) : (
      <ul className={"mt-2" + (rows.length >= 8 ? " lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-3" : "")}>
        {openShown.map((b, i) => (
          <li
            key={b.id}
            /* Đã khoá = kế toán soát xong, không ai đụng nữa: cho mờ để mắt lướt
               qua, dồn sự chú ý vào những dòng còn phải làm. */
            className={
              "mb-1.5 break-inside-avoid rounded-lg bg-white px-2.5 py-1.5" +
              (b.locked ? " opacity-60" : "") +
              // BOOKING MỚI chưa thấy trên máy này: viền + nền nổi hẳn cho tới lần mở trang sau
              (isNewBooking(b) ? " border-2 border-emerald-500 bg-emerald-50" : "")
            }
            style={{ display: "flow-root" }}
          >
            {moving?.id === b.id ? (
              /* Khách dời lịch: chọn ngày mới — cả đoàn hoặc chỉ vài người */
              <div className="float-right ml-2 flex w-56 flex-wrap items-center justify-end gap-1 rounded-lg border border-amber-300 bg-amber-50/70 p-1.5">
                {b.guestCount > 1 && (
                  <div className="flex h-7 w-full overflow-hidden rounded-lg border border-slate-300">
                    {(
                      [
                        [0, "Dời cả đoàn"],
                        [1, "Dời một phần"],
                      ] as Array<[number, string]>
                    ).map(([v, label]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setMoving({ ...moving, guests: v })}
                        className={
                          (moving.guests ?? 0) > 0 === (v > 0)
                            ? "flex-1 bg-amber-600 px-1 text-[11px] font-bold text-white"
                            : "flex-1 bg-white px-1 text-[11px] font-medium text-slate-500"
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
                {(moving.guests ?? 0) > 0 && (
                  <label className="flex w-full items-center gap-1.5 text-[11px] font-semibold text-amber-900">
                    Số khách dời:
                    <MiniCount
                      value={moving.guests ?? 1}
                      onChange={(v) => setMoving({ ...moving, guests: Math.min(v, b.guestCount - 1) })}
                      max={Math.max(1, b.guestCount - 1)}
                    />
                  </label>
                )}
                {/* QUY TẮC TIỀN khi tách dời (tự động, không phải chọn): giá giữ
                    theo GỘP ĐOÀN (bảo toàn chiết khấu); phần ở lại được trả trước
                    từ tiền đoàn, phần còn lại — dư đã trả lẫn nợ — NỐI theo nhóm
                    dời sang ngày mới. Báo trước cho người bấm biết. */}
                {(moving.guests ?? 0) > 0 && ((b.remaining ?? 0) > 0 || (b.deposit ?? 0) > 0) && (
                  <p className="w-full rounded-lg border border-sky-200 bg-sky-50/70 p-1 text-[11px] leading-snug text-sky-900">
                    {(b.remaining ?? 0) > 0
                      ? `Đoàn còn nợ ${Math.round((b.remaining ?? 0) / 1000).toLocaleString("vi-VN")}k — nợ sẽ NỐI theo nhóm dời, thu khi khách đến ngày mới.`
                      : "Tiền đoàn đã trả sẽ tự chia: phần ở lại giữ đúng giá trị, phần dư nối theo nhóm dời — khỏi thu lại."}
                  </p>
                )}
                {/* DỊCH VỤ MANG THEO nhóm dời (luật chủ 04/09): chia đều (mỗi
                    khách 1 suất) thì mặc định chia theo đầu khách dời; KHÔNG
                    chia đều thì máy không đoán được của ai — tô vàng bắt xác
                    nhận số lượng. */}
                {(moving.guests ?? 0) > 0 &&
                  (
                    [
                      ["flycam", "Flycam"],
                      ["video360", "Cam360"],
                      ["redFlag", "Cờ đỏ"],
                      ["sunset", "H.hôn"],
                      ["flagFlight", "Kéo cờ"],
                    ] as Array<[keyof BookingDTO & string, string]>
                  ).some(([k]) => Number(b[k]) > 0) && (
                    <div className="w-full rounded-lg border border-indigo-200 bg-indigo-50/70 p-1">
                      <p className="text-[11px] font-semibold text-indigo-900">Dịch vụ mang theo nhóm dời:</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        {(
                          [
                            ["flycam", "Flycam"],
                            ["video360", "Cam360"],
                            ["redFlag", "Cờ đỏ"],
                            ["sunset", "H.hôn"],
                            ["flagFlight", "Kéo cờ"],
                          ] as Array<[keyof BookingDTO & string, string]>
                        )
                          .filter(([k]) => Number(b[k]) > 0)
                          .map(([k, label]) => {
                            const have = Number(b[k]) || 0;
                            const part = moving.guests ?? 0;
                            const stay = b.guestCount - part;
                            const min = Math.max(0, have - stay);
                            const max = Math.min(have, part);
                            const even = have === b.guestCount;
                            const val = Math.min(max, Math.max(min, moving.services?.[k] ?? (even ? max : min)));
                            const needsConfirm = !even && moving.services?.[k] === undefined;
                            return (
                              <label
                                key={k}
                                className={
                                  "flex items-center gap-1 rounded px-1 text-[11px] font-medium " +
                                  (needsConfirm ? "bg-amber-100 text-amber-900" : "text-indigo-900")
                                }
                                title={
                                  even
                                    ? "Mỗi khách 1 suất — máy chia theo đầu khách dời, sửa được"
                                    : "Dịch vụ KHÔNG chia đều theo khách — xác nhận số mang theo"
                                }
                              >
                                {needsConfirm ? "⚠ " : ""}
                                {label}
                                <MiniCount
                                  value={val}
                                  onChange={(v) =>
                                    setMoving({
                                      ...moving,
                                      services: { ...moving.services, [k]: Math.min(max, Math.max(min, v)) },
                                    })
                                  }
                                  max={max}
                                />
                                <span className="text-slate-400">/{have}</span>
                              </label>
                            );
                          })}
                      </div>
                    </div>
                  )}
                {/* ĐÃ XUẤT VÉ thì hỏi MÃ VÉ MANG THEO (luật chủ 04/09): huỷ là
                    thu hồi mã, dời là vé đi theo khách — có mã thì ngày cũ đếm
                    "vé dời", ngày mới tự khớp khi phi công khai đúng mã ấy. */}
                {b.ticketIssued && (
                  <div className="w-full rounded-lg border border-amber-300 bg-amber-100/70 p-1">
                    <p className="text-[11px] font-semibold text-amber-900">
                      🎫 Đoàn ĐÃ XUẤT VÉ — ghi mã vé khách dời mang theo:
                    </p>
                    <TextInput
                      value={moving.codes ?? ""}
                      onChange={(e) => setMoving({ ...moving, codes: e.target.value.toUpperCase() })}
                      placeholder="MBL0123 MBL0124 — thiếu mã thì ngày mới không tự khớp vé"
                      autoCapitalize="characters"
                      spellCheck={false}
                      className="mt-0.5 h-7 w-full rounded-lg text-[11px]"
                    />
                  </div>
                )}
                {/* Dời được cả VỀ NGÀY CŨ HƠN: 25 dự báo mưa thì cho khách bay
                    23. Chặn duy nhất là ngày kế toán đã chốt (máy chủ soát cả
                    ngày cũ lẫn ngày mới) — ở đây chỉ chặn lùi quá 30 ngày để
                    bắt lỗi gõ nhầm tháng/năm. */}
                <input
                  type="date"
                  value={moving.toDate}
                  min={shiftDateKey(todayInVN(), -30)}
                  onChange={(e) => setMoving({ ...moving, toDate: e.target.value })}
                  className="h-8 flex-1 rounded-lg border border-slate-300 bg-white px-2 text-xs"
                />
                {moving.toDate && moving.toDate < b.flightDate && (
                  <span className="w-full text-[11px] font-semibold text-amber-800">
                    ⇠ Dời SỚM hơn ngày đang đặt — được, miễn ngày {formatDateKeyVN(moving.toDate)} chưa bị kế toán chốt.
                  </span>
                )}
                {/* Dời lịch có thể phát sinh phí (xe đã chạy) — khách trả thêm, không hoàn */}
                <div className="flex w-full flex-wrap items-center gap-1">
                  <span className="text-[11px] font-semibold text-emerald-800">Phí TM</span>
                  <span className="w-20">
                    <MoneyInput value={moving.feeCash ?? 0} onChange={(v) => setMoving({ ...moving, feeCash: v })} />
                  </span>
                  <span className="text-[11px] font-semibold text-indigo-800">CK</span>
                  <span className="w-20">
                    <MoneyInput
                      value={moving.feeTransfer ?? 0}
                      onChange={(v) => setMoving({ ...moving, feeTransfer: v })}
                    />
                  </span>
                </div>
                {(moving.feeTransfer ?? 0) > 0 && (
                  <TextInput
                    value={moving.feeCode ?? ""}
                    onChange={(e) => setMoving({ ...moving, feeCode: e.target.value })}
                    placeholder="Mã giao dịch"
                    className="h-7 w-full rounded-lg text-[11px]"
                  />
                )}
                <TextInput
                  value={moving.note ?? ""}
                  onChange={(e) => setMoving({ ...moving, note: e.target.value })}
                  placeholder="Ghi chú · lý do dời…"
                  className="h-7 w-full rounded-lg text-[11px]"
                />
                <Button
                  type="button"
                  className="h-7 px-2 text-xs"
                  disabled={busy === b.id || !moving.toDate}
                  onClick={() => moveBooking(b, moving)}
                >
                  {busy === b.id ? "Đang lưu…" : "✓ Đổi"}
                </Button>
                <Button type="button" variant="ghost" className="h-7 bg-white px-2 text-xs" onClick={() => setMoving(null)}>
                  Thôi
                </Button>
              </div>
            ) : (
              /* Hai khối nút NỔI riêng: hàng trên Đã bay · Đổi lịch · Chuyển, hàng
                 dưới Huỷ · Sửa (hẹp hơn) — chữ chảy quanh, tràn tới sát nút Huỷ. */
              <>
              {b.locked && !canLock ? (
                /* ĐÃ KHOÁ: cất hết nút sửa cho khỏi bấm rồi mới biết bị chặn —
                   chỉ còn nút mở khoá của kế toán. KẾ TOÁN thì vẫn thấy đủ nút:
                   lỗi cần sửa hay lộ ra đúng lúc soát, bắt mở khoá rồi khoá lại
                   là ba bước cho một việc. */
                <div className="float-right ml-2 flex items-center gap-1">{lockButton(b)}</div>
              ) : (
              <>
              <div className="float-right ml-2 flex max-w-full flex-wrap items-center justify-end gap-1">
                <Button
                  type="button"
                  className="h-7 bg-emerald-600 px-2 text-xs hover:bg-emerald-700"
                  disabled={busy === b.id}
                  onClick={() => act(b, "flown")}
                >
                  {busy === b.id ? "Đang lưu…" : "✈ Đã bay"}
                </Button>
                <ContactNote spot={spot} booking={b} onDone={load} />
                {/* Nút gửi mail đứng NGAY trên dòng, không giấu trong "⋯ Thêm":
                    sửa xong mà nút nằm sau một lần bấm nữa thì không ai nhớ
                    bấm, khách chẳng bao giờ được báo. Tự ẩn khi không có gì
                    phải báo nên dòng booking không dài thêm vô ích. */}
                <NotifyGuestControl spot={spot} booking={b} onDone={load} />
                <RowMenu
                  booking={b}
                  spot={spot}
                  onMove={() => setMoving({ id: b.id, toDate: "" })}
                  onEdit={() => requestEditBooking(b)}
                  onDone={(msg) => {
                    if (msg) setCollectDone(msg);
                    load();
                  }}
                />
              </div>
              <div className="float-right clear-right ml-2 mt-1 flex max-w-full flex-wrap items-center justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  className={
                    "h-7 px-2 text-xs font-semibold " +
                    (b.noTicketFlight
                      ? "border-orange-400 bg-orange-100 text-orange-900"
                      : b.ticketIssued
                        ? "border-amber-400 bg-amber-100 text-amber-900"
                        : "bg-white text-slate-600")
                  }
                  disabled={busy === b.id}
                  onClick={() => act(b, "ticket")}
                  title={
                    b.ticketIssued
                      ? `Đã xuất vé${b.ticketIssuedBy ? ` (${b.ticketIssuedBy})` : ""} — bấm để bỏ tích nếu lỡ tay`
                      : "Khách đến lấy vé thì bấm — để cả quầy biết ai lấy vé rồi"
                  }
                >
                  {b.noTicketFlight
                    ? `🎫✕ Không vé${b.noTicketBy ? ` by ${b.noTicketBy}` : ""}`
                    : b.ticketIssued
                      ? `🎫 Đã xuất vé ✓${b.ticketIssuedBy ? ` by ${b.ticketIssuedBy}` : ""}`
                      : "🎫 Xuất vé"}
                </Button>
                {lockButton(b)}
                {pilotMoneyButton(b)}
                {canLock && !b.locked && (
                  <CollectFixControl
                    spot={spot}
                    booking={b}
                    onDone={(msg) => {
                      setCollectDone(msg);
                      load();
                    }}
                  />
                )}
                {/* SA PA chưa quản tiền — không có nút thu tiền ở điểm này */}
                {spot !== "sapa" && (
                  <CollectMoneyControl
                    spot={spot}
                    booking={b}
                    onDone={(msg) => {
                      setCollectDone(msg);
                      load();
                    }}
                  />
                )}
              </div>
              </>
              )}
              </>
            )}
            <div className="min-w-0">
              {isNewBooking(b) && (
                <span className="mr-1.5 animate-pulse rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  ✦ BOOKING MỚI
                </span>
              )}
              {/* Số thứ tự đỏ — gọi nhau "booking số 3" là biết ngay dòng nào */}
              <span className="mr-1 text-sm font-bold tabular-nums text-rose-600">{i + 1}.</span>
              <BookingSummary b={b} hideNote dim={b.locked} />
              <AssignedBadge b={b} />
              {b.rescheduledFrom.length > 0 && (
                <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                  dời từ {b.rescheduledFrom.map((d) => formatDateKeyVN(d)).join(", ")}
                  {b.movedBy ? ` by ${b.movedBy}` : ""}
                </span>
              )}
              <span className="ml-1 text-xs text-slate-400">
                — nhập {stampVN(b.createdAt)} bởi {b.createdByName}
              </span>
              {/* Tờ giấy nhớ của điều phối — nằm ngay dưới dòng thông tin khách */}
              {b.contactNote && (
                <div className="mt-1 rounded-lg border border-amber-300 bg-amber-100/80 px-2 py-1 text-xs leading-snug text-amber-900">
                  📝 {b.contactNote}
                  {b.contactedBy && <span className="ml-1 font-semibold text-amber-700">— {b.contactedBy} đã gọi</span>}
                </div>
              )}
              {/* Hồ sơ bảo hiểm từng người bay — checkin xong phải đủ mới cho bay */}
              <InsuranceBox
                spot={spot}
                bookingId={b.id}
                guestCount={b.guestCount}
                preview={{
                  guests: b.insured,
                  approvedAt: b.insuranceApprovedAt,
                  sentAt: b.insuranceSentAt,
                  recalledAt: b.insuranceRecalledAt,
                }}
              />
            </div>
          </li>
        ))}
        {/* Booking mới giờ NỔI LÊN ĐẦU danh sách kèm badge ✦ BOOKING MỚI (xem
            isNewBooking) — không cần ghim phụ dưới này nữa. */}
        {open.length > 10 && !needle && (
          /* [column-span:all]: danh sách chia 2 cột trên desktop nên một <li>
             thường bị dòng chảy cột nhét vào LƯNG CHỪNG cột phải — chủ tìm nút
             "Xem thêm" không thấy, tưởng thẻ không có (chuyện thật 02/09).
             Phá cột cho nút thành thanh ngang trọn chiều rộng. */
          <li className="my-1.5 lg:col-span-2">
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="w-full rounded-lg border-2 border-sky-400 bg-white py-2 text-xs font-bold text-sky-800 hover:bg-sky-100"
            >
              {/* Ghi rõ SỐ KHÁCH đang gập: chủ cộng nhẩm "Tổng 62k" với các dòng
                  nhìn thấy mà không khớp là nghi sổ sai ngay (chuyện thật 02/09) —
                  nút phải tự khai nó đang giấu bao nhiêu khách. */}
              {showAll
                ? "▴ Thu gọn danh sách"
                : `▾ Xem thêm ${open.length - 10} booking (${open.slice(10).reduce((t, b) => t + b.guestCount, 0)} khách đang gập)`}
            </button>
          </li>
        )}

        {/* ĐÃ DỜI SANG NGÀY KHÁC — tô VÀNG (huỷ thì tô ĐỎ). Booking đã nằm ở sổ
            ngày mới rồi; dòng này chỉ là dấu vết để hôm nay không ai tưởng
            khách bốc hơi. KHÔNG tính vào số tổng của ngày. */}
        {movedOut.filter(matchQ).map((b) => (
          <li
            key={`moved-${b.id}`}
            className="mb-1.5 break-inside-avoid rounded-lg border-2 border-amber-400 bg-amber-50 px-2.5 py-1.5"
            style={{ display: "flow-root" }}
          >
            <span className="mr-1.5 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              ↪ ĐÃ DỜI sang {formatDateKeyVN(b.flightDate)}
            </span>
            <BookingSummary b={b} hideNote dim />
            <span className="ml-1 text-[11px] text-amber-800">
              {b.movedBy ? `— ${b.movedBy} dời` : ""} · không tính vào số hôm nay
            </span>
          </li>
        ))}
        {voided.length > 0 && (
          <li className="mt-1 rounded-lg border border-slate-200 bg-white/60 px-2 py-1.5 lg:col-span-2">
            <details>
              <summary className="cursor-pointer text-[11px] font-semibold text-slate-500">
                🗑 Đã bỏ khỏi sổ hôm nay ({voided.length}) — không tính vào thống kê
              </summary>
              <ul className="mt-1 space-y-1">
                {voided.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 font-bold text-slate-700">
                      {/* "trùng — đã gộp" là dấu của các bản ghi CŨ, cách gộp đã bỏ */}
                      {b.voidKind === "duplicate" ? "trùng — đã gộp (cách cũ)" : "nhập nhầm"}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      #{b.daySeq} {b.contactName || b.phone || "khách"} · {b.guestCount} khách
                      {b.voidReason ? ` · “${b.voidReason}”` : ""}
                      {b.voidedBy ? ` · ${b.voidedBy} bỏ` : ""}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-6 shrink-0 bg-white px-2 text-[11px]"
                      disabled={busy === b.id}
                      onClick={() => restore(b)}
                      title="Lấy lại booking này vào danh sách chờ bay"
                    >
                      ↩ Lấy lại
                    </Button>
                  </li>
                ))}
              </ul>
            </details>
          </li>
        )}
        {closed.map((b) => (
          <li
            key={b.id}
            /* HUỶ thì tô ĐỎ, dời thì tô VÀNG (khối bên trên) — hai việc khác hẳn
               nhau về tiền nong nên phải phân biệt được từ xa, đừng bắt người
               đọc dò chữ trong dòng. Đã bay thì để trắng như cũ. */
            className={
              "mb-1.5 flow-root break-inside-avoid rounded-lg px-3 py-1.5" +
              (b.status === "cancelled" ? " border-2 border-rose-400 bg-rose-50" : " bg-white/70") +
              (b.locked ? " opacity-60" : "")
            }
          >
            {/* ĐÃ BAY / ĐÃ HUỶ vẫn sửa và thu tiền được: tiền của chuyến bám vào
                đúng booking này, chặn lại là kế toán phải ghi tay ra ngoài sổ.
                Soát xong thì kế toán bấm 🔓 Khoá — từ đó dòng này đông cứng. */}
            <div className="float-right ml-2 flex max-w-full flex-wrap items-center justify-end gap-1">
              {lockButton(b)}
              {canLock && !b.locked && (
                <CollectFixControl
                  spot={spot}
                  booking={b}
                  onDone={(msg) => {
                    setCollectDone(msg);
                    load();
                  }}
                />
              )}
              {(!b.locked || canLock) && spot !== "sapa" && (
                <CollectMoneyControl
                  spot={spot}
                  booking={b}
                  onDone={(msg) => {
                    setCollectDone(msg);
                    load();
                  }}
                />
              )}
              {(!b.locked || canLock) && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-7 bg-white px-2 text-xs"
                  onClick={() => requestEditBooking(b)}
                >
                  ✎ Sửa
                </Button>
              )}
            </div>
            {/* Bấm nhầm thì có đường lui — khỏi tạo booking mới để chữa (sổ đếm hai lần) */}
            {(!b.locked || canLock) && (
              <Button
                type="button"
                variant="ghost"
                className="float-right ml-2 h-7 bg-white px-2 text-xs font-semibold text-slate-600"
                disabled={busy === b.id}
                onClick={() => restore(b)}
                title="Trả booking về danh sách chờ bay"
              >
                {b.status === "done" ? "↩ Chưa bay" : "↩ Bay lại"}
              </Button>
            )}
            {/* Ghi rõ AI bấm — "đã bay by judy", "huỷ by trucngoc": lệch số còn biết hỏi ai */}
            {b.status === "done" ? (
              <>
                <span className="mr-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                  đã bay ✓{b.doneBy ? ` by ${b.doneBy}` : ""}
                </span>
                {/* Chuyến bay THẬT nhưng không xé vé (hay gặp ở PPG) — phải nói
                    ra, không thì cuối ngày đối chiếu "khách nhiều hơn vé xuất"
                    mà chẳng ai lần ra vì sao. */}
                {b.noTicketFlight && (
                  <span
                    className="mr-1.5 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-900"
                    title={b.noTicketReason ? `Lý do: ${b.noTicketReason}` : undefined}
                  >
                    🎫✕ bay không vé{b.noTicketBy ? ` by ${b.noTicketBy}` : ""}
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="mr-1.5 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                  đã huỷ{b.cancelledBy ? ` by ${b.cancelledBy}` : ""}
                  {b.refundAmount
                    ? ` · hoàn ${Math.round(b.refundAmount / 1000).toLocaleString("vi-VN")}k ${b.refundMethod === "cash" ? "TM" : "CK"}`
                    : ""}
                  {b.cancelTicketCodes?.length ? ` · thu hồi ${b.cancelTicketCodes.join(" ")}` : ""}
                </span>
                {/**
                 * HUỶ RỒI THÌ CÓ VÉ PHẢI THU HỒI KHÔNG — hai chuyện khác hẳn nhau
                 * mà nhìn dòng huỷ không phân biệt được.
                 *
                 * Đã xuất vé: còn một tờ vé ngoài kia phải đòi về, và nó nằm
                 * trong phép tính "vé thu hồi = huỷ + dời". Chưa xuất vé: không
                 * có gì để thu, cũng không tính vào phép ấy.
                 *
                 * Lấy cờ người huỷ tự khai (`cancelTicketIssued`); bản ghi cũ
                 * chưa có cờ thì nhìn sang dấu đã xuất vé của chính booking —
                 * thà báo "đã xuất vé" hơi thừa còn hơn để lọt một tờ vé.
                 */}
                {b.cancelTicketIssued || b.ticketIssued ? (
                  <span className="mr-1.5 rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                    🎫 đã xuất vé
                  </span>
                ) : (
                  <span className="mr-1.5 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                    🎫✕ chưa xuất vé
                  </span>
                )}
              </>
            )}
            <BookingSummary b={b} dim={b.status === "done" || b.locked} />
          </li>
        ))}
      </ul>
      )}
    </>
  );

  if (collapsible) {
    return (
      <details
        open={defaultOpen}
        className="group rounded-2xl border-2 border-sky-400 bg-sky-50 lg:[column-span:all]"
      >
        <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5">
          <span className="text-sm font-bold text-sky-900">{title}</span>
          <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-sky-700">
            <span className="hidden sm:inline group-open:hidden">bấm để xem</span>
            <span aria-hidden className="transition-transform group-open:rotate-180">▾</span>
          </span>
        </summary>
        <div className="border-t border-sky-200 px-3 pb-3">{body}</div>
      </details>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-sky-400 bg-sky-50 p-3 lg:[column-span:all]">
      <h2 className="text-sm font-bold text-sky-900">{title}</h2>
      {body}
    </div>
  );
}

/* ================================================================== */
/* Trang phi công / camera man: lịch ĐƯỢC GIAO cho mình                 */
/* ================================================================== */

/**
 * Banner "lịch được giao cho bạn" — máy chủ tự lọc theo tài khoản đang đăng
 * nhập (phi công/camera man chỉ thấy booking điều phối đã chuyển cho mình).
 */
export function AssignedBookings({
  spot,
  date,
  me,
}: {
  spot: string;
  date: string;
  /** Tài khoản đang đăng nhập — để tách "khách của tôi" khỏi "khách của nhóm". */
  me?: string;
}) {
  const [forDate, setForDate] = useState<BookingDTO[]>([]);
  const [upcoming, setUpcoming] = useState<BookingDTO[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = () =>
      apiGet<{ forDate: BookingDTO[]; upcoming: BookingDTO[] }>(
        `/api/baocao/booking?date=${date}&spot=${spot}&as=crew`,
      )
        .then((r) => {
          if (!alive) return;
          setForDate(r.forDate);
          setUpcoming(r.upcoming.filter((b) => b.flightDate !== date));
        })
        .catch(() => {
          /* chưa được giao lịch nào thì thôi */
        });
    load();
    const timer = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [spot, date, tick]);

  /** Bấm XÁC NHẬN: điều phối biết mình đã đọc lịch và nhận khách. */
  async function accept(b: BookingDTO) {
    setBusy(b.id);
    setMsg(null);
    try {
      await apiPatch(`/api/baocao/booking?spot=${spot}`, { id: b.id, action: "accept" });
      setMsg(`✓ Đã xác nhận nhận khách ${b.contactName || b.bookingCode || ""}.`);
      setTick((n) => n + 1);
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Không xác nhận được");
    } finally {
      setBusy(null);
    }
  }

  if (!forDate.length && !upcoming.length) return null;

  /** Khách của MÌNH đứng trước, khách của đồng đội xếp sau (vẫn xem/thu hộ được). */
  const isMine = (b: BookingDTO) => Boolean(me) && b.assignedToUsername === me;
  /** Máy chủ chỉ trả khách của mình ở Khau Phạ — nhận ra bằng chính dữ liệu nhận được. */
  const crewView = forDate.some((b) => !isMine(b));
  const mine = forDate.filter((b) => isMine(b) && b.status === "open");
  const ordered = [...forDate].sort((a, b) => Number(isMine(b)) - Number(isMine(a)));

  // Nhắc trước 3 ngày: booking đã giao cho mình bay trong hôm nay + 3 ngày tới
  const today = todayInVN();
  const soonLimit = shiftDateKey(today, 3);
  const soon = upcoming.filter((b) => b.flightDate <= soonLimit);
  const later = upcoming.filter((b) => b.flightDate > soonLimit);
  const soonByDate = soon.reduce<Record<string, BookingDTO[]>>((acc, b) => {
    (acc[b.flightDate] ??= []).push(b);
    return acc;
  }, {});

  return (
    <div className="rounded-2xl border-2 border-indigo-400 bg-indigo-50 p-3 lg:[column-span:all]">
      {msg && (
        <div className="mb-2 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-sm font-semibold text-emerald-800">
          {msg}
        </div>
      )}
      {forDate.length > 0 && (
        <>
          <h2 className="text-sm font-bold text-indigo-900">
            🤝 Khách bay ngày {formatDateKeyVN(date)} —{" "}
            {crewView
              ? `của bạn ${mine.length}/${forDate.filter((b) => b.status === "open").length} khách`
              : `${mine.length} khách giao cho bạn`}
          </h2>
          <p className="text-[11px] leading-tight text-indigo-900/70">
            {crewView
              ? "Cả nhóm bay hôm nay nhìn chung một danh sách: chuyển khách cho nhau và thu tiền hộ nhau được."
              : "Chỉ hiện khách điều phối giao cho bạn. Giá cả và nguồn khách do quầy giữ."}
          </p>
          <ul className="mt-2 space-y-1.5">
            {ordered.map((b) => (
              <li key={b.id} className={"rounded-lg bg-white px-3 py-1.5" + (b.status !== "open" || b.locked ? " opacity-60" : "")}>
                {b.status === "done" && (
                  <span className="mr-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">đã bay ✓</span>
                )}
                {b.status === "done" && b.noTicketFlight && (
                  <span className="mr-1.5 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-900">
                    🎫✕ bay không vé
                  </span>
                )}
                {b.status === "cancelled" && (
                  <>
                    <span className="mr-1.5 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">đã huỷ</span>
                    {b.cancelTicketIssued || b.ticketIssued ? (
                      <span className="mr-1.5 rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                        🎫 đã xuất vé
                      </span>
                    ) : (
                      <span className="mr-1.5 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                        🎫✕ chưa xuất vé
                      </span>
                    )}
                  </>
                )}
                {!isMine(b) && b.assignedToName && (
                  <span className="mr-1.5 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                    khách của {b.assignedToName}
                  </span>
                )}
                <BookingSummary b={b} dim={b.status === "done" || b.locked} />
                {/* Phi công đứng ở bãi thường gặp khách trước quầy — nhập bảo hiểm được luôn */}
                <InsuranceBox
                  spot={spot}
                  bookingId={b.id}
                  guestCount={b.guestCount}
                  preview={{
                    guests: b.insured,
                    approvedAt: b.insuranceApprovedAt,
                    sentAt: b.insuranceSentAt,
                    recalledAt: b.insuranceRecalledAt,
                  }}
                />
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                  <span>giao bởi {b.assignedBy || "điều phối"}</span>
                  {/* Nhóm tự san khách tại bãi — khỏi gọi điều phối mỗi lần đổi */}
                  {b.status === "open" && (
                    <AssignControl spot={spot} booking={b} onDone={() => setTick((n) => n + 1)} />
                  )}
                </div>

                {b.status === "open" && (
                  <>
                    {/* Chưa bấm nhận: nút TO — điều phối cần biết mình đã đọc lịch */}
                    {!isMine(b) ? null : !b.acceptedAt ? (
                      <button
                        type="button"
                        disabled={busy === b.id}
                        onClick={() => accept(b)}
                        className="mt-1.5 w-full rounded-xl bg-indigo-600 px-3 py-2.5 text-base font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
                      >
                        {busy === b.id ? "Đang xác nhận…" : "🙋 Bạn được giao khách — BẤM XÁC NHẬN"}
                      </button>
                    ) : (
                      <div className="mt-1 text-xs font-semibold text-emerald-700">
                        ✓ Bạn đã nhận khách này{b.acceptedBy ? ` (${b.acceptedBy})` : ""}
                      </div>
                    )}

                    {/* Còn phải thu: nhắc TO, kèm nút thu ngay tại đây */}
                    {b.remaining > 0 && (
                      <div
                        className={
                          "mt-1.5 rounded-xl px-3 py-2 " +
                          (isMine(b) ? "border-2 border-rose-400 bg-rose-50" : "border border-slate-300 bg-slate-50")
                        }
                      >
                        <div
                          className={
                            isMine(b)
                              ? "text-base font-bold leading-snug text-rose-800"
                              : "text-sm font-semibold leading-snug text-slate-700"
                          }
                        >
                          {isMine(b)
                            ? `💰 Bạn nhớ thu tiền khách này: ${b.remaining.toLocaleString("vi-VN")} đ`
                            : `💰 Khách của ${b.assignedToName || "đồng đội"} còn thu ${b.remaining.toLocaleString("vi-VN")} đ — thu hộ được`}
                        </div>
                        <p className="mt-0.5 text-[11px] leading-tight text-rose-900/70">
                          Thu tiền mặt thì tiền tính vào phần bạn đang giữ · khách chuyển khoản vào TK công ty thì
                          KHÔNG tính vào bạn (nhớ ghi mã giao dịch).
                        </p>
                        {/* Đưa mã QR cho khách quét ngay tại bãi — khỏi đọc số tài khoản */}
                        <div className="mt-1.5">
                          <PaymentQrButton
                            amount={b.remaining}
                            note={buildTransferNote({
                              spot: b.spot,
                              flightDate: b.flightDate,
                              daySeq: b.daySeq,
                              bookingCode: b.bookingCode,
                              phone: b.phone,
                            })}
                            purpose={`Tiền bay — ${b.contactName || b.phone || "khách"}`}
                            label="QR cho khách quét"
                            className="h-9 w-full border-sky-300 bg-white text-sm font-bold text-sky-700"
                          />
                        </div>
                        <div className="mt-1.5">
                          <CollectMoneyControl
                            spot={spot}
                            booking={b}
                            big={isMine(b)}
                            onDone={(m) => {
                              setMsg(m);
                              setTick((n) => n + 1);
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {soon.length > 0 && (
        <div className={forDate.length > 0 ? "mt-2.5 border-t border-indigo-200 pt-2" : ""}>
          <h2 className="text-sm font-bold text-indigo-900">🔔 Lịch bay tới đây của bạn — được giao khách:</h2>
          <ul className="mt-1.5 space-y-1.5">
            {Object.entries(soonByDate).map(([d, list]) => (
              <li key={d} className="rounded-lg bg-white px-3 py-1.5">
                <div className="text-xs font-bold text-indigo-800">
                  ✈️ Ngày {formatDateKeyVN(d)}{d === today ? " (hôm nay)" : ""} — {list.reduce((t, b) => t + b.guestCount, 0)} khách:
                </div>
                <ul className="mt-0.5 space-y-0.5">
                  {list.map((b) => (
                    <li key={b.id}>
                      <BookingSummary b={b} />
                      <span className="ml-1 text-[11px] text-slate-400">giao bởi {b.assignedBy || "điều phối"}</span>
                      {/* Lịch mai/kia cũng xác nhận được ngay, khỏi đợi tới ngày bay */}
                      {b.status === "open" &&
                        (b.acceptedAt ? (
                          <span className="ml-1 text-[11px] font-semibold text-emerald-700">✓ đã nhận</span>
                        ) : (
                          <button
                            type="button"
                            disabled={busy === b.id}
                            onClick={() => accept(b)}
                            className="ml-1 rounded-lg bg-indigo-600 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
                          >
                            {busy === b.id ? "…" : "🙋 Xác nhận nhận khách"}
                          </button>
                        ))}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}

      {later.length > 0 && (
        <div className="mt-2">
          <div className="text-[11px] font-semibold text-indigo-800">Xa hơn:</div>
          <ul className="mt-1 space-y-1">
            {later.map((b) => (
              <li key={b.id} className="rounded-lg bg-white/70 px-3 py-1">
                <BookingSummary b={b} withDate />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* Thẻ nhập booking mới + danh sách sắp tới                            */
/* ================================================================== */

/** Bộ đếm nhỏ cho hàng PG/PPG — vừa nửa hàng lưới, đứng cạnh ô Điểm bay. */
function MiniCount({ value, onChange, max = 100 }: { value: number; onChange: (v: number) => void; max?: number }) {
  const clamp = (n: number) => Math.max(0, Math.min(max, Math.trunc(n) || 0));
  const btn = "h-8 w-6 shrink-0 rounded border border-slate-300 bg-white text-sm font-semibold text-slate-600 active:bg-slate-200";
  return (
    /* Ô số đứng trước trong mã, nút − đẩy sang trái bằng `order` — bấm vào chữ
       nhãn của <Field> thì trúng ô số chứ không trúng dấu − (xem CountInput). */
    <span className="inline-flex items-center gap-0.5">
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value.replace(/\D/g, ""))))}
        className="order-2 h-8 w-8 rounded border border-slate-300 bg-white text-center text-sm font-bold tabular-nums"
      />
      <button type="button" className={btn + " order-1"} aria-label="Giảm 1" onClick={() => onChange(clamp(value - 1))}>−</button>
      <button type="button" className={btn + " order-3"} aria-label="Thêm 1" onClick={() => onChange(clamp(value + 1))}>＋</button>
    </span>
  );
}

/**
 * Tổng tiền của form: giá PG (ô đơn giá) × khách PG + bảng giá PPG × khách PPG
 * − combo − giảm trừ.
 *
 * `spot` + `bookedAt` chỉ để tra BẢNG GIÁ DỊCH VỤ theo điểm + thời điểm (cả ba
 * điểm đổi giá dù cờ đỏ trong ngày 26/08/2026, mỗi điểm một mốc giờ; booking cũ
 * giữ giá cũ) — thiếu chúng thì máy dùng bảng chung và tổng trên form sẽ lệch
 * với tổng máy chủ tính lại lúc lưu.
 * Booking đang sửa thì truyền `createdAt` của chính nó; form lập mới thì truyền
 * thời điểm hiện tại.
 */
function totalOf(f: {
  flightDate: string;
  flightKind: BookingDTO["flightKind"];
  ppgGuests: number;
  guestCount: number;
  unitPrice: number;
  mountainCar: number;
  flycam: number;
  video360: number;
  redFlag: number;
  flagFlight: number;
  sunset: number;
  pickupFee: number;
  discount: number;
  comboDiscount: number;
}, spot?: string, bookedAt?: string | Date | null): number {
  return computeBookingTotal({
    ...f,
    spot,
    createdAt: bookedAt,
    ppgGuests: f.flightKind === "ppg" ? 0 : f.ppgGuests,
    ppgUnitPrice: flightUnitPrice("ppg", f.flightDate),
  });
}

type BookingForm = {
  flightDate: string;
  source: string;
  contactName: string;
  bookingCode: string;
  guestCount: number;
  /** Khách PPG khi nhóm trộn PG + PPG (Khau Phạ) — 0 nếu cả nhóm một loại. */
  ppgGuests: number;
  /** Tiền giảm combo flycam+360 — máy điền sẵn theo min(flycam,360)×100k, sửa tay được. */
  comboDiscount: number;
  flycam: number;
  video360: number;
  redFlag: number;
  sunset: number;
  flagFlight: number;
  pickup: BookingDTO["pickup"];
  pickupNote: string;
  phone: string;
  expectedTime: string;
  /** PG hay PPG — quyết định đơn giá theo ngày bay. */
  flightKind: FlightKind;
  /** Phí đưa đón thu của khách. */
  pickupFee: number;
  /** Số suất xe lên núi (chỉ Hà Nội) — 150k/khách. */
  mountainCar: number;
  /** Đơn giá một khách (máy điền theo loại hình + ngày bay, sửa được). */
  unitPrice: number;
  discount: number;
  deposit: number;
  /** Cọc gõ tay đi đường nào — quầy bấm TM/CK ngay cạnh ô tiền. */
  depositMethod: "cash" | "transfer" | "";
  /** Email khách — app gửi thư báo mỗi khi booking thay đổi. */
  email: string;
  /** Ngày khách TRẢ cọc khi khác ngày lập booking. Trống = đúng hôm lập. */
  depositDate: string;
  remaining: number;
  /** Khách đã trả cho ĐẠI LÝ — trừ vào còn thu, đại lý nợ công ty. */
  agencyPaidAmount: number;
  agencyName: string;
  transferCode: string;
  /** Còn lại > 0: người được chỉ định thu trước khi bay + lời nhắn cho họ. */
  collectorUsername: string;
  collectorNote: string;
  note: string;
};

function emptyBooking(today: string, spot: string): BookingForm {
  return {
    flightDate: today,
    source: "",
    contactName: "",
    bookingCode: "",
    guestCount: 0,
    ppgGuests: 0,
    comboDiscount: 0,
    flycam: 0,
    video360: 0,
    redFlag: 0,
    sunset: 0,
    flagFlight: 0,
    pickup: "self",
    pickupNote: "",
    phone: "",
    expectedTime: "",
    flightKind: defaultFlightKind(spot),
    pickupFee: 0,
    mountainCar: 0,
    unitPrice: flightUnitPrice(defaultFlightKind(spot), today),
    discount: 0,
    deposit: 0,
    depositMethod: "",
    email: "",
    /**
     * Mặc định HÔM NAY chứ không để trống: gần như mọi khoản cọc đều trả đúng
     * hôm lập booking, mà ô trống thì người nhập phải đoán xem trống nghĩa là
     * gì. Bấm vào đổi sang ngày khác khi khách trả hôm trước.
     */
    depositDate: todayInVN(),
    remaining: 0,
    agencyPaidAmount: 0,
    agencyName: "",
    transferCode: "",
    collectorUsername: "",
    collectorNote: "",
    note: "",
  };
}

export function BookingCard({
  spot,
  spotOptions,
  onChanged,
}: {
  spot: string;
  /** Các điểm bay tài khoản này được làm — khách gọi đặt cho điểm nào thì chọn điểm đó. */
  spotOptions?: string[];
  onChanged?: () => void;
}) {
  const today = todayInVN();
  /** Điểm bay của BOOKING — mặc định theo trang, đổi được nếu tài khoản làm nhiều điểm. */
  const [bookSpot, setBookSpot] = useState(spot);
  useEffect(() => setBookSpot(spot), [spot]);
  const spots = spotOptions?.length ? spotOptions : [spot];
  const [form, setForm] = useState<BookingForm>(() => emptyBooking(today, bookSpot));
  const [upcoming, setUpcoming] = useState<BookingDTO[]>([]);
  /**
   * ĐIỂM NÀO ĐANG HIỆN trong danh sách "sắp tới" — mặc định đúng điểm của
   * trang, bấm thêm để xem chồng nhiều điểm (người trực nhiều điểm muốn nhìn
   * một lượt cả ba). Danh sách KHÔNG chạy theo ô "Điểm bay" của form nhập nữa.
   */
  const [listSpots, setListSpots] = useState<string[]>([spot]);
  useEffect(() => setListSpots([spot]), [spot]);
  /** Nhân sự đang làm tại điểm — để chỉ định người thu số "còn lại". */
  const [staff, setStaff] = useState<Array<{ username: string; name: string; roleLabel: string }>>([]);
  const [saving, setSaving] = useState(false);
  /** Dấu "✓ Đã lưu / Đã cập nhật" cạnh nút, tự tắt sau vài giây. */
  const [justSaved, flashSaved] = useDoneFlag();
  const [justSavedEdit, setJustSavedEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  /** Booking vừa lưu xong VÀ còn thay đổi chưa báo khách — để bày nút gửi mail. */
  const [needMail, setNeedMail] = useState<BookingDTO | null>(null);
  const [sendingMail, setSendingMail] = useState(false);
  /** Đang SỬA booking nào trong danh sách sắp tới — nạp vào form phía trên. */
  const [editingId, setEditingId] = useState<string | null>(null);
  /**
   * LÚC BOOKING ĐANG SỬA ĐƯỢC LẬP — quyết bảng giá dịch vụ của nó (dù cờ đỏ đổi
   * giá ngày 26/08/2026, booking cũ giữ giá cũ; xem servicePriceOf).
   * Rỗng = đang lập booking MỚI, ăn bảng giá hiện hành.
   */
  const [editingCreatedAt, setEditingCreatedAt] = useState<string>("");
  /**
   * ĐÃ THU QUA LỆNH THU của booking đang sửa — ô "đã cọc" là số CỘNG DỒN (cọc
   * lúc đặt + mọi lần thu), phải nói ra thì người sửa mới không gõ đè mất.
   */
  const [editedPaid, setEditedPaid] = useState(0);
  const [editedPaidCount, setEditedPaidCount] = useState(0);
  /** Booking đang sửa nằm ở sổ điểm nào — có thể khác điểm của trang khi xem chồng nhiều điểm. */
  const [editingSpot, setEditingSpot] = useState<string>(spot);
  /**
   * Số thứ tự trong ngày của booking đang sửa — chỉ dùng để ghép NỘI DUNG CK
   * ("2508 k3 KLK123"). Booking mới chưa lưu thì máy chủ chưa cấp số, mã QR
   * lúc đó chỉ có ngày bay + mã booking; lưu xong form tự chuyển sang chế độ
   * sửa nên số thứ tự có ngay sau đó.
   */
  const [editingSeq, setEditingSeq] = useState(0);
  /** Người nhập đã tự gõ "còn phải thu" thì máy thôi tự điền số đó. */
  /** Đã gõ đè đơn giá thì máy thôi áp bảng giá theo ngày. */
  const [priceTouched, setPriceTouched] = useState(false);
  /** Danh sách sắp tới dài thì chỉ hiện 5 dòng gần nhất, bấm mới xổ hết. */
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  /** Bấm "Sửa" từ banner hôm nay thì thẻ này phải xổ ra dù đang gập. */
  const [forceOpen, setForceOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  /** Đang kéo booking khách tự đặt trên web về sổ nội bộ. */
  const [syncing, setSyncing] = useState(false);
  /** Lần check web & OTA gần nhất — hiện cạnh nút để biết còn phải bấm không. */
  const [webSyncAt, setWebSyncAt] = useState("");
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  /** Ô NHẬP NHANH: dán một dòng chữ, máy bóc và điền form — người nhập soát rồi lưu. */
  const [quick, setQuick] = useState("");
  /** Đã sửa tay ô giảm combo — máy thôi tự điền lại. */
  const [comboTouched, setComboTouched] = useState(false);
  const [quickMsg, setQuickMsg] = useState<string | null>(null);

  /** Có đang chọn dịch vụ nào không — để nhắc "nhớ nhập số khách". */
  const serviceTotalCount =
    form.flycam + form.video360 + form.redFlag + form.sunset + form.flagFlight + form.mountainCar;

  /** Trần cho mỗi ô dịch vụ: bằng số khách, chưa có số khách thì mở tạm 20. */
  const serviceCap = form.guestCount > 0 ? form.guestCount : 20;

  const set = <K extends keyof BookingForm>(key: K, value: BookingForm[K]) => {
    setDone(null);
    if (key === "unitPrice") setPriceTouched(true);
    if (key === "comboDiscount") setComboTouched(true);
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Combo flycam+360: máy điền lại mỗi khi hai dịch vụ này đổi, trừ khi đã sửa tay
      if (!comboTouched && (key === "flycam" || key === "video360" || key === "guestCount")) {
        next.comboDiscount = comboDiscount(next.flycam, next.video360);
      }
      /**
       * Dịch vụ bám theo đầu khách — giảm số khách thì các dịch vụ tự kẹp xuống.
       * CHƯA nhập số khách (0) thì KHÔNG kẹp: nhân viên nghe khách đọc "2 flycam"
       * hay bấm ⚡ Đọc & điền trước khi biết đủ đầu người là chuyện thường, kẹp
       * về 0 lúc đó là xoá mất thứ vừa nhập.
       */
      if (key === "guestCount" && (Number(value) || 0) > 0) {
        const cap = Number(value) || 0;
        next.flycam = Math.min(next.flycam, cap);
        next.video360 = Math.min(next.video360, cap);
        next.redFlag = Math.min(next.redFlag, cap);
        next.sunset = Math.min(next.sunset, cap);
        next.mountainCar = Math.min(next.mountainCar, cap);
        next.flagFlight = Math.min(next.flagFlight, cap);
      }
      /**
       * Tổng tiền = đơn giá × số khách − giảm trừ (dịch vụ kèm không cộng tiền).
       * "Còn phải thu" tự điền = tổng − đã cọc, nhưng người nhập gõ đè được:
       * khách OTA trả trước hay khách nợ thì con số không theo công thức.
       */
      /** Đơn giá theo BẢNG GIÁ: đổi ngày bay hay loại hình là điền lại, trừ khi người nhập đã gõ đè. */
      if (!priceTouched && (key === "flightDate" || key === "flightKind")) {
        next.unitPrice = flightUnitPrice(next.flightKind, next.flightDate);
      }
      /**
       * "Còn lại" LUÔN tính lại theo luật tổng − cọc, không có ngoại lệ: ô đó chỉ
       * đọc, và máy chủ cũng chốt lại đúng công thức này khi lưu.
       */
      next.remaining = Math.max(0, totalOf(next, bookSpot, editingCreatedAt || new Date().toISOString()) - (next.deposit || 0) - (next.agencyPaidAmount || 0));
      return next;
    });
  };

  /**
   * Danh sách "sắp tới" bám theo ĐIỂM CỦA TRANG, KHÔNG theo ô "Điểm bay" của
   * form nhập.
   *
   * Ô "Điểm bay" chỉ nói booking SẮP NHẬP thuộc điểm nào (người làm nhiều điểm
   * nhận điện thoại đặt hộ). Trước đây danh sách cũng chạy theo ô đó, nên chọn
   * "Hà Nội" một lần để nhập hộ là trang Sa Pa hiện nguyên lịch Hà Nội — nhìn
   * xong tưởng khách của mình, chia người bay là hỏng cả ngày.
   */
  const listKey = listSpots.join(",");
  const load = useCallback(() => {
    type Res = {
      upcoming: BookingDTO[];
      staff?: Array<{ username: string; name: string; roleLabel: string }>;
      webSyncAt?: string;
    };
    const wanted = listKey ? listKey.split(",") : [];
    /**
     * Luôn hỏi thêm ĐIỂM CỦA TRANG dù người dùng bỏ chọn nó: danh sách nhân sự
     * (để giao người thu) và mốc "lấy book từ web lần cuối" là của trang này,
     * không phải của mấy điểm xem ké.
     */
    const fetchSpots = Array.from(new Set([spot, ...wanted]));
    Promise.all(
      fetchSpots.map((s) =>
        apiGet<Res>(`/api/baocao/booking?date=${todayInVN()}&spot=${s}`)
          .then((r) => [s, r] as const)
          .catch(() => [s, null] as const),
      ),
    ).then((pairs) => {
      const bySpot = new Map(pairs);
      const mine = bySpot.get(spot);
      setStaff(mine?.staff ?? []);
      setWebSyncAt(mine?.webSyncAt ?? "");
      const rows = wanted.flatMap((s) => bySpot.get(s)?.upcoming ?? []);
      // Nhiều điểm gộp lại thì xếp lại theo ngày bay rồi giờ bay, không theo điểm
      rows.sort(
        (a, b) =>
          a.flightDate.localeCompare(b.flightDate) || (a.expectedTime || "").localeCompare(b.expectedTime || ""),
      );
      setUpcoming(rows);
    });
  }, [spot, listKey]);

  useEffect(() => {
    load();
  }, [load]);

  /** Nhận lệnh "Sửa" từ banner booking hôm nay: mở thẻ, nạp form, cuộn tới. */
  useEffect(() => {
    const onEdit = (e: Event) => {
      const b = (e as CustomEvent<BookingDTO>).detail;
      if (!b) return;
      startEdit(b);
      setForceOpen(true);
      requestAnimationFrame(() => {
        rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    };
    window.addEventListener(EDIT_EVENT, onEdit);
    return () => window.removeEventListener(EDIT_EVENT, onEdit);
  });

  /**
   * CẢNH BÁO TRÙNG ngay lúc nhập: cùng SĐT (9 số cuối) hoặc cùng tên, cùng ngày
   * bay, cùng điểm. Chặn được phần lớn ca nhập trùng từ gốc — rẻ hơn nhiều so
   * với việc phát hiện sau khi khách đã trả tiền vào hai booking khác nhau.
   */
  const twin = editingId
    ? null
    : upcoming.find(
        (b) =>
          b.flightDate === form.flightDate &&
          b.status !== "voided" &&
          ((form.phone.replace(/\D/g, "").length >= 8 &&
            b.phone.replace(/\D/g, "").slice(-9) === form.phone.replace(/\D/g, "").slice(-9)) ||
            (form.contactName.trim().length >= 3 &&
              b.contactName.trim().toLowerCase() === form.contactName.trim().toLowerCase())),
      );

  /** Tổng tiền hiện trên form — máy chủ tính lại đúng công thức này khi lưu. */
  /** Mốc bảng giá của form: booking đang sửa giữ giá lúc nó lập, form mới ăn giá hiện hành. */
  const formPriceAt = editingCreatedAt || new Date().toISOString();
  const bookingTotal = totalOf(form, bookSpot, formPriceAt);
  const serviceMoney = servicesAmount({ ...form, spot: bookSpot, createdAt: formPriceAt });
  const comboMoney = form.comboDiscount;
  /** Khách PG/PPG đang khai — nhóm thuần PPG lưu kiểu cũ (flightKind "ppg"). */
  const pgCount = form.flightKind === "ppg" ? 0 : Math.max(0, form.guestCount - form.ppgGuests);
  const ppgCount = form.flightKind === "ppg" ? form.guestCount : form.ppgGuests;
  const ppgPrice = flightUnitPrice("ppg", form.flightDate);

  /** Bóc dòng nhập nhanh và điền vào form — KHÔNG tự lưu, người nhập soát lại. */
  function applyQuick() {
    const r = parseQuickBooking(quick, today);
    const targetSpot = r.spot && spots.includes(r.spot) ? r.spot : bookSpot;
    if (targetSpot !== bookSpot) setBookSpot(targetSpot);
    setDone(null);
    setForm((prev) => {
      const next = { ...prev };
      if (r.flightDate && r.flightDate >= today) next.flightDate = r.flightDate;
      if (r.contactName) next.contactName = r.contactName;
      if (r.phone) next.phone = r.phone;
      if (r.expectedTime) next.expectedTime = r.expectedTime;
      if (r.source) next.source = r.source;
      if (r.flycam !== undefined) next.flycam = r.flycam;
      if (r.video360 !== undefined) next.video360 = r.video360;
      if (r.redFlag !== undefined) next.redFlag = r.redFlag;
      if (r.sunset !== undefined) next.sunset = r.sunset;
      if (r.flagFlight !== undefined) next.flagFlight = r.flagFlight;
      if (r.mountainCar !== undefined) next.mountainCar = r.mountainCar;
      if (r.pickup) {
        next.pickup = r.pickup;
        next.pickupNote = r.pickupNote || "";
      }
      if (r.deposit !== undefined) next.deposit = r.deposit;
      if (r.discount !== undefined) next.discount = r.discount;

      // Khách + loại hình: Khau Phạ cho trộn PG/PPG, nơi khác chỉ tổng khách
      if (targetSpot === "khau-pha" && (r.pgCount || r.ppgCount)) {
        const pg = r.pgCount || 0;
        const ppg = r.ppgCount || 0;
        const purePpg = pg === 0 && ppg > 0;
        next.flightKind = purePpg ? "ppg" : "pg";
        next.guestCount = pg + ppg;
        next.ppgGuests = purePpg ? 0 : ppg;
      } else if (r.guestCount) {
        next.guestCount = r.guestCount;
      }
      next.unitPrice = flightUnitPrice(next.flightKind, next.flightDate);
      if (!comboTouched) next.comboDiscount = comboDiscount(next.flycam, next.video360);
      next.remaining = Math.max(0, totalOf(next, bookSpot, editingCreatedAt || new Date().toISOString()) - (next.deposit || 0) - (next.agencyPaidAmount || 0));
      return next;
    });

    const filled = [
      r.flightDate && `ngày ${r.flightDate.split("-").reverse().slice(0, 2).join("/")}`,
      r.contactName,
      r.phone,
      r.guestCount && `${r.guestCount} khách${r.ppgCount ? ` (${r.pgCount || 0}PG+${r.ppgCount}PPG)` : ""}`,
      r.expectedTime && `giờ ${r.expectedTime}`,
      r.deposit && `cọc ${(r.deposit / 1000).toLocaleString("vi-VN")}k`,
      r.discount && `giảm ${(r.discount / 1000).toLocaleString("vi-VN")}k`,
    ].filter(Boolean);
    setQuickMsg(
      filled.length
        ? `✓ Đã điền: ${filled.join(" · ")} — soát lại rồi bấm Lưu.${r.leftover ? ` (chưa hiểu: “${r.leftover}”)` : ""}`
        : "Chưa bóc được gì từ dòng này — nhập tay giúp.",
    );
  }

  /**
   * KHAU PHẠ đặt PG + PPG chung một booking: hai ô số khách, tổng khách tự cộng.
   * Nhóm thuần PPG lưu kiểu cũ (flightKind "ppg", ppgGuests 0) — báo cáo và
   * booking cũ không phải đổi cách đọc.
   */
  function setKindCounts(pg: number, ppg: number) {
    setDone(null);
    setForm((prev) => {
      const purePpg = pg === 0 && ppg > 0;
      const kind: BookingDTO["flightKind"] = purePpg ? "ppg" : "pg";
      const guestCount = pg + ppg;
      const next = {
        ...prev,
        flightKind: kind,
        guestCount,
        ppgGuests: purePpg ? 0 : ppg,
        unitPrice: priceTouched ? prev.unitPrice : flightUnitPrice(kind, prev.flightDate),
      };
      // Giảm khách thì kẹp dịch vụ xuống — nhưng về 0 khách thì để yên (xem set())
      if (guestCount > 0) {
        next.flycam = Math.min(next.flycam, guestCount);
        next.video360 = Math.min(next.video360, guestCount);
        next.redFlag = Math.min(next.redFlag, guestCount);
        next.sunset = Math.min(next.sunset, guestCount);
        next.mountainCar = Math.min(next.mountainCar, guestCount);
        next.flagFlight = Math.min(next.flagFlight, guestCount);
      }
      if (!comboTouched) next.comboDiscount = comboDiscount(next.flycam, next.video360);
      next.remaining = Math.max(0, totalOf(next, bookSpot, editingCreatedAt || new Date().toISOString()) - (next.deposit || 0) - (next.agencyPaidAmount || 0));
      return next;
    });
  }

  /** Kéo booking khách tự đặt trên mebayluon.com/booking vào danh sách chờ bay. */
  /**
   * Một nút kiểm CẢ HAI cửa khách đặt trước: website mebayluon.com (kéo về ngay)
   * và thư OTA (thư do Gmail tự đẩy về ~10 phút/lần — ở đây chỉ ĐẾM xem có thư
   * đang chờ duyệt không và nhắc người ta ngước lên cờ đỏ, chứ app không tự mở
   * hộp thư của công ty được).
   */
  async function syncFromWeb() {
    setSyncing(true);
    setError(null);
    setDone(null);
    try {
      const r = await apiPost<{
        created: number;
        updated: number;
        merged: number;
        cancelled: number;
        skipped: number;
      }>(`/api/baocao/booking/sync-web?spot=${spot}`);
      const webMsg =
        r.created + r.updated + r.merged + r.cancelled === 0
          ? `Web: không có booking mới (${r.skipped} đơn đã có sẵn)`
          : `Web: ${r.created} booking mới` +
            (r.merged ? ` · ${r.merged} gộp vào booking đã nhập tay` : "") +
            (r.updated ? ` · ${r.updated} cập nhật` : "") +
            (r.cancelled ? ` · ${r.cancelled} khách huỷ` : "");

      let otaMsg = "";
      try {
        const ota = await apiGet<{ emails: Array<{ status: string }> }>(`/api/baocao/ota/log?spot=${spot}`);
        const waiting = ota.emails.filter((m) => m.status === "review").length;
        otaMsg = waiting
          ? ` · OTA: ${waiting} thư chờ duyệt — xem cờ đỏ 🚩 đầu trang`
          : " · OTA: không có thư chờ duyệt";
      } catch {
        /* chưa xem được sổ thư thì thôi, phần web vẫn báo */
      }

      setDone(`✓ ${webMsg}${otaMsg}.`);
      load();
      onChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không đồng bộ được booking từ website");
    } finally {
      setSyncing(false);
    }
  }

  /** Trả về id booking vừa lưu — nút "Gửi email" cần nó để gửi ngay sau khi lưu. */
  async function save(): Promise<string | null> {
    setError(null);
    setDone(null);
    /**
     * Dịch vụ không được nhiều hơn số khách — máy chủ cũng chặn, nhưng báo ở đây
     * thì người nhập sửa được ngay tại ô, khỏi mất công gửi đi rồi nhận lỗi.
     */
    if (form.guestCount === 0 && serviceTotalCount > 0) {
      setError("Chưa nhập số khách — dịch vụ tối đa bằng số khách.");
      return null;
    }
    const overService = ([
      ["Flycam", form.flycam],
      ["Cam 360", form.video360],
      ["Dù cờ đỏ", form.redFlag],
      ["Bay hoàng hôn/săn mây", form.sunset],
      ["Bay kéo cờ/bánh", form.flagFlight],
      ["Xe lên núi", form.mountainCar],
    ] as Array<[string, number]>).find(([, n]) => n > form.guestCount);
    if (overService) {
      setError(`${overService[0]}: ${overService[1]} suất nhưng chỉ có ${form.guestCount} khách.`);
      return null;
    }
    /**
     * Giờ dự kiến đã qua chỉ chặn khi NHẬP MỚI (gõ nhầm 07:00 thay vì 17:00).
     * Đang SỬA booking cũ thì không chặn: khách đặt 07:00, trưa gọi lại đổi số
     * khách là chuyện thường — cấm sửa đúng lúc cần sửa nhất thì vô lý.
     */
    if (!editingId && form.flightDate === todayInVN() && form.expectedTime && form.expectedTime < nowHHMMVN()) {
      setError(`Giờ dự kiến ${form.expectedTime} đã qua (bây giờ là ${nowHHMMVN()}) — sửa giờ rồi lưu.`);
      return null;
    }
    /**
     * KHÔNG bắt chọn người thu. Lúc nhận booking thường chưa biết hôm đó ai
     * trực, ai đón đoàn — bắt chọn thì nhân viên phải chọn bừa một cái tên.
     * Để trống thì booking vẫn ghi "còn phải thu", ai thu cũng được: người thu
     * bấm ngay trên dòng booking, hoặc lập lệnh thu sau khi đã rõ người.
     */
    setSaving(true);
    try {
      // Khách lẻ không có mã OTA: để trống thì lấy SĐT làm mã cho dễ tra
      const payload = { ...form, bookingCode: form.bookingCode.trim() || form.phone.trim() };
      /**
       * SA PA chưa quản tiền: gửi lên toàn số 0 cho phần tiền và dịch vụ, và
       * "điểm đón" là chữ tự do nên xếp vào kiểu đón "other". Có vậy dòng tóm tắt
       * mới sạch (không in tổng/cọc/còn thu) và số của Sa Pa không lẫn vào các
       * phép cộng tiền của hai điểm kia.
       */
      if (bookSpot === "sapa") {
        Object.assign(payload, {
          pickup: "other" as const,
          flycam: 0,
          video360: 0,
          redFlag: 0,
          sunset: 0,
          flagFlight: 0,
          mountainCar: 0,
          unitPrice: 0,
          discount: 0,
          comboDiscount: 0,
          pickupFee: 0,
          totalAmount: 0,
          deposit: 0,
          depositMethod: "",
          remaining: 0,
          agencyPaidAmount: 0,
          agencyName: "",
          transferCode: "",
          collectorUsername: "",
          collectorNote: "",
        });
      }
      let savedId: string | null = editingId;
      if (editingId) {
        const res = await apiPut<{ booking: BookingDTO }>(`/api/baocao/booking?spot=${editingSpot || spot}`, {
          id: editingId,
          ...payload,
        });
        setDone(`✓ Đã cập nhật booking ${form.contactName || form.bookingCode || form.source}.`);
        /**
         * Sửa xong mà có thay đổi khách cần biết thì bày NÚT GỬI MAIL ngay
         * tại đây — đúng lúc người sửa còn nhớ mình vừa đổi gì và đã hẹn gì
         * với khách. Bắt họ đóng form, tìm lại dòng booking rồi mới bấm là
         * thêm ba bước cho một việc, và ba bước đó đủ để quên.
         *
         * Vẫn KHÔNG tự gửi: nhiều thay đổi chẳng cần báo ai.
         */
        setNeedMail((res?.booking?.pendingNotify?.length ?? 0) > 0 ? res.booking : null);
      } else {
        const created = await apiPost<{ booking: BookingDTO }>(`/api/baocao/booking?spot=${bookSpot}`, payload);
        /**
         * Lưu xong thì form CHUYỂN SANG CHẾ ĐỘ SỬA chính booking vừa tạo, không
         * xoá trắng nữa: nhân viên hay phải sửa lại ngay (khách đọc thiếu số,
         * đổi giờ, thêm dịch vụ) mà gõ lại từ đầu thì rất dễ sai. Chuyển sang
         * chế độ sửa cũng chặn luôn cảnh bấm lưu lần nữa thành hai booking trùng.
         * Muốn nhập khách mới thì bấm nút "Nhập booking mới" bên cạnh.
         */
        if (created?.booking?.id) {
          savedId = created.booking.id;
          setEditingId(created.booking.id);
          setEditingCreatedAt(created.booking.createdAt || "");
          setEditingSpot(bookSpot);
          setEditingSeq(created.booking.daySeq || 0);
        }
        const collectorName = staff.find((a) => a.username === form.collectorUsername)?.name;
        setDone(
          `✓ Đã lưu booking ${form.contactName || form.bookingCode || form.source} — bay ${formatDateKeyVN(form.flightDate)}.` +
            (bookSpot !== spot
              ? ` Booking này vào sổ điểm ${spotName(bookSpot)} — mở trang điểm đó mới thấy, danh sách dưới đây chỉ của ${spotName(spot)}.`
              : " Lịch bay sẽ tự hiện đúng ngày.") +
            (form.remaining > 0 && collectorName
              ? ` 💰 Đã giao ${collectorName} thu ${form.remaining.toLocaleString("vi-VN")} đ — hiện trên trang của ${collectorName} hôm bay.`
              : form.remaining > 0
                ? ` 💰 Còn thu ${form.remaining.toLocaleString("vi-VN")} đ — chưa giao ai, hôm bay giao cho ai thì người đó thu.`
                : ""),
        );
      }
      setJustSavedEdit(Boolean(editingId));
      flashSaved();
      // Giữ nguyên số liệu đang hiện — xoá trắng là việc của nút "Nhập booking mới"
      load();
      onChanged?.();
      return savedId;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không lưu được booking");
      return null;
    } finally {
      setSaving(false);
    }
  }

  /** Nạp booking vào form phía trên để sửa. */
  function startEdit(b: BookingDTO) {
    setEditingId(b.id);
    setEditingCreatedAt(b.createdAt || "");
    setEditingSeq(b.daySeq || 0);
    setEditingSpot(b.spot || spot);
    if ((b.spot || spot) !== bookSpot) setBookSpot(b.spot || spot);
    /**
     * "CÒN LẠI" LUÔN BÁM LUẬT: còn lại = tổng tiền − đã cọc.
     *
     * Trước đây mở booking ra sửa là khoá luôn ô này ("giữ đúng số đã lưu"), nên
     * đổi loại hình bay hay thêm phí đón thì TỔNG chạy mà CÒN LẠI đứng im — màn
     * hình hiện "tổng 2.190.000 · còn lại 2.340.000", hai số chỏi nhau.
     *
     * Riêng booking cũ chưa có tổng tiền (tổng = 0) thì giữ nguyên số đã lưu —
     * số đó là nợ thật, tính lại thành 0 là xoá mất công nợ.
     */
    setPriceTouched(true);
    setDone(null);
    setError(null);
    setEditedPaid((b.collected ?? []).reduce((t, c) => t + (c.amount || 0), 0));
    setEditedPaidCount(b.collected?.length ?? 0);
    setForm({
      flightDate: b.flightDate,
      source: b.source,
      contactName: b.contactName,
      bookingCode: b.bookingCode,
      guestCount: b.guestCount,
      flycam: b.flycam,
      video360: b.video360,
      redFlag: b.redFlag,
      sunset: b.sunset,
      flagFlight: b.flagFlight,
      pickup: b.pickup,
      pickupNote: b.pickupNote,
      phone: b.phone,
      expectedTime: b.expectedTime,
      flightKind: b.flightKind,
      ppgGuests: b.ppgGuests ?? 0,
      comboDiscount: b.comboDiscount ?? 0,
      pickupFee: b.pickupFee,
      mountainCar: b.mountainCar,
      unitPrice: b.unitPrice,
      discount: b.discount,
      deposit: b.deposit,
      depositMethod: b.depositMethod ?? "",
      email: b.email ?? "",
      /**
       * Sửa booking CŨ thì lấy ngày cọc đang có; chưa gán thì lấy NGÀY LẬP
       * booking — tuyệt đối không điền "hôm nay". Điền hôm nay là mở booking
       * tháng trước ra sửa cái tên mà khoản cọc nhảy sang hôm nay, kế toán
       * mất dấu nó ở ngày cũ.
       */
      depositDate: b.depositDate || (b.createdAt ? toDateKeyVN(new Date(b.createdAt)) : todayInVN()),
      agencyPaidAmount: b.agencyPaidAmount ?? 0,
      agencyName: b.agencyName ?? "",
      remaining: (() => {
        const total = totalOf({
          flightDate: b.flightDate,
          flightKind: b.flightKind,
          ppgGuests: b.ppgGuests ?? 0,
          guestCount: b.guestCount,
          unitPrice: b.unitPrice,
          mountainCar: b.mountainCar,
          flycam: b.flycam,
          video360: b.video360,
          redFlag: b.redFlag,
          flagFlight: b.flagFlight,
          sunset: b.sunset,
          pickupFee: b.pickupFee,
          discount: b.discount,
          comboDiscount: b.comboDiscount ?? 0,
        }, b.spot || spot, b.createdAt);
        return total > 0 ? Math.max(0, total - (b.deposit || 0)) : b.remaining;
      })(),
      transferCode: b.transferCode,
      // Sửa booking KHÔNG lập lại lệnh thu — tránh gửi trùng lệnh cho người thu
      collectorUsername: "",
      collectorNote: "",
      note: b.note,
    });
  }

  async function removeBooking(b: BookingDTO) {
    const name = b.contactName || b.bookingCode || b.source;
    if (!window.confirm(`XOÁ hẳn booking ${name} (bay ${formatDateKeyVN(b.flightDate)})? Không hoàn tác được.`)) return;
    setRowBusy(b.id);
    setError(null);
    try {
      await apiDelete(`/api/baocao/booking?spot=${b.spot || spot}`, { id: b.id });
      if (editingId === b.id) {
        setEditingId(null);
        setEditingCreatedAt("");
        setEditingSeq(0);
        setEditingSpot(bookSpot);
        setForm(emptyBooking(today, bookSpot));
      }
      load();
      onChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không xoá được booking");
    } finally {
      setRowBusy(null);
    }
  }

  return (
    <div ref={rootRef}>
    <CollapseCard
      className="border-sky-300 bg-sky-50/40"
      headerClassName="bg-sky-600 text-white"
      title={
        <span className="inline-flex flex-wrap items-center gap-2">
          📒 BOOKING MỚI
          {/* Nút nằm trong <summary>: chặn toggle thẻ khi bấm */}
          <button
            type="button"
            disabled={syncing}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void syncFromWeb();
            }}
            className="rounded-lg border border-white/50 bg-white/15 px-2 py-0.5 text-xs font-semibold text-white hover:bg-white/25 disabled:opacity-60"
            title="Kéo booking khách đặt trên mebayluon.com + kiểm thư OTA đang chờ duyệt"
          >
            {syncing ? "Đang kiểm…" : "🔄 Lấy book từ website & OTA"}
          </button>
          {webSyncAt && (
            <span className="text-[11px] font-normal text-white/80">
              check lần cuối: {new Date(webSyncAt).toLocaleString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
              })}
            </span>
          )}
        </span>
      }
      open={forceOpen || undefined}
    >
      {/* NHẬP NHANH: dán một dòng "mcc 18.8 tên sđt PG 8h00…" là máy điền hộ */}
      <div className="mb-2 rounded-lg border border-violet-200 bg-violet-50/60 p-2">
        <div className="flex gap-2">
          <TextInput
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
            placeholder="⚡ Nhập nhanh: mcc 18.8 nguyễn trang 0956778444 PG 8h00 đón tại bluehome 2k 2xflycam cọc 300k giảm 200k"
            className="h-10 flex-1 rounded-lg bg-white text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (quick.trim()) applyQuick();
              }
            }}
          />
          <Button
            type="button"
            className="h-10 shrink-0 bg-violet-600 px-3 text-sm font-semibold hover:bg-violet-700"
            disabled={!quick.trim()}
            onClick={applyQuick}
          >
            ⚡ Đọc & điền
          </Button>
        </div>
        {quickMsg && <p className="mt-1 text-[11px] leading-snug text-violet-900">{quickMsg}</p>}
      </div>
      {/* Desktop: trái = cửa sổ nhập booking, phải = lịch bay & booking sắp tới */}
      <div className="@3xl:grid @3xl:grid-cols-2 @3xl:items-start @3xl:gap-4">
      <div className="@container">
      {/**
       * Mỗi hàng một nhóm việc, đọc từ trên xuống là đúng thứ tự hỏi khách.
       * Hàng đầu và hàng cuối 3 ô, hàng giữa 4 ô — NGUỒN đứng cùng hàng với
       * PG/PPG/tổng khách để phần "chuyến bay này là gì, của ai đưa tới" nằm
       * gọn một dòng, không tụt xuống thành dòng lẻ loi.
       */}
      <div className="grid grid-cols-2 gap-2 @md:grid-cols-3">
        <Field label="Ngày bay">
          <TextInput
            type="date"
            value={form.flightDate}
            min={today}
            onChange={(e) => e.target.value && set("flightDate", e.target.value)} className="h-10 rounded-lg text-sm"
          />
        </Field>
        <Field label={bookSpot === "sapa" ? "Giờ đón" : "Giờ dự kiến"}>
          <TextInput
            type="time"
            value={form.expectedTime}
            min={form.flightDate === todayInVN() ? nowHHMMVN() : undefined}
            onChange={(e) => set("expectedTime", e.target.value)} className="h-10 rounded-lg text-sm"
          />
        </Field>
        <Field label={<span className="text-rose-700">Điểm bay ★</span>}>
          <select
            value={bookSpot}
            onChange={(e) => {
              const next = e.target.value;
              setBookSpot(next);
              // Đổi điểm: lựa chọn đón kiểu HN hết hợp lệ, và loại hình bay khác hẳn
              // (Hà Nội 650m/850m đồng giá · Khau Phạ PG/PPG theo ngày) nên đặt lại.
              setForm((prev) => {
                const kind = flightKindsOf(next).includes(prev.flightKind)
                  ? prev.flightKind
                  : defaultFlightKind(next);
                return {
                  ...prev,
                  pickup: "self",
                  pickupNote: "",
                  flightKind: kind,
                  unitPrice: priceTouched ? prev.unitPrice : flightUnitPrice(kind, prev.flightDate),
                };
              });
            }}
            disabled={spots.length <= 1}
            className="h-10 w-full rounded-lg border-2 border-rose-400 bg-rose-50/60 px-3 text-sm font-bold text-rose-900 outline-none focus:border-rose-600 disabled:bg-rose-50/40 disabled:text-rose-900/70"
          >
            {spots.map((id) => (
              <option key={id} value={id}>
                {spotName(id)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Bốn ô nhưng KHÔNG chia đều: Nguồn rộng bằng đúng một phần ba hàng, tức
          bằng ô Điểm bay ở hàng trên (tên nguồn dài — "Klook", "SEEK Sophie"…);
          ô Tổng khách chỉ đọc nên bóp nhỏ lại nhường chỗ. */}
      {/**
       * Hàng giữa: mỗi điểm bay một tỉ lệ cột riêng, vì số ô khác nhau.
       *  - Khau Phạ: PG · PPG · tổng khách · nguồn (4 ô)
       *  - Điểm khác: loại hình · số khách · nguồn (3 ô)
       * Chia đều 4 cột thì ô "số khách" bị bóp còn 0.6fr, nút "+" tràn sang đè
       * lên ô Nguồn — đúng lỗi đã gặp.
       */}
      {bookSpot === "sapa" ? (
        /**
         * SA PA: bảng booking GỌN, CHƯA CÓ TIỀN.
         *
         * Điểm này hiện chỉ cần biết khách từ đâu tới, đón ở đâu, mấy người, và
         * đã bay hay huỷ/dời — chưa quản tiền. Nên bỏ hết dịch vụ, đơn giá, cọc,
         * còn thu: để ô trống mà không dùng thì chỉ tạo thêm chỗ nhập nhầm.
         * Chín ô đúng như đã chốt: ngày bay · điểm đón · giờ đón · tên khách ·
         * SĐT · số khách · nguồn · mã booking · ghi chú.
         */
        <div className="mt-2 grid grid-cols-2 gap-2 @md:grid-cols-3">
          <Field label="Điểm đón">
            <TextInput
              value={form.pickupNote}
              onChange={(e) => set("pickupNote", e.target.value)}
              placeholder="Khách sạn / bến xe / nhà thờ Sa Pa…"
              className="h-10 rounded-lg text-sm"
            />
          </Field>
          <Field label={<span className="text-emerald-700">Số lượng khách</span>}>
            <div className="rounded-lg border-2 border-emerald-400 bg-emerald-50 p-0.5">
              <CountInput compact value={form.guestCount} onChange={(v) => set("guestCount", v)} max={100} />
            </div>
          </Field>
          <Field label={<span className="text-rose-700">Nguồn ★</span>}>
            <TextInput
              value={form.source}
              onChange={(e) => set("source", e.target.value)}
              placeholder="Klook / FB / Zalo / khách sạn…"
              list="booking-sources"
              className={
                "h-10 rounded-lg text-sm font-semibold " +
                (form.source.trim()
                  ? "border-2 border-rose-400 bg-rose-50/60 text-rose-900"
                  : "border-2 border-rose-300 bg-rose-50/40")
              }
            />
            <datalist id="booking-sources">
              {BOOKING_SOURCES.map((sName) => (
                <option key={sName} value={sName} />
              ))}
            </datalist>
          </Field>
        </div>
      ) : bookSpot === "khau-pha" ? (
        <div className="mt-2 grid grid-cols-2 gap-2 @md:grid-cols-[1.1fr_1.1fr_0.6fr_1.4fr]">
          {/* PG xanh dương · PPG tím · tổng khách xanh lá — ba ô đứng liền nhau,
              trắng giống nhau cả ba thì gõ nhầm ô là chuyện sớm muộn */}
          <Field label={<span className="text-sky-700">PG (số khách)</span>}>
            <div className="rounded-lg border-2 border-sky-400 bg-sky-50 p-0.5">
              <CountInput compact value={pgCount} onChange={(v) => setKindCounts(v, ppgCount)} max={100} />
            </div>
          </Field>
          <Field label={<span className="text-violet-700">PPG (số khách)</span>}>
            <div className="rounded-lg border-2 border-violet-400 bg-violet-50 p-0.5">
              <CountInput compact value={ppgCount} onChange={(v) => setKindCounts(pgCount, v)} max={100} />
            </div>
          </Field>
          <Field label={<span className="text-emerald-700">Tổng khách</span>}>
            <div
              className="flex h-10 w-full items-center justify-center rounded-lg border-2 border-emerald-400 bg-emerald-50 px-2 text-base font-bold tabular-nums text-emerald-900"
              title="Tự cộng từ hai ô PG / PPG bên cạnh"
            >
              {form.guestCount}
            </div>
          </Field>
        <Field label={<span className="text-rose-700">Nguồn ★</span>}>
          <TextInput
            value={form.source}
            onChange={(e) => set("source", e.target.value)}
            placeholder="Klook / FB / Zalo / GYG…"
            list="booking-sources"
            className={
              "h-10 rounded-lg text-sm font-semibold " +
              (form.source.trim()
                ? "border-2 border-rose-400 bg-rose-50/60 text-rose-900"
                : "border-2 border-rose-300 bg-rose-50/40")
            }
          />
          <datalist id="booking-sources">
            {BOOKING_SOURCES.map((sName) => (
              <option key={sName} value={sName} />
            ))}
          </datalist>
        </Field>
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-2 @md:grid-cols-[0.62fr_0.95fr_0.93fr]">
          {/* Hai nút 650m / 850m: chỉ là hai chữ ngắn nên bóp hẳn bề ngang lại
              (còn ~1/4 hàng, và không nới quá 14rem), nhờ đó ô "số khách" dịch
              sang trái theo, hết cảnh nút + đè lên ô Nguồn */}
          <Field label="Loại hình bay" group>
            <div className="flex h-10 max-w-56 overflow-hidden rounded-lg border border-slate-300">
              {flightKindsOf(bookSpot).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => set("flightKind", k)}
                  title={FLIGHT_KIND_LABEL[k]}
                  className={
                    form.flightKind === k
                      ? "flex-1 bg-sky-600 text-sm font-bold text-white"
                      : "flex-1 bg-white text-sm font-medium text-slate-500"
                  }
                >
                  {FLIGHT_KIND_SHORT[k]}
                </button>
              ))}
            </div>
          </Field>
          <Field label={<span className="text-emerald-700">Số khách</span>}>
            <div className="rounded-lg border-2 border-emerald-400 bg-emerald-50 p-0.5">
              <CountInput compact value={form.guestCount} onChange={(v) => set("guestCount", v)} max={100} />
            </div>
          </Field>
        <Field label={<span className="text-rose-700">Nguồn ★</span>}>
          <TextInput
            value={form.source}
            onChange={(e) => set("source", e.target.value)}
            placeholder="Klook / FB / Zalo / GYG…"
            list="booking-sources"
            className={
              "h-10 rounded-lg text-sm font-semibold " +
              (form.source.trim()
                ? "border-2 border-rose-400 bg-rose-50/60 text-rose-900"
                : "border-2 border-rose-300 bg-rose-50/40")
            }
          />
          <datalist id="booking-sources">
            {BOOKING_SOURCES.map((sName) => (
              <option key={sName} value={sName} />
            ))}
          </datalist>
        </Field>
        </div>
      )}

      <div className="mt-2 grid grid-cols-2 gap-2 @md:grid-cols-3">
        <Field label={bookSpot === "sapa" ? "Tên khách" : "Tên liên hệ"}>
          <TextInput value={form.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="anh Tú…" className="h-10 rounded-lg text-sm" />
        </Field>
        <Field label="SĐT">
          <TextInput value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="09xx…" inputMode="tel" className="h-10 rounded-lg text-sm" />
        </Field>
        {/* Mã book: để trống là tự lấy SĐT làm mã — khách lẻ không có mã OTA thì
            vẫn tra được, còn khách Klook/GYG thì dán mã của họ vào đây. */}
        <Field label="Mã book">
          <TextInput
            value={form.bookingCode}
            onChange={(e) => set("bookingCode", e.target.value)}
            placeholder={form.phone.trim() ? `tự lấy ${form.phone.trim()}` : "tự lấy SĐT"}
            className="h-10 rounded-lg text-sm"
          />
        </Field>
      </div>

      {/* SA PA chưa quản tiền: cả khối dịch vụ, đơn giá, cọc, còn thu đều ẩn */}
      {bookSpot !== "sapa" && (
      <>
      {/* Dịch vụ tuỳ chọn: 3 ô mỗi hàng khi đủ rộng — 5-6 dịch vụ gọn 2 hàng */}
      <div className="mt-2 grid grid-cols-2 gap-2 @md:grid-cols-3">
        {/**
         * Trần dịch vụ = SỐ KHÁCH (2 khách thì nhiều nhất 2 flycam, 2 cam360…).
         * Nhưng khi CHƯA nhập số khách thì mở tạm trần 20 để còn nhập được:
         * khách đọc một lèo "3 người, 2 flycam" thì nhân viên gõ theo thứ tự nào
         * cũng phải được. Điền số khách vào là dịch vụ tự kẹp lại cho đúng, và
         * nút Lưu chặn nốt trường hợp quên nhập khách.
         */}
        <ServiceBox tone="flycam" label="Flycam">
          <CountInput compact value={form.flycam} onChange={(v) => set("flycam", v)} max={serviceCap} />
        </ServiceBox>
        <ServiceBox tone="video360" label="Cam 360">
          <CountInput compact value={form.video360} onChange={(v) => set("video360", v)} max={serviceCap} />
        </ServiceBox>
        <ServiceBox tone="redFlag" label="Dù cờ đỏ">
          <CountInput compact value={form.redFlag} onChange={(v) => set("redFlag", v)} max={serviceCap} />
        </ServiceBox>
        <ServiceBox tone="flagFlight" label="Bay kéo cờ/bánh">
          <CountInput compact value={form.flagFlight} onChange={(v) => set("flagFlight", v)} max={serviceCap} />
        </ServiceBox>
        {bookSpot !== "sapa" && (
        <ServiceBox tone="sunset" label="Bay hoàng hôn/săn mây">
          <CountInput compact value={form.sunset} onChange={(v) => set("sunset", v)} max={serviceCap} />
        </ServiceBox>
        )}
        {/* Xe chuyên dụng lên núi — chỉ Hà Nội, 150k mỗi khách */}
        {bookSpot === "ha-noi" && (
        <ServiceBox tone="car" label="Xe lên núi">
          <CountInput compact value={form.mountainCar} onChange={(v) => set("mountainCar", v)} max={serviceCap} />
        </ServiceBox>
        )}
      </div>
      <p className="mt-0.5 text-[11px] leading-tight text-slate-500">
        {form.guestCount === 0 && serviceTotalCount > 0
          ? "⚠ Nhớ nhập số khách — dịch vụ không được nhiều hơn số khách. "
          : ""}
        Đơn giá dịch vụ:{" "}
        {SERVICE_PRICE_LABEL.map((x, i) => (
          <span key={x.key}>
            {i ? " · " : ""}
            {x.label} {(servicePriceOf(bookSpot, formPriceAt)[x.key] / 1000).toLocaleString("vi-VN")}k
          </span>
        ))}
        {bookSpot === "ha-noi" ? ` · Xe lên núi ${(MOUNTAIN_CAR_PRICE / 1000).toLocaleString("vi-VN")}k/khách` : ""}
      </p>

      <div className="mt-2 grid grid-cols-2 gap-2 @md:grid-cols-3">
        <Field label="Đưa đón">
          <select
            value={form.pickup}
            onChange={(e) => set("pickup", e.target.value as BookingDTO["pickup"])}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-600"
          >
            <option value="self">Tự đến</option>
            {/* Hà Nội có tuyến đón cố định; điểm khác (Khau Phạ, Sa Pa) chọn "Khác" rồi ghi chỗ đón */}
            {bookSpot === "ha-noi" ? (
              <>
                <option value="bigc">Đón BigC</option>
                <option value="hotel">Đón khách sạn</option>
              </>
            ) : (
              <option value="other">Khác — ghi chỗ đón</option>
            )}
          </select>
          {form.pickup === "other" && (
            <TextInput
              value={form.pickupNote}
              onChange={(e) => set("pickupNote", e.target.value)}
              placeholder="Đón tại đâu · VD: homestay Tú Lệ, ngã ba Lìm Mông…"
              className="mt-2 h-10 rounded-lg text-sm"
            />
          )}
        </Field>
        {/* Tiền nong: đơn giá × số khách − giảm trừ = tổng · cọc · còn thu · mã CK */}
        <Field label="Đơn giá bay / khách">
          <MoneyInput value={form.unitPrice} onChange={(v) => set("unitPrice", v)} />
          <p className="mt-0.5 text-[11px] leading-tight text-slate-500">
            {FLIGHT_KIND_SHORT[form.flightKind]} · {priceNote(form.flightKind, form.flightDate)} → bảng giá{" "}
            {(flightUnitPrice(form.flightKind, form.flightDate) / 1000).toLocaleString("vi-VN")}k
          </p>
        </Field>
        <Field label="Phí đưa đón">
          <MoneyInput value={form.pickupFee} onChange={(v) => set("pickupFee", v)} />
        </Field>
        <Field label="Giảm combo (flycam+360)">
          <MoneyInput value={form.comboDiscount} onChange={(v) => set("comboDiscount", v)} />
          <p className="mt-0.5 text-[11px] leading-tight text-slate-500">
            Máy tính {`${Math.min(form.flycam, form.video360)}`} cặp ×100k — sửa được nếu chốt khác
          </p>
        </Field>
        <Field label="Giảm trừ (chiết khấu)">
          <MoneyInput value={form.discount} onChange={(v) => set("discount", v)} />
        </Field>
        <Field label="Tổng tiền (tự tính)">
          <div className="flex h-10 items-center justify-end rounded-lg border-2 border-sky-300 bg-sky-50 px-3 text-base font-bold tabular-nums text-sky-800">
            {bookingTotal.toLocaleString("vi-VN")} đ
          </div>
          <p className="mt-0.5 text-[11px] leading-tight text-slate-500">
            {bookSpot === "khau-pha" && pgCount > 0 && ppgCount > 0
              ? `PG ${(form.unitPrice / 1000).toLocaleString("vi-VN")}k×${pgCount} + PPG ${(ppgPrice / 1000).toLocaleString("vi-VN")}k×${ppgCount}`
              : `${(form.unitPrice / 1000).toLocaleString("vi-VN")}k×${form.guestCount}`}
            {serviceMoney ? ` + dịch vụ ${(serviceMoney / 1000).toLocaleString("vi-VN")}k` : ""}
            {form.mountainCar
              ? ` + xe núi ${((form.mountainCar * MOUNTAIN_CAR_PRICE) / 1000).toLocaleString("vi-VN")}k`
              : ""}
            {form.pickupFee ? ` + đón ${(form.pickupFee / 1000).toLocaleString("vi-VN")}k` : ""}
            {comboMoney ? ` − combo ${(comboMoney / 1000).toLocaleString("vi-VN")}k (giảm tiền combo)` : ""}
            {form.discount ? ` − giảm ${(form.discount / 1000).toLocaleString("vi-VN")}k` : ""}
          </p>
        </Field>
        {/* Mỗi ô tiền một nút QR: khách đặt xa thì gửi mã cọc qua Zalo, khách
            tới bãi thì đưa mã phần còn thu cho quét. Nội dung CK = mã booking. */}
        {/**
         * Ô TIỀN CHIẾM TRỌN BỀ NGANG của một cột, mấy nút xuống HÀNG DƯỚI.
         *
         * Trước đây số tiền phải chia chỗ với hai nút TM/CK và nút QR trên cùng
         * một hàng, nên số bảy chữ số (2.190.000) bị bóp đến mức che mất chữ.
         * Cho chiếm hai cột thì đọc được nhưng ô rộng huyếch so với mấy ô cạnh
         * nó. Xuống hàng là xong cả hai: số đọc rõ, ô vẫn bằng các ô khác nên
         * "Mã CK cọc" và "Ngày CK cọc" đứng cùng hàng với nó trên máy tính.
         */}
        <Field label={editingId && editedPaid > 0 ? "Khách đã trả (cọc + đã thu)" : "Khách đã cọc"}>
          <div className="flex flex-col gap-1">
            <MoneyInput value={form.deposit} onChange={(v) => set("deposit", v)} />
            {/* Chưa gõ số tiền thì hàng nút này vô nghĩa: chưa biết cọc bao
                nhiêu thì mã QR không sinh được, mà TM/CK cũng chưa có gì để
                phân đường. Ẩn đi cho form khỏi cao lên vô ích. */}
            {form.deposit > 0 && (
            <div className="flex items-center gap-1">
            {/*
              HỎI THẲNG ĐƯỜNG TIỀN, không đoán. Cọc TM thì tiền nằm trong phần
              người lập booking đang giữ và KHÔNG phải đối soát sao kê; cọc CK
              thì phải dò ra trong sao kê ngân hàng. Bản cũ mặc định coi mọi
              khoản cọc là chuyển khoản nên nói sai với 29/93 booking.
            */}
            {(["cash", "transfer"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => set("depositMethod", form.depositMethod === m ? "" : m)}
                  title={m === "cash" ? "Khách đưa tiền mặt — tính vào tiền người lập booking đang giữ" : "Khách chuyển khoản về TK công ty — phải soát sao kê"}
                  className={
                    "h-9 flex-1 rounded-lg border px-2 text-xs font-bold " +
                    (form.depositMethod === m
                      ? m === "cash"
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-sky-500 bg-sky-500 text-white"
                      : "border-slate-300 bg-white text-slate-600")
                  }
                >
                  {m === "cash" ? "TM" : "CK"}
                </button>
              ))}
            {/* Chữ QR gọn: đủ hiểu mà không ăn hết chỗ của số tiền 7 chữ số */}
            <PaymentQrButton
              amount={form.deposit}
              note={buildTransferNote({
                spot: bookSpot,
                flightDate: form.flightDate,
                daySeq: editingSeq,
                bookingCode: form.bookingCode,
                phone: form.phone,
              })}
              purpose={`Tiền cọc — ${form.contactName || form.phone || "khách"}`}
              className="h-9 flex-1 border-sky-400 bg-sky-50 px-2 text-xs font-bold text-sky-700"
            />
            </div>
            )}
          </div>
          {/*
            Ô này là số CỘNG DỒN, không phải riêng tiền cọc: mỗi lệnh thu tại
            quầy đều cộng thẳng vào. Không nói rõ thì người sửa tưởng máy ghi
            nhầm rồi gõ lại đúng số cọc ban đầu — và thế là xoá mất dấu khách đã
            trả nốt, booking mọc lại khoản "còn thu" vốn đã thu xong.
          */}
          {editingId && editedPaid > 0 && (
            <p className="mt-0.5 rounded bg-amber-100 px-1.5 py-1 text-[11px] leading-tight text-amber-900">
              Gồm cọc lúc đặt{" "}
              <strong>{Math.max(0, form.deposit - editedPaid).toLocaleString("vi-VN")} đ</strong> +{" "}
              {editedPaidCount} lần thu tại quầy{" "}
              <strong>{editedPaid.toLocaleString("vi-VN")} đ</strong>. Gõ đè số này là xoá mất phần
              đã thu — sửa từng lần thu thì dùng “⋯ Thêm → Sửa tiền đã thu”.
            </p>
          )}
        </Field>
        <Field label="Mã CK cọc">
          <TextInput
            value={form.transferCode}
            onChange={(e) => set("transferCode", e.target.value)}
            placeholder="Mã GD — 4 số cuối là đủ…" className="h-10 rounded-lg text-sm"
          />
        </Field>
        {/**
         * NGÀY CK CỌC — ngày khách THỰC SỰ chuyển tiền, không phải ngày gõ máy.
         *
         * Để trống là "đúng hôm nay" (hôm lập booking). Gõ vào khi khách trả
         * hôm khác: khách chuyển hôm 20 mà quầy gõ hôm 23 thì dòng sao kê nằm ở
         * ngày 20, khoản cọc nằm ở ngày 23 — kế toán soát ngày nào cũng không
         * thấy khớp. Có ngày rồi thì khoản cọc hiện trong danh sách tiền CK về
         * của đúng ngày ấy.
         */}
        <Field label="Ngày CK cọc" hint={form.depositDate ? "" : "Trống = trả hôm nay"}>
          <input
            type="date"
            value={form.depositDate}
            max={todayInVN()}
            disabled={form.deposit <= 0}
            onChange={(e) => set("depositDate", e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 px-2 text-sm text-slate-900 outline-none focus:border-sky-600 disabled:bg-slate-100 disabled:text-slate-400"
          />
        </Field>
        {/* Khách đặt qua đại lý và trả một phần bên đó: phần này khách khỏi trả,
            đại lý nợ công ty — kế toán xem bảng công nợ đại lý cuối ngày */}
        <Field label="Đại lý đã thu">
          <MoneyInput
            value={form.agencyPaidAmount}
            onChange={(v) => {
              /**
               * PHẢI đi qua `set`, KHÔNG được gọi thẳng `setForm`.
               *
               * `set` là chỗ duy nhất tính lại "Còn lại = tổng − đã cọc − đại
               * lý đã thu". Ghi thẳng vào form thì số tiền vào đúng chỗ nhưng
               * ô "Còn lại" đứng im, phải bấm tăng giảm một dịch vụ bất kỳ nó
               * mới chịu cập nhật — đúng lỗi đã xảy ra.
               */
              set("agencyPaidAmount", v);
              /**
               * Rồi mới ĐIỀN TÊN ĐẠI LÝ theo ô "Nguồn".
               *
               * Khoản này sinh ra công nợ "đại lý X còn nợ công ty"; không có
               * tên thì thành "đại lý ẩn danh còn nợ", kế toán không biết đi
               * đòi ai. Chỉ điền khi tên đang TRỐNG — không đè chữ người ta đã gõ.
               */
              if (v > 0 && !form.agencyName.trim() && form.source.trim()) {
                set("agencyName", form.source.trim());
              }
            }}
          />
        </Field>
        {form.agencyPaidAmount > 0 && (
          <Field label="Tên đại lý ★" hint="Tự điền theo ô Nguồn — sửa được">
            <TextInput
              value={form.agencyName}
              onChange={(e) => set("agencyName", e.target.value)}
              placeholder="Klook, GYG, anh Tuấn tour…" className="h-10 rounded-lg text-sm"
            />
          </Field>
        )}
        {/**
         * CÒN THU: ô CHỈ ĐỌC, máy tự tính = tổng tiền − đã cọc.
         *
         * Trước đây gõ tay được, và mở booking cũ ra sửa thì nó bị khoá luôn số đã
         * lưu — nên đổi loại hình bay hay thêm phí đón là TỔNG chạy mà CÒN LẠI đứng
         * im, màn hình hiện "tổng 2.190.000 · còn lại 2.340.000". Máy chủ giờ cũng
         * chốt lại con số này nên có gõ tay cũng không giữ được: bỏ ô nhập cho khỏi
         * hứa hẹn sai. Muốn đổi số còn thu thì sửa "đã cọc" hoặc thu thêm tiền.
         */}
        {/* Ô này chỉ có số ĐỌC và nút QR — bọc <label> thì bấm vào chữ nhãn là
            bật luôn bảng QR, nên dùng bản `group` (xem Field trong ui.tsx). */}
        <Field
          group
          label={<span className="text-rose-700">Còn lại (thu trước khi bay) ★</span>}
          hint="Máy tự tính = tổng tiền − đã cọc"
        >
          <div className="flex items-center gap-1">
            <span className="flex h-10 min-w-0 flex-1 items-center justify-end rounded-lg border-2 border-rose-400 bg-rose-50 px-3 text-base font-bold tabular-nums text-rose-800">
              {form.remaining.toLocaleString("vi-VN")} đ
            </span>
            <PaymentQrButton
              amount={form.remaining}
              note={buildTransferNote({
                spot: bookSpot,
                flightDate: form.flightDate,
                daySeq: editingSeq,
                bookingCode: form.bookingCode,
                phone: form.phone,
              })}
              purpose={`Tiền còn thu — ${form.contactName || form.phone || "khách"}`}
              className="h-10 shrink-0 border-rose-400 bg-rose-50 px-2 text-xs font-bold text-rose-700"
            />
          </div>
        </Field>
      </div>

      {/* Còn tiền phải thu: chỉ định người thu — lưu xong lệnh thu tự gửi tới người đó */}
      {!editingId && form.remaining > 0 && staff.length > 0 && (
        <div className="mt-2 rounded-lg border border-emerald-300 bg-emerald-50/70 p-2">
          <div className="text-xs font-bold text-emerald-900">
            💰 Còn {form.remaining.toLocaleString("vi-VN")} đ thu trước khi bay — giao ai thu{" "}
            <span className="font-medium text-emerald-800/80">(không bắt buộc)</span>:
          </div>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <select
              value={form.collectorUsername}
              onChange={(e) => set("collectorUsername", e.target.value)}
              className="h-10 w-full rounded-lg border border-emerald-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-600"
            >
              <option value="">— Chưa biết ai thu, để sau —</option>
              {staff.map((a) => (
                <option key={a.username} value={a.username}>
                  {a.name} — {a.roleLabel}
                </option>
              ))}
            </select>
            <TextInput
              value={form.collectorNote}
              onChange={(e) => set("collectorNote", e.target.value)}
              placeholder="Ghi chú cho người thu…"
              className="h-10 rounded-lg text-sm"
            />
          </div>
          <p className="mt-1 text-[11px] leading-tight text-emerald-800/80">
            Chọn người ở đây tức là <strong>giao khách</strong> cho người đó (như nút &ldquo;Giao PC&rdquo;):
            đến ngày bay khách hiện trên trang của họ kèm nhắc &ldquo;còn thu {form.remaining.toLocaleString("vi-VN")} đ&rdquo;,
            thu xong bấm ĐÃ THU là tiền vào phần họ giữ hộ công ty. Người khác vẫn thu hộ được.
            Để trống cũng được — hôm bay giao cho ai thì người đó lo thu.
          </p>
        </div>
      )}

      </>
      )}

      {/* Cọc thì 100% qua STK công ty — bỏ ô tích, máy chủ tự đánh dấu khi có cọc */}
      <div className="mt-2">
      <Field label="Ghi chú">
          <TextInput value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="Tên khách (nếu liên hệ là đại lý), khách Hàn cần HDV…" className="h-10 rounded-lg text-sm" />
      </Field>
      </div>

      {/**
       * EMAIL KHÁCH — mỗi lần sửa booking (đổi giờ, thêm dịch vụ, dời lịch,
       * huỷ…) app tự gửi thư báo khách kèm giá mới về địa chỉ này.
       *
       * Khách đặt qua web thì ô này TỰ ĐIỀN sẵn. Khách gọi điện / qua đại lý
       * thì trống — gõ vào khi cần báo, để trống cũng không sao: booking vẫn
       * lưu bình thường, chỉ là không có thư.
       */}
      <div className="mt-2">
      <Field label="Email khách (để app tự báo khi booking thay đổi)">
          <TextInput
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="khach@email.com — để trống thì không gửi thư"
            className="h-10 rounded-lg text-sm"
          />
      </Field>
      <p className="mt-1 text-[11px] leading-tight text-slate-500">
        Có email thì mỗi lần đổi giờ hẹn, thêm/bớt dịch vụ, dời lịch hay huỷ, app tự gửi thư báo khách
        kèm giá mới. Không có thì mọi thứ vẫn lưu như thường, chỉ là phải nhắn tay.
      </p>
      </div>

      {error && (
        <div className="mt-2">
          <Banner tone="error">{error}</Banner>
        </div>
      )}
      {done && (
        <div className="mt-2">
          <Banner tone="success" onClose={() => setDone(null)}>
            {done}
          </Banner>
        </div>
      )}
      {needMail && (
        <div className="mt-2 rounded-xl border-2 border-amber-400 bg-amber-50 p-3">
          <p className="text-sm font-bold text-amber-900">✉ Có thay đổi khách chưa biết</p>
          <ul className="mt-1 list-disc pl-5 text-xs leading-snug text-amber-950">
            {(needMail.pendingNotify ?? []).map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
          {needMail.email ? (
            <p className="mt-2 text-[11px] leading-tight text-amber-800">
              Bấm <strong>✉ Gửi email</strong> cạnh nút Cập nhật ở cuối form. Không cần báo thì cứ bỏ qua —
              app không tự gửi; nút vẫn nằm trên dòng booking cho tới khi gửi.
            </p>
          ) : (
            <p className="mt-2 text-xs font-semibold text-amber-900">
              Booking chưa có email khách — điền ô “Email khách” ở trên rồi Lưu lại thì nút gửi hiện ra.
            </p>
          )}
        </div>
      )}

      {twin && (
        <div className="mt-2 rounded-lg border-2 border-amber-400 bg-amber-50 px-2.5 py-1.5 text-xs leading-snug text-amber-900">
          ⚠ <strong>Có thể trùng:</strong> booking #{twin.daySeq} {twin.contactName || twin.phone} · {twin.guestCount} khách
          {" "}đã đặt {formatDateKeyVN(twin.flightDate)} rồi. Nếu là cùng một khách thì sửa booking đó thay vì nhập mới.
        </div>
      )}

      <div className="mt-2.5 flex gap-2">
        {/**
         * NHẬP BOOKING MỚI — lối duy nhất để xoá trắng form.
         *
         * Lưu xong form giữ nguyên số liệu và chuyển sang chế độ sửa chính
         * booking vừa lưu, nên phải có nút này để bắt đầu khách tiếp theo.
         * Cũng là nút "thôi sửa" khi đang mở một booking cũ ra chỉnh.
         */}
        {editingId && (
          <Button
            type="button"
            variant="ghost"
            /**
             * Chữ NGẮN và không cho gãy dòng: "＋ Nhập booking mới" trên vài máy
             * điện thoại bị bẻ thành ba dòng rồi tràn ra khỏi nút. Nút này chỉ cần
             * đủ hiểu là bắt đầu khách mới.
             */
            className="h-11 flex-1 whitespace-nowrap border-sky-300 bg-white px-2 text-sm font-semibold text-sky-700"
            disabled={saving}
            onClick={() => {
              setEditingId(null);
              setEditingCreatedAt("");
              setEditingSeq(0);
              setEditingSpot(bookSpot);
              setForm(emptyBooking(today, bookSpot));
              setError(null);
              setDone(null);
              setForceOpen(false);
              // Cờ "đã sửa tay" của lần sửa trước không được vắt sang booking mới
              setPriceTouched(false);
              setComboTouched(false);
            }}
          >
            ＋ Book mới
          </Button>
        )}
        {/* Nhập dở mà muốn làm lại từ đầu: xoá trắng form + các cờ "đã sửa tay" */}
        {!editingId && (
          <Button
            type="button"
            variant="ghost"
            className="h-11 shrink-0 whitespace-nowrap border-rose-300 bg-white px-2 text-sm text-rose-700"
            disabled={saving}
            title="Xoá trắng toàn bộ ô nhập để làm lại từ đầu — không đụng booking đã lưu"
            onClick={() => {
              if (!window.confirm("Xoá hết dữ liệu đang nhập trên form để nhập lại từ đầu?")) return;
              setForm(emptyBooking(today, bookSpot));
              setQuick("");
              setQuickMsg(null);
              setError(null);
              setDone(null);
              setPriceTouched(false);
              setComboTouched(false);
            }}
          >
            🗑 Nhập lại
          </Button>
        )}
        <Button
          type="button"
          className="h-11 flex-[2] whitespace-nowrap bg-sky-600 px-2 text-sm hover:bg-sky-700"
          disabled={saving}
          onClick={save}
        >
          {saving ? "Đang lưu…" : editingId ? "✓ Cập nhật booking" : "Lưu booking"}
        </Button>
        {/* Dấu xong sát nút — form giữ nguyên số liệu nên đây là dấu hiệu duy
            nhất cho biết máy chủ đã nhận */}
        <DoneTag show={justSaved}>{justSavedEdit ? "Đã cập nhật" : "Đã lưu"}</DoneTag>
        {/**
         * NÚT "GỬI EMAIL" đứng CẠNH nút Lưu/Cập nhật — LUÔN hiện khi ô email
         * có địa chỉ, không chỉ khi có thay đổi chờ báo.
         *
         * Bấm là LƯU trước rồi GỬI: gửi bản chưa lưu thì thư kể trạng thái cũ.
         * Booking có thay đổi chờ báo → thư kể các thay đổi; không có (vừa
         * nhập xong, hoặc chỉ muốn gửi lại) → thư XÁC NHẬN toàn bộ đặt chỗ.
         * Vẫn KHÔNG tự gửi — nhiều lần sửa chẳng cần báo ai.
         */}
        {form.email.trim() !== "" && (
          <Button
            type="button"
            variant="ghost"
            disabled={saving || sendingMail}
            className="h-11 flex-1 whitespace-nowrap border-amber-400 bg-amber-50 px-2 text-sm font-bold text-amber-900"
            title={`Lưu booking (lấy số thứ tự) rồi gửi thư tới ${form.email} — có thay đổi chưa báo thì thư kể thay đổi, không thì gửi bản xác nhận đặt chỗ theo đúng mẫu thư web`}
            onClick={async () => {
              setSendingMail(true);
              try {
                const id = await save();
                if (!id) return; // lưu hỏng thì lỗi đã hiện, đừng gửi thư của bản cũ
                await apiPatch(`/api/baocao/booking?spot=${editingSpot || bookSpot}`, {
                  id,
                  action: "notify-guest",
                });
                setNeedMail(null);
                setDone(`✓ Đã lưu và gửi thư tới ${form.email}.`);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Không gửi được thư");
              } finally {
                setSendingMail(false);
              }
            }}
          >
            {/* Booking CHƯA lưu thì chưa có số thứ tự — bấm nút này là lưu
                (lấy số) rồi gửi luôn, nên chữ phải nói rõ cả hai việc. */}
            {sendingMail ? "Đang gửi…" : editingId ? "✉ Gửi email" : "✉ Lưu & gửi email"}
          </Button>
        )}
        {/* Xuất phiếu gửi khách: điện thoại mở khay chia sẻ (Zalo), máy tính tải PNG */}
        <Button
          type="button"
          variant="ghost"
          className="h-11 flex-1 bg-white"
          disabled={saving || form.guestCount === 0}
          title="Xuất phiếu booking thành ảnh để gửi khách"
          onClick={async () => {
            try {
              await shareBookingImage({
                spot: bookSpot,
                flightDate: form.flightDate,
                expectedTime: form.expectedTime,
                contactName: form.contactName,
                phone: form.phone,
                bookingCode: form.bookingCode.trim() || form.phone.trim(),
                source: form.source,
                guestCount: form.guestCount,
                flycam: form.flycam,
                video360: form.video360,
                redFlag: form.redFlag,
                sunset: form.sunset,
                flagFlight: form.flagFlight,
                pickupLabel:
                  form.pickup === "other"
                    ? `Đón: ${form.pickupNote || "?"}`
                    : form.pickup === "bigc"
                      ? "Đón BigC"
                      : form.pickup === "hotel"
                        ? "Đón khách sạn"
                        : "Tự đến",
                flightKindLabel: FLIGHT_KIND_SHORT[form.flightKind],
                ppgGuests: form.ppgGuests,
                unitPrice: form.unitPrice,
                serviceMoney,
                pickupFee: form.pickupFee,
                mountainCarMoney: form.mountainCar * MOUNTAIN_CAR_PRICE,
                mountainCar: form.mountainCar,
                discount: form.discount,
                total: bookingTotal,
                deposit: form.deposit,
                remaining: form.remaining,
                note: form.note,
                /* Số thứ tự chỉ có sau khi booking đã vào sổ (daySeq của ngày) */
                queueNo: editingSeq || null,
              });
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : "Không xuất được ảnh phiếu");
            }
          }}
        >
          🖼 Xuất ảnh
        </Button>
      </div>
      </div>

      <div className="@container mt-4 @3xl:mt-0">
        <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-slate-700">
          <span>🗓 Lịch bay & booking sắp tới ({upcoming.length})</span>
          {/**
           * BẤM ĐIỂM NÀO HIỆN ĐIỂM ĐÓ — bấm được cả ba cùng lúc. Người chỉ làm
           * một điểm không thấy hàng nút này, danh sách vốn đã đúng điểm của họ.
           */}
          {spots.length > 1 && (
            <span className="flex flex-wrap items-center gap-1">
              {spots.map((id) => {
                const on = listSpots.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setListSpots((prev) => (on ? prev.filter((x) => x !== id) : [...prev, id]))}
                    className={
                      "h-6 rounded-full px-2 text-[11px] font-semibold " +
                      (on
                        ? "border border-sky-600 bg-sky-600 text-white"
                        : "border border-slate-300 bg-white text-slate-500 hover:border-sky-400")
                    }
                    title={on ? `Đang hiện ${spotName(id)} — bấm để ẩn` : `Hiện thêm lịch ${spotName(id)}`}
                  >
                    {on ? "✓ " : ""}
                    {spotName(id)}
                  </button>
                );
              })}
            </span>
          )}
        </div>
        {upcoming.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-400">
            {listSpots.length === 0 ? "Chưa chọn điểm nào để hiện — bấm tên điểm ở trên." : "Chưa có booking nào sắp tới."}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {(showAllUpcoming ? upcoming : upcoming.slice(0, 5)).map((b, i) => (
              <li
                key={b.id}
                className={
                  "flow-root px-2.5 py-1.5" +
                  (editingId === b.id ? " bg-sky-50" : "") +
                  (b.locked ? " opacity-60" : "")
                }
              >
                {/* Nút FLOAT góc phải — chữ dòng 1 né nút, từ dòng 2 tràn hết bề ngang */}
                <div className="float-right ml-2 flex flex-wrap items-center justify-end gap-1">
                  {/* Thu tiền TỪ XA: khách chuyển khoản trước ngày bay là ghi nhận được luôn */}
                  {/* Xem chồng nhiều điểm thì mỗi dòng phải sửa đúng sổ của nó */}
                  <CollectMoneyControl
                    spot={b.spot || spot}
                    booking={b}
                    onDone={(msg) => {
                      setDone(msg);
                      load();
                      onChanged?.();
                    }}
                  />
                  <AssignControl spot={b.spot || spot} booking={b} onDone={load} />
                  <CancelBookingControl
                    spot={b.spot || spot}
                    booking={b}
                    onDone={(msg) => {
                      setDone(msg);
                      load();
                      onChanged?.();
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => startEdit(b)}
                    disabled={rowBusy === b.id}
                    className="h-7 rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium text-slate-600 hover:border-sky-500 hover:text-sky-700"
                  >
                    {editingId === b.id ? "đang sửa…" : "Sửa"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeBooking(b)}
                    disabled={rowBusy === b.id}
                    className="h-7 rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium text-slate-400 hover:border-rose-500 hover:text-rose-600"
                  >
                    {rowBusy === b.id ? "…" : "Xoá"}
                  </button>
                </div>
                {/* Số thứ tự đỏ — nhìn phát biết đang nói booking số mấy */}
                <span className="mr-1 text-sm font-bold tabular-nums text-rose-600">{i + 1}.</span>
                {/* Gộp nhiều điểm thì phải biết dòng này của điểm nào */}
                {listSpots.length > 1 && (
                  <span className="mr-1 rounded bg-slate-700 px-1.5 py-0.5 text-[11px] font-bold text-white">
                    {spotName(b.spot || spot)}
                  </span>
                )}
                <BookingSummary b={b} withDate dim={b.locked} />
                <AssignedBadge b={b} />
                <span className="ml-1 text-xs text-slate-400">
                  — nhập {stampVN(b.createdAt)} bởi {b.createdByName}
                </span>
                {/* Khách đặt trước: soát giấy tờ từ hôm nay, khỏi dồn vào lúc checkin */}
                <InsuranceBox
                  spot={spot}
                  bookingId={b.id}
                  guestCount={b.guestCount}
                  preview={{
                    guests: b.insured,
                    approvedAt: b.insuranceApprovedAt,
                    sentAt: b.insuranceSentAt,
                    recalledAt: b.insuranceRecalledAt,
                  }}
                />
              </li>
            ))}
          </ul>
        )}
        {upcoming.length > 5 && (
          <button
            type="button"
            onClick={() => setShowAllUpcoming((v) => !v)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            {showAllUpcoming ? "▴ Thu gọn danh sách" : `▾ Xem thêm ${upcoming.length - 5} booking`}
          </button>
        )}
      </div>
      </div>
    </CollapseCard>
    </div>
  );
}
