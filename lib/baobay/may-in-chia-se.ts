"use client";

/**
 * IN QUA APP MÁY IN BẰNG KHAY CHIA SẺ — đường in cho MỌI điện thoại, nhất là
 * iPhone (chủ 17/09: "bất kỳ máy điện thoại, android hay iphone nào có kết nối
 * với máy in này đều có thể dễ dàng in vé").
 *
 * Vì sao cần: Safari trên iPhone/iPad KHÔNG có Web Bluetooth lẫn WebUSB, nên
 * trang web không cách nào nói chuyện thẳng với Gainscha B300. Thứ iPhone làm
 * được là KHAY CHIA SẺ: trang web đưa ảnh vé (đúng khổ 576 chấm) sang một ứng
 * dụng in máy in nhiệt Bluetooth đã ghép máy in một lần (RawBT trên Android;
 * trên iPhone là app in nhiệt hỗ trợ nhận ảnh chia sẻ, ví dụ Thermer). Cài và
 * ghép máy in MỘT LẦN trong app, từ đó bấm IN VÉ → khay chia sẻ → chọn app →
 * vé ra.
 *
 * Khay chia sẻ chỉ mở được NGAY TRONG CÚ BẤM của người dùng, mà vé phải dựng
 * mất vài giây (html2canvas). Nên luồng là: bấm IN VÉ → khung xem vé hiện ra
 * (đang dựng…) → bấm "Gửi sang app in" (cú bấm mới) → khay chia sẻ.
 */

const KHOA_LUU = "baobay.mayInChiaSe";

export function mayCoTheChiaSeAnh(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (typeof nav.share !== "function" || typeof nav.canShare !== "function") return false;
  try {
    return nav.canShare({ files: [new File([new Uint8Array([0])], "ve.png", { type: "image/png" })] });
  } catch {
    return false;
  }
}

export function laIos(): boolean {
  return typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function chiaSeDaBat(): boolean {
  try {
    return localStorage.getItem(KHOA_LUU) === "1";
  } catch {
    return false;
  }
}

export function batChiaSe(bat: boolean): void {
  try {
    if (bat) localStorage.setItem(KHOA_LUU, "1");
    else localStorage.removeItem(KHOA_LUU);
  } catch {
    /* bỏ qua */
  }
}

/**
 * GHÉP các liên thành MỘT ảnh dọc, giữa các liên có vạch cắt "✂ - - -". Một
 * ảnh thay vì nhiều ảnh: nhiều app in chỉ nhận ảnh đầu tiên khi được chia sẻ
 * nhiều tệp, và người trực chỉ phải chọn app một lần.
 */
export function ghepAnhLien(anh: HTMLCanvasElement[], rong: number): HTMLCanvasElement {
  const KHE = 36;
  const cao = anh.reduce((t, c) => t + c.height, 0) + Math.max(0, anh.length - 1) * KHE;
  const ra = document.createElement("canvas");
  ra.width = rong;
  ra.height = Math.max(1, cao);
  const g = ra.getContext("2d")!;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, ra.width, ra.height);
  let y = 0;
  anh.forEach((c, i) => {
    g.drawImage(c, 0, y);
    y += c.height;
    if (i < anh.length - 1) {
      g.strokeStyle = "#000";
      g.lineWidth = 2;
      g.setLineDash([10, 8]);
      g.beginPath();
      g.moveTo(0, y + KHE / 2);
      g.lineTo(rong, y + KHE / 2);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = "#fff";
      g.fillRect(rong / 2 - 22, y + KHE / 2 - 12, 44, 24);
      g.fillStyle = "#000";
      g.font = "bold 18px system-ui, sans-serif";
      g.textAlign = "center";
      g.fillText("✂", rong / 2, y + KHE / 2 + 7);
      y += KHE;
    }
  });
  return ra;
}

export function anhSangFile(canvas: HTMLCanvasElement, ten: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(new File([b], ten, { type: "image/png" })) : reject(new Error("Không tạo được ảnh vé"))), "image/png");
  });
}

