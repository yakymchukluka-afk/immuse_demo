import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { readFile } from "fs/promises";
import { join } from "path";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: museumId } = await params;
    
    // Get museum and pending/uploaded files
    const museum = await prisma.museum.findUnique({
      where: { id: museumId },
      include: {
        archives: {
          where: {
            status: {
              in: ["UPLOADED", "PENDING"]
            }
          }
        }
      }
    });

    if (!museum) {
      return NextResponse.json(
        { error: "Museum not found" },
        { status: 404 }
      );
    }

    if (museum.archives.length === 0) {
      return NextResponse.json(
        { error: "No files to ingest" },
        { status: 400 }
      );
    }

    // Create vector store if it doesn't exist
    let vectorStoreId = museum.vectorStoreId;
    if (!vectorStoreId) {
      const vectorStore = await openai.vectorStores.create({
        name: museum.name,
      });
      vectorStoreId = vectorStore.id;
      
      await prisma.museum.update({
        where: { id: museumId },
        data: { vectorStoreId }
      });
    }

    const results = [];
    
    for (const archive of museum.archives) {
      try {
        // Update status to INDEXING
        await prisma.archiveFile.update({
          where: { id: archive.id },
          data: { status: "INDEXING" }
        });

        let fileBuffer: Buffer;
        
        if (archive.sourceType === "URL" && archive.url) {
          // Download file from URL
          const response = await fetch(archive.url);
          if (!response.ok) {
            throw new Error(`Failed to download file: ${response.statusText}`);
          }
          fileBuffer = Buffer.from(await response.arrayBuffer());
        } else {
          // Read uploaded file
          fileBuffer = await readFile(archive.storagePath);
        }

        // Upload to OpenAI vector store
        const file = await openai.vectorStores.files.upload(vectorStoreId, {
          file: new File([fileBuffer], archive.filename, { 
            type: archive.mimeType || "application/octet-stream" 
          })
        });

        // Update status to READY
        await prisma.archiveFile.update({
          where: { id: archive.id },
          data: { 
            status: "READY",
            storagePath: archive.sourceType === "URL" ? archive.url : archive.storagePath
          }
        });

        results.push({
          id: archive.id,
          filename: archive.filename,
          status: "READY",
          openaiFileId: file.id
        });

      } catch (error) {
        console.error(`Error processing file ${archive.filename}:`, error);
        
        // Update status to FAILED
        await prisma.archiveFile.update({
          where: { id: archive.id },
          data: { 
            status: "FAILED",
            error: error instanceof Error ? error.message : "Unknown error"
          }
        });

        results.push({
          id: archive.id,
          filename: archive.filename,
          status: "FAILED",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    return NextResponse.json({
      vectorStoreId,
      counts: {
        total: museum.archives.length,
        ready: results.filter(r => r.status === "READY").length,
        failed: results.filter(r => r.status === "FAILED").length
      },
      results
    });

  } catch (error) {
    console.error("Error during ingest:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
