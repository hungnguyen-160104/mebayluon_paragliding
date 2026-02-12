// app/api/chatbot/route.ts
import { NextResponse } from "next/server";
import { postAsk } from "@/services/chatbot.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await postAsk(body); // trả lời dựa trên data/faq.json (không cần DB)
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/chatbot error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
