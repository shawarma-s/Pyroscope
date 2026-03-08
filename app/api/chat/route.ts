import { NextRequest, NextResponse } from "next/server";
import { getBackboardClient, createThread } from "@/lib/backboard";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, thread_id: threadIdParam } = body as {
      message?: string;
      thread_id?: string;
    };
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }
    const client = getBackboardClient();
    const threadId = threadIdParam ?? (await createThread());
    const response = await client.addMessage(threadId, {
      content: message,
      stream: false,
      memory: "Auto",
    });
    const content = "content" in response ? String(response.content ?? "") : "";
    return NextResponse.json({ content, thread_id: threadId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
