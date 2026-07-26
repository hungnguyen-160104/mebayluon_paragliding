import type { Metadata } from "next";

import { absoluteUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Liên Hệ Đặt Bay Dù Lượn | Mebayluon",
  description: "Liên hệ Mebayluon để đặt lịch bay dù lượn. Hotline: 0964073555. Bay tại Mù Cang Chải, Sapa, Đà Lạt và khắp Việt Nam.",
  keywords: ["liên hệ mebayluon", "đặt bay dù lượn", "hotline dù lượn", "paragliding contact vietnam"],
  openGraph: {
    title: "Liên Hệ Đặt Bay Dù Lượn | Mebayluon",
    description: "Hotline: 0964073555 — Đặt lịch bay dù lượn tại Mù Cang Chải, Sapa và khắp Việt Nam.",
    url: absoluteUrl("/contact"),
  },
  alternates: { canonical: absoluteUrl("/contact") },
};

export { default } from "./ContactClient";