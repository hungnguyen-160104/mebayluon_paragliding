// lib/policies/en.ts
/**
 * Nội dung các trang chính sách — TIẾNG ANH (bản dịch của lib/policies/vi.ts).
 * Bản tiếng Việt là bản chuẩn; sửa bản Việt thì đồng bộ sang đây.
 * fr/ru/zh/hi cũng hiện bản này (xem lib/policies/index.ts).
 */
import { INSURANCE_PROVIDER_NAME, LEGAL_ENTITY } from "@/lib/legal-entity";

import {
  entityInfoHtml,
  pad2,
  POLICY_ASSUMPTIONS as A,
  policyLink,
  type PolicyDoc,
  type PolicySlug,
} from "./shared";

const L = (slug: PolicySlug, text: string) => policyLink(slug, "en", text);
const E = LEGAL_ENTITY;
const HOTLINE = "+84 964 073 555 – +84 385 907 789 (call, Zalo, WhatsApp)";
const TERMS = `<a href="/terms?lang=en">Terms &amp; Conditions for Paragliding Participation</a>`;

const terms = `
<p>The website <b>www.mebayluon.com</b> (the “Website”) is owned and operated by <b>${E.legalNameEn}</b> (${E.legalName}), trading as <b>${E.tradeName}</b> (“Mebayluon”, “we”). By accessing or using the Website, or booking a service through it, you confirm that you have read, understood and agreed to these terms.</p>

<h2>1. Scope</h2>
<ul>
  <li>The Website presents and takes bookings for: tandem paragliding (you fly with a pilot), paramotor (PPG) flights, related services (pickup, flycam/360 camera filming…), homestay rooms, and presents paragliding products and courses.</li>
  <li>These terms are the <b>general terms of transaction</b> for all transactions on the Website. Taking part in a flight is additionally governed by the ${TERMS} that you tick to accept at the confirmation step of the booking. Where the two documents differ on flight participation, the Terms &amp; Conditions for Paragliding Participation prevail.</li>
  <li>The following policies form part of these terms: ${L("thanh-toan", "Payment policy")}, ${L("huy-doi-lich-hoan-tien", "Cancellation, rescheduling and refund policy")}, ${L("cung-cap-dich-vu", "Service delivery policy")}, ${L("bao-mat-thong-tin", "Privacy policy")} and ${L("giai-quyet-khieu-nai", "Complaints and dispute resolution")}.</li>
</ul>

<h2>2. Booking process</h2>
<ol>
  <li>Choose a flying site, package and optional services on the <a href="/en/booking">Booking</a> page, or contact us on ${HOTLINE}.</li>
  <li>Enter the flight date, time slot, contact details and each passenger’s details (full name, date of birth, gender, ID/passport number, weight, nationality).</li>
  <li>The Website shows a summary of selected services, the price breakdown and the total. Review it, read and accept the Terms &amp; Conditions, then press Confirm.</li>
  <li>You receive a <b>booking code</b> and a confirmation email (with your flight ticket). Our staff will contact you within <b>3 hours</b> of receiving the booking to confirm the schedule, services and weather.</li>
  <li>The transaction is concluded when Mebayluon confirms the booking with you (by phone, Zalo, WhatsApp or email).</li>
  <li>You can look up and edit your booking (date, time, number of guests, contact details, pickup, passenger details) or request cancellation on the <a href="/en/booking/sua">Manage booking</a> page using your booking code and phone number, until <b>18:00 on the day before the flight</b>. After that, please call the hotline.</li>
</ol>

<h2>3. Prices</h2>
<ul>
  <li>Prices are quoted in Vietnamese dong (VND) and <b>include VAT</b>; a VAT invoice is issued on request. Any USD amount shown is for reference only.</li>
  <li>The price that applies is the one displayed when you book. At some sites, weekends and public holidays have separate prices, shown at booking. Group discounts (if any) are applied automatically based on the number of guests.</li>
  <li>Items included in the price (e.g. GoPro photos &amp; video, drinking water, insurance, flight certificate… depending on the site) are listed at the package step and in the confirmation summary. Optional services (pickup, flycam, 360 camera…) are charged at the displayed price.</li>
  <li>If you change the date or number of guests, the price is recalculated using the price list for the new date/number of guests.</li>
</ul>

<h2>4. Your rights and obligations</h2>
<ul>
  <li>Provide accurate information (name, date of birth, ID, weight, health condition). False or withheld information may lead to refusal to fly for safety reasons under the Terms &amp; Conditions.</li>
  <li>Follow the safety instructions of the pilot and ground staff and arrive on time.</li>
  <li>Pay in full according to the ${L("thanh-toan", "Payment policy")}.</li>
  <li>You are entitled to full information on services, prices and terms before booking; to reschedule, cancel and receive refunds under the ${L("huy-doi-lich-hoan-tien", "Cancellation, rescheduling and refund policy")}; to protection of your personal data; and to lodge complaints.</li>
  <li>Do not use the Website for fraud, fake bookings, malware, unlawful data collection or anything that disrupts its operation.</li>
</ul>

<h2>5. Mebayluon’s rights and obligations</h2>
<ul>
  <li>Provide the services as described and confirmed; publish prices, terms and policies on the Website.</li>
  <li>Assign professionally trained, certified pilots and suitable equipment; flight safety always comes first.</li>
  <li>Refuse, postpone or cancel a flight when weather or site conditions are unsafe, or when a passenger does not meet participation requirements — see the ${L("huy-doi-lich-hoan-tien", "Cancellation, rescheduling and refund policy")}.</li>
  <li>Protect customer data under the ${L("bao-mat-thong-tin", "Privacy policy")}.</li>
  <li>Receive and resolve complaints under ${L("giai-quyet-khieu-nai", "Complaints and dispute resolution")}.</li>
</ul>

<h2>6. Intellectual property</h2>
<p>Content on the Website (text, images, video, logos, design) belongs to Mebayluon or is used lawfully. It may not be copied or used commercially without Mebayluon’s written consent. Third-party content is credited to its source.</p>

<h2>7. Limitation of liability regarding the Website</h2>
<ul>
  <li>Weather information, flight forecasts and knowledge articles on the Website are for reference only; the final decision to fly rests with the pilot on site.</li>
  <li>The Website may link to third-party websites (partners, social networks). Mebayluon is not responsible for their content or policies.</li>
  <li>We strive to keep the Website available and accurate, but it may be interrupted for maintenance or technical faults. If a price or information error occurs, Mebayluon will contact you to agree before providing the service; you may cancel the booking free of charge if you do not agree.</li>
</ul>

<h2>8. Changes</h2>
<p>Mebayluon may update these terms and policies. The update date is shown at the top of each page. The version that applies to a booking is the one displayed when you confirmed it.</p>

<h2>9. Governing law</h2>
<p>These terms are governed by the laws of Vietnam. Disputes are resolved under ${L("giai-quyet-khieu-nai", "Complaints and dispute resolution")}.</p>

<h2>10. Company information</h2>
${entityInfoHtml("en")}
`;

