import type { Ctx } from "../state";
import { addCue, undoLast, createCueList } from "../core/cues";
import { el, fmtTime } from "./dom";

// 무오디오 타이머 상태 (모듈 단일 인스턴스)
const timer = { running: false, startPerf: 0, acc: 0 };

function timerElapsed(): number {
  return timer.acc + (timer.running ? (performance.now() - timer.startPerf) / 1000 : 0);
}

function resetTimer(): void {
  timer.running = false;
  timer.startPerf = 0;
  timer.acc = 0;
}

export function renderCapture(ctx: Ctx): HTMLElement {
  const { state } = ctx;
  const audioEl = state.audio.el;

  // 현재 경과초: 오디오가 있으면 currentTime, 없으면 타이머
  const elapsed = (): number => (audioEl ? audioEl.currentTime : timerElapsed());

  const timeLabel = el("span", { class: "clock" }, [fmtTime(elapsed())]);
  const countLabel = el("span", {}, [`${state.cueList.cues.length} cue`]);

  // 탭 기록
  const tap = (): void => {
    state.cueList = addCue(state.cueList, elapsed(), state.meta.defaultDuration);
    countLabel.textContent = `${state.cueList.cues.length} cue`;
  };

  // 스페이스바 캡처 (스크롤/버튼 활성화 방지)
  const onKey = (e: KeyboardEvent): void => {
    if (e.code === "Space") {
      e.preventDefault();
      tap();
    }
  };
  document.addEventListener("keydown", onKey);

  // 라이브 시간 표시
  let rafId = 0;
  const loop = (): void => {
    timeLabel.textContent = fmtTime(elapsed());
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);

  ctx.registerCleanup(() => {
    document.removeEventListener("keydown", onKey);
    cancelAnimationFrame(rafId);
    if (audioEl) audioEl.pause();
    timer.running = false;
    if (timer.startPerf) {
      timer.acc = timerElapsed();
      timer.startPerf = 0;
    }
  });

  // 컨트롤: 오디오 vs 타이머
  const controls: (Node | string)[] = [];
  if (audioEl) {
    controls.push(
      el("button", {
        onclick: () => (audioEl.paused ? void audioEl.play() : audioEl.pause()),
      }, ["재생/일시정지"]),
      el("button", { onclick: () => { audioEl.pause(); audioEl.currentTime = 0; } }, ["처음으로"]),
    );
    const rate = el("select", {
      onchange: (e) => (audioEl.playbackRate = parseFloat((e.target as HTMLSelectElement).value)),
    });
    for (const r of ["0.5", "0.75", "1"]) {
      const opt = el("option", { value: r }, [`${r}x`]);
      if (r === "1") opt.selected = true;
      rate.append(opt);
    }
    controls.push(el("label", {}, ["속도", rate]));
  } else {
    controls.push(
      el("button", {
        onclick: () => {
          if (!timer.running) {
            timer.running = true;
            timer.startPerf = performance.now();
          }
        },
      }, ["시작"]),
      el("button", {
        onclick: () => {
          if (timer.running) {
            timer.acc = timerElapsed();
            timer.running = false;
          }
        },
      }, ["일시정지"]),
      el("button", { onclick: () => { resetTimer(); ctx.rerender(); } }, ["시계 초기화"]),
    );
  }

  return el("section", {}, [
    el("h2", {}, ["2. 캡처"]),
    el("p", { class: "hint" }, [
      state.audio.fileName
        ? `오디오: ${state.audio.fileName}`
        : "오디오 없음 — 시작 버튼 기준 경과시간",
    ]),
    el("div", { class: "controls" }, controls),
    el("div", { class: "clock-row" }, [timeLabel, " ", countLabel]),
    el("div", { class: "tap-zone", tabindex: "0", onclick: tap }, [
      "여기 또는 스페이스바로 탭",
    ]),
    el("div", { class: "actions" }, [
      el("button", { onclick: () => { state.cueList = undoLast(state.cueList); ctx.rerender(); } }, ["↶ 마지막 탭 취소"]),
      el("button", {
        onclick: () => {
          if (confirm("모든 cue를 삭제할까요?")) {
            state.cueList = createCueList();
            ctx.rerender();
          }
        },
      }, ["전체 초기화"]),
      el("button", { onclick: () => ctx.go("setup") }, ["← 설정"]),
      el("button", { class: "primary", onclick: () => ctx.go("map") }, ["다음: 매핑 →"]),
    ]),
  ]);
}
