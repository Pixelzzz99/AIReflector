import { ItemView, WorkspaceLeaf, Modal, App, TFile, Notice, MarkdownView } from 'obsidian';
import { detectHelpType, getPromptForType } from '../enhanced-prompts';
import { SmartTagsAnalyzer } from '../analysis/SmartTagsAnalyzer';
import { SmartConnectionsAnalyzer } from '../analysis/SmartConnectionsAnalyzer';
import type AIReflectPlugin from '../main';

export const VIEW_TYPE_ADVICE = 'ai-reflect-advice-view';

interface AdviceData {
  prompt: string;
  response: string;
  persona: string;
  timestamp: number;
  tags: string[];
  emotionalTone: string;
  suggestions?: TFile[];
  sourceFile?: string;
  keyConcepts?: string[]; // Добавляем ключевые концепции
  contentType?: string;   // Добавляем тип контента
}

export class SmartAdviceView extends ItemView {
  private currentAdvice: AdviceData | null = null;
  private isLoading = false;
  private smartTags: SmartTagsAnalyzer;
  private smartConnections: SmartConnectionsAnalyzer;
  private serverUrl = 'http://localhost:8787/analyze';
  private lastAnalyzedFile: string | null = null;
  private buttonHandlers: Map<HTMLElement, () => void> = new Map();
  private plugin: AIReflectPlugin;

  constructor(leaf: WorkspaceLeaf, app: App, plugin: AIReflectPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.smartTags = new SmartTagsAnalyzer();
    this.smartConnections = new SmartConnectionsAnalyzer(app);
  }

  // Метод для обновления анализа извне (из main.ts)
  updateAdvice(advice: AdviceData) {
    console.log('📝 Updating advice from external source:', advice);
    this.currentAdvice = advice;
    this.lastAnalyzedFile = advice.sourceFile || null;
    this.isLoading = false; // Сбрасываем состояние загрузки
    this.render();
  }

  // Метод для показа индикатора загрузки
  showLoading() {
    console.log('⏳ Showing loading state');
    this.isLoading = true;
    this.render();
  }

  getViewType(): string {
    return VIEW_TYPE_ADVICE;
  }

  getDisplayText(): string {
    return 'AI Reflect - Умный помощник';
  }

  getIcon(): string {
    return 'brain';
  }

  async onOpen() {
    console.log('🚀 SmartAdviceView opened');
    
    // При открытии показываем плейсхолдер
    this.render();
    
    // Анализ теперь полностью управляется через main.ts
  }

  async onClose() {
    console.log('👋 SmartAdviceView closed');
    // Очищаем все обработчики событий
    this.buttonHandlers.clear();
  }

  private addButtonHandler(element: HTMLElement, handler: () => void) {
    // Удаляем старый обработчик если он есть
    const oldHandler = this.buttonHandlers.get(element);
    if (oldHandler) {
      element.removeEventListener('click', oldHandler);
    }
    
    // Создаём новый обработчик с защитой от повторных вызовов
    let isExecuting = false;
    const protectedHandler = async () => {
      if (isExecuting) {
        console.log('⏳ Button click ignored - already executing');
        return;
      }
      isExecuting = true;
      element.style.opacity = '0.6';
      element.style.pointerEvents = 'none';
      
      try {
        await handler();
      } finally {
        isExecuting = false;
        element.style.opacity = '1';
        element.style.pointerEvents = 'auto';
      }
    };
    
    this.buttonHandlers.set(element, protectedHandler);
    element.addEventListener('click', protectedHandler);
    element.style.cursor = 'pointer';
    
    // Добавляем визуальную обратную связь
    element.addEventListener('mousedown', () => {
      if (!isExecuting) element.style.opacity = '0.8';
    });
    element.addEventListener('mouseup', () => {
      if (!isExecuting) element.style.opacity = '1';
    });
    element.addEventListener('mouseleave', () => {
      if (!isExecuting) element.style.opacity = '1';
    });
  }

