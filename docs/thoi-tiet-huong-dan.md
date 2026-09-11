# Thời tiết bay — cấu hình và nguồn dữ liệu

## 1. Đang chạy bằng gì (không cần khai gì thêm)

Hệ thống **đang chạy được ngay, không cần khoá, không tốn tiền**:

- Nguồn số: **Open-Meteo** chạy mô hình **ECMWF IFS** — đúng mô hình mà
  windy.com hiển thị mặc định.
- Bản đồ gió: **iframe của Windy** (`embed.windy.com`) — bản nhúng mở, không
  cần khoá, không cần đăng nhập. Bấm chọn được mô hình ngay trên bản đồ:
  **ECMWF · GFS · ICON · ECMWF AI · Sóng**.

  **Chọn được cả LỚP xem** — "soi mây, soi mù" như trên windy.com:
  **Gió · Gió giật · Mây · Mây thấp · Trần mây · Sương mù · Tầm nhìn · Mưa · Độ ẩm**.
  Mã lớp là mã của Windy, đã dò thật từng cái trên bản nhúng: lớp nào Windy
  không nhận thì nó âm thầm rơi về "gió" — bản đầu ghi nhầm `cloudbase` nên
  nút Trần mây không làm gì; mã đúng là `cbase`. Thêm lớp mới phải dò lại,
  đừng đoán tên.
  Con số "mây thấp 80%" không nói được mây ấy ở độ cao nào so với bãi; lớp
  **Trần mây** vẽ thẳng độ cao đáy mây theo mét, lớp **Mây thấp** vẽ đúng thứ
  trùm sườn núi, lớp **Tầm nhìn** làm tối vùng sương mù dày — nhìn hình là biết
  sáng mai núi có bị trùm không.
- Số ngày: **10 ngày tới** — đã dò thật: ECMWF và GFS đều trả đủ 240 giờ không
  thủng lỗ nào. Dải ngày xếp 5 ô một hàng nên mười là vừa hai hàng.

Không khai biến nào thì mọi thứ vẫn đủ: trang khách `/thoi-tiet-bay`, widget
trong từng trang `/spots/…`, và trang nội bộ `/baocao/thoi-tiet`.

## 2. Sự thật về tài khoản Windy trả phí

Ba thứ hay bị nhầm là một:

| Thứ | Giá | Dùng để làm gì | Có giúp app không |
|---|---|---|---|
| **Windy Premium** (tài khoản trên windy.com) | ~$22–35/năm | Xem web không quảng cáo, nhiều lớp bản đồ | **Không.** Khách xem iframe không đăng nhập, nên phiên Premium của chủ không chảy vào widget |
| **Map Forecast API key** | miễn phí | Nhúng bản đồ Leaflet của Windy | Không cần — đang dùng `embed.windy.com`, vốn không đòi khoá |
| **Point Forecast API key** | **€990/năm** (gói Professional, 10.000 lượt/ngày) | Lấy **số** dự báo theo toạ độ | Có chỗ cắm sẵn, nhưng **xem mục 3 trước khi trả tiền** |

Gói **miễn phí 500 lượt/ngày** của Point Forecast API **không dùng được cho
thật**: Windy nói rõ nó "trả dữ liệu đã xáo trộn và sửa lệch đi", chỉ để lập
trình viên thử. Cắm khoá free vào là điểm bay hiện số sai — nguy hiểm hơn là
không có gì.

## 3. Vì sao trả €990 cho Windy API lại KHÔNG nâng chất lượng

**Point Forecast API không có ECMWF.** Windy ghi thẳng trong tài liệu: *"The
ECMWF model is not included in point forecast due to licensing conditions."*

Những mô hình API ấy bán, xét trên Việt Nam:

| Mô hình | Phủ Việt Nam | Ghi chú |
|---|---|---|
| `arome` | ❌ | Chỉ Pháp và lân cận |
| `iconEu` | ❌ | Chỉ châu Âu |
| `namConus`, `namHawaii`, `namAlaska`, `hrrr*`, `canHrdps` | ❌ | Chỉ Bắc Mỹ |
| `gfs` | ✅ | Mô hình toàn cầu của Mỹ, ô lưới thô hơn ECMWF |

Nghĩa là ở Việt Nam, trả €990 chỉ để lấy **GFS** — trong khi app **đang lấy
ECMWF miễn phí** qua Open-Meteo. ECMWF thường nhỉnh hơn GFS ở địa hình núi,
đúng loại địa hình của Khau Phạ, Sa Pa, Trạm Tấu.

**Khuyến nghị: chưa cần mua.** Muốn nâng chất lượng thật thì xem mục 6.

## 4. Nếu vẫn muốn cắm khoá Windy

### Lấy khoá

1. Vào **https://api.windy.com/keys** (đăng nhập bằng tài khoản windy.com).
2. Chọn **Point Forecast** → tạo khoá. Khoá của *Map Forecast* hay *Webcams*
   **không dùng được** cho Point Forecast — Windy tính là loại khác.
3. Chép chuỗi khoá.

### Khai trên Vercel

1. Mở **vercel.com** → chọn dự án `mebayluon_paragliding`.
2. **Settings** → **Environment Variables**.
3. Bấm **Add New**:
   - **Key**: `WINDY_API_KEY`
   - **Value**: chuỗi khoá vừa chép
   - **Environments**: tick cả **Production**, **Preview**, **Development**
4. **Save**.
5. **Deployments** → deployment mới nhất → dấu `⋯` → **Redeploy**.
   *Biến môi trường chỉ có hiệu lực với bản deploy MỚI — lưu xong mà không
   deploy lại thì không có gì đổi.*

Muốn đổi mô hình (khi Windy mở thêm mô hình phủ Việt Nam) thì khai thêm biến
`WINDY_MODEL`, ví dụ `gfs`. Không khai thì mặc định là `gfs`.

### Khai trên máy để chạy thử

Thêm vào tệp `.env.local` ở gốc dự án rồi khởi động lại `next dev`:

```
WINDY_API_KEY=chuoi_khoa_cua_ban
```

### Kiểm tra đã ăn khoá chưa

Mở `/baocao/thoi-tiet`, nhìn dòng nhỏ dưới thẻ (hoặc rê chuột vào nút **↻ Làm
mới**):

- `ECMWF IFS (Open-Meteo)` → **chưa** dùng khoá Windy (đang chạy đường miễn phí)
- `Windy Point Forecast (GFS)` → **đã** dùng khoá Windy

Khoá sai hoặc hết lượt thì app **tự rơi về Open-Meteo**, không gãy — nhưng
cũng nghĩa là tiền khoá không sinh tác dụng, nên phải nhìn dòng này để biết.

## 5. Các biến môi trường liên quan

| Biến | Bắt buộc | Mặc định | Ý nghĩa |
|---|---|---|---|
| `WINDY_API_KEY` | không | (trống) | Có thì lấy số từ Windy Point Forecast; không thì Open-Meteo |
| `WINDY_MODEL` | không | `gfs` | Mô hình gọi ở Windy |

## 5b. Máy chấm màu dựa vào những gì

Ngoài gió, mỗi giờ còn bị soi thêm sáu thứ. Một thứ đủ nặng là cả giờ đó đỏ.

### Thang sức gió (m/s) — thang của chủ điểm bay

| Gió trung bình | Mức | Màu ô |
|---|---|---|
| < 4 | bình thường, tốt | xanh (dưới 2 thì xanh nhạt) |
| 4 – 6 | hơi mạnh | vàng |
| 6 – 8 | mạnh | cam |
| > 8 | rất mạnh | đỏ |

**Hà Nội (Đồi Bù) cấm ở 8 m/s**, không phải 7 như mặc định chung: theo thang
trên thì chỉ "rất mạnh" mới là mức nghỉ. Khai trong `ToaDoDiemBay.nguong` —
ngưỡng khởi điểm riêng của điểm; số chủ tự lưu ở ⚙ vẫn thắng.

| Gió giật | Có chặn bay không |
|---|---|
| tới 16 | **không** — giật không quyết định bay |
| > 16 | cảnh báo "gust mạnh" ở đúng khung giờ đó (vàng) |
| > 18 | không khuyến cáo bay (đỏ) |

**Giật không phải là thước bay hay nghỉ** (luật chủ 10/09): gió 4 m/s mà giật
12, thậm chí hơn, là chuyện thường ngày; gió to thì giật to theo. Mô hình chia
ô ~25 km nên ở địa hình đèo nó gần như luôn báo giật gấp ba bốn lần gió trung
bình — lấy con số ấy làm mốc cấm thì Khau Phạ đỏ quanh năm trong khi phi công
đứng ở bãi thấy trời hoàn toàn bay được.

Trên 16 thì nhận định nói RÕ KHUNG GIỜ: *"gust mạnh 13:00–15:00 (tới 17 m/s) —
tránh cất/hạ cánh đúng mấy giờ đó"*. Bộ chấm điểm cũng bỏ luôn "hệ số giật"
(giật ÷ gió nền): nó phạt đúng cái trường hợp nền 2 giật 9 mà chủ bảo là bình
thường.