const payment = `
<p>This policy sets out how you pay for services booked through <b>www.mebayluon.com</b> and ${E.tradeName}’s contact channels.</p>

<h2>1. When to pay</h2>
<ul>
  <li>Booking on the Website <b>does not require online payment</b>. You pay <b>directly at the flying site before takeoff</b>, unless otherwise agreed in writing (message, email).</li>
  <li>In some cases — most importantly <b>homestay bookings</b>, and also large groups, private transfers and peak days — our staff may ask you to transfer part (a deposit) or all of the amount in advance. The amount, transfer note and receiving account will be stated clearly when your booking is confirmed. Prepaid amounts are refunded under the ${L("huy-doi-lich-hoan-tien", "Cancellation, rescheduling and refund policy")}.</li>
</ul>

<h2>2. Payment methods</h2>
<ul>
  <li><b>Cash</b> (VND) at the flying site.</li>
  <li><b>Bank transfer</b> to an account in the name of <b>${E.legalName}</b>. Our staff will send you the company’s bank transfer details when confirming your booking, through official channels (hotline, Zalo, WhatsApp, email ${E.email}). Please use the transfer note (booking code) you are given.</li>
  <li>Common <b>credit / debit cards</b>, at the flying site.</li>
  <li><b>PayPal</b> — following our staff’s instructions when confirming the booking.</li>
</ul>
<p>The Website has <b>no online payment gateway</b> and <b>does not collect or store</b> card numbers, card security codes or bank account credentials.</p>

<h2>3. Currency and price</h2>
<ul>
  <li>Prices are quoted and paid in VND. Any USD amount shown is a reference conversion only.</li>
  <li>The amount payable is the total confirmed in your booking (flight price per the price list at the time of booking, plus optional services, minus any discount), plus any extra costs you incur on site at your own request.</li>
</ul>

<h2>4. Tax and invoices</h2>
<ul>
  <li>Prices listed on the Website <b>include value added tax (VAT)</b>.</li>
  <li>${E.legalNameEn} issues <b>VAT invoices</b>. If you need one, please provide the invoice details (company/individual name, tax code, address, email to receive the invoice) when booking (special requests field) or when paying.</li>
</ul>

<h2>5. Payment safety</h2>
<ul>
  <li>Only transfer money using details sent by Mebayluon through the official channels above. If you receive a payment request from an unknown source or with unusual account details, call ${HOTLINE} to verify first.</li>
  <li>After payment you receive confirmation by message/email or a receipt on site; please keep it for reference.</li>
</ul>

<h2>6. Company information</h2>
${entityInfoHtml("en")}
`;

