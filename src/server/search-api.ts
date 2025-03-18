import { Database } from "bun:sqlite";

const DB_PATH = process.env.DB_PATH || `${process.cwd()}/chat.db`;
const db = new Database(DB_PATH);

interface Message {
  id: number;
  user_id?: number;
  content: string;
  created_at: string;
  username?: string;
  is_bot?: boolean;
  bot_name?: string;
}

export const searchMessages = async (
  query: string | null,
  startDate: string | null,
  endDate: string | null,
): Promise<Message[]> => {
  let sql = `
    SELECT m.*, u.username
    FROM messages m
    LEFT JOIN users u ON m.user_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (query) {
    sql += ` AND m.content LIKE ?`;
    params.push(`%${query}%`);
  }

  if (startDate) {
    sql += ` AND m.created_at >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    sql += ` AND m.created_at <= ?`;
    params.push(endDate);
  }

  sql += ` ORDER BY m.created_at DESC LIMIT 100`; // Add a limit to prevent huge result sets

  const stmt = db.prepare(sql);
  const messages = stmt.all(...params) as Message[];

  return messages.map((msg) => ({
    ...msg,
    username: msg.is_bot ? msg.bot_name : msg.username,
  }));
};

export async function handleSearchRequest(
  req: Request,
  user: any,
): Promise<Response> {
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const query = url.searchParams.get("query");
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  try {
    const messages = await searchMessages(query, startDate, endDate);
    return new Response(JSON.stringify(messages), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Search error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Search failed",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
