# NOTES — Sửa web theo phản hồi "sửa web MBL3.pdf"

> Ngày thực hiện: 2026-06-15. Người làm: Claude (Claude Code).
> Mục đích file này: liệt kê **chính xác** mọi thay đổi để senior + ChatGPT review.
> Cách kiểm chứng đã làm: `npx tsc --noEmit` (sạch, 0 lỗi) + render thật qua dev server (`pnpm dev` cổng 8080) bằng curl trên từng trang đã sửa.

---

## 0. Bối cảnh quan trọng phát hiện khi đối chiếu code

1. **Ảnh trong PDF là bản build CŨ.** Nhiều yêu cầu đã được sửa từ trước, đã verify trên web hiện tại — **không cần đụng**:
   - "A Dũng" → đã là **"Khang Dũng"** (cả mảng local của trang danh sách lẫn `lib/pilots-data.ts`).
   - "YuPi đã nghỉ" → **không còn entry YuPi** ở bất kỳ nguồn dữ liệu nào.
   - A Mặc: role đã là **"Phi công PG/PPG"**, thành tích đã ghi **"hơn 600 chuyến bay"**.
   - Tiêu đề chi tiết render **đúng hoa** ("A Xiêng"/"A Hưng") — lỗi viết thường trong PDF là của bản cũ, code hiện tại đúng. (Không có CSS `lowercase` nào.)

2. **Có HAI nguồn dữ liệu phi công khác nhau** (dễ gây nhầm khi review):
   - `app/pilots/PilotsClient.tsx` — mảng `pilotsData: PilotCard[]` **local**, chỉ dùng cho **thẻ ở trang danh sách `/pilots`** (name/role/nickname/avatar).
   - `lib/pilots-data.ts` — mảng `Pilot[]` đầy đủ, dùng cho **trang chi tiết `/pilots/[slug]`** (bio/achievements/flyingStyle...).
   → Sửa nội dung bio/sách = `lib`; sửa khung ảnh thẻ = `PilotsClient.tsx`.

3. **Có BA component nút filter khác kiểu nhau** (đã gộp về 1 kiểu — xem Nhóm 6):
   - `app/knowledge/KnowledgeTabs.tsx` (dùng ở `/knowledge`, `/knowledge/all`)
   - `components/knowledge/KnowledgeTabs.tsx` (vẫn còn dùng ở `/knowledge/[sub]` — KHÔNG phải file chết)
   - filter Cửa hàng trong `app/store/components/StoreHomeClient.tsx`

---

## 1. NHÓM 1 — Hồ sơ phi công

| Yêu cầu (PDF) | File / vị trí | Thay đổi |
|---|---|---|
| Ảnh A Mặc & A Hưng: đầu phi công bị thấp, cho cao lên | `app/pilots/PilotsClient.tsx` | Thêm field `imageObjectPosition?` vào type `PilotCard`; component `PilotImage` nhận prop `objectPosition` (mặc định `object-top`). Đặt `imageObjectPosition: "object-[center_72%]"` cho **A Mặc** và **A Hưng** → kéo khung xuống, bỏ bớt khoảng trống nhà sàn/trời phía trên (đã xem 2 ảnh gốc: đều là ảnh đứng toàn thân nhiều headroom). Các phi công khác giữ nguyên `object-top`. |
| A Xiêng — ảnh "bay đôi" báo Lỗi | `lib/pilots-data.ts` (gallery A Xiêng) | URL `"/pilots/A-Xieng/content 1.jpg"` (có **dấu cách**) → `"/pilots/A-Xieng/content1.jpg"`. File thật trên đĩa là `content1.jpg` (đã `ls` xác nhận). **Lỗi chắc chắn.** |
| A Hưng — bio thiếu, cần khớp bản gốc khách | `lib/pilots-data.ts` (A Hưng) | bio 6 ngôn ngữ: thêm "**và Mebayluon Paragliding**", "**gốc** H'Mông", "**vùng đèo Khau Phạ (Mù Cang Chải)**", "vươn lên **trong cuộc sống**". |
| Đặng Văn Mỹ — thêm "số giờ bay cao nhất VN" | `lib/pilots-data.ts` (bio 6 ngôn ngữ) | Thêm câu "**Anh hiện là phi công có số giờ bay cao nhất Việt Nam**" (+ bản dịch en/fr/ru/zh/hi). |
| Đặng Văn Mỹ — sửa "04 đầu sách" + thêm "Làm chủ bầu trời" | `lib/pilots-data.ts` (achievements 6 ngôn ngữ) | "03 đầu sách: Bay thermal, Bay đường trường và Làm chủ dù lượn" → "**04 đầu sách: Bay thermal, Bay đường trường, Làm chủ dù lượn và Làm chủ bầu trời**". |

**Sửa thêm (lỗi tự phát hiện, ngoài PDF nhưng cùng bản chất "lỗi text"):**
- **Đặng Văn Mỹ — bio (vi)**: typo "phi công **nhảy dây** (tumbling)" → "phi công **nhảy dù** (tumbling)" (phần thành tích vốn đã ghi "nhảy dù"; PDF cũng ghi "nhảy dù").
- **A Hưng — phần "Cá tính" (flyingStyle)**: dữ liệu cũ **mất toàn bộ dấu tiếng Việt** (vi), và **sai script** (zh ghi pinyin, ru ghi La-tinh). Đã khôi phục tiếng Việt có dấu + dựng lại tiếng Trung/Nga/Hindi đúng chữ.

---

## 2. NHÓM 2 — Lỗi text mô tả điểm bay

- **File:** `app/spots/[slug]/spot-detail-client.tsx` (khối render list-item của mô tả, ~dòng 3527).
- **Nguyên nhân gốc:** regex tách icon cũ `/^[✅🕒⏳🔄💳]/` **không có cờ `u`** → với emoji astral (🕒🔄💳 là surrogate pair) match **sai**; đồng thời chỉ nhận đúng 5 emoji, các icon khác (🚗 ⏰ 📸 📌 …) không khớp → vừa hiện `•` vừa **giữ nguyên emoji** trong text ("• + emoji") và thành ô vuông nếu font không hỗ trợ.
- **Sửa:** thay bằng nhận diện emoji chuẩn Unicode:
  ```js
  const iconMatch = line.match(/^(\p{Extended_Pictographic}️?)\s*/u);
  const icon = iconMatch ? iconMatch[1] : '•';
  const text = iconMatch ? line.slice(iconMatch[0].length) : line;
  ```
  → bắt **mọi** emoji + biến thể VS16, cờ `u` xử lý đúng surrogate, và **tách icon ra khỏi text** (hết "• + emoji").
- **Đã verify** trên `/spots/vien-nam`: mỗi dòng giờ là `<span>icon</span><span>text(không icon)</span>` sạch (✅/🕒/⏳/🔄/💳 tách đúng). En-dash "10–15" hiển thị đúng.
- *Lưu ý:* file gốc đã chuẩn UTF-8 — KHÔNG phải lỗi encoding. (Có thể bổ sung `<meta charset="utf-8">` tường minh ở layout sau, mức độ nhỏ, chưa làm.)

---

## 3. NHÓM 3 — Typography bài viết blog

- **File:** `app/blog/[slug]/page.tsx`.

| Yêu cầu | Cũ | Mới |
|---|---|---|
| Nền đen → xanh đậm "như lá lúa" | overlay `bg-[#071f0e]/80`; card `bg-[#071f0e]/75` (gần như đen) | overlay `bg-[#0b3a1c]/85`; card `bg-[#14532d]/85` (xanh lá đậm rõ, vẫn đủ tương phản chữ trắng ~7:1) |
| Cỡ tiêu đề bài bị nhỏ / header to hơn tiêu đề | h1 `text-3xl sm:text-4xl` | h1 `text-4xl sm:text-5xl` (tiêu đề trội hẳn → header `text-xl md:text-2xl` không còn "to so với tiêu đề"; giữ nguyên cỡ header) |
| Body text "béo quá / như bôi đen" | lead dùng Merriweather (serif); body `font-normal` | lead bỏ serif (về Roboto) + `font-light`; body paragraph `font-light` (cả block-render dòng ~207 và `prose-p:font-light`) |

