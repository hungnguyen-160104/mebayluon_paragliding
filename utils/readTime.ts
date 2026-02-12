export function estimateReadTime(htmlOrText: string, wpm = 200) {
  const text = htmlOrText.replace(/<[^>]+>/g, " "); // bỏ tag HTML
  const words = text.trim().split(/\s+/).filter(Boolean);
  const minutes = Math.ceil(words.length / wpm);
  return Math.max(1, minutes);
}
