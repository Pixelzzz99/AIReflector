// Функция определения типа помощи на основе содержания заметки
export function detectHelpType(content: string): 'mentor' | 'coach' | 'psychologist' | 'business' | 'reflection' {
  const lowerContent = content.toLowerCase();
  
  // Ключевые слова для разных типов помощи
  const keywords = {
    business: ['бизнес', 'деньги', 'продажи', 'маркетинг', 'стартап', 'инвестиции', 'прибыль', 'клиенты', 'переговоры', 'поставщик', 'business', 'money', 'sales', 'marketing', 'startup', 'profit', 'client'],
    psychologist: ['депрессия', 'тревога', 'стресс', 'эмоции', 'чувства', 'семья', 'отношения', 'конфликт', 'настроение', 'грусть', 'злость', 'страх', 'depression', 'anxiety', 'stress', 'emotion', 'family', 'relationship'],
    coach: ['тренировка', 'спорт', 'цель', 'мотивация', 'привычка', 'план', 'результат', 'достижение', 'прогресс', 'фитнес', 'workout', 'sport', 'goal', 'motivation', 'habit', 'achievement', 'progress'],
    mentor: ['карьера', 'развитие', 'обучение', 'навык', 'знания', 'учеба', 'опыт', 'профессия', 'технологии', 'программирование', 'career', 'development', 'learning', 'skill', 'study', 'programming', 'technology']
  };
  
  let maxScore = 0;
  let detectedType: 'mentor' | 'coach' | 'psychologist' | 'business' | 'reflection' = 'reflection';
  
  // Подсчитываем вхождения ключевых слов для каждого типа
  Object.entries(keywords).forEach(([type, words]) => {
    const score = words.reduce((count, word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      return count + (lowerContent.match(regex) || []).length;
    }, 0);
    
    if (score > maxScore) {
      maxScore = score;
      detectedType = type as any;
    }
  });
  
  console.log('🎯 Help type detection:');
  console.log('- Content preview:', content.substring(0, 100) + '...');
  console.log('- Detected type:', detectedType);
  console.log('- Max score:', maxScore);
  
  return detectedType;
}

// Функция определения языка текста
function detectLanguage(text: string): 'ru' | 'en' {
  console.log('🔍 Language Detection Start:');
  console.log('Original text:', text.substring(0, 200) + '...');
  console.log('Original text length:', text.length);
  
  // Очищаем текст от специальных символов и цифр для более точного анализа
  const cleanText = text.replace(/[^a-zA-Zа-яёА-ЯЁ\s]/g, ' ');
  console.log('Cleaned text:', cleanText.substring(0, 200) + '...');
  console.log('Cleaned text length:', cleanText.length);
  
  const cyrillicChars = cleanText.match(/[а-яёА-ЯЁ]/g);
  const latinChars = cleanText.match(/[a-zA-Z]/g);
  
  console.log('Cyrillic characters found:', cyrillicChars?.length || 0);
  console.log('Cyrillic sample:', cyrillicChars?.slice(0, 10).join('') || 'none');
  console.log('Latin characters found:', latinChars?.length || 0);
  console.log('Latin sample:', latinChars?.slice(0, 10).join('') || 'none');

  if (!cyrillicChars && !latinChars) {
    console.log('❌ No letters found, defaulting to Russian');
    return 'ru';
  }
  
  if (!cyrillicChars) {
    console.log('✅ Only Latin letters found, detected: English');
    return 'en';
  }
  
  if (!latinChars) {
    console.log('✅ Only Cyrillic letters found, detected: Russian');
    return 'ru';
  }
  
  // Определяем по процентному соотношению
  const totalChars = cyrillicChars.length + latinChars.length;
  const cyrillicPercent = (cyrillicChars.length / totalChars) * 100;
  
  console.log('📊 Language Statistics:');
  console.log('- Total letters:', totalChars);
  console.log('- Cyrillic count:', cyrillicChars.length);
  console.log('- Latin count:', latinChars.length);
  console.log('- Cyrillic percentage:', cyrillicPercent.toFixed(1) + '%');
  
  const detectedLanguage = cyrillicPercent >= 40 ? 'ru' : 'en';
  console.log('✅ Final decision:', detectedLanguage, `(threshold: 40%, actual: ${cyrillicPercent.toFixed(1)}%)`);
  
  return detectedLanguage;
}