*Ghi chú:* body bài viết vốn kế thừa **Roboto** từ `layout.tsx` (chỉ tiêu đề + lead trước đây cố tình dùng Merriweather). "Chữ béo" = lead serif + weight 400 trên nền tối → đã hạ về Roboto/`font-light`.

---

## 4. NHÓM 4 — Cỡ chữ tiêu đề thẻ bài (bé quá → +1 cỡ)

Đồng bộ trang **blog** và **knowledge** (trước đó lệch nhau: blog `text-sm`, knowledge `text-base`):

| File | Vị trí | Cũ → Mới |
|---|---|---|
| `app/blog/page.tsx` | sidebar bài liên quan | `text-sm` → `text-base md:text-lg` |
| `app/blog/page.tsx` | thẻ lưới | `text-sm` → `text-base md:text-lg` |
| `app/knowledge/page.tsx` | sidebar | `text-base` → `text-base md:text-lg` |
| `app/knowledge/page.tsx` | thẻ lưới | `text-base` → `text-base md:text-lg` |

(Áp `replace_all` nên cả bản desktop lẫn mobile của mỗi chỗ đều tăng.)

---

## 5. NHÓM 5 — Đồng bộ tiêu đề section (chữ trắng, nền đen, cùng kiểu)

Áp **một "tấm nền đen" thống nhất** cho 5 tiêu đề trang: `mx-auto w-fit rounded-2xl bg-black/50 px-6 py-3 text-white shadow-lg` + `font-extrabold` (giữ cỡ chữ & vị trí riêng từng trang).

| Trang | File / vị trí | Ghi chú |
|---|---|---|
| Phi công | `app/pilots/PilotsClient.tsx` (h2 introTitle) | bỏ `font-serif` để cùng kiểu sans với các trang khác |
| Cửa hàng | `app/store/components/StoreHomeClient.tsx` (h1) | bỏ `text-center` (đã có `w-fit mx-auto`), `font-bold`→`font-extrabold` |
| Clubhouse/Homestay | `app/homestay/page.tsx` (p tiêu đề) | thay `drop-shadow` rời bằng tấm nền chung |
| Tin tức & Blog | `app/blog/page.tsx` (h1) | thêm `text-white` tường minh (trước chỉ kế thừa) |
| Khóa học & Kiến thức | `app/knowledge/page.tsx` (h1) | **bỏ `uppercase` + `tracking-tighter`** để cùng kiểu; giữ `text-right` + animation theo layout trang |

> **Quyết định chủ quan cần senior xác nhận:** dùng nền đen **bán trong suốt `bg-black/50`** (mềm, vẫn thấy ảnh hero) thay vì đen đặc. Muốn đậm/nhạt hơn chỉ cần đổi `/50` (vd `/60`, `/40`). Tất cả 5 dùng chung 1 chuỗi class nên đổi đồng loạt dễ.

---

## 6. NHÓM 6 — Đồng bộ nút filter ("ô đỏ" cùng kiểu)

Gộp cả **3** nhóm nút về **một kiểu chuẩn** (lấy theo `app/knowledge/KnowledgeTabs.tsx` — active **nền đen chữ trắng**, đúng tông khách thích):
- Base: `flex min-h-12 items-center justify-center rounded-2xl border px-4 py-3 text-base font-semibold ... transition-all duration-200` + focus-ring.
- Active: `bg-black text-white border-white/40 shadow-lg scale-105 font-extrabold`
- Inactive: `bg-white/15 text-white border-white/30 hover:bg-white/25 hover:-translate-y-0.5 hover:shadow-md`

| File | Cũ (tóm tắt) |
|---|---|
| `app/store/components/StoreHomeClient.tsx` | active `bg-white/70 text-black`, `rounded-xl text-sm` → đã đổi sang kiểu chuẩn |
| `components/knowledge/KnowledgeTabs.tsx` | pill `rounded-full`, active `bg-white text-black` → đã đổi sang kiểu chuẩn |
| `app/knowledge/KnowledgeTabs.tsx` | (đã là kiểu chuẩn — giữ nguyên, dùng làm gốc) |

