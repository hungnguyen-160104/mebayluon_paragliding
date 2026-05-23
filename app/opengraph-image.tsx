import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Mebayluon Paragliding - Bay Dù Lượn Tự Do Tại Việt Nam";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a1628 0%, #0d2b4e 45%, #0a1628 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* decorative circle glow */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            right: "-80px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(1,148,243,0.25) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-60px",
            left: "-60px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,94,31,0.2) 0%, transparent 70%)",
          }}
        />

        {/* logo + brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "28px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://mebayluon.com/logo.png"
            width={90}
            height={90}
            alt="logo"
            style={{ borderRadius: "50%" }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: "52px",
                fontWeight: 900,
                color: "#ffffff",
                letterSpacing: "-1px",
                lineHeight: 1,
              }}
            >
              MEBAYLUON
            </span>
            <span
              style={{
                fontSize: "22px",
                fontWeight: 500,
                color: "#0194F3",
                letterSpacing: "3px",
                marginTop: "4px",
              }}
            >
              PARAGLIDING
            </span>
          </div>
        </div>

        {/* tagline */}
        <div
          style={{
            fontSize: "28px",
            fontWeight: 600,
            color: "rgba(255,255,255,0.85)",
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: 1.4,
            marginBottom: "36px",
          }}
        >
          Bay Dù Lượn Tự Do Trên Khắp Việt Nam
        </div>

        {/* location chips */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
          {["Hà Nội", "Sapa", "Khau Phạ", "Đà Nẵng", "Quản Bạ"].map((loc) => (
            <div
              key={loc}
              style={{
                background: "rgba(1,148,243,0.18)",
                border: "1px solid rgba(1,148,243,0.4)",
                borderRadius: "999px",
                padding: "8px 20px",
                fontSize: "18px",
                color: "#93c5fd",
                fontWeight: 500,
              }}
            >
              {loc}
            </div>
          ))}
        </div>

        {/* bottom URL bar */}
        <div
          style={{
            position: "absolute",
            bottom: "28px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "rgba(255,255,255,0.45)",
            fontSize: "16px",
            letterSpacing: "1px",
          }}
        >
          🌐 mebayluon.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
