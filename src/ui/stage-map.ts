import type { Ctx } from "../state";
import { sortCues, detectOverlaps } from "../core/cues";
import { tokenize, distribute } from "../core/tokenize";
import { el } from "./dom";

export function renderMap(ctx: Ctx): HTMLElement {
  const { state } = ctx;

  // (B) 전체 가사 붙여넣기 → 토큰화 → 분배
  const pasteArea = el("textarea", {
    rows: 3,
    placeholder: "전체 가사를 붙여넣고 아래 '분배'를 누르세요",
  });
  const applyDistribute = (): void => {
    const tokens = tokenize(pasteArea.value, state.meta.unit);
    const r = distribute(tokens, state.cueList);
    state.cueList = { ...state.cueList, cues: r.cues };
    if (r.leftover.length > 0) {
      alert(`토큰 ${r.leftover.length}개가 남았습니다: ${r.leftover.join(" ")}`);
    } else if (r.emptyCount > 0) {
      alert(`가사가 부족해 빈 cue ${r.emptyCount}개가 남았습니다.`);
    }
    ctx.rerender();
  };

  const overlaps = new Set(detectOverlaps(state.cueList));

  // (A) cue별 편집 행
  const rows = state.cueList.cues.map((cue) => {
    const startInput = el("input", {
      type: "number",
      step: "0.001",
      value: String(cue.start),
      oninput: (e) => (cue.start = parseFloat((e.target as HTMLInputElement).value) || 0),
    });
    const durInput = el("input", {
      type: "number",
      step: "0.05",
      value: String(cue.duration),
      oninput: (e) => (cue.duration = parseFloat((e.target as HTMLInputElement).value) || 0),
    });
    const textInput = el("input", {
      type: "text",
      value: cue.text,
      placeholder: "가사 조각",
      oninput: (e) => (cue.text = (e.target as HTMLInputElement).value),
    });
    const del = el("button", {
      onclick: () => {
        state.cueList = { ...state.cueList, cues: state.cueList.cues.filter((c) => c.id !== cue.id).map((c, i) => ({ ...c, index: i })) };
        ctx.rerender();
      },
    }, ["✕"]);
    return el("div", { class: overlaps.has(cue.id) ? "cue-row overlap" : "cue-row" }, [
      el("span", { class: "idx" }, [String(cue.index)]),
      startInput,
      durInput,
      textInput,
      del,
    ]);
  });

  return el("section", {}, [
    el("h2", {}, ["3. 매핑"]),
    el("div", { class: "distribute" }, [
      pasteArea,
      el("button", { onclick: applyDistribute }, ["가사 분배"]),
    ]),
    el("div", { class: "actions" }, [
      el("button", { onclick: () => { state.cueList = sortCues(state.cueList); ctx.rerender(); } }, ["start순 정렬"]),
    ]),
    el("div", { class: "cue-head" }, [
      el("span", {}, ["#"]),
      el("span", {}, ["start(초)"]),
      el("span", {}, ["duration(초)"]),
      el("span", {}, ["가사"]),
      el("span", {}, [""]),
    ]),
    el("div", { class: "cue-list" }, rows.length ? rows : [el("p", { class: "hint" }, ["cue가 없습니다. 캡처 단계에서 탭하세요."])]),
    overlaps.size ? el("p", { class: "warn" }, [`겹치는 cue ${overlaps.size}개(빨강). start/duration을 조정하세요.`]) : "",
    el("div", { class: "actions" }, [
      el("button", { onclick: () => ctx.go("capture") }, ["← 캡처"]),
      el("button", { class: "primary", onclick: () => ctx.go("export") }, ["다음: Export →"]),
    ]),
  ]);
}
