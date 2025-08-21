// Система умной категоризации и тегов
export class SmartTagsAnalyzer {
  private tagPatterns: Record<string, { keywords: string[]; patterns: RegExp[] }> = {
    // Эмоциональные состояния
    "эмоции-негативные": {
      keywords: ["грустно", "тревога", "страх", "злость", "депрессия", "stress", "anxiety", "sad", "angry", "fear"],
      patterns: [/\b(расстрое|злость|страх|тревож|грусть|депресс)\w*/gi, /\b(stress|anxiety|sad|angry|fear)\w*/gi]
    },
    "эмоции-позитивные": {
      keywords: ["радость", "счастье", "восторг", "вдохновение", "мотивация", "happy", "joy", "excited", "inspired"],
      patterns: [/\b(рад|счастлив|восторг|вдохнов|мотивиров)\w*/gi, /\b(happy|joy|excited|inspired)\w*/gi]
    },
    
    // Профессиональное развитие
    "карьера": {
      keywords: ["работа", "карьера", "собеседование", "зарплата", "повышение", "проект", "career", "job", "promotion", "salary"],
      patterns: [/\b(работ|карьер|собеседован|зарплат|повышен|проект)\w*/gi, /\b(career|job|promotion|salary|interview)\w*/gi]
    },
    "обучение": {
      keywords: ["изучаю", "учусь", "курс", "книга", "навык", "знания", "learning", "study", "skill", "knowledge"],
      patterns: [/\b(изуча|учу|курс|книг|навык|знан)\w*/gi, /\b(learn|study|skill|knowledge|course)\w*/gi]
    },
    
    // Отношения
    "отношения-личные": {
      keywords: ["девушка", "парень", "семья", "родители", "друзья", "отношения", "family", "relationship", "friends"],
      patterns: [/\b(девушк|парен|семь|родител|друз|отношен)\w*/gi, /\b(family|relationship|friends|partner)\w*/gi]
    },
    "отношения-конфликт": {
      keywords: ["ссора", "конфликт", "спор", "разногласия", "недопонимание", "conflict", "argument", "dispute"],
      patterns: [/\b(ссор|конфликт|спор|разногласи|недопонима)\w*/gi, /\b(conflict|argument|dispute|fight)\w*/gi]
    },
    
    // Бизнес и финансы
    "бизнес": {
      keywords: ["бизнес", "деньги", "доход", "прибыль", "стартап", "инвестиции", "business", "money", "profit", "startup"],
      patterns: [/\b(бизнес|денег|доход|прибыл|стартап|инвестиц)\w*/gi, /\b(business|money|profit|startup|investment)\w*/gi]
    },
    "продажи": {
      keywords: ["продажи", "клиенты", "маркетинг", "реклама", "переговоры", "sales", "marketing", "clients", "advertising"],
      patterns: [/\b(продаж|клиент|маркетинг|реклам|переговор)\w*/gi, /\b(sales|marketing|clients|advertising|negotiation)\w*/gi]
    },
    
    // Здоровье и спорт
    "здоровье": {
      keywords: ["здоровье", "болезнь", "врач", "лечение", "самочувствие", "health", "doctor", "treatment", "wellness"],
      patterns: [/\b(здоров|болезн|врач|лечен|самочувств)\w*/gi, /\b(health|doctor|treatment|wellness|medical)\w*/gi]
    },
    "спорт": {
      keywords: ["спорт", "тренировка", "фитнес", "бег", "зал", "упражнения", "sport", "training", "fitness", "workout"],
      patterns: [/\b(спорт|тренировк|фитнес|бег|зал|упражнен)\w*/gi, /\b(sport|training|fitness|workout|exercise)\w*/gi]
    },
    
    // Цели и планы
    "цели": {
      keywords: ["цель", "план", "достижение", "мечта", "амбиции", "goal", "plan", "achievement", "dream", "ambition"],
      patterns: [/\b(цел|план|достижен|мечт|амбиц)\w*/gi, /\b(goal|plan|achievement|dream|ambition)\w*/gi]
    },
    "планирование": {
      keywords: ["планирую", "задача", "список", "приоритет", "дедлайн", "planning", "task", "priority", "deadline"],
      patterns: [/\b(планиру|задач|список|приоритет|дедлайн)\w*/gi, /\b(planning|task|priority|deadline|schedule)\w*/gi]
    },
    
    // Личностный рост
    "саморазвитие": {
      keywords: ["развитие", "рост", "улучшение", "прогресс", "самосовершенствование", "development", "growth", "improvement", "progress"],
      patterns: [/\b(развити|рост|улучшен|прогресс|самосовершенствован)\w*/gi, /\b(development|growth|improvement|progress|self-improvement)\w*/gi]
    },
    "рефлексия": {
      keywords: ["думаю", "размышляю", "анализирую", "понимаю", "осознаю", "thinking", "reflecting", "analyzing", "understanding"],
      patterns: [/\b(дума|размышля|анализиру|понима|осозна)\w*/gi, /\b(thinking|reflecting|analyzing|understanding|realizing)\w*/gi]
    },
    
    // Технологии
    "программирование": {
      keywords: ["код", "программирование", "разработка", "api", "база данных", "алгоритм", "programming", "development", "coding"],
      patterns: [/\b(код|программиров|разработк|api|баз|алгоритм)\w*/gi, /\b(programming|development|coding|api|database|algorithm)\w*/gi]
    },
    "технологии": {
      keywords: ["технология", "софт", "приложение", "система", "платформа", "technology", "software", "application", "system"],
      patterns: [/\b(технолог|софт|приложен|систем|платформ)\w*/gi, /\b(technology|software|application|system|platform)\w*/gi]
    }
  };