Màu ô **Gió** nói *gió mạnh cỡ nào*; hàng **Bay?** ngay dưới mới là *kết luận
cả giờ* (đã gộp mưa, mù, dông, hướng): **😊** bay tốt · **😐** cân nhắc · **😞**
không bay. Hai thang khác nhau và đều cần: một giờ có thể gió đẹp mà vẫn đỏ
vì mưa.

Hướng gió hiện bằng **mũi tên chỉ chiều gió thổi tới** — nhìn cả hàng ngang là
thấy ngay lúc nào gió đổi chiều; tên hướng ("ĐĐB") nằm ở tooltip. Mũi tên tô
**xanh** khi đúng gió chính bãi, **đỏ** khi ngược sườn hoặc luồn khe (gió xiết), **xám**
ở điểm chưa khai luật hướng.

Màu mũi tên trả lời câu khác hẳn màu ô gió: ô gió nói *mạnh cỡ nào*, mũi tên nói
*thổi vào sườn hay thổi ngược*. Ở núi hai chuyện ấy độc lập — gió nhẹ mà ngược
sườn vẫn không bay được — nên phải nhìn thấy cả hai.

### Bảng chấm màu

| Yếu tố | Vàng (cân nhắc) | Đỏ (không bay) |
|---|---|---|
| Gió trung bình | > ngưỡng đẹp (nới tới 6 m/s khi hướng gió tốt cho bãi) | > ngưỡng cấm |
| Gió giật | > 16 m/s (gust mạnh) | > 18 m/s |
| **Mù / mây thấp** | trần mây < 2× ngưỡng, mây thấp ≥ 70% | trần mây < ngưỡng và mây thấp ≥ 70%; hoặc ẩm ≥ 98% kèm mây thấp dày |
| Mưa | — (phần trăm không còn hạ màu) | ≥ ngưỡng mưa (0,8 mm/giờ) |
| **Dông** | ≥ 40% (cảnh báo) | — **dông không còn là lý do cấm bay** |
| **Thermal gắt** | trần > 2.200 m | (không cấm — chỉ xóc) |
| **Hướng gió xấu** | — | trong cung gió xấu của điểm, bất kể tốc độ |
| **Quá trần tốc độ của hướng** | — | hướng có trần riêng mà gió vượt (Khau Phạ: Đông > 6 m/s; Sa Pa: Bắc hoặc Tây > 6 m/s) |
| **Gió xiết** | — | đúng hướng luồn khe **và** gió đã mạnh |

**DÔNG LÀ CẢNH BÁO, KHÔNG PHẢI LỆNH CẤM** (luật chủ 11/09). Trước đây 40% là
đỏ, tức là máy tự tuyên bố nghỉ cả ngày. Ở Tây Bắc mùa hè con số ấy gặp suốt —
chiều nào cũng có ổ dông lẻ đâu đó trong ô lưới 9 km, mà bãi vẫn bay cả buổi
sáng. Tệ hơn: **ngày có dông thường là ngày thermal khoẻ**, chấm đỏ nó là bỏ
mất đúng những ngày bay đẹp nhất. Thứ thật sự chặn bay là **mưa** (tính theo
lượng và số tiếng) và **gió**. Dông thì báo để người trực canh trời: gust front
quét qua bãi làm gió đảo chiều và mạnh gấp mấy lần khoảng 10–20 phút **trước**
khi mưa tới — thấy mây tích dựng cao, đáy tối là dừng.

Cùng lẽ ấy, điểm chuyên gia **trừ điểm** vì dông (≥ 60% còn tối đa 45; ≥ 40%
còn 60; ≥ 20% còn 75) chứ không đánh dấu "nguy hiểm" — nguy hiểm là thứ kéo cả
ngày xuống 20 điểm, tức là tuyên bố không bay.

Ba khái niệm mới, giải thích ngắn:

- **Trần mây** = độ cao đáy mây tính **từ bãi cất cánh**, suy từ chênh lệch
  nhiệt độ và điểm sương (khoảng 125 m cho mỗi 1°C chênh) **cộng thêm chênh độ
  cao giữa ô lưới mô hình và bãi thật**. Chỗ cộng thêm này rất quan trọng: mô
  hình chia ô ~25 km rồi lấy độ cao trung bình, ở Khau Phạ ô ấy cao 1.620 m
  trong khi bãi ở 1.268 m — không cộng phần chênh ấy thì báo "trần mây 87 m" trong
  khi đứng ở bãi nhìn lên còn hơn nửa cây số nữa mới tới mây.

  Trời quang (mây thấp < 25%) thì **không báo trần mây** — công thức chỉ nói
  "nếu khối khí này bốc lên thì tới đó nó thành mây", không nói trên đầu đang
  có mây. Và phải có **cả hai** (trần mây thấp **và** mây thấp ≥ 70%) mới chấm
  mù.

- **BA MỨC MƯA** (luật chủ 10/09), thay cho một ngưỡng duy nhất:

  | mm trong một giờ | Gọi là gì | Máy làm gì |
  |---|---|---|
  | ≤ 0,3 | không mưa | không ghi, không vẽ, không nhắc |
  | 0,4 – 0,8 | **mưa bay** | ghi cho biết, **không** hạ màu, không đếm vào số tiếng mưa |
  | ≥ 0,8 | mưa | đếm tiếng, chấm đỏ |

  Ví dụ chủ đưa: 10h mưa 1,0 mm rồi 11h–13h mưa 0,6 mm → *"mưa 1 tiếng lúc
  10:00, sau đó mưa bay tới 13:00"*, chứ không phải "mưa 4 tiếng".

- **BỎ CẢNH BÁO THEO % MƯA.** Phần trăm của mô hình là "có mưa ở đâu đó trong ô
  25 km" — hạ màu theo nó thì mùa mưa ngày nào cũng vàng trong khi bãi khô. Cả
  hàng "% mưa" trong hai bảng giờ cũng bỏ; cột mưa mm nói thẳng giờ nào bao
  nhiêu. (Hàm `xacSuatMuaThat` còn lại để bảng so sánh mô hình dùng.)

- **Ở mức NGÀY nói SỐ TIẾNG MƯA, không nói phần trăm.** "Khả năng mưa 93%" bị
  đọc thành "mưa 93% thời gian trong ngày" — tức gần như cả ngày, trong khi thực
  ra nó là "xác suất có mưa ở đâu đó trong ô lưới". Nay ghi "mưa vừa ~3 tiếng
  (08:00–10:00), tổng 5,5mm". Phần trăm chỉ còn ở hàng **Mưa %/giờ** của bảng
  giờ, nơi nó đúng nghĩa: xác suất mưa trong chính giờ đó.

  Chỉ đếm giờ có **mưa ≥ 0,8 mm** (`MUA_DANG_KE`, khớp ngưỡng cấm bay vì mưa).
  Không lọc thì một ngày rả rích 4mm thành "mưa 11 tiếng" — đúng chữ nhưng sai ý.

  Cường độ theo tổng lượng: **nhỏ** < 3mm · **vừa** 3–15mm · **to** > 15mm.

- **Khả năng mưa từng giờ** vẫn là con số **đã hiệu chỉnh theo lượng mưa**. Mô hình
  ở vùng nhiệt đới mùa mưa gần như luôn báo 90–100%, vì nó tính "có mưa ở đâu
  đó trong ô 25 km" — mà ô ấy trùm cả vùng núi rộng. Người xếp lịch cần biết
  "có mưa **ở bãi**, đủ ướt để hoãn không", nên xác suất được hạ khi lượng mưa
  dự báo gần bằng không.

- **Dông** ghép từ hai số: **CAPE** (bao nhiêu "nhiên liệu" cho đối lưu) và
  **chỉ số nâng / lifted index** (khí quyển có "mồi" để bốc không). Nhiều nhiên
  liệu mà khí vẫn nén chặt thì dông không nổ; ít nhiên liệu mà cột khí bất ổn
  sâu thì vẫn có ổ dông lẻ. Ngưỡng cấm để ở 40% vì trước khi mây dông tới, luồng
  gió đổ xuống đã quét qua bãi làm gió đảo chiều và mạnh gấp mấy lần trong vài
  phút.

- **Thermal (thermal)** đo bằng **trần lớp xáo trộn** — xấp xỉ trần bay trong
  ngày. Với bay đôi chở khách thì **êm mới là tốt**: thermal vừa đủ kéo dài
  chuyến, thermal gắt làm dù xóc, khách say, bãi đáp nổi gió xoáy. Thang này
  ngược với thang của phi công thể thao bay đường dài, đừng đọc nhầm.

**Khung mưa viết theo ĐOẠN, giờ cuối là giờ kết thúc**: 5 tiếng mưa ở 9, 10, 11
và 14, 15 giờ ghi "09–12h, 14–16h" — trừ ra là số tiếng, dấu phẩy là chỗ ngớt.
Trước ghi "09:00–16:00" thì chủ đọc thành "mưa 7 tiếng" (11/09). Dạng "09–12h"
cố ý khác dạng "09:00–16:00" của khung đẹp (khung đẹp vẫn là giờ đầu–giờ cuối).

