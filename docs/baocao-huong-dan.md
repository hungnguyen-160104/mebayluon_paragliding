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
| **Phi công** | `/baocao/phi-cong` | Số chuyến + mã vé đã bay; dịch vụ gia tăng (flycam, 360, cờ đỏ, kéo cờ — **chỉ số lượng, mã vé tuỳ chọn**); khách ngoại giao; thu/chi trong ngày |
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
3. **Kế toán chốt ngày** khi sạch lỗi đỏ. Chốt xong ngày bị KHOÁ — không ai sửa
   được nữa; cần sửa thì kế toán **gỡ khoá** (có ghi vết ai gỡ, lúc nào, vì sao).
4. **Tổng của kỳ và báo cáo tháng chỉ cộng ngày đã chốt.** Ngày treo/chưa chốt
   được liệt kê riêng.

## Quy tắc nhập liệu

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
