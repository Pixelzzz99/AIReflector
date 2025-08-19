import { App, PluginSettingTab, Setting } from "obsidian";
import type AIReflectPlugin from "./main";

export interface AIReflectSettings {
  endpointUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  autoOnSave: boolean;
  autoDelayMs: number;
  maxChars: number;
  appendToNote: boolean;
  persona: string;
  goals: string;
}

export const DEFAULT_SETTINGS: AIReflectSettings = {
  endpointUrl: "http://localhost:8787",
  apiKey: "",
  model: "claude-3-5-sonnet-20241022",
  temperature: 0.3,
  autoOnSave: false,
  autoDelayMs: 1200,
  maxChars: 6000,
  appendToNote: false,
  persona: "Практичный, добрый коуч; краткий, избегающий лишних слов; действенный",
  goals: "",
};

export class AIReflectSettingTab extends PluginSettingTab {
  plugin: AIReflectPlugin;

  constructor(app: App, plugin: AIReflectPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "AI Reflect — Settings" });

    new Setting(containerEl)
      .setName("Endpoint URL")
      .setDesc("Your AI gateway (local or cloud). We'll POST /analyze.")
      .addText((t) =>
        t.setValue(this.plugin.settings.endpointUrl).onChange(async (v) => {
          this.plugin.settings.endpointUrl = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("API Key")
      .setDesc("Optional Bearer token header for your gateway")
      .addText((t) =>
        t
          .setPlaceholder("sk-...")
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (v) => {
            this.plugin.settings.apiKey = v;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Model")
      .setDesc("OpenAI: gpt-4o, gpt-4-turbo, gpt-3.5-turbo | Claude: claude-3-5-sonnet-20241022, claude-3-haiku-20240307")
      .addText((t) =>
        t.setValue(this.plugin.settings.model).onChange(async (v) => {
          this.plugin.settings.model = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl).setName("Temperature").addSlider((s) =>
      s
        .setLimits(0, 1, 0.1)
        .setValue(this.plugin.settings.temperature)
        .onChange(async (v) => {
          this.plugin.settings.temperature = v;
          await this.plugin.saveSettings();
        })
    );

    new Setting(containerEl).setName("Analyze on save").addToggle((t) =>
      t.setValue(this.plugin.settings.autoOnSave).onChange(async (v) => {
        this.plugin.settings.autoOnSave = v;
        await this.plugin.saveSettings();
      })
    );

    new Setting(containerEl).setName("Debounce (ms)").addText((t) =>
      t
        .setValue(String(this.plugin.settings.autoDelayMs))
        .onChange(async (v) => {
          this.plugin.settings.autoDelayMs = Number(v) || 1200;
          await this.plugin.saveSettings();
        })
    );

    new Setting(containerEl)
      .setName("Max note chars")
      .setDesc(
        "We send only the last N characters to the model to protect privacy and fit token limits."
      )
      .addText((t) =>
        t
          .setValue(String(this.plugin.settings.maxChars))
          .onChange(async (v) => {
            this.plugin.settings.maxChars = Math.max(1000, Number(v) || 6000);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl).setName("Append advice to note").addToggle((t) =>
      t.setValue(this.plugin.settings.appendToNote).onChange(async (v) => {
        this.plugin.settings.appendToNote = v;
        await this.plugin.saveSettings();
      })
    );

    new Setting(containerEl)
      .setName("Persona")
      .setDesc("Инструкция для тона и роли ИИ-коуча. ИИ будет отвечать на том же языке, что и ваша заметка.")
      .addTextArea((ta) =>
        ta.setValue(this.plugin.settings.persona).onChange(async (v) => {
          this.plugin.settings.persona = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Your goals / focus")
      .setDesc("Ваши цели и фокус (например: смена карьеры, спорт, исследования). Используется для персонализации советов.")
      .addTextArea((ta) =>
        ta.setValue(this.plugin.settings.goals).onChange(async (v) => {
          this.plugin.settings.goals = v;
          await this.plugin.saveSettings();
        })
      );
  }
}