  // Методы анализа теперь не используются - весь анализ происходит через main.ts
  /*
  private async analyzeActiveNote() {
    const activeLeaf = this.app.workspace.activeLeaf;
    if (!activeLeaf) {
      console.log('❌ No active leaf found');
      this.currentAdvice = null;
      this.render();
      return;
    }

    const view = activeLeaf.view;
    if (!(view instanceof MarkdownView)) {
      console.log('❌ Active view is not MarkdownView');
      this.currentAdvice = null;
      this.render();
      return;
    }

    const file = view.file;
    if (!file) {
      console.log('❌ No file in active view');
      this.currentAdvice = null;
      this.render();
      return;
    }

    // Не анализируем тот же файл повторно
    if (this.lastAnalyzedFile === file.path && this.currentAdvice) {
      console.log('⏭️ File already analyzed:', file.path);
      return;
    }

    console.log('📝 Auto-analyzing note:', file.path);
    
    try {
      const content = await this.app.vault.read(file);
      
      // Пропускаем пустые или слишком короткие заметки
      if (!content.trim() || content.trim().length < 50) {
        console.log('⏭️ Skipping short or empty note');
        this.currentAdvice = {
          prompt: 'Заметка слишком короткая',
          response: 'Эта заметка слишком короткая для анализа. Добавьте больше содержимого (минимум 50 символов) и откройте панель снова.',
          persona: 'info',
          timestamp: Date.now(),
          tags: [],
          emotionalTone: 'neutral',
          sourceFile: file.path
        };
        this.render();
        return;
      }

      await this.analyzeNote(file, content);
      this.lastAnalyzedFile = file.path;
      
    } catch (error) {
      console.error('❌ Error analyzing active note:', error);
      this.currentAdvice = {
        prompt: 'Ошибка анализа',
        response: `Произошла ошибка при анализе заметки: ${error.message}`,
        persona: 'error',
        timestamp: Date.now(),
        tags: [],
        emotionalTone: 'neutral'
      };
      this.render();
    }
  }
  */

  /*
  private async analyzeNote(file: TFile, content: string) {
    this.isLoading = true;
    this.render();

    try {
      console.log('🎯 Starting note analysis for:', file.basename);

      // Анализируем контент с помощью умных тегов
      const contentAnalysis = this.smartTags.analyzeContent(content);
      console.log('📊 Content analysis:', contentAnalysis);

      // Определяем тип помощи
      const helpType = detectHelpType(content);
      console.log('🎭 Detected help type:', helpType);

      // Получаем предложения связанных заметок
      const suggestions = await this.smartConnections.getSuggestions(content, 3);
      console.log('🔗 Connection suggestions:', suggestions.length);

      // Формируем запрос к старому API /analyze (который уже настроен)
      const requestBody = {
        input: {
          system: `Практичный, добрый коуч; краткий, избегающий лишних слов; действенный`,
          user: this.buildPromptForAnalysis(file, content, helpType, contentAnalysis)
        },
        model: "claude-3-5-sonnet-20241022", // Исправленное название модели
        temperature: 0.3
      };

      console.log('🚀 Sending request to analyze endpoint');

      const response = await fetch(this.serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Сохраняем данные о анализе
      this.currentAdvice = {
        prompt: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
        response: data.adviceMd,
        persona: helpType,
        timestamp: Date.now(),
        tags: contentAnalysis.suggestedTags,
        emotionalTone: contentAnalysis.emotionalTone.tone,
        suggestions: suggestions.map(s => s.file),
        sourceFile: file.path
      };

      console.log('✅ Analysis completed successfully');

    } catch (error) {
      console.error('❌ Error analyzing note:', error);
      
      // Улучшенная обработка ошибок
      let errorMessage = `Произошла ошибка при анализе заметки: ${error.message}`;
      
      if (error.message.includes('временно недоступен') || error.message.includes('перегружен')) {
        errorMessage = `🔄 Claude API временно перегружен\n\n⏳ Сервер Anthropic получает слишком много запросов.\nПопробуйте через 2-5 минут.\n\n💡 Это временная проблема, которая обычно решается сама.`;
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = `🌐 Проблема с подключением к сети\n\nПроверьте интернет-соединение и попробуйте снова.`;
      }
      
      // Показываем ошибку в интерфейсе
      this.currentAdvice = {
        prompt: 'Анализ заметки',
        response: errorMessage,
        persona: 'error',
        timestamp: Date.now(),
        tags: [],
        emotionalTone: 'neutral'
      };
    } finally {
      this.isLoading = false;
      this.render();
    }
  }
  */

