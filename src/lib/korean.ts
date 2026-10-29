import { hasBatchim } from "./push";

// Index of ㄹ among Hangul final consonants ((code - 0xAC00) % 28).
const FINAL_RIEUL = 8;

// Direction particle: 으로 after a final consonant (병원 -> 병원으로, 집 ->
// 집으로), 로 after an open syllable or a final ㄹ (놀이터 -> 놀이터로,
// 교실 -> 교실로).
export function withDirectionParticle(place: string): string {
  const finalIndex = (place.charCodeAt(place.length - 1) - 0xac00) % 28;
  return hasBatchim(place) && finalIndex !== FINAL_RIEUL
    ? `${place}으로`
    : `${place}로`;
}
