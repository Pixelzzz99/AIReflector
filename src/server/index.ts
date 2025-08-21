import Fastify from "fastify";
import cors from "@fastify/cors";
import type { FastifyRequest, FastifyReply } from "fastify";
import * as dotenv from "dotenv";

// Загружаем переменные окружения
dotenv.config();

interface AnalyzeBody {
  input: { system: string; user: string };
  model: string;
  temperature?: number;
  stream?: boolean;
}

interface AIResponse {
  adviceMd: string;
  score?: number;
  actions?: string[];
}

// Функция для вызова OpenAI API
async function callOpenAI(
  messages: Array<{ role: string; content: string }>,
  model: string,
  temperature: number
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY не установлен");
  }

  const requestBody = {
    model,
    messages,
    temperature,
    max_tokens: 1500,
  };

  console.log('🚀 OpenAI API Request:');
  console.log('Model:', model);
  console.log('Temperature:', temperature);
  console.log('Messages:', messages.map(m => ({ role: m.role, length: m.content.length })));
  console.log('Full request body:', JSON.stringify(requestBody, null, 2));

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  console.log('📡 OpenAI API Response Status:', response.status);
  console.log('Response status text:', response.statusText);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('❌ OpenAI API Error Response:', errorData);
    throw new Error(`OpenAI API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  console.log('✅ OpenAI API Success Response:');
  console.log('Response structure:', Object.keys(data));
  console.log('Choices count:', data.choices?.length || 0);
  console.log('Content length:', data.choices?.[0]?.message?.content?.length || 0);
  console.log('Response content preview:', data.choices?.[0]?.message?.content?.substring(0, 300) + '...');
  
  return data.choices[0]?.message?.content || "";
}

// Функция для вызова Claude API
async function callClaude(
  messages: Array<{ role: string; content: string }>,
  model: string,
  temperature: number
): Promise<string> {
  const apiKey = process.env.CLAUDE_API_KEY || null;

  if (!apiKey) {
    throw new Error("CLAUDE_API_KEY не установлен");
  }

  // Преобразуем формат сообщений для Claude API
  const systemMessage = messages.find(m => m.role === "system");
  const userMessages = messages.filter(m => m.role !== "system");
  
  const requestBody = {
    model,
    max_tokens: 1500,
    temperature,
    system: systemMessage?.content || "",
    messages: userMessages,
  };

  console.log('🚀 Claude API Request:');
  console.log('Model:', model);
  console.log('Temperature:', temperature);
  console.log('System prompt:', systemMessage?.content?.substring(0, 100) + '...');
  console.log('User message:', userMessages[0]?.content?.substring(0, 200) + '...');
  console.log('Full request body:', JSON.stringify(requestBody, null, 2));
  
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(requestBody),
  });

  console.log('📡 Claude API Response Status:', response.status);
  console.log('Response status text:', response.statusText);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('❌ Claude API Error Response:', errorData);
    throw new Error(`Claude API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  console.log('✅ Claude API Success Response:');
  console.log('Response structure:', Object.keys(data));
  console.log('Content length:', data.content?.[0]?.text?.length || 0);
  console.log('Full response:', JSON.stringify(data, null, 2));
  console.log('Response text preview:', data.content?.[0]?.text?.substring(0, 300) + '...');
  
  return data.content[0]?.text || "";
}

// Функция для парсинга ответа ИИ и извлечения действий
function parseAIResponse(content: string): AIResponse {
  const lines = content.split('\n');
  const actions: string[] = [];
  let score: number | undefined;

  // Ищем действия в bullet points или нумерованных списках
  const actionRegex = /^[\s]*[-*]\s*(.+)|^\d+\.\s*(.+)/;
  
  for (const line of lines) {
    const match = line.match(actionRegex);
    if (match) {
      const action = (match[1] || match[2]).trim();
      if (action.length > 5 && action.length < 100) { // Фильтруем по разумной длине
        actions.push(action);
      }
    }
  }

  // Пытаемся извлечь числовую оценку
  const scoreMatch = content.match(/(\d+)\/100|score[:\s]*(\d+)|(\d+)\s*%/i);
  if (scoreMatch) {
    const scoreStr = scoreMatch[1] || scoreMatch[2] || scoreMatch[3];
    const parsedScore = parseInt(scoreStr);
    if (parsedScore >= 0 && parsedScore <= 100) {
      score = parsedScore;
    }
  }

  return {
    adviceMd: content,
    score,
    actions: actions.slice(0, 5), // Ограничиваем до 5 действий
  };
}