// Расширенные шаблоны промптов для разных типов помощи
const HELP_PROMPTS = {
  ru: {
    mentor: {
      systemSuffix: "Вы опытный наставник с многолетним опытом в профессиональном развитии. Делитесь практическими советами и помогаете развивать навыки. ВАЖНО: Всегда отвечайте на том же языке, что и заметка пользователя.",
      userTemplate: `Как опытный наставник, проанализируйте эту заметку и дайте профессиональные рекомендации:

📚 **Ключевые инсайты (2 предложения):**

🎯 **План развития (3-5 шагов):**

🛠️ **Практические навыки для изучения:**

❓ **Вопрос для размышления:**

Мета-информация:
- Заметка: {noteTitle}
- Путь: {notePath}
- Теги: {tags}
- Цели: {goals}

Содержание заметки:
{noteContent}`
    },
    coach: {
      systemSuffix: "Вы мотивирующий тренер, который помогает достигать целей и формировать полезные привычки. Фокусируетесь на действиях и результатах. ВАЖНО: Всегда отвечайте на том же языке, что и заметка пользователя.",
      userTemplate: `Как ваш личный тренер, даю мотивирующую обратную связь:

💪 **Что вы уже хорошо делаете:**

🎯 **План действий на завтра:**
1. 
2. 
3. 

⏰ **Конкретные временные рамки:**

🏆 **Критерии успеха:**

🔥 **Мотивационный вопрос:**

Данные заметки: {noteTitle} | {tags} | {goals}

Анализируемый материал:
{noteContent}`
    },
    psychologist: {
      systemSuffix: "Вы эмпатичный психолог, который помогает понять эмоции, паттерны поведения и внутренние процессы. Создаете безопасное пространство для размышлений. ВАЖНО: Всегда отвечайте на том же языке, что и заметка пользователя.",
      userTemplate: `Как психолог, помогаю вам разобраться с внутренними процессами:

🧠 **Эмоциональный анализ:**

💡 **Паттерны поведения:**

🌱 **Ресурсы для роста:**

🤝 **Техники самоподдержки:**

🔍 **Исследовательский вопрос:**

Контекст: {noteTitle} в {notePath}
Теги: {tags} | Фокус: {goals}

Материал для анализа:
{noteContent}`
    },
    business: {
      systemSuffix: "Вы опытный бизнес-консультант с экспертизой в стратегии, продажах и развитии бизнеса. Даете практичные коммерческие советы. ВАЖНО: Всегда отвечайте на том же языке, что и заметка пользователя.",
      userTemplate: `Как бизнес-консультант, анализирую вашу ситуацию:

💼 **Бизнес-инсайты:**

📈 **Стратегические действия:**
- Краткосрочные (1-2 недели):
- Среднесрочные (1-3 месяца):

💰 **Потенциальные возможности:**

⚠️ **Риски и митигация:**

🤔 **Стратегический вопрос:**

Бизнес-контекст: {noteTitle}
Категории: {tags} | Цели: {goals}

Данные для анализа:
{noteContent}`
    },
    reflection: {
      systemSuffix: "Вы мудрый помощник для саморефлексии, который помогает глубже понять себя и ситуации. Задаете правильные вопросы. ВАЖНО: Всегда отвечайте на том же языке, что и заметка пользователя.",
      userTemplate: `Помогаю вам в саморефлексии:

🤔 **Что говорит эта заметка о вас:**

🔄 **Связи и закономерности:**

✨ **Возможности для роста:**

📝 **Практические следующие шаги:**

❓ **Вопрос для глубокого размышления:**

Детали: {noteTitle} | {notePath} | {tags}
Ваш фокус: {goals}

Содержание для рефлексии:
{noteContent}`
    }
  },
  en: {
    mentor: {
      systemSuffix: "You are an experienced mentor with years of expertise in professional development. You share practical advice and help develop skills. IMPORTANT: Always respond in the same language as the user's note content.",
      userTemplate: `As your experienced mentor, let me analyze this note and provide professional recommendations:

📚 **Key Insights (2 sentences):**

🎯 **Development Plan (3-5 steps):**

🛠️ **Practical Skills to Study:**

❓ **Question for Reflection:**

Meta-information:
- Note: {noteTitle}
- Path: {notePath}
- Tags: {tags}
- Goals: {goals}

Note content:
{noteContent}`
    },
    coach: {
      systemSuffix: "You are a motivating coach who helps achieve goals and build beneficial habits. You focus on actions and results. IMPORTANT: Always respond in the same language as the user's note content.",
      userTemplate: `As your personal coach, providing motivating feedback:

💪 **What you're already doing well:**

🎯 **Action plan for tomorrow:**
1. 
2. 
3. 

⏰ **Specific timeframes:**

🏆 **Success criteria:**

🔥 **Motivational question:**

Note data: {noteTitle} | {tags} | {goals}

Material to analyze:
{noteContent}`
    },
    psychologist: {
      systemSuffix: "You are an empathetic psychologist who helps understand emotions, behavioral patterns, and internal processes. You create a safe space for reflection. IMPORTANT: Always respond in the same language as the user's note content.",
      userTemplate: `As a psychologist, helping you understand internal processes:

🧠 **Emotional Analysis:**

💡 **Behavioral Patterns:**

🌱 **Resources for Growth:**

🤝 **Self-Support Techniques:**

🔍 **Exploratory Question:**

Context: {noteTitle} in {notePath}
Tags: {tags} | Focus: {goals}

Material for analysis:
{noteContent}`
    },
    business: {
      systemSuffix: "You are an experienced business consultant with expertise in strategy, sales, and business development. You provide practical commercial advice. IMPORTANT: Always respond in the same language as the user's note content.",
      userTemplate: `As a business consultant, analyzing your situation:

💼 **Business Insights:**

📈 **Strategic Actions:**
- Short-term (1-2 weeks):
- Medium-term (1-3 months):

💰 **Potential Opportunities:**

⚠️ **Risks and Mitigation:**

🤔 **Strategic Question:**

Business context: {noteTitle}
Categories: {tags} | Goals: {goals}

Data for analysis:
{noteContent}`
    },
    reflection: {
      systemSuffix: "You are a wise assistant for self-reflection who helps understand yourself and situations more deeply. You ask the right questions. IMPORTANT: Always respond in the same language as the user's note content.",
      userTemplate: `Helping you with self-reflection:

🤔 **What this note reveals about you:**

🔄 **Connections and Patterns:**

✨ **Growth Opportunities:**

📝 **Practical Next Steps:**

❓ **Question for Deep Reflection:**

Details: {noteTitle} | {notePath} | {tags}
Your focus: {goals}

Content for reflection:
{noteContent}`
    }
  }
};

