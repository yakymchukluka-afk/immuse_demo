import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: museumId } = await params;
    
    const museum = await prisma.museum.findUnique({
      where: { id: museumId },
      include: {
        archives: {
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!museum) {
      return NextResponse.json(
        { error: "Museum not found" },
        { status: 404 }
      );
    }

    const fileStatuses = museum.archives.map(archive => ({
      id: archive.id,
      filename: archive.filename,
      status: archive.status,
      error: archive.error,
      createdAt: archive.createdAt
    }));

    // Determine overall status
    const statusCounts = museum.archives.reduce((acc, archive) => {
      acc[archive.status] = (acc[archive.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    let overallStatus = "READY";
    if (statusCounts.FAILED > 0) {
      overallStatus = "FAILED";
    } else if (statusCounts.INDEXING > 0 || statusCounts.UPLOADED > 0 || statusCounts.PENDING > 0) {
      overallStatus = "INDEXING";
    }

    return NextResponse.json({
      museumId,
      vectorStoreId: museum.vectorStoreId,
      overallStatus,
      statusCounts,
      files: fileStatuses
    });

  } catch (error) {
    console.error("Error getting ingest status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
