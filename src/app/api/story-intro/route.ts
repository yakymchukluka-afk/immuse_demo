import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const STORY_INTRO_SCHEMA = {
  type: "object",
  properties: {
    welcome: {
      type: "object",
      properties: {
        title: { type: "string" },
        paragraph: { type: "string" }
      },
      required: ["title", "paragraph"]
    },
    outline: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          room: { type: "string" },
          summary: { type: "string" },
          key_objects: { type: "array", items: { type: "string" }, maxItems: 3 },
          source_refs: { type: "array", items: { type: "string" } }
        },
        required: ["room", "summary"]
      }
    },
    time_note: { type: "string" },
    cta_label: { type: "string" }
  },
  required: ["welcome", "outline", "time_note", "cta_label"],
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

    // Generate personalized story intro using ChatGPT
    try {
      const systemPrompt = `Ти — доброзичливий музейний оповідач. Відповідай УКРАЇНСЬКОЮ.
Створи короткий «теплий» вступ до персонального туру (120–180 слів) + міні-план кімнат.

Правила:
- Тон: привітний, легкий, але інформативний. Звертайся до відвідувача на «ви».
- Узгодь фокус вступу з вибраними інтересами (напр., економіка/політика, іконопис, Азія тощо).
- Дай короткий нарис маршруту з 2–5 пунктів (по 1–2 речення), де кожен пункт — «Кімната/Зал → що побачите і чому це важливо саме для вибраних інтересів».
- Якщо доступні назви залів — використовуй їх. Якщо ні — вкажи «Кімната 1/2/…».
- Не використовуй розмітку Markdown; поверни ЛИШЕ JSON за наданою схемою.
- Додай кілька коротких source_refs виду "назва_файлу p.X" або "секція: Y", якщо можливо.
- Для key_objects використовуй РЕАЛЬНІ назви експонатів, які можуть бути в музеї (наприклад: "Портрет невідомого дворянина", "Пейзаж з пастухами", "Бюст римського імператора", "Скринька з інкрустацією", "Ікона Богородиці", "Японська гравюра"). НЕ використовуй загальні фрази типу "Головний експонат" або "Спеціальний об'єкт".`;

      const userPrompt = `Музей: ${museum.name}
Опис: ${museum.description}
Вибори користувача:
- Мотивації: ${selections.motivations?.join(", ") || "не вказано"}
- Інтереси: ${selections.interests?.join(", ") || "не вказано"}
- Рівень: ${selections.level || "не вказано"}
- Час: ${selections.time || "не вказано"} (орієнтуй тривалість вступу і план під цей час)

Додатково:
- Якщо у матеріалах є план поверху/номери залів — використовуй їх.
- Зроби привітальний абзац + короткий план з 2–5 пунктів.
- Закінчи блоком із короткою вказівкою тривалості та готовим текстом кнопки: "Розпочати тур".`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "StoryIntro",
            schema: STORY_INTRO_SCHEMA,
            strict: true
          }
        },
        temperature: 0.8,
        max_tokens: 1200
      });

      const storyIntro = JSON.parse(response.choices[0].message.content || '{}');
      return NextResponse.json(storyIntro);

    } catch (openaiError) {
      console.error("OpenAI error:", openaiError);
      
      // Return fallback story intro if OpenAI fails
      const fallbackIntro = {
        welcome: {
          title: "Ласкаво просимо!",
          paragraph: `Цей маршрут підлаштований під ваші інтереси: ${selections.interests?.join(", ") || "загальні інтереси"}. Почніть із першої кімнати й рухайтесь за підказками; у кінці ви зможете залишити оцінку та коментарі, щоб ми зробили тур іще кращим.`
        },
        outline: [
          {
            room: "Зал європейського живопису",
            summary: "Колекція картин від Ренесансу до бароко, включаючи роботи італійських та фламандських майстрів.",
            key_objects: ["Портрет невідомого дворянина", "Пейзаж з пастухами", "Натюрморт з фруктами"],
            source_refs: ["каталог_європейського_живопису.pdf"]
          },
          {
            room: "Зал скульптури", 
            summary: "Мармурові та бронзові скульптури, що демонструють еволюцію мистецтва від античності до сучасності.",
            key_objects: ["Бюст римського імператора", "Скульптура Афродіти", "Сучасна абстрактна композиція"],
            source_refs: ["скульптурна_колекція.txt"]
          },
          {
            room: "Зал декоративно-ужиткового мистецтва",
            summary: "Меблі, посуд та прикраси, що показують розвиток ремесел та дизайну протягом століть.",
            key_objects: ["Скринька з інкрустацією", "Порцеляновий сервіз", "Срібний кубок"],
            source_refs: ["декоративне_мистецтво.pdf"]
          }
        ],
        time_note: `Орієнтовна тривалість маршруту: ${selections.time || "60 хв"}.`,
        cta_label: "Розпочати тур"
      };

      return NextResponse.json(fallbackIntro);
    }

  } catch (error) {
    console.error("Error generating story intro:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