export function buildPrompt(args: {
  noteTitle: string;
  notePath: string;
  noteContent: string;
  tags: string[] | string;
  goals: string;
  persona: string;
}) {
  console.log('🔨 Building prompt with args:');
  console.log('- Note title:', args.noteTitle);
  console.log('- Note path:', args.notePath);
  console.log('- Note content length:', args.noteContent?.length || 0);
  console.log('- Note content preview:', args.noteContent?.substring(0, 100) + '...');
  console.log('- Goals:', args.goals);
  console.log('- Persona:', args.persona);

  const tags = Array.isArray(args.tags)
    ? args.tags.join(", ")
    : String(args.tags || "");
  
  console.log('- Processed tags:', tags);
    
  // Определяем язык заметки
  const language = detectLanguage(args.noteContent);
  
  // Определяем тип помощи на основе содержания
  const helpType = detectHelpType(args.noteContent);
  
  const templates = HELP_PROMPTS[language][helpType];
  
  console.log('🎯 Selected language templates:', language);
  console.log('🎯 Selected help type:', helpType);
  console.log('- System suffix preview:', templates.systemSuffix.substring(0, 100) + '...');
  
  // Формируем промпт на соответствующем языке
  const userPrompt = templates.userTemplate
    .replace('{noteTitle}', args.noteTitle)
    .replace('{notePath}', args.notePath)
    .replace('{tags}', tags)
    .replace('{goals}', args.goals)
    .replace('{noteContent}', args.noteContent);
  
  const result = {
    system: `${args.persona} ${templates.systemSuffix}`,
    user: userPrompt,
  };
  
  console.log('✅ Final prompt built:');
  console.log('- System prompt length:', result.system.length);
  console.log('- User prompt length:', result.user.length);
  console.log('- System prompt preview:', result.system.substring(0, 150) + '...');
  console.log('- User prompt preview:', result.user.substring(0, 200) + '...');
  
  return result;
}

// Функция получения промпта для конкретного типа помощи
export function getPromptForType(helpType: 'mentor' | 'coach' | 'psychologist' | 'business' | 'reflection', content: string): { system: string; user: string } {
  const language = detectLanguage(content);
  const templates = HELP_PROMPTS[language][helpType];
  
  console.log('📋 Getting prompt for type:', helpType, 'language:', language);
  
  return {
    system: templates.systemSuffix,
    user: templates.userTemplate.replace('{noteContent}', content)
      .replace('{noteTitle}', 'Текущий запрос')
      .replace('{notePath}', '/')
      .replace('{tags}', '')
      .replace('{goals}', '')
  };
}
