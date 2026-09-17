# Trang báo bay nội bộ — hướng dẫn dùng

Đường dẫn: **mebayluon.com/baocao**

Khu này dành cho nhân sự điểm bay, không phải cho khách: chặn Google index
(robots.txt + header `X-Robots-Tag` + metadata trang), ẩn thanh menu và cụm nút
Zalo/chatbot của website. Trang phi công có song ngữ Việt–Anh trong ngoặc.

## Ba điểm bay — ba hệ thống riêng

Hệ thống chạy ở **Hà Nội · Khau Phạ · Sa Pa**. Mỗi điểm là một hệ thống độc lập:
báo cáo riêng, đối chiếu riêng, chốt ngày riêng, tổng hợp riêng, và **một bảng
Google Sheets riêng**.

- **Admin chỉ định** mỗi người làm ở điểm nào (tick nhiều điểm được). Phi công A
  chỉ định Khau Phạ + Sa Pa thì trong trang báo cáo có nút chọn 1 trong 2; báo
  cho điểm nào số vào điểm đó. Kế toán có thể quản cả ba.
- Người không được chỉ định một điểm thì **không đọc cũng không ghi** được số
  của điểm đó (máy chủ chặn, không chỉ ẩn nút).
- Cùng một người, cùng một ngày, hai điểm = **hai bản ghi riêng**, không đè nhau.
- Cấu hình từng điểm ở `/baocao/admin`: giờ chốt báo cáo + webhook bảng Sheets
  riêng của điểm (dán đường dẫn Apps Script của bảng đó).

## Bốn nhóm nhân sự

| Vai trò | Trang | Nhập gì |
|---|---|---|
| **Phi công** | `/baocao/phi-cong` | Số chuyến + mã vé đã bay; dịch vụ gia tăng (flycam, 360, cờ đỏ, kéo cờ — **chỉ số lượng, mã vé tuỳ chọn**); khách ngoại giao; thu/chi trong ngày; **thêm / huỷ dịch vụ cho booking** (hai thẻ cuối trang, 12/09). Không có Hàng bán thêm |
| **Điều phối bay** | `/baocao/dieu-phoi` | Số khách, vé xuất/thu về, dải mã vé, vé huỷ/dời lịch, flycam, 360, cờ đỏ, bay kéo cờ, khách ngoại giao, tiền mặt + CK, chi cho khách |
| **Camera man** | `/baocao/camera` | Số chuyến quay flycam (+ mã vé nếu ghi được), chi tiêu |
| **Kế toán tổng hợp** | `/baocao/chot-ngay` | Số tổng chốt ngày, duyệt chi tiêu, duyệt lệch, bấm **Chốt ngày** |

Kế toán còn hai trang xem: `/baocao/tong-hop` (theo kỳ, tải CSV) và
`/baocao/bao-cao-thang` (mỗi phi công một khối, cột ngày 1–31 + "đến hôm nay" +
"cả tháng"). Phi công / điều phối / camera man có khung **"Tổng theo chu kỳ"**
ngay trong trang của mình — chọn khoảng ngày là thấy tổng từng nội dung mình đã
báo (chỉ số của chính mình).

Đăng nhập xong hệ thống tự đưa về đúng trang của vai trò.

## Luồng một ngày

1. **Nhân viên nhập** trong ngày. Mỗi người mỗi ngày MỘT bản ghi — mở lại cùng
   ngày là sửa, không tạo dòng mới. Phi công và camera man có nút **Chốt báo
   cáo** (khẳng định số đã xong); mã vé sai dạng hoặc số chuyến lệch số mã thì
   không chốt được.
2. **App đối chiếu** mọi phía với nhau và với số kế toán:
   - **Mã vé BAY** khớp tới TỪNG MÃ: hai phi công cùng khai một mã, mã không
     thuộc dải đã xuất, mã đã xuất mà không ai khai — đều báo đỏ đúng người.
   - **Báo đỏ CHỈ hiện trên trang của người thật sự dính số liệu đó.** Hai phi
     công khai trùng một mã thì đúng hai người ấy đỏ; phi công khác vẫn "sạch",
     chỉ thấy dòng nhắc *"ngày đang treo vì lỗi ở người khác"*. Bảng phân công
     trách nhiệm:

     | Lỗi | Ai thấy báo đỏ |
     |---|---|
     | Mã vé trùng giữa hai phi công | đúng hai phi công khai trùng |
     | Mã lạ / mã đã huỷ mà vẫn khai bay | phi công khai mã đó |
     | Số chuyến ≠ số mã · chưa bấm chốt | chính người đó |
     | Dải mã hai bên khác nhau · mã huỷ-dời sai | điều phối |
     | Lệch tiền · lệch số vé với kế toán | điều phối |
     | Lệch flycam | điều phối + camera man |
     | Lệch 360 / cờ đỏ / kéo cờ | điều phối + phi công **có mã dính chỗ lệch** |
     | Mã thiếu · vé xuất ≠ bay + thu hồi · chưa duyệt chi | chỉ kế toán (không quy cho phi công nào) |

   - **Cùng một mã bay ở hai ngày khác nhau**: app nhắc ngay lúc phi công lưu
     ("mã này đã khai bay ngày …"). Một vé chỉ bay một lần — vé dời lịch bị huỷ
     ở ngày cũ và ngày mới xuất vé khác.
   - **Ngày trắng** (mưa gió, không bán vé nào): kế toán khai 0 hết là chốt được
     ngay, không đòi báo cáo của phi công hay điều phối.
   - Vé xuất = đã bay + huỷ + dời lịch (vé không bay chỉ có hai đường này).
   - **Dịch vụ gia tăng — mỗi thứ một CẶP đối chiếu riêng:**

     | Dịch vụ | Cặp khớp lệnh | Ghi chú |
     |---|---|---|
     | Flycam | điều phối = **camera man** | Bằng nhau là xong, không cần soát số phi công. Lệch mới lôi số phi công ra làm căn cứ. |
     | Camera 360 | điều phối = **phi công** | |
     | Dù cờ đỏ | điều phối = **phi công** | |
     | Bay kéo cờ | điều phối = **phi công** | |

   - **Mã vé dịch vụ KHÔNG bắt buộc nhập.** Chỉ khi số lệch app mới đòi mã: hai
     bên đã ghi thì app chỉ thẳng vé nào lệch, chưa ghi thì nhắc bổ sung.
   - Lệch dịch vụ thì **kế toán duyệt lệch** được — khách hay phát sinh ngay tại bãi.
   - Có chi tiêu mà kế toán chưa tick "đã xác nhận" thì chưa chốt được.
3. **Kế toán ĐỐI SOÁT rồi XÁC NHẬN, không gõ lại.** Trang Chốt ngày hiện số
   nhân viên đã báo ngay cạnh từng ô: ô số có dòng *"✓/≠ điều phối báo: X —
   lấy số này"*, các trường mã vé (dải mã đã xuất, mã huỷ, vé dời lịch) có nút
   *"⧉ chép để xác nhận"*, và trên cùng có nút **"⧉ Chép toàn bộ số nhân viên
   báo"**. Đúng thì chép — số tự đẩy về trường của kế toán; sai thì KHÔNG chép,
   sửa hộ (khung báo cáo phi công) hoặc truy người nhập. Số chốt vẫn là con số
   kế toán tự chịu trách nhiệm: chép xong sửa tay được.
