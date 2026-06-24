const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const state = {
  messages: [],
  previewType: "mobile",
  lastSpec: "",
  settings: loadSettings(),
};

const defaultConcept = {
  title: "Mobile app concept",
  domain: "productivity",
  tone: "premium, clean, trustworthy",
  audience: "busy mobile users",
  palette: ["#8b5cf6", "#06b6d4", "#111827", "#f8fafc"],
  accent: "#8b5cf6",
  bg: "linear-gradient(160deg, #111827 0%, #172554 52%, #312e81 100%)",
  screens: ["Home", "Explore", "Create", "Profile"],
  components: ["Hero card", "Action CTA", "Metric cards", "Bottom tabs"],
  flow: ["Open app", "Choose goal", "See smart suggestion", "Confirm action"],
  copy: {
    pill: "AI design assistant",
    title: "Build better screens faster",
    subtitle: "Prompt the assistant and get a ready UI direction with flows, components, and specs.",
    cta: "Generate design",
  },
  metrics: [
    ["3", "core screens"],
    ["AA", "contrast"],
    ["8px", "spacing grid"],
    ["PWA", "Android ready"],
  ],
};

const els = {
  messages: $("#messages"),
  form: $("#chatForm"),
  input: $("#promptInput"),
  sendBtn: $("#sendBtn"),
  mockup: $("#mockup"),
  webMockup: $("#webMockup"),
  previewTitle: $("#previewTitle"),
  specOutput: $("#specOutput"),
  copySpecBtn: $("#copySpecBtn"),
  mobileViewBtn: $("#mobileViewBtn"),
  webViewBtn: $("#webViewBtn"),
  phoneFrame: $("#phoneFrame"),
  webFrame: $("#webFrame"),
  settingsBtn: $("#settingsBtn"),
  settingsDialog: $("#settingsDialog"),
  aiMode: $("#aiMode"),
  apiEndpoint: $("#apiEndpoint"),
  apiKey: $("#apiKey"),
  modelName: $("#modelName"),
  saveSettings: $("#saveSettings"),
  resetSettings: $("#resetSettings"),
  modeBadge: $("#modeBadge"),
  installBtn: $("#installBtn"),
};

init();

function init() {
  hydrateSettingsForm();
  updateModeBadge();
  renderConcept(defaultConcept);
  addMessage("assistant", "Assalamu alaikum! Ami DesignChat. Apni prompt dile ami app/web design idea, UX flow, color palette, components, ebong live preview suggest korte parbo.\n\nTry korun: ‘amar ekta fitness Android app lagbe, premium dark theme’. ");

  els.form.addEventListener("submit", onSubmit);
  els.input.addEventListener("input", autoResize);
  els.input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      els.form.requestSubmit();
    }
  });

  $$(".suggestions button").forEach((button) => {
    button.addEventListener("click", () => {
      els.input.value = button.dataset.prompt || "";
      autoResize();
      els.input.focus();
    });
  });

  els.mobileViewBtn.addEventListener("click", () => setPreviewType("mobile"));
  els.webViewBtn.addEventListener("click", () => setPreviewType("web"));
  els.copySpecBtn.addEventListener("click", copySpec);

  els.settingsBtn.addEventListener("click", () => els.settingsDialog.showModal());
  els.saveSettings.addEventListener("click", saveSettingsFromForm);
  els.resetSettings.addEventListener("click", () => {
    localStorage.removeItem("designchat-settings");
    state.settings = loadSettings();
    hydrateSettingsForm();
    updateModeBadge();
  });

  setupPwaInstall();
  registerServiceWorker();
}

async function onSubmit(event) {
  event.preventDefault();
  const prompt = els.input.value.trim();
  if (!prompt) return;
  addMessage("user", prompt);
  els.input.value = "";
  autoResize();
  setBusy(true);

  const typingId = addMessage("assistant", "Design bhabtechi…", { typing: true });
  try {
    const result = state.settings.mode === "openai"
      ? await callRealAi(prompt)
      : await demoAi(prompt);

    removeMessage(typingId);
    addMessage("assistant", result.reply);
    renderConcept(result.concept);
  } catch (error) {
    removeMessage(typingId);
    const fallback = await demoAi(prompt);
    addMessage("system", `Real AI call fail koreche: ${error.message}. Ekhon offline demo AI diye answer dilam.`);
    addMessage("assistant", fallback.reply);
    renderConcept(fallback.concept);
  } finally {
    setBusy(false);
  }
}

function addMessage(role, text, options = {}) {
  const id = `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const div = document.createElement("div");
  div.id = id;
  div.className = `message ${role}${options.typing ? " typing" : ""}`;
  div.textContent = text;
  els.messages.appendChild(div);
  els.messages.scrollTop = els.messages.scrollHeight;
  state.messages.push({ id, role, text });
  return id;
}

function removeMessage(id) {
  document.getElementById(id)?.remove();
  state.messages = state.messages.filter((m) => m.id !== id);
}

function setBusy(isBusy) {
  els.sendBtn.disabled = isBusy;
  els.sendBtn.textContent = isBusy ? "..." : "Send";
}

function autoResize() {
  els.input.style.height = "auto";
  els.input.style.height = `${Math.min(els.input.scrollHeight, 150)}px`;
}

async function demoAi(prompt) {
  await sleep(550);
  const concept = createConceptFromPrompt(prompt);
  const reply = [
    `Yes, eta PWA/web app-e kora possible. Apnar prompt theke ami “${concept.title}” direction nilam.`,
    "",
    "Suggested design:",
    `• Style: ${concept.tone}`,
    `• Audience: ${concept.audience}`,
    `• Main flow: ${concept.flow.join(" → ")}`,
    `• Components: ${concept.components.join(", ")}`,
    "",
    "Next step: apni chaile ami ei design-ke React/Next.js, Expo/React Native, ba pure HTML/CSS PWA code-e convert korte pari.",
  ].join("\n");
  return { reply, concept };
}

function createConceptFromPrompt(prompt) {
  const text = prompt.toLowerCase();
  const concept = structuredClone(defaultConcept);

  const domainRules = [
    {
      keys: ["food", "restaurant", "delivery", "khabar", "খাবার", "রেস্টুরেন্ট"],
      title: "Food delivery mobile app",
      domain: "food delivery",
      audience: "hungry users ordering in 2 minutes",
      tone: "warm, appetizing, fast, friendly",
      palette: ["#f97316", "#fb7185", "#1f2937", "#fff7ed"],
      accent: "#f97316",
      bg: "linear-gradient(160deg, #431407 0%, #7c2d12 52%, #fb923c 100%)",
      screens: ["Home", "Search", "Cart", "Orders"],
      components: ["Cuisine chips", "Restaurant card", "Cart CTA", "Delivery tracker"],
      flow: ["Pick cuisine", "Choose restaurant", "Customize meal", "Track delivery"],
      copy: { pill: "30 min delivery", title: "Crave it. Tap it. Eat it.", subtitle: "Personalized restaurants, clear fees, and live rider tracking.", cta: "Order now" },
      metrics: [["28m", "avg delivery"], ["4.8", "rating"], ["৳0", "hidden fee"], ["Live", "tracking"]],
    },
    {
      keys: ["fintech", "wallet", "bank", "money", "payment", "bkash", "nagad", "পেমেন্ট"],
      title: "Fintech wallet dashboard",
      domain: "fintech",
      audience: "mobile-first users managing money daily",
      tone: "secure, premium, data-rich, calm",
      palette: ["#06b6d4", "#22c55e", "#0f172a", "#ecfeff"],
      accent: "#06b6d4",
      bg: "linear-gradient(160deg, #0f172a 0%, #164e63 52%, #0891b2 100%)",
      screens: ["Wallet", "Send", "Cards", "Profile"],
      components: ["Balance card", "Quick transfer", "Spending chart", "Security badge"],
      flow: ["Check balance", "Select contact", "Confirm with PIN", "Get receipt"],
      copy: { pill: "Bank-grade security", title: "Your money, beautifully clear.", subtitle: "Track spend, send money, and manage cards from one calm dashboard.", cta: "Send money" },
      metrics: [["৳24k", "balance"], ["2.1k", "saved"], ["PIN", "secure"], ["24/7", "support"]],
    },
    {
      keys: ["fitness", "gym", "health", "workout", "diet", "wellness", "ফিটনেস"],
      title: "Fitness coaching app",
      domain: "fitness",
      audience: "users who want daily motivation and progress",
      tone: "energetic, premium, motivational, dark",
      palette: ["#a3e635", "#14b8a6", "#111827", "#f7fee7"],
      accent: "#84cc16",
      bg: "linear-gradient(160deg, #111827 0%, #14532d 54%, #65a30d 100%)",
      screens: ["Today", "Plan", "Progress", "Coach"],
      components: ["Workout card", "Progress ring", "Streak counter", "Coach tip"],
      flow: ["Set goal", "Start workout", "Log progress", "Get AI tip"],
      copy: { pill: "AI coach", title: "Small wins, every day.", subtitle: "Personal plans, streaks, and progress signals that keep users moving.", cta: "Start workout" },
      metrics: [["7", "day streak"], ["42%", "goal"], ["18m", "today"], ["AI", "coach"]],
    },
    {
      keys: ["education", "course", "learning", "school", "student", "শিক্ষা", "কোর্স"],
      title: "Education course app",
      domain: "education",
      audience: "students learning in short focused sessions",
      tone: "clear, encouraging, organized, friendly",
      palette: ["#6366f1", "#f59e0b", "#111827", "#eef2ff"],
      accent: "#6366f1",
      bg: "linear-gradient(160deg, #111827 0%, #3730a3 50%, #7c3aed 100%)",
      screens: ["Learn", "Courses", "Quiz", "Profile"],
      components: ["Course card", "Progress bar", "Quiz CTA", "Achievement badge"],
      flow: ["Choose course", "Watch lesson", "Take quiz", "Unlock badge"],
      copy: { pill: "15 min lessons", title: "Learn one skill at a time.", subtitle: "Structured courses, bite-size lessons, quizzes, and visible progress.", cta: "Continue lesson" },
      metrics: [["68%", "complete"], ["12", "lessons"], ["4", "quizzes"], ["XP", "rewards"]],
    },
    {
      keys: ["saas", "landing", "website", "web", "hero", "startup"],
      title: "SaaS landing page",
      domain: "saas",
      audience: "startup buyers comparing tools quickly",
      tone: "credible, crisp, high-conversion, modern",
      palette: ["#8b5cf6", "#06b6d4", "#0f172a", "#f8fafc"],
      accent: "#8b5cf6",
      bg: "linear-gradient(160deg, #0f172a 0%, #312e81 55%, #0891b2 100%)",
      screens: ["Hero", "Features", "Pricing", "FAQ"],
      components: ["Hero CTA", "Feature grid", "Social proof", "Pricing card"],
      flow: ["Read promise", "See features", "Compare pricing", "Start trial"],
      copy: { pill: "Ship 3x faster", title: "Design-ready product pages in minutes.", subtitle: "Turn rough prompts into polished landing pages, specs, and developer-ready structure.", cta: "Start free" },
      metrics: [["3x", "faster"], ["98%", "uptime"], ["14d", "trial"], ["SOC2", "ready"]],
    },
  ];

  const matched = domainRules.find((rule) => rule.keys.some((key) => text.includes(key)));
  if (matched) Object.assign(concept, matched);

  if (text.includes("dark")) {
    concept.tone = `${concept.tone}, dark mode`;
  }
  if (text.includes("premium") || text.includes("luxury")) {
    concept.tone = concept.tone.replace("friendly", "premium");
  }
  if (text.includes("dashboard")) {
    concept.components = ["KPI cards", "Chart module", "Activity feed", "Filter chips"];
    concept.flow = ["Open dashboard", "Scan KPIs", "Filter data", "Take action"];
  }
  if (text.includes("android") || text.includes("mobile") || text.includes("app")) {
    state.previewType = "mobile";
  }
  if (text.includes("landing") || text.includes("website") || text.includes("web")) {
    state.previewType = "web";
  }

  return concept;
}

async function callRealAi(prompt) {
  const { endpoint, apiKey, model } = state.settings;
  if (!endpoint) throw new Error("Endpoint URL missing");

  const system = `You are DesignChat, a Bengali/Banglish product design assistant. Reply concisely in Banglish. Give UI/UX suggestions, color, components, and next implementation steps. Also include a JSON object after the reply inside a code block named json with keys: title, tone, audience, palette, accent, screens, components, flow, copy {pill,title,subtitle,cta}.`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        ...state.messages.slice(-8).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text })),
        { role: "user", content: prompt },
      ],
      temperature: 0.75,
    }),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || data.message || data.reply || "AI response empty.";
  const concept = mergeAiConcept(createConceptFromPrompt(prompt), content);
  return { reply: content.replace(/```json[\s\S]*?```/g, "").trim(), concept };
}

function mergeAiConcept(base, content) {
  const match = content.match(/```json\s*([\s\S]*?)```/i);
  if (!match) return base;
  try {
    const parsed = JSON.parse(match[1]);
    return {
      ...base,
      ...parsed,
      palette: Array.isArray(parsed.palette) ? parsed.palette : base.palette,
      copy: { ...base.copy, ...(parsed.copy || {}) },
      accent: parsed.accent || parsed.palette?.[0] || base.accent,
      bg: parsed.bg || base.bg,
      metrics: base.metrics,
    };
  } catch {
    return base;
  }
}

function renderConcept(concept) {
  els.previewTitle.textContent = concept.title;
  const spec = makeSpec(concept);
  state.lastSpec = spec;
  els.specOutput.textContent = spec;
  renderMobileMockup(concept);
  renderWebMockup(concept);
  setPreviewType(state.previewType);
}

function renderMobileMockup(concept) {
  els.mockup.innerHTML = `
    <div class="mock-screen" style="--mock-bg:${escapeAttr(concept.bg)};--mock-accent:${escapeAttr(concept.accent)}">
      <div class="status-row"><span>9:41</span><span>●●● 5G ▰</span></div>
      <div class="mock-pill">✦ ${escapeHtml(concept.copy.pill)}</div>
      <h2 class="hero-title">${escapeHtml(concept.copy.title)}</h2>
      <p class="hero-copy">${escapeHtml(concept.copy.subtitle)}</p>
      <div class="glass-card big-card">
        <div class="mock-row">
          <div>
            <div class="card-title">${escapeHtml(concept.title)}</div>
            <div class="card-sub">${escapeHtml(concept.tone)}</div>
          </div>
          <div class="mock-pill">Live</div>
        </div>
        <button class="primary-cta" type="button">${escapeHtml(concept.copy.cta)}</button>
      </div>
      <div class="metric-grid">
        ${concept.metrics.map(([value, label]) => `<div class="metric"><b>${escapeHtml(value)}</b><span>${escapeHtml(label)}</span></div>`).join("")}
      </div>
      <div class="nav-tabs">
        ${concept.screens.slice(0, 4).map((screen) => `<span>${escapeHtml(screen)}</span>`).join("")}
      </div>
    </div>
  `;
}

function renderWebMockup(concept) {
  els.webMockup.innerHTML = `
    <div style="--mock-bg:${escapeAttr(concept.bg)};--mock-accent:${escapeAttr(concept.accent)};min-height:396px;background:var(--mock-bg);color:white;">
      <div class="web-nav">
        <div class="web-logo">${escapeHtml(shortBrand(concept.title))}</div>
        <div class="web-links"><span>Product</span><span>Design</span><span>Pricing</span><span>Contact</span></div>
      </div>
      <div class="web-hero">
        <div>
          <div class="mock-pill">✦ ${escapeHtml(concept.copy.pill)}</div>
          <h2 class="web-title">${escapeHtml(concept.copy.title)}</h2>
          <p class="web-copy">${escapeHtml(concept.copy.subtitle)}</p>
          <div class="web-cta"><button type="button">${escapeHtml(concept.copy.cta)}</button><button type="button">View demo</button></div>
        </div>
        <div class="web-side-card glass-card">
          <div class="card-title">${escapeHtml(concept.components[0] || "Smart card")}</div>
          <div class="card-sub">${escapeHtml(concept.flow.join(" → "))}</div>
        </div>
      </div>
      <div class="web-stat-grid">
        ${concept.metrics.slice(0, 3).map(([value, label]) => `<div class="metric"><b>${escapeHtml(value)}</b><span>${escapeHtml(label)}</span></div>`).join("")}
      </div>
    </div>
  `;
}

function makeSpec(concept) {
  return [
    `Project: ${concept.title}`,
    `Audience: ${concept.audience}`,
    `Tone: ${concept.tone}`,
    ``,
    `Palette:`,
    ...concept.palette.map((color, index) => `  ${index + 1}. ${color}`),
    ``,
    `Screens: ${concept.screens.join(", ")}`,
    `Components: ${concept.components.join(", ")}`,
    `UX Flow: ${concept.flow.join(" → ")}`,
    ``,
    `Implementation notes:`,
    `  - PWA installable on Android via manifest + service worker.`,
    `  - Use 8px spacing grid, 18–28px radius, AA contrast.`,
    `  - Production AI should run through backend proxy, not direct browser key.`,
  ].join("\n");
}

function setPreviewType(type) {
  state.previewType = type;
  els.mobileViewBtn.classList.toggle("active", type === "mobile");
  els.webViewBtn.classList.toggle("active", type === "web");
  els.phoneFrame.classList.toggle("hidden", type !== "mobile");
  els.webFrame.classList.toggle("hidden", type !== "web");
}

async function copySpec() {
  try {
    await navigator.clipboard.writeText(state.lastSpec);
    els.copySpecBtn.textContent = "Copied";
    setTimeout(() => (els.copySpecBtn.textContent = "Copy"), 1000);
  } catch {
    els.copySpecBtn.textContent = "Select text";
    setTimeout(() => (els.copySpecBtn.textContent = "Copy"), 1000);
  }
}

function loadSettings() {
  try {
    return { mode: "openai", endpoint: "/api/chat", apiKey: "", model: "gpt-4o-mini", ...JSON.parse(localStorage.getItem("designchat-settings") || "{}") };
  } catch {
    return { mode: "openai", endpoint: "/api/chat", apiKey: "", model: "gpt-4o-mini" };
  }
}

function hydrateSettingsForm() {
  els.aiMode.value = state.settings.mode || "demo";
  els.apiEndpoint.value = state.settings.endpoint || "";
  els.apiKey.value = state.settings.apiKey || "";
  els.modelName.value = state.settings.model || "gpt-4o-mini";
}

function saveSettingsFromForm(event) {
  event.preventDefault();
  state.settings = {
    mode: els.aiMode.value,
    endpoint: els.apiEndpoint.value.trim(),
    apiKey: els.apiKey.value.trim(),
    model: els.modelName.value.trim() || "gpt-4o-mini",
  };
  localStorage.setItem("designchat-settings", JSON.stringify(state.settings));
  updateModeBadge();
  els.settingsDialog.close();
}

function updateModeBadge() {
  const real = state.settings.mode === "openai";
  els.modeBadge.textContent = real ? "Real AI" : "Demo AI";
  els.modeBadge.style.borderColor = real ? "rgba(6,182,212,.42)" : "rgba(52,211,153,.34)";
  els.modeBadge.style.background = real ? "rgba(6,182,212,.12)" : "rgba(52,211,153,.10)";
}

function setupPwaInstall() {
  let deferredPrompt;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    els.installBtn.classList.remove("hidden");
  });
  els.installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    els.installBtn.classList.add("hidden");
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function shortBrand(title) { return title.split(" ").slice(0, 2).join(" ") || "DesignChat"; }
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}
function escapeAttr(value) { return escapeHtml(value).replace(/`/g, "&#96;"); }
