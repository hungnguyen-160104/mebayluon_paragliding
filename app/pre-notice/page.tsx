"use client"
import { PageBackground } from "@/components/page-background";

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Shirt, PackageCheck, Ban, Ticket, ArrowRight } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { motion } from "framer-motion"
import Image from "next/image" // Import Image để tối ưu
import Link from "next/link"

/**
 * Bài viết mô tả tuần tự các bước của một chuyến bay dù lượn (có mặt tại điểm
 * hẹn → gặp phi công → mặc trang bị → cất cánh → hạ cánh), kèm điểm bay và
 * lịch bay. Trang này chỉ liệt kê quy định và chuẩn bị, nên dẫn khách sang đó
 * đọc phần diễn biến chuyến bay.
 */
const FLIGHT_STEPS_POST = "/blog/trai-nghiem-bay-du-luon-mebayluon"

/** "Dù lượn có an toàn không? Sự thật trước chuyến bay đầu tiên" — câu hỏi
 *  khách hay lăn tăn nhất ngay trước khi bay, nên để cạnh bài các bước bay. */
const SAFETY_POST = "/blog/du-luon-co-an-toan-khong"

const STEPS_CTA: Record<
  string,
  { title: string; desc: string; button: string; safetyButton: string }
> = {
  vi: {
    title: "Một chuyến bay diễn ra thế nào?",
    desc: "Từ lúc có mặt tại điểm hẹn cho tới khi hạ cánh — toàn bộ các bước của một chuyến bay dù lượn, kèm điểm bay, lịch bay và những lưu ý quan trọng.",
    button: "Xem các bước khi đi bay dù lượn",
    safetyButton: "Dù lượn có an toàn không?",
  },
  en: {
    title: "How does a flight actually go?",
    desc: "From arriving at the meeting point to touching down — every step of a paragliding flight, plus our sites, flight schedules and the things worth knowing.",
    button: "Read the step-by-step guide",
    safetyButton: "Is paragliding safe?",
  },
  fr: {
    title: "Comment se déroule un vol ?",
    desc: "De l’arrivée au point de rendez-vous jusqu’à l’atterrissage — toutes les étapes d’un vol en parapente, avec nos sites, les horaires et les points à retenir.",
    button: "Lire le guide étape par étape",
    safetyButton: "Le parapente est-il sûr ?",
  },
  ru: {
    title: "Как проходит полёт?",
    desc: "От прибытия на место встречи до посадки — все этапы полёта на параплане, а также площадки, расписание и то, что стоит знать заранее.",
    button: "Читать пошаговое руководство",
    safetyButton: "Безопасен ли параплан?",
  },
  zh: {
    title: "一次飞行是怎样进行的？",
    desc: "从抵达集合点到降落——滑翔伞飞行的每一个步骤，以及飞行点、时段安排与需要提前了解的注意事项。",
    button: "查看飞行步骤指南",
    safetyButton: "滑翔伞安全吗？",
  },
  hi: {
    title: "उड़ान असल में कैसे होती है?",
    desc: "मिलन स्थल पर पहुँचने से लेकर लैंडिंग तक — पैराग्लाइडिंग उड़ान का हर चरण, साथ ही हमारे स्थल, उड़ान समय और पहले से जान लेने लायक़ बातें।",
    button: "चरण-दर-चरण गाइड पढ़ें",
    safetyButton: "क्या पैराग्लाइडिंग सुरक्षित है?",
  },
}

