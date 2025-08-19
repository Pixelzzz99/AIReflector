// Функция определения языка текста
function detectLanguage(text: string): "ru" | "en" {
  // Очищаем текст от специальных символов и цифр для более точного анализа
  const cleanText = text.replace(/[^a-zA-Zа-яёА-ЯЁ\s]/g, " ");

  const cyrillicChars = cleanText.match(/[а-яёА-ЯЁ]/g);
  const latinChars = cleanText.match(/[a-zA-Z]/g);

  if (!cyrillicChars && !latinChars) {
    return "en";
  }

  if (!cyrillicChars) {
    return "en";
  }

  if (!latinChars) {
    return "ru";
  }

  // Определяем по процентному соотношению
  const totalChars = cyrillicChars.length + latinChars.length;
  const cyrillicPercent = (cyrillicChars.length / totalChars) * 100;

  const detectedLanguage = cyrillicPercent >= 40 ? "ru" : "en";

  return detectedLanguage;
}

// Шаблоны промптов на разных языках
const PROMPTS = {
  ru: {
    systemSuffix:
      "Вы являетесь опытным рефлексивным коучем. Выводите компактный, удобный для просмотра Markdown с пронумерованными шагами, когда это полезно. ВАЖНО: Всегда отвечайте на том же языке, что и содержание заметки пользователя.",
    userTemplate: `Вам дана личная заметка из Obsidian. Проанализируйте её и ответьте НА ТОМ ЖЕ ЯЗЫКЕ, что и заметка:

1) Два предложения рефлексии, которые захватывают основной инсайт.
2) 3–5 действенных следующих шагов, настроенных под мои цели.
3) Если заметка включает задачи или решения, предложите простое правило принятия решений или чек-лист.
4) Один вопрос, который поможет двигаться вперед.

Ограничения: будьте конкретны, избегайте банальностей, не повторяйте текст заметки. Используйте маркированные списки и короткие предложения. ОТВЕЧАЙТЕ НА ТОМ ЖЕ ЯЗЫКЕ, ЧТО И СОДЕРЖИМОЕ ЗАМЕТКИ.

Мета:
- Название заметки: {noteTitle}
- Путь: {notePath}
- Теги: {tags}
- Мои цели/фокус: {goals}

Заметка (последние N символов):


{noteContent}`,
  },
  en: {
    systemSuffix:
      "You are an expert reflective coach. Output compact, skimmable Markdown with numbered steps when useful. IMPORTANT: Always respond in the same language as the user's note content.",
    userTemplate: `You are given a personal note from Obsidian. Analyze it and return in the SAME LANGUAGE as the note:

1) A two-sentence reflection that captures the core insight.
2) 3–5 actionable next steps tailored to my goals.
3) If the note includes tasks or decisions, propose a simple decision rule or checklist.
4) One question that would move me forward.

Constraints: be concrete, avoid platitudes, don't repeat the note text. Use bullet points and short sentences. RESPOND IN THE SAME LANGUAGE AS THE NOTE CONTENT.

Meta:
- Note Title: {noteTitle}
- Path: {notePath}
- Tags: {tags}
- My goals/focus: {goals}

Note (last N chars):


{noteContent}`,
  },
};

export function buildPrompt(args: {
  noteTitle: string;
  notePath: string;
  noteContent: string;
  tags: string[] | string;
  goals: string;
  persona: string;
}) {
  const tags = Array.isArray(args.tags)
    ? args.tags.join(", ")
    : String(args.tags || "");

  // Определяем язык заметки
  const language = detectLanguage(args.noteContent);
  console.log("🔍 Определенный язык:", language);
  const templates = PROMPTS[language];

  // Формируем промпт на соответствующем языке
  const userPrompt = templates.userTemplate
    .replace("{noteTitle}", args.noteTitle)
    .replace("{notePath}", args.notePath)
    .replace("{tags}", tags)
    .replace("{goals}", args.goals)
    .replace("{noteContent}", args.noteContent);

  const result = {
    system: `${args.persona} ${templates.systemSuffix}`,
    user: userPrompt,
  };

  return result;
}
