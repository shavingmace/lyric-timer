// cue: 하나의 타이밍 지점. start/duration은 초 단위.
export interface Cue {
  id: string;
  start: number;
  duration: number;
  text: string;
  index: number;
  // 내부 전용: 추가 순서(undo용). export 시 schema가 제외한다.
  createdSeq: number;
}

export interface CueList {
  cues: Cue[];
  seq: number; // id/createdSeq 발급용 단조 증가 카운터
}

const MS = 1000;

// 초를 밀리초 해상도(소수 3자리)로 반올림
function round3(seconds: number): number {
  return Math.round(seconds * MS) / MS;
}

function reindex(cues: Cue[]): Cue[] {
  return cues.map((cue, index) => ({ ...cue, index }));
}

export function createCueList(): CueList {
  return { cues: [], seq: 0 };
}

export function addCue(list: CueList, start: number, duration: number): CueList {
  const seq = list.seq + 1;
  const cue: Cue = {
    id: `c-${String(seq).padStart(4, "0")}`,
    start: round3(start),
    duration,
    text: "",
    index: list.cues.length,
    createdSeq: seq,
  };
  return { cues: [...list.cues, cue], seq };
}

// start 오름차순 정렬 후 index 재계산. id/createdSeq는 불변.
export function sortCues(list: CueList): CueList {
  const cues = reindex([...list.cues].sort((a, b) => a.start - b.start));
  return { ...list, cues };
}

// 가장 최근 추가한 cue(최대 createdSeq) 제거
export function undoLast(list: CueList): CueList {
  if (list.cues.length === 0) return list;
  let latest = list.cues[0];
  for (const cue of list.cues) {
    if (cue.createdSeq > latest.createdSeq) latest = cue;
  }
  const cues = reindex(list.cues.filter((c) => c.id !== latest.id));
  return { ...list, cues };
}

// t 이후(start >= t)의 cue를 제거하고 index 재계산. seq는 유지(새 id 계속 증가).
export function truncateFrom(list: CueList, t: number): CueList {
  const cues = reindex(list.cues.filter((c) => c.start < t));
  return { ...list, cues };
}

// 이전 cue의 끝(start+duration)보다 먼저 시작하는 cue id 목록 (정렬된 입력 기준)
export function detectOverlaps(list: CueList): string[] {
  const overlaps: string[] = [];
  for (let i = 1; i < list.cues.length; i++) {
    const prev = list.cues[i - 1];
    const cur = list.cues[i];
    if (cur.start < prev.start + prev.duration) overlaps.push(cur.id);
  }
  return overlaps;
}
