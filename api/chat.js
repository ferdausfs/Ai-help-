export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is not configured on the server.",
        hint: "Vercel → Project → Settings → Environment Variables → add OPENAI_API_KEY, then Redeploy.",
      });
    }

    const body = normalizeBody(req.body);
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const model = process.env.OPENAI_MODEL || body.model || "gpt-4o-mini";

    if (messages.length === 0) {
      return res.status(400).json({ error: "messages[] is required" });
    }

    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: typeof body.temperature === "number" ? body.temperature : 0.75,
      }),
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: data.error?.message || "OpenAI API request failed",
        details: data,
      });
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Server error",
      hint: "Check Vercel → Deployments → Function Logs for the exact stack trace.",
    });
  }
}

function normalizeBody(body) {
  if (!body) return {};
  if (typeof body === "string") {
    try { return JSON.parse(body); } catch { return {}; }
  }
  if (Buffer.isBuffer(body)) {
    try { return JSON.parse(body.toString("utf8")); } catch { return {}; }
  }
  return body;
}
