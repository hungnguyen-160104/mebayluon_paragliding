import type { Metadata } from "next";

/**
 * SỔ TAY VẬN HÀNH — hướng dẫn dùng app cho phi công, điều phối/quầy vé, kế toán.
 *
 * Trang tĩnh: không đọc dữ liệu, không cần đăng nhập, chặn máy tìm kiếm. Nhân
 * viên mở bằng điện thoại ngoài bãi mà không phải nhớ mật khẩu.
 *
 * Nội dung và kiểu dáng để nguyên HTML/CSS thuần (không Tailwind) vì đây là bản
 * SAO CỦA SỔ TAY gửi ngoài — sửa thì sửa cả hai nơi cho khớp.
 */
export const metadata: Metadata = {
  title: "Sổ tay vận hành — Mebayluon",
  description: "Hướng dẫn dùng app quản lý điểm bay cho phi công, điều phối/quầy vé và kế toán.",
  robots: { index: false, follow: false },
};

const FONTS =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Be+Vietnam+Pro:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap";

const CSS = `/* ===== Bảng màu: mượn thẳng hệ màu trạng thái của app để đọc xong là nhận ra
     trên màn hình — xanh lúa = xong/tiền vào, đỏ = còn thu/cảnh báo, xanh dương
     = thao tác. Nền lệch nhẹ về xanh lúa (ruộng bậc thang Khau Phạ). ===== */
  :root {
    --ground: #F6F8F4;
    --surface: #FFFFFF;
    --surface-2: #EEF2EA;
    --ink: #16211B;
    --ink-soft: #4B5A52;
    --ink-faint: #7C8A82;
    --line: #DCE4D8;
    --accent: #0F6E4C;
    --accent-soft: #E3F1E9;
    --danger: #A82330;
    --danger-soft: #FBE9EA;
    --warn: #8A6100;
    --warn-soft: #FCF1DC;
    --info: #0B62A8;
    --info-soft: #E4F0FA;
    --shadow: 0 1px 2px rgba(22, 33, 27, .06), 0 8px 24px -12px rgba(22, 33, 27, .18);
  }
  /* Chế độ hệ thống (không có dấu data-theme) — chỉ đổi token, không đổi component */
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
    --ground: #10150F;
    --surface: #171E19;
    --surface-2: #1E2721;
    --ink: #E8EFE9;
    --ink-soft: #A9B8AE;
    --ink-faint: #7E8E84;
    --line: #2C3830;
    --accent: #56C08D;
    --accent-soft: #172C22;
    --danger: #F08A92;
    --danger-soft: #2D191C;
    --warn: #E0B25E;
    --warn-soft: #2B2314;
    --info: #6FB6EC;
    --info-soft: #14212C;
    --shadow: 0 1px 2px rgba(0, 0, 0, .4), 0 8px 24px -12px rgba(0, 0, 0, .6);
    }
  }

  :root[data-theme="dark"] {
    --ground: #10150F;
    --surface: #171E19;
    --surface-2: #1E2721;
    --ink: #E8EFE9;
    --ink-soft: #A9B8AE;
    --ink-faint: #7E8E84;
    --line: #2C3830;
    --accent: #56C08D;
    --accent-soft: #172C22;
    --danger: #F08A92;
    --danger-soft: #2D191C;
    --warn: #E0B25E;
    --warn-soft: #2B2314;
    --info: #6FB6EC;
    --info-soft: #14212C;
    --shadow: 0 1px 2px rgba(0, 0, 0, .4), 0 8px 24px -12px rgba(0, 0, 0, .6);
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: var(--ground);
    color: var(--ink);
    font-family: "Be Vietnam Pro", system-ui, -apple-system, "Segoe UI", sans-serif;
    font-size: 16px;
    line-height: 1.65;
    -webkit-font-smoothing: antialiased;
  }

  .wrap { max-width: 50rem; margin: 0 auto; padding: 0 1.25rem 5rem; }

  /* ---------- Đầu trang ---------- */
  header.top {
    padding: 3.5rem 0 2rem;
    border-bottom: 2px solid var(--ink);
  }
  .eyebrow {
    font-family: "IBM Plex Mono", ui-monospace, monospace;
    font-size: .72rem;
    font-weight: 600;
    letter-spacing: .16em;
    text-transform: uppercase;
    color: var(--accent);
    margin: 0 0 .75rem;
  }
  h1 {
    font-family: "Bricolage Grotesque", system-ui, sans-serif;
    font-weight: 800;
    font-size: clamp(2.1rem, 6vw, 3.1rem);
    line-height: 1.05;
    letter-spacing: -.02em;
    text-wrap: balance;
    margin: 0 0 .6rem;
  }
  .lede { font-size: 1.05rem; color: var(--ink-soft); margin: 0; max-width: 44ch; }
  .stamp {
    margin-top: 1.5rem;
    font-family: "IBM Plex Mono", monospace;
    font-size: .78rem;
    color: var(--ink-faint);
  }

  /* ---------- Mục lục ---------- */
  nav.toc { display: grid; gap: .5rem; margin: 2rem 0 0; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); }
  nav.toc a {
    display: block;
    padding: .8rem 1rem;
    background: var(--surface);
    border: 1px solid var(--line);
    border-left: 4px solid var(--accent);
    border-radius: .4rem;
    text-decoration: none;
    color: var(--ink);
    box-shadow: var(--shadow);
    transition: transform .12s ease, border-color .12s ease;
  }
  nav.toc a:hover, nav.toc a:focus-visible { transform: translateY(-2px); border-left-color: var(--info); }
  nav.toc strong { display: block; font-weight: 700; font-size: .98rem; }
  nav.toc span { font-size: .82rem; color: var(--ink-faint); }

  /* ---------- Khối vai trò ---------- */
  section.role { padding-top: 3.5rem; }
  .role-head { display: flex; align-items: baseline; gap: .75rem; flex-wrap: wrap; border-bottom: 1px solid var(--line); padding-bottom: .6rem; margin-bottom: 1.75rem; }
  h2 {
    font-family: "Bricolage Grotesque", system-ui, sans-serif;
    font-weight: 700;
    font-size: clamp(1.5rem, 4vw, 2rem);
    letter-spacing: -.015em;
    margin: 0;
    text-wrap: balance;
  }
  .role-path {
    font-family: "IBM Plex Mono", monospace;
    font-size: .8rem;
    color: var(--accent);
    background: var(--accent-soft);
    padding: .15rem .5rem;
    border-radius: .3rem;
  }

  h3 {
    font-family: "Bricolage Grotesque", system-ui, sans-serif;
    font-weight: 700;
    font-size: 1.12rem;
    margin: 2rem 0 .5rem;
    letter-spacing: -.01em;
  }

  /* ---------- Các bước: đánh số vì đây là TRÌNH TỰ THẬT của một ngày ---------- */
  ol.steps { list-style: none; counter-reset: step; margin: 0; padding: 0; display: grid; gap: 1rem; }
  ol.steps > li {
    counter-increment: step;
    position: relative;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: .55rem;
    padding: 1.05rem 1.15rem 1.05rem 3.4rem;
    box-shadow: var(--shadow);
  }
  ol.steps > li::before {
    content: counter(step);
    position: absolute;
    left: 1rem;
    top: 1.05rem;
    width: 1.6rem;
    height: 1.6rem;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--accent);
    color: var(--surface);
    font-family: "IBM Plex Mono", monospace;
    font-size: .82rem;
    font-weight: 600;
  }
  :root[data-theme="dark"] ol.steps > li::before { color: #0D1410; }
  ol.steps h4 {
    font-family: "Bricolage Grotesque", system-ui, sans-serif;
    font-size: 1.02rem;
    font-weight: 700;
    margin: 0 0 .35rem;
  }
  ol.steps p { margin: .35rem 0; color: var(--ink-soft); }
  ol.steps ul { margin: .5rem 0 0; padding-left: 1.1rem; color: var(--ink-soft); }
  ol.steps ul li { margin: .25rem 0; }

  p { margin: .6rem 0; }
  strong { font-weight: 600; color: var(--ink); }

  /* ---------- Khối lưu ý ---------- */
  .note {
    border-radius: .5rem;
    padding: .9rem 1.05rem;
    margin: 1.1rem 0;
    border: 1px solid;
    font-size: .95rem;
  }
  .note p { margin: .3rem 0; }
  .note .lbl {
    display: block;
    font-family: "IBM Plex Mono", monospace;
    font-size: .7rem;
    font-weight: 600;
    letter-spacing: .12em;
    text-transform: uppercase;
    margin-bottom: .25rem;
  }
  .note.warn { background: var(--warn-soft); border-color: var(--warn); }
  .note.warn .lbl { color: var(--warn); }
  .note.stop { background: var(--danger-soft); border-color: var(--danger); }
  .note.stop .lbl { color: var(--danger); }
  .note.tip { background: var(--info-soft); border-color: var(--info); }
  .note.tip .lbl { color: var(--info); }

  /* ---------- Bảng ký hiệu ---------- */
  .table-scroll { overflow-x: auto; margin: 1rem 0; border: 1px solid var(--line); border-radius: .5rem; background: var(--surface); }
  table { border-collapse: collapse; width: 100%; font-size: .92rem; min-width: 32rem; }
  th, td { text-align: left; padding: .65rem .85rem; border-bottom: 1px solid var(--line); vertical-align: top; }
  th { font-size: .74rem; text-transform: uppercase; letter-spacing: .1em; color: var(--ink-faint); font-weight: 600; background: var(--surface-2); }
  tbody tr:last-child td { border-bottom: 0; }
  td.num { font-variant-numeric: tabular-nums; }

  /* ---------- Chip: vẽ giống hệt trên app để nhận mặt ---------- */
  .chip {
    display: inline-block;
    font-size: .78rem;
    font-weight: 600;
    padding: .1rem .45rem;
    border-radius: .28rem;
    white-space: nowrap;
    font-family: "Be Vietnam Pro", sans-serif;
  }
  .chip.green { background: #128A5A; color: #fff; }
  .chip.blue { background: #0B62A8; color: #fff; }
  .chip.red { background: #A82330; color: #fff; }
  .chip.amber { background: #B4780B; color: #fff; }
  .chip.slate { background: #33413A; color: #fff; }
  .chip.ghost { background: var(--surface-2); color: var(--ink-soft); border: 1px solid var(--line); }
  code {
    font-family: "IBM Plex Mono", ui-monospace, monospace;
    font-size: .87em;
    background: var(--surface-2);
    padding: .08rem .32rem;
    border-radius: .25rem;
  }

  footer.end {
    margin-top: 4rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--line);
    color: var(--ink-faint);
    font-size: .88rem;
  }

  a { color: var(--accent); }
  a:focus-visible, button:focus-visible { outline: 2px solid var(--info); outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }`;

