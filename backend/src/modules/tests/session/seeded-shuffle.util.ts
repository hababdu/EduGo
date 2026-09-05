/**
 * Oddiy seedlangan PRNG (mulberry32) — bir xil seed + questionId doim bir xil
 * "tasodifiy" tartibni beradi. Bu MUHIM: student sahifani yangilasa yoki
 * "davom ettirish"ni bossa, variant tartibi O'ZGARMASLIGI kerak, aks holda
 * chalkashlik yoki hatto "eslab qolish orqali aldash" imkoniyati tug'iladi.
 */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

/**
 * `items`ni sessionSeed + questionId asosida deterministik tartibda aralashtiradi.
 */
export function seededShuffle<T extends { id: string }>(
  items: T[],
  sessionSeed: number,
  questionId: string,
): T[] {
  const rng = mulberry32(sessionSeed + hashString(questionId));
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
