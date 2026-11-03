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
  const history = (Array.isArray(body.history) ? body.history : []).slice(-10)
    .map(m => (m.from === "user" ? "User: " : "Buddy: ") + String(m.text || "").slice(0, 800)).join("\n");

  const system =
    "You are Buddy, a friendly and smart AI assistant inside the Budnex budgeting app. " +
    "You can talk about anything: answer general questions, explain things, help with writing, maths, ideas, planning, small talk and more. " +
    "Money and budgeting is your specialty: when a question is about the user's money, use their own figures from the data below. " +
    "Answer in the user's language (language code: " + lang + "). Be concise by default, but give a full answer when the user asks for tips, a recipe or a plan. " +
    "Write plain text without markdown: no asterisks, no hashtags, use simple dashes for lists. " +
    "Items listed under prefs.fixed are fixed costs (such as rent or loan repayments) and items under prefs.keep are things the user does not want to cut: never suggest cutting those. " +
    "Understand what the names in the user's data mean, including brands, shops and services (for example Deliveroo, Uber Eats or Thuisbezorgd is food delivery, Netflix is streaming, Albert Heijn or Delhaize is groceries, Zara is clothing). " +
    "When the user asks where to save or how, go through their non-fixed expenses and give specific, creative and practical alternatives for each one, using their own amounts. " +
    "Example: for Deliveroo suggest cooking at home, finding easy recipes on YouTube or doing meal prep (cooking several portions at once), and if useful give a short simple recipe or a small meal prep plan with rough savings. " +
    "If the user asks for a recipe, a plan or step by step help, give it in full. " +
    "Use web search when you need current facts, news, prices or practical tips (for example how to save on something), and mention the source name briefly. " +
    "If the user says that something is a fixed cost or that they do not want to save on something, record it in the JSON fields below. " +
    "You are not a licensed financial, legal or medical advisor; do not give investment advice and suggest a professional for serious matters. " +
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
