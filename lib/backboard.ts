import { BackboardClient } from "backboard-sdk";

const BACKBOARD_API_KEY = process.env.BACKBOARD_API_KEY!;
const BACKBOARD_ASSISTANT_ID = process.env.BACKBOARD_ASSISTANT_ID!;

export function getBackboardClient(): BackboardClient {
  if (!BACKBOARD_API_KEY) throw new Error("BACKBOARD_API_KEY is not set");
  return new BackboardClient({ apiKey: BACKBOARD_API_KEY, timeout: 60_000 });
}

export function getAssistantId(): string {
  if (!BACKBOARD_ASSISTANT_ID) throw new Error("BACKBOARD_ASSISTANT_ID is not set");
  return BACKBOARD_ASSISTANT_ID;
}

export async function createThread(): Promise<string> {
  const client = getBackboardClient();
  const assistantId = getAssistantId();
  const thread = await client.createThread(assistantId);
  return thread.threadId;
}
