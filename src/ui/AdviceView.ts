import { ItemView, WorkspaceLeaf, MarkdownRenderer } from "obsidian";

export const VIEW_TYPE_ADVICE = "ai-reflect-advice";

export class AdviceView extends ItemView {
  private container!: HTMLElement;
  private _state: {
    sourcePath?: string;
    adviceMd?: string;
    score?: number;
    actions?: string[];
  } = {};

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType() {
    return VIEW_TYPE_ADVICE;
  }
  getDisplayText() {
    return "AI Advice";
  }
  getIcon() {
    return "bot";
  }

  async onOpen() {
    this.container = this.contentEl.createDiv({ cls: "ai-reflect-view" });
    this.render();
  }

  setAdvice(state: {
    sourcePath: string;
    adviceMd: string;
    score?: number;
    actions?: string[];
  }) {
    this._state = state;
    this.render();
  }

  private async render() {
    if (!this.container) return;
    this.container.empty();

    const header = this.container.createEl("div", { cls: "ai-reflect-header" });
    header.createEl("div", {
      text: this._state.sourcePath || "No note",
      cls: "ai-reflect-path",
    });
    if (this._state.score !== undefined)
      header.createEl("div", { text: `Score: ${this._state.score}/100` });

    const body = this.container.createEl("div", { cls: "ai-reflect-body" });
    const md = this._state.adviceMd || "No advice yet";
    await MarkdownRenderer.renderMarkdown(md, body, "/", this);

    if (this._state.actions && this._state.actions.length) {
      const list = this.container.createEl("ul", { cls: "ai-reflect-actions" });
      this._state.actions.forEach((a) => list.createEl("li", { text: a }));
    }
  }
}
