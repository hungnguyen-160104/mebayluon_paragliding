// Chuẩn hoá tiếng Việt: hạ chữ, gọn khoảng trắng, KHÔNG bỏ dấu (giữ ngữ nghĩa)
export function normalizeTextVN(input: string): string {
  return input.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}