  // Анализ контента и предложение тегов
  analyzeTags(content: string): string[] {
    const suggestedTags: Set<string> = new Set();
    const lowerContent = content.toLowerCase();
    
    console.log('🏷️ Smart Tags Analysis:');
    console.log('- Content length:', content.length);
    console.log('- Content preview:', content.substring(0, 150) + '...');
    
    // Проверяем каждую категорию тегов
    Object.entries(this.tagPatterns).forEach(([tag, config]) => {
      let score = 0;
      
      // Проверяем ключевые слова
      config.keywords.forEach(keyword => {
        if (lowerContent.includes(keyword.toLowerCase())) {
          score += 2;
        }
      });
      
      // Проверяем паттерны
      config.patterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          score += matches.length;
        }
      });
      
      // Если найдены совпадения, добавляем тег
      if (score > 0) {
        suggestedTags.add(tag);
        console.log(`- Tag "${tag}" scored: ${score}`);
      }
    });
    
    console.log('- Suggested tags:', Array.from(suggestedTags));
    return Array.from(suggestedTags);
  }
  
  // Анализ эмоционального тона
  analyzeEmotionalTone(content: string): { tone: string; confidence: number; details: string[] } {
    const emotions = {
      positive: {
        patterns: [/\b(хорошо|отлично|рад|счастлив|доволен|мотивирован|вдохновлен|успешно|получилось)\w*/gi],
        keywords: ["хорошо", "отлично", "рад", "счастлив", "доволен", "мотивирован", "вдохновлен", "успешно", "получилось"]
      },
      negative: {
        patterns: [/\b(плохо|ужасно|расстроен|злой|грустно|депрессия|тревога|провал|не получается)\w*/gi],
        keywords: ["плохо", "ужасно", "расстроен", "злой", "грустно", "депрессия", "тревога", "провал", "не получается"]
      },
      neutral: {
        patterns: [/\b(нормально|обычно|как всегда|стандартно|привычно)\w*/gi],
        keywords: ["нормально", "обычно", "как всегда", "стандартно", "привычно"]
      }
    };
    
    let maxScore = 0;
    let dominantTone = 'neutral';
    const details: string[] = [];
    
    Object.entries(emotions).forEach(([tone, config]) => {
      let score = 0;
      const foundWords: string[] = [];
      
      config.patterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          score += matches.length;
          foundWords.push(...matches);
        }
      });
      
      if (score > maxScore) {
        maxScore = score;
        dominantTone = tone;
      }
      
      if (foundWords.length > 0) {
        details.push(`${tone}: ${foundWords.slice(0, 3).join(', ')}`);
      }
    });
    
    const confidence = Math.min(maxScore / (content.split(' ').length / 10), 1);
    
    console.log('🎭 Emotional Analysis:');
    console.log('- Dominant tone:', dominantTone);
    console.log('- Confidence:', confidence.toFixed(2));
    console.log('- Details:', details);
    
    return {
      tone: dominantTone,
      confidence: confidence,
      details: details
    };
  }
  
  // Извлечение ключевых концепций
  extractKeyConcepts(content: string): string[] {
    const concepts: string[] = [];
    
    // Паттерны для извлечения важных концепций
    const conceptPatterns = [
      // Технические термины
      /\b[A-Z]{2,}\b/g, // Акронимы (API, SQL, etc)
      /\b\w+(?:Script|Lang|Framework|Library)\b/gi, // Технологии
      
      // Важные существительные (более 6 букв)
      /\b[А-ЯЁ][а-яё]{5,}\b/g,
      /\b[A-Z][a-z]{5,}\b/g,
      
      // Числовые значения с единицами измерения
      /\d+\s*(?:лет|месяц|день|час|минут|рубл|доллар|процент|%)/gi
    ];
    
    conceptPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        concepts.push(...matches.slice(0, 5)); // Берем первые 5 совпадений
      }
    });
    
    // Удаляем дубликаты и короткие концепции
    const uniqueConcepts = [...new Set(concepts)]
      .filter(concept => concept.length > 3)
      .slice(0, 10); // Ограничиваем до 10 концепций
    
    console.log('🔍 Key Concepts:', uniqueConcepts);
    return uniqueConcepts;
  }
  
  // Полный анализ контента
  analyzeContent(content: string): {
    suggestedTags: string[];
    emotionalTone: { tone: string; confidence: number; details: string[] };
    keyConcepts: string[];
    contentType: string;
  } {
    console.log('📊 Starting comprehensive content analysis...');
    
    const suggestedTags = this.analyzeTags(content);
    const emotionalTone = this.analyzeEmotionalTone(content);
    const keyConcepts = this.extractKeyConcepts(content);
    
    // Определение типа контента
    let contentType = 'general';
    if (suggestedTags.includes('программирование') || suggestedTags.includes('технологии')) {
      contentType = 'technical';
    } else if (suggestedTags.includes('эмоции-негативные') || suggestedTags.includes('эмоции-позитивные')) {
      contentType = 'emotional';
    } else if (suggestedTags.includes('бизнес') || suggestedTags.includes('продажи')) {
      contentType = 'business';
    } else if (suggestedTags.includes('цели') || suggestedTags.includes('планирование')) {
      contentType = 'planning';
    }
    
    console.log('✅ Analysis completed:');
    console.log('- Content type:', contentType);
    console.log('- Tags count:', suggestedTags.length);
    console.log('- Concepts count:', keyConcepts.length);
    
    return {
      suggestedTags,
      emotionalTone,
      keyConcepts,
      contentType
    };
  }
}
