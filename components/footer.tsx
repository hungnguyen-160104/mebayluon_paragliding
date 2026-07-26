import Link from "next/link"
import { Facebook, Youtube, Phone, Mail, MapPin } from "lucide-react"

export function Footer() {
  /**
   * Slug bài viết luôn là chữ thường — href phải khớp slug thật trong DB
   * (giống components/footer/Footer.tsx). Điểm chưa có bài viết riêng thì
   * trỏ về trang điểm bay /spots/... tương ứng.
   */
  const LOCATIONS = [
    {
      label: "Viên Nam – Hà Nội",
      href: "/blog/du-luon-vien-nam",
    },
    {
      label: "Đồi Bù – Hà Nội",
      href: "/blog/diem-bay-du-luon-doi-bu",
    },
    {
      label: "Đèo Khau Phạ – Mù Cang Chải",
      href: "/blog/deokhaupha",
    },
    {
      label: "Phình Hồ – Trạm Tấu",
      href: "/spots/tram-tau",
    },
    {
      label: "Sapa – Lào Cai",
      href: "/blog/bay-du-luon-sa-pa-muong-hoa",
    },
    {
      label: "Đồng Văn – Hà Giang",
      href: "/spots/ha-giang",
    },
  ]

  return (
    <div className="w-full px-4 pb-4">
      <footer
        className="
          w-full max-w-7xl mx-auto rounded-3xl
          bg-slate-800/50
          backdrop-blur-xl
          border border-white/20
        "
      >
        <div className="relative px-6 md:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* CỘT 1: THƯƠNG HIỆU */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold bg-linear-to-r from-orange-400 via-red-400 to-orange-300 bg-clip-text text-transparent">
                Mebayluon Paragliding
              </h2>

              <p className="text-sm text-slate-300">
                Experience the best paragliding in Vietnam
              </p>
            </div>

            {/* CỘT 2: QUICK LINKS */}
            <div>
              <h3 className="font-semibold text-white mb-4">Quick Links</h3>

              <ul className="space-y-2">
                {[
                  { href: "/pilots", label: "Pilots" },
                  { href: "/booking", label: "Book Tour" },
                  { href: "/pre-notice", label: "Pre-Notice" },
                ].map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-slate-300 hover:text-white hover:underline underline-offset-4 transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* CỘT 3: CONTACT */}
            <div>
              <h3 className="font-semibold text-white mb-4">Contact</h3>

              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2">
                  <Phone size={16} />
                  <span>+84964 073 555</span>
                </li>

                <li className="flex items-center gap-2">
                  <Mail size={16} />
                  <span>mebayluon@gmail.com</span>
                </li>
              </ul>

              <ul className="space-y-2 mt-3 text-sm text-slate-300">
                {LOCATIONS.map((loc) => {
                  return (
                    <li key={loc.href} className="flex items-center gap-2">
                      <MapPin size={16} />

                      <Link
                        href={loc.href}
                        className="hover:text-white hover:underline underline-offset-4 transition-colors"
                      >
                        {loc.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* CỘT 4: SOCIAL */}
            <div>
              <h3 className="font-semibold text-white mb-4">Follow Us</h3>

              <div className="flex gap-5">
                <a
                  href="https://www.facebook.com/mebayluon"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="text-slate-300 hover:text-white transition-colors"
                >
                  <Facebook size={22} />
                </a>

                <a
                  href="https://www.youtube.com/@dangvm"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="text-slate-300 hover:text-white transition-colors"
                >
                  <Youtube size={22} />
                </a>
              </div>
            </div>
          </div>

          {/* DÒNG BẢN QUYỀN */}
          <div className="mt-12 pt-6 border-t border-white/15 text-center text-sm text-slate-400">
            <p>
              &copy; {new Date().getFullYear()}{" "}
              <span className="font-medium text-slate-200">
                Mebayluon Paragliding
              </span>
              . All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}