require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Config (env vars with fallback) ────────────────────────────────────────
const CONFIG = {
  IBM_API_KEY:    process.env.IBM_API_KEY    || "SL1Jc7cQN1pCAxyQtdanZpW9ayVhXye-i9qNN0AEvT40",
  IBM_PROJECT_ID: process.env.IBM_PROJECT_ID || "9801429b-e5e0-43e0-9061-4d57f0e232da",
  IBM_MODEL_ID:   process.env.IBM_MODEL_ID   || "ibm/granite-4-h-small",
  IBM_ENDPOINT:   process.env.IBM_ENDPOINT   || "https://eu-de.ml.cloud.ibm.com/ml/v1/text/chat?version=2023-05-29",
};

// ── Security & Middleware ───────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Too many requests, please slow down." },
});
app.use("/api/", limiter);

// ── IBM IAM Token Cache ─────────────────────────────────────────────────────
let iamTokenCache = { token: null, expiresAt: 0 };

async function getIAMToken() {
  const now = Date.now();
  if (iamTokenCache.token && now < iamTokenCache.expiresAt - 60_000) {
    return iamTokenCache.token;
  }
  const resp = await axios.post(
    "https://iam.cloud.ibm.com/identity/token",
    new URLSearchParams({
      grant_type: "urn:ibm:params:oauth:grant-type:apikey",
      apikey: CONFIG.IBM_API_KEY,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  iamTokenCache = {
    token: resp.data.access_token,
    expiresAt: now + resp.data.expires_in * 1000,
  };
  return iamTokenCache.token;
}

// ── System Prompt ───────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert Smart Business Agent powered by IBM watsonx AI (Granite model).
Your role is to help business professionals with:

1. Strategy & Planning — Business strategy, market analysis, growth planning, OKRs
2. Finance & Accounting — Financial analysis, budgeting, forecasting, ROI calculations
3. Sales & Marketing — Lead generation, campaign ideas, pricing strategies, customer retention
4. Operations — Process optimization, supply chain, workflow automation, KPIs
5. HR & Management — Hiring, performance reviews, team building, organizational design
6. Legal & Compliance — Contract guidance, regulatory awareness, risk management
7. Technology — Digital transformation, tool recommendations, IT strategy
8. Data & Analytics — Interpreting metrics, dashboards, business intelligence

Guidelines:
- Be concise, professional, and actionable.
- Use structured formatting (bullet points, numbered lists) when helpful.
- Provide specific, data-driven recommendations when possible.
- Ask clarifying questions if the business context is unclear.
- Always consider ROI and business impact in your advice.
- If asked about sensitive legal/financial matters, recommend consulting a certified professional.`;

// ── Mode prefixes ───────────────────────────────────────────────────────────
const MODE_INSTRUCTIONS = {
  strategy:   "Focus your response on strategic business planning and long-term growth. ",
  finance:    "Focus your response on financial analysis, numbers, and monetary impact. ",
  sales:      "Focus your response on sales tactics, customer acquisition, and revenue growth. ",
  operations: "Focus your response on operational efficiency, processes, and execution. ",
  hr:         "Focus your response on human resources, team dynamics, and organizational culture. ",
  general:    "",
};

// ── POST /api/chat ──────────────────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  const { messages, mode } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required." });
  }

  const modePrefix = MODE_INSTRUCTIONS[mode] || "";
  const lastMsg = messages[messages.length - 1];
  const augmented = [
    ...messages.slice(0, -1),
    { ...lastMsg, content: modePrefix + lastMsg.content },
  ];

  try {
    const token = await getIAMToken();

    const response = await axios.post(
      CONFIG.IBM_ENDPOINT,
      {
        model_id: CONFIG.IBM_MODEL_ID,
        project_id: CONFIG.IBM_PROJECT_ID,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...augmented],
        parameters: {
          max_new_tokens: 1024,
          temperature: 0.7,
          top_p: 0.95,
          repetition_penalty: 1.1,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 60000,
      }
    );

    const reply =
      response.data?.choices?.[0]?.message?.content ||
      response.data?.results?.[0]?.generated_text ||
      "I could not generate a response. Please try again.";

    res.json({ reply, model: CONFIG.IBM_MODEL_ID, usage: response.data?.usage || null });
  } catch (err) {
    console.error("watsonx error:", err?.response?.data || err.message);
    const status = err?.response?.status || 500;
    const errMsg =
      err?.response?.data?.errors?.[0]?.message ||
      err?.response?.data?.error ||
      "Failed to reach IBM watsonx. Please try again.";
    res.status(status).json({ error: errMsg });
  }
});

// ── GET /api/suggestions ────────────────────────────────────────────────────
app.get("/api/suggestions", (_req, res) => {
  res.json({
    suggestions: [
      "Create a 90-day go-to-market strategy for a SaaS startup",
      "Analyze the break-even point: $50k fixed costs, 40% gross margin",
      "Write a 3-step cold email sequence for enterprise B2B sales",
      "What KPIs should I track for an e-commerce business?",
      "Build an OKR framework for a 20-person engineering team",
      "Suggest cost reduction strategies without affecting quality",
      "How should I price my consulting services?",
      "Draft a performance review template for a sales team",
    ],
  });
});

// ── GET /api/health ─────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", model: CONFIG.IBM_MODEL_ID, timestamp: new Date().toISOString() });
});

// ── Fallback → frontend ─────────────────────────────────────────────────────
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n🤖 Smart Business Agent  →  http://localhost:${PORT}`);
  console.log(`   Model : ${CONFIG.IBM_MODEL_ID}`);
  console.log(`   Press Ctrl+C to stop\n`);
});
