import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { museumName, level, minutes, interests } = body;

    const prompt = `Підготуй короткий тур для першої кімнати музею "${museumName}" для відвідувача з рівнем "${level}" та часом ${minutes} хвилин. 
    
Інтереси відвідувача: ${interests.join(", ")}.

Структура відповіді:
1. Привітання та підтвердження місцезнаходження
2. Короткий опис кімнати
3. 2-3 ключові об'єкти для огляду
4. Як ці об'єкти пов'язані з інтересами відвідувача

Відповідай українською мовою, стисло та зрозуміло.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Ти експерт-гід музею. Створюй короткі, зрозумілі тури українською мовою."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    const tourContent = response.choices[0]?.message?.content || "Не вдалося згенерувати тур.";

    return NextResponse.json({
      museumName,
      tourContent,
      level,
      minutes,
      interests
    });

  } catch (error) {
    console.error("Error generating tour preview:", error);
    return NextResponse.json(
      { error: "Failed to generate tour preview" },
      { status: 500 }
    );
  }
}