**Dòng tóm tắt thẻ khách** đọc thành câu: "Giờ đẹp 09:00–16:00 · Gió ĐÔNG 2,3 m/s
· Giật 8,4 · ☀ 8,9 giờ nắng · 🔥 Thermal vừa 48/100 · khoẻ nhất 14:00–16:00 ·
☔ Mưa 5 giờ (09–12h, 14–16h) · 5,4mm". Hướng gió trội (trung bình véc-tơ, có
trọng số tốc độ, 6–18h) đứng ngay trước tốc độ vì đó là thứ quyết định bãi có
bay được không.

**Mưa bay (0,4–0,8 mm/giờ) KHÔNG phải cảnh báo** — chỉ ghi vào lý do. Ở Tây Bắc
mùa mưa đó là mưa phùn rải rác, bay vẫn bay, mà nó từng chiếm hai phần ba số ô ⚠. Cảnh báo nào cũng bật thì người trực thôi đọc, rồi bỏ qua luôn cái
cảnh báo thật. Sau khi siết: trên 165 ô của 3 điểm × 5 ngày còn **12 ô ⚠**
(trước khoảng 50).

Hàng **Trời** hiện biểu tượng thay số phần trăm mây: ☀️ nắng · ⛅ nắng một phần ·
☁️ âm u · 🌦 mưa nhẹ · 🌧 mưa. Phần trăm mây vẫn xem được ở tooltip.

Rê chuột vào ô bất kỳ trong bảng giờ để xem đúng lý do máy chấm màu đó.

## 5f. Meteogram — biểu đồ giờ kiểu Windy

Bảng số nói chính xác từng ô, nhưng mắt phải đọc từng ô một. Meteogram nói
**hình dáng của ngày** trong một cái liếc: mây dày lên lúc nào, mưa rơi vào khúc
nào, gió mạnh dần hay dịu đi, áp suất đang lên hay xuống. Người bay quen nhìn
hình này trên Windy nên đọc được ngay.

Trên thẻ có ba nút **▦ Basic** · **📊 Meteogram** · **🪂 Airgram** — như các tab
của Windy. **Mặc định là Basic** (bảng số): đọc chính xác từng ô, và phần lớn
lúc người trực chỉ cần tra một giờ cụ thể.

**CẢ BA KIỂU XEM vẽ NỐI LIỀN CẢ DÃY NGÀY trên một dải cuộn ngang** (luật chủ 10/09
— Basic lúc đầu chỉ vẽ một ngày trong khi Meteogram đã chạy thông, ba tab cùng
một chỗ mà cư xử khác nhau).
Trước đây mỗi lần chỉ vẽ một ngày, gạt ngang hết ngày là cụt — trong khi thứ
người ta muốn thấy là "cơn mưa chiều nay có kéo sang sáng mai không". Hai chiều
đồng bộ: bấm ngày ở dải phía trên thì biểu đồ trượt tới, gạt biểu đồ tới ngày
nào thì dải phía trên sáng ngày ấy. Cột nhãn trục bên trái dính khi cuộn.

Các tầng, xếp đúng thứ tự Windy: **tiêu đề ngày (chấm màu + tổng mưa + mọc/lặn)
→ giờ → biểu tượng trời → nhiệt độ → gió (mũi tên + tốc độ) → giật → khối
mây/mưa/áp suất → trần mây**.

Khối giữa là phần "có hình" nhất:

- **Mây vẽ theo ĐỘ CAO THẬT** — tầng thấp 0–2 km, giữa 2–6 km, cao trên 6 km;
  đậm nhạt theo phần trăm mây tầng đó. Vệt xám dày sát đáy là mây trùm núi.
- **Vạch xanh là mặt bãi** (theo độ cao bãi cất cánh đã khai) — nhìn vệt mây nằm
  trên hay dưới vạch là biết bãi có bị mây trùm không.
- **Cột mưa từng giờ, HAI MÀU** (mm): **xanh là mưa thường**, **cam là phần mưa
  rào / giông** chồng lên trên (mô hình tách sẵn qua `showers`). Mưa 1,0mm cộng
  giông 5,0mm ra cột 6,0mm nhưng nhìn là biết phần lớn nước đến từ ổ giông —
  hai kiểu mưa quyết định khác hẳn nhau: mưa dầm thì chờ ngớt là bay, còn giông
  thì gió đổ xuống quét qua bãi *trước khi* mưa tới. Cột nhạt là mưa bay
  (0,4–0,8); từ 0,3 trở xuống không vẽ gì.
- **Đường xám là áp suất** — dốc xuống là thời tiết đang chuyển.
- **Nền tím nhạt là ban đêm**, tô theo **giờ mặt trời mọc/lặn THẬT của từng
  ngày** (mô hình cấp, đổi theo mùa) chứ không phải 6h/18h cứng — tháng 12 ở
  Khau Phạ 6h vẫn còn tối.
- Vạch độ cao ghi cả **km và feet** như Windy; hàng trần mây tô màu theo độ cao
  (xanh lá = trần cao, xanh nước = thấp dần, xám = mây sát bãi).

Vẽ bằng SVG chứ không dùng thư viện biểu đồ: chỉ mấy hình chữ nhật và một đường
cong, mà thư viện thì kéo theo vài trăm KB và một cách nghĩ riêng về trục.

### Airgram — gió theo độ cao

Mỗi hàng là một mực: **~3.000 m (700 hPa) · ~1.500 m (850 hPa) · ~750 m
(925 hPa) · mặt đất**. Ô nào cũng có mũi tên hướng, tốc độ và nhiệt độ mực đó.
Nhìn dọc một giờ là thấy ngay gió **tăng theo độ cao** hay **đổi hướng ở tầng
nào** (gió đứt), và trên có ấm hơn dưới không (nghịch nhiệt) — thứ bảng mặt đất
không bao giờ hiện.

### Màu gió và giật chuyển dần

Xanh → vàng → đỏ → đỏ thẫm (`components/weather/mau-gio.ts`), không nhảy bậc.
Bậc rời cũ khiến 5,9 và 6,1 m/s nhảy hẳn hai màu dù chỉ chênh 0,2 — mắt bị đánh
lừa rằng có một ngưỡng thật ở đó. Thang giật ngả vàng muộn hơn thang gió: 10
mới chớm vàng, 14 đỏ dần, trên 16 đỏ, 18+ đỏ thẫm.

### Vị trí và mặt trời mọc/lặn

Ngay dưới dải ngày có dòng vị trí: tên bãi, toạ độ, độ cao, khung giờ bay của
điểm, và **mặt trời mọc/lặn của NGÀY ĐANG CHỌN** kèm độ dài ngày. Lấy từ mô hình
(`daily=sunrise,sunset`) nên tự đổi theo mùa: Khau Phạ tháng 6 lặn 18:40, tháng
12 mới 17:30 — hơn một tiếng, đúng bằng khoảng quyết định còn kịp chuyến cuối
hay không.

### Bản đồ Windy chỉ có tab Basic

Đã dò thật trên `embed2.html`: truyền `type=meteogram`, `type=airgram`,
`detailType=…` đều bị bỏ qua, Windy vẫn vẽ bảng giờ. Meteogram và Airgram của
Windy nằm sau trang đầy đủ, không nhúng được. Nên dưới bản đồ có hai nút mở
**windy.com** ở tab mới để đối chiếu, còn biểu đồ dùng hằng ngày là hai tab tự
vẽ ở trên — cùng số liệu, chú thích tiếng Việt, và có thêm mặt bãi với trần mây
tính theo độ cao bãi, thứ Windy không biết.

## 5d. Nhận định ngày bay — khối phía trên thẻ

Bảng giờ nói "10h gió 3 m/s, mưa 0". Đúng, nhưng chưa trả lời câu người ta
thật sự hỏi trước khi lên đèo: **hôm nay là ngày kiểu gì**. Khối "Nhận định
ngày bay" đọc cả ngày như một phi công dự báo và chốt một trong bốn mức:
**NGÀY BAY TỐT · KHÁ · HẠN CHẾ · NÊN NGHỈ BAY**, kèm một câu tóm tắt, các mục
nhận định có số, và khuyến cáo việc nên làm. Bấm ngày khác trên dải thì khối
đổi theo.

Mỗi mục đều nói **con số nó dựa vào** — "thermal mạnh" suông thì không kiểm
được; "thermal mạnh — trần 1.800m, CAPE 900" thì phi công có kinh nghiệm tự đối
chiếu được với cảm nhận của mình, và cái sai của máy lộ ra ngay.

