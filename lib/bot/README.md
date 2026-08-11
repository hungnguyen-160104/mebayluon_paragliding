# lib/bot

Lõi con bot tư vấn Mebayluon, dùng chung cho Messenger và chat trên web.

- rules.ts         quy tắc tư vấn (chép nguyên văn từ workflow n8n cũ)
- core.ts          dựng prompt, gọi Anthropic, làm sạch, tách booking
- memory.ts        bộ nhớ hội thoại (MongoDB cho web, Graph API cho Messenger)
- google-bridge.ts cầu nối Apps Script: Doc tri thức, sheet, email

Xem MIGRATION.md để biết cách cấu hình.
