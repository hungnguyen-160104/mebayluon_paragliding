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

## 6. Muốn số CHẮC hơn thì làm gì (miễn phí)

Cách nâng chất lượng thật sự không nằm ở việc mua thêm một mô hình, mà ở chỗ
**đối chiếu nhiều mô hình**:

- Gọi cùng lúc **ECMWF + ICON + GFS** (Open-Meteo cấp cả ba, miễn phí).
- Ba mô hình cùng nói gió êm → tin cậy cao, tô xanh đậm.
- Ba mô hình cãi nhau (một cái 10 km/h, một cái 30 km/h) → hiện "dự báo chưa
  chắc", nhắc điều phối gọi lại khách sát ngày thay vì chốt sớm.

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

Ngưỡng khởi điểm (bay đôi chở khách): đẹp ≤ 15 km/h · cấm > 25 km/h · giật cấm
> 35 km/h · mưa cấm > 0,5 mm.

Mỗi ngày đã qua, vào `/baocao/thoi-tiet` chấm **Bay tốt / Hạn chế / Nghỉ**. Máy
chụp lại số của đúng ngày đó; từ **8 ngày** trở lên nó dò mốc gió chia đúng
nhất giữa ngày bay và ngày nghỉ rồi đề nghị. **Máy chỉ đề nghị — người bấm áp
dụng.**

Ngưỡng của ba điểm có sổ được dùng luôn cho trang khách, nên càng chấm nhiều
thì màu khách nhìn thấy càng giống cách chủ điểm thật sự quyết định.