| Mục | Dựa vào | Nói gì |
|---|---|---|
| 🌬 Gió mặt đất | gió 10m TB/max, hướng trội (trung bình véc-tơ), luật hướng | thuận/ngược sườn; **đổi hướng giữa ngày** (sáng–chiều lệch ≥ 60°) |
| 🪁 Gió trên cao | gió **nội suy tại 300 / 500 / 1000 m trên bãi** từ các mực 925/850/700 hPa và mặt đất (mốc nằm dưới bãi bị bỏ) | "Gió mực 500m mạnh (9 m/s) từ 11:00 — không leo quá 300m, bám sườn"; > 12 m/s: bị thổi lùi, không bay; mực 1000m > 12: có lớp gió đứt, giữ dưới 500m; mặt đất lặng mà mực 300m đã có gió: **gió đứt ngay trên bãi** |
| ☀️ Nắng | `sunshine_duration` cộng trong khung 7–17h | số giờ nắng / 11; < 3h: âm u, thermal yếu |
| 🔥 Thermal | trần lớp xáo trộn, CAPE, bức xạ | yếu · vừa · tốt · **gắt từ mấy giờ**; khung nâng tốt |
| ⚖️ Ổn định | lifted index TB, ẩm, nhiệt, gió | ≥ 4: rất ổn định — kèm ẩm ≥ 75%, nóng ≥ 30°C, lặng gió là **ngày oi bức, ít thermal, mù khô**; ≤ −2: **bất ổn, dễ dông, xóc, nhiễu** |
| 🧢 Nghịch nhiệt | nhiệt độ các mực 925/850/700, so hai mực kề | lapse > 0°C/km: **nghịch nhiệt**; > −2: lớp chặn — báo độ cao **tính từ bãi**; nắp < 600m: thermal bị chặn, mù tích dưới |
| 🌡 Áp suất | `pressure_msl` TB so với ngày trước, **và xu hướng từng giờ trong ngày** | tụt ≥ 5 hPa/24h: **front/rãnh thấp đang tới**; tăng ≥ 3: áp cao lấn, quang dần. Trong ngày: "**Áp suất sụt từ 15:00** — có thể có dông; hạ cánh xong trước 14:00" |
| 🌀 Nhiễu động | gộp thermal gắt + giật > 16 + gió đứt + bất ổn định | "NHIỄU ĐỘNG MẠNH: thermal gắt 11:00–14:00 + giật ≥14 m/s — giữ tốc độ, tay lái chủ động, sẵn sàng xử lý collapse" |
| ⛈ Front | áp giảm ≥ 3 **và** gió đổi hướng **và** mưa tăng > 1mm so hôm trước | dấu hiệu front đi qua — gió giật bất ngờ khi front tới |
| 🌫 Mù | trần mây < 300m và mây thấp ≥ 70% | giờ trùm bãi, **tan từ mấy giờ** |
| 🌧 ⚡ Mưa, dông | lượng mưa > 0,5 mm/giờ, xác suất dông | giờ mưa, tổng mm; dông tối đa |

**Kiểu ngày** — câu phi công nói với nhau ở bãi, hiện ngay dưới dòng tóm tắt:
*Ngày BẤT ỔN ĐỊNH: thermal gắt, nhiễu động mạnh, mây tích phát triển nhanh —
nguy cơ OD/dông chiều, chỉ bay sáng* · *Ngày ỔN ĐỊNH OI BỨC: lift yếu, không khí
đục, mù khô* · *Ngày GIÓ MỰC CAO MẠNH: thermal bị xé, leo là nhiễu động* · *Ngày
NGHỊCH NHIỆT THẤP* · *Ngày THERMAL GẮT: bãi đáp có rotor nhiệt* · *Ngày ỔN ĐỊNH,
THERMAL ÊM: kiểu ngày đẹp nhất cho bay đôi* · *Ngày MƯA* · *Ngày FRONT đi qua*.

**Khuyến cáo xếp xấu nhất lên đầu** và in đậm: câu "Gió mực 500m rất mạnh…",
"Nguy cơ dông…", "Áp suất sụt từ…" là câu quyết định bay hay không, phải đọc
trước "khung giờ đẹp" — không thì người ta thấy giờ đẹp rồi thôi không đọc nữa.

**Bẫy thuỷ triều khí quyển**: ở nhiệt đới, áp suất *tự* tụt 2–3 hPa từ ~10h tới
~16h mỗi ngày rồi lên lại — nhịp thường ngày, không phải dông. Máy chỉ gọi là
"sụt" khi tụt **nhanh hơn nhịp ấy**: so với đúng ba giờ đó của hôm trước phải
tụt thêm ≥ 1,2 hPa và bản thân ≥ 2,5 hPa/3h (ngày đầu dãy, không có hôm trước,
thì đòi hẳn 3 hPa/3h). Bản đầu bắt ngưỡng cố định nên ngày nào cũng "sụt từ
12:00", kể cả ngày đẹp trời.

**Chốt mức không tự nâng**: bắt đầu từ màu của ngày (đã tính từng giờ), rồi chỉ
hạ theo số mục xấu. Bảng giờ nói đỏ thì không câu chữ nào biến thành tốt được.

Trên trang khách, khối này **mới có bản tiếng Việt** (câu chữ sinh động theo số
liệu, dịch sáu thứ tiếng là việc riêng); khách nước ngoài vẫn đọc được màu và
bảng giờ. Trang điều phối hiện một dòng, bấm mới xổ chi tiết.

## 5e. Chuyên gia khí tượng — ĐIỂM ĐIỀU KIỆN BAY 0–100

Ba thước trên cùng một ngày, mỗi thước trả lời một câu khác:

| Thước | Trả lời | Ở đâu |
|---|---|---|
| Mặt 😊 😐 😞 (`chamGio`) | **được phép bay không** — luật cấm, một thứ quá ngưỡng là đỏ | hàng Bay? |
| Nhận định (`nhanDinhNgay`) | **ngày kiểu gì, nên làm gì** — câu chữ cho người đọc | khối trên thẻ |
| Điểm 0–100 (`chuyen-gia.ts`) | **bay có ĐẸP không, đẹp cỡ nào** — con số để so ngày với ngày, mô hình với mô hình, và đối chiếu với chấm thực tế | huy hiệu trên khối nhận định, ô ngày, hàng Điểm |

**Cách chấm một giờ** — 7 yếu tố, mỗi yếu tố 0–100 theo đường cong của bay đôi
chở khách (không phải bay thể thao), nhân trọng số rồi cộng:

| Yếu tố | Trọng số | Đường cong (điểm theo số đo) |
|---|---|---|
| Gió mặt đất | 25 | 0 m/s → 65 · 1,5–4 → 100 · 6 → 55 · ngưỡng cấm → 25 · quá → 0. **Thuận sườn** thì 4–6 m/s vẫn 85–100 |
| Gió giật | 10 | ≤ 6 → 100 · 10 → 92 · 14 → 75 · 18 → 30 · quá 18 → 0. **Hệ số giật** > 3× kèm giật ≥ 8: −15 ("từng đợt") |
| Hướng gió | 15 | gió chính bãi 100 · chéo sườn 55 · chưa khai luật 80 · **ngược sườn / gió xiết 0** |
| Gió trên cao | 15 | mực 500m trên bãi: ≤ 5 → 100 · 8 → 65 · 12 → 15 · 14 → 0. **Cắt gió** (mặt đất lặng, 300m có gió): −20 |
| Thermal / ổn định | 10 | trần 500–1500 m → 100 · 300 → 70 · 2200 → 65 · 3000 → 40. LI ≤ −2: −20 · ≤ −4: −35 · ≥ 6: −10 |
| Trần mây / mù | 10 | trời quang 100 · mây thấp dày: trần < 150 m → 0 · 300 → 45 · 500 → 75 · 800 → 100 · **sương mù 0** |
| Mưa / dông | 15 | không → 100 · lác đác 70 · khả năng ≥ 75% → 60 · mưa quá ngưỡng 0 · dông 20–39% → 50 · **≥ 40% → 0** |

**Trần nguy hiểm**: yếu tố nào chạm mức cấm (in đậm ở bảng) thì điểm cả giờ
**không vượt quá 20**, bất kể các yếu tố khác đẹp tới đâu. Trung bình có trọng số
đơn thuần sẽ cho "gió 10 m/s nhưng nắng đẹp" ra 60 điểm — vô nghĩa và nguy hiểm.

**Điểm ngày** = trung bình của (khung 3 giờ đẹp nhất, trung bình cả khung 7–17h),
rồi **áp trần theo số giờ bay được** (giờ ≥ 55 điểm): ≤ 3 giờ → tối đa 69 (KHÁ),
≤ 5 giờ → tối đa 84. Lấy riêng khung đẹp nhất thì ngày "sáng đẹp, mưa từ trưa"
ra 90 TỐT — đứng cạnh câu nhận định "HẠN CHẾ, mưa 07–16h" là hai thứ cãi nhau.

Xếp loại: **≥ 75 TỐT · 55–74 KHÁ · 35–54 HẠN CHẾ · < 35 KHÔNG BAY**.

