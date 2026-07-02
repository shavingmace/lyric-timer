import type { Ctx } from "../state";
import { parse } from "../core/schema";
import { el } from "./dom";

// 오디오 파일을 상태에 로드하고 duration을 읽는다.
function loadAudio(ctx: Ctx, file: File): void {
  const url = URL.createObjectURL(file);
  const audioEl = new Audio(url);
  ctx.state.audio = { url, fileName: file.name, el: audioEl, duration: null };
  ctx.state.meta.hasAudio = true;
  ctx.state.meta.audioFileName = file.name;
  audioEl.addEventListener("loadedmetadata", () => {
    ctx.state.audio.duration = audioEl.duration;
    ctx.state.meta.totalDuration = Math.round(audioEl.duration * 1000) / 1000;
    ctx.rerender();
  });
  ctx.rerender();
}

// 기존 JSON을 import 하여 상태를 복원하고 매핑 단계로 이동한다.
async function importJson(ctx: Ctx, file: File): Promise<void> {
  try {
    const doc = JSON.parse(await file.text());
    const restored = parse(doc);
    ctx.state.meta = restored.meta;
    ctx.state.cueList = restored.cueList;
    ctx.go("map");
  } catch (err) {
    alert(`import 실패: ${(err as Error).message}`);
  }
}

export function renderSetup(ctx: Ctx): HTMLElement {
  const m = ctx.state.meta;

  const titleInput = el("input", {
    type: "text",
    value: m.title,
    placeholder: "곡 제목",
    oninput: (e) => (m.title = (e.target as HTMLInputElement).value),
  });

  const unitSelect = el("select", {
    onchange: (e) =>
      (m.unit = (e.target as HTMLSelectElement).value as typeof m.unit),
  });
  for (const [value, label] of [
    ["syllable", "음절"],
    ["word", "단어"],
  ] as const) {
    const opt = el("option", { value }, [label]);
    if (m.unit === value) opt.selected = true;
    unitSelect.append(opt);
  }

  const durationInput = el("input", {
    type: "number",
    step: "0.1",
    min: "0.05",
    value: String(m.defaultDuration),
    oninput: (e) =>
      (m.defaultDuration =
        parseFloat((e.target as HTMLInputElement).value) || 0.5),
  });

  const audioInput = el("input", {
    type: "file",
    accept: "audio/*",
    onchange: (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (f) loadAudio(ctx, f);
    },
  });

  const jsonInput = el("input", {
    type: "file",
    accept: "application/json,.json",
    onchange: (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (f) void importJson(ctx, f);
    },
  });

  const audioStatus = ctx.state.audio.fileName
    ? `선택됨: ${ctx.state.audio.fileName}`
    : "오디오 없이 진행 가능";

  return el("section", {}, [
    el("h2", {}, ["1. 설정"]),
    el("label", {}, ["곡 제목", titleInput]),
    el("label", {}, ["타이밍 단위", unitSelect]),
    el("label", {}, ["기본 지속시간(초)", durationInput]),
    el("label", {}, ["오디오 파일 (선택)", audioInput]),
    el("p", { class: "hint" }, [audioStatus]),
    el("label", {}, ["기존 JSON 불러오기 (선택)", jsonInput]),
    el("div", { class: "actions" }, [
      el("button", { class: "primary", onclick: () => ctx.go("capture") }, [
        "다음: 캡처 →",
      ]),
    ]),
  ]);
}
