# Thời tiết bay — cấu hình và nguồn dữ liệu

## 1. Đang chạy bằng gì (không cần khai gì thêm)

Hệ thống **đang chạy được ngay, không cần khoá, không tốn tiền**:

- Nguồn số: **Open-Meteo** chạy mô hình **ECMWF IFS** — đúng mô hình mà
  windy.com hiển thị mặc định.
- Bản đồ gió: **iframe của Windy** (`embed.windy.com`) — bản nhúng mở, không
  cần khoá, không cần đăng nhập.

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

| Yếu tố | Vàng (cân nhắc) | Đỏ (không bay) |
|---|---|---|
| Gió trung bình | > ngưỡng đẹp | > ngưỡng cấm |
| Gió giật | > 80% ngưỡng giật | > ngưỡng giật |
| **Gió rối** (giật trừ trung bình) | chênh > 4 m/s | chênh > 7 m/s và giật đã qua 70% ngưỡng |
| **Mù / mây thấp** | chân mây < 2,5× ngưỡng, mây thấp ≥ 50% | chân mây < ngưỡng và mây thấp ≥ 50%; hoặc ẩm ≥ 98% với chân mây < 100 m |
| Mưa | lác đác > 0,1 mm, hoặc khả năng mưa ≥ 70% | > ngưỡng mưa |
| **Dông** | 20–39% | ≥ 40% |
| **Thermal gắt** | trần > 2.200 m | (không cấm — chỉ xóc) |
| Hướng gió | — | ngoài cung hướng cất cánh (nếu đã khai) |

Ba khái niệm mới, giải thích ngắn:

- **Chân mây** = độ cao đáy mây tính từ bãi cất cánh, suy từ chênh lệch nhiệt
  độ và điểm sương (khoảng 125 m cho mỗi 1°C chênh). Mô hình chỉ nói *bao nhiêu
  phần trăm mây*, không nói mây ở độ cao nào — mà 80% mây ở 2.000 m là trời đẹp
  có bóng râm, còn 80% mây ở 100 m là bãi chìm trong sương. Phải có **cả hai**
  điều kiện (chân mây thấp **và** mây thấp dày) mới chấm mù: sáng sớm ở núi
  chênh nhiệt độ luôn nhỏ, bắt mình nó thì ngày nào cũng đỏ.

- **Dông** ghép từ hai số: **CAPE** (bao nhiêu "nhiên liệu" cho đối lưu) và
  **chỉ số nâng / lifted index** (khí quyển có "mồi" để bốc không). Nhiều nhiên
  liệu mà khí vẫn nén chặt thì dông không nổ; ít nhiên liệu mà cột khí bất ổn
  sâu thì vẫn có ổ dông lẻ. Ngưỡng cấm để ở 40% vì trước khi mây dông tới, luồng
  gió đổ xuống đã quét qua bãi làm gió đảo chiều và mạnh gấp mấy lần trong vài
  phút.

- **Sức bốc (thermal)** đo bằng **trần lớp xáo trộn** — xấp xỉ trần bay trong
  ngày. Với bay đôi chở khách thì **êm mới là tốt**: thermal vừa đủ kéo dài
  chuyến, thermal gắt làm dù xóc, khách say, bãi đáp nổi gió xoáy. Thang này
  ngược với thang của phi công thể thao bay đường dài, đừng đọc nhầm.

Rê chuột vào ô bất kỳ trong bảng giờ để xem đúng lý do máy chấm màu đó.

## 5c. Hai mô hình chạy song song

- **ECMWF** (qua Open-Meteo) cho gió, mưa, mây, điểm sương, CAPE.
- **GFS** cho ba số ECMWF không có: chỉ số nâng, lực kìm đối lưu, trần thermal.

Hai lời gọi chạy **cùng lúc** rồi ghép theo mốc giờ. GFS hỏng thì mất mấy cột
chỉ số, bảng gió vẫn nguyên. Cả hai hỏng (mất mạng) thì thẻ đưa **số cũ trong
vòng 6 tiếng** kèm dòng "số cũ, chưa lấy lại được" — dự báo ba tiếng trước vẫn
cho biết chiều nay gió thế nào, còn hộp báo lỗi thì không cho biết gì.

## 6. Muốn số CHẮC hơn thì làm gì (miễn phí)

Cách nâng chất lượng thật sự không nằm ở việc mua thêm một mô hình, mà ở chỗ
**đối chiếu nhiều mô hình**:

- Đã có hai mô hình (xem mục 5c) nhưng chúng chia việc, chưa **đối chiếu** nhau.
- Bước tiếp: cùng hỏi **ECMWF + ICON + GFS** một câu, rồi so.
- Ba mô hình cùng nói gió êm → tin cậy cao, tô xanh đậm.
- Ba mô hình cãi nhau (một cái 3 m/s, một cái 8 m/s) → hiện "dự báo chưa chắc",
  nhắc điều phối gọi lại khách sát ngày thay vì chốt sớm.

Đó là thông tin mà cả Windy Premium lẫn Windy API đều không cho sẵn. Chưa làm —
nói một tiếng là làm.

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
> 10 m/s · mưa cấm > 0,5 mm · mù khi chân mây < 150 m.
(Quy đổi cho dễ hình dung: 4 m/s ≈ 14 km/h · 7 m/s ≈ 25 km/h · 10 m/s ≈ 36 km/h.)

Mỗi ngày đã qua, vào `/baocao/thoi-tiet` chấm **Bay tốt / Hạn chế / Nghỉ**. Máy
chụp lại số của đúng ngày đó; từ **8 ngày** trở lên nó dò mốc gió chia đúng
nhất giữa ngày bay và ngày nghỉ rồi đề nghị. **Máy chỉ đề nghị — người bấm áp
dụng.**

Ngưỡng của ba điểm có sổ được dùng luôn cho trang khách, nên càng chấm nhiều
thì màu khách nhìn thấy càng giống cách chủ điểm thật sự quyết định.