4. **Kế toán chốt ngày** khi sạch lỗi đỏ. Chốt xong ngày bị KHOÁ — không ai sửa
   được nữa; cần sửa thì kế toán **gỡ khoá** (có ghi vết ai gỡ, lúc nào, vì sao).
5. **Tổng của kỳ và báo cáo tháng chỉ cộng ngày đã chốt.** Ngày treo/chưa chốt
   được liệt kê riêng.

## Nhiều người cùng vai trò

Điều phối, camera man (và phi công) đều có thể **nhiều người báo cáo độc lập**
trong cùng một ngày — mỗi người một bản ghi, hệ thống tự cộng tổng khi đối chiếu
và lên bảng. Kế toán cũng nhiều người ngang cấp: bản chốt của ngày là MỘT bản
chung, ai lưu/chốt cũng được; một người chốt rồi thì người kia không cần chốt
lại (muốn sửa thì gỡ khoá — có ghi vết ai chốt, ai gỡ).

## Kế toán chọn nguồn hoặc yêu cầu soát lại

Ba ô dịch vụ trên trang Chốt ngày hiện **cả hai nguồn** kèm nút lấy số:

| Dịch vụ | Nguồn 1 | Nguồn 2 |
|---|---|---|
| Flycam | camera man báo | điều phối báo |
| Camera 360 | phi công báo | điều phối báo |
| Bay kéo cờ | phi công báo | điều phối báo |

Khớp thì chip xanh ✓; lệch thì kế toán **bấm nhận nguồn mình tin**, hoặc dùng
khung **"📣 Yêu cầu soát lại"**: chọn chủ đề + lời nhắn + Gửi lệnh. Lệnh hiện
ngay (trong 30 giây) thành băng rôn cam trên trang của ĐÚNG vai trò liên quan
(flycam → điều phối + camera man; 360/cờ đỏ/kéo cờ → điều phối + phi công) và
tự tan khi kế toán đánh dấu đã xử lý hoặc chốt ngày.

## Soát chuyển khoản (🏦 thẻ trong trang kế toán) — cái gì được giấu (từ 16/09/2026)

- **Khoản đã xong** = kế toán đã tích **Đã nhận**, hoặc máy đã **khớp** được
  dòng sao kê. Khoản xong **không bày ra** nữa: trong thẻ booking chỉ còn các
  khoản **chờ soát**, kèm một dòng đếm "✓ 2 khoản đã soát (…) — còn 1 khoản
  chờ" và nút *Xem* để mở lại.
- **Booking đã xong** (mọi khoản đều xong, không còn sao kê nghi ngờ, không thu
  thừa) **tự ẩn** khỏi danh sách; nút "✓ N booking đã soát xong — hiện ra" mở
  lại khi cần soi. Booking còn **dù chỉ một** khoản chờ thì vẫn hiện.
- "Còn thu" (khách chưa trả hết) hay sao kê về thiếu so với lệnh **không** giữ
  thẻ lại: đó là công nợ của booking, không phải việc soát — tiền chưa về thì
  chưa có gì để soát. Khoản rời không gắn booking đã tích cũng giấu.

## Chuyến PPG

Mọi ô báo cáo mặc định là **PG**. Phi công bay dù CÓ ĐỘNG CƠ khai thêm ở khối
**"Chuyến PPG"**: số chuyến – mã vé – số chuyến KHÔNG vé. Vé không bắt buộc,
nhưng phải khai rõ: **mã vé + không vé = số chuyến PPG** mới chốt được (có vé
thì điền mã, không vé thì đếm vào ô "không vé"). Số PPG lên thẻ phi công trên
Sheets (cột "Chuyến PPG", "Mã vé PPG" — chuyến không vé ghi "không vé (N)"),
bảng kê và báo cáo tháng.

## Ba kiểu xem sổ booking

Thẻ 📒 booking của ngày xem được theo ba kiểu, đổi ở dải nút ngay trên danh
sách. Máy nhớ lựa chọn của bạn, và cả ba đều bật được **⛶ Toàn màn hình**.

| Kiểu | Giải việc gì | Sửa thế nào |
|---|---|---|
| **☰ Thẻ** | làm việc với MỘT khách — đủ nút, đủ chỗ đọc, hợp lúc khách đứng trước mặt | mở thẻ ra sửa |
| **▦ Bảng** | QUÉT MẮT cả ngày — bấm đầu cột để xếp, so số nhanh | phải mở thẻ |
| **▤ Sheet** | GÕ cả ngày — bấm thẳng vào ô là sửa, chạy bằng bàn phím | sửa tại ô, lưu ngay |

**Sheet** cho lúc nhập bù cuối ngày hoặc sửa một loạt sau khi đối chiếu: mười
lăm dòng mỗi dòng một ô mà phải mở mười lăm cái thẻ là mười lăm lần mất chỗ
đang nhìn.

| Phím | Làm gì |
|---|---|
| bấm vào ô | sửa ô đó |
| `Tab` / `Shift+Tab` | sang ô bên; hết dòng thì xuống dòng dưới |
| `Enter`, `↑` `↓` | chạy dọc đúng một cột |
| `Esc` | bỏ dở ô đang gõ, trả lại số cũ |

Cột **Thao tác** cuối mỗi dòng mang **đúng những nút của thẻ**: thu tiền · xuất
vé · đã bay · bay không vé · sửa thu · bảo hiểm · ⋯ Thêm. Không phải bản rút
gọn — một lưới chỉ sửa được số mà không thu được tiền thì cuối cùng vẫn phải
quay lại thẻ.

Ô **nền trắng** sửa được, ô **nền xám** máy tự tính (thành tiền, TỔNG, còn thu)
— muốn đổi thì sửa ô gốc. Cột hiện ra tuỳ điểm bay: Sa Pa không có "bay hoàng
hôn", Hà Nội có "xe lên núi", Khau Phạ có cột PPG.

Dòng kế toán đã **🔒 khoá** thì điều phối không sửa được; chính kế toán vẫn sửa
(họ là người khoá và mở khoá).

Riêng điểm **Sa Pa** còn có một lưới nữa ở `/baocao/so-sapa`: cả tháng một màn
hình, bố cục cột dựng lại đúng sổ tay Google Sheets của điểm — xem
[`sapa-so-booking-sheets.md`](sapa-so-booking-sheets.md).

## Quy tắc nhập liệu

- **Mã vé chỉ BẮT BUỘC ở Khau Phạ** (vé 3 liên in mã, đối chiếu tới từng mã).
  Hà Nội / Sa Pa: khai được thì tốt — mã đã khai vẫn bị soát trùng/lạ, nhưng
  không đòi đủ, không truy "mã thiếu", và cân bằng vé xuất = bay + thu hồi đếm
  theo SỐ CHUYẾN khai thay vì số mã.
- **Khoản thu có tên** (trang điều phối): dưới hai ô Tiền mặt / Chuyển khoản có
  nút **+ Thêm khoản thu** — mỗi dòng: nội dung – chọn tiền mặt HOẶC CK – số
  tiền. Máy chủ tự cộng vào hai tổng, bảng tính có cột "Chi tiết tiền thu".
- **Bảng kê phi công**: kế toán/quản trị tải Excel của TỪNG phi công theo chu
  kỳ (nút ⬇ Tải ở bảng theo phi công, trang Tổng hợp); phi công tự tải bảng của
  chính mình (nút ở khung Tổng theo chu kỳ). **Phi công chỉ tự tra được 45 ngày
  gần nhất** — bảng kê, tổng chu kỳ, xem lại ngày cũ đều bị khoá quá hạn đó;
  kế toán và quản trị xem không giới hạn.
