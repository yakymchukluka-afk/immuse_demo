import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET() {
  try {
    // Test OpenAI API connection
    const models = await openai.models.list();
    
    // Test vector store creation
    const vectorStore = await openai.vectorStores.create({
      name: "Test Vector Store",
    });

    return NextResponse.json({
      success: true,
      modelsCount: models.data.length,
      vectorStoreId: vectorStore.id,
      message: "OpenAI API connection successful"
    });
  } catch (error) {
    console.error("OpenAI API test failed:", error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