async function startServer() {
  console.log("Создание Fastify экземпляра...");
  
  const fastify = Fastify({ 
    logger: true
  });

  console.log("Регистрация CORS плагина...");
  
  // Регистрируем CORS плагин
  await fastify.register(cors, {
    origin: true,
    credentials: true
  });

  console.log("Настройка маршрутов...");

  fastify.post(
    "/analyze",
    async (req: FastifyRequest<{ Body: AnalyzeBody }>, reply: FastifyReply) => {
      try {
        const { input, model, temperature = 0.3 } = req.body;

        console.log('📥 Received analyze request:');
        console.log('Model:', model);
        console.log('Temperature:', temperature);
        console.log('System input length:', input?.system?.length || 0);
        console.log('User input length:', input?.user?.length || 0);
        console.log('System input preview:', input?.system?.substring(0, 100) + '...');
        console.log('User input preview:', input?.user?.substring(0, 200) + '...');

        if (!input || !input.system || !input.user) {
          console.log('❌ Missing required fields in request');
          return reply.status(400).send({
            error: "Missing required fields: input.system and input.user"
          });
        }

        const messages = [
          { role: "system", content: input.system },
          { role: "user", content: input.user }
        ];

        let aiResponse: string;
        
        console.log('🤖 Determining AI provider...');
        
        // Определяем, какой API использовать на основе модели
        if (model.includes("claude") || model.includes("sonnet")) {
          console.log('📡 Using Claude API');
          aiResponse = await callClaude(messages, model, temperature);
        } else {
          console.log('📡 Using OpenAI API');
          aiResponse = await callOpenAI(messages, model, temperature);
        }
        
        console.log('✅ AI Response received:');
        console.log('Response length:', aiResponse?.length || 0);
        console.log('Response preview:', aiResponse?.substring(0, 300) + '...');
        
        if (!aiResponse) {
          throw new Error("Пустой ответ от ИИ");
        }

        // Парсим ответ
        const parsedResponse = parseAIResponse(aiResponse);

        // Логируем для отладки
        console.log('🎯 Analysis completed:', {
          model,
          temperature,
          responseLength: aiResponse.length,
          actionsFound: parsedResponse.actions?.length || 0,
          score: parsedResponse.score
        });

        console.log('📤 Sending response with parsed data');

        return reply.send(parsedResponse);

      } catch (error: any) {
        console.error('Error in /analyze endpoint:', error);
        
        // Возвращаем детальную информацию об ошибке
        return reply.status(500).send({
          error: "Ошибка при анализе заметки",
          details: error.message,
          // В продакшене лучше не показывать stack trace
          ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
        });
      }
    }
  );

  // Новый endpoint для умной системы советов
  fastify.post<{
    Body: {
      message: string;
      helpType: 'mentor' | 'coach' | 'psychologist' | 'business' | 'reflection';
    };
  }>(
    "/api/advice",
    async (request: FastifyRequest<{ Body: { message: string; helpType: string } }>, reply: FastifyReply) => {
      console.log('💬 New advice request received');
      console.log('- Message length:', request.body.message.length);
      console.log('- Help type:', request.body.helpType);
      console.log('- Message preview:', request.body.message.substring(0, 100) + '...');
      
      try {
        const { message, helpType } = request.body;
        
        if (!message || !message.trim()) {
          return reply.status(400).send({ error: "Сообщение не может быть пустым" });
        }
        
        // Определяем язык сообщения
        const isRussian = /[а-яё]/i.test(message);
        const language = isRussian ? 'ru' : 'en';
        console.log('- Detected language:', language);
        
        // Создаем промпт в зависимости от типа помощи и языка
        const systemPrompts = {
          ru: {
            mentor: "Вы опытный наставник с многолетним опытом в профессиональном развитии. Делитесь практическими советами и помогаете развивать навыки. Отвечайте на русском языке.",
            coach: "Вы мотивирующий тренер, который помогает достигать целей и формировать полезные привычки. Фокусируетесь на действиях и результатах. Отвечайте на русском языке.",
            psychologist: "Вы эмпатичный психолог, который помогает понять эмоции, паттерны поведения и внутренние процессы. Создаете безопасное пространство для размышлений. Отвечайте на русском языке.",
            business: "Вы опытный бизнес-консультант с экспертизой в стратегии, продажах и развитии бизнеса. Даете практичные коммерческие советы. Отвечайте на русском языке.",
            reflection: "Вы мудрый помощник для саморефлексии, который помогает глубже понять себя и ситуации. Задаете правильные вопросы. Отвечайте на русском языке."
          },
          en: {
            mentor: "You are an experienced mentor with years of expertise in professional development. You share practical advice and help develop skills. Respond in English.",
            coach: "You are a motivating coach who helps achieve goals and build beneficial habits. You focus on actions and results. Respond in English.",
            psychologist: "You are an empathetic psychologist who helps understand emotions, behavioral patterns, and internal processes. You create a safe space for reflection. Respond in English.",
            business: "You are an experienced business consultant with expertise in strategy, sales, and business development. You provide practical commercial advice. Respond in English.",
            reflection: "You are a wise assistant for self-reflection who helps understand yourself and situations more deeply. You ask the right questions. Respond in English."
          }
        };
        
        const systemPrompt = systemPrompts[language][helpType as keyof typeof systemPrompts['ru']] || systemPrompts[language].reflection;
        console.log('- Using system prompt for:', helpType, 'in', language);
        
        // Вызываем Claude API
        const messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ];
        
        const response = await callClaude(messages, "claude-3-5-sonnet-20241022", 0.7);
        
        console.log('✅ Claude response received');
        console.log('- Response length:', response.length);
        console.log('- Response preview:', response.substring(0, 150) + '...');
        
        return {
          response: response,
          persona: helpType,
          language: language,
          timestamp: Date.now()
        };
        
      } catch (error: any) {
        console.error('❌ Error in /api/advice endpoint:', error);
        
        return reply.status(500).send({
          error: "Ошибка при получении совета",
          details: error.message
        });
      }
    }
  );

  fastify.get("/health", async () => ({ ok: true }));

  console.log("Запуск сервера на порту 8787...");

  try {
    await fastify.listen({ port: 8787, host: "0.0.0.0" });
    console.log("Сервер успешно запущен на порту 8787!");
  } catch (err) {
    console.error("Ошибка при запуске сервера:", err);
    process.exit(1);
  }
}

// Запускаем сервер
console.log("Начальный запуск...");
startServer().catch(err => {
  console.error("Критическая ошибка при запуске сервера:", err);
  process.exit(1);
});