- **Mã vé** dạng 1–3 chữ + 3–6 số: `A1234`, `AB1234`, `KP-001234`. Dán danh sách
  cách nhau bằng khoảng trắng / phẩy / chấm / gạch đều được; dải mã viết
  `A1234..A1240`. Mã thường tự in hoa, mã trùng chỉ tính một lần.
- **Khách ngoại giao**: không thu tiền nhưng VẪN xuất vé — vé nằm trong dải mã
  và vẫn phải có phi công khai đã bay.
- **Chi tiêu khác**: mỗi khoản một dòng — nội dung, số tiền, ghi chú. Bấm
  "+ Thêm khoản chi" để thêm dòng.
- Chỉ nhập được trong **60 ngày gần đây**, không nhập ngày tương lai; ngày tính
  theo giờ Việt Nam. Mở trang là form tự về **hôm nay**.
- **Phạt nộp muộn**: phi công chốt báo cáo LẦN ĐẦU sau giờ quy định (admin đặt ở
  /baocao/admin, mặc định 20:00, đổi là hiệu lực ngay) bị ghi phạt **200.000đ/lần**.
  Chỉ tính giờ chốt — sửa báo cáo đã chốt kịp giờ không tính lại. Phạt hiện ở
  trang phi công, bảng theo phi công, báo cáo tháng và cột "Phạt nộp muộn" trên
  Sheets.

  **Phạt TẠM TÍNH và cách nó tự huỷ.** Quá giờ mà chưa thấy báo cáo thì hệ thống
  chưa biết người đó có bay hay không (hôm nay 10 phi công nhưng chỉ 7 người
  bay), nên mọi phi công chưa nộp đều bị **báo phạt tạm tính** — thấy ngay trên
  trang của mình và ở khung *"Phạt nộp muộn trong ngày"* của kế toán. Đến khi kế
  toán **chốt ngày** thì mọi việc đã rõ:

  | Tình huống | Kết quả sau khi chốt |
  |---|---|
  | Không bay, không báo cáo | **tự huỷ**, không sinh khoản phạt nào |
  | Có báo cáo nhưng 0 chuyến | **tự huỷ** (0 chuyến thì không phải báo cáo) |
  | Có bay, chốt muộn | **phạt thật 200.000đ** |
  | Có bay, kế toán chốt hộ sau giờ | **vẫn phạt** — trừ khi kế toán huỷ lệnh phạt |

  **Huỷ lệnh phạt**: chỉ kế toán, ở khung "Phạt nộp muộn trong ngày" trên trang
  Chốt ngày, bắt buộc ghi lý do; bấm lại là *phạt lại*. Huỷ được cả khi ngày đã
  chốt (đây là quyết định về lương, không phải sửa số liệu). Bản ghi vẫn giữ dấu
  "hôm đó nộp muộn", chỉ số tiền về 0 — Sheets có cột **"Huỷ phạt"** ghi lý do.
- **Tiền đang giữ và đưa cho quản lý**: mọi trang nhân sự (phi công, điều phối,
  camera man) đều có khung *"Tiền đang giữ và đưa cho quản lý"*. Số đang giữ do
  máy tự cộng, không ai gõ tay:

      đang giữ = thu hộ − chi tại bãi − đã đưa quản lý

  *Thu hộ* là các dòng tick **THU** trong sổ thu/chi (khách trả tiền tại bãi, thu
  flycam, thu dịch vụ…), riêng điều phối cộng thêm **tiền mặt bán vé** (khoản
  chuyển khoản vào thẳng tài khoản công ty nên không tính là đang cầm).

  Khai một khoản đưa tiền: **giao cho ai** – **ngày** (mặc định hôm nay) – **số
  tiền** – **tiền mặt/CK** – **nội dung** – bấm *Xác nhận đã đưa*. Người nhận do
  chính người giao chọn: giám đốc, kế toán hay điều phối — ai đang cầm tiền ở
  điểm bay đó (không tự giao cho mình, không giao cho người không làm ở điểm bay
  đó). Lệnh chạy thẳng về **trang của người nhận**: họ thấy khung xanh *"Có người
  giao tiền cho anh/chị"* với hai nút **Xác nhận đã nhận** / **Từ chối** (tự hiện
  trong vòng 20 giây, không phải tải lại trang). Chỉ đúng người nhận bấm được —
  người khác bấm thì máy chủ chặn; riêng quản trị vẫn xác nhận thay được từ
  `/baocao/admin` khi cần. Khai xong là **trừ ngay** khỏi
  số đang giữ (người đưa không còn cầm tiền nữa), khoản đó hiện *chờ xác nhận*
  cho tới khi quản lý ký nhận. Số âm nghĩa là người đó đã chi/đưa nhiều hơn thu
  hộ — công ty hoàn lại.

  Bên `/baocao/admin`, khung **"Tiền nhân sự giao quản lý"** cho quản trị nhìn
  TOÀN BỘ điểm bay: hiện khoản mới trong vòng 20 giây (tự làm mới), có **số đỏ
  trên từng điểm bay** đếm khoản chưa xác nhận, và cột *"→ người nhận"*. Người
  nhận (hoặc quản trị) bấm *Xác nhận* (ghi ai nhận, lúc nào) hoặc *Từ chối* kèm lý do —
  từ chối thì tiền được **cộng trả lại** vào số nhân sự đang giữ. Việc ký nhận
  tiền làm được cả khi ngày đã chốt: đó là chữ ký nhận tiền, không phải sửa số
  liệu của ngày.
- **Kế toán sửa hộ**: trang Chốt ngày có khung "Báo cáo phi công trong ngày" —
  kế toán sửa trực tiếp từng báo cáo (đi cùng đường kiểm tra với chính phi công,
  không làm tính lại phạt).

## Ứng tiền

Nhân sự xin ứng ngay trong khung *"Tiền đang giữ và giao tiền"*: **nội dung ứng
tiền – số tiền – chọn người xác nhận – Gửi yêu cầu**. Người xác nhận chỉ có thể
là **kế toán hoặc quản trị** (điều phối không có thẩm quyền chi tiền công ty).

Yêu cầu chạy về trang của người đó với hai nút **Đồng ý cho ứng** / **Từ chối**
(kèm lý do). Đã duyệt thì số tiền cộng vào **cột "Tiền ứng"** của người đó:

- trang **Tổng hợp** → bảng theo phi công, cột *Tiền ứng*
- **Báo cáo tháng** → dòng *Tiền ứng (trừ lương)*, có cả cột "đến hôm nay"
- **Excel**: cột *Tiền ứng (trừ)* trong Bảng lương và một sheet **Ứng tiền** riêng
- **Google Sheets**: tab **"Ứng tiền"**

Khoản chờ duyệt hoặc bị từ chối KHÔNG cộng vào đâu cả. Tiền ứng cũng không dính
tới "tiền đang giữ": đang giữ là tiền cầm hộ công ty, còn ứng là công ty chi ra
rồi trừ vào lương cuối tháng.

## Khách ngoại giao

Điều phối khai theo từng nhóm: **mã vé – số tiền thu**. Khách ngoại giao không
mua vé giá thường nhưng vẫn xuất vé, và đôi khi vẫn thu một phần. Hai con số này
được cộng RIÊNG, không lẫn vào doanh thu vé thường:

