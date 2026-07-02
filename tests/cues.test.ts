import { describe, it, expect } from "vitest";
import {
  addCue,
  createCueList,
  sortCues,
  undoLast,
  detectOverlaps,
} from "../src/core/cues";

describe("core/cues", () => {
  it("tap 하나 → cue 1개, 필드 초기화", () => {
    const list = addCue(createCueList(), 1.2, 0.5);
    expect(list.cues).toHaveLength(1);
    const cue = list.cues[0];
    expect(cue.start).toBe(1.2);
    expect(cue.duration).toBe(0.5);
    expect(cue.text).toBe("");
    expect(cue.index).toBe(0);
    expect(cue.id).toBeTruthy();
  });

  it("tap 두 번 → cue 2개, index 0/1, id 상이", () => {
    let list = addCue(createCueList(), 1.0, 0.5);
    list = addCue(list, 2.0, 0.5);
    expect(list.cues).toHaveLength(2);
    expect(list.cues.map((c) => c.index)).toEqual([0, 1]);
    expect(list.cues[0].id).not.toBe(list.cues[1].id);
  });

  it("start는 소수 3자리로 반올림", () => {
    const list = addCue(createCueList(), 1.23456, 0.5);
    expect(list.cues[0].start).toBe(1.235);
  });

  it("뒤섞인 tap → start 오름차순 정렬 + index 재계산", () => {
    let list = addCue(createCueList(), 3.0, 0.5);
    list = addCue(list, 1.0, 0.5);
    list = addCue(list, 2.0, 0.5);
    const sorted = sortCues(list);
    expect(sorted.cues.map((c) => c.start)).toEqual([1.0, 2.0, 3.0]);
    expect(sorted.cues.map((c) => c.index)).toEqual([0, 1, 2]);
  });

  it("undo → 정렬과 무관하게 가장 최근 추가한 cue 제거", () => {
    let list = addCue(createCueList(), 3.0, 0.5);
    list = addCue(list, 1.0, 0.5); // 가장 최근 추가 (start=1.0)
    const sorted = sortCues(list); // 배열상 마지막은 start=3.0
    const after = undoLast(sorted);
    expect(after.cues).toHaveLength(1);
    expect(after.cues[0].start).toBe(3.0); // 최근 추가분(1.0)이 제거됨
  });

  it("재정렬해도 id 불변, index만 재계산", () => {
    let list = addCue(createCueList(), 3.0, 0.5);
    list = addCue(list, 1.0, 0.5);
    const idOf3 = list.cues[0].id;
    const sorted = sortCues(list);
    const cue3 = sorted.cues.find((c) => c.start === 3.0)!;
    expect(cue3.id).toBe(idOf3);
    expect(cue3.index).toBe(1);
  });

  it("겹침 감지: 이전 cue의 끝보다 먼저 시작하는 cue id 목록", () => {
    let list = addCue(createCueList(), 0.0, 1.0); // 0.0~1.0
    list = addCue(list, 0.5, 1.0); // 0.5 < 1.0 → 겹침
    list = addCue(list, 2.0, 1.0); // 겹침 아님
    const overlaps = detectOverlaps(sortCues(list));
    expect(overlaps).toEqual([list.cues[1].id]);
  });
});
