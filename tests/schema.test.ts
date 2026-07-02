import { describe, it, expect } from "vitest";
import { serialize, parse, type ProjectState } from "../src/core/schema";
import { addCue, createCueList } from "../src/core/cues";

const NOW = "2026-07-02T09:00:00.000Z";

function sampleState(): ProjectState {
  let cueList = addCue(createCueList(), 1.0, 0.5);
  cueList = addCue(cueList, 2.0, 0.5);
  cueList.cues[0].text = "안";
  cueList.cues[1].text = "녕";
  return {
    meta: {
      title: "테스트곡",
      unit: "syllable",
      hasAudio: true,
      audioFileName: "song.mp3",
      defaultDuration: 0.5,
      totalDuration: 10,
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
    },
    cueList,
  };
}

describe("core/schema", () => {
  it("serialize → version/meta/cues 구조, cue에 내부필드 없음", () => {
    const doc = serialize(sampleState(), NOW);
    expect(doc.version).toBe("1.0");
    expect(doc.meta.title).toBe("테스트곡");
    expect(doc.cues).toHaveLength(2);
    expect(doc.cues[0]).toEqual({
      id: "c-0001",
      start: 1.0,
      duration: 0.5,
      text: "안",
      index: 0,
    });
    expect("createdSeq" in doc.cues[0]).toBe(false);
  });

  it("updatedAt은 주입된 시각으로 설정", () => {
    const doc = serialize(sampleState(), NOW);
    expect(doc.meta.updatedAt).toBe(NOW);
    expect(doc.meta.createdAt).toBe("2026-07-01T00:00:00.000Z");
  });

  it("round-trip: parse→serialize 동일", () => {
    const doc = serialize(sampleState(), NOW);
    const restored = parse(doc);
    const doc2 = serialize(restored, NOW);
    expect(doc2).toEqual(doc);
  });

  it("version 누락/미지원 → 에러", () => {
    expect(() => parse({ meta: {}, cues: [] })).toThrow();
    expect(() => parse({ version: "9.9", meta: {}, cues: [] })).toThrow();
  });

  it("cues 형식 오류 → 에러", () => {
    expect(() => parse({ version: "1.0", meta: {}, cues: "nope" })).toThrow();
    expect(() =>
      parse({ version: "1.0", meta: {}, cues: [{ id: "x" }] }),
    ).toThrow();
  });
});