- trang **Tổng hợp**: ô *Vé ngoại giao* và *Thu từ khách ngoại giao*, bảng theo
  ngày có cột "Ngoại giao (vé · thu)"
- **Excel**: hai dòng ở sheet "Đọc trước", hai cột ở sheet "Theo ngày", và cột
  "Thu ngoại giao" ở sheet Điều phối

Số vé ngoại giao phi công khai vẫn được đối chiếu với số của điều phối như cũ.

## Hai cấp quản trị

| | Quản trị **cấp 1** | Quản trị **cấp 2** |
|---|---|---|
| Quản nhân sự thường (tạo, khoá, xoá, đổi mật khẩu) | có | có |
| Xem mật khẩu của quản trị khác | có | **không** |
| Lập / sửa / xoá tài khoản quản trị | có | **không** |
| Đổi cấu hình điểm bay (giờ chốt, webhook Sheets) | có | **không** |

Tài khoản quản trị mới **luôn sinh ra ở cấp 2**. Muốn thêm người cấp 1 phải sửa
thẳng trong cơ sở dữ liệu (`adminLevel: 1`) — cố ý làm khó, vì cấp 1 nắm cấu
hình Sheets và toàn bộ nhân sự. Cấp 2 cũng không tự phong ai lên quản trị được:
máy chủ chặn cả đường đổi vai trò.

Khung *"Cấu hình từng điểm bay"* mặc định **thu gọn**, phải bấm mở mới thấy ô
nhập — đây là chỗ gõ nhầm một ký tự là dữ liệu ngừng chảy sang bảng tính.

## Lịch bay theo tháng

CHỈ xếp lịch cho **phi công** — kế toán, điều phối, camera man không cần lịch.

Khung **"Lịch bay theo tháng"** ở `/baocao/admin`: bảng dàn ngang, hàng là phi
công, cột là ngày 1…31. **Chấm ô = đi làm, để trống = nghỉ.** Bấm giữ rồi rê
ngang để chấm cả dãy; bấm tên là chấm/bỏ cả tháng; bấm số ngày trên đầu cột là
chấm/bỏ cả cột. Nút **"Xếp lần lượt"** tự chia mỗi ngày một người nghỉ, xoay
vòng theo danh sách (8 phi công cần 7 người/ngày) — chấm xong vẫn sửa tay được.

Hàng cuối đếm **số người có mặt từng ngày**; đặt ô "Cần mỗi ngày" thì ngày thiếu
người tô đỏ. Chỉ cảnh báo, không chặn lưu.

**Email tự gửi khi lưu**: bấm *Lưu* là email bay tới **đúng những phi công có
lịch thay đổi** — không dội thư cho cả đội 15 người chỉ vì sửa một ô. Mỗi người
nhận đúng lịch CỦA MÌNH (bảng tháng tô xanh ngày bay, danh sách ngày nghỉ) kèm
lời nhắc: *"Phi công cần nghỉ ngơi để đảm bảo sức khoẻ và an toàn bay. Hãy sắp
xếp lịch để relax mà không phải vướng bận công việc. Chúc vui vẻ và nhớ trở lại
bầu trời đúng ngày."* Bản sau lần sửa tự đề **BẢN CẬP NHẬT (lần N)**. Nút *"Gửi
lại cả đội"* dùng khi vào kỳ mới hoặc ai đó mất thư. Phi công chưa khai email
thì bị bỏ qua (có báo rõ ai, vì sao).

**Phi công mới tự hiện trong bảng**: admin cấp tài khoản phi công là tháng nào
mở ra cũng có ngay hàng của người đó để chấm — không phải khai thêm gì.

**Trang phi công** có khung *"Lịch bay của tôi"* ngay trên đầu: hôm nay có bay
không, bay tiếp ngày nào, lịch cả tháng — quản lý sửa là thấy bản mới ngay,
khỏi lục email.

**Lịch KHÔNG khoá việc báo cáo**: hôm nghỉ mà bay tăng cường đột xuất vẫn nhập
báo cáo bình thường. Lịch là kế hoạch; báo cáo là thực tế.

## In vé 3 liên — Khau Phạ và Sa Pa (máy in nhiệt Gainscha B300, khổ 80mm)

> **Đường in cho MỌI điện thoại, kể cả iPhone (chủ 17/09):** ở khung cài máy
> in bật **📤 In qua app (chia sẻ ảnh vé)**. Từ đó bấm **IN VÉ** → vé dựng
> thành một ảnh đúng khổ 576 chấm (các liên nối nhau, có vạch ✂ để xé) → hiện
> khung xem → bấm **GỬI SANG APP IN** → khay chia sẻ của máy → chọn app in máy
> in nhiệt đã ghép Gainscha B300. Cài và ghép máy in **một lần** trong app:
> iPhone/iPad dùng app in nhiệt Bluetooth nhận ảnh chia sẻ (ví dụ *Thermer*),
> Android dùng *RawBT*. Vì sao phải hai cú bấm: khay chia sẻ chỉ mở được ngay
> trong cú bấm, mà dựng vé mất vài giây. Không có app thì bấm giữ ảnh → lưu
> rồi in bằng cách khác. Thứ tự ưu tiên của IN VÉ: Bluetooth → USB → RawBT →
> **app chia sẻ** → trạm in → tab/hộp thoại. Mã: `lib/baobay/may-in-chia-se.ts`.

Chủ chốt 12/09/2026: hai điểm này bắt đầu in vé bằng máy (đang in thử, in lại
bao nhiêu lần cũng được). Nút **🖨 IN VÉ** ở dòng booking ghi sổ (cấp mã) rồi in đủ bộ và tự tích
"đã xuất vé"; nút **In lại** bên cạnh in lại có ghi lý do — riêng **quản trị
cấp 1 (Đặng V.M) in lại không giới hạn, không hỏi lý do** (chủ 13/09), vết in
vẫn ghi đủ ai và lúc nào.

> **ĐANG TRONG ĐỢT THỬ MÁY IN** (chủ 13/09): cờ `IN_VE_TU_DO` ở
> `lib/baobay/in-ve-cau-hinh.ts` đang **bật** — nút **🖨 In lại** (hiện sau
> khi đã xuất vé; chủ 17/09 bỏ cảnh hai nút in đứng cạnh nhau) bấm là in
> ngay, không hỏi lý do, không giới hạn, với mọi vai. Đầu sổ booking có nhãn *"🧪 Đang mở
> tự do để thử máy in"*. Thử xong, đổi cờ về `false` là quay lại luật trên —
> không phải sửa chỗ nào khác.

Điểm khác (Hà Nội)
nút vẫn chỉ tích "đã xuất vé", không in.

> **SA PA — MỘT LIÊN DUY NHẤT 80×80 mm** (chủ 17/09): không liên khách giữ,
> không đồ uống, không xe trung chuyển. Mỗi khách một tờ vuông: logo, số thứ
> tự + mã chống sao chép, ngày bay + giờ hẹn, **tên viết tắt một phần**
> ("Nguyễn Thị Hồng Nhung" → "Nguyễn T.H. Nhung"), loại bay, dịch vụ, giờ in,
> **QR vé 30 mm để phi công quét**, một dòng lưu ý. Chiều cao cố định 74 mm nội
> dung (in thẳng: 640 chấm). Khau Phạ vẫn in bộ bốn liên dưới đây.

