// lib/og-card.tsx
/**
 * Thẻ xem trước khi chia sẻ link (Zalo, Messenger, Facebook, Telegram…).
 *
 * Trước đây mỗi trang chỉ khai một tấm ảnh trần: chia sẻ ra thì chỉ thấy ảnh,
 * không biết là trang gì cho tới khi đọc dòng tiêu đề nhỏ bên dưới — mà nhiều
 * ứng dụng cắt mất dòng đó. Nay dựng ảnh riêng cho từng trang: ảnh thật của
 * trang làm nền, phủ tối dần từ dưới lên, rồi in tên trang và thương hiệu
 * ngay trên ảnh.
 *
 * Chạy ở runtime Node chứ không phải edge, để đọc thẳng tệp ảnh trong public/
 * thay vì tải qua mạng. Tải qua mạng thì lúc chạy máy mình sẽ phải gọi ra
 * production, và trang mới chưa deploy sẽ không có ảnh.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

async function dataUri(file: string): Promise<string> {
  const buf = await readFile(path.join(process.cwd(), "public", file));
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

export async function ogCard(input: {
  /** Ảnh nền, đường dẫn trong public/ — dùng bản đã cắt sẵn ở public/og. */
  image: string;
  /** Tên trang, in to nhất trên thẻ. */
  title: string;
  /** Câu phụ một dòng; bỏ trống thì không hiện. */
  subtitle?: string;
  /** Nhãn nhỏ phía trên tiêu đề, ví dụ "SỰ KIỆN". */
  eyebrow?: string;
}) {
  const [bg, logo] = await Promise.all([
    dataUri(input.image),
    dataUri("og/logo.jpg").catch(() => ""),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          position: "relative",
        }}
      >
        <img
          src={bg}
          width={1200}
          height={630}
          alt=""
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            objectFit: "cover",
          }}
        />

        {/* Phủ tối dần từ dưới lên: chữ luôn đọc được dù ảnh nền sáng hay tối.
            Ghi rõ width/height vì Satori không hiểu thuộc tính `inset`. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            background:
              "linear-gradient(180deg, rgba(6,10,18,0.10) 0%, rgba(6,10,18,0.30) 38%, rgba(6,10,18,0.82) 68%, rgba(6,10,18,0.96) 100%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 64,
            right: 64,
            bottom: 56,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {input.eyebrow ? (
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                background: "rgba(251,191,36,0.22)",
                border: "2px solid rgba(251,191,36,0.65)",
                borderRadius: 999,
                padding: "6px 20px",
                marginBottom: 18,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 3,
                color: "#FCD34D",
              }}
            >
              {input.eyebrow}
            </div>
          ) : null}

          <div
            style={{
              fontSize: input.title.length > 42 ? 58 : 70,
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 1.12,
              letterSpacing: -1,
              textShadow: "0 4px 24px rgba(0,0,0,0.8)",
            }}
          >
            {input.title}
          </div>

          {input.subtitle ? (
            <div
              style={{
                marginTop: 14,
                fontSize: 28,
                fontWeight: 500,
                color: "rgba(255,255,255,0.86)",
                lineHeight: 1.35,
                textShadow: "0 2px 14px rgba(0,0,0,0.8)",
              }}
            >
              {input.subtitle}
            </div>
          ) : null}

          {/* Dải thương hiệu: người xem lướt qua vẫn biết là của ai */}
          <div
            style={{
              marginTop: 26,
              paddingTop: 20,
              borderTop: "1px solid rgba(255,255,255,0.25)",
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            {logo ? (
              <img
                src={logo}
                width={54}
                height={54}
                alt=""
                style={{ borderRadius: 27 }}
              />
            ) : null}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: 30,
                  fontWeight: 900,
                  color: "#ffffff",
                  letterSpacing: -0.5,
                  lineHeight: 1,
                }}
              >
                MEBAYLUON PARAGLIDING
              </span>
              <span
                style={{
                  marginTop: 5,
                  fontSize: 21,
                  color: "rgba(255,255,255,0.6)",
                  letterSpacing: 1.5,
                }}
              >
                www.mebayluon.com
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
