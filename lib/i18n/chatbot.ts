// lib/i18n/chatbot.ts
/**
 * Chữ hiển thị của widget chatbot nổi — dịch đủ 6 ngôn ngữ.
 *
 * Widget này xuất hiện trên MỌI trang công khai, trước đây toàn bộ chữ đều
 * viết cứng tiếng Việt nên khách nước ngoài thấy "Nhập câu hỏi…",
 * "Xin chào! Mình có thể giúp gì cho bạn?"...
 *
 * Riêng nội dung câu trả lời do bot n8n sinh ra — bot tự nhận diện ngôn ngữ
 * của khách, không xử lý ở đây.
 */

export type ChatbotLang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

export type ChatbotTexts = {
  /** Tiêu đề cửa sổ chat */
  title: string;
  /** Nút mở chatbot (aria-label + tooltip) */
  openChat: string;
  /** Nút bắt đầu hội thoại mới */
  newChat: string;
  /** Nút đóng cửa sổ */
  close: string;
  /** Ô nhập khi bot đang trả lời */
  botTyping: string;
  /** Ô nhập lúc bình thường */
  inputPlaceholder: string;
  /** Nút gửi */
  send: string;
  /** Câu chào đầu tiên */
  greeting: string;
  /** Báo lỗi khi bot không phản hồi */
  error: string;
};

const HOTLINE = "0964 073 555";

export const CHATBOT_TEXTS: Record<ChatbotLang, ChatbotTexts> = {
  vi: {
    title: "Hỗ trợ Mebayluon",
    openChat: "Mở chatbot",
    newChat: "Bắt đầu hội thoại mới",
    close: "Đóng cửa sổ chat",
    botTyping: "Bot đang trả lời…",
    inputPlaceholder: "Nhập câu hỏi…",
    send: "Gửi",
    greeting:
      "Xin chào, Mebayluon có lịch bay hàng ngày tại Mù Cang Chải, Hà Nội và Sapa, lịch bay từ 7h00-18h00 mỗi ngày. Bạn có thể tra nhanh mọi thông tin dịch vụ bay dù lượn của chúng tôi qua cửa sổ chat này. Nếu cần gấp có thể gọi phi công trưởng: 0964 073 555 Mr. Mỹ nhé.",
    error: `Xin lỗi, hệ thống đang bận hoặc không phản hồi. Bạn vui lòng thử lại sau, hoặc liên hệ hotline ${HOTLINE} để được hỗ trợ ngay.`,
  },
  en: {
    title: "Mebayluon Support",
    openChat: "Open chat",
    newChat: "Start a new conversation",
    close: "Close chat window",
    botTyping: "The bot is replying…",
    inputPlaceholder: "Type your question…",
    send: "Send",
    greeting:
      "Hello! Mebayluon flies daily in Mu Cang Chai, Hanoi and Sapa, from 7:00 to 18:00. You can quickly look up all our paragliding services right in this chat. For urgent help, call our chief pilot: 0964 073 555 (Mr. My).",
    error: `Sorry, the system is busy or not responding. Please try again later, or call our hotline ${HOTLINE} for immediate help.`,
  },
  fr: {
    title: "Assistance Mebayluon",
    openChat: "Ouvrir le chat",
    newChat: "Démarrer une nouvelle conversation",
    close: "Fermer la fenêtre de chat",
    botTyping: "Le bot répond…",
    inputPlaceholder: "Saisissez votre question…",
    send: "Envoyer",
    greeting:
      "Bonjour ! Mebayluon vole tous les jours à Mu Cang Chai, Hanoï et Sapa, de 7h00 à 18h00. Retrouvez rapidement toutes les infos sur nos vols en parapente dans cette fenêtre de chat. En cas d’urgence, appelez notre chef pilote : 0964 073 555 (M. My).",
    error: `Désolé, le système est occupé ou ne répond pas. Réessayez plus tard ou appelez notre hotline ${HOTLINE} pour une aide immédiate.`,
  },
  ru: {
    title: "Поддержка Mebayluon",
    openChat: "Открыть чат",
    newChat: "Начать новый диалог",
    close: "Закрыть окно чата",
    botTyping: "Бот отвечает…",
    inputPlaceholder: "Введите вопрос…",
    send: "Отправить",
    greeting:
      "Здравствуйте! Mebayluon летает ежедневно в Мукангчае, Ханое и Сапе с 7:00 до 18:00. В этом чате вы быстро найдёте всю информацию о наших полётах на параплане. В срочных случаях звоните шеф-пилоту: 0964 073 555 (г-н Ми).",
    error: `Извините, система занята или не отвечает. Попробуйте позже или позвоните на горячую линию ${HOTLINE} для срочной помощи.`,
  },
  zh: {
    title: "Mebayluon 客服",
    openChat: "打开聊天",
    newChat: "开始新对话",
    close: "关闭聊天窗口",
    botTyping: "机器人正在回复…",
    inputPlaceholder: "请输入您的问题…",
    send: "发送",
    greeting:
      "您好！Mebayluon 每天在木江界、河内和沙坝均有飞行，时间为 7:00–18:00。您可以在此聊天窗口快速查询我们所有滑翔伞服务信息。如有急事请致电首席飞行员：0964 073 555（My 先生）。",
    error: `抱歉，系统繁忙或暂无响应。请稍后再试，或拨打热线 ${HOTLINE} 获得即时帮助。`,
  },
  hi: {
    title: "Mebayluon सहायता",
    openChat: "चैट खोलें",
    newChat: "नई बातचीत शुरू करें",
    close: "चैट विंडो बंद करें",
    botTyping: "बॉट उत्तर दे रहा है…",
    inputPlaceholder: "अपना प्रश्न लिखें…",
    send: "भेजें",
    greeting:
      "नमस्ते! Mebayluon मु कांग चाई, हनोई और सापा में प्रतिदिन 7:00–18:00 बजे तक उड़ानें संचालित करता है। इस चैट विंडो में आप हमारी सभी पैराग्लाइडिंग सेवाओं की जानकारी तुरंत पा सकते हैं। तुरंत सहायता के लिए मुख्य पायलट को कॉल करें: 0964 073 555 (Mr. My)।",
    error: `क्षमा करें, सिस्टम व्यस्त है या उत्तर नहीं दे रहा। कृपया बाद में पुनः प्रयास करें, या तुरंत सहायता के लिए हॉटलाइन ${HOTLINE} पर कॉल करें।`,
  },
};

/** Chữ chatbot theo ngôn ngữ (thiếu thì lùi về tiếng Việt). */
export function getChatbotTexts(lang: unknown): ChatbotTexts {
  const code = String(lang ?? "vi").slice(0, 2).toLowerCase() as ChatbotLang;
  return CHATBOT_TEXTS[code] ?? CHATBOT_TEXTS.vi;
}
