import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const CreateMuseumSchema = z.object({
  name: z.string().min(1, "Назва музею обов'язкова"),
  website: z.string().url().optional().or(z.literal("")),
  description: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = CreateMuseumSchema.parse(body);

    const museum = await prisma.museum.create({
      data: {
        name: validatedData.name,
        website: validatedData.website || null,
        description: validatedData.description || null,
      },
    });

    return NextResponse.json({ id: museum.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating museum:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
