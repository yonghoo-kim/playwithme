// Hangul syllables span U+AC00..U+D7A3; (code - 0xAC00) % 28 is the final
// consonant index (0 = none, 8 = ㄹ). Self-contained (no import from ./push)
// so push.ts can use these helpers without an import cycle.
const HANGUL_FIRST = 0xac00;
const HANGUL_COUNT = 11172;
const FINAL_RIEUL = 8;

// Direction particle: 으로 after a final consonant (병원 -> 병원으로, 집 ->
// 집으로), 로 after an open syllable or a final ㄹ (놀이터 -> 놀이터로,
// 교실 -> 교실로). Non-Hangul endings take 로.
export function withDirectionParticle(place: string): string {
  const offset = place.charCodeAt(place.length - 1) - HANGUL_FIRST;
  const isHangul = offset >= 0 && offset < HANGUL_COUNT;
  const finalIndex = isHangul ? offset % 28 : 0;
  return finalIndex !== 0 && finalIndex !== FINAL_RIEUL
    ? `${place}으로`
    : `${place}로`;
}
