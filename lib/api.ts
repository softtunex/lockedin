// A request body can arrive empty or truncated (client navigated away
// mid-request, connection dropped) — request.json() throws a raw
// SyntaxError in that case, which would otherwise surface as an unhandled
// 500. Every route that parses a JSON body should go through this instead.
export async function safeJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
