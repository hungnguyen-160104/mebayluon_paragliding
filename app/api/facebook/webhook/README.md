# Webhook Messenger

Điểm nhận sự kiện từ fanpage Club House Mebayluon Paragliding.

URL khai bên Meta:
    https://www.mebayluon.com/api/facebook/webhook

Chỉ đăng ký 2 trường: messages, messaging_postbacks.
KHÔNG đăng ký message_echoes — tin do Page gửi sẽ dội ngược về, vừa tốn
lượt gọi hàm vừa thêm một đường dẫn tới vòng lặp bot tự trả lời chính nó.

Biến môi trường cần: FB_VERIFY_TOKEN, FB_APP_SECRET, FB_PAGE_TOKEN, FB_PAGE_ID.