**Mỗi KHÁCH một bộ**, không phải mỗi booking: booking #23 có 2 khách → **#23.1**
và **#23.2**, mỗi số BỐN liên:

| Liên | Nội dung |
|---|---|
| **1 — VÉ BAY DÙ** | ngày bay · số thứ tự · tên khách · dịch vụ (chỉ in tên, không in ×1) · giờ in |
| **2 — KHÁCH GIỮ** | ngày bay + giờ hẹn · tên khách (OTA có tên từng người thì in đúng người) · **mã booking** · loại bay · dịch vụ · giờ in · năm điều lưu ý (điện thoại trống ~10GB, kính, quần áo, giấy tờ, đồ không mang) · **hai mã QR xin đánh giá** — Google Maps của bãi và Tripadvisor của tour; Khau Phạ chọn link **PG hay PPG theo loại bay** |
| **3 — ĐỒ UỐNG MIỄN PHÍ** | tên khách · số thứ tự · ngày bay · cà phê · trà chanh/đào · nước lọc/chai · bia/nước ngọt |
| **4 — VÉ XE TRUNG CHUYỂN** | ngày bay · tên khách · số thứ tự · ngày giờ xuất vé |

Liên nào cũng có logo (bản nét đen trắng `public/logo-mbl-in.png`), biểu tượng
của liên sát số thứ tự (dù · dù · cốc · xe). Liên 1, 3, 4 có hai dòng *"Vé có
giá trị thanh toán tương đương tiền mặt. / Mất vé không cấp lại."* — liên 2
khách giữ thì không (chủ 12/09). QR Tripadvisor PPG ở Khau Phạ trỏ thẳng
vào trang **viết đánh giá** của dịch vụ paramotor. Không ô nào được xuống
dòng — vé nhiệt tính từng mm chiều dài; ô dài thì co chữ. Mã QR sinh tại chỗ
(thư viện `qrcode`, ra SVG), không tải ảnh ngoài — quầy ở đèo hay mất mạng mà vé
thì phải in được.

### Mã chống sao chép "A2D8"

Mỗi KHÁCH một mã bốn ký tự, in cạnh số thứ tự trên **cả bốn liên** của người ấy
và lưu vào sổ (`ticketSecurity` trên booking): #23.1 → A2D8, #23.2 → K7HM, bốn
khách bốn mã khác nhau (chủ 12/09). Máy chủ cấp ở **lần in đầu** (nút IN VÉ ghi
sổ trước rồi mới in); **in lại giữ nguyên mã cũ** — mã là căn cước của tấm vé,
đổi mỗi lần in thì vé cũ vé mới cùng hợp lệ, mất ý nghĩa. Đoàn tăng khách sau
khi đã in thì chỉ cấp thêm cho khách mới. Bảng chữ bỏ ký tự dễ đọc nhầm trên
giấy nhiệt (0/O, 1/I/L, 5/S, 8/B, 2/Z), 30⁴ ≈ 810.000 mã, và máy vẫn kiểm trùng
trong cùng điểm + cùng ngày. Vé chưa qua sổ in "····" ở chỗ mã — lộ ra ngay.

**Đối chiếu vé**: `GET /api/baocao/booking?spot=…&maVe=A2D8` trả booking, khách
thứ mấy, ngày bay; không có → vé chép hoặc gõ nhầm (máy tự quy chữ dễ nhầm về
bảng chuẩn khi tra). Phép thử: `scripts/baocao/test-ma-ve-bao-mat.ts`.

### Mã vé QR từng khách — phi công QUÉT vé (Sa Pa; Khau Phạ chỉ booking PPG)

Chủ chốt 17/09/2026. Sa Pa không dùng vé giấy đánh số sẵn: mỗi KHÁCH một tấm
vé nhiệt, trên liên 1 và liên 2 có thêm **mã QR vé** — nội dung
`22/12/2026 #3.2 SAPA` (ngày cấp · booking số 3 trong ngày · khách thứ 2),
bên dưới in tên khách chữ nhỏ và dịch vụ đi kèm (Cam 360 · Flycam · Cờ đỏ).
Mã này KHÔNG đổi khi dời lịch: ngày trong mã là ngày cấp, máy chủ biết booking
đang ở ngày nào. Vì thế số thứ tự của ngày cấp không được cấp lại cho đoàn khác
khi đoàn này dời đi.

**Điều phối / quầy — lúc in vé (`/baocao/dieu-phoi`):**

- Bấm **🖨 IN VÉ** lần đầu → hộp **Dịch vụ trên vé**: danh sách khách (tên viết
  tắt) với ô tích 360 / flycam / cờ đỏ. Đặt 10 flycam cho 10 khách thì máy
  tích sẵn; đặt 8 thì để trống, tích tay khách nào có. Xác nhận là **cấp mã và
  in**. Sau đó nút **🎟 DV vé** sửa lại dịch vụ cho khách CHƯA bay xong.
- Trên dòng booking hiện từng mã: *#3.2 · mã trống* · *#3.2 · Mỹ đã tiếp nhận*
  · *#3.2 · ✅ Mỹ bay xong*; cả đoàn bay xong thì có nhãn **ĐÃ BAY HẾT**.
- **Huỷ** hoặc **Dời** booking: mã phi công đã chiếm bị **thu hồi** tự động —
  phi công ấy thấy cảnh báo, số chuyến và dịch vụ bị rút khỏi báo cáo. Dời
  sang ngày mới thì hôm ấy phải quét lại (ai quét cũng được). Thu hồi tay một
  mã: `POST /api/baocao/ve-qr {action:"thuhoi"}` (điều phối / quầy / quản trị;
  phi công không thu hồi được mã của người khác).

**Phi công — thẻ Quét vé (`/baocao/quet-ve`):**

- Chọn NGÀY đang báo cáo. Quét bằng **camera**, hoặc **chọn nhiều ảnh** (cuối
  ngày chụp lại các vé để soát — mã đã quét thì bỏ qua êm), hoặc gõ tay
  `22/12 #3.2`.
- Máy chủ kiểm: mã của **ngày khác** → báo "mã này của ngày X"; mã đã **dời**
  tới ngày đang chọn → nhận (ghi *mã dời từ …*); mã đã bị **huỷ** → báo; mã
  **phi công khác** đã quét → báo tên người ấy và giờ quét.
- Quét xong hiện tên khách + dịch vụ; mã vào danh sách **Mã tôi đang giữ** với
  nút **✅ Bay xong** · **⟲ Hoàn mã** (mã trắng lại cho người khác) · **✕ Hoàn
  Cam 360 / Flycam / Cờ đỏ** (không hoàn thành dịch vụ lẻ, chuyến vẫn tính).
- **Tổng hợp trong ngày** (chuyến, bay xong, 360, flycam, cờ đỏ) tự cộng — cũng
  hiện ở trang Phi công (khối *Từ quét vé*, nút **⤵ Điền vào báo cáo** chép số
  sang ô báo cáo; Sa Pa không bắt buộc mã vé nên ô mã để trống).

Dữ liệu nằm trên booking (`veQr`), phép tính ở `lib/baobay/ve-qr.ts`
(phép thử: `scripts/baobay/test-ve-qr.ts`), luật quét ở
`services/ve-qr.service.ts`, API `app/api/baocao/ve-qr/route.ts`.

### Nối máy in — hai đường, cùng một mẫu vé

