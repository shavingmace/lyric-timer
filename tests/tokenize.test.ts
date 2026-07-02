import { describe, it, expect } from "vitest";
import { tokenize, distribute } from "../src/core/tokenize";
import { addCue, createCueList, type CueList } from "../src/core/cues";

function listOf(n: number): CueList {
  let list = createCueList();
  for (let i = 0; i < n; i++) list = addCue(list, i, 0.5);
  return list;
}

describe("core/tokenize", () => {
  it("word: 공백 기준 분리, 빈 토큰 제거", () => {
    expect(tokenize("  안녕   하세요 ", "word")).toEqual(["안녕", "하세요"]);
  });

  it("syllable: 한글 글자 단위 분리, 공백 제거", () => {
    expect(tokenize("안녕 하세요", "syllable")).toEqual([
      "안",
      "녕",
      "하",
      "세",
      "요",
    ]);
  });

  it("distribute: 개수 일치 → 각 cue.text 채움", () => {
    const r = distribute(["가", "나"], listOf(2));
    expect(r.cues.map((c) => c.text)).toEqual(["가", "나"]);
    expect(r.leftover).toEqual([]);
    expect(r.emptyCount).toBe(0);
  });

  it("distribute: 토큰 많음 → 남는 토큰 반환", () => {
    const r = distribute(["가", "나", "다"], listOf(2));
    expect(r.cues.map((c) => c.text)).toEqual(["가", "나"]);
    expect(r.leftover).toEqual(["다"]);
    expect(r.emptyCount).toBe(0);
  });

  it("distribute: 토큰 적음 → 빈 cue 개수 반환", () => {
    const r = distribute(["가"], listOf(3));
    expect(r.cues.map((c) => c.text)).toEqual(["가", "", ""]);
    expect(r.leftover).toEqual([]);
    expect(r.emptyCount).toBe(2);
  });
});
