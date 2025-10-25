import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const PREVIEW_SCHEMA = {
  type: "object",
  properties: {
    hero: {
      type: "object",
      properties: {
        title: { type: "string" },
        subtitle: { type: "string" }
      },
      required: ["title", "subtitle"]
    },
    what_to_expect: {
      type: "array",
      items: { type: "string" },
      maxItems: 6
    },
    route_preview: {
      type: "array",
      items: {
        type: "object",
        properties: {
          room: { type: "string" },
          focus: { type: "string" },
          why: { type: "string" },
          minutes: { type: "number" }
        },
        required: ["room", "focus", "why", "minutes"]
      },
      maxItems: 4
    },
    first_object: {
      type: "object",
      properties: {
        title: { type: "string" },
        room: { type: "string" },
        reason: { type: "string" },
        source_refs: { type: "array", items: { type: "string" } },
        search_query: { type: "string" },
        preferred_sources: { type: "array", items: { type: "string" } },
        image_urls: { type: "array", items: { type: "string" } }
      },
      required: ["title", "room", "reason", "search_query", "preferred_sources"]
    }
  },
  required: ["hero", "what_to_expect", "route_preview", "first_object"],
  additionalProperties: false
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { museumId, selections, museumData } = body;
    
    if (!museumId || !selections) {
      return NextResponse.json(
        { error: "Museum ID and selections are required" },
        { status: 400 }
      );
    }

    // Use the actual museum data passed from the client
    const museum = {
      name: museumData?.name || "Музей",
      description: museumData?.description || "немає опису",
      website: museumData?.website || "—"
    };

    // Generate personalized tour using ChatGPT
    try {
      const systemPrompt = `Ти — куратор і редактор коротких прев'ю для мобільного екрану. Відповідай УКРАЇНСЬКОЮ.
Створи захоплюючий та персоналізований тур на основі виборів користувача.

Будь ентузіастичним та позитивним! Використовуй фрази типу:
- "Чудово! Вас цікавить [інтереси]"
- "Музей [назва] має такі зали для вас:"
- "Там є такі експонати, які підтримають ваші знання у [тема]"

Створи конкретні назви залів та експонатів, які відповідають інтересам користувача.
Будь конкретним та релевантним до цього музею.`;

      const userPrompt = `Музей: ${museum.name}
Опис: ${museum.description}
Вебсайт: ${museum.website}

Вибори користувача:
- Мотивації: ${selections.motivations?.join(", ") || "не вказано"}
- Інтереси: ${selections.interests?.join(", ") || "не вказано"}
- Рівень: ${selections.level || "не вказано"}
- Час: ${selections.time || "не вказано"}

Створи персоналізований тур для цього користувача.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "Preview",
            schema: PREVIEW_SCHEMA,
            strict: true
          }
        },
        temperature: 0.8,
        max_tokens: 1500
      });

      const preview = JSON.parse(response.choices[0].message.content || '{}');
      
      // Enrich with images if available
      if (preview.first_object?.search_query) {
        const { image_urls, attribution } = await imageSearch(preview.first_object.search_query);
        preview.first_object.image_urls = image_urls || [];
        preview.first_object.attribution = attribution || "";
      }

      return NextResponse.json(preview);

    } catch (openaiError) {
      console.error("OpenAI error:", openaiError);
      
      // Return fallback preview if OpenAI fails
      const fallbackPreview = {
        hero: {
          title: `Персональний тур по ${museum.name}`,
          subtitle: "Адаптований під ваші інтереси"
        },
        what_to_expect: [
          "Інтерактивний маршрут по ключовим експонатам",
          "Детальні пояснення про історичний контекст",
          "Можливість задавати питання та отримувати відповіді",
          "Персоналізовані рекомендації для подальшого вивчення"
        ],
        route_preview: [
          {
            room: "Головний зал",
            focus: "Вступ до експозиції музею",
            why: "Ознайомлення з основною колекцією",
            minutes: 15
          },
          {
            room: "Спеціальна експозиція",
            focus: "Експонати за вашими інтересами",
            why: "Персоналізований контент для вас",
            minutes: 20
          }
        ],
        first_object: {
          title: "Цікавий експонат",
          room: "Головний зал",
          reason: "Цей експонат відповідає вашим інтересам",
          source_refs: ["музейний_каталог"],
          search_query: `${museum.name} експонат`,
          preferred_sources: ["Wikimedia", "офіційний сайт музею"],
          image_urls: [],
          attribution: ""
        }
      };

      return NextResponse.json(fallbackPreview);
    }

  } catch (error) {
    console.error("Error generating preview:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function imageSearch(query: string): Promise<{image_urls: string[], attribution: string}> {
  // For demo purposes, return placeholder images
  // In production, this would integrate with Wikimedia API, Google CSE, etc.
  
  const demoImages = [
    "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop"
  ];

  return {
    image_urls: demoImages,
    attribution: "Зображення з Unsplash"
  };
}