Trang web **không cài được driver** lên máy tính (không trình duyệt nào cho
phép). Nên có hai đường:

1. **Hộp thoại in của trình duyệt** (mặc định). Cài driver Gainscha B300 lên
   máy quầy một lần (Windows/macOS, tải từ gainscha.com), chọn máy in trong hộp
   thoại, tích "không hỏi lại". Khổ giấy đã khai `@page 80mm`, mỗi liên một
   trang nên máy cắt sau mỗi liên.
2. **TRẠM IN — cách cài MỘT LẦN cho cả quầy, chạy được cả iPhone** (chủ
   12/09): một điện thoại / máy tính bảng Android (hoặc máy tính) ở quầy ghép
   Bluetooth (hay USB) với máy in một lần, mở **`/baocao/tram-in`** (tab "Trạm
   in"), bấm **Bắt đầu trực** và để nguyên. Mọi máy khác của điểm — iPhone,
   laptop kế toán… — bấm IN VÉ là lệnh vào hàng đợi (`BaobayPrintJob`), trạm
   nhận trong 2,5 giây, in, báo xong; người bấm thấy "trạm in đã in xong".
   Trạm không trực (không có nhịp tim 45 giây) thì nút IN VÉ tự rơi về in tay.
   Trang trạm giữ màn hình sáng, nên cắm sạc và thêm vào màn hình chính.
   Lệnh đang in quá 2 phút hay chờ quá 10 phút tự chuyển "lỗi" để không in
   vé cũ. Xem `services/in-ve.service.ts`, `app/baocao/tram-in/page.tsx`.
3. **IN THẲNG QUA RAWBT — cách chạy được với máy in Bluetooth THƯỜNG** (chủ
   13/09: "không muốn trạm in, cần in trực tiếp từ máy được kết nối"). Trình
   duyệt chỉ nối được Bluetooth năng lượng thấp (BLE); Gainscha B300 và mọi
   máy in nhiệt cầm tay ghép ở **Cài đặt → Bluetooth** của Android là kiểu
   **cổ điển (SPP)** — không có cửa nào cho trang web. RawBT là cầu nối chạy
   ngay trên máy đó, không qua máy nào khác. Cài một lần:
   - Ghép máy in trong **Cài đặt → Bluetooth** của máy tính bảng (như ghép tai nghe).
   - Cài **RawBT** (CH Play / AppGallery), mở ra, chọn máy in vừa ghép.
   - Trong sổ booking bấm **📲 Dùng RawBT**.
   Từ đó nút IN VÉ đẩy thẳng luồng ESC/POS sang RawBT, RawBT in ra máy. Gửi
   từng liên một, nghỉ 1,2 giây giữa các liên (đường liên kết không tải nổi cả
   bốn liên một lượt). Xem `lib/baobay/may-in-rawbt.ts`.
4. **In thẳng qua BLUETOOTH BLE** trên chính máy đang bấm (máy in nào có kênh
   BLE, chủ 12/09): bật máy in và Bluetooth điện thoại, bấm **🖨 Ghép máy in Bluetooth**
   ở đầu danh sách booking, chọn máy in trong hộp hiện ra (thấy hai tên gần
   giống thì chọn tên có chữ *BLE*). Từ đó nút IN VÉ đẩy thẳng ra máy (ESC/POS,
   vé chụp thành ảnh 576 chấm, gửi từng liên, cắt sau mỗi liên — xem
   `lib/baobay/may-in-bluetooth.ts`). Trình duyệt chỉ nối được kênh BLE của
   máy in, không nối được Bluetooth cổ điển (SPP) — máy nào chỉ có SPP thì
   phải dùng USB hoặc hộp thoại in. BLE chậm: bốn liên khoảng 20 giây, đừng bấm
   in hai lần liền. Chỉ Chrome / Edge có Web Bluetooth; Safari không có. Tải
   lại trang là mất kết nối, bấm ghép lại (hộp chọn hiện sẵn máy cũ).
5. **In thẳng qua USB** — cáp OTG với điện thoại, hoặc máy tính. Bấm **🔌 hoặc
   USB**, chọn B300. **Windows** thường bị driver của hãng giữ cổng USB nên
   phải gán WinUSB cho máy in bằng công cụ **Zadig** một lần.
6. Trên **điện thoại / máy tính bảng** chưa ghép máy in thẳng và không có trạm: bấm IN VÉ mở
   vé ra tab riêng có nút **IN VÉ** to — hộp thoại in Android chỉ có máy in
   nếu điện thoại có dịch vụ in tương ứng (Gainscha không có), thường chỉ
   "Lưu PDF"; nên ở điện thoại hãy ghép Bluetooth.

In thẳng hỏng thì báo lý do rồi tự rơi về hộp thoại / tab in.

**Máy tính bảng Honor / Huawei / Xiaomi không in được?** (chủ 13/09 báo Honor
Pad 10). Mở `/baocao/tram-in` → bấm **“🔎 Máy này in được không?”**, khối kiểm
tra nói thẳng máy thiếu gì. Ba nguyên nhân theo thứ tự hay gặp:

1. **Mở bằng trình duyệt của hãng** (Honor Browser, Huawei Browser) — các
   trình duyệt này tắt Web Bluetooth. Phải cài **Google Chrome** và mở trang
   bằng Chrome.
2. **Chưa bật VỊ TRÍ / GPS** — Android bắt bật vị trí mới cho quét Bluetooth;
   tắt thì hộp chọn thiết bị trống trơn dù máy in đang bật.
3. **Máy in đang bị ứng dụng in của hãng giữ** — thoát ứng dụng đó rồi ghép lại.

Thứ tự app tự chọn khi bấm IN VÉ: **máy in ghép thẳng trên chính máy này**
(BLE → USB → RawBT) trước; không có mới tới trạm in; cuối cùng là hộp thoại in.
Muốn in thẳng thì làm mục 3 (RawBT) — chạy được cả trên máy Honor / Huawei.

Xem mẫu vé không cần máy in: `npx tsx scripts/baocao/xem-mau-ve.ts mau-ve.html`
rồi mở tệp bằng trình duyệt. Phép thử: `scripts/baocao/test-ve-in.ts`.

## Quản lý nhân sự (admin)

Vào **`/admin/baocao`** (menu "Nhân sự báo bay", cần đăng nhập quản trị website):

- Danh sách nhân sự **đang làm việc** (lọc được: đang làm / đã khoá / tất cả).
- **+ Thêm nhân sự**: họ tên – chức danh – tên đăng nhập – email – sđt – mật khẩu
  (để trống là tự sinh). Tạo cả loạt từ danh sách tên cũng được.
- **Sửa** tên/email/sđt, đổi chức danh, **Đặt lại mật khẩu**.
- **Khoá / Mở lại** (active–deactive): khoá thì hết đăng nhập được nhưng số liệu
  cũ nguyên vẹn.
- **Xoá**: xoá vĩnh viễn tài khoản KÈM toàn bộ báo cáo của người đó trong
  database (Google Sheets không bị đụng — xoá tay bên đó nếu cần). Phải gõ lại
  đúng tên đăng nhập mới xoá được; máy chủ so tên TRƯỚC khi xoá.
- **Tổng theo chu kỳ**: chọn khoảng ngày là thấy số tổng đã chốt của cả điểm bay.
- **Tiền điều phối giao giám đốc**: nút mỗi điểm bay có **số đỏ** đếm khoản chưa
  xác nhận (ví dụ “Sa Pa ③”), nhìn một cái biết ngay chỗ nào còn tiền chưa nhận.

**Mật khẩu**: nhân viên tự đổi thoải mái, nhưng bản đọc được luôn lưu về database
và admin xem lại được ở cột "Mật khẩu" — đây là yêu cầu rõ của chủ hệ thống, đã
nêu rủi ro (lộ database là lộ mật khẩu) và chấp nhận. Mật khẩu KHÔNG bao giờ đi
qua các API phía nhân viên (/api/baocao/*).

## Xuất báo cáo tài chính / bảng lương

Trang **Tổng hợp** và **Báo cáo tháng** có nút **“Tải Excel (.xlsx)”** — một file
nhiều sheet: *Đọc trước · Bảng lương phi công · Theo ngày · Phi công theo ngày ·
Điều phối · Camera man · Thu chi chi tiết · Giao tiền quản lý*. Mở bằng Excel
hoặc tải thẳng lên Google Sheets (Tệp → Nhập). Tên file kèm mã điểm bay.

Bảng lương chỉ cộng **ngày đã chốt**; ngày chưa chốt liệt kê riêng ở sheet “Đọc
trước” để không ai lỡ tính lương trên số chưa soát. Đơn giá chuyến/dịch vụ do kế
toán nhân bên ngoài — app không giữ đơn giá.

## Google Sheets

Số liệu tự chảy sang bảng tính (docs/baocao-apps-script.md — bản
`baobay-multispot-v6`):

- **Mỗi phi công một thẻ riêng theo tháng**: tab "Giàng A Sáu 2026-08" tự tạo,
  mỗi ngày một dòng, sửa báo cáo là ghi đè đúng dòng cũ.
- Điều phối vào tab **"Điều phối"**, camera man vào tab **"Camera man"**, số chốt
  vào tab **"Chốt ngày"**, giao tiền vào **"Giao tiền"**, ứng tiền vào **"Ứng tiền"**.
- Tab **"Tổng hợp ngày"**: mỗi ngày MỘT dòng gộp mọi phía (vé, tiền, dịch vụ,
  chi tiêu, phạt, tiền ứng, giao tiền) kèm cột Chốt/Treo — chỗ kế toán lấy số
  nhanh mà không phải mở từng thẻ. Tự cập nhật mỗi khi kế toán lưu số hoặc
  chốt/mở ngày.
- **Mỗi điểm bay một bảng tính riêng** — khai webhook của từng điểm ở `/baocao/admin`.
- Mọi dòng mang cột **"Trạng thái ngày"**: dữ liệu sang bảng ngay khi nhân viên
  lưu (kèm chữ *chưa chốt*), kế toán bấm chốt thì mọi dòng của ngày đó được ghi
  đè thành *ĐÃ CHỐT*. Gỡ khoá rồi sửa thì bản mới **thay thế** đúng dòng cũ.
- Nút **"Đẩy lại Google Sheets"** ở trang Tổng hợp: quét cả kỳ, gửi lại những
  dòng lỡ hỏng đường truyền — chống mất dữ liệu.

Biến môi trường: `BAOBAY_SHEET_WEBHOOK_URL` + `BAOBAY_SHEET_SECRET`. Chưa khai
thì trang vẫn chạy đủ, chỉ thiếu bản sao Sheets (bản ghi mang nhãn "chưa sang
bảng", lưu lại là thử đẩy lại).

## Bảo mật

Dữ liệu ở đây là tiền và nhân sự, nên khu `/baocao` bị siết chặt hơn phần còn
lại của website:

- **Không cho tìm kiếm đánh chỉ mục**: header `X-Robots-Tag: noindex, nofollow,
  noarchive, nosnippet` cho mọi trang và mọi API, cộng thêm `robots.txt` và
  metadata của trang. Ba lớp, vì bot xấu thường bỏ qua `robots.txt`.
- **Không lưu bộ nhớ đệm**: `Cache-Control: no-store` — máy quầy vé và điện
  thoại phi công dùng chung nhiều người, không để số liệu nằm lại trong trình
  duyệt hay CDN.
- **Chống nhúng khung và rò địa chỉ**: `X-Frame-Options: DENY`,
  `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`.
- **Cookie phiên**: httpOnly (JavaScript không đọc được), `secure` trên
  production, `sameSite: strict` (cắt đường CSRF), hạn **7 ngày**.
- **Chống dò mật khẩu**: sai 8 lần liên tiếp là **khoá tạm 15 phút**; đếm trong
  cơ sở dữ liệu chứ không đếm trong bộ nhớ máy chủ, nên chạy nhiều bản
  (serverless) vẫn chặn được. Đăng nhập đúng là xoá bộ đếm.
- **Không lộ danh sách tài khoản**: sai mật khẩu và không có tài khoản trả về
  cùng một câu.
- **Phiên tách hẳn khu admin website**: token mang `scope: "baobay"`; token khu
  admin không mở được dữ liệu báo cáo và ngược lại.
- Đường cũ `/baobay` đã **xoá hẳn** — trả 404 như trang không tồn tại, không
  chuyển hướng, không hé lộ là từng có gì ở đó.
- `/baocao` **cố ý không nằm trong robots.txt**: liệt kê ở đó là tự chỉ điểm,
  và Disallow còn khiến bot không bao giờ đọc được lệnh noindex. Header
  `X-Robots-Tag` (khai ở next.config.mjs, phủ cả trang lẫn API) mới là lớp chặn
  index thật.
- **Không tự xoá / tự khoá / tự hạ vai trò chính mình** — và không xoá được
  quản trị cấp 1 đang hoạt động cuối cùng, để hệ thống không bao giờ tự khoá trái.

**Rủi ro đã biết, chủ hệ thống chấp nhận**: mật khẩu được lưu thêm bản đọc được
để quản trị tra lại. Lộ cơ sở dữ liệu là lộ mật khẩu. Trường này không bao giờ
đi qua API phía nhân viên, và quản trị cấp 2 cũng không xem được mật khẩu của
quản trị khác.

## Ghi chú kỹ thuật

- Phiên đăng nhập: cookie httpOnly `mbl_baobay`, hạn 30 ngày, token có
  `scope: "baobay"` — `utils/jwt.ts` từ chối token khác scope nên không mở được
  API admin.
- Collection MongoDB: `baobayaccounts`, `pilotdailyreports`,
  `dispatcherdailyreports`, `cameramandailyreports`, `accountantdailycloses`.
  Bốn bảng báo cáo có chỉ mục duy nhất `(accountId, date)`; bản chốt duy nhất
  theo `date`.
- Bộ đối chiếu là hàm thuần ở `lib/baobay/reconcile.ts` — trang nào cũng ra cùng
  một kết luận.
- Sửa schema Mongoose phải khởi động lại dev server (xem memory
  `mongoose-stale-schema-dev`).
- **Chuyển từ bản một điểm sang đa điểm**: chạy một lần
  `node scripts/baocao/migrate-spots.mjs` — bỏ chỉ mục duy nhất cũ
  `(accountId, date)`, quy đổi tên điểm sang mã, và đổi `spot` của tài khoản
  thành `spots[]`. Không chạy thì cùng một người không báo cáo được ở hai điểm
  trong cùng một ngày (lỗi E11000).

## Dữ liệu demo

```
MONGODB_URI="$(grep '^MONGODB_URI=' .env.local | cut -d= -f2-)" node scripts/baocao/demo-data.mjs seed
MONGODB_URI="$(grep '^MONGODB_URI=' .env.local | cut -d= -f2-)" node scripts/baocao/demo-data.mjs clear
```

Tài khoản demo (mật khẩu `demo1234`): `demo-pilot1..6`, `demo-dispatcher1..2`,
`demo-cameraman1`, `demo-accountant1`. Hôm nay cố ý TREO (mã trùng + flycam lệch
chờ duyệt), hôm qua chưa chốt — để thấy đủ ba trạng thái. **Nhớ `clear` trước khi
dùng thật.**

## Dùng khi MẤT MẠNG (nền offline — giai đoạn 1, từ 12/09/2026)

Khu `/baocao` cài một service worker riêng (`public/sw-baocao.js`, chỉ bản
production). Khi mất mạng:

- **Trang đã từng mở** vẫn mở lại được (tệp giao diện và trang được cất trong máy).
- **Số liệu** hiện là **bản tải gần nhất**: mọi lượt GET API thành công đều được
  cất; mất mạng thì worker trả bản cất kèm cờ, trang treo dải vàng *"Đang mất
  mạng — số liệu đang xem là bản cất lúc HH:MM"*. Có mạng lại là dải tự hạ.
- **Phiên đăng nhập** nhớ trong máy: mất mạng vẫn vào được trang của mình; chỉ
  khi máy chủ trả 401/403 (hết hạn, bị khoá) mới bị đẩy về đăng nhập.
- **Ghi (lưu báo cáo, thu tiền, huỷ, dời…) KHÔNG làm được khi mất mạng** — nút
  bấm báo *"Mất mạng — CHƯA lưu được. Đợi có mạng rồi bấm lại."* Không có hàng
  đợi ghi mù, vì sổ booking nhiều người cùng sửa. Ghi offline làm theo từng
  trang ở giai đoạn 2 (trang phi công trước).

Máy bán `/cafe` vẫn dùng worker riêng của nó (có hàng đợi phiếu). Bản dev gỡ
worker để không "ăn mã cũ".

## Chốt ngày: vé thu hồi tự tổng hợp, vé mang sang, số thứ tự (từ 14/09/2026)

- Ô **Số vé thu hồi** tự lấy **số mã vé** đếm từ danh sách thu hồi (sổ booking
  huỷ sau khi xuất vé + điều phối khai huỷ / thu hồi lẻ, không trùng) — chính
  là dòng "Thu hồi (N mã)" ở bảng 🎫 Mã vé. Dưới ô hiện hai số để đối chiếu:
  *số mã vé* và *số điều phối báo*; kế toán gõ số khác thì máy thôi điền.
  Booking huỷ sau xuất mà chưa ghi mã vé được cộng thêm theo số khách, kèm nhắc
  ghi mã vào lệnh huỷ.
- **Vé khách mang từ ngày khác qua** (khách dời lịch cầm vé cũ) hiện đích danh:
  "📥 3 mã vé từ ngày 12/09 (KP0123 …)" — dưới ô thu hồi và trong bảng 🎫 Mã vé.
  Vé này **không** tính là thu hồi; bộ soát đã xác minh mã nằm trong dải ngày
  xuất và ngày đó chưa ai dùng (`carriedInByDate` của bộ đối soát).
- Ba bảng **Dời lịch / Huỷ CẦN hoàn / Huỷ không cần hoàn** và thẻ **💸 Hoàn
  tiền khách** hiện kèm **số thứ tự booking** (#6 Tên khách). Nhóm điều phối tự
  khai (không nối booking) được dò số theo tên liên hệ trong sổ ngày; tên trùng
  nhiều booking thì để trống, không đoán.

## Xuất ảnh phiếu booking (từ 14/09/2026)

Nút **🖼 Xuất ảnh** (khung booking mới) và **🖼 Ảnh booking** (từng dòng sổ)
không tải file ngay nữa mà bày **full ảnh phiếu** lên màn hình — khách đứng
cạnh giơ máy **chụp màn hình** là xong. Dưới ảnh có hai nút:
- **💾 Lưu ảnh** — tải file PNG về máy (iPhone không thấy thì nhấn giữ vào ảnh
  → Lưu ảnh);
- **📤 Chia sẻ** — mở khay chia sẻ của máy (Zalo, Messenger, AirDrop…) kèm file
  ảnh; máy tính không có khay thì nút báo dùng Lưu ảnh.

Ảnh dựng bằng `drawBookingImage` (`app/baocao/components/booking-image.ts`),
khung xem là `XuatAnhBooking.tsx`. Đây là **phiếu gửi khách**, không phải vé in
nhiệt.

## Nguyên tắc cảnh báo LẬP TRÙNG booking (từ 14/09/2026)

Hai điều phối cùng nhập, quên kiểm khách đã đặt chưa, là ra hai booking cho một
người — 13/09 Khau Phạ có ba cặp như vậy. Máy tra sổ ngay lúc bấm **Lưu booking**
(`GET /api/baocao/booking?trung=1` → `timBookingTrung`), thấy nghi trùng thì
**chưa lưu**, bày khung báo cho người lập soi — **không chặn**, vì một khách
book 2–3 lần là có thật (book hộ bạn, đặt thêm đợt sau, hai đơn OTA).

**Coi là nghi trùng** khi cùng điểm bay đã có booking khác (không tính đã bỏ
khỏi sổ) thoả một trong bốn dấu, theo thứ tự mạnh → yếu:

1. **cùng mã OTA / mã booking** — chắc chắn cùng một đơn;
2. **cùng số điện thoại** (9 số cuối);
3. **cùng email**;
4. **cùng tên liên hệ** (không dấu, không phân biệt hoa thường).

**Phạm vi ngày:** *cùng ngày bay* thì bày khung báo; *hai ngày kề* chỉ liệt kê
thêm trong khung (ghi "ngày kề"). Booking **đã huỷ** vẫn được liệt kê — nhân
viên hay lập lại booking của khách đã huỷ thay vì bấm *bay lại* dòng cũ.

**Khung báo** liệt kê từng booking nghi trùng: số thứ tự, tên, SĐT (bấm gọi),
số khách, trạng thái, vì sao nghi trùng, kèm ba lối:
- **🔍 Xem #N** — mở phiếu chi tiết booking đó (khoản tiền, lịch sử) để soi có
  thực sự trùng không;
- **✏️ Sửa #N** — cùng một khách: bỏ bản đang gõ, mở booking cũ ra sửa (đã huỷ
  thì mở sổ bấm *bay lại*);
- **✅ Bỏ qua, vẫn lập** — khách khác thật / book hộ: lập tiếp, lý do ghi thêm
  là tuỳ chọn; máy ghi "lập dù nghi trùng #… (người lập)" vào ghi chú booking
  để kế toán soát.

Máy chủ giữ một lưới an toàn: gửi lưu mà chưa qua khung báo (hai người lập
cùng lúc, tra hụt) thì trả 409 đuôi `|TRUNG`, giao diện bày lại khung báo.

Cùng luật, nút **ĐÃ BAY** cũng bị chặn khi booking *chưa thu đủ* hoặc *nghi
trùng* (xem `updateBookingStatus`): trùng thì **Bỏ khỏi sổ** cái thừa chứ không
tích đã bay, để khỏi đếm đôi khách.

