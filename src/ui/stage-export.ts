import type { Ctx } from "../state";
import { serialize, type ProjectState } from "../core/schema";
import { detectOverlaps, sortCues } from "../core/cues";
import { el } from "./dom";

export function renderExport(ctx: Ctx): HTMLElement {
  const { state } = ctx;
  const doc = serialize(state as ProjectState, new Date().toISOString());
  const json = JSON.stringify(doc, null, 2);

  const emptyCount = doc.cues.filter((c) => c.text.trim() === "").length;
  const overlapCount = detectOverlaps(sortCues(state.cueList)).length;

  const download = (): void => {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const name = (state.meta.title || "lyric-timing").replace(/\s+/g, "-");
    const a = el("a", { href: url, download: `${name}.lyrictiming.json` });
    a.click();
    URL.revokeObjectURL(url);
  };

  const copy = async (): Promise<void> => {
    await navigator.clipboard.writeText(json);
    alert("클립보드에 복사되었습니다.");
  };

  const warnings: (Node | string)[] = [];
  if (emptyCount > 0) warnings.push(el("li", { class: "warn" }, [`빈 가사 cue ${emptyCount}개`]));
  if (overlapCount > 0) warnings.push(el("li", { class: "warn" }, [`겹치는 cue ${overlapCount}개`]));
  if (warnings.length === 0) warnings.push(el("li", { class: "ok" }, ["문제 없음"]));

  return el("section", {}, [
    el("h2", {}, ["4. Export"]),
    el("ul", { class: "summary" }, [
      el("li", {}, [`cue ${doc.cues.length}개`]),
      ...warnings,
    ]),
    el("div", { class: "actions" }, [
      el("button", { class: "primary", onclick: download }, ["JSON 다운로드"]),
      el("button", { onclick: () => void copy() }, ["클립보드 복사"]),
      el("button", { onclick: () => ctx.go("edit") }, ["← 캡처+편집"]),
    ]),
    el("pre", { class: "json" }, [json]),
  ]);
}