  private buildPromptForAnalysis(file: TFile, content: string, helpType: string, analysis: any): string {
    // Используем enhanced-prompts для генерации правильного промпта
    const prompt = getPromptForType(helpType as any, content);
    
    // Заменяем плейсхолдеры на реальные данные
    return prompt.user
      .replace('{noteTitle}', file.basename)
      .replace('{notePath}', file.path)
      .replace('{tags}', analysis.suggestedTags.join(', '))
      .replace('{goals}', '')
      .replace('{noteContent}', content);
  }

  private render() {
    const container = this.containerEl;
    container.empty();
    
    // Очищаем старые обработчики
    this.buttonHandlers.forEach((handler, element) => {
      element.removeEventListener('click', handler);
    });
    this.buttonHandlers.clear();
    
    container.addClass('ai-reflect-view');

    // Заголовок с индикатором статуса
    const headerEl = container.createDiv('advice-header');
    const titleEl = headerEl.createEl('h2', { 
      text: 'AI Reflect - Анализ заметки',
      cls: 'advice-title'
    });
    
    const statusEl = headerEl.createDiv('advice-status');
    if (this.isLoading) {
      statusEl.innerHTML = '🔄 Анализирую заметку...';
      statusEl.addClass('loading');
    } else if (this.currentAdvice) {
      const persona = this.getPersonaIcon(this.currentAdvice.persona);
      statusEl.innerHTML = `${persona} ${this.getPersonaName(this.currentAdvice.persona)}`;
      statusEl.addClass('ready');
    } else {
      statusEl.innerHTML = '📝 Кликните на иконку 🧠 для анализа';
      statusEl.addClass('idle');
    }

    // Информация о текущей заметке
    const activeLeaf = this.app.workspace.activeLeaf;
    if (activeLeaf && activeLeaf.view instanceof MarkdownView && activeLeaf.view.file) {
      const noteInfoEl = container.createDiv('note-info');
      noteInfoEl.innerHTML = `📄 <strong>${activeLeaf.view.file.basename}</strong>`;
      
      if (this.isLoading) {
        noteInfoEl.innerHTML += ` <span class="analysis-status-loading">🔄 Анализирую...</span>`;
      } else if (this.currentAdvice && this.currentAdvice.sourceFile === activeLeaf.view.file.path) {
        noteInfoEl.innerHTML += ` <span class="analysis-status">✅ Проанализирована</span>`;
      } else {
        noteInfoEl.innerHTML += ` <span class="analysis-status-pending">⏳ Готова к анализу</span>`;
      }
    } else {
      const noNoteEl = container.createDiv('no-note-info');
      noNoteEl.innerHTML = `📝 <span class="text-muted">Откройте заметку и нажмите на иконку 🧠 для анализа</span>`;
    }

    // Область для отображения анализа
    const responseSection = container.createDiv('response-section');
    
    if (this.currentAdvice) {
      this.renderAdvice(responseSection, this.currentAdvice);
    } else if (!this.isLoading) {
      const placeholderEl = responseSection.createDiv('analysis-placeholder');
      placeholderEl.innerHTML = `
        <div class="placeholder-content">
          <h3>🤖 Готов к анализу</h3>
          <p>Нажмите на иконку 🧠 в левой панели, чтобы проанализировать активную заметку.</p>
          <p><strong>AI определит:</strong></p>
          <ul>
            <li>🎭 Подходящую персону (наставник, тренер, психолог, бизнес-консультант)</li>
            <li>🏷️ Умные теги и эмоциональный тон</li>
            <li>🔗 Связанные заметки в вашем хранилище</li>
            <li>💡 Персонализированные советы и рекомендации</li>
          </ul>
          <p><em>💡 Совет: При переключении заметок анализ обновляется автоматически</em></p>
        </div>
      `;
    }

    // Добавляем кнопку повторного анализа только если уже есть анализ
    if (this.currentAdvice && !this.isLoading) {
      const refreshButton = container.createEl('button', {
        text: '🔄 Обновить анализ',
        cls: 'advice-refresh-btn'
      });
      
      // Используем новый метод для добавления обработчика
      this.addButtonHandler(refreshButton, async () => {
        console.log('🔄 Refresh button clicked');
        this.lastAnalyzedFile = null;
        this.showLoading(); // Показываем индикатор загрузки
        // Используем метод плагина вместо собственного анализа
        await this.plugin.analyzeActiveNote();
      });
    }

    // Добавляем кнопку ручного анализа если анализа нет
    if (!this.currentAdvice && !this.isLoading) {
      const analyzeButton = container.createEl('button', {
        text: '🧠 Анализировать заметку',
        cls: 'advice-analyze-btn mod-cta'
      });
      
      this.addButtonHandler(analyzeButton, async () => {
        console.log('🧠 Manual analyze button clicked');
        this.showLoading(); // Показываем индикатор загрузки
        // Используем метод плагина вместо собственного анализа
        await this.plugin.analyzeActiveNote();
      });
    }
  }