const cancellation = `
<p>Paragliding depends 100% on the weather, especially wind. This policy covers rescheduling, cancellation and refunds, consistent with the ${TERMS} that you accept when booking.</p>

<h2>1. Cancellation or postponement due to weather and force majeure</h2>
<ul>
  <li>Flights may be changed, moved or cancelled due to bad weather, unsafe wind or other force majeure. In these cases you may <b>reschedule or cancel completely free of charge</b>; any prepaid amount is refunded in full or moved to the new flight date, as you choose.</li>
  <li>You may also reschedule or cancel free of charge in other reasonable force majeure cases.</li>
  <li>On some days bad weather delays the schedule and creates a backlog; your flight may then have to be moved without advance notice. Safety always comes first.</li>
  <li>Weather can change suddenly — please call Mebayluon to confirm flying conditions before you set off.</li>
</ul>

<h2>2. Rescheduling or cancelling for personal reasons</h2>
<ul>
  <li>Flexible schedule: you may reschedule or cancel and receive a <b>full refund</b> (of any prepaid amount), <b>even when cancelling on the day of the flight</b>, provided you <b>notify us before the pickup time</b> (if you booked a transfer) <b>or before the scheduled flight time</b>, by hotline, Zalo, WhatsApp or email.</li>
  <li>You can edit your booking or request cancellation online on the <a href="/en/booking/sua">Manage booking</a> page until <b>18:00 on the day before the flight</b>. After that, or once the booking has been dispatched/ticketed, please call ${HOTLINE} — your right to cancel with a full refund still applies if you notify us before the pickup/flight time.</li>
  <li>If you <b>do not notify us</b> and do not show up, or cancel after part of the services has been used (e.g. the car has picked you up, insurance has been activated, drinks or other services consumed), you pay the actual costs incurred and any remaining prepaid amount is refunded.</li>
  <li>Arriving more than 30 minutes late without notice counts as a cancellation without notice.</li>
</ul>

<h2>3. No refund cases</h2>
<ul>
  <li>Refusal to fly because health condition, weight or age was falsely declared or withheld.</li>
  <li>Refusal to fly due to intoxication, loss of self-control or inappropriate behaviour affecting safety.</li>
  <li>The pilot stops or shortens the flight for safety reasons, or the flight is shorter than expected due to wind (non-motorised paragliding depends entirely on wind).</li>
</ul>

<h2>4. Filming add-ons</h2>
<ul>
  <li>If a paid filming service (flycam, 360 camera…) cannot be delivered or is of unacceptable quality due to an unexpected technical fault, <b>the filming fee is refunded 100%</b>; the flight fee is not refunded because the flight itself was completed fully and safely.</li>
  <li>Flycam is not always available; if it cannot be provided, the flycam fee is refunded 100%.</li>
</ul>

<h2>5. How and when refunds are paid</h2>
<ul>
  <li>Refunds are paid in cash at the site or by bank transfer to the account you provide (PayPal/card payments are refunded through the same channel where possible).</li>
  <li>Mebayluon pays refunds within <b>${pad2(A.refundWorkingDays)} working days</b> after both sides agree on the refund amount and you provide the receiving details. International transfer or payment intermediary fees (if any) will be communicated to you in advance.</li>
</ul>

<h2>6. Contact for rescheduling and cancellation</h2>
<p>Hotline ${HOTLINE} — Email ${E.email} — or the <a href="/en/booking/sua">Manage booking</a> page. Refund complaints are handled under ${L("giai-quyet-khieu-nai", "Complaints and dispute resolution")}.</p>

<h2>7. Company information</h2>
${entityInfoHtml("en")}
`;

