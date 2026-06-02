import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đội Phi Công Dù Lượn Chuyên Nghiệp | Mebayluon",
  description: "Gặp gỡ 19 phi công dù lượn chuyên nghiệp của Mebayluon — có chứng chỉ IPPI quốc tế, nhiều năm kinh nghiệm bay tại Mù Cang Chải, Sapa và khắp Việt Nam.",
  keywords: ["phi công dù lượn", "paragliding pilot vietnam", "phi công mù cang chải", "mebayluon pilot", "dù lượn đôi"],
  openGraph: {
    title: "Đội Phi Công Dù Lượn Chuyên Nghiệp | Mebayluon",
    description: "19 phi công dù lượn chuyên nghiệp, chứng chỉ IPPI quốc tế, kinh nghiệm bay tại khắp Việt Nam.",
    url: "https://mebayluon.com/pilots",
    images: [{ url: "/pilots/hero.jpg", width: 1200, height: 630, alt: "Đội phi công Mebayluon" }],
  },
  alternates: { canonical: "https://mebayluon.com/pilots" },
};

export { default } from "./PilotsClient";