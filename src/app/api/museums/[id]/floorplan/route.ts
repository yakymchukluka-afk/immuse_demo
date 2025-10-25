import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const FloorplanStructureSchema = z.object({
  floors: z.array(z.object({
    name: z.string(),
    rooms: z.array(z.object({
      id: z.string(),
      name: z.string(),
      bbox: z.array(z.number()).length(4) // [x, y, width, height]
    })),
    markers: z.array(z.object({
      id: z.string(),
      title: z.string(),
      roomId: z.string(),
      point: z.array(z.number()).length(2), // [x, y]
      keywords: z.array(z.string()),
      estMinutes: z.number()
    }))
  }))
});

const FloorplanSchema = z.object({
  notes: z.string().optional(),
  structure: FloorplanStructureSchema.optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: museumId } = await params;
    
    // For demo purposes, just return success without database operations
    const contentType = request.headers.get("content-type") || "";
    
    if (contentType.includes("multipart/form-data")) {
      // Handle multipart form data (image + structure)
      const formData = await request.formData();
      const image = formData.get("image") as File;
      const notes = formData.get("notes") as string;
      const structureJson = formData.get("structure") as string;
      
      let structure = null;
      if (structureJson) {
        try {
          const parsedStructure = JSON.parse(structureJson);
          structure = FloorplanStructureSchema.parse(parsedStructure);
        } catch (error) {
          return NextResponse.json(
            { error: "Invalid structure JSON" },
            { status: 400 }
          );
        }
      }

      // For demo, just return success
      return NextResponse.json({ 
        id: `floorplan_${Date.now()}`,
        imagePath: image ? `uploads/${museumId}/floorplan/${image.name}` : null,
        notes: notes || null,
        structure: structure || null
      });
    } else {
      // Handle JSON only
      const body = await request.json();
      const validatedData = FloorplanSchema.parse(body);

      // For demo, just return success
      return NextResponse.json({ 
        id: `floorplan_${Date.now()}`,
        imagePath: null,
        notes: validatedData.notes || null,
        structure: validatedData.structure || null
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error saving floorplan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