**Độ tin cậy** (0–100) trừ dần theo: dự báo xa (trước 3 ngày −15, 6 ngày −40),
thiếu dữ liệu tầng cao / chỉ số ổn định / điểm sương (−10 mỗi thứ), áp suất tụt
≥ 3 hPa so hôm trước (−15, thời tiết đang chuyển), trong ngày đẹp xen xấu chênh
≥ 60 điểm (−10, khó đoán giờ). Rê chuột vào huy hiệu để xem lý do.

Mỗi thành phần có **ghi chú số** ("mực 500m 8,3 m/s — gió đứt (300m: 6,1, đất:
0,8)") — người đọc kiểm được, và chỗ máy sai lộ ra ngay. Đường cong viết thành
bảng mốc ngay trong mã (`lib/baobay/chuyen-gia.ts`) để chỉnh theo kinh nghiệm
chủ là chuyện một dòng; sổ chấm thực tế là chỗ đối chiếu.

### Thổi lùi — cảnh báo cứng khi gió trên 500 m vượt 10 m/s

Luật chủ 11/09, áp cho **mọi điểm**, không cần khai riêng: gió **mực 500 m hoặc
cao hơn** trên **10 m/s** thì luôn hiện câu *"Cẩn thận bị THỔI LÙI, gió xiết ở độ
cao 500m"*, kèm số thật của hai mực và cách xử lý — **trên 12 m/s**: không cất
cánh dù gió mặt đất nhẹ; **10–12 m/s**: bám sườn thấp, không leo ra xa, giữ tốc
độ, sẵn sàng hạ sớm.

Đây là cái bẫy kinh điển: đứng ở bãi thấy gió 2–3 m/s nên yên tâm cất cánh, lên
tới 500 m gặp luồng 11 m/s là dù đứng yên hoặc trôi ngược ra sau sườn — vào vùng
khuất gió (rotor) thì hết đường ra. Xét **cả mực cao hơn** chứ không riêng 500 m:
gió 1.000 m mạnh cũng sà xuống khi thermal khoét lên. Câu này luôn đứng **đầu**
danh sách khuyến cáo.

## 5f2. Cà vách (ridge soaring) — nguồn nâng THỨ HAI

Bộ chấm cũ chỉ biết **thermal**, nên ngày lift nhiệt yếu là ra "chuyến ngắn,
lift kém" — trong khi ở **Đồi Bù gió BẮC 3–5 m/s** thổi thẳng vách thì bay được
cả tiếng mà chẳng cần bọt nhiệt nào (chủ 11/09). Hai nguồn nâng khác nhau:
thermal là bọt khí nóng bốc lên, **cà vách là gió bị vách núi hắt lên**.

Thang của chủ, máy áp đúng thế:

| Gió chính bãi | Kết luận |
|---|---|
| < 3 m/s | chưa dựng được vách — không nói gì |
| ≥ 3 m/s | **cà vách tốt** |
| 4–6 m/s | **cà vách CỰC TỐT** |
| + có nắng (≥ 300 W/m² trong chính những giờ ấy) | thermal cộng hưởng — **bay được cả tiếng** |

Điều kiện: hướng phải nằm trong **cung gió tốt của bãi** (Đồi Bù: Đông, Bắc,
Tây — chính Bắc là đẹp nhất), ít nhất **2 giờ** trong khung bay, và **giờ mưa
không tính** (vách vẫn dựng gió nhưng chẳng ai bay dưới mưa — chủ nhắc đúng
thứ Hai 14/09: gió bắc đẹp mà mưa thì vẫn là ngày tệ).

Có cà vách thì **kiểu ngày** đổi hẳn: thay vì "Ngày ÍT THERMAL: bay ebon là
chính" thành *"Ngày CÀ VÁCH CỰC TỐT: gió chính bãi dựng đều lên vách — bay bám
vách cả tiếng"*. Mưa và mù vẫn xét **trước** nên không lấn. Gió mực 500 m mạnh
thì mục cà vách hạ xuống mức chú ý kèm câu *"bám vách thấp, đừng leo ra xa"*.

Mục **Gió mặt đất** nay nói thẳng **GIÓ CHÍNH BÃI** khi hướng nằm trong cung tốt —
trước chỉ tô màu, đọc không thấy chữ ấy thì tưởng gió bình thường.

**Gust là dấu hiệu thermal, không phải lỗi**: "gust vọt lên 10 m/s trên nền gió
3–4 là dấu hiệu thermal mạnh, vì gust chủ yếu do hoạt động thermal cộng hưởng
với gió chính" (chủ 11/09). Đúng vật lý: bọt khí bốc lên kéo không khí tầng trên
(gió mạnh hơn) xuống thế chỗ. Nên quy tắc thermal **cộng thưởng tối đa 8 điểm**
theo chênh giật–gió nền, và **chỉ khi đang có nắng** (≥ 300 W/m²) — ban đêm hay
ngày mưa cũng giật mà chẳng có thermal nào. Cộng thưởng chứ không phải một yếu
tố có trọng số: đây là dấu hiệu xác nhận, không phải nguyên nhân.

**Một nguồn cho thermal**: service chấm `tiemNangThermal` **trước**, rồi truyền
vào bộ nhận định để mục 🔥 Thermal kể lại đúng con số ấy. Trước đây thẻ hiện
"thermal yếu — CAPE 40" ở mục này và "38/100 nhẹ" ở mục kia — hai thước cho cùng
một ngày (chủ báo 11/09).

**Từ của bãi**: "bay lướt" đổi thành **"bay ebon"**.

## 5h. Skew-T log-P — giản đồ thám không cho một ngày

Chủ hỏi 11/09: "lấy được Skew-T của một điểm bay vào một ngày bay không?" —
**được**, và vẽ từ chính mô hình mình đang dùng chứ không mượn ảnh dựng sẵn.

Vì sao KHÔNG lấy ảnh có sẵn trên mạng: ảnh Skew-T ngoài kia bám theo **trạm
thám không thật** (thả bóng ngày hai lần), trạm gần Đồi Bù nhất là Hà Nội — sai
chỗ, sai giờ, và **không có ngày mai**. Open-Meteo trả sẵn nhiệt độ, điểm sương,
gió và độ cao địa thế vị **theo từng mực áp suất**, nên dựng lấy thì đúng toạ độ
bãi, đúng mô hình đang chọn, và có cho **cả 10 ngày tới**.

**Lấy riêng, không nhét vào `/api/thoi-tiet`**: một ngày × 12 mực × 5 trường là
gần 60 con số mỗi giờ; nhân 10 ngày × 7 điểm thì gói dữ liệu trang chính phình
lên mấy lần, trong khi giản đồ chỉ mở khi có người bấm nút. Đường riêng:
`GET /api/thoi-tiet/skew-t?spot=<slug>&date=YYYY-MM-DD[&model=...]`, cache 30
phút ở biên như các API thời tiết khác.

**Đọc thế nào** — chú thích bốn đường in ngay trên hình, và dưới hình là khối
"Giản đồ này nói gì" viết cho người chưa từng xem Skew-T: mỗi đường là MỘT SỐ ĐO
theo độ cao, gọi đủ tên (chủ 11/09 hỏi "nhiệt độ màu đỏ là nhiệt độ gì?"). Khối
ấy chỉ nói tới **dải tím** khi ngày đó THẬT SỰ có lớp nghịch nhiệt — trước đây
nói sẵn, mà hôm không có nắp thì người xem đi tìm một màu không tồn tại (chủ
báo 11/09). Đáy mây và trần thermal cũng in kèm số mét thật của giờ đang xem.

| Thứ trên hình | Nghĩa |
|---|---|
| Trục đứng | áp suất theo thang log, ghi kèm **độ cao mét** để khỏi quy đổi |
| Trục ngang | nhiệt độ, **bị xiên** sang phải khi lên cao — để đoạn nhiệt khô thành gần thẳng đứng |
| **— đỏ** | nhiệt độ môi trường |
| **— xanh** | điểm sương: sát đường đỏ là ẩm (dễ mây, mưa rào), tách xa là khô (thermal "xanh") |
| **- - cam** | **thermal từ mặt đất**: khối khí nóng bốc lên nguội theo đường này; chạm lại đường đỏ ở đâu là **trần thermal** ở đó |
| **- - xám** | **đoạn nhiệt khô**: quy luật vật lý "khí khô bốc lên nguội 1°C mỗi 100m", vẽ ra chỉ để **so độ nghiêng** với đường đỏ |
| Dải **tím** | lớp nghịch nhiệt — cái nắp chặn thermal (chỉ hiện khi ngày đó có) |
| Vạch đen đứt | độ cao **bãi cất cánh**; bọt khí xuất phát từ mực đầu tiên nằm trên bãi |
| Cờ gió bên phải | hướng và tốc độ gió từng mực (m/s) |

**Chữ dùng theo tiếng của bãi** (chủ 11/09 hỏi lại hai chữ): gọi **"thermal từ
mặt đất"** chứ không gọi "bọt khí bốc từ bãi" — người bay không nói "bọt khí".
Và không viết tắt kiểu "mốc so": nói thẳng đường xám là **quy luật vật lý**
(khí khô bốc lên nguội 1°C mỗi 100m), vẽ ra để **so độ nghiêng** với đường đỏ.

