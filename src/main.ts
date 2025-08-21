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
import { SmartAdviceView, VIEW_TYPE_ADVICE } from "./ui/AutoAnalysisView";
import { buildPrompt } from "./enhanced-prompts";
import { SmartTagsAnalyzer } from "./analysis/SmartTagsAnalyzer";
import { SmartConnectionsAnalyzer } from "./analysis/SmartConnectionsAnalyzer";

export default class AIReflectPlugin extends Plugin {
  settings!: AIReflectSettings;
  private smartTags: SmartTagsAnalyzer;
  private smartConnections: SmartConnectionsAnalyzer;

  async onload() {
    await this.loadSettings();

    // Инициализируем анализаторы
    this.smartTags = new SmartTagsAnalyzer();
    this.smartConnections = new SmartConnectionsAnalyzer(this.app);

    this.registerView(
      VIEW_TYPE_ADVICE,
      (leaf: WorkspaceLeaf) => new SmartAdviceView(leaf, this.app, this)
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

  async analyzeActiveNote() {
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
      // Сначала активируем панель и показываем индикатор загрузки
      await this.activateAdviceView();
      const view = this.app.workspace.getLeavesOfType(VIEW_TYPE_ADVICE)[0]
        .view as SmartAdviceView;
      view.showLoading();

      const content = await this.app.vault.read(file);
      const metadata = this.app.metadataCache.getFileCache(file);

      // Анализируем контент с помощью умных анализаторов
      console.log('🧠 Running smart analysis...');
      const contentAnalysis = this.smartTags.analyzeContent(content);
      const suggestions = await this.smartConnections.getSuggestions(content, 3);

      console.log('📊 Smart analysis results:', {
        tags: contentAnalysis.suggestedTags,
        emotionalTone: contentAnalysis.emotionalTone,
        contentType: contentAnalysis.contentType,
        suggestions: suggestions.length
      });

      const maxChars = this.settings.maxChars;

      const snippet =
        content.length > maxChars ? content.slice(-maxChars) : content;

      const prompt = buildPrompt({
        noteTitle: file.basename,
        notePath: file.path,
        noteContent: snippet,
        tags: contentAnalysis.suggestedTags, // Используем умные теги вместо метаданных
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
      
      // Передаём данные анализа в SmartAdviceView с умными тегами
      view.updateAdvice({
        prompt: snippet.substring(0, 200) + (snippet.length > 200 ? '...' : ''),
        response: data.adviceMd,
        persona: contentAnalysis.contentType, // Используем тип контента как персону
        timestamp: Date.now(),
        tags: contentAnalysis.suggestedTags, // Умные теги
        emotionalTone: contentAnalysis.emotionalTone.tone, // Эмоциональный тон
        suggestions: suggestions.map(s => s.file), // Связанные заметки
        sourceFile: file.path,
        keyConcepts: contentAnalysis.keyConcepts, // Ключевые концепции
        contentType: contentAnalysis.contentType // Тип контента
      });
      console.log('✅ SmartAdviceView updated with smart analysis data');

      if (this.settings.appendToNote) {
        const block = `\n\n> AI Reflection (${new Date().toISOString()}):\n>\n${
          data.adviceMd
        }\n`;
        await this.app.vault.append(file, block);
      }

      new Notice("AI advice updated");
    } catch (e: any) {
      console.error(e);
      
      // Сбрасываем состояние загрузки и показываем ошибку
      const view = this.app.workspace.getLeavesOfType(VIEW_TYPE_ADVICE)[0]?.view as SmartAdviceView;
      if (view) {
        view.updateAdvice({
          prompt: 'Ошибка анализа',
          response: `Произошла ошибка при анализе: ${e.message || e}\n\nПроверьте подключение к серверу и настройки API.`,
          persona: 'error',
          timestamp: Date.now(),
          tags: [],
          emotionalTone: 'neutral',
          sourceFile: file?.path || ''
        });
      }
      
      new Notice(`AI Reflect error: ${e.message || e}`);
    }
  }

  async activateAdviceView() {
    // Проверяем, есть ли уже активная панель
    const existingLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_ADVICE);
    
    if (existingLeaves.length > 0) {
      // Если панель уже существует, просто активируем её
      this.app.workspace.revealLeaf(existingLeaves[0]);
      return;
    }

    // Создаём новую панель только если её нет
    await this.app.workspace
      .getRightLeaf(false)
      ?.setViewState({ type: VIEW_TYPE_ADVICE, active: true });
      
    const newLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_ADVICE);
    if (newLeaves.length > 0) {
      this.app.workspace.revealLeaf(newLeaves[0]);
    }
  }
}
