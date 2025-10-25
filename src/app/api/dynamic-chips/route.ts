import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CHIP_SCHEMA = {
  type: "object",
  properties: {
    motivations: { type: "array", items: { type: "string" }, maxItems: 10 },
    interests: { type: "array", items: { type: "string" }, maxItems: 20 },
    levels: { type: "array", items: { type: "string" } },
    times: { type: "array", items: { type: "string" } }
  },
  required: ["motivations", "interests", "levels", "times"],
  additionalProperties: false
};

const FALLBACK_MOTIVATIONS = [
  "Хочу більше дізнатись про авторів",
  "Хочу розібратися з колекцією", 
  "Вперше тут",
  "Я турист",
  "Тимчасові виставки",
  "Атмосфера і простір",
  "Фото-можливості",
  "Для дітей/сім'ї",
  "Рекомендація друзів",
  "Освітня мета / дослідження"
];

const FALLBACK_INTERESTS = [
  "Європейський живопис",
  "Ренесанс",
  "Бароко / Рококо",
  "Портрет / Пейзаж / Натюрморт",
  "Іконопис",
  "Скульптура",
  "Декоративно-ужиткове",
  "Азійське мистецтво",
  "Античність / Археологія",
  "Релігія та міфологія",
  "Історія і суспільство",
  "Техніка та матеріали",
  "Колекціонери та меценати"
];

const FIXED_LEVELS = ["Для дітей", "Базовий", "Поглиблений", "Професійний"];
const FIXED_TIMES = ["30 хв", "60 хв", "90 хв", "120+ хв"];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { museumId, museumData } = body;
    
    if (!museumId || !museumData) {
      return NextResponse.json(
        { error: "Museum ID and museum data are required" },
        { status: 400 }
      );
    }

    // Use the actual museum data passed from the client
    const museum = {
      name: museumData.name || "Музей",
      description: museumData.description || "немає опису",
      website: museumData.website || "—"
    };

    // Try to generate dynamic chips using OpenAI
    try {
      const systemPrompt = `Ти — куратор і стратег онбордингу музею. Відповідай УКРАЇНСЬКОЮ.
Поверни ЛИШЕ JSON зі списками чіпсів, адаптованими саме до цього музею.
Кожен пункт — 1–4 слова. Створи релевантні варіанти на основі типу музею та його колекції.

МОТИВАЦІЇ (motivations): Чому люди можуть відвідати саме цей музей? Що їх приваблює?
ІНТЕРЕСИ (interests): Які конкретні теми, періоди, стилі або експонати цікавлять відвідувачів цього музею?

Будь конкретним та релевантним до цього музею.`;

      const userPrompt = `Музей: ${museum.name}
Опис: ${museum.description}
Вебсайт: ${museum.website}

Створи персоналізовані варіанти для цього конкретного музею.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "ChipSets",
            schema: CHIP_SCHEMA,
            strict: true
          }
        },
        temperature: 0.7,
        max_tokens: 1000
      });

      const dynamicChips = JSON.parse(response.choices[0].message.content || '{}');
      
      return NextResponse.json({
        motivations: dedupeOrFallback(dynamicChips.motivations || [], FALLBACK_MOTIVATIONS),
        interests: dedupeOrFallback(dynamicChips.interests || [], FALLBACK_INTERESTS),
        levels: FIXED_LEVELS,
        times: FIXED_TIMES
      });

    } catch (openaiError) {
      console.error("OpenAI error:", openaiError);
      // Return fallback chips if OpenAI fails
      return NextResponse.json({
        motivations: FALLBACK_MOTIVATIONS,
        interests: FALLBACK_INTERESTS,
        levels: FIXED_LEVELS,
        times: FIXED_TIMES
      });
    }

  } catch (error) {
    console.error("Error generating dynamic chips:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function dedupeOrFallback(dynamic: string[], fallback: string[]): string[] {
  if (!dynamic || dynamic.length === 0) return fallback;
  
  // Remove duplicates and ensure we have enough items
  const unique = [...new Set(dynamic)];
  return unique.length >= 5 ? unique : [...unique, ...fallback.slice(0, 5 - unique.length)];
}
