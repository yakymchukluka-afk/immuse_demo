import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tourId } = await params;
    
    const tourPlan = await prisma.tourPlan.findUnique({
      where: { id: tourId },
      include: {
        museum: {
          select: {
            name: true,
            description: true
          }
        },
        tourRequest: {
          select: {
            interests: true,
            level: true,
            minutes: true,
            createdAt: true
          }
        }
      }
    });

    if (!tourPlan) {
      return NextResponse.json(
        { error: "Tour not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: tourPlan.id,
      museum: tourPlan.museum,
      tourRequest: tourPlan.tourRequest,
      result: tourPlan.resultJson,
      createdAt: tourPlan.createdAt
    });

  } catch (error) {
    console.error("Error getting tour:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
