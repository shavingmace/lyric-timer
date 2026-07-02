import type { Cue, CueList } from "./cues";

export const SCHEMA_VERSION = "1.0";

export type Unit = "syllable" | "word";

export interface ProjectMeta {
  title: string;
  unit: Unit;
  hasAudio: boolean;
  audioFileName?: string;
  defaultDuration: number;
  totalDuration?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectState {
  meta: ProjectMeta;
  cueList: CueList;
}

// export 대상 cue (내부 createdSeq 제외)
export interface ExportCue {
  id: string;
  start: number;
  duration: number;
  text: string;
  index: number;
}

export interface ExportDoc {
  version: string;
  meta: ProjectMeta;
  cues: ExportCue[];
}

// 상태 → export 문서. updatedAt은 호출측이 주입한 시각(ISO)으로 설정.
export function serialize(state: ProjectState, nowISO: string): ExportDoc {
  return {
    version: SCHEMA_VERSION,
    meta: { ...state.meta, updatedAt: nowISO },
    cues: state.cueList.cues.map((c) => ({
      id: c.id,
      start: c.start,
      duration: c.duration,
      text: c.text,
      index: c.index,
    })),
  };
}

function isExportCue(value: unknown): value is ExportCue {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.id === "string" &&
    typeof c.start === "number" &&
    typeof c.duration === "number" &&
    typeof c.text === "string" &&
    typeof c.index === "number"
  );
}

// export 문서 → 상태. 형식 오류 시 throw.
export function parse(input: unknown): ProjectState {
  if (typeof input !== "object" || input === null) {
    throw new Error("문서가 객체가 아닙니다");
  }
  const doc = input as Record<string, unknown>;
  if (doc.version !== SCHEMA_VERSION) {
    throw new Error(`지원하지 않는 version: ${String(doc.version)}`);
  }
  if (!Array.isArray(doc.cues)) {
    throw new Error("cues는 배열이어야 합니다");
  }
  const cues: Cue[] = doc.cues.map((raw, i) => {
    if (!isExportCue(raw)) throw new Error(`cue[${i}] 형식 오류`);
    return { ...raw, createdSeq: i + 1 };
  });
  const cueList: CueList = { cues, seq: cues.length };
  return { meta: doc.meta as ProjectMeta, cueList };
}