Phép tính nằm ở `lib/baobay/skew-t.ts` (thuần tính, không mạng): đáy mây theo
công thức Espy (125 m cho mỗi 1°C chênh nhiệt độ – điểm sương), đường bọt khí
khô 9,8°C/km tới đáy mây rồi chuyển đoạn nhiệt ẩm xấp xỉ theo nhiệt độ, trần
bọt khí là chỗ nội suy cắt đường môi trường. Hình vẽ tay bằng SVG ở
`components/weather/SkewT.tsx` — mở bằng nút **🌡 Skew-T** cạnh Basic /
Meteogram / Airgram, có hàng chọn giờ (mặc định 13:00, lúc cột khí mở nhất). Nút ấy có ở **cả ba chỗ** nhúng thời tiết: thẻ trang danh sách, thẻ trong
`/baocao`, và widget trên từng trang điểm bay (chủ 11/09 phát hiện trang điểm
bay còn thiếu).

**HAI KHUNG VẼ, chọn theo bề rộng màn hình** (chủ 11/09 báo hai chuyện trái
nhau nhưng đều đúng: "để nhỏ quá rất khó nhìn" và "trên mobile không hiện hết,
phải vuốt mới ra đủ"). Máy tính: khung 820×620, chữ 11px, đo thật ra 964×729px.
Điện thoại: khung riêng 400×520, lề mỏng, chữ khai 9px — cả giản đồ nằm gọn
trong một màn (đo thật: 330px, trang 390 không tràn, không phải vuốt).

**Trần hình = 4.000 m (≈ 616 hPa)** (chủ 11/09): vẽ tới 300 hPa thì
tầng mình bay bị nén vào một phần ba dưới cùng, nhìn không ra lớp nào; hình nhỏ
thì chữ 8px không đọc nổi. Mực ngay trên trần vẫn được lấy để đường vẽ
chạy tới mép khung rồi mới bị cắt bằng clip. **Chú thích bốn đường in ngay trên hình**,
không bắt người xem dò xuống khối chữ rồi ngước lên đối chiếu.

**Độ cao BÃI HẠ** vẽ thành vạch thứ hai, vì hiệu giữa cất và hạ là **chênh cao**
— thứ quyết định chuyến dài bao lâu khi không có nâng, và là mốc để xem mây hay
nghịch nhiệt có nằm trong đường bay không. Gọi "chênh cao" chứ không gọi "thả"
(chủ sửa 11/09). Số chủ chốt 11/09:

| Bãi | Cất cánh | Hạ cánh | Chênh cao |
|---|---|---|---|
| Đèo Khau Phạ | 1.268 m | 700 m | 568 m |
| Sa Pa | 1.500 m | 1.000 m | 500 m |
| Đồi Bù | **650 m** | 50 m | 600 m |
| Viên Nam | 850 m và 650 m | 50 m | 800 m |
| Bắc Sum – Quản Bạ | 1.350 m | 800 m | 550 m |
| Phình Hồ – Trạm Tấu | 900 m | 300 m | 600 m |
| Sơn Trà (Đà Nẵng) | 600 m | 0 m | 600 m |

**Đồi Bù KHÔNG phải 833 m**: 833 là đỉnh núi (tên dân gian "núi 833"), còn chỗ
cất cánh nằm ở ~650 m (chủ nhắc 11/09 — trước ghi nhầm 833). Viên Nam có **hai**
chỗ cất, 850 m và 650 m; giản đồ vẽ cả hai vạch, mọi phép chấm lấy bãi chính.

### Airgram phải phủ đúng đường bay: TỪ BÃI HẠ LÊN

Trước đây hàng dưới cùng là "mặt đất" của mô hình gắn nhãn độ cao **bãi cất**,
rồi ngay trên nó là mực 925 hPa — ở Đồi Bù hiện "mặt đất 833m" mà trên là
"~800m", tức hàng trên THẤP HƠN hàng dưới, đọc ra vô lý (chủ báo 11/09).

Nay bảng lấy đúng khúc mình bay, từ dưới lên: **bãi hạ** (gió 10 m của mô hình —
chỗ vào vòng lượn đáp) · **bãi cất** (gió nội suy đúng độ cao ấy, thêm một hàng
nữa nếu điểm có hai chỗ cất) · rồi các mực mô hình **nằm cao hơn bãi cất**; mực
nào thấp hơn thì bỏ vì nó ở dưới chân mình. Hướng gió nội suy theo góc ngắn
nhất (350° và 10° ra 0°, không phải 180°).

**Bảng phụ mở ra là Ô LƯỚI RIÊNG rộng cả hai cột** (chủ 11/09): để nó trong thẻ
thì thẻ cao vọt lên còn cột bên cạnh hở một khoảng trắng đúng bằng phần chênh.
Nay nó là ô lưới đặt ngay sau thẻ, nền cam nhạt cùng màu ô ngày đang chọn; lưới
trang bật `grid-flow-row-dense` nên thẻ hàng xóm lấp lại vào chỗ bên cạnh —
**không thẻ nào đổi chỗ**. Đo thật: bấm một ngày, thẻ lệch x = 0, y = 0, và thẻ
kế tiếp vẫn ở đúng y cũ.

**Dải ngày dồn một hàng khi thẻ đủ rộng** (chủ 11/09): mười ô một hàng thì mắt
quét một lượt là so được cả dự báo. Đo theo **bề rộng của thẻ** (container
query `@4xl`) chứ không theo màn hình — cùng một thẻ nằm full trang ở
`/baocao/thoi-tiet` nhưng chỉ chiếm một cột hẹp trên trang danh sách; hỏi màn
hình thì bên hẹp bị ép mười ô rộng 40px. Đo thật: thẻ 1.000px → ô 92px, không ô
nào tràn chữ; thẻ 490px giữ nguyên năm ô một hàng.

## 5g. Tiềm năng thermal — QUY TẮC SÁU YẾU TỐ (0–100, năm mức)

Chủ hỏi 11/09: "thermal phụ thuộc nắng nhưng phụ thuộc LI nhiều hơn chứ?" —
**không**. LI đo tới 500 hPa (~5.500 m), nó nói bọt khí có bốc tiếp thành mây
dông không; thermal mình bay nằm ở 500–2.000 m đầu tiên. Số thật 12–13/09 Khau
Phạ: LI +2,4 mà trần xáo trộn 1.700 m, nắng cả ngày — ngày thermal đẹp; 15–16/09
LI +0,4 mà trần 150–190 m vì mây dày — không có gì để bay. Chấm theo LI thì sai
cả hai. Nên có quy tắc riêng (`lib/baobay/thermal.ts`), tách khỏi điểm chuyên
gia: chuyên gia trả lời **êm hay xóc, bay được không**; thermal trả lời **có NÂNG
không, mấy giờ, lên tới đâu**.

**Từng giờ** chấm 0–100:

| Yếu tố | Trọng số | Dựa vào | Đường cong (mốc → điểm) |
|---|---|---|---|
| ☀️ Nắng | 20 | bức xạ W/m², phút nắng, mây | 100 W → 15 · 300 → 45 · 500 → 75 · 700 → 100; phút nắng chỉ được tính khi bức xạ đủ (×buXa/500); mây > 60% trừ tới một nửa |
| 📏 Trần xáo trộn | **45** | `boundary_layer_height` | 300 m → 10 · 600 → 25 · 1.000 → 40 · 1.500 → 65 · 2.000 → 85 · 2.500 → 100 |
| 🌡 Độ dốc nhiệt | 20 | nhiệt hai mực THẤP NHẤT NẰM TRÊN BÃI (925/850/700) | ≤ 0 °C/100 m → 0 · 0,5 → 30 · 0,65 → 50 · 0,8 → 75 · 0,95 → 100 |
| ⚖️ Ổn định sâu | 15 | LI, CAPE | −4 → 100 · −1 → 90 · +2 → 70 · +6 → 45 · +10 → 25 |
| 🌬 Gió mực 500 m trên bãi | ×hệ số | gió nội suy theo độ cao | ≤ 4 m/s ×1 · 6 ×0,85 · 8 ×0,6 · 10 ×0,35 · 12 ×0 |
| 💧 Độ khô | ×hệ số | nhiệt − điểm sương | 0 °C ×0,8 · 2 ×0,9 · ≥ 4 ×1 |

Hai yếu tố cuối **chỉ được trừ, không cộng**: bản đầu để gió lặng và LI cộng
điểm thì ngày trần 185 m vẫn bị "gánh" lên 61 "mạnh". Yếu tố phụ chỉ kéo xuống.

**Trần cứng** bất kể phần còn lại: không nắng hoặc mưa ≥ 0,4 mm → ≤ 12; trần xáo
trộn < 300 m → ≤ 20; nghịch nhiệt trong 1.000 m trên bãi → ≤ 35; gió mực 500 m
≥ 12 m/s → ≤ 25.

Ở Khau Phạ bãi 1.268 m nên mực 925 hPa (~750 m) nằm **dưới bãi** — độ dốc
nhiệt lấy 850 → 700, không lấy 925 (đó là khí trong thung lũng).

**Điểm ngày** = trung bình **3 giờ liên tiếp cao nhất** trong khung giờ bay của
điểm (thermal chỉ cần một khúc giữa trưa là đủ một ca). Kèm: khung 3 giờ ấy,
số giờ ≥ 40 ("giờ có thermal"), ba bốn câu lý do có con số, và cảnh báo.

| Điểm | Mức | Kiểu ngày (số thật 11–20/09) |
|---|---|---|
| < 25 | rất nhẹ | mây dày, trần < 300 m, hoặc mưa |
| 25–44 | nhẹ | nắng ít, trần 400–700 m |
| 45–64 | vừa | nắng, trần 1.000–1.500 m, LI dương — ngày bay đôi đẹp nhất |
| 65–81 | mạnh | trần 1.500–1.900 m, dốc nhiệt tốt |
| ≥ 82 | rất mạnh | trần > 2.000 m, dốc nhiệt gần đoạn nhiệt, bất ổn sâu — vài tuần một lần |

**Cảnh báo** đi kèm: LI ≤ −4 hoặc CAPE ≥ 1.500 → *mây phát triển quá mức, bay sáng*;
mây < 25% và chênh điểm sương ≥ 8 °C → *thermal XANH, khó nhìn nguồn*; "rất
mạnh" → *bay đôi xóc, khách say*; gió mực 500 m ≥ 12 → *xé thermal HH–HH*.

**Thẻ trong app quản trị nói ĐỦ NHƯ trang khách** (chủ 11/09): ô ngày có hướng
gió trội + tốc độ trên nền màu theo thang gió, điểm chuyên gia kèm số giờ đẹp,
mức thermal, mưa, dông, nhãn CÂN NHẮC/NÊN NGHỈ, dòng hoàng hôn đẹp; dòng đầu thẻ
bám theo **ngày đang chọn** (không phải luôn là hôm nay) và có thêm số giờ nắng.
Ô đang chọn tô **cam** ở cả hai nơi. Hàm `hoangHonDep` nằm ở `lib/baobay/thoi-tiet.ts`
để hai thẻ dùng chung.

**Mở một ngày KHÔNG làm thẻ nhảy chỗ** (chủ 11/09): trước đây thẻ nở ra chiếm hai
cột nên lưới xếp lại, thẻ rơi xuống hàng dưới và các thẻ sau trôi theo — bấm xong
phải đi tìm bảng vừa mở. Nay thẻ giữ nguyên ô của nó, chỉ cao thêm; bảng phụ mở
ngay bên dưới trong chính thẻ ấy. Đo trên trang thật: lệch x = 0, y = 0, rộng = 0.

**Hiện ở đâu**: dòng tóm tắt thẻ khách ("🔥 Thermal mạnh 72 (11:00–13:00)"),
khối "Tiềm năng thermal" trong nhận định tiếng Việt (thẻ khách và thẻ nội bộ),
hàng "Thermal potential" trong bản tóm tắt ngoại ngữ, dòng hôm nay của thẻ
`/baocao`. Phép thử: `scripts/baocao/test-thermal.ts` (28 ca — kiểu ngày LI
dương/trần sâu, LI âm/trần thấp, nghịch nhiệt sáng vỡ trưa, gió xé, dông);
số thật: `do-thermal-that.ts khau-pha ha-noi sapa`.

### Thiếu điểm thì đừng cache lâu

Chủ 11/09: "trang thời tiết không thấy có điểm bay Khau Phạ." Gọi thẳng
`/api/thoi-tiet?spot=khau-pha` thì vẫn ra số — nên không phải mất khai báo, mà
là **một bản thiếu bị cache**. Danh sách gọi cả 7 điểm song song bằng
`allSettled` để một điểm hỏng không kéo cả trang xuống; nhưng bản thiếu ấy lại
được cache 30 phút ở biên và phục vụ tiếp một tiếng nữa
(`stale-while-revalidate`) — cả tiếng khách vào không thấy điểm bay chính.

Nay: **đủ 7 điểm mới cache dài**; thiếu thì cache 60 giây và ghi log điểm nào
rơi. Lần gọi sau tự lấy lại.

## 5c. Hai mô hình chạy song song

- **ECMWF** (qua Open-Meteo) cho gió, mưa, mây, điểm sương, CAPE.
- **GFS** cho ba số ECMWF không có: chỉ số nâng, lực kìm đối lưu, trần thermal.

Hai lời gọi chạy **cùng lúc** rồi ghép theo mốc giờ. GFS hỏng thì mất mấy cột
chỉ số, bảng gió vẫn nguyên. Cả hai hỏng (mất mạng) thì thẻ đưa **số cũ trong
vòng 6 tiếng** kèm dòng "số cũ, chưa lấy lại được" — dự báo ba tiếng trước vẫn
cho biết chiều nay gió thế nào, còn hộp báo lỗi thì không cho biết gì.

## 6. Chọn mô hình và SO SÁNH 2–3 mô hình (đã làm)

Trên thẻ có dải nút **Mô hình: ECMWF · GFS · ICON · UKMO · GEM** — bấm là cả
bảng (dải ngày, bảng giờ, nhận định) tính lại theo mô hình đó. Chỉ liệt kê mô
hình đã dò thật là trả đủ số cho Tây Bắc; ECMWF AIFS (bản AI) không trả dữ liệu
giờ, JMA thiếu giật và CAPE nên không bày.

Nút **⇄ So sánh** mở bảng đặt 2–3 mô hình cạnh nhau:

- **10 ngày × mô hình**: mỗi ô là gió tối đa ngày, tô màu theo kết luận — nhìn
  ngang là thấy ngày nào các mô hình cãi nhau. Bấm vào ngày để đổi ngày so.
- **Bảng giờ của ngày đang chọn — SO NGANG BẢY YẾU TỐ**: ☀️ Trời · 🌬 Gió ·
  💨 Giật · 🧭 Hướng (mũi tên) · 🌧 Mưa · 🌫 Trần mây · ⚡ Dông. Mỗi yếu tố một
  khối, trong khối là các mô hình xếp chồng — đọc dọc một cột là thấy ngay mô
  hình nào nói khác ở giờ đó. Xếp ngược lại (mỗi mô hình một khối) thì phải nhớ
  số của khối trên khi đọc khối dưới, mà mắt không nhớ nổi 13 con số.
- Hàng **Đồng thuận**: mọi mô hình cùng kết luận thì hiện màu đó; khác nhau thì
  hiện **?** — giờ ấy chưa chắc.
- Câu kết: *"3 mô hình đồng thuận cả 13 giờ — chốt lịch được"* / *"lệch nhau 2
  giờ (13h, 14h) — riêng mấy giờ đó gọi lại khách sát ngày"* / *"lệch nhau tới
  12/13 giờ — dự báo ngày này CHƯA CHẮC, đừng chốt sớm"*.

Vì sao so sánh chứ không chỉ chọn: một mô hình nói "chiều gió 3 m/s" thì người
đọc tin ngay; ba mô hình mà một cái nói 3, một cái nói 8 thì người đọc biết
buổi chiều **chưa chắc** — đó mới là thông tin quyết định gọi khách sớm hay đợi.
Đây là thứ cả Windy Premium lẫn Windy API đều không cho sẵn.

Chi tiết kỹ thuật: mô hình chọn đi qua `?model=` ở cả hai API; chỉ số ổn định
(LI, trần thermal) vẫn mượn GFS khi mô hình chính không có — trừ khi chính là
GFS. Khoá Windy (nếu cắm) chỉ thay cho mô hình mặc định.

## 6b. Luật hướng gió riêng từng điểm

Cùng một tốc độ, cùng một giờ, mà hướng khác nhau thì một bên bay đẹp còn một
bên không ai dám cất cánh — vì nó phụ thuộc sườn núi quay về đâu. Nên luật
hướng khai riêng từng điểm, không có mặc định chung.

**Khau Phạ** (đang áp dụng, theo kinh nghiệm chủ điểm bay):

| | |
|---|---|
| **Gió tốt** | Đông, Đông Bắc (23°–112°) — nhẹ, vừa, **hơi mạnh đều đẹp**; hơi mạnh thì thermal lên mạnh nhất |
| **Gió xấu** | Đông Nam, Nam, Tây Nam, Tây (113°–292°) — ngược sườn, **không bay bất kể tốc độ** |
| **Cảnh báo gió xiết** | Bắc, Đông hoặc Tây **khi gió đã mạnh** (> 6 m/s) — gió luồn khe đèo rồi tăng tốc đột ngột ngay mép bãi |
| **Trần tốc độ theo hướng** | Tây > 5 m/s · Nam > 6 m/s · **Đông > 6 m/s** — quá là đỏ |

Vì gió Đông vừa là hướng tốt vừa là hướng sinh xiết: nhẹ và vừa thì đẹp, mạnh
thì thành cảnh báo — máy xét gió xiết **trước** khi kết luận là gió chính bãi.

**Đồi Bù** (Hà Nội): tốt với gió **Đông, Bắc, Tây** (cung 247°→112°, vắt qua
bắc); xấu với **Nam, Tây Nam** (157°–246°).

**Viên Nam** (Hoà Bình): **ngược hẳn** Đồi Bù — tốt với **Đông, Nam, Tây**
(68°–292°), xấu với **Bắc, Đông Bắc, Tây Bắc**. Hai bãi cách nhau chừng 20 km mà
quay hai phía, nên cùng một ngày gió bắc thì Đồi Bù bay được còn Viên Nam thì
không. Vì thế trang "Hà Nội" trên web hiện **hai bảng thời tiết riêng**, và trang
"Thời tiết bay" liệt kê cả hai bãi.

**Sa Pa**: chưa có cung thuận/ngược, nhưng đã có **trần tốc độ theo hướng** —
cấm gió **Bắc > 6 m/s** và gió **Tây > 6 m/s** (chủ 11/09). Cung gió tốt/xấu thì
nói một câu là thêm được ngay.

### Trần tốc độ theo hướng — khác gì "gió xấu"

"Gió xấu" cấm ở **mọi** tốc độ; trần tốc độ nói **"hướng này chỉ bay được tới
ngần này"**. Ở Khau Phạ gió Đông là hướng **đẹp nhất**, nhưng quá 6 m/s thì
luồng bị đèo bóp lại — cùng 6 m/s mà hướng khác vẫn bay. Khai bằng `capToc`
trong `LuatHuong`: mỗi mục ghi **tâm hướng** (máy nhận lệch ±22,5°), mức trần và
tên hướng để viết ra lý do cho người đọc ("gió Đông 6,5 m/s — bãi cấm gió Đông
trên 6 m/s"). Hướng vừa quá trần vừa nằm trong danh sách luồn khe thì câu lý do
nói cả hai.

Lưu ý về Khau Phạ: **Tây và Nam đang nằm trong cung ngược sườn** nên bị cấm ở
mọi tốc độ; hai trần 5 và 6 m/s khai thêm cho đúng chữ của chủ và để nếu sau
này mở cung ngược sườn ra thì trần vẫn còn nguyên.

### Bãi cấm hướng thì nói rõ "cả ngày" hay "lọt khe"

Nói "hướng trội ngược sườn" thôi thì chưa đủ: người trực cần biết **ngược cả
ngày** hay chỉ vài tiếng, vì trong ngày gió xoay thì vẫn lọt khe bay được — và
đúng mấy tiếng ấy là thứ phải hẹn khách. Nên bộ nhận định đếm từng giờ trong
khung bay rồi viết ra một trong ba câu:

- ngược cả ngày → *"Ngược sườn CẢ NGÀY (gió TB, B, BĐB) — bãi này không bay được
  hướng ấy, không bay được."*
- ngược phần lớn → *"Ngược sườn phần lớn ngày; lọt khe 13–16h khi gió xoay Đ —
  chỉ bay trong khung ấy."*
- ngược vài tiếng → *"Ngược sườn 09–11h (gió B) — tránh cất cánh đúng khung ấy."*

## 7. Toạ độ điểm bay

- **Khau Phạ, Đồi Bù (Hà Nội), Sa Pa**: sửa ngay trên web, `/baocao/thoi-tiet`
  → nút **⚙ Toạ độ & ngưỡng gió**. Đây là toạ độ dùng cho **cả** trang nội bộ
  **lẫn** trang khách.
- **Sơn Trà, Bắc Sum – Quản Bạ, Phình Hồ – Trạm Tấu, Viên Nam, Đà Lạt**: chưa
  có sổ nội bộ nên toạ độ nằm trong mã nguồn, tệp `lib/weather-spots.ts`.

Lấy toạ độ: mở Google Maps, bấm giữ đúng chỗ cất cánh, chép hai số hiện ra.
Ở núi lệch mươi cây số là gió khác hẳn, nên nhớ lấy tại **bãi cất cánh**, đừng
lấy tâm huyện.

## 7b. Khung giờ bay của điểm

Mọi phép tính theo ngày — khung đẹp, số tiếng mưa, nhận định, điểm chuyên gia,
số của sổ kinh nghiệm — chỉ nhìn **trong khung giờ bay của điểm**. Mặc định
7–17; **Khau Phạ khai 9–16**: sáng sớm đèo còn mù và chưa có nắng đốt sườn, 7h
đẹp trên giấy nhưng chẳng ai lên bãi. Sửa ở ⚙ → "Khung giờ bay của điểm".

**Khung giờ thermal tốt nhất** là **đỉnh 4 giờ liên tiếp** có trần cao nhất,
không phải cả dải giờ "có thermal" — cả dải thì ra "09:00–16:00", dài bằng cả
ngày bay, chẳng chọn được gì.

Mấy chữ đã bỏ theo ý chủ ở HÀNG GIỜ: "— gió chính bãi" (người đọc không biết làm gì với nó),
"KHÔNG BAY" (quá tuyệt đối — mưa có lúc ngớt; mức đỏ giờ chỉ còn 😞), "Không
có khung giờ đẹp" (làm khách hoang mang; không có thì im).

## 8. Ngưỡng gió và việc máy học kinh nghiệm

**Gió tính bằng m/s** — đúng đơn vị máy đo gió ở bãi, khỏi phải nhẩm đổi.

Ngưỡng khởi điểm (bay đôi chở khách): đẹp ≤ 4 m/s · cấm > 7 m/s · giật cấm
> 10 m/s · mưa cấm > 0,5 mm · mù khi trần mây < 150 m.
(Quy đổi cho dễ hình dung: 4 m/s ≈ 14 km/h · 7 m/s ≈ 25 km/h · 10 m/s ≈ 36 km/h.)

### Ba cách dạy máy, làm cùng lúc

**1. Dự báo TRƯỚC (quan trọng nhất).** Bấm vào một ngày *sắp tới* trên dải 5
ngày → ô tím hiện ra: chọn **Bay tốt / Hạn chế / Nghỉ**, ghi khung giờ đẹp anh
nghĩ (vd `07:00-10:00`) và **lý do** (“gió đông nam, mây cao, chiều thường
lên”). Máy chụp lại luôn màu nó đang chấm ngày ấy.

Đây là chỗ máy học nghề nhanh nhất: chấm sau chỉ nói *hôm ấy bay hay nghỉ*, còn
dự báo trước nói **anh đọc trời thế nào khi mới có mỗi con số** — đúng việc máy
đang phải làm.

**2. Chấm THỰC TẾ sau khi qua ngày.** Ô xanh, cùng ba nút, kèm ghi chú thực tế.
Lúc này màn hình nhắc lại dự báo anh ghi hôm trước để tự đối chiếu.

**3. Máy tự đo mình.** Có đủ ba con số của cùng một ngày (máy đoán · anh đoán ·
thực tế), máy tính và hiện trong khối tím 🎓:

- *“Máy chấm trùng thực tế 78% trên 23 ngày.”*
- *“Anh dự báo trước đúng 91% trên 11 ngày.”*
- **Chiều lệch** — quan trọng hơn tỉ lệ đúng: *“Máy đang KHẮT KHE hơn thực tế —
  cân nhắc nới ngưỡng gió lên”* hoặc *“Máy đang DỄ DÃI hơn — nên siết lại”*.
  Một hệ cảnh báo lúc nào cũng khắt khe hơn người thật thì rồi bị bỏ qua hết;
  dễ dãi hơn thì nguy hiểm. Hai kiểu sai chữa ngược nhau nên phải phân biệt.

### Máy dùng kinh nghiệm ấy vào việc gì

- **Dò lại ngưỡng gió** của riêng điểm: từ **8 ngày** chấm thực tế trở lên, máy
  quét mốc 1–20 m/s (bước nửa m/s) tìm mốc chia đúng nhất giữa ngày anh bay và
  ngày anh nghỉ, rồi đề nghị. **Máy chỉ đề nghị — người bấm áp dụng.**
- **“Ngày cũ giống ngày này”**: từ **5 ngày** trở lên, mỗi ngày trên dải 5 ngày
  được đối chiếu với kho ngày cũ, hiện ba ngày có số gần giống nhất kèm kết quả
  thật và ghi chú của chính anh — *“12/08 · nghỉ bay · gió 5,5 giật 9,0 m/s —
  ‘gió xuôi sườn từ trưa’”*. Cách học này hợp với dữ liệu ít (vài chục ngày là
  dùng được, trong khi mô hình huấn luyện tử tế cần hàng nghìn) và **giải thích
  được**: máy chìa ra bằng chứng chứ không phán một con số.

Ngưỡng của ba điểm có sổ được dùng luôn cho trang khách, nên càng chấm nhiều
thì màu khách nhìn thấy càng giống cách chủ điểm thật sự quyết định.
