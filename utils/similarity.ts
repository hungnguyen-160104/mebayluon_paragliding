export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < len; i++) {
    const x = a[i], y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function bestMatch(
  target: number[],
  items: { vector: number[] }[]
): { index: number; score: number } {
  let bestIdx = -1;
  let bestScore = -1;
  for (let i = 0; i < items.length; i++) {
    const s = cosineSimilarity(target, items[i].vector);
    if (s > bestScore) {
      bestScore = s;
      bestIdx = i;
    }
  }
  return { index: bestIdx, score: bestScore };
}
