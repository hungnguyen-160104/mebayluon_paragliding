# Thời tiết bay — cấu hình và nguồn dữ liệu

## 1. Đang chạy bằng gì (không cần khai gì thêm)

Hệ thống **đang chạy được ngay, không cần khoá, không tốn tiền**:

- Nguồn số: **Open-Meteo** chạy mô hình **ECMWF IFS** — đúng mô hình mà
  windy.com hiển thị mặc định.
- Bản đồ gió: **iframe của Windy** (`embed.windy.com`) — bản nhúng mở, không
  cần khoá, không cần đăng nhập. Bấm chọn được mô hình ngay trên bản đồ:
  **ECMWF · GFS · ICON · ECMWF AI · Sóng**. Chỗ các mô hình KHÔNG đồng ý với
  nhau chính là chỗ dự báo còn mong manh.
- Số ngày: **7 ngày tới**.

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
| < 2 | nhẹ | xanh nhạt |
| 2 – 4 | vừa | xanh |
| 4 – 6 | hơi mạnh | vàng |
| 6 – 8 | mạnh | cam |
| > 8 | rất mạnh | đỏ |

| Gió giật | Mức | Có chặn bay không |
|---|---|---|
| < 6 | nhẹ | không |
| 6 – 14 | vừa | **không** — giật không quyết định bay |
| 14 – 18 | mạnh, nhiễu | cảnh báo (vàng) |
| > 18 | rất mạnh | không khuyến cáo bay (đỏ) |

Giật nới xa như vậy vì mô hình chia ô ~25 km: ở địa hình đèo nó gần như luôn
báo giật gấp ba bốn lần gió trung bình. Lấy con số ấy làm mốc cấm thì Khau Phạ
đỏ quanh năm, còn phi công đứng ở bãi thì thấy trời hoàn toàn bay được — sai
kiểu đó vài lần là không ai nhìn bảng nữa.

Màu ô **Gió** nói *gió mạnh cỡ nào*; hàng **Bay?** ngay dưới mới là *kết luận
cả giờ* (đã gộp mưa, mù, dông, hướng): **✔** bay tốt · **⚠** cân nhắc · **✕**
không bay. Hai thang khác nhau và đều cần: một giờ có thể gió đẹp mà vẫn đỏ
vì mưa.

Hướng gió hiện bằng **mũi tên chỉ chiều gió thổi tới** — nhìn cả hàng ngang là
thấy ngay lúc nào gió đổi chiều; tên hướng ("ĐĐB") nằm ở tooltip. Mũi tên tô
**xanh** khi thuận sườn, **đỏ** khi ngược sườn hoặc luồn khe (gió xiết), **xám**
ở điểm chưa khai luật hướng.

Màu mũi tên trả lời câu khác hẳn màu ô gió: ô gió nói *mạnh cỡ nào*, mũi tên nói
*thổi vào sườn hay thổi ngược*. Ở núi hai chuyện ấy độc lập — gió nhẹ mà ngược
sườn vẫn không bay được — nên phải nhìn thấy cả hai.

### Bảng chấm màu

| Yếu tố | Vàng (cân nhắc) | Đỏ (không bay) |
|---|---|---|
| Gió trung bình | > ngưỡng đẹp (nới tới 6 m/s khi **thuận sườn**) | > ngưỡng cấm |
| Gió giật | 14 – 18 m/s (mạnh, nhiễu) | > 18 m/s |
| **Mù / mây thấp** | trần mây < 2× ngưỡng, mây thấp ≥ 70% | trần mây < ngưỡng và mây thấp ≥ 70%; hoặc ẩm ≥ 98% kèm mây thấp dày |
| Mưa | khả năng mưa (đã hiệu chỉnh) ≥ 75% | > ngưỡng mưa |
| **Dông** | 20–39% | ≥ 40% |
| **Thermal gắt** | trần > 2.200 m | (không cấm — chỉ xóc) |
| **Hướng gió xấu** | — | trong cung gió xấu của điểm, bất kể tốc độ |
| **Gió xiết** | — | đúng hướng luồn khe **và** gió đã mạnh |

Ba khái niệm mới, giải thích ngắn:

- **Trần mây** = độ cao đáy mây tính **từ bãi cất cánh**, suy từ chênh lệch
  nhiệt độ và điểm sương (khoảng 125 m cho mỗi 1°C chênh) **cộng thêm chênh độ
  cao giữa ô lưới mô hình và bãi thật**. Chỗ cộng thêm này rất quan trọng: mô
  hình chia ô ~25 km rồi lấy độ cao trung bình, ở Khau Phạ ô ấy cao 1.620 m
  trong khi bãi ở 1.200 m — không cộng 420 m ấy thì báo "trần mây 87 m" trong
  khi đứng ở bãi nhìn lên còn hơn nửa cây số nữa mới tới mây.

  Trời quang (mây thấp < 25%) thì **không báo trần mây** — công thức chỉ nói
  "nếu khối khí này bốc lên thì tới đó nó thành mây", không nói trên đầu đang
  có mây. Và phải có **cả hai** (trần mây thấp **và** mây thấp ≥ 70%) mới chấm
  mù.

- **Khả năng mưa** hiển thị là con số **đã hiệu chỉnh theo lượng mưa**. Mô hình
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

