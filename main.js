// Buddy: een Appwrite Function die de vraag + een samenvatting van je cijfers
// doorstuurt naar Claude (Anthropic), eventueel met zoeken op het internet.
// De API-sleutel staat als geheime variabele ANTHROPIC_API_KEY in Appwrite, nooit in je website.

module.exports = async ({ req, res, log, error }) => {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.json({ error: "ANTHROPIC_API_KEY ontbreekt" }, 500);

  let body = {};
  try { body = req.bodyJson || JSON.parse(req.bodyText || req.body || "{}"); } catch (e) {}
  const question = String(body.question || "").slice(0, 1000).trim();
  if (!question) return res.json({ error: "Geen vraag" }, 400);

  const lang = String(body.lang || "nl").slice(0, 10);
  const context = JSON.stringify(body.context || {}).slice(0, 12000);
  const history = (Array.isArray(body.history) ? body.history : []).slice(-6)
    .map(m => (m.from === "user" ? "User: " : "Buddy: ") + String(m.text || "").slice(0, 600)).join("\n");

  const system =
    "You are Buddy, a friendly budgeting assistant inside the Budnex app. " +
    "Answer in the user's language (language code: " + lang + "). Keep answers short, concrete and practical (max about 180 words). " +
    "Use the user's own figures from the data below. " +
    "Items listed under prefs.fixed are fixed costs (such as rent or loan repayments) and items under prefs.keep are things the user does not want to cut: never suggest cutting those. " +
    "When the user asks how to save or asks for tips, use web search to find current, practical tips and mention the source name briefly. " +
    "If the user says that something is a fixed cost or that they do not want to save on something, record it in the JSON fields below. " +
    "You are not a financial advisor; do not give investment or legal advice. " +
    "Reply with ONLY a JSON object, no other text: " +
    '{"answer":"your reply","fixed":["names the user said are fixed costs"],"keep":["names the user does not want to cut"]}. ' +
    "Use empty arrays when there is nothing new to record.\n\nUser data (JSON): " + context;

  const userText = (history ? "Recent conversation:\n" + history + "\n\n" : "") + "Question: " + question;

  async function ask(withSearch) {
    const payload = {
      model: process.env.MODEL || "claude-haiku-5-5",
      max_tokens: 1500,
      system: system,
      messages: [{ role: "user", content: userText }]
    };
    if (withSearch) payload.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }];
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    return { ok: r.ok, j: j };
  }

  try {
    let out = await ask(true);
    if (!out.ok) {               // bv. zoeken niet beschikbaar: probeer zonder zoeken
      error("Met zoeken mislukt: " + JSON.stringify(out.j));
      out = await ask(false);
    }
    if (!out.ok) {
      error(JSON.stringify(out.j));
      return res.json({ error: (out.j && out.j.error && out.j.error.message) || "API-fout" }, 502);
    }
    const text = (out.j.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
    let result = { answer: text, fixed: [], keep: [] };
    const a = text.indexOf("{"), b = text.lastIndexOf("}");
    if (a > -1 && b > a) {
      try {
        const p = JSON.parse(text.slice(a, b + 1));
        if (p && typeof p.answer === "string") {
          result = { answer: p.answer, fixed: Array.isArray(p.fixed) ? p.fixed : [], keep: Array.isArray(p.keep) ? p.keep : [] };
        }
      } catch (e) {}
    }
    return res.json(result);
  } catch (e) {
    error(String(e));
    return res.json({ error: "Er ging iets mis" }, 500);
  }
};
