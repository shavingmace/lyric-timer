import type { Ctx } from "../state";
import {
  addCue,
  undoLast,
  createCueList,
  sortCues,
  detectOverlaps,
  truncateFrom,
} from "../core/cues";
import { tokenize, distribute } from "../core/tokenize";
import { el, fmtTime } from "./dom";

// UI 로컬 상태 (단일 앱 인스턴스)
const timer = { running: false, startPerf: 0, acc: 0 };
let selectedId: string | null = null;
let recaptureMode: "overwrite" | "insert" = "overwrite";
let scrollToSelected = false;

function timerElapsed(): number {
  return timer.acc + (timer.running ? (performance.now() - timer.startPerf) / 1000 : 0);
}

export function renderEdit(ctx: Ctx): HTMLElement {
  const { state } = ctx;
  const audioEl = state.audio.el;

  const elapsed = (): number => (audioEl ? audioEl.currentTime : timerElapsed());

  // 특정 시각으로 이동 (오디오 seek / 타이머 acc)
  const seekTo = (pos: number): void => {
    if (audioEl) audioEl.currentTime = pos;
    else {
      timer.acc = pos;
      timer.startPerf = performance.now();
    }
  };

  // 타임라인 스케일: 오디오 길이 or (마지막 cue 끝, 현재 elapsed, 1) 중 최대
  const maxEnd = state.cueList.cues.reduce((m, c) => Math.max(m, c.start + c.duration), 0);
  const timelineDuration = (): number =>
    audioEl && audioEl.duration ? audioEl.duration : Math.max(maxEnd, elapsed(), 1);

  const overlaps = new Set(detectOverlaps(sortCues(state.cueList)));

  // 탭 기록
  const tap = (): void => {
    state.cueList = addCue(state.cueList, elapsed(), state.meta.defaultDuration);
    ctx.rerender();
  };

  // 스페이스바 캡처
  const onKey = (e: KeyboardEvent): void => {
    if (e.code === "Space" && (e.target as HTMLElement)?.tagName !== "INPUT" && (e.target as HTMLElement)?.tagName !== "TEXTAREA") {
      e.preventDefault();
      tap();
    }
  };
  document.addEventListener("keydown", onKey);

  // 타임라인 바 + playhead
  const playhead = el("div", { class: "playhead" });
  const markers = state.cueList.cues.map((cue) =>
    el("div", {
      class: cue.id === selectedId ? "marker selected" : overlaps.has(cue.id) ? "marker overlap" : "marker",
      style: `left:${(cue.start / timelineDuration()) * 100}%`,
      title: `${fmtTime(cue.start)} ${cue.text}`,
      onclick: (e) => {
        (e as Event).stopPropagation();
        selectedId = cue.id;
        scrollToSelected = true;
        ctx.rerender();
      },
    }),
  );
  const bar = el("div", {
    class: "timeline",
    onclick: (e) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const frac = ((e as MouseEvent).clientX - rect.left) / rect.width;
      seekTo(Math.max(0, frac) * timelineDuration());
    },
  }, [playhead, ...markers]);

  const timeLabel = el("span", { class: "clock" }, [fmtTime(elapsed())]);

  // 라이브 갱신
  let rafId = 0;
  const loop = (): void => {
    timeLabel.textContent = fmtTime(elapsed());
    playhead.style.left = `${(elapsed() / timelineDuration()) * 100}%`;
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);

  ctx.registerCleanup(() => {
    document.removeEventListener("keydown", onKey);
    cancelAnimationFrame(rafId);
    if (audioEl) audioEl.pause();
    if (timer.running) {
      timer.acc = timerElapsed();
      timer.running = false;
    }
  });

  // 전송 컨트롤
  const transport: (Node | string)[] = [];
  if (audioEl) {
    transport.push(
      el("button", { onclick: () => (audioEl.paused ? void audioEl.play() : audioEl.pause()) }, ["재생/일시정지"]),
      el("button", { onclick: () => { audioEl.pause(); audioEl.currentTime = 0; } }, ["처음으로"]),
    );
  } else {
    transport.push(
      el("button", { onclick: () => { if (!timer.running) { timer.running = true; timer.startPerf = performance.now(); } } }, ["시작"]),
      el("button", { onclick: () => { if (timer.running) { timer.acc = timerElapsed(); timer.running = false; } } }, ["일시정지"]),
    );
  }

  // 재캡처: 모드 토글 + 현재 위치부터 시작
  const modeToggle = el("select", {
    onchange: (e) => (recaptureMode = (e.target as HTMLSelectElement).value as typeof recaptureMode),
  });
  for (const [v, label] of [["overwrite", "덮어쓰기"], ["insert", "삽입"]] as const) {
    const opt = el("option", { value: v }, [label]);
    if (recaptureMode === v) opt.selected = true;
    modeToggle.append(opt);
  }
  const recapture = el("button", {
    onclick: () => {
      const pos = elapsed();
      if (recaptureMode === "overwrite") state.cueList = truncateFrom(sortCues(state.cueList), pos);
      if (audioEl) void audioEl.play();
      else { timer.acc = pos; timer.startPerf = performance.now(); timer.running = true; }
      ctx.rerender();
    },
  }, ["여기서 재캡처"]);

  // 가사 분배 (매핑에서 이관)
  const pasteArea = el("textarea", { rows: 2, placeholder: "전체 가사 붙여넣고 '분배'" });
  const applyDistribute = (): void => {
    const r = distribute(tokenize(pasteArea.value, state.meta.unit), state.cueList);
    state.cueList = { ...state.cueList, cues: r.cues };
    if (r.leftover.length) alert(`토큰 ${r.leftover.length}개 남음: ${r.leftover.join(" ")}`);
    else if (r.emptyCount) alert(`빈 cue ${r.emptyCount}개`);
    ctx.rerender();
  };

  // 가사조각 목록 (매핑에서 이관, 선택 하이라이트 추가)
  let selectedRow: HTMLElement | null = null;
  let selectedText: HTMLInputElement | null = null;
  const rows = state.cueList.cues.map((cue) => {
    const startInput = el("input", { type: "number", step: "0.001", value: String(cue.start), oninput: (e) => (cue.start = parseFloat((e.target as HTMLInputElement).value) || 0) });
    const durInput = el("input", { type: "number", step: "0.05", value: String(cue.duration), oninput: (e) => (cue.duration = parseFloat((e.target as HTMLInputElement).value) || 0) });
    const textInput = el("input", { type: "text", value: cue.text, placeholder: "가사 조각", oninput: (e) => (cue.text = (e.target as HTMLInputElement).value) });
    const del = el("button", { onclick: () => { state.cueList = { ...state.cueList, cues: state.cueList.cues.filter((c) => c.id !== cue.id).map((c, i) => ({ ...c, index: i })) }; ctx.rerender(); } }, ["✕"]);
    const cls = cue.id === selectedId ? "cue-row selected" : overlaps.has(cue.id) ? "cue-row overlap" : "cue-row";
    const row = el("div", { class: cls, onclick: () => { selectedId = cue.id; ctx.rerender(); } }, [
      el("span", { class: "idx" }, [String(cue.index)]), startInput, durInput, textInput, del,
    ]);
    if (cue.id === selectedId) { selectedRow = row; selectedText = textInput; }
    return row;
  });

  // 선택 마커 클릭 시 해당 행으로 스크롤 + 포커스
  if (scrollToSelected && selectedRow) {
    const r = selectedRow as HTMLElement;
    const t = selectedText as HTMLInputElement | null;
    requestAnimationFrame(() => { r.scrollIntoView({ block: "center" }); t?.focus(); });
    scrollToSelected = false;
  }

  return el("section", {}, [
    el("h2", {}, ["2. 캡처 + 편집"]),
    el("p", { class: "hint" }, [state.audio.fileName ? `오디오: ${state.audio.fileName}` : "오디오 없음 — 시작 버튼 기준 경과시간"]),
    el("div", { class: "controls" }, transport),
    bar,
    el("div", { class: "clock-row" }, [timeLabel, " ", el("span", {}, [`${state.cueList.cues.length} cue`])]),
    el("div", { class: "tap-zone", tabindex: "0", onclick: tap }, ["여기 또는 스페이스바로 탭"]),
    el("div", { class: "controls" }, ["재캡처 모드", modeToggle, recapture]),
    el("div", { class: "distribute" }, [pasteArea, el("button", { onclick: applyDistribute }, ["가사 분배"]), el("button", { onclick: () => { state.cueList = sortCues(state.cueList); ctx.rerender(); } }, ["start순 정렬"])]),
    el("div", { class: "cue-head" }, [el("span", {}, ["#"]), el("span", {}, ["start"]), el("span", {}, ["dur"]), el("span", {}, ["가사"]), el("span", {}, [""])]),
    el("div", { class: "cue-list" }, rows.length ? rows : [el("p", { class: "hint" }, ["cue가 없습니다. 탭하세요."])]),
    overlaps.size ? el("p", { class: "warn" }, [`겹치는 cue ${overlaps.size}개(노랑).`]) : "",
    el("div", { class: "actions" }, [
      el("button", { onclick: () => { state.cueList = undoLast(state.cueList); ctx.rerender(); } }, ["↶ 마지막 탭 취소"]),
      el("button", { onclick: () => { if (confirm("모든 cue 삭제?")) { state.cueList = createCueList(); ctx.rerender(); } } }, ["전체 초기화"]),
      el("button", { onclick: () => ctx.go("setup") }, ["← 설정"]),
      el("button", { class: "primary", onclick: () => ctx.go("export") }, ["다음: Export →"]),
    ]),
  ]);
}
