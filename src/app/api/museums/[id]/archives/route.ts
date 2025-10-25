import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const UploadArchiveSchema = z.object({
  url: z.string().url().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: museumId } = await params;
    
    // Check if museum exists
    const museum = await prisma.museum.findUnique({
      where: { id: museumId },
    });

    if (!museum) {
      return NextResponse.json(
        { error: "Museum not found" },
        { status: 404 }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    
    if (contentType.includes("multipart/form-data")) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get("file") as File;
      
      if (!file) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 }
        );
      }

      // Create uploads directory if it doesn't exist
      const uploadsDir = join(process.cwd(), "uploads", museumId);
      await mkdir(uploadsDir, { recursive: true });

      // Save file
      const filename = `${randomUUID()}-${file.name}`;
      const filePath = join(uploadsDir, filename);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);

      // Create archive record
      const archiveFile = await prisma.archiveFile.create({
        data: {
          museumId,
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          storagePath: filePath,
          sourceType: "UPLOAD",
          status: "UPLOADED",
        },
      });

      return NextResponse.json({ 
        id: archiveFile.id,
        filename: archiveFile.filename,
        status: archiveFile.status 
      });
    } else {
      // Handle URL
      const body = await request.json();
      const validatedData = UploadArchiveSchema.parse(body);
      
      if (!validatedData.url) {
        return NextResponse.json(
          { error: "URL is required for URL upload" },
          { status: 400 }
        );
      }

      const archiveFile = await prisma.archiveFile.create({
        data: {
          museumId,
          filename: new URL(validatedData.url).pathname.split("/").pop() || "archive",
          storagePath: "", // Will be filled during ingest
          sourceType: "URL",
          url: validatedData.url,
          status: "PENDING",
        },
      });

      return NextResponse.json({ 
        id: archiveFile.id,
        filename: archiveFile.filename,
        status: archiveFile.status 
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error uploading archive:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
