# Nối sổ booking Sa Pa với bảng "Bảng theo dõi chuyến bay"

Điểm Sa Pa có một nhân viên gõ thẳng vào bảng Google Sheets
`1b150BbAiSXAW6m8BzSG_iQCGfn18rb2Dj13achU6dM0` (mỗi tháng một tab: `T1-26`,
`T2-26`, `T3-26`, `T4-2026` … `T9-2026`). Đích đến là bảng đó và **sổ booking
trong app là một** — gõ bên nào cũng sang bên kia.

**Hiện tại mới mở một chiều: app CHỈ ĐỌC bảng.** Chiều ghi đã dựng xong nhưng
đang khoá bằng hai chốt, đợi chốt xong cách làm với nhân viên Sa Pa — xem mục 0.

Booking từ paraglidingsapa.com, Klook và các OTA khác vẫn vào sổ tự động như cũ
(xem [`sapa-web-booking.md`](sapa-web-booking.md)); phần này chỉ lo cái bảng tay.

## 0. HIỆN TẠI: app CHỈ ĐỌC bảng, không ghi một ô nào

> Bảng tính là sổ **sống** của một nhân viên đang làm việc thật trên đó hằng
> ngày. Chừng nào cách nhập booking trong app và thói quen của người đó chưa
> khớp nhau, mọi phép ghi tự động đều là ghi đè lên công việc của người khác —
> mà ghi đè trên Google Sheets thì người ta chỉ biết khi số đã sai.

Nên chiều **app → bảng đang KHOÁ**, và khoá bằng **hai chốt** ở hai đầu (chủ ý:
quên một cái thì vẫn không ai ghi bậy được):

| Chốt | Ở đâu | Mặc định |
|---|---|---|
| `SAPA_CHI_DOC = true` | đầu khối Sa Pa trong [`baocao-apps-script.gs`](baocao-apps-script.gs) | khoá |
| `SAPA_SHEET_WRITE` | biến môi trường trên Vercel | chưa khai = khoá |

Đang khoá thì:

- **Đọc vẫn chạy** — nút "⬇ Lấy từ bảng tính" dùng được ngay.
- Mọi lệnh ghi bị từ chối **kèm lý do**, kể cả việc thêm cột riêng của app.
- Đồng hồ `quetSoBookingSapa` **nằm im** (nó cần ghi cột dấu để nhớ đã khớp tới
  đâu; không ghi được thì cứ 5 phút lại gửi lại cả bảng). Dùng nút trong app.
- Booking lưu trong app **không** đẩy sang bảng; bản ghi mang
  `sheetError: "Bảng tính Sa Pa đang ở CHẾ ĐỘ CHỈ ĐỌC…"` để sau còn đẩy bù.

Phép thử chạy trên bản sao bảng thật đếm được **0 lượt ghi, 0 dòng chèn, 0 cột
thêm** khi đang khoá.

## 0b. Hai nút trong app

Ở thẻ **📒 BOOKING MỚI** của điểm Sa Pa (`/baocao/dieu-phoi`):

| Nút | Làm gì | Ai bấm được |
|---|---|---|
| **⬇ Lấy từ bảng tính** | Đọc tab tháng phủ **7 ngày trước → 30 ngày tới**, đưa vào sổ booking. Không ghi gì lên bảng. | điều phối · quầy · kế toán · quản trị |
| **⬆ Đẩy lên bảng tính** | Ghi booking trong app lên tab tháng. Đang khoá thì báo rõ *"đang ở chế độ chỉ đọc"* chứ không ghi. | kế toán · quản trị |