  private getPersonaIcon(persona: string): string {
    const icons: Record<string, string> = {
      'mentor': '🎯',
      'coach': '💪',
      'psychologist': '🧘',
      'business': '💼',
      'reflection': '🤔',
      'error': '❌'
    };
    return icons[persona] || '💭';
  }

  private getPersonaName(persona: string): string {
    const names: Record<string, string> = {
      'mentor': 'Наставник',
      'coach': 'Тренер',
      'psychologist': 'Психолог',
      'business': 'Бизнес-консультант',
      'reflection': 'Рефлексивный помощник',
      'error': 'Ошибка'
    };
    return names[persona] || 'Помощник';
  }

  private renderAdvice(container: HTMLElement, advice: AdviceData) {
    container.empty();
    console.log('🎨 Rendering advice for persona:', advice.persona);

    // Заголовок анализа с персоной и временем
    const adviceHeader = container.createDiv('advice-response-header');
    const personaEl = adviceHeader.createEl('div', { cls: 'advice-persona' });
    
    const personaIcon = this.getPersonaIcon(advice.persona);
    const personaName = this.getPersonaName(advice.persona);
    personaEl.innerHTML = `${personaIcon} <strong>${personaName}</strong>`;
    
    const timeEl = adviceHeader.createEl('div', { 
      cls: 'advice-time',
      text: new Date(advice.timestamp).toLocaleString('ru-RU')
    });

    // Эмоциональный тон и теги
    const metaSection = container.createDiv('advice-meta');
    
    if (advice.emotionalTone) {
      const toneEl = metaSection.createDiv('emotional-tone');
      const toneIcon = this.getEmotionalIcon(advice.emotionalTone);
      toneEl.innerHTML = `${toneIcon} <span class="tone-${advice.emotionalTone}">${this.getEmotionalName(advice.emotionalTone)}</span>`;
    }

    if (advice.tags && advice.tags.length > 0) {
      const tagsEl = metaSection.createDiv('smart-tags');
      tagsEl.createEl('strong', { text: '🏷️ Умные теги: ' });
      advice.tags.slice(0, 5).forEach(tag => {
        const tagEl = tagsEl.createEl('span', { 
          cls: 'smart-tag',
          text: tag.replace(/-/g, ' ') // Заменяем дефисы на пробелы для читабельности
        });
      });
    }

    // Отображаем ключевые концепции, если есть
    if (advice.keyConcepts && advice.keyConcepts.length > 0) {
      const conceptsEl = metaSection.createDiv('key-concepts');
      conceptsEl.createEl('strong', { text: '🔑 Ключевые концепции: ' });
      advice.keyConcepts.slice(0, 3).forEach(concept => {
        const conceptEl = conceptsEl.createEl('span', { 
          cls: 'key-concept',
          text: concept
        });
      });
    }

    // Анализ заметки
    const responseSection = container.createDiv('advice-response-section');
    responseSection.createEl('h4', { text: `${personaIcon} Анализ и советы:` });
    const responseEl = responseSection.createEl('div', { 
      cls: 'advice-response-text' 
    });
    
    // Обрабатываем markdown в ответе
    responseEl.innerHTML = this.processMarkdown(advice.response);

    // Связанные заметки
    if (advice.suggestions && advice.suggestions.length > 0) {
      const connectionsSection = container.createDiv('smart-connections');
      connectionsSection.createEl('h4', { text: '🔗 Связанные заметки:' });
      
      const connectionsList = connectionsSection.createEl('ul', { cls: 'connections-list' });
      advice.suggestions.slice(0, 3).forEach(file => {
        const listItem = connectionsList.createEl('li');
        const link = listItem.createEl('a', {
          text: file.basename,
          cls: 'internal-link'
        });
        
        // Используем новый метод для добавления обработчика
        this.addButtonHandler(link, () => {
          console.log('🔗 Opening linked note:', file.basename);
          this.app.workspace.openLinkText(file.path, '', false);
        });
      });
    }

    // Действия
    const actionsSection = container.createDiv('advice-actions');
    
    const saveButton = actionsSection.createEl('button', {
      text: '💾 Сохранить в заметку',
      cls: 'advice-action-btn save-btn'
    });

    const copyButton = actionsSection.createEl('button', {
      text: '📋 Копировать анализ',
      cls: 'advice-action-btn copy-btn'
    });

    // Используем новый метод для добавления обработчиков
    this.addButtonHandler(saveButton, () => {
      console.log('💾 Save button clicked');
      try {
        new SaveAdviceModal(this.app, advice).open();
      } catch (error) {
        console.error('Error opening save modal:', error);
        new Notice('Ошибка открытия окна сохранения');
      }
    });

    this.addButtonHandler(copyButton, async () => {
      console.log('📋 Copy button clicked');
      try {
        const textToCopy = this.formatAdviceForCopy(advice);
        await navigator.clipboard.writeText(textToCopy);
        new Notice('Анализ скопирован в буфер обмена');
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        new Notice('Ошибка копирования в буфер обмена');
      }
    });
  }

