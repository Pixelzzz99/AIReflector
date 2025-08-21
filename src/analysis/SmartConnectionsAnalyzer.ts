// Система умных связей между заметками
import { App, TFile, TAbstractFile } from 'obsidian';

export class SmartConnectionsAnalyzer {
  private app: App;
  private cache: Map<string, { content: string; embeddings?: number[]; lastModified: number }> = new Map();
  private connections: Map<string, { file: string; similarity: number; reasons: string[] }[]> = new Map();

  constructor(app: App) {
    this.app = app;
  }

  // Простой алгоритм векторизации текста (TF-IDF подобный)
  private calculateTextEmbedding(text: string): number[] {
    console.log('🧠 Calculating text embedding for:', text.substring(0, 100));
    
    // Подготовка текста
    const words = text.toLowerCase()
      .replace(/[^\w\s\u0400-\u04FF]/g, ' ') // Оставляем только буквы и цифры (включая кириллицу)
      .split(/\s+/)
      .filter(word => word.length > 2); // Убираем короткие слова
    
    // Создаем словарь уникальных слов
    const vocabulary = [...new Set(words)];
    const wordFreq: Record<string, number> = {};
    
    // Подсчитываем частоту слов
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    // Создаем вектор на основе частот
    const embedding = vocabulary.map(word => {
      const freq = wordFreq[word] || 0;
      // TF-IDF упрощенная формула: частота * логарифм от общего количества слов
      return freq * Math.log(words.length / (freq + 1));
    });
    
    // Нормализуем вектор
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    const normalizedEmbedding = magnitude > 0 ? embedding.map(val => val / magnitude) : embedding;
    
    console.log('- Vocabulary size:', vocabulary.length);
    console.log('- Embedding dimension:', normalizedEmbedding.length);
    
    return normalizedEmbedding;
  }