export default function PreNoticePage() {
  const { t, language } = useLanguage()
  const stepsCta = STEPS_CTA[language] ?? STEPS_CTA.vi

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
      title: t.preNotice?.posters?.title ?? "Lưu ý quan trọng",
      subtitle:
        t.preNotice?.posters?.subtitle ??
        "Tóm tắt các quy định & chuẩn bị cần thiết. Nhấp vào ảnh để xem bản lớn.",
    },
    requirements: {
      title: t.preNotice?.requirements?.title ?? "Yêu cầu & Quy định",
      eligible: {
        title: t.preNotice?.requirements?.eligible?.title ?? "Điều kiện tham gia bay",
        items: t.preNotice?.requirements?.eligible?.items ?? [
          "Cân nặng: Dưới 120kg. Trường hợp trên 90kg hoặc dưới 30kg vui lòng thông báo trước để sắp xếp phi công và trang thiết bị phù hợp",
          "Thể lực: Mức độ thể lực cơ bản, có khả năng chạy ngắn. Không phù hợp với người thừa cân nhiều hoặc gặp vấn đề nghiêm trọng về vận động",
          "Độ tuổi: Từ 3 tuổi trở lên",
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
        title:
          t.preNotice?.requirements?.cancellation?.title ??
          "Hoàn huỷ & Đổi lịch bay",
        items: t.preNotice?.requirements?.cancellation?.items ?? [
          "Lịch bay linh động & Hoàn huỷ & đổi lịch miễn phí",
          "Huỷ bay khi thời tiết không thuận lợi & khi khách không sẵn sàng",
          "Khách vui lòng báo đổi/huỷ lịch bay qua email/hotline/Zalo/WhatsApp ít nhất 03 tiếng trước giờ khởi hành",
          "Khách vui lòng thanh toán một số phí phát sinh đã sử dụng nếu huỷ lịch bay trong ngày (nước đã uống, xe đã đón)",
        ],
      }
    }
  }

  return (
    <main className="min-h-screen relative text-white">
      <PageBackground
        src="/per-flight.jpg"
        alt="Khách chuẩn bị trang bị trước chuyến bay dù lượn"
      />
      <div className="fixed inset-0 -z-10 bg-black/20" />
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
          {/* Dùng .text-hero-shadow / -soft trong app/globals.css thay cho
              textShadow viết tay: đổ bóng 3 lớp + viền chữ mảnh, đậm hơn và
              đồng bộ với các trang khác. */}
          <h1 className="text-hero-shadow mb-4 font-serif text-5xl font-bold md:text-7xl">
            {t.preNotice.title}
          </h1>
          <p className="text-hero-shadow-soft mx-auto max-w-3xl text-xl text-slate-100 md:text-2xl">
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
            <h2 className="text-hero-shadow mb-4 font-serif text-4xl font-bold text-white">
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
              <Card className="h-full border border-white/20 bg-slate-800/60 text-white shadow-xl backdrop-blur-xl">
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
                        <span className="text-slate-100">{item}</span>
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
              <Card className="h-full border border-white/20 bg-slate-800/60 text-white shadow-xl backdrop-blur-xl">
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
                        <span className="text-slate-100">{item}</span>
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
            <h2 className="text-hero-shadow mb-3 font-serif text-4xl font-bold text-white">
              {content.posters.title}
            </h2>
            <p className="text-hero-shadow-soft mx-auto max-w-3xl text-slate-100">
              {content.posters.subtitle}
            </p>
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
            <h2 className="text-hero-shadow mb-4 font-serif text-4xl font-bold text-white">
              {content.requirements.title}
            </h2>
          </motion.div>
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Điều kiện tham gia */}
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <Card className="h-full border border-white/20 bg-slate-800/60 text-white shadow-xl backdrop-blur-xl">
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
                          <span className="text-slate-100">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Đặt vé */}
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
                <Card className="h-full border border-white/20 bg-slate-800/60 text-white shadow-xl backdrop-blur-xl">
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
                          <span className="text-slate-100">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Huỷ bay Section */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
              <Card className="border border-white/20 bg-slate-800/60 text-white shadow-xl backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <Ban className="text-orange-400" /> {content.requirements.cancellation.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {content.requirements.cancellation.items.map((item: string, index: number) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle2 className="text-green-400 mt-1 shrink-0" size={18} />
                        <span className="text-slate-100">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Dẫn sang bài viết mô tả tuần tự các bước của một chuyến bay */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto mt-16 max-w-3xl"
          >
            <div className="rounded-2xl border border-white/20 bg-slate-800/60 p-8 text-center shadow-xl backdrop-blur-xl">
              <h2 className="text-hero-shadow font-serif text-2xl font-bold text-white md:text-3xl">
                {stepsCta.title}
              </h2>
              <p className="mx-auto mt-3 text-[15px] leading-relaxed text-slate-100">
                {stepsCta.desc}
              </p>
              {/* Hai nút: bài các bước bay là nút chính (nền đỏ đặc), bài về
                  độ an toàn là nút phụ (viền trắng) để không tranh nhau. */}
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href={FLIGHT_STEPS_POST}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-8 py-3.5 text-base font-bold text-white shadow-xl shadow-black/40 ring-1 ring-white/30 transition-all hover:-translate-y-0.5 hover:bg-accent/90 hover:shadow-2xl"
                >
                  {stepsCta.button}
                  <ArrowRight size={18} />
                </Link>

                <Link
                  href={SAFETY_POST}
                  className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/70 bg-black/40 px-8 py-3.5 text-base font-bold text-white shadow-xl shadow-black/40 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white hover:text-slate-900 hover:shadow-2xl"
                >
                  {stepsCta.safetyButton}
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="relative z-10">
        <Footer />
      </div>
    </main>
  )
}