import type { Cue, CueList } from "./cues";
import type { Unit } from "./schema";

// 가사 텍스트를 단위별 토큰으로 분리.
// - word: 공백 기준, 빈 토큰 제거
// - syllable: 공백 제거 후 글자(코드포인트) 단위
export function tokenize(text: string, unit: Unit): string[] {
  if (unit === "word") {
    return text.split(/\s+/).filter((t) => t.length > 0);
  }
  return Array.from(text.replace(/\s+/g, ""));
}

export interface DistributeResult {
  cues: Cue[];
  leftover: string[]; // cue보다 토큰이 많을 때 남는 토큰
  emptyCount: number; // 토큰이 부족해 비어있는 cue 수
}

// 토큰을 cue 순서대로 채운다. 개수 불일치 시 leftover/emptyCount로 알림.
export function distribute(tokens: string[], list: CueList): DistributeResult {
  const cues = list.cues.map((cue, i) => ({
    ...cue,
    text: i < tokens.length ? tokens[i] : "",
  }));
  const leftover = tokens.slice(cues.length);
  const emptyCount = Math.max(0, cues.length - tokens.length);
  return { cues, leftover, emptyCount };
}