  private getEmotionalIcon(tone: string): string {
    const icons: Record<string, string> = {
      'positive': '😊',
      'negative': '😟',
      'neutral': '😐'
    };
    return icons[tone] || '😐';
  }

  private getEmotionalName(tone: string): string {
    const names: Record<string, string> = {
      'positive': 'Позитивный настрой',
      'negative': 'Требует поддержки',
      'neutral': 'Нейтральный тон'
    };
    return names[tone] || 'Нейтральный';
  }

  private processMarkdown(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  }

  private formatAdviceForCopy(advice: AdviceData): string {
    const personaName = this.getPersonaName(advice.persona);
    const date = new Date(advice.timestamp).toLocaleString('ru-RU');
    
    let result = `# ${personaName} - Анализ заметки\n`;
    result += `*${date}*\n\n`;
    result += `**Источник:** ${advice.sourceFile}\n\n`;
    result += `## Анализ:\n${advice.response}\n\n`;
    
    if (advice.tags.length > 0) {
      result += `**Теги:** ${advice.tags.join(', ')}\n`;
    }
    
    result += `**Эмоциональный тон:** ${this.getEmotionalName(advice.emotionalTone)}\n`;
    
    return result;
  }
}

// Модальное окно для сохранения анализов
class SaveAdviceModal extends Modal {
  private advice: AdviceData;
  private selectedTags: Set<string> = new Set();