/** Mở khay chia sẻ với tệp ảnh. PHẢI gọi ngay trong cú bấm. Trả false nếu người dùng đóng khay. */
export async function guiAnhSangAppIn(file: File): Promise<boolean> {
  try {
    await navigator.share({ files: [file], title: "Vé bay" });
    return true;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") return false;
    throw e;
  }
}

/**
 * KHUNG XEM VÉ + NÚT GỬI — dựng bằng DOM thường (không React) để gọi được từ
 * hàm in thuần. Trả về khi người dùng đóng khung. Ảnh hiện đủ để khi app in
 * không có, người trực vẫn lưu ảnh / chụp màn hình rồi in bằng cách khác.
 */
export function hienKhungChiaSe(canvas: HTMLCanvasElement, tenFile: string): Promise<"da-gui" | "dong"> {
  return new Promise((resolve) => {
    const lop = document.createElement("div");
    lop.style.cssText = "position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;background:rgba(15,23,42,.94);color:#fff;font:14px system-ui,sans-serif";
    const thanh = document.createElement("div");
    thanh.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px";
    thanh.innerHTML = '<b style="font-size:15px">🖨 Vé đã dựng — gửi sang app in</b>';
    const dong = document.createElement("button");
    dong.textContent = "✕ Đóng";
    dong.style.cssText = "font:700 14px system-ui;padding:6px 12px;border:0;border-radius:8px;background:rgba(255,255,255,.15);color:#fff";
    thanh.appendChild(dong);
    const vung = document.createElement("div");
    vung.style.cssText = "flex:1;min-height:0;overflow:auto;padding:0 8px";
    const img = document.createElement("img");
    img.alt = "Vé bay";
    img.style.cssText = "display:block;width:100%;max-width:576px;margin:0 auto;background:#fff;border-radius:8px";
    img.src = canvas.toDataURL("image/png");
    vung.appendChild(img);
    const day = document.createElement("div");
    day.style.cssText = "flex:none;padding:10px 12px max(env(safe-area-inset-bottom),10px);background:#0f172a;border-top:1px solid rgba(255,255,255,.15)";
    const nutGui = document.createElement("button");
    nutGui.textContent = "📤 GỬI SANG APP IN";
    nutGui.style.cssText = "display:block;width:100%;max-width:576px;margin:0 auto;font:800 18px system-ui;padding:14px;border:0;border-radius:12px;background:#16a34a;color:#fff";
    const ghi = document.createElement("p");
    ghi.style.cssText = "max-width:576px;margin:8px auto 0;font-size:12px;line-height:1.4;color:rgba(255,255,255,.75);text-align:center";
    ghi.textContent = laIos()
      ? "Chọn app in máy in nhiệt đã ghép Gainscha B300 (ví dụ Thermer). Không có app: bấm giữ ảnh → Lưu ảnh rồi in từ app của máy in."
      : "Chọn RawBT (hoặc app in của máy in) trong khay chia sẻ. Không có app: bấm giữ ảnh để lưu.";
    day.appendChild(nutGui);
    day.appendChild(ghi);
    lop.appendChild(thanh);
    lop.appendChild(vung);
    lop.appendChild(day);
    document.body.appendChild(lop);

    let file: File | null = null;
    void anhSangFile(canvas, tenFile).then((f) => (file = f)).catch(() => null);
    const xong = (kq: "da-gui" | "dong") => {
      lop.remove();
      resolve(kq);
    };
    dong.onclick = () => xong("dong");
    nutGui.onclick = () => {
      if (!file) {
        ghi.textContent = "Đang dựng ảnh, bấm lại sau một giây…";
        return;
      }
      // Không await gì trước navigator.share — phải nằm ngay trong cú bấm.
      void guiAnhSangAppIn(file)
        .then((ok) => (ok ? xong("da-gui") : (ghi.textContent = "Đã đóng khay chia sẻ — bấm lại để gửi, hoặc Đóng.")))
        .catch((e) => (ghi.textContent = `Không mở được khay chia sẻ: ${e instanceof Error ? e.message : String(e)}`));
    };
  });
}