const service = `
<p>Mebayluon provides <b>experience services</b> (no goods are shipped). This policy replaces a shipping policy and describes how, when and where the service is provided and the conditions for taking part.</p>

<h2>1. Services</h2>
<ul>
  <li><b>Tandem paragliding:</b> each flight is 1 passenger with 1 professional pilot; the pilot controls the whole flight.</li>
  <li><b>Paramotor (PPG):</b> at our Tú Lệ – Khau Phạ Pass base.</li>
  <li><b>Add-ons:</b> pickup, flycam, 360 camera…, depending on the site (shown during booking).</li>
</ul>

<h2>2. Flying sites and times</h2>
<ul>
  <li>Active flying sites are listed on the <a href="/en/spots">Flying spots</a> page and in the booking form (currently Khau Phạ Pass – Mù Cang Chải, Đồi Bù/Viên Nam – Hanoi, Mường Hoa – Sa Pa, Sơn Trà – Đà Nẵng, Phình Hồ – Trạm Tấu, Quản Bạ – Hà Giang). Coordinates and directions are included in the confirmation email.</li>
  <li>Flight time slots run from 07:00 to 18:00 depending on the site and wind; the exact time is confirmed by our staff.</li>
  <li>Expected airtime is around 10 minutes per non-motorised flight (shorter in weak wind, extended free of charge in good conditions); paramotor flights can be 10–25 minutes.</li>
  <li>Please arrive 15–30 minutes before your flight for check-in and the safety briefing.</li>
</ul>

<h2>3. Pickup</h2>
<ul>
  <li><b>Hanoi:</b> return transfer from the fixed pickup point at GO! Thăng Long mall (pickup 8–9 am), if you book the transfer.</li>
  <li><b>Sa Pa:</b> hotel pickup and drop-off (Sa Pa centre, Lao Chải, Tả Van), if you book the transfer.</li>
  <li>The car arrives about 1 hour before the flight and the driver calls ahead. Without a transfer, you travel to the site yourself using the directions provided.</li>
</ul>

<h2>4. Requirements to fly</h2>
<ul>
  <li><b>Weight:</b> under 120 kg. Over 90 kg or under 30 kg, please tell us in advance so we can assign a suitable pilot and equipment.</li>
  <li><b>Fitness:</b> basic fitness, able to run a short distance.</li>
  <li><b>Health:</b> no conditions that could be dangerous, such as epilepsy, serious heart disease, uncontrolled high blood pressure, neurological disorders, frequent dizziness/fainting, spinal or joint conditions, or conditions requiring regular medication; if you are pregnant, please tell the pilot in advance.</li>
  <li><b>Age:</b> children aged 3 and over can fly and count as a separate passenger (one passenger seat per flight). Passengers under 18 must have a parent or legal guardian present at the site who accepts the Terms &amp; Conditions before the flight.</li>
  <li>Bring an ID card or passport. Wear long sleeves and sports shoes; no high heels or flip-flops; do not bring sharp, bulky or high-value items.</li>
</ul>

<h2>5. Safety and insurance</h2>
<ul>
  <li>Flights are conducted by professionally trained, certified pilots. The final decision on whether to fly, when, the route and landing point rests with the pilot on site.</li>
  <li>Every flight includes <b>accident insurance</b> under the insurance contract held by Mebayluon; coverage follows the insurer’s rules. If you need higher cover, please arrange additional insurance yourself.</li>
  <li>Paragliding is an adventure sport with inherent risks; please read the ${TERMS} before booking.</li>
</ul>

<h2>6. Photo and video delivery</h2>
<ul>
  <li>GoPro (free, handled by the pilot) and flycam files are usually available right after the flight and copied straight to your phone — please keep about 10GB free.</li>
  <li>360-camera files need editing and are sent within 24 hours via Zalo, Google Drive or WhatsApp.</li>
</ul>

<h2>7. Store products</h2>
<p>The Store page presents flying equipment, accessories, books and courses; the Website has no shopping cart. To buy, contact us by hotline/Zalo/WhatsApp; price, fees and delivery (collection at our base or shipping by courier) are stated and agreed with you before payment.</p>

<h2>8. Business eligibility certificates</h2>
<ul>
${E.sportLicenses.map((l) => `  <li>Sports business eligibility certificate No. ${l.no} (${l.issuer}).</li>`).join("\n")}
  <li>Each flying site holds its own operating permit; you may ask us to show the permit for the relevant site before your flight.</li>
</ul>

<h2>9. Company information</h2>
${entityInfoHtml("en")}
`;

