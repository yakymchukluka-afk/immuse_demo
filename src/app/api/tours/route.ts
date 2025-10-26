import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CreateTourSchema = z.object({
  museumId: z.string(),
  interests: z.array(z.string()),
  level: z.enum(["Діти", "Дорослі", "Професіонали"]),
  minutes: z.number().min(15).max(180),
});

const TOUR_SCHEMA = {
  type: "object",
  properties: {
    museum: { type: "string" },
    total_minutes: { type: "number" },
    stops: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          room: { type: "string" },
          minutes: { type: "number" },
          why: { type: "string" },
          source_refs: { type: "array", items: { type: "string" } }
        },
        required: ["title","minutes","why"]
      }
    },
    route_notes: { type: "string" },
    fallbacks: { type: "array", items: { type: "string" } }
  },
  required: ["museum","total_minutes","stops"]
} as const;

const SYSTEM_UA = `Ви — куратор та планувальник маршрутів. Відповідайте УКРАЇНСЬКОЮ.
Використовуйте лише дані прикріплених файлів музею (пошук по файлах увімкнено).
Побудуйте лінійний маршрут, що вкладається у вказаний час та рівень.
Враховуйте інтереси користувача; коротко пояснюйте кожну зупинку ("чому це важливо").
Якщо доступні назви/номери залів — вказуйте їх.
ПОВЕРНІТЬ ЛИШЕ JSON за наданою схемою.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = CreateTourSchema.parse(body);

    // Get museum with vector store
    const museum = await prisma.museum.findUnique({
      where: { id: validatedData.museumId },
    });

    if (!museum) {
      return NextResponse.json(
        { error: "Museum not found" },
        { status: 404 }
      );
    }

    if (!museum.vectorStoreId) {
      return NextResponse.json(
        { error: "Museum archives not processed yet" },
        { status: 400 }
      );
    }

    // Create tour request
    const tourRequest = await prisma.tourRequest.create({
      data: {
        museumId: validatedData.museumId,
        interests: validatedData.interests,
        level: validatedData.level,
        minutes: validatedData.minutes,
      },
    });

    try {
      // Generate tour using OpenAI Chat Completions API with file search
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: SYSTEM_UA
          },
          {
            role: "user",
            content: `Музей: ${museum.name}\nІнтереси: ${validatedData.interests.join(", ")}\nРівень: ${validatedData.level}\nЧас: ${validatedData.minutes} хв`
          }
        ],
        tools: [{ 
          type: "file_search"
        }],
        tool_resources: {
          file_search: {
            vector_store_ids: [museum.vectorStoreId!]
          }
        },
        response_format: { 
          type: "json_schema", 
          json_schema: { 
            name: "TourPlan", 
            schema: TOUR_SCHEMA, 
            strict: true 
          } 
        }
      });

      // Parse the response
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content in response");
      }
      const resultJson = JSON.parse(content);

      // Create tour plan
      const tourPlan = await prisma.tourPlan.create({
        data: {
          museumId: validatedData.museumId,
          tourRequestId: tourRequest.id,
          resultJson,
        },
      });

      return NextResponse.json({
        id: tourPlan.id,
        tourRequestId: tourRequest.id,
        result: resultJson
      });

    } catch (openaiError) {
      console.error("OpenAI API error:", openaiError);
      
      // Create a fallback tour plan
      const fallbackResult = {
        museum: museum.name,
        total_minutes: validatedData.minutes,
        stops: [
          {
            title: "Вступна екскурсія",
            room: "Головний зал",
            minutes: Math.min(validatedData.minutes, 30),
            why: "Загальний огляд музею та його колекції",
            source_refs: []
          }
        ],
        route_notes: "Тур буде доступний після обробки архівів музею",
        fallbacks: ["Перевірте наявність оброблених архівів"]
      };

      const tourPlan = await prisma.tourPlan.create({
        data: {
          museumId: validatedData.museumId,
          tourRequestId: tourRequest.id,
          resultJson: fallbackResult,
        },
      });

      return NextResponse.json({
        id: tourPlan.id,
        tourRequestId: tourRequest.id,
        result: fallbackResult,
        warning: "Fallback tour generated due to API error"
      });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating tour:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
