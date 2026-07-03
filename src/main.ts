import { createInitialState, type Ctx, type Stage } from "./state";
import { renderSetup } from "./ui/stage-setup";
import { renderEdit } from "./ui/stage-edit";
import { renderExport } from "./ui/stage-export";
import { el } from "./ui/dom";
import "./style.css";

const state = createInitialState();
let cleanups: (() => void)[] = [];

const STAGES: { key: Stage; label: string }[] = [
  { key: "setup", label: "설정" },
  { key: "edit", label: "캡처+편집" },
  { key: "export", label: "Export" },
];

const RENDERERS: Record<Stage, (ctx: Ctx) => HTMLElement> = {
  setup: renderSetup,
  edit: renderEdit,
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