const privacy = `
<p>${E.legalNameEn} (“Mebayluon”, “we”) respects and protects customers’ personal data in accordance with Vietnamese personal data protection law (the Law on Personal Data Protection and its implementing regulations). This policy explains what we collect, why, how long we keep it, who can access it and your rights.</p>

<h2>1. Data we collect</h2>
<ul>
  <li><b>When booking a flight:</b> each passenger’s full name (as on passport/ID), date of birth, gender, ID/passport number, weight and nationality; the booker’s phone, email, pickup address and special requests.</li>
  <li><b>When booking a homestay room, registering for an event, contacting us or chatting with our automated assistant (chatbot):</b> the information you enter.</li>
  <li><b>Technical data:</b> a cookie remembering your language; anonymous/aggregated usage statistics from analytics tools; anti-spam checks when submitting forms.</li>
  <li><b>Sensitive data:</b> health information (if you disclose it in special requests or to the pilot) is used only for flight safety. Providing it is voluntary, but without necessary information we may be unable to arrange a safe flight.</li>
</ul>

<h2>2. Purposes</h2>
<ul>
  <li>Receiving, confirming and scheduling flights; assigning pilots, equipment and transport.</li>
  <li>Buying accident insurance for passengers; issuing tickets and flight certificates.</li>
  <li>Customer support, weather-related schedule changes, confirmation emails, sending flight photos/videos.</li>
  <li>Accounting, payment reconciliation and legal obligations.</li>
  <li>Improving the Website and service quality (aggregated statistics).</li>
</ul>
<p>We <b>do not sell</b> personal data and do not use it for other purposes without your consent.</p>

<h2>3. Retention</h2>
<p>Data is kept <b>for the periods required by law</b>. Afterwards — or when you request deletion and there is no legal basis to keep it — the data is deleted or anonymised.</p>

<h2>4. Who can access your data</h2>
<ul>
  <li>Mebayluon dispatch staff, pilots and drivers — only the data they need for their work.</li>
  <li><b>${INSURANCE_PROVIDER_NAME ?? "The insurance company providing the flight accident insurance"}</b> — receives each passenger’s name, date of birth, gender, ID number, nationality and flight date to issue accident insurance.</li>
  <li>Providers of data storage, email, technical infrastructure and operational tools that process data on our behalf under confidentiality agreements and only for the purposes above. Some providers’ servers may be located outside Vietnam; by using our services you agree to this cross-border transfer for these purposes.</li>
  <li>Competent authorities when required by law.</li>
</ul>

<h2>5. Security measures</h2>
<ul>
  <li>The Website is served over encrypted HTTPS; admin areas require login and role-based access.</li>
  <li>ID numbers are partially masked in confirmation emails.</li>
  <li>The Website does not collect card numbers or bank account credentials.</li>
  <li>If a data breach is detected, we handle it and notify as required by law.</li>
</ul>

<h2>6. Your rights as a data subject</h2>
<p>You have the right to: be informed about processing; give or withdraw consent; access, view and correct your data; request deletion, restriction of processing or a copy of your data; object to processing (including use of images for promotion — see section 3 of the ${TERMS}); complain, report, sue and claim damages as provided by law. Withdrawing consent does not affect the lawfulness of processing carried out before.</p>
<p>You can edit your booking details on the <a href="/en/booking/sua">Manage booking</a> page or send a request via the channels in section 7. We respond within the time limits set by law.</p>

<h2>7. Contact about personal data</h2>
<p>Email ${E.email} — Hotline ${HOTLINE} — Head office: ${E.registeredOffice}.</p>

<h2>8. Company information</h2>
${entityInfoHtml("en")}
`;