  // Вычисление косинусного сходства между векторами
  private calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      console.warn('⚠️ Embedding dimensions mismatch:', embedding1.length, 'vs', embedding2.length);
      return 0;
    }
    
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;
    
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      magnitude1 += embedding1[i] * embedding1[i];
      magnitude2 += embedding2[i] * embedding2[i];
    }
    
    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);
    
    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }
    
    return dotProduct / (magnitude1 * magnitude2);
  }

  // Извлечение ключевых фраз и концепций
  private extractKeyPhrases(text: string): string[] {
    const phrases: string[] = [];
    
    // Паттерны для извлечения фраз
    const patterns = [
      // Фразы из 2-3 слов
      /\b[а-яё]+\s+[а-яё]+(?:\s+[а-яё]+)?\b/gi,
      /\b[a-z]+\s+[a-z]+(?:\s+[a-z]+)?\b/gi,
      
      // Технические термины
      /\b[A-Z][a-z]+(?:[A-Z][a-z]+)*\b/g,
      /\b\w+(?:API|SDK|DB|UI|UX)\b/gi,
      
      // Даты и числа с контекстом
      /\d{1,2}\s*(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s*\d{2,4}/gi,
      /\d+\s*(?:лет|месяц|день|час|минут|секунд)/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        phrases.push(...matches.slice(0, 10)); // Ограничиваем количество
      }
    });
    
    // Удаляем дубликаты и короткие фразы
    const uniquePhrases = [...new Set(phrases)]
      .filter(phrase => phrase.length > 5 && phrase.trim().split(' ').length <= 4)
      .slice(0, 20);
    
    console.log('📝 Extracted key phrases:', uniquePhrases.slice(0, 5));
    return uniquePhrases;
  }

  // Анализ связей по содержанию
  private analyzeContentSimilarity(content1: string, content2: string): { similarity: number; reasons: string[] } {
    const embedding1 = this.calculateTextEmbedding(content1);
    const embedding2 = this.calculateTextEmbedding(content2);
    
    const similarity = this.calculateCosineSimilarity(embedding1, embedding2);
    const reasons: string[] = [];
    
    // Анализ общих фраз и концепций
    const phrases1 = this.extractKeyPhrases(content1);
    const phrases2 = this.extractKeyPhrases(content2);
    
    const commonPhrases = phrases1.filter(phrase => 
      phrases2.some(p2 => p2.toLowerCase().includes(phrase.toLowerCase()) || 
                         phrase.toLowerCase().includes(p2.toLowerCase()))
    );
    
    if (commonPhrases.length > 0) {
      reasons.push(`Общие концепции: ${commonPhrases.slice(0, 3).join(', ')}`);
    }
    
    // Анализ общих слов (более значимых)
    const words1 = content1.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const words2 = content2.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const commonWords = words1.filter(word => words2.includes(word));
    
    if (commonWords.length > 2) {
      reasons.push(`Общие термины: ${[...new Set(commonWords)].slice(0, 3).join(', ')}`);
    }
    
    // Анализ структурного сходства
    const headers1 = content1.match(/^#{1,6}\s+.+$/gm) || [];
    const headers2 = content2.match(/^#{1,6}\s+.+$/gm) || [];
    
    if (headers1.length > 0 && headers2.length > 0) {
      const commonHeaderWords = headers1.some(h1 => 
        headers2.some(h2 => {
          const words1 = h1.toLowerCase().split(/\s+/);
          const words2 = h2.toLowerCase().split(/\s+/);
          return words1.some(w => words2.includes(w) && w.length > 3);
        })
      );
      
      if (commonHeaderWords) {
        reasons.push('Похожая структура разделов');
      }
    }
    
    return { similarity, reasons };
  }

  // Получение всех заметок в хранилище
  private async getAllNotes(): Promise<TFile[]> {
    const files = this.app.vault.getMarkdownFiles();
    console.log(`📚 Found ${files.length} markdown files in vault`);
    return files;
  }

  // Обновление кэша для файла
  private async updateCache(file: TFile): Promise<void> {
    try {
      const content = await this.app.vault.read(file);
      const stat = await this.app.vault.adapter.stat(file.path);
      
      this.cache.set(file.path, {
        content: content,
        embeddings: this.calculateTextEmbedding(content),
        lastModified: stat?.mtime || Date.now()
      });
      
      console.log(`💾 Updated cache for: ${file.path}`);
    } catch (error) {
      console.error('❌ Error updating cache for file:', file.path, error);
    }
  }

  // Поиск связанных заметок
  async findConnectedNotes(sourceFile: TFile, maxResults: number = 5, minSimilarity: number = 0.1): Promise<{ file: TFile; similarity: number; reasons: string[] }[]> {
    console.log(`🔍 Finding connections for: ${sourceFile.path}`);
    
    // Обновляем кэш для исходного файла
    await this.updateCache(sourceFile);
    const sourceCache = this.cache.get(sourceFile.path);
    
    if (!sourceCache) {
      console.warn('⚠️ No cache found for source file');
      return [];
    }
    
    const allNotes = await this.getAllNotes();
    const connections: { file: TFile; similarity: number; reasons: string[] }[] = [];
    
    // Проверяем связи с другими файлами
    for (const targetFile of allNotes) {
      if (targetFile.path === sourceFile.path) continue; // Пропускаем исходный файл
      
      // Проверяем кэш и обновляем при необходимости
      let targetCache = this.cache.get(targetFile.path);
      if (!targetCache) {
        await this.updateCache(targetFile);
        targetCache = this.cache.get(targetFile.path);
      }
      
      if (!targetCache) continue;
      
      // Анализируем сходство
      const analysis = this.analyzeContentSimilarity(sourceCache.content, targetCache.content);
      
      if (analysis.similarity > minSimilarity) {
        connections.push({
          file: targetFile,
          similarity: analysis.similarity,
          reasons: analysis.reasons
        });
      }
    }
    
    // Сортируем по сходству и возвращаем топ результатов
    const sortedConnections = connections
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);
    
    console.log(`✅ Found ${sortedConnections.length} connections above threshold ${minSimilarity}`);
    sortedConnections.forEach(conn => {
      console.log(`- ${conn.file.basename}: ${(conn.similarity * 100).toFixed(1)}% (${conn.reasons.join(', ')})`);
    });
    
    // Кэшируем результаты
    this.connections.set(sourceFile.path, sortedConnections.map(conn => ({
      file: conn.file.path,
      similarity: conn.similarity,
      reasons: conn.reasons
    })));
    
    return sortedConnections;
  }

  // Получение предложений для связывания
  async getSuggestions(content: string, maxResults: number = 3): Promise<{ file: TFile; similarity: number; reasons: string[] }[]> {
    console.log('💡 Getting connection suggestions for new content...');
    
    const allNotes = await this.getAllNotes();
    const suggestions: { file: TFile; similarity: number; reasons: string[] }[] = [];
    
    // Обрабатываем каждый файл
    for (const file of allNotes.slice(0, 50)) { // Ограничиваем для производительности
      let fileCache = this.cache.get(file.path);
      if (!fileCache) {
        await this.updateCache(file);
        fileCache = this.cache.get(file.path);
      }
      
      if (!fileCache) continue;
      
      const analysis = this.analyzeContentSimilarity(content, fileCache.content);
      
      if (analysis.similarity > 0.05) { // Более низкий порог для предложений
        suggestions.push({
          file: file,
          similarity: analysis.similarity,
          reasons: analysis.reasons
        });
      }
    }
    
    const topSuggestions = suggestions
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);
    
    console.log(`💡 Generated ${topSuggestions.length} suggestions`);
    return topSuggestions;
  }

  // Анализ кластеров связанных заметок
  async findNoteClusters(minClusterSize: number = 3): Promise<{ topic: string; files: TFile[]; connections: number }[]> {
    console.log('🎯 Analyzing note clusters...');
    
    const allNotes = await this.getAllNotes();
    const clusters: { topic: string; files: TFile[]; connections: number }[] = [];
    const processed = new Set<string>();
    
    for (const file of allNotes) {
      if (processed.has(file.path)) continue;
      
      const connections = await this.findConnectedNotes(file, 10, 0.2);
      const clusterFiles = [file, ...connections.map(c => c.file)];
      
      if (clusterFiles.length >= minClusterSize) {
        // Определяем основную тему кластера
        const allContent = clusterFiles.map(f => this.cache.get(f.path)?.content || '').join(' ');
        const keyPhrases = this.extractKeyPhrases(allContent);
        const topic = keyPhrases[0] || file.basename;
        
        clusters.push({
          topic: topic,
          files: clusterFiles,
          connections: connections.length
        });
        
        // Отмечаем файлы как обработанные
        clusterFiles.forEach(f => processed.add(f.path));
      }
    }
    
    console.log(`🎯 Found ${clusters.length} clusters`);
    return clusters.sort((a, b) => b.connections - a.connections);
  }

  // Очистка кэша
  clearCache(): void {
    this.cache.clear();
    this.connections.clear();
    console.log('🗑️ Cache cleared');
  }

  // Получение статистики
  getStats(): { cacheSize: number; connectionsCount: number; totalFiles: number } {
    return {
      cacheSize: this.cache.size,
      connectionsCount: this.connections.size,
      totalFiles: this.app.vault.getMarkdownFiles().length
    };
  }
}
