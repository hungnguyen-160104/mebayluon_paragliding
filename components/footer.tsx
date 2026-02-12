import Link from "next/link"
import { Facebook, Youtube, Phone, Mail, MapPin } from "lucide-react"

export function Footer() {
  const LOCATIONS = [
    "Viên Nam - Hòa Bình",
    "Đồi Bù - Chương Mỹ - Hà Nội",
    "Khau Phạ - Mù Cang Chải - Yên Bái",
    "Trạm Tấu - Yên Bái",
    "Sơn Trà - Đà Nẵng",
    "Sapa, Lào Cai, Vietnam",
  ]

  return (
    // --- CONTAINER BÊN NGOÀI ĐỂ CĂN GIỮA VÀ TẠO KHOẢNG TRỐNG ---
    <div className="w-full px-4 pb-4">
      {/* --- THAY ĐỔI: Thêm bo góc (rounded-3xl) và nền xám xanh hiện đại --- */}
      <footer className="
        w-full max-w-7xl mx-auto rounded-3xl  
        bg-slate-800/50                      
        backdrop-blur-xl                     
        border border-white/20               
      ">
        <div className="relative px-6 md:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            
            {/* CỘT 1: THƯƠNG HIỆU */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-400 via-red-400 to-orange-300 bg-clip-text text-transparent">
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
                  { href: "/about", label: "About Us" },
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
                  <span>0964 073 555</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail size={16} />
                  <span>mebayluon@gmail.com</span>
                </li>
              </ul>
              <ul className="space-y-2 mt-3 text-sm text-slate-300">
                {LOCATIONS.map((loc) => (
                  <li key={loc} className="flex items-center gap-2">
                    <MapPin size={16} />
                    <span>{loc}</span>
                  </li>
                ))}
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
              <span className="font-medium text-slate-200">Mebayluon Paragliding</span>. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}