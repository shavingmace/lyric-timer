import { createInitialState, type Ctx, type Stage } from "./state";
import { renderSetup } from "./ui/stage-setup";
import { renderCapture } from "./ui/stage-capture";
import { renderMap } from "./ui/stage-map";
import { renderExport } from "./ui/stage-export";
import { el } from "./ui/dom";
import "./style.css";

const state = createInitialState();
let cleanups: (() => void)[] = [];

const STAGES: { key: Stage; label: string }[] = [
  { key: "setup", label: "설정" },
  { key: "capture", label: "캡처" },
  { key: "map", label: "매핑" },
  { key: "export", label: "Export" },
];

const RENDERERS: Record<Stage, (ctx: Ctx) => HTMLElement> = {
  setup: renderSetup,
  capture: renderCapture,
  map: renderMap,
  export: renderExport,
};

const root = document.getElementById("app")!;

const ctx: Ctx = {
  state,
  go(stage) {
    state.stage = stage;
    render();
  },
  rerender: () => render(),
  registerCleanup: (fn) => cleanups.push(fn),
};

function renderNav(): HTMLElement {
  return el(
    "nav",
    {},
    STAGES.map(({ key, label }) =>
      el("button", {
        class: state.stage === key ? "tab active" : "tab",
        onclick: () => ctx.go(key),
      }, [label]),
    ),
  );
}

function render(): void {
  for (const fn of cleanups) fn();
  cleanups = [];
  root.replaceChildren(renderNav(), RENDERERS[state.stage](ctx));
}

render();