**Mưa lác đác (0,1–0,5 mm/giờ) KHÔNG còn là cảnh báo** — chỉ ghi vào lý do. Ở
Tây Bắc mùa mưa đó là mưa phùn rải rác, bay vẫn bay, mà nó từng chiếm hai phần
ba số ô ⚠. Cảnh báo nào cũng bật thì người trực thôi đọc, rồi bỏ qua luôn cái
cảnh báo thật. Sau khi siết: trên 165 ô của 3 điểm × 5 ngày còn **12 ô ⚠**
(trước khoảng 50).

Hàng **Trời** hiện biểu tượng thay số phần trăm mây: ☀️ nắng · ⛅ nắng một phần ·
☁️ âm u · 🌦 mưa nhẹ · 🌧 mưa. Phần trăm mây vẫn xem được ở tooltip.

Rê chuột vào ô bất kỳ trong bảng giờ để xem đúng lý do máy chấm màu đó.

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
| 🪁 Gió trên cao | gió **nội suy tại 300 / 500 / 1000 m trên bãi** từ các mực 925/850/700 hPa và mặt đất (mốc nằm dưới bãi bị bỏ) | "Gió mực 500m mạnh (9 m/s) từ 11:00 — không leo quá 300m, bám sườn"; > 12 m/s: bị thổi lùi, không bay; mực 1000m > 12: có lớp cắt gió, giữ dưới 500m; mặt đất lặng mà mực 300m đã có gió: **cắt gió ngay trên bãi** |
| ☀️ Nắng | `sunshine_duration` cộng trong khung 7–17h | số giờ nắng / 11; < 3h: âm u, thermal yếu |
| 🔥 Thermal | trần lớp xáo trộn, CAPE, bức xạ | yếu · vừa · tốt · **gắt từ mấy giờ**; khung nâng tốt |
| ⚖️ Ổn định | lifted index TB, ẩm, nhiệt, gió | ≥ 4: rất ổn định — kèm ẩm ≥ 75%, nóng ≥ 30°C, lặng gió là **ngày oi bức, ít thermal, mù khô**; ≤ −2: **bất ổn, dễ dông, xóc, nhiễu** |
| 🧢 Nghịch nhiệt | nhiệt độ các mực 925/850/700, so hai mực kề | lapse > 0°C/km: **nghịch nhiệt**; > −2: lớp chặn — báo độ cao **tính từ bãi**; nắp < 600m: thermal bị chặn, mù tích dưới |
| 🌡 Áp suất | `pressure_msl` TB so với ngày trước, **và xu hướng từng giờ trong ngày** | tụt ≥ 5 hPa/24h: **front/rãnh thấp đang tới**; tăng ≥ 3: áp cao lấn, quang dần. Trong ngày: "**Áp suất sụt từ 15:00** — có thể có dông; hạ cánh xong trước 14:00" |
| 🌀 Nhiễu động | gộp thermal gắt + giật ≥ 14 + cắt gió + bất ổn định | "NHIỄU ĐỘNG MẠNH: thermal gắt 11:00–14:00 + giật ≥14 m/s — giữ tốc độ, tay lái chủ động, sẵn sàng xử lý collapse" |
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

- **7 ngày × mô hình**: mỗi ô là gió tối đa ngày, tô màu theo kết luận — nhìn
  ngang là thấy ngày nào các mô hình cãi nhau.
- **Bảng giờ của ngày đang chọn**: mỗi mô hình một hàng, ô tô màu ✔/⚠/✕ kèm gió.
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

Vì gió Đông vừa là hướng tốt vừa là hướng sinh xiết: nhẹ và vừa thì đẹp, mạnh
thì thành cảnh báo — máy xét gió xiết **trước** khi kết luận thuận sườn.

**Đồi Bù** (Hà Nội): tốt với gió **Đông, Bắc, Tây** (cung 247°→112°, vắt qua
bắc); xấu với **Nam, Tây Nam** (157°–246°).

**Viên Nam** (Hoà Bình): **ngược hẳn** Đồi Bù — tốt với **Đông, Nam, Tây**
(68°–292°), xấu với **Bắc, Đông Bắc, Tây Bắc**. Hai bãi cách nhau chừng 20 km mà
quay hai phía, nên cùng một ngày gió bắc thì Đồi Bù bay được còn Viên Nam thì
không. Vì thế trang "Hà Nội" trên web hiện **hai bảng thời tiết riêng**, và trang
"Thời tiết bay" liệt kê cả hai bãi.

Sa Pa chưa khai luật hướng: nói cho tôi cung gió tốt/xấu là thêm được ngay.

## 7. Toạ độ điểm bay

- **Khau Phạ, Đồi Bù (Hà Nội), Sa Pa**: sửa ngay trên web, `/baocao/thoi-tiet`
  → nút **⚙ Toạ độ & ngưỡng gió**. Đây là toạ độ dùng cho **cả** trang nội bộ
  **lẫn** trang khách.
- **Sơn Trà, Bắc Sum – Quản Bạ, Phình Hồ – Trạm Tấu, Viên Nam, Đà Lạt**: chưa
  có sổ nội bộ nên toạ độ nằm trong mã nguồn, tệp `lib/weather-spots.ts`.

Lấy toạ độ: mở Google Maps, bấm giữ đúng chỗ cất cánh, chép hai số hiện ra.
Ở núi lệch mươi cây số là gió khác hẳn, nên nhớ lấy tại **bãi cất cánh**, đừng
lấy tâm huyện.

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
