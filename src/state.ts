import { createCueList, type CueList } from "./core/cues";
import type { ProjectMeta } from "./core/schema";

export type Stage = "setup" | "edit" | "export";

// 런타임 오디오 상태 (직렬화되지 않음)
export interface AudioState {
  url: string | null; // object URL
  fileName: string | null;
  el: HTMLAudioElement | null;
  duration: number | null; // 초
}

export interface AppState {
  stage: Stage;
  meta: ProjectMeta;
  cueList: CueList;
  audio: AudioState;
}

function nowISO(): string {
  return new Date().toISOString();
}

export function createInitialState(): AppState {
  const ts = nowISO();
  return {
    stage: "setup",
    meta: {
      title: "",
      unit: "syllable",
      hasAudio: false,
      defaultDuration: 0.5,
      createdAt: ts,
      updatedAt: ts,
    },
    cueList: createCueList(),
    audio: { url: null, fileName: null, el: null, duration: null },
  };
}

// 렌더 컨텍스트: 각 stage 렌더러에 전달
export interface Ctx {
  state: AppState;
  go(stage: Stage): void;
  rerender(): void;
  // 다음 렌더 직전에 호출될 정리 함수 등록 (rAF/이벤트 리스너 해제 등)
  registerCleanup(fn: () => void): void;
}
