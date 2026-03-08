import { NextResponse } from "next/server";
import { createThread } from "@/lib/backboard";

export async function POST() {
  try {
    const threadId = await createThread();
    return NextResponse.json({ thread_id: threadId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create thread";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