Bấm xong hiện câu tóm tắt (*"Lấy về 12 booking mới, cập nhật 40 — bảng tính
KHÔNG bị ghi gì"*), và **liệt kê đầy đủ** những dòng có chuyện: lệch TỔNG THU,
số thứ tự phải cấp lại… — in thẳng số dòng để mở đúng chỗ đó trên bảng mà soát.

**Lấy nhiều lần không sinh booking trùng.** Vì app chưa ghi được cột "Khoá app"
lên bảng, nó nhận ra dòng cũ bằng khoá tính từ chính nội dung dòng (`sheetRef`):
`<ngày>#<số thứ tự>`, hoặc `<ngày>@<mã OTA>`, hoặc `<ngày>~<tên khách>`. Nhân
viên điền thêm số thứ tự sau khi dòng đã vào sổ cũng vẫn nhận ra là một dòng.

## 0c. Lưới sổ Sa Pa trong app — `/baocao/so-sapa`

> Đây là lưới **cả tháng** của riêng Sa Pa. Sổ booking của TỪNG NGÀY (mọi điểm)
> cũng có kiểu xem **▤ Sheet** sửa tại ô — xem
> [`baocao-huong-dan.md`](baocao-huong-dan.md#ba-kiểu-xem-sổ-booking). Hai lưới
> dùng chung một phép sửa ô ở máy chủ, khác nhau ở chỗ lưới tháng thêm các cột
> quỹ nhận tiền còn lưới ngày thêm cột thao tác (thu tiền, xuất vé…).

Đường thoát khỏi cảnh hai sổ: một màn hình gõ **như bảng tính**, bố cục cột dựng
lại đúng sổ tay của điểm. Mở bằng thẻ **Sổ Sa Pa** trên thanh điều hướng (chỉ
hiện với người được chỉ định điểm Sa Pa), hoặc nút **▦ Sổ Sa Pa (bảng)** ở thẻ
📒 BOOKING MỚI.

Cả tháng một màn hình, xếp theo ngày rồi theo số thứ tự khách, mỗi ngày một
dòng cộng và cuối bảng một dòng tổng.

**Bàn phím** — thứ quyết định nó có được dùng hay không:

| Phím | Làm gì |
|---|---|
| bấm vào ô | sửa ô đó |
| `Tab` / `Shift+Tab` | sang ô bên; hết dòng thì xuống dòng dưới |
| `Enter`, `↑` `↓` | chạy dọc đúng một cột |
| `Esc` | bỏ dở ô đang gõ, trả lại số cũ |

**Lưu từng ô, không gom cả dòng.** Gõ xong một ô là nó bay đi ngay, ô kế bên gõ
tiếp không phải chờ. Hỏng mạng thì chỉ hỏng đúng ô đó — lưới nói rõ dòng nào, ô
nào, và số cũ tự quay lại.

**Sửa được** (ô nền trắng): nguồn · mã book · tên khách · số khách · đơn giá ·
flycam · 360 · phụ thu · cọc · chiết khấu · SĐT · điểm đón · giờ đón · trạng
thái · ghi chú.

**Máy tính** (ô nền xám): thành tiền · tiền flycam · tiền 360 · TỔNG THU · đã
thu · còn thu · các cột NGƯỜI NHẬN TIỀN. Muốn đổi thì sửa ô gốc — gõ đè lên
tổng là sổ tiền và sổ booking nói hai chuyện khác nhau, đúng cái bệnh của bảng
tính.

Hai nếp của sổ tay được giữ nguyên để khỏi phải học lại: ô **TÊN ĐĂNG KÝ** ghi
mỗi khách một dòng, và ô **Phụ thu khác** gõ **số âm** nghĩa là giảm giá.

Dòng `+ thêm khách cho ngày …` ở cuối mỗi khối ngày tạo ngay một dòng trống để
gõ tiếp — dòng chưa có khách không lọt vào báo cáo nào, bỏ dở thì bấm
**🗑 Nhập nhầm** như mọi booking.

## 0d. Tiền về quỹ nào — các cột "NGƯỜI NHẬN TIỀN"

"Tiền mặt hay chuyển khoản" mới trả lời được nửa câu hỏi. Nửa còn lại, và là
nửa kế toán cần: tiền mặt ấy **ai đang giữ**, khoản chuyển khoản ấy về **tài
khoản nào**. Sổ tay Sa Pa vốn đã chia thành từng cột theo đúng chuyện đó.

Từ 09/09/2026 mỗi khoản thu mang thêm mã **quỹ nhận**. Khai ở
[`lib/baobay/money-dest.ts`](../lib/baobay/money-dest.ts):

| Mã | Hiện trên màn hình | Đường tiền | Cột trên sổ tay |
|---|---|---|---|
| `tk-truong` | TK Trường | chuyển khoản | TK Trường |
| `tm-yen` | TM c Yến | tiền mặt | TM c Yến |
| `ngoai-te` | Ngoại tệ | ngoại tệ | NGOẠI TỆ |
| `tk-cty` | TK Cty | chuyển khoản | TK Cty |
| `pos` | POS (quẹt thẻ) | POS | POS |

Ô chọn quỹ hiện ở **bảng thu tiền trên dòng booking** và ở **lệnh thu tiền**;
chọn cả hai bên khi khách trả một phần tiền mặt một phần chuyển khoản. Không
chọn thì máy xếp vào quỹ đầu tiên cùng đường tiền — sổ vẫn đủ số, chỉ là có thể
nằm sai cột.

> **ĐỔI NGƯỜI THÌ SỬA `label`, ĐỪNG SỬA `id`.** "Trường", "c Yến" là tên người,
> mà người thì đổi. `id` đã nằm trong mọi bản ghi thu tiền cũ — đổi là những
> khoản ấy mất quỹ và biến khỏi mọi cột. Người mới giữ cùng một túi thì giữ
> nguyên id, chỉ sửa tên hiển thị (và sửa tên cột tương ứng trong Apps Script).

Điểm nào **chưa khai** danh sách quỹ thì giao diện không hỏi gì thêm — Khau Phạ
và Hà Nội không phải đổi cách nhập tiền.

Khi đã mở khoá ghi, app đẩy các cột này sang sổ tay. Nó **chỉ gửi quỹ nào thật
sự có tiền**: quỹ trống thì không gửi và ô trên bảng nằm yên, nhờ vậy con số kế
toán đã gõ tay từ trước không bị xoá trắng chỉ vì app chưa biết tới nó.

## 1. Một cách cấp số duy nhất

Cột **B** của bảng (tiêu đề ghi là "Ghi chú", thực chất là **số thứ tự khách
trong ngày**) chính là `daySeq` của app.

| Tình huống | Ai cấp số |
|---|---|
| Nhân viên gõ dòng mới, **để trống** cột B | app cấp, vài phút sau máy điền vào ô |
| Nhân viên gõ sẵn số, số đó **chưa ai dùng** | giữ nguyên số nhân viên gõ |
| Số đó **đã thuộc khách khác** trong ngày | app cấp số mới, ghi đè lên ô B và ghi lý do vào cột **Ghi chú app** |
| Lập booking trong app | app cấp, đẩy sang bảng |
| Khách dời sang ngày khác | trả số cũ về kho của ngày cũ, nhận số mới của ngày mới |

Nhờ vậy **"khách số 4 ngày 12/9"** là đúng một người, gọi ở bảng tính hay trong
app đều ra người đó. Số không phải là duy nhất toàn hệ — luôn phải đi kèm ngày.

## 2. Cột nào nối với cái gì

Script dò cột theo **tên ở hàng 3**, không theo thứ tự — kéo cột đổi chỗ hay
chèn thêm cột riêng của kế toán đều không sao.

| Cột bảng tính | Trường trong app | Ghi chú |
|---|---|---|
| A `Tháng` | — | app điền "thg 9" cho khớp nếp cũ |
| B `Ghi chú` | `daySeq` | **số thứ tự khách trong ngày** |
| C `Ngày bay` | `flightDate` | |
| D `Code đại lý or lẻ` | `source` | Klook / web / tên khách sạn / "ngoại giao"… |
| E `Số booking` | `bookingCode` | mã OTA |
| F `TÊN ĐĂNG KÝ` | `contactName` + `otaGuests` | mỗi khách một dòng trong ô; dòng đầu là tên liên hệ, cả danh sách vào hồ sơ chờ bảo hiểm |
| G `SL MCC` | `guestCount` | |
| H `Đơn giá` | `unitPrice` | |
| I `Thành tiền` | *(công thức của bảng)* | app **không ghi**, chỉ đặt công thức khi tạo dòng mới |
| J–K `Flycam` | `flycam` + tiền | 300.000 / suất |
| L–M `360` | `video360` + tiền | 500.000 / suất |
| N `Phụ thu khác` | `pickupFee` (âm ⇒ `discount`) | gộp cả dù cờ đỏ, bay kéo cờ — bảng không có cột riêng |
| O `TỔNG THU` | *(công thức của bảng)* | app so với số của mình, **lệch thì báo chứ không bẻ số** |
| P `ĐẶT CỌC` | `deposit` | |
| Q–W `NGƯỜI NHẬN TIỀN` | `collectedLog[].dest` · `depositDest` | app cộng từ các khoản thu — xem mục 0d |
| X `Chiết khấu đại lý` | `commission.amount` | |
| Y–AC, AD | — | chi khoản phụ và "phi công bay" — **ô gộp theo ngày, tuyệt đối không ghi** |

Khi đã **mở khoá ghi** (mục 0), script tự thêm 8 cột ở cuối bảng trong lần chạy
đầu — đang khoá thì không thêm gì:

`SĐT` · `Điểm đón` · `Giờ đón` · `Trạng thái` · `Đã thu (app)` · `Ghi chú app` ·
`Khoá app` · `Dấu app`

Hai cột cuối là của máy — nên **ẩn đi** cho gọn, nhưng đừng xoá: xoá `Khoá app`
là app mất dấu dòng nào ứng với booking nào và sẽ tạo lại từ đầu.

## 3. Ai thắng khi hai bên cùng sửa

**Bên nào gõ sau thì bên đó thắng.** Máy nhận ra "vừa có người gõ" bằng cột
`Dấu app`: mỗi lần hai bên khớp nhau, script ghi vân tay của dòng vào đó; lượt
quét sau thấy vân tay khác đi tức là có người sửa trên bảng.

Ba ngoại lệ, đều là chỗ máy **không được** lật lại quyết định của người:

- Booking đã bấm **🗑 Nhập nhầm** (bỏ khỏi sổ) → bảng tính không dựng lại được.
- Ô **Trạng thái** để trống → giữ nguyên trạng thái trong app (ô trống nghĩa là
  "chưa nói gì", không phải "chờ bay").
- Ô **Thành tiền** / **TỔNG THU** đã có số gõ tay → app không đè lên; nó chỉ
  ghi cảnh báo vào `Ghi chú app` khi số của hai bên lệch từ 1.000đ trở lên.

## 4. Bật lên

### Bây giờ — để nút "⬇ Lấy từ bảng" chạy (bảng vẫn không bị ghi)

> **HAI BẢNG, ĐỪNG NHẦM.** Điểm Sa Pa đã có một bảng Google Sheets khác đang
> chạy: bảng **BÁO BAY** (tab *Phi công · Điều phối · Chốt ngày · Booking* +
> thẻ từng phi công theo tháng), khai ở ô "Webhook Google Sheets" trong
> `/baocao/admin`. **Đừng dán địa chỉ sổ tay đè lên ô đó** — báo cáo hằng ngày
> của cả điểm sẽ ngừng chảy. Sổ tay có ô riêng, thêm ngày 09/09/2026.

1. **Tạo Apps Script MỚI, gắn vào chính bảng "Bảng theo dõi chuyến bay"** —
   mở bảng đó → Tiện ích mở rộng → Apps Script (dự án này còn trống) → dán
   toàn bộ [`baocao-apps-script.gs`](baocao-apps-script.gs) (bản
   `baobay-multispot-v30`) → sửa dòng `const SECRET` thành một chuỗi tự đặt →
   Triển khai → **Tuỳ chọn triển khai mới** (Ứng dụng web · thực thi với tư
   cách TÔI · quyền truy cập BẤT KỲ AI) → chép đường dẫn `…/exec`.

   *Dán bản này KHÔNG làm bảng bị ghi gì:* `SAPA_CHI_DOC` để sẵn `true`.

2. **Dán vào /baocao/admin → điểm Sa Pa → khối vàng "Sổ tay booking gõ tay"** —
   ô *Webhook sổ tay booking* và ô *Mã bảo vệ sổ tay* (đúng chuỗi `const SECRET`
   ở bước 1). App chặn nếu dán trùng địa chỉ với bảng báo bay.

3. **Deploy app** (mã mới phải lên Vercel). Không cần khai thêm biến môi trường
   nào cho chiều ĐỌC.

Xong ba bước là bấm được nút **⬇ Lấy từ bảng tính**. Kiểm nhanh bằng menu
**Sổ booking → Xem chế độ** ngay trên bảng tính.

Bảng báo bay của Sa Pa cũng nên dán bản `v30` (nó chỉ thêm khối Sa Pa nằm im ở
cuối, không đổi gì phần cũ) để hai bảng đừng lệch phiên bản.

### Sau này — khi đã chốt cách làm với nhân viên Sa Pa

4. **Mở chốt bên bảng**: trong Apps Script của **sổ tay**, sửa
   `const SAPA_CHI_DOC = false;` rồi **triển khai lại**.
5. **Mở chốt bên app**: Vercel → `SAPA_SHEET_WRITE=1` → deploy lại.
6. **Đặt đồng hồ** cho chiều bảng → app tự động: Apps Script của sổ tay →
   Triggers → Add trigger → `quetSoBookingSapa` → Time-driven → Minutes timer →
   **Every 5 minutes**.
7. **Khai mã cho cửa nhận tự động**: Vercel → `SAPA_SHEET_SECRET` = đúng chuỗi
   `const SECRET` của sổ tay (chưa khai thì app đọc `BAOBAY_SHEET_SECRET`).
   Bước này chỉ cần cho đồng hồ ở bước 6; nút bấm tay không dùng tới.

Từ lúc đó chiều app → bảng chạy ngay không cần đồng hồ: mỗi lần booking Sa Pa
được lưu, app đẩy một dòng sang. Mỗi lượt quét gửi tối đa 50 dòng, lượt sau gửi
tiếp — tab tháng 9 có 232 dòng khách nên lần đầu mất khoảng 5 lượt (~25 phút)
để khớp hết.

## 5. Phạm vi và giới hạn — đọc trước khi thắc mắc

- Đồng hồ tự động chỉ quét **tab tháng này và tháng trước**, và chỉ những chuyến
  trong **45 ngày gần đây hoặc ở tương lai**. Tháng cũ là sổ kế toán đã chốt,
  không đụng tới. Nút bấm tay quét **7 ngày trước → 30 ngày tới** (đủ ôm mấy hôm
  vừa bay mà kế toán còn sửa tiền, cộng toàn bộ booking sắp tới).
- **Dòng chi phí chung của mỗi ngày** (chỉ có ngày + mấy ô "Chi khác", không có
  tên, không có số khách, không có mã book) bị bỏ qua — nếu không app sẽ đẻ ra
  booking ma không tên không khách. Đo trên tab tháng 9: bỏ đúng 9 dòng, giữ
  223 dòng khách.
- **Các cột "NGƯỜI NHẬN TIỀN" app GHI được nhưng KHÔNG ĐỌC ngược.** App tự cộng
  từ các khoản thu (mục 0d) và đẩy sang khi đã mở khoá ghi. Chiều ngược lại thì
  không: một con số trần trong ô "TK Trường" không nói được nó gồm mấy lần thu,
  của ai, ngày nào — dựng lại thành các khoản thu là đoán, mà đoán tiền thì sai
  ở chỗ không ai kiểm được. Muốn số vào app thì thu tiền trong app.
- **Đầu tháng mới**: script không tự tạo tab tháng. Nhân viên nhân bản tab tháng
  cũ và xoá dòng dữ liệu như vẫn làm; đặt tên `T10-2026` (kiểu cũ `T10-26` cũng
  nhận). Chưa có tab thì app báo *"không tìm thấy tab tháng"* và giữ booking ở
  `sheetSynced: false` để đẩy bù sau.

## 6. Bảng giá Sa Pa trong app

Khai ở [`lib/baobay/flight-price.ts`](../lib/baobay/flight-price.ts), khác Khau Phạ ba chỗ:

| | Sa Pa | Khau Phạ |
|---|---|---|
| Đơn giá PG | 2.190.000 **đồng giá mọi ngày** | 2.190.000 / 2.590.000 cuối tuần & lễ |
| Flycam | 300.000 | 400.000 |
| Camera 360 | 500.000 | 400.000 |
| Giảm combo flycam+360 | **không có** | −100.000 mỗi cặp |
| Dù cờ đỏ | 400.000 | 400.000 |

Đây là số máy **điền sẵn**; khách Klook/GYG có giá net riêng (1.940.000…) thì
nhân viên sửa thẳng ô đơn giá, máy không ghi đè.

## 7. Chạy lại phép thử

```bash
# Cửa nhận + cấp số + tiền — chạy trên một cơ sở dữ liệu nháp, tự xoá lúc xong
MONGODB_URI='<chuỗi nối Atlas>' npx tsx scripts/baocao/test-so-sapa.ts
```