  constructor(app: App, advice: AdviceData) {
    super(app);
    this.advice = advice;
    this.selectedTags = new Set(advice.tags);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: '💾 Сохранить анализ в заметку' });

    // Предварительный просмотр
    const previewSection = contentEl.createDiv('save-preview-section');
    previewSection.createEl('h3', { text: 'Предварительный просмотр:' });
    
    const previewEl = previewSection.createEl('div', { cls: 'save-preview' });
    previewEl.innerHTML = `
      <div class="preview-header">
        <strong>${this.getPersonaIcon(this.advice.persona)} ${this.getPersonaName(this.advice.persona)}</strong>
        <span class="preview-date">${new Date(this.advice.timestamp).toLocaleString('ru-RU')}</span>
      </div>
      <div class="preview-content">
        <strong>Источник:</strong> ${this.advice.sourceFile}<br><br>
        <strong>Анализ:</strong><br>
        ${this.advice.response.substring(0, 300).replace(/\n/g, '<br>')}...
      </div>
    `;

    // Настройки сохранения
    const optionsSection = contentEl.createDiv('save-options-section');
    
    const sourceFileName = this.advice.sourceFile?.split('/').pop()?.replace('.md', '') || 'Заметка';
    let fileName = `AI Анализ - ${sourceFileName} - ${new Date().toISOString().split('T')[0]}`;
    
    const fileNameInput = optionsSection.createEl('input', {
      type: 'text',
      value: fileName,
      placeholder: 'Имя файла (без расширения .md)'
    });
    
    fileNameInput.style.width = '100%';
    fileNameInput.style.padding = '8px';
    fileNameInput.style.marginBottom = '20px';
    fileNameInput.style.borderRadius = '4px';
    fileNameInput.style.border = '1px solid var(--background-modifier-border)';

    // Кнопки действий
    const buttonContainer = contentEl.createDiv('modal-buttons');
    
    const saveNewButton = buttonContainer.createEl('button', {
      text: '💾 Создать новую заметку',
      cls: 'mod-cta'
    });

    const cancelButton = buttonContainer.createEl('button', {
      text: 'Отмена'
    });

    // Защищённые обработчики событий с блокировкой повторных вызовов
    let isSaving = false;
    saveNewButton.onclick = async () => {
      if (isSaving) return;
      isSaving = true;
      
      saveNewButton.textContent = '⏳ Сохранение...';
      saveNewButton.disabled = true;
      
      try {
        console.log('💾 Modal save button clicked');
        const finalFileName = fileNameInput.value || fileName;
        await this.saveAsNewNote(finalFileName);
        this.close();
      } catch (error) {
        console.error('Error in save handler:', error);
        new Notice(`Ошибка сохранения: ${error.message}`);
      } finally {
        isSaving = false;
        saveNewButton.textContent = '💾 Создать новую заметку';
        saveNewButton.disabled = false;
      }
    };

    cancelButton.onclick = () => {
      console.log('❌ Modal cancel button clicked');
      this.close();
    };
  }

  private async saveAsNewNote(fileName: string) {
    try {
      const content = this.formatAdviceForSaving();
      const filePath = `${fileName}.md`;
      
      await this.app.vault.create(filePath, content);
      new Notice(`Анализ сохранен в заметку: ${fileName}`);
      
      // Открываем созданную заметку
      const file = this.app.vault.getAbstractFileByPath(filePath);
      if (file instanceof TFile) {
        await this.app.workspace.openLinkText(filePath, '', false);
      }
    } catch (error) {
      console.error('Error saving analysis:', error);
      new Notice(`Ошибка сохранения: ${error.message}`);
    }
  }

  private formatAdviceForSaving(): string {
    const personaName = this.getPersonaName(this.advice.persona);
    const date = new Date(this.advice.timestamp).toLocaleString('ru-RU');
    const basicTags = ['ai-анализ', 'рефлексия', ...this.advice.tags.slice(0, 3)];
    const tags = basicTags.map(tag => `#${tag.replace(/\s+/g, '-')}`).join(' ');
    
    return `---
title: "AI Анализ - ${personaName}"
date: ${new Date().toISOString().split('T')[0]}
tags: [${basicTags.map(tag => `"${tag}"`).join(', ')}]
persona: ${this.advice.persona}
emotional_tone: ${this.advice.emotionalTone}
source_file: "${this.advice.sourceFile}"
---

# ${this.getPersonaIcon(this.advice.persona)} ${personaName} - Анализ заметки

${tags}

**Дата анализа:** ${date}  
**Исходная заметка:** [[${this.advice.sourceFile?.replace('.md', '')}]]

## ${this.getPersonaIcon(this.advice.persona)} Анализ и рекомендации

${this.advice.response}

---

**Эмоциональный тон:** ${this.getEmotionalName(this.advice.emotionalTone)}  
**AI-персона:** ${personaName}

> Этот анализ был сгенерирован AI Reflect - умным помощником для саморефлексии и личностного роста.
`;
  }

  private getPersonaIcon(persona: string): string {
    const icons: Record<string, string> = {
      'mentor': '🎯',
      'coach': '💪',
      'psychologist': '🧘',
      'business': '💼',
      'reflection': '🤔'
    };
    return icons[persona] || '💭';
  }

  private getPersonaName(persona: string): string {
    const names: Record<string, string> = {
      'mentor': 'Наставник',
      'coach': 'Тренер',
      'psychologist': 'Психолог',
      'business': 'Бизнес-консультант',
      'reflection': 'Рефлексивный помощник'
    };
    return names[persona] || 'Помощник';
  }

  private getEmotionalName(tone: string): string {
    const names: Record<string, string> = {
      'positive': 'Позитивный настрой',
      'negative': 'Требует поддержки',
      'neutral': 'Нейтральный тон'
    };
    return names[tone] || 'Нейтральный';
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