const complaints = `
<p>Mebayluon aims to resolve every customer concern quickly, objectively and in good faith. This mechanism applies to all transactions on <b>www.mebayluon.com</b> and ${E.tradeName}’s contact channels.</p>

<h2>1. Where to complain</h2>
<ul>
  <li><b>Hotline:</b> +84 964 073 555 (chief pilot) – +84 385 907 789 (flight dispatch); call, Zalo, WhatsApp. For issues at the flying site, please call directly for immediate help.</li>
  <li><b>Email:</b> ${E.email}.</li>
  <li><b>In person:</b> at the flying site, or at our head office, ${E.registeredOffice}.</li>
</ul>

<h2>2. Process</h2>
<ol>
  <li><b>Submit:</b> give your booking code (if any), name, phone number, what happened and what you request; attach photos or documents if available.</li>
  <li><b>Response:</b> Mebayluon responds to your complaint within <b>${pad2(A.complaintResponseWorkingDays)} working day</b> of receiving it, with a proposed resolution. If further verification is needed, we tell you why and the expected timeline within that same period.</li>
  <li><b>Implementation:</b> once agreed, the solution (reschedule, replacement flight, refund…) is carried out under the ${L("huy-doi-lich-hoan-tien", "Cancellation, rescheduling and refund policy")}.</li>
</ol>

<h2>3. Dispute resolution</h2>
<ul>
  <li>Disputes are first resolved through good-faith <b>negotiation</b> and conciliation between the parties.</li>
  <li>If this fails, you may seek assistance from the state consumer-protection authority or consumer-protection organisations, or bring the matter before the <b>competent court</b> where Mebayluon’s head office is located, under Vietnamese law.</li>
  <li>Mebayluon will cooperate with competent authorities and provide transaction information and documents when requested.</li>
</ul>

<h2>4. Company information</h2>
${entityInfoHtml("en")}
`;

export const POLICIES_EN: Record<PolicySlug, PolicyDoc> = {
  "dieu-khoan-su-dung": {
    title: "Terms of Use & General Terms of Transaction",
    description:
      "Terms of use of mebayluon.com and general terms of transaction for booking Mebayluon Paragliding services.",
    html: terms,
  },
  "thanh-toan": {
    title: "Payment Policy",
    description:
      "When and how to pay for Mebayluon paragliding flights: cash, bank transfer, card or PayPal, paid at the flying site.",
    html: payment,
  },
  "huy-doi-lich-hoan-tien": {
    title: "Cancellation, Rescheduling & Refund Policy",
    description:
      "Rescheduling, cancellation and refunds at Mebayluon, including weather-related postponements and force majeure.",
    html: cancellation,
  },
  "cung-cap-dich-vu": {
    title: "Service Delivery Policy",
    description:
      "Flying sites, times, pickup, health and weight requirements, safety and insurance for Mebayluon paragliding flights.",
    html: service,
  },
  "bao-mat-thong-tin": {
    title: "Privacy Policy",
    description:
      "How Mebayluon collects, uses, stores and protects customers’ personal data, and your rights as a data subject.",
    html: privacy,
  },
  "giai-quyet-khieu-nai": {
    title: "Complaints & Dispute Resolution",
    description:
      "Channels, process and time limits for handling Mebayluon Paragliding customer complaints and disputes.",
    html: complaints,
  },
};
