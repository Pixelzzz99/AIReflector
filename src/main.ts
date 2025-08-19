import {
  App,
  MarkdownView,
  Notice,
  Plugin,
  TFile,
  WorkspaceLeaf,
  requestUrl,
} from "obsidian";
import {
  AIReflectSettings,
  DEFAULT_SETTINGS,
  AIReflectSettingTab,
} from "./settings";
import { AdviceView, VIEW_TYPE_ADVICE } from "./ui/AdviceView";
import { buildPrompt } from "./prompts";

export default class AIReflectPlugin extends Plugin {
  settings!: AIReflectSettings;

  async onload() {
    await this.loadSettings();

    this.registerView(
      VIEW_TYPE_ADVICE,
      (leaf: WorkspaceLeaf) => new AdviceView(leaf)
    );

    this.addRibbonIcon("bot", "Analyze current note (AI)", async () => {
      await this.analyzeActiveNote();
    });

    this.addCommand({
      id: "ai-reflect-analyze-active-note",
      name: "Analyze current note",
      callback: async () => {
        await this.analyzeActiveNote();
      },
    });

    this.addCommand({
      id: "ai-reflect-batch-folder",
      name: "Analyze all notes in folder...",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return false;
        if (!checking) this.batchAnalyzeFolder(file.parent?.path || "/");
        return true;
      },
    });

    this.addSettingTab(new AIReflectSettingTab(this.app, this));

    this.registerEvent(
      this.app.vault.on("modify", (f) => {
        if (
          this.settings.autoOnSave &&
          f instanceof TFile &&
          f.extension === "md"
        ) {
          this.queueAnalyze(f);
        }
      })
    );

    new Notice("AI Reflect loaded");
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_ADVICE);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }

  private debounceTimer: number | null = null;
  private queued: Set<string> = new Set();

  private queueAnalyze(file: TFile) {
    this.queued.add(file.path);
    if (this.debounceTimer) window.clearTimeout(this.debounceTimer);
    this.debounceTimer = window.setTimeout(async () => {
      for (const p of this.queued) {
        const f = this.app.vault.getAbstractFileByPath(p);
        if (f instanceof TFile) await this.runAnalysis(f);
      }

      this.queued.clear();
      this.debounceTimer = null;
    }, this.settings.autoDelayMs);
  }

  private async analyzeActiveNote() {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view || !view.file) return new Notice("Open a markdown note first");
    await this.runAnalysis(view.file);
  }

  private async batchAnalyzeFolder(folderPath: string) {
    const files = this.app.vault
      .getMarkdownFiles()
      .filter((f) => f.path.startsWith(folderPath));
    if (files.length === 0) return new Notice("No notes is folder");
    for (const f of files) {
      await this.runAnalysis(f);
    }

    new Notice(`Analyzed ${files.length} notes`);
  }

  private async runAnalysis(file: TFile) {
    try {
      const content = await this.app.vault.read(file);
      const metadata = this.app.metadataCache.getFileCache(file);

      const maxChars = this.settings.maxChars;

      const snippet =
        content.length > maxChars ? content.slice(-maxChars) : content;

      const prompt = buildPrompt({
        noteTitle: file.basename,
        notePath: file.path,
        noteContent: snippet,
        tags: metadata?.frontmatter?.tags ?? metadata?.frontmatter?.tag ?? [],
        goals: this.settings.goals,
        persona: this.settings.persona,
      });

      const body: any = {
        input: prompt,
        model: this.settings.model,
        temperature: this.settings.temperature,
        stream: false,
      };

      const url = this.settings.endpointUrl.replace(/\/$/, "");
      const resp = await requestUrl({
        url: `${url}/analyze`,
        method: "POST",
        contentType: "application/json",
        body: JSON.stringify(body),
        headers: this.settings.apiKey
          ? { Authorization: `Bearer ${this.settings.apiKey}` }
          : {},
        throw: true,
      });
      if (resp.status >= 400) throw new Error(`Gateway error ${resp.status}`);
      const data = resp.json as {
        adviceMd: string;
        score?: number;
        actions?: string[];
      };
      await this.activateAdviceView();
      const view = this.app.workspace.getLeavesOfType(VIEW_TYPE_ADVICE)[0]
        .view as AdviceView;

      view.setAdvice({
        sourcePath: file.path,
        adviceMd: data.adviceMd,
        score: data.score,
        actions: data.actions || [],
      });

      if (this.settings.appendToNote) {
        const block = `\n\n> AI Reflection (${new Date().toISOString()}):\n>\n${
          data.adviceMd
        }\n`;
        await this.app.vault.append(file, block);
      }

      new Notice("AI advice updated");
    } catch (e: any) {
      console.error(e);
      new Notice(`AI Reflect error: ${e.message || e}`);
    }
  }

  async activateAdviceView() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_ADVICE);
    await this.app.workspace
      .getRightLeaf(false)
      ?.setViewState({ type: VIEW_TYPE_ADVICE, active: true });
    this.app.workspace.revealLeaf(
      this.app.workspace.getLeavesOfType(VIEW_TYPE_ADVICE)[0]
    );
  }
}