*Chưa làm:* gộp/loại bỏ trùng lặp 2 file KnowledgeTabs (chúng dùng 2 sơ đồ route khác nhau: `?sub=` vs `/knowledge/[sub]`, và bộ nhãn tab khác nhau). Đây là refactor riêng, không thuộc yêu cầu PDF → để lại, chỉ đồng bộ style.

---

## 7. ⚠️ Các quyết định nội dung TỰ RA QUYẾT ĐỊNH — cần khách/senior xác nhận

> Khách yêu cầu "tự ra quyết định, không hỏi". Mình đã quyết theo **bản gốc trong PDF**, nhưng đây là các điểm rủi ro nhất, ưu tiên review:

1. **A Hưng — số chuyến bay: đổi "hơn 200" → "gần 500 chuyến bay đơn"** (cả stat + thành tích, 6 ngôn ngữ). Lý do: bản gốc (chữ in nghiêng) trong PDF trang 2 ghi rõ "gần 500 chuyến bay đơn". ⚠️ Đây là thay đổi **số liệu thật về một người** — cần xác nhận con số 500 đúng (trước đó site ghi 200).
2. **A Mặc — stat đổi "200+ chuyến bay đơn" → "600+ chuyến bay"** cho khớp phần thành tích (vốn đã ghi 600) và bản gốc PDF. Đồng thời **thêm "từ năm 2026"** vào câu định hướng PPG (bản gốc PDF ghi 2026; site cũ ghi 2027 và đã bị bỏ năm). Cần xác nhận mốc 2026.
3. **Đặng Văn Mỹ — quyển sách thứ 4**: PDF khoanh "04" và ghi "Làm chủ bầu trời". Mình hiểu là **thêm cuốn thứ 4 "Làm chủ bầu trời"** (giữ "Làm chủ dù lượn"). Nếu khách ý là **đổi tên** "Làm chủ dù lượn" → "Làm chủ bầu trời" (vẫn 3 cuốn) thì sửa lại. Tên tiếng Anh tự đặt: "Mastering the Sky" (fr "Maîtriser le ciel", zh "驾驭天空") — cần khách duyệt tên dịch.
4. **A Xiêng — biệt danh "Trai Bản Thái Lão Làng"**: PDF khoanh đỏ. Code đang là "**Trai** Bản..." (chàng trai) — **đồng nhất** với văn phong các phi công khác (A Mặc "Trai Bản...", A Hưng "Trai bản..."). Nhận định khách có thể đọc nhầm "Trai"→"Trại". **Giữ nguyên "Trai"**; nếu khách thực sự muốn "Trại" (nghĩa khác hẳn) thì đổi 1 dòng.

---

## 8. Kiểm chứng đã chạy

- `npx tsc --noEmit` → **0 lỗi**.
- Dev server biên dịch tất cả route đã sửa **không lỗi**; curl xác nhận nội dung mới hiển thị đúng trên: `/pilots`, `/pilots/a-mac`, `/pilots/a-hung`, `/pilots/a-xieng`, `/pilots/dang-van-my`, `/blog`, `/blog/[slug]`, `/knowledge`, `/store`, `/homestay`, `/spots/vien-nam`.
- *Chưa chạy* `next build` production đầy đủ (thay đổi đều thuần giao diện/nội dung + 1 regex; typecheck + SSR live đã pass). Nên chạy `pnpm build` trước khi deploy để chắc chắn.

## 9. Danh sách file đã đổi
- `app/pilots/PilotsClient.tsx`
- `lib/pilots-data.ts`
- `app/spots/[slug]/spot-detail-client.tsx`
- `app/blog/[slug]/page.tsx`
- `app/blog/page.tsx`
- `app/knowledge/page.tsx`
- `app/store/components/StoreHomeClient.tsx`
- `app/homestay/page.tsx`
- `components/knowledge/KnowledgeTabs.tsx`

*(`next.config.mjs` có thay đổi từ phiên trước — `outputFileTracingRoot`, KHÔNG thuộc đợt này.)*