const BODY = `<div class="wrap">

  <header class="top">
    <p class="eyebrow">Mebayluon Paragliding · Khau Phạ · Sa Pa · Hà Nội</p>
    <h1>Sổ tay vận hành</h1>
    <p class="lede">Cách dùng app quản lý điểm bay cho phi công, điều phối/quầy vé và kế toán — theo đúng trình tự một ngày làm việc.</p>
    <p class="stamp">Bản 21/08/2026 · app tại mebayluon.com/baocao</p>
  </header>

  <nav class="toc">
    <a href="#chung"><strong>Dùng chung</strong><span>Đăng nhập · ngày · điểm bay</span></a>
    <a href="#phicong"><strong>Phi công</strong><span>Báo cáo ngày bay · tiền thu hộ</span></a>
    <a href="#dieuphoi"><strong>Điều phối / Quầy vé</strong><span>Sổ booking · thu tiền · báo cáo</span></a>
    <a href="#ketoan"><strong>Kế toán</strong><span>Soát tiền · chốt ngày · tổng hợp</span></a>
    <a href="#kyhieu"><strong>Bảng ký hiệu</strong><span>Nhãn màu trên dòng booking</span></a>
    <a href="#succo"><strong>Xử lý sự cố</strong><span>Nhập nhầm · lệch tiền</span></a>
  </nav>

  <!-- ============ DÙNG CHUNG ============ -->
  <section class="role" id="chung">
    <div class="role-head">
      <h2>Dùng chung cho mọi vai trò</h2>
      <span class="role-path">/baocao</span>
    </div>

    <p>Mỗi người một tài khoản riêng. Mọi thao tác đều lưu tên người làm, nên đừng dùng chung tài khoản — lệch số là không truy được ai.</p>

    <ol class="steps">
      <li>
        <h4>Đăng nhập</h4>
        <p>Vào <strong>mebayluon.com/baocao</strong>, nhập tên đăng nhập và mật khẩu. App tự đưa bạn tới trang của vai trò mình. Đổi mật khẩu ở góc trên bên phải.</p>
      </li>
      <li>
        <h4>Chọn ngày</h4>
        <p>Thanh ngày nằm ngay đầu trang. Mặc định là hôm nay; bấm mũi tên để lùi/tiến, hoặc chọn ngày trên lịch. <strong>Nhập số của ngày nào thì phải đứng ở đúng ngày đó.</strong></p>
      </li>
      <li>
        <h4>Chọn điểm bay</h4>
        <p>Ai làm nhiều điểm sẽ thấy dải chọn <strong>Khau Phạ · Sa Pa · Hà Nội</strong>. Số liệu của mỗi điểm là một sổ riêng, không lẫn nhau.</p>
      </li>
    </ol>

    <div class="note tip">
      <span class="lbl">Nên nhớ</span>
      <p>Chưa bấm <strong>Chốt</strong> thì báo cáo vẫn sửa được thoải mái. Chốt xong vẫn mở lại được cho tới khi kế toán chốt ngày — sau đó cả ngày bị khoá.</p>
    </div>
  </section>

  <!-- ============ PHI CÔNG ============ -->
  <section class="role" id="phicong">
    <div class="role-head">
      <h2>Phi công</h2>
      <span class="role-path">/baocao/phi-cong</span>
    </div>

    <p>Bay xong nhập số của mình rồi bấm Chốt để kế toán soát. Cả trang xoay quanh một câu hỏi: <strong>hôm nay bạn bay mấy chuyến, làm mấy dịch vụ, cầm bao nhiêu tiền.</strong></p>

    <ol class="steps">
      <li>
        <h4>Nhìn bảng “Số của bạn hôm nay”</h4>
        <p>Dính trên đầu form, chạy theo từng ô bạn gõ: <code>1×PG</code> <code>2×PPG</code> <code>4×vé</code> <code>3×360</code> <code>0×flycam</code> <code>1×cờ đỏ</code>. Cuộn xuống nhập tiếp vẫn thấy — khỏi đếm lại.</p>
      </li>
      <li>
        <h4>Nhập số chuyến và mã vé</h4>
        <ul>
          <li><strong>Số chuyến PG</strong> và dán <strong>mã vé đã bay</strong> — app tự đếm số mã, không phải tự cộng.</li>
          <li><strong>Khau Phạ</strong> có thêm ô PPG, tách rõ <strong>có vé</strong> và <strong>không vé</strong>. Chuyến không vé vẫn là chuyến bay và vẫn được tính.</li>
          <li>Khai bao nhiêu chuyến thì mã vé phải khớp bấy nhiêu, app sẽ nhắc nếu lệch.</li>
        </ul>
      </li>
      <li>
        <h4>Khai dịch vụ đã làm</h4>
        <p>Camera 360, flycam, dù cờ đỏ, bay hoàng hôn, kéo cờ — mỗi loại một ô số kèm ô mã vé của khách dùng dịch vụ đó. Khách ngoại giao khai riêng.</p>
      </li>
      <li>
        <h4>Khách được giao cho mình</h4>
        <p>Khối “Booking điều phối chuyển cho bạn” hiện tên khách, số điện thoại và số tiền còn phải thu. Đón khách xong thu tiền ngay tại đây.</p>
      </li>
      <li>
        <h4>Thu tiền của khách</h4>
        <p>Bấm <span class="chip red">💵 Thu tiền</span>. Bảng mở ra ghi rõ <strong>đang thu cho ai</strong> và <strong>còn thu bao nhiêu</strong>, số tiền điền sẵn.</p>
        <ul>
          <li>Bấm <strong>TM</strong> hoặc <strong>CK</strong> là tiền nhảy hẳn sang ô đó — không phải gõ lại; sửa tay được nếu khách trả khác.</li>
          <li>CK phải ghi <strong>mã giao dịch</strong> (4 số cuối là đủ) để kế toán soát sao kê.</li>
          <li>Khách trả cả hai đường thì bấm <strong>⇄ Khách trả cả TM lẫn CK</strong>.</li>
        </ul>
      </li>
      <li>
        <h4>Sổ thu chi tại bãi</h4>
        <p>Nước cho khách, xe chở khách, chi khác — ghi từng dòng. Đây là tiền bạn ứng ra, kế toán sẽ hoàn lại khi chốt.</p>
      </li>
      <li>
        <h4>Chốt báo cáo</h4>
        <p>Bấm <strong>Chốt</strong> khi số đã đúng. Chốt muộn quá giờ quy định thì app tự ghi phạt nộp muộn.</p>
      </li>
      <li>
        <h4>Nộp tiền và xem tổng của mình</h4>
        <p>Khối <strong>Tổng theo chu kỳ</strong> cho biết kỳ này bạn bay bao nhiêu chuyến, làm bao nhiêu dịch vụ, <strong>thu hộ công ty bao nhiêu, đã nộp bao nhiêu, đang giữ bao nhiêu</strong>. Nộp tiền cho quản lý thì lập lệnh giao tiền ngay dưới — hai bên cùng xác nhận.</p>
      </li>
    </ol>

    <div class="note warn">
      <span class="lbl">Chỉ thu của khách mình</span>
      <p>Phi công và camera man chỉ thu được tiền của <strong>khách đã giao cho mình</strong>, hoặc khách của người cùng tổ bay trong ngày. Không có lịch bay hôm đó thì không đụng được vào tiền của ngày.</p>
    </div>
  </section>

  <!-- ============ ĐIỀU PHỐI ============ -->
  <section class="role" id="dieuphoi">
    <div class="role-head">
      <h2>Điều phối / Quầy vé</h2>
      <span class="role-path">/baocao/dieu-phoi</span>
    </div>

    <p>Đây là nơi <strong>sổ booking</strong> sống: khách vào sổ, tiền vào sổ, vé ra khỏi sổ. Mọi con số của ngày về sau đều bắt nguồn từ đây.</p>

    <ol class="steps">
      <li>
        <h4>Nhận khách vào sổ</h4>
        <p>Thẻ nhập booking: tên, số điện thoại, số khách, loại bay (PG/PPG), dịch vụ kèm theo, điểm đón, giá và tiền cọc.</p>
        <ul>
          <li><strong>Đã cọc vào TK công ty</strong> — có nút QR gửi khách quét, nội dung chuyển khoản tự sinh.</li>
          <li><strong>Đại lý đã thu</strong> — khách trả một phần bên đại lý; điền số tiền và <strong>tên đại lý</strong>. Phần này trừ vào tiền khách phải trả, và ghi vào công nợ đại lý để kế toán đòi. Đại lý sẽ hoàn công ty khoản này, trừ phần <strong>chiết khấu đại lý</strong> nếu hai bên cấn trừ.</li>
          <li>Booking khách tự đặt trên web và thư OTA (Klook, Agoda…) tự chảy về khay chờ duyệt.</li>
        </ul>
      </li>
      <li>
        <h4>Thu tiền</h4>
        <p>Nút <span class="chip red">💵 Thu tiền</span> trên từng dòng. Bảng ghi rõ đang thu cho ai; bấm <strong>TM</strong>/<strong>CK</strong> là số tiền nhảy sang, CK nhớ ghi mã giao dịch. Một booking thu được nhiều lần, mỗi lần một khoản riêng.</p>
      </li>
      <li>
        <h4>Xuất vé, giao khách, tích đã bay</h4>
        <ul>
          <li><span class="chip blue">đã xuất vé</span> khi đưa vé cho khách; khách bay không vé thì bấm <strong>🎫✕ Bay không vé</strong> kèm lý do.</li>
          <li><strong>Giao cho</strong> phi công hoặc camera man — khách sẽ hiện trên trang của người đó.</li>
          <li><span class="chip green">đã bay</span> khi khách bay xong. Số khách đã bay của ngày đếm từ đây.</li>
        </ul>
      </li>
      <li>
        <h4>Khách mua thêm hoặc bỏ dịch vụ tại bãi</h4>
        <p>Thẻ <strong>➕➖ Dịch vụ tuỳ chọn</strong>: chọn khách, chọn dịch vụ, thu tiền luôn. Máy tự tính lại tiền và ưu đãi combo. Bỏ bớt dịch vụ thì chọn trừ vào tiền còn thu hay hoàn lại khách.</p>
      </li>
      <li>
        <h4>Khách huỷ hoặc dời lịch</h4>
        <ul>
          <li><strong>Huỷ cả đoàn</strong> — ghi vé thu hồi, tiền hoàn và cách hoàn.</li>
          <li><strong>Huỷ một phần</strong> (đăng ký 2 bay 1): booking vẫn là <em>một dòng</em>, hiện <span class="chip red">huỷ 1 khách</span> màu đỏ, tiền tự trừ.</li>
          <li><strong>Dời lịch</strong> — cả đoàn đổi ngày, hoặc tách vài người sang ngày khác.</li>
        </ul>
      </li>
      <li>
        <h4>Nhập báo cáo ngày</h4>
        <p>Vé xuất ra, vé thu về, dải mã vé, dịch vụ, khách huỷ/dời, khách ngoại giao, và sổ thu chi. Có nút lấy sẵn số dịch vụ đếm từ dải mã vé để khỏi đếm tay.</p>
      </li>
      <li>
        <h4>Chốt báo cáo</h4>
        <p>Bấm <strong>Chốt</strong>. Kế toán sẽ đối chiếu số của bạn với số phi công và sổ booking khi chốt ngày.</p>
      </li>
    </ol>

    <div class="note stop">
      <span class="lbl">Thu nhầm booking</span>
      <p>Nếu thu tiền vào nhầm khách, <strong>đừng sửa ô “đã cọc”</strong> — làm vậy sổ tiền sẽ vỡ và app sẽ chặn. Hãy mở <strong>✎ Sửa → Sửa khoản đã thu</strong> trên đúng dòng booking để sửa hoặc xoá khoản đó.</p>
    </div>
  </section>

  <!-- ============ KẾ TOÁN ============ -->
  <section class="role" id="ketoan">
    <div class="role-head">
      <h2>Kế toán</h2>
      <span class="role-path">/baocao/ke-toan · /chot-ngay · /tong-hop</span>
    </div>

    <p>Việc của kế toán là <strong>đối chiếu</strong> — tiền trên sao kê so với tiền trong app, số nhân viên báo so với sổ booking — rồi chốt ngày để khoá số.</p>

    <h3>Hằng ngày</h3>
    <ol class="steps">
      <li>
        <h4>Xem tiền trong ngày</h4>
        <p>Thẻ <strong>🧮 Tiền trong ngày</strong> mở đầu bằng hai con số:</p>
        <ul>
          <li><strong>📥 Hôm nay thu</strong> — tiền về trong ngày, gồm cả cọc của các ngày bay khác.</li>
          <li><strong>📊 Doanh số của ngày</strong> — tiền của các booking bay hôm nay, bất kể thu hôm nào.</li>
        </ul>
        <p>Bên dưới: ai đang giữ tiền mặt, công ty chi gì, và <strong>🤝 đại lý đang thu hộ bao nhiêu</strong>.</p>
      </li>
      <li>
        <h4>Soát chuyển khoản</h4>
        <p>Dán nguyên tràng SMS banking hoặc sao kê vào thẻ <strong>🏦 Soát chuyển khoản</strong> rồi bấm Soát. App bày ra <strong>sổ booking &amp; tiền trong ngày</strong> — mỗi khách một thẻ:</p>
        <ul>
          <li>Tóm tắt dịch vụ, đã CK/TM bao nhiêu kèm <strong>mã GD in đỏ</strong>, còn thu, và ghi chú điều phối.</li>
          <li>Dòng SMS khớp nằm ngay dưới, <strong>tô vàng đúng chỗ trùng</strong> (mã GD, tên, số điện thoại, số tiền) — nhìn là biết vì sao khớp.</li>
          <li>Khách trả đủ tiền mặt thì ghi rõ <em>“đã thu đủ bằng tiền mặt — không cần soát sao kê”</em>.</li>
          <li>SMS không khớp ai: bấm <strong>→ Chỉ định khoản</strong>, chọn ngày rồi chọn đúng khoản thanh toán.</li>
        </ul>
        <p>Soát xong bấm <span class="chip green">✓ Đã nhận đủ</span>; booking xong hẳn thì <span class="chip slate">🔒 Khoá booking</span>.</p>
      </li>
      <li>
        <h4>Hoàn tiền và huỷ flycam</h4>
        <p>Thẻ <strong>💸 Hoàn tiền khách</strong> và <strong>🎥 Huỷ flycam</strong>: hoàn tiền mặt là xong ngay tại bãi, hoàn chuyển khoản nằm chờ kế toán chuyển rồi tích xác nhận.</p>
      </li>
    </ol>

    <h3>Chốt ngày</h3>
    <ol class="steps">
      <li>
        <h4>Lấy số dịch vụ theo sổ booking</h4>
        <p>Thẻ xanh <strong>📒 Sổ booking</strong> đứng đầu — đây là số <em>khớp với tiền</em> vì đã gồm mọi lệnh thêm/bớt dịch vụ tại bãi. Bấm <strong>⧉ Lấy số dịch vụ theo sổ booking</strong>. Số quầy và số phi công hiện bên cạnh để đối chiếu.</p>
      </li>
      <li>
        <h4>Xử lý cảnh báo trước khi chốt</h4>
        <ul>
          <li><span class="chip red">⚠ Booking thu thừa</span> — khách trả nhiều hơn tổng phải trả, thường do ai đó sửa hoặc bỏ lệnh dịch vụ sau khi đã thu tiền. Phải bù hoặc hoàn trước khi chốt.</li>
          <li><span class="chip amber">🤝 Đại lý đang cầm hộ</span> — nhớ yêu cầu đại lý chuyển tiền về.</li>
          <li><strong>Duyệt lệch số liệu</strong> — nhân viên báo lệch nhau; đúng thực tế thì tích duyệt, sai thì đẩy về người khai sửa.</li>
        </ul>
      </li>
      <li>
        <h4>Chốt để khoá số</h4>
        <p>Chốt xong cả ngày bị khoá: không ai sửa booking, thu tiền hay đổi dịch vụ của ngày đó nữa.</p>
      </li>
    </ol>

    <h3>Theo kỳ và theo tháng</h3>
    <ol class="steps">
      <li>
        <h4>Tổng hợp</h4>
        <p><strong>Tổng đã chốt</strong> chỉ cộng những ngày kế toán đã chốt. Bên dưới là khối vàng <strong>Tạm tính cả kỳ</strong> — gồm cả ngày chưa chốt, lấy theo báo cáo nhân viên và lệnh thu, để biết thực tế kỳ này thu bao nhiêu.</p>
      </li>
      <li>
        <h4>Báo cáo tháng và phạt nộp muộn</h4>
        <p>Bảng lương từng phi công (chuyến PG + PPG, dịch vụ, chi tiêu, tiền ứng, phạt) và trang phạt nộp muộn.</p>
      </li>
      <li>
        <h4>Homestay</h4>
        <p>Sổ phòng theo ngày, booking từ web và thư OTA, khay soát thư chưa đọc được. Xem trang <strong>/baocao/homestay</strong>.</p>
      </li>
    </ol>
  </section>

  <!-- ============ KÝ HIỆU ============ -->
  <section class="role" id="kyhieu">
    <div class="role-head">
      <h2>Bảng ký hiệu trên dòng booking</h2>
    </div>
    <p>Màu trên dòng booking đều có nghĩa cố định — nhớ bảng này là đọc sổ nhanh hơn nhiều.</p>

    <div class="table-scroll">
      <table>
        <thead>
          <tr><th>Nhãn</th><th>Nghĩa</th><th>Ai xử lý</th></tr>
        </thead>
        <tbody>
          <tr><td><span class="chip green">đã bay</span></td><td>Khách đã bay xong, tính vào số khách của ngày</td><td>Điều phối tích</td></tr>
          <tr><td><span class="chip blue">đã xuất vé</span></td><td>Đã đưa vé cho khách</td><td>Quầy vé</td></tr>
          <tr><td><span class="chip amber">không vé</span></td><td>Bay không dùng vé, vẫn tính là chuyến bay</td><td>Điều phối</td></tr>
          <tr><td><span class="chip green">đã tt … by …</span></td><td>Đã thanh toán bao nhiêu, ai thu</td><td>—</td></tr>
          <tr><td><span class="chip green">✓CK</span> <span class="chip green">✓TM</span></td><td>Kế toán đã soát và nhận đủ khoản đó</td><td>Kế toán</td></tr>
          <tr><td><span class="chip red">còn thu …</span></td><td>Số tiền phải thu trước khi khách bay</td><td>Ai trực thì thu</td></tr>
          <tr><td><span class="chip amber">ĐL thu …</span></td><td>Đại lý thu hộ tiền bay — đại lý đang nợ công ty</td><td>Kế toán đòi</td></tr>
          <tr><td><span class="chip red">huỷ 1 khách</span></td><td>Huỷ một phần, booking vẫn bay phần còn lại</td><td>Điều phối</td></tr>
          <tr><td><span class="chip red">⚠ THU THỪA</span></td><td>Khách trả nhiều hơn tổng — phải bù hoặc hoàn</td><td>Kế toán</td></tr>
          <tr><td><span class="chip red">⚠ LỆCH SỔ</span></td><td>Lệnh thu nhiều hơn số booking ghi — có khoản thu nhầm</td><td>Kế toán</td></tr>
          <tr><td><span class="chip slate">🔒 đã khoá</span></td><td>Kế toán đã soát xong, không ai sửa được nữa</td><td>Kế toán mở</td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- ============ SỰ CỐ ============ -->
  <section class="role" id="succo">
    <div class="role-head">
      <h2>Xử lý sự cố thường gặp</h2>
    </div>

    <h3>Thu tiền vào nhầm booking</h3>
    <p>Mở dòng booking bị nhầm → <strong>✎ Sửa → Sửa khoản đã thu</strong> → xoá đúng khoản đó, rồi thu lại vào booking đúng. Đừng sửa ô “đã cọc”: app sẽ chặn vì làm vậy sổ tiền và sổ lệnh thu chỏi nhau.</p>

    <h3>Nhập nhầm lệnh thêm/bớt dịch vụ</h3>
    <p>Trong thẻ dịch vụ, mỗi lệnh có nút <strong>✎ Sửa</strong> và <strong>✕ Bỏ</strong>. Bỏ lệnh sẽ trả lại dịch vụ và tiền của booking, <strong>nhưng tiền đã thu vẫn nằm nguyên trong sổ</strong> và booking được ghi vết. Nếu vì thế mà khách thành thu thừa, app kêu ngay để kế toán bù hoặc hoàn.</p>

    <h3>Khách hỏi số thứ tự bay</h3>
    <p>Khách đặt trên web nhận số thứ tự in trên vé (áp dụng ở Khau Phạ dịp 30/4–1/5 và 1/8–31/10). Số nhỏ bay trước; dời lịch thì nhận số mới của ngày mới.</p>

    <h3>Quên chốt báo cáo</h3>
    <p>Chốt muộn quá giờ quy định thì app tự ghi phạt nộp muộn, kế toán xem ở trang phạt. Ngày kế toán đã chốt thì không mở lại được — phải báo kế toán.</p>

    <h3>Số liệu trông sai</h3>
    <p>Nhớ ba nguồn khác nhau: <strong>sổ booking</strong> (khớp tiền, gồm mọi thay đổi tại bãi), <strong>báo cáo nhân viên</strong> (khai một lần, để đối chiếu), <strong>bản chốt của kế toán</strong> (số cuối cùng). Lệch nhau là bình thường trong ngày — kế toán chốt theo sổ booking.</p>
  </section>

  <footer class="end">
    <p>Sổ tay này mô tả app ở thời điểm 21/08/2026. Tính năng thay đổi thì bản này cũng cần cập nhật theo.</p>
  </footer>
</div>`;

export default function HuongDanPage() {
  return (
    <>
      <link rel="stylesheet" href={FONTS} />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div dangerouslySetInnerHTML={{ __html: BODY }} />
    </>
  );
}
