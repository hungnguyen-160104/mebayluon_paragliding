function stripHtml(html: string): string {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function estimateReadTime(input: string): number {
  const plain = stripHtml(input);
  if (!plain) return 1;

  const words = plain.split(/\s+/).filter(Boolean).length;
  const wordsPerMinute = 220;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}