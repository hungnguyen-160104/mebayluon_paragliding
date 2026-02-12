"use client"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Shirt, PackageCheck, Ban, Calendar, Ticket } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { motion } from "framer-motion"
import Image from "next/image" // Import Image để tối ưu

export default function PreNoticePage() {
  const { t } = useLanguage()

  // Dữ liệu mẫu (bạn có thể lấy từ file ngôn ngữ)
  const content = {
    preparation: {
      title: t.preNotice?.preparation?.title ?? "Chuẩn bị trước khi bay",
      clothing: {
        title: t.preNotice?.preparation?.clothing?.title ?? "Trang phục",
        items: t.preNotice?.preparation?.clothing?.items ?? [
          "Trang phục thoải mái, thể thao (áo tay dài, quần dài); không mặc váy",
          "Giày: Không mang giày cao gót; ưu tiên giày thể thao hoặc giày leo núi. Có hỗ trợ mượn giày miễn phí khi cần",
          "Kính mắt: Kính râm để chống tia UV và gió mạnh (30-40 km/h khi bay). Có thể mang theo kính cận",
          "Phụ kiện: Có thể mang theo 1 túi nhỏ (1-2kg) đựng đồ cá nhân như điện thoại, chìa khóa, giấy tờ tùy thân",
        ],
      },
      items: {
        title: t.preNotice?.preparation?.items?.title ?? "Quy trình bay",
        list: t.preNotice?.preparation?.items?.list ?? [
          "Tại điểm cất cánh, làm quen với phi công, nghe hướng dẫn và đặt câu hỏi",
          "Mặc trang bị bay, tập các động tác cất cánh",
          "Chạy đà mạnh, liên tục khi cất cánh theo hướng dẫn của phi công",
          "Thư giãn, ngắm cảnh và trò chuyện khi đã bay lên không trung",
          "Trang bị bay an toàn, thoải mái",
          "Hạ cánh nhẹ nhàng, có thể đứng hoặc ngồi tùy điều kiện",
        ],
      }
    },
    posters: {
      title: "Lưu ý quan trọng",
      subtitle: "Tóm tắt các quy định & chuẩn bị cần thiết. Nhấp vào ảnh để xem bản lớn."
    },
    requirements: {
      title: t.preNotice?.requirements?.title ?? "Yêu cầu & Quy định",
      eligible: {
        title: t.preNotice?.requirements?.eligible?.title ?? "Điều kiện tham gia bay",
        items: t.preNotice?.requirements?.eligible?.items ?? [
          "Cân nặng: Dưới 120kg. Trường hợp trên 95kg vui lòng thông báo trước để sắp xếp phi công và trang thiết bị phù hợp",
          "Thể lực: Mức độ thể lực cơ bản, có khả năng chạy ngắn. Không phù hợp với người thừa cân nhiều hoặc gặp vấn đề nghiêm trọng về vận động",
          "Độ tuổi: Từ 2 tuổi trở lên",
        ],
      },
      notEligible: {
        title: t.preNotice?.requirements?.notEligible?.title ?? "Đặt vé",
        items: t.preNotice?.requirements?.notEligible?.items ?? [
          "Đặt vé trực tiếp qua website hoặc liên hệ hotline/Zalo/WhatsApp",
          "Thanh toán bằng tiền mặt, chuyển khoản ngân hàng hoặc thẻ tín dụng",
          "Chúng tôi sẽ liên hệ trong vòng 03 giờ sau khi nhận được booking",
        ],
      },
      cancellation: {
        title: t.preNotice?.requirements?.cancellation?.title ?? "Huỷ bay",
        byCompany: {
          title: t.preNotice?.requirements?.cancellation?.byCompany?.title ?? "Huỷ bay do Mebayluon Paragliding",
          items: t.preNotice?.requirements?.cancellation?.byCompany?.items ?? ["Trường hợp thời tiết không thuận lợi và phải huỷ bay", "Khách hàng không phải thanh toán chi phí", "Vé được hoàn tiền 100%, không phát sinh bất kỳ khoản phí nào"],
        },
        byCustomer: {
          title: t.preNotice?.requirements?.cancellation?.byCustomer?.title ?? "Huỷ bay do khách hàng",
          items: t.preNotice?.requirements?.cancellation?.byCustomer?.items ?? ["Việc huỷ bay phải được thông báo qua email/hotline/Zalo/WhatsApp", "Chính sách phí huỷ: Trước 1 ngày: Miễn phí"],
        },
        reschedule: {
          title: t.preNotice?.requirements?.cancellation?.reschedule?.title ?? "Đổi lịch bay do khách hàng",
          items: t.preNotice?.requirements?.cancellation?.reschedule?.items ?? ["Miễn phí đổi lịch bay"],
        },
      }
    }
  }

  return (
    <main
      className="min-h-screen relative bg-cover bg-center bg-fixed text-white"
      style={{ backgroundImage: "url(/per-flight.jpg)" }}
    >
      <div className="absolute inset-0 bg-black/20 z-0" />
      <div className="relative z-20">
        <Navigation />
      </div>

      {/* HERO SECTION */}
      <section className="relative h-[60vh] flex items-center justify-center -mt-16 z-10">
        <motion.div
          className="container mx-auto px-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-4 font-serif" style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.7)' }}>
            {t.preNotice.title}
          </h1>
          <p className="text-xl md:text-2xl max-w-3xl mx-auto text-slate-200" style={{ textShadow: '1px 1px 6px rgba(0,0,0,0.7)' }}>
            {t.preNotice.subtitle}
          </p>
        </motion.div>
      </section>

      {/* CHUẨN BỊ TRƯỚC KHI BAY */}
      <section className="relative z-10 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4 font-serif text-white">
              {content.preparation.title}
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Trang phục */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              className="transition-transform duration-300"
            >
              <Card className="h-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-3">
                    <Shirt /> {content.preparation.clothing.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {content.preparation.clothing.items.map((item: string, index: number) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle2 className="text-green-400 mt-1 shrink-0" size={20} />
                        <span className="text-slate-200">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            {/* Vật dụng */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              className="transition-transform duration-300"
            >
              <Card className="h-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-3">
                    <PackageCheck /> {content.preparation.items.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {content.preparation.items.list.map((item: string, index: number) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle2 className="text-green-400 mt-1 shrink-0" size={20} />
                        <span className="text-slate-200">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* POSTERS SECTION */}
      <section className="relative z-10 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-3 font-serif">{content.posters.title}</h2>
            <p className="text-slate-200 max-w-3xl mx-auto">{content.posters.subtitle}</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {[
              { img: "/preflight/quy-dinh-ve-trang-phuc.jpg", alt: "Quy định trang phục" },
              { img: "/preflight/quy-dinh-voi-hanh-khach.jpg", alt: "Quy định hành khách" },
            ].map((poster, index) => (
              <motion.a
                key={index}
                href={poster.img}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ y: -5, scale: 1.03 }}
                transition={{ delay: index * 0.1 }}
                className="block rounded-xl overflow-hidden shadow-lg border border-white/20"
              >
                <Image
                  src={poster.img}
                  alt={poster.alt}
                  width={800}
                  height={1200}
                  className="w-full h-auto"
                />
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* YÊU CẦU & QUY ĐỊNH */}
      <section className="relative z-10 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4 font-serif text-white">
              {content.requirements.title}
            </h2>
          </motion.div>
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Điều kiện tham gia */}
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <Card className="h-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <CheckCircle2 className="text-green-400" /> {content.requirements.eligible.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {content.requirements.eligible.items.map((item: string, index: number) => (
                        <li key={index} className="flex items-start gap-3">
                          <CheckCircle2 className="text-green-400 mt-1 shrink-0" size={18} />
                          <span className="text-slate-200">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Đặt vé */}
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
                <Card className="h-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <Ticket className="text-blue-400" /> {content.requirements.notEligible.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {content.requirements.notEligible.items.map((item: string, index: number) => (
                        <li key={index} className="flex items-start gap-3">
                          <CheckCircle2 className="text-blue-400 mt-1 shrink-0" size={18} />
                          <span className="text-slate-200">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Huỷ bay Section */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
              <Card className="bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <Ban className="text-orange-400" /> {content.requirements.cancellation.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Huỷ do công ty */}
                  <div>
                    <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <CheckCircle2 className="text-green-400" size={20} />
                      {content.requirements.cancellation.byCompany.title}
                    </h4>
                    <ul className="space-y-2 ml-7">
                      {content.requirements.cancellation.byCompany.items.map((item: string, index: number) => (
                        <li key={index} className="flex items-start gap-3">
                          <CheckCircle2 className="text-green-400 mt-1 shrink-0" size={16} />
                          <span className="text-slate-200">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* Huỷ do khách */}
                  <div>
                    <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <Ticket className="text-blue-400" size={20} />
                      {content.requirements.cancellation.byCustomer.title}
                    </h4>
                    <ul className="space-y-2 ml-7">
                      {content.requirements.cancellation.byCustomer.items.map((item: string, index: number) => (
                        <li key={index} className="flex items-start gap-3">
                          <CheckCircle2 className="text-blue-400 mt-1 shrink-0" size={16} />
                          <span className="text-slate-200">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* Đổi lịch */}
                  <div>
                    <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <Calendar className="text-purple-400" size={20} />
                      {content.requirements.cancellation.reschedule.title}
                    </h4>
                    <ul className="space-y-2 ml-7">
                      {content.requirements.cancellation.reschedule.items.map((item: string, index: number) => (
                        <li key={index} className="flex items-start gap-3">
                          <CheckCircle2 className="text-purple-400 mt-1 shrink-0" size={16} />
                          <span className="text-slate-200">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      <div className="relative z-10">
        <Footer />
      </div>
    </main>
  )
}