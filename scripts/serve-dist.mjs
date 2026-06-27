import { createReadStream, existsSync, readFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";

const root = resolve("dist");
const port = Number(process.env.PORT || process.argv[2] || 5173);
const walkNetworkCache = new Map();

function loadDotEnv() {
  const envPath = resolve(".env");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = value;
  }
}

loadDotEnv();

const host = process.env.HOST || "127.0.0.1";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
  ".webp": "image/webp",
};

function readJson(request) {
  return new Promise((resolveJson, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 18_000_000) {
        reject(new Error("Request is too large."));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolveJson(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON request."));
      }
    });
  });
}

function writeJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

async function handleWalkNetwork(url, response) {
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  const radius = Math.min(900, Math.max(300, Number(url.searchParams.get("radius")) || 700));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < 22 || lat > 27 || lon < 51 || lon > 57) {
    writeJson(response, 400, { error: "Choose a valid start point inside the UAE." });
    return;
  }

  const cacheKey = `${lat.toFixed(3)}:${lon.toFixed(3)}:${radius}`;
  const cached = walkNetworkCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < 10 * 60 * 1000) {
    writeJson(response, 200, cached.data);
    return;
  }

  const query = `[out:json][timeout:25];
(
  way(around:${radius},${lat},${lon})["highway"~"^(footway|path|pedestrian|living_street|residential|service)$"]["access"!~"^(no|private)$"]["foot"!="no"];
  node(around:${radius},${lat},${lon})["natural"="tree"];
  way(around:${radius},${lat},${lon})["natural"="wood"];
  way(around:${radius},${lat},${lon})["landuse"="forest"];
  way(around:${radius},${lat},${lon})["leisure"="park"];
  way(around:${radius},${lat},${lon})["building"];
);
out body;
>;
out skel qt;`;
  const endpoints = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://overpass.nchc.org.tw/api/interpreter",
  ];
  try {
    let data = null;
    let lastError = null;
    for (const endpoint of endpoints) {
      const { controller, timer } = withTimeout(25_000);
      try {
        const result = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "User-Agent": "AfiaCare-UAE-School-Demo/1.0",
          },
          body: new URLSearchParams({ data: query }),
          signal: controller.signal,
        });
        if (!result.ok) throw new Error(`provider returned ${result.status}`);
        data = await result.json();
        break;
      } catch (error) {
        lastError = error;
      } finally {
        clearTimeout(timer);
      }
    }
    if (!data) throw new Error(lastError?.name === "AbortError" ? "OpenStreetMap providers timed out." : `OpenStreetMap providers unavailable: ${lastError?.message || "unknown error"}`);
    if (!Array.isArray(data.elements)) throw new Error("OpenStreetMap returned an invalid walking network.");
    walkNetworkCache.set(cacheKey, { createdAt: Date.now(), data });
    if (walkNetworkCache.size > 12) walkNetworkCache.delete(walkNetworkCache.keys().next().value);
    writeJson(response, 200, data);
  } catch (error) {
    writeJson(response, /timed out/i.test(error.message) ? 504 : 502, {
      error: error.message,
    });
  }
}

function envNumber(key, fallback) {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function withTimeout(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { controller, timer };
}

function compactText(text, maxChars = envNumber("LOCAL_LLM_MAX_PROMPT_CHARS", 3200)) {
  const value = String(text || "");
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.floor(maxChars * 0.35))}\n...\n${value.slice(-Math.floor(maxChars * 0.65))}`;
}

function messagesFromInput(input, maxChars = envNumber("LOCAL_LLM_MAX_PROMPT_CHARS", 3200)) {
  if (Array.isArray(input)) {
    return input.map((message) => ({
      role: message.role === "system" ? "system" : message.role === "assistant" ? "assistant" : "user",
      content: compactText(typeof message.content === "string" ? message.content : JSON.stringify(message.content || ""), maxChars),
    }));
  }
  return [{ role: "user", content: compactText(input, maxChars) }];
}

function parseJsonishText(text, fallback) {
  try {
    const clean = String(text || "")
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    const firstBrace = clean.indexOf("{");
    const lastBrace = clean.lastIndexOf("}");
    const jsonText = firstBrace >= 0 && lastBrace > firstBrace ? clean.slice(firstBrace, lastBrace + 1) : clean;
    return JSON.parse(jsonText);
  } catch {
    return fallback;
  }
}

function requireVisionText(text, model) {
  const value = String(text || "").trim();
  if (value) return value;

  const error = new Error(
    `LM Studio returned an empty response for Food Vision using "${model}". Load a vision-capable model such as smolvlm-500m-instruct in LM Studio, or set LOCAL_FOOD_VISION_MODEL to the exact loaded vision model.`,
  );
  error.statusCode = 502;
  throw error;
}

function normalizeMovementStep(value) {
  return displayText(value, "")
    .replace(/^[-*\d.)\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMovementCandidate(candidate, keys = []) {
  for (const key of keys) {
    if (candidate?.[key] != null) return candidate[key];
  }
  return undefined;
}

function safeMovementPattern(mode) {
  if (mode === "walking") {
    return /route|condition|warm|walk|pace|water|shade|cool|calf|breath|breathe|posture|steady|comfortable/i;
  }
  if (mode === "stretching") {
    return /breathe|breath|roll|stretch|wrist|shoulder|neck|back|spine|twist|fold|hamstring|calf|hip|mobility|relax/i;
  }
  return /march|push|squat|step|breath|breathe|cool|chair|wall|steady|controlled|mobility|stretch|balance/i;
}

function unsafeMovementPattern(mode) {
  const common = /traffic|road|street|car|vehicle|blind|closed eyes|eyes closed|safety line|listen for traffic|run fast|sprint|jump into|ignore pain|push through pain/i;
  if (mode === "walking") {
    return new RegExp(`${common.source}|shoulder level|arms at shoulder level|step on and off`, "i");
  }
  return common;
}

function parseMovementPlanText(text, fallbackPlan, mode = "exercise") {
  const jsonPlan = parseJsonishText(text, null);
  let candidate = jsonPlan;

  if (!candidate || typeof candidate !== "object") {
    const lines = String(text || "")
      .replace(/```(?:json)?/gi, "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const fieldPatterns = {
      title: /^title\s*:/i,
      duration: /^(?:duration|time|minutes|length)\s*:/i,
      focus: /^(?:focus|goal|purpose|benefit|note|description)\s*:/i,
      safety: /^(?:safety|safetv|caution|warning|care)\s*:/i,
    };
    const field = (name) => lines.find((line) => fieldPatterns[name]?.test(line))?.replace(/^[^:]+:\s*/, "").trim();
    const numberedSteps = lines
      .map((line) => line.match(/^(?:\d+[.)]|[-*])\s*(.+)$/)?.[1]?.trim())
      .filter(Boolean);
    candidate = {
      title: field("title"),
      duration: field("duration"),
      focus: field("focus"),
      steps: numberedSteps,
      safety: field("safety"),
    };
  }

  if (candidate && typeof candidate === "object") {
    candidate = {
      title: extractMovementCandidate(candidate, ["title", "name", "routineTitle", "planTitle", "headline"]),
      duration: extractMovementCandidate(candidate, ["duration", "time", "minutes", "length"]),
      focus: extractMovementCandidate(candidate, ["focus", "goal", "purpose", "benefit", "note", "description"]),
      steps: extractMovementCandidate(candidate, ["steps", "moves", "routine", "plan", "instructions", "sequence", "exercises"]),
      safety: extractMovementCandidate(candidate, ["safety", "caution", "warning", "care"]),
    };
  }

  const blockedContext = /tour|museum|architecture|ancient|old town|picnic|river|alley|sightsee/i;
  const movementContext = /walk|walking|warm|pace|water|breath|breathe|cool|stretch|posture|shade|condition|march|squat|push|step|movement|exercise|routine|shoulder|wrist|neck|hamstring|chair|rest|mobility|twist|fold|pose|flow|lunge|calf|ankle|hip|spine|cat[-\s]?cow|child(?:'s)? pose|wall|grounding|balance|reach|circle/i;
  const safePattern = safeMovementPattern(mode);
  const unsafePattern = unsafeMovementPattern(mode);
  const rawSteps = displayList(candidate.steps)
    .map((step) => normalizeMovementStep(step))
    .filter(Boolean)
    .filter((step) => !unsafePattern.test(step));
  const validSteps = rawSteps.filter((step) => movementContext.test(step) && safePattern.test(step) && !blockedContext.test(step));
  const steps = (validSteps.length >= 3 ? validSteps : rawSteps.filter((step) => !blockedContext.test(step)))
    .slice(0, 7);
  const candidateTitle = displayText(candidate.title, fallbackPlan.title);
  const candidateFocus = displayText(candidate.focus, fallbackPlan.focus);
  const candidateSafety = displayText(candidate.safety, fallbackPlan.safety);
  const hasUsableMetadata =
    movementContext.test(candidateTitle) ||
    movementContext.test(candidateFocus) ||
    /pain|dizz|chest pain|stop/i.test(candidateSafety);
  if (!steps.length && !hasUsableMetadata) return null;
  for (const fallbackStep of fallbackPlan.steps) {
    if (steps.length >= 5) break;
    const normalizedFallback = normalizeMovementStep(fallbackStep);
    if (!normalizedFallback || steps.includes(normalizedFallback)) continue;
    steps.push(normalizedFallback);
  }

  return {
    title: movementContext.test(candidateTitle) && !blockedContext.test(candidateTitle) ? candidateTitle : fallbackPlan.title,
    duration: /minute|min\b/i.test(String(candidate.duration || ""))
      ? displayText(candidate.duration, fallbackPlan.duration)
      : fallbackPlan.duration,
    focus: blockedContext.test(String(candidate.focus || "")) || unsafePattern.test(String(candidate.focus || ""))
      ? fallbackPlan.focus
      : displayText(candidate.focus, fallbackPlan.focus),
    steps,
    safety: /pain|dizz|chest pain|stop/i.test(String(candidate.safety || ""))
      ? displayText(candidate.safety, fallbackPlan.safety)
      : fallbackPlan.safety,
  };
}

function displayText(value, fallback = "unknown") {
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value && typeof value === "object") {
    return (
      value.text ||
      value.name ||
      value.label ||
      value.value ||
      value.description ||
      JSON.stringify(value)
    );
  }
  return fallback;
}

function displayList(value) {
  if (Array.isArray(value)) return value.map((item) => displayText(item, "")).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/\n|,/)
      .map((item) => item.replace(/^[-*\d.\s]+/, "").trim())
      .filter(Boolean);
  }
  if (value && typeof value === "object") return Object.values(value).map((item) => displayText(item, "")).filter(Boolean);
  return [];
}

function clampUiText(text, maxChars = 96) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars - 1).trim()}...`;
}

function displayShortList(value, maxItems = 6, maxChars = 96) {
  return displayList(value)
    .filter((item) => item && !/^\*\*?what|^\*\*?is there|^\*\*?describe/i.test(item))
    .filter((item) => !/\b(the image shows|visible food is|visible in the image|to answer any questions|describe the visible food|main ingredient is)\b/i.test(item))
    .map((item) => clampUiText(item, maxChars))
    .slice(0, maxItems);
}

const foodVocabulary = [
  "spaghetti squash",
  "butternut squash",
  "pesto sauce",
  "pesto",
  "basil",
  "mozzarella",
  "cheese",
  "tomato sauce",
  "tomato",
  "gnocchi",
  "pasta",
  "noodle",
  "rice",
  "bread",
  "potato",
  "sweet potato",
  "oats",
  "cereal",
  "chicken",
  "fish",
  "tuna",
  "salmon",
  "egg",
  "eggs",
  "beef",
  "lamb",
  "shrimp",
  "lentil",
  "beans",
  "chickpea",
  "hummus",
  "tofu",
  "yogurt",
  "labneh",
  "milk",
  "salad",
  "lettuce",
  "spinach",
  "cucumber",
  "carrot",
  "broccoli",
  "vegetable",
  "vegetables",
  "greens",
  "apple",
  "banana",
  "orange",
  "berries",
  "mango",
  "grapes",
  "dates",
  "dragon fruit",
  "pitaya",
  "nuts",
  "almond",
  "walnut",
  "peanut",
  "avocado",
  "olive oil",
  "oil",
  "burger",
  "pizza",
  "fries",
  "fried food",
  "cake",
  "dessert",
];

function rawFoodText(raw = {}) {
  return [
    raw.text,
    raw.description,
    raw.analysis,
    raw.answer,
    raw.summary,
    raw.caption,
    raw.dishName,
    raw.dish,
    ...(Array.isArray(raw.suggestions) ? raw.suggestions : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function extractFoodsFromLooseVision(raw = {}) {
  const current = displayList(raw.detectedFoods || raw.foods);
  const text = rawFoodText(raw);
  const fromText = foodVocabulary.filter((food) => text.includes(food));
  const combined = [...current, ...fromText]
    .map((food) => String(food).toLowerCase().replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const specific = combined.filter(
    (food, index, list) => !list.some((other) => other !== food && other.includes(food)),
  );

  return [...new Set(specific)].slice(0, 8);
}

function displayNutrients(value) {
  const source = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? Object.entries(value).map(([name, detail]) => ({ name, detail }))
      : [];

  return source
    .map((item) => {
      if (typeof item === "string") {
        return { name: displayText(item, ""), functions: [] };
      }
      const name = displayText(item?.name || item?.nutrient || item?.label, "");
      if (!name) return null;
      return {
        name,
        likelySource: displayText(item?.likelySource || item?.source || item?.foodSourcesInDish, ""),
        functions: displayList(item?.functions || item?.bodyFunctions || item?.helpsWith || item?.detail).slice(0, 3),
      };
    })
    .filter(Boolean)
    .slice(0, 8);
}

function titleCaseFood(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parseCalorieNumber(value) {
  const text = String(value || "");
  const numbers = text.match(/\d+/g)?.map(Number).filter((number) => Number.isFinite(number));
  if (!numbers?.length) return 0;
  return Math.round(numbers.reduce((total, number) => total + number, 0) / numbers.length);
}

const foodCalorieFacts = [
  { match: ["dragon fruit", "pitaya"], calories: 60, serving: "1 cup", group: "fruit" },
  { match: ["spaghetti squash"], calories: 42, serving: "1 cup cooked", group: "vegetable" },
  { match: ["butternut squash"], calories: 82, serving: "1 cup cooked", group: "vegetable" },
  { match: ["pesto sauce", "pesto"], calories: 80, serving: "1 tbsp", group: "fat" },
  { match: ["basil"], calories: 5, serving: "fresh garnish", group: "vegetable" },
  { match: ["tomato sauce"], calories: 70, serving: "1/2 cup", group: "vegetable" },
  { match: ["mozzarella", "cheese"], calories: 85, serving: "30 g", group: "protein" },
  { match: ["gnocchi"], calories: 250, serving: "1 cup", group: "grain" },
  { match: ["apple"], calories: 95, serving: "1 medium", group: "fruit" },
  { match: ["banana"], calories: 105, serving: "1 medium", group: "fruit" },
  { match: ["orange"], calories: 70, serving: "1 medium", group: "fruit" },
  { match: ["dates"], calories: 66, serving: "2 dates", group: "fruit" },
  { match: ["rice"], calories: 205, serving: "1 cup cooked", group: "grain" },
  { match: ["bread"], calories: 80, serving: "1 slice", group: "grain" },
  { match: ["pasta"], calories: 220, serving: "1 cup cooked", group: "grain" },
  { match: ["potato"], calories: 160, serving: "1 medium", group: "starch" },
  { match: ["chicken"], calories: 165, serving: "100 g", group: "protein" },
  { match: ["fish", "tuna", "salmon"], calories: 180, serving: "100 g", group: "protein" },
  { match: ["egg", "eggs"], calories: 78, serving: "1 large", group: "protein" },
  { match: ["lentil", "beans", "chickpea", "hummus"], calories: 190, serving: "1 cup or serving", group: "protein" },
  { match: ["yogurt"], calories: 120, serving: "1 cup", group: "protein" },
  { match: ["labneh"], calories: 90, serving: "2 tbsp", group: "protein" },
  { match: ["salad", "lettuce", "spinach", "cucumber", "tomato", "carrot"], calories: 45, serving: "1 bowl", group: "vegetable" },
  { match: ["nuts", "almond", "walnut", "peanut"], calories: 170, serving: "small handful", group: "fat" },
  { match: ["avocado"], calories: 120, serving: "1/2 fruit", group: "fat" },
  { match: ["burger"], calories: 500, serving: "1 burger", group: "mixed" },
  { match: ["pizza"], calories: 285, serving: "1 slice", group: "mixed" },
  { match: ["fries", "fried"], calories: 365, serving: "1 medium serving", group: "mixed" },
];

const nutrientAmountFacts = [
  {
    match: ["spaghetti squash"],
    nutrients: [
      { name: "Carbohydrates", amount: 10, unit: "g", functions: ["quick energy", "brain fuel"] },
      { name: "Fiber", amount: 2.2, unit: "g", functions: ["digestion", "fullness"] },
      { name: "Vitamin C", amount: 5.4, unit: "mg", functions: ["immune support", "iron absorption"] },
      { name: "Potassium", amount: 181, unit: "mg", functions: ["hydration balance", "muscle function"] },
    ],
  },
  {
    match: ["pesto sauce", "pesto"],
    nutrients: [
      { name: "Fat", amount: 8, unit: "g", functions: ["satiety", "absorption of fat-soluble vitamins"] },
      { name: "Protein", amount: 1, unit: "g", functions: ["muscle maintenance"] },
      { name: "Vitamin E", amount: 1.2, unit: "mg", functions: ["cell protection", "skin health"] },
    ],
  },
  {
    match: ["basil"],
    nutrients: [
      { name: "Vitamin K", amount: 10, unit: "mcg", functions: ["normal blood clotting", "bone support"] },
      { name: "Vitamin A", amount: 14, unit: "mcg", functions: ["vision", "immune support"] },
    ],
  },
  {
    match: ["rice", "pasta", "bread", "gnocchi", "potato"],
    nutrients: [
      { name: "Carbohydrates", amount: 40, unit: "g", functions: ["energy", "exercise support"] },
      { name: "Protein", amount: 4, unit: "g", functions: ["muscle maintenance"] },
      { name: "B vitamins", amount: 1, unit: "serving", functions: ["energy metabolism", "nervous system support"] },
    ],
  },
  {
    match: ["chicken", "fish", "tuna", "salmon", "egg", "eggs", "beef", "lamb", "shrimp"],
    nutrients: [
      { name: "Protein", amount: 24, unit: "g", functions: ["muscle repair", "satiety", "immune support"] },
      { name: "Vitamin B12", amount: 1.2, unit: "mcg", functions: ["nerve function", "red blood cell formation"] },
      { name: "Iron", amount: 1.5, unit: "mg", functions: ["oxygen transport", "energy metabolism"] },
    ],
  },
  {
    match: ["lentil", "beans", "chickpea", "hummus", "tofu"],
    nutrients: [
      { name: "Plant protein", amount: 14, unit: "g", functions: ["muscle maintenance", "satiety"] },
      { name: "Fiber", amount: 8, unit: "g", functions: ["digestion", "blood sugar steadiness"] },
      { name: "Folate", amount: 180, unit: "mcg", functions: ["cell growth", "red blood cell support"] },
    ],
  },
  {
    match: ["salad", "lettuce", "spinach", "cucumber", "tomato", "tomato sauce", "carrot", "broccoli", "vegetable", "vegetables", "greens"],
    nutrients: [
      { name: "Fiber", amount: 3, unit: "g", functions: ["digestion", "fullness"] },
      { name: "Vitamin C", amount: 18, unit: "mg", functions: ["immune support", "iron absorption"] },
      { name: "Potassium", amount: 250, unit: "mg", functions: ["hydration balance", "muscle function"] },
    ],
  },
  {
    match: ["apple", "banana", "orange", "berries", "mango", "grapes", "dates", "dragon fruit", "pitaya"],
    nutrients: [
      { name: "Carbohydrates", amount: 18, unit: "g", functions: ["quick energy", "brain fuel"] },
      { name: "Fiber", amount: 3, unit: "g", functions: ["digestion", "fullness"] },
      { name: "Vitamin C", amount: 20, unit: "mg", functions: ["immune support", "iron absorption"] },
    ],
  },
  {
    match: ["yogurt", "labneh", "milk", "cheese", "mozzarella"],
    nutrients: [
      { name: "Protein", amount: 8, unit: "g", functions: ["muscle repair", "satiety"] },
      { name: "Calcium", amount: 250, unit: "mg", functions: ["bone health", "muscle contraction"] },
      { name: "Vitamin B12", amount: 0.8, unit: "mcg", functions: ["nerve function", "red blood cell formation"] },
    ],
  },
  {
    match: ["nuts", "almond", "walnut", "peanut", "avocado", "olive oil", "oil"],
    nutrients: [
      { name: "Fat", amount: 14, unit: "g", functions: ["satiety", "hormone support"] },
      { name: "Vitamin E", amount: 3, unit: "mg", functions: ["cell protection", "skin health"] },
      { name: "Magnesium", amount: 40, unit: "mg", functions: ["muscle function", "energy metabolism"] },
    ],
  },
];

function factForFood(food) {
  const text = String(food || "").toLowerCase();
  return foodCalorieFacts.find((fact) => fact.match.some((word) => text.includes(word)));
}

function nutrientFactForFood(food) {
  const text = String(food || "").toLowerCase();
  return nutrientAmountFacts.find((fact) => fact.match.some((word) => text.includes(word)));
}

function nutrientAmountsForFood(food) {
  return (nutrientFactForFood(food)?.nutrients || []).map((nutrient) => ({
    ...nutrient,
    source: titleCaseFood(food),
  }));
}

function aggregateNutrientAmounts(foodItems = []) {
  const totals = new Map();
  for (const item of foodItems) {
    for (const nutrient of item.nutrientAmounts || []) {
      const key = `${nutrient.name}|${nutrient.unit}`;
      const current = totals.get(key) || {
        name: nutrient.name,
        unit: nutrient.unit,
        amount: 0,
        sources: new Set(),
        functions: new Set(),
      };
      current.amount += Number(nutrient.amount || 0);
      if (nutrient.source) current.sources.add(nutrient.source);
      (nutrient.functions || []).forEach((fn) => current.functions.add(fn));
      totals.set(key, current);
    }
  }

  return [...totals.values()]
    .map((item) => ({
      name: item.name,
      amount: Math.round(item.amount * 10) / 10,
      unit: item.unit,
      sources: [...item.sources].slice(0, 4),
      functions: [...item.functions].slice(0, 3),
    }))
    .filter((item) => item.amount > 0)
    .slice(0, 10);
}

function foodGroupsFromItems(foodItems = [], foods = []) {
  const groups = new Set();
  [...foodItems.map((item) => item.name), ...foods].forEach((food) => {
    const fact = factForFood(food);
    if (fact?.group) groups.add(fact.group);
  });
  return groups;
}

function inferBalanceScore({ raw = {}, foodItems = [], detectedFoods = [], nutrients = [] }) {
  const explicit = Number(raw.balanceScore ?? raw.score);
  const groups = foodGroupsFromItems(foodItems, detectedFoods);
  const hasProtein = groups.has("protein");
  const hasCarb = groups.has("grain") || groups.has("starch") || groups.has("fruit");
  const hasProduce = groups.has("vegetable") || groups.has("fruit");
  const hasFat = groups.has("fat");
  const hasMixed = groups.has("mixed");
  let score = 28;

  if (hasProduce) score += 18;
  if (hasCarb) score += 16;
  if (hasProtein) score += 24;
  if (hasFat) score += 8;
  if (nutrients.length >= 3) score += 8;
  if (hasMixed && !hasProduce) score -= 8;
  if (!hasProtein) score -= 10;
  if (!detectedFoods.length) score = 0;

  const inferred = Math.max(0, Math.min(92, Math.round(score)));
  if (Number.isFinite(explicit) && explicit > 0 && detectedFoods.length >= 2) {
    return Math.round((inferred * 0.7) + (Math.max(0, Math.min(100, explicit)) * 0.3));
  }
  return inferred;
}

function inferEvidenceConfidence({ detectedFoods = [], foodItems = [], raw = {} }) {
  const rawText = rawFoodText(raw);
  if (!detectedFoods.length) return "low";
  if (detectedFoods.length >= 3 || foodItems.some((item) => item.calories && item.serving)) return "medium";
  if (rawText.length > 60) return "medium";
  return "low";
}

function inferFoodItems(raw = {}, detectedFoods = []) {
  const rawItems = Array.isArray(raw.foodItems || raw.items || raw.foodsWithCalories)
    ? (raw.foodItems || raw.items || raw.foodsWithCalories)
    : [];
  const explicitItems = rawItems
    .map((item) => {
      if (typeof item === "string") return { name: titleCaseFood(item), calories: parseCalorieNumber(item) };
      const name = displayText(item?.name || item?.food || item?.label, "");
      if (!name) return null;
      return {
        name: titleCaseFood(name),
        calories: parseCalorieNumber(item?.calories || item?.kcal || item?.estimatedCalories),
        serving: displayText(item?.serving || item?.portion, ""),
      };
    })
    .filter(Boolean);

  const baseItems = explicitItems.length
    ? explicitItems
    : detectedFoods.map((food) => {
        const fact = factForFood(food);
        return {
          name: titleCaseFood(food),
          calories: fact?.calories || 100,
          serving: fact?.serving || "estimated serving",
          nutrientAmounts: nutrientAmountsForFood(food),
        };
      });

  return baseItems
    .map((item) => ({
      ...item,
      calories: Math.max(0, Math.round(Number(item.calories || 0))),
      nutrientAmounts: item.nutrientAmounts || nutrientAmountsForFood(item.name),
    }))
    .filter((item) => item.name)
    .slice(0, 8);
}

const nutritionKnowledge = [
  {
    match: ["chicken", "fish", "tuna", "salmon", "egg", "eggs", "meat", "beef", "lamb", "shrimp", "prawn"],
    protein: "high",
    nutrients: [
      { name: "Protein", likelySource: "animal protein", functions: ["muscle repair", "satiety", "immune support"] },
      { name: "Vitamin B12", likelySource: "animal foods", functions: ["red blood cell formation", "nerve function"] },
      { name: "Iron", likelySource: "meat or seafood", functions: ["oxygen transport", "energy metabolism"] },
    ],
    suggestions: ["Add vegetables or salad for fiber and micronutrients.", "Add a whole-grain or starchy side if you need longer-lasting energy."],
  },
  {
    match: ["lentil", "beans", "bean", "chickpea", "hummus", "dal", "tofu", "peas"],
    protein: "moderate to high",
    nutrients: [
      { name: "Plant protein", likelySource: "legumes", functions: ["muscle maintenance", "satiety", "steady energy"] },
      { name: "Fiber", likelySource: "legumes", functions: ["digestion", "blood sugar steadiness", "heart health"] },
      { name: "Folate", likelySource: "legumes", functions: ["cell growth", "red blood cell support"] },
    ],
    suggestions: ["Pair with grains like rice or whole wheat bread for a fuller amino acid profile.", "Add vitamin C foods like lemon, tomato, or peppers to support iron absorption."],
  },
  {
    match: ["rice", "bread", "pasta", "noodle", "potato", "fries", "chapati", "roti", "oats", "cereal"],
    protein: "low",
    nutrients: [
      { name: "Carbohydrates", likelySource: "grain or starchy food", functions: ["quick energy", "brain fuel", "exercise support"] },
      { name: "B vitamins", likelySource: "grain foods", functions: ["energy metabolism", "nervous system support"] },
    ],
    suggestions: ["Add a clear protein source such as eggs, chicken, fish, yogurt, tofu, beans, or lentils.", "Add vegetables or fruit for fiber and micronutrients."],
  },
  {
    match: ["salad", "lettuce", "spinach", "cucumber", "tomato", "tomato sauce", "carrot", "broccoli", "vegetable", "vegetables", "greens", "squash", "spaghetti squash", "butternut squash", "basil"],
    protein: "low",
    nutrients: [
      { name: "Fiber", likelySource: "vegetables", functions: ["digestion", "fullness", "heart health"] },
      { name: "Vitamin C", likelySource: "vegetables", functions: ["immune support", "skin health", "iron absorption"] },
      { name: "Potassium", likelySource: "vegetables", functions: ["hydration balance", "muscle function"] },
    ],
    suggestions: ["Add protein such as chicken, tuna, egg, beans, lentils, tofu, labneh, or yogurt.", "Add a steady carbohydrate if this is meant to be a full meal."],
  },
  {
    match: ["apple", "banana", "orange", "berries", "fruit", "mango", "grapes", "dates", "dragon fruit", "pitaya"],
    protein: "low",
    nutrients: [
      { name: "Natural carbohydrates", likelySource: "fruit", functions: ["quick energy", "brain fuel"] },
      { name: "Fiber", likelySource: "fruit", functions: ["digestion", "fullness"] },
      { name: "Vitamin C", likelySource: "fruit", functions: ["immune support", "iron absorption"] },
    ],
    suggestions: ["Pair fruit with protein or healthy fat such as yogurt, nuts, milk, eggs, or hummus for better balance."],
  },
  {
    match: ["milk", "yogurt", "labneh", "cheese"],
    protein: "moderate",
    nutrients: [
      { name: "Protein", likelySource: "dairy", functions: ["muscle repair", "satiety"] },
      { name: "Calcium", likelySource: "dairy", functions: ["bone health", "muscle contraction"] },
      { name: "Vitamin B12", likelySource: "dairy", functions: ["nerve function", "red blood cell formation"] },
    ],
    suggestions: ["Add fruit or whole grains if you need more energy.", "Add vegetables if this is part of a savoury meal."],
  },
  {
    match: ["nuts", "almond", "walnut", "peanut", "avocado", "olive", "olive oil", "oil", "pesto"],
    protein: "low",
    nutrients: [
      { name: "Healthy fats", likelySource: "nuts, avocado, or oils", functions: ["hormone support", "satiety", "absorption of fat-soluble vitamins"] },
      { name: "Vitamin E", likelySource: "nuts or seeds", functions: ["cell protection", "skin health"] },
    ],
    suggestions: ["Keep portions moderate and add protein plus vegetables if this is a meal."],
  },
  {
    match: ["burger", "pizza", "fried", "fries", "chips", "cake", "sweet", "dessert", "donut"],
    protein: "variable",
    nutrients: [
      { name: "Energy-dense calories", likelySource: "fried or processed foods", functions: ["short-term energy"] },
      { name: "Sodium or saturated fat", likelySource: "processed or fried foods", functions: ["taste and preservation, but should be moderated"] },
    ],
    suggestions: ["Add water, salad, fruit, or vegetables to improve fiber and micronutrient balance.", "Choose a smaller portion or add lean protein if the meal is mostly refined carbs or fried food."],
  },
];

function dedupeByName(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = String(item?.name || item).toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function inferNutritionFromFoods(foods = [], dishName = "") {
  const text = `${dishName} ${foods.join(" ")}`.toLowerCase();
  const hits = nutritionKnowledge.filter((entry) => entry.match.some((word) => text.includes(word)));
  const nutrients = dedupeByName(hits.flatMap((entry) => entry.nutrients)).slice(0, 8);
  const suggestions = [...new Set(hits.flatMap((entry) => entry.suggestions))].slice(0, 5);
  const proteinRanks = { unknown: 0, low: 1, "low to moderate": 2, moderate: 3, "moderate to high": 4, high: 5, variable: 2 };
  const topProtein = hits
    .map((entry) => entry.protein)
    .sort((a, b) => (proteinRanks[b] || 0) - (proteinRanks[a] || 0))[0];

  return {
    proteinLevel: topProtein || "unknown",
    nutrients,
    suggestions,
    bodyFunctions: dedupeByName(nutrients.flatMap((nutrient) => nutrient.functions || []).map((name) => ({ name })))
      .map((item) => item.name)
      .slice(0, 6),
  };
}

function boundedScore(value, fallback = 60) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function normalizeFoodAnalysis(raw = {}) {
  const detectedFoods = extractFoodsFromLooseVision(raw).slice(0, 8);
  const rawDishName = displayText(raw.dishName || raw.dish, "Food review");
  const dishName =
    /^smolvlm food review$/i.test(rawDishName) && detectedFoods.length
      ? titleCaseFood(detectedFoods[0])
      : rawDishName;
  const inferred = inferNutritionFromFoods(detectedFoods, dishName);
  const foodItems = inferFoodItems(raw, detectedFoods);
  const inferredCalories = foodItems.reduce((total, item) => total + Number(item.calories || 0), 0);
  const rawCalories = parseCalorieNumber(raw.estimatedCalories || raw.calories || raw.totalCalories);
  const totalCalories = Number(raw.totalCalories) || rawCalories || inferredCalories || 0;
  const calorieText = displayText(raw.estimatedCalories || raw.calories, "");
  const estimatedCalories =
    calorieText && !/unavailable|unknown|unable/i.test(calorieText)
      ? clampUiText(calorieText, 36)
      : totalCalories
        ? `${Math.max(1, Math.round(totalCalories * 0.85))}-${Math.round(totalCalories * 1.15)} kcal`
        : "Estimate unavailable";
  const nutrients = displayNutrients(raw.nutrients || raw.nutrition || raw.micronutrients || raw.macros);
  const bodyFunctions = displayShortList(raw.bodyFunctions || raw.functions || raw.nutrientFunctions, 6, 72);
  const suggestions = displayShortList(raw.suggestions || raw.additions || raw.balancedAdditions, 6, 90);
  const nutrientSynergy = displayShortList(raw.nutrientSynergy || raw.synergy || raw.wellnessLinks, 4, 105);
  const finalNutrients = nutrients.length >= 2 ? nutrients : dedupeByName([...nutrients, ...inferred.nutrients]).slice(0, 8);
  const finalSuggestions = suggestions.length >= 2 ? suggestions : [...new Set([...suggestions, ...inferred.suggestions])].slice(0, 6);
  const finalBodyFunctions = bodyFunctions.length >= 2 ? bodyFunctions : [...new Set([...bodyFunctions, ...inferred.bodyFunctions])].slice(0, 6);
  const nutrientTotals = aggregateNutrientAmounts(foodItems);
  const confidence = inferEvidenceConfidence({ detectedFoods, foodItems, raw });
  const balanceScore = inferBalanceScore({ raw, foodItems, detectedFoods, nutrients: finalNutrients });

  return {
    dishName: clampUiText(dishName, 54),
    estimatedCalories,
    totalCalories,
    foodItems,
    nutrientTotals,
    detectedFoods,
    balanceScore,
    confidence,
    balanceBasis: detectedFoods.length
      ? `Based on visible food groups: ${detectedFoods.map(titleCaseFood).join(", ")}.`
      : "Not enough visible food clues to score balance.",
    proteinLevel: clampUiText(displayText(raw.proteinLevel || raw.protein, inferred.proteinLevel), 28),
    nutrients: finalNutrients,
    bodyFunctions: finalBodyFunctions,
    suggestions: finalSuggestions,
    nutrientSynergy: nutrientSynergy.length
      ? nutrientSynergy
      : finalNutrients.length
        ? [
            "Protein, fiber, carbohydrates, and healthy fats work best together for steadier energy.",
            "Vitamin C foods can help the body absorb plant-based iron from beans, lentils, and greens.",
          ].slice(0, 2)
        : [],
    movementLink: displayText(
      raw.movementLink || raw.yogaLink || raw.activitySuggestion,
      "A short walk, light stretch, or gentle yoga flow can support digestion and daily activity minutes.",
    ),
    dashboardLink: displayText(
      raw.dashboardLink || raw.sdgLink,
      "This meal can update balanced meals, nutrition awareness, and SDG 3 daily habit tracking.",
    ),
    caution:
      displayText(raw.caution, "Local vision estimate only. This is not a medical nutrition label.") ||
      "Local vision estimate only. This is not a medical nutrition label.",
  };
}

async function callLocalAI(input, options = {}) {
  const provider = (process.env.LOCAL_LLM_PROVIDER || "").toLowerCase();
  const model = options.model || process.env.LOCAL_LLM_MODEL || process.env.OLLAMA_MODEL || "llama3.2";
  const messages = messagesFromInput(input, options.maxPromptChars).slice(
    -Number(options.maxMessages || envNumber("LOCAL_LLM_MAX_MESSAGES", 6)),
  );
  const timeoutMs = Number(options.timeoutMs || envNumber("LOCAL_LLM_TIMEOUT_MS", 45_000));
  const maxTokens = Number(options.maxTokens || envNumber("LOCAL_LLM_MAX_TOKENS", 180));
  const temperature = Number(options.temperature ?? process.env.LOCAL_LLM_TEMPERATURE ?? 0.25);
  const numCtx = Number(options.numCtx || envNumber("LOCAL_LLM_NUM_CTX", 1024));
  const numThread = Number(options.numThread || envNumber("LOCAL_LLM_NUM_THREAD", 2));

  if (provider === "ollama" || (!provider && process.env.OLLAMA_URL)) {
    const endpoint = process.env.OLLAMA_URL || process.env.LOCAL_LLM_URL || "http://127.0.0.1:11434/api/chat";
    const { controller, timer } = withTimeout(timeoutMs);
    try {
      const result = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          keep_alive: process.env.LOCAL_LLM_KEEP_ALIVE || "0",
          options: {
            num_ctx: numCtx,
            num_predict: maxTokens,
            num_thread: numThread,
            temperature,
          },
        }),
      });
      const data = await result.json();
      if (!result.ok) {
        const error = new Error(data?.error || "Local Ollama request failed.");
        error.statusCode = result.status;
        throw error;
      }
      return data?.message?.content || data?.response || "";
    } finally {
      clearTimeout(timer);
    }
  }

  if (provider === "openai" || process.env.LOCAL_OPENAI_BASE_URL) {
    const base = (process.env.LOCAL_OPENAI_BASE_URL || process.env.LOCAL_LLM_URL || "http://127.0.0.1:1234/v1").replace(/\/$/, "");
    const endpoint = base.endsWith("/chat/completions") ? base : `${base}/chat/completions`;
    const { controller, timer } = withTimeout(timeoutMs);
    try {
      const result = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.LOCAL_LLM_API_KEY ? { Authorization: `Bearer ${process.env.LOCAL_LLM_API_KEY}` } : {}),
        },
        signal: controller.signal,
        body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens, stream: false }),
      });
      const data = await result.json();
      if (!result.ok) {
        const error = new Error(data?.error?.message || "Local OpenAI-compatible request failed.");
        error.statusCode = result.status;
        throw error;
      }
      return data?.choices?.[0]?.message?.content || "";
    } finally {
      clearTimeout(timer);
    }
  }

  const endpoint = process.env.LOCAL_LLM_URL;
  if (!endpoint) {
    const error = new Error("No local LLM endpoint configured.");
    error.statusCode = 503;
    throw error;
  }

  const { controller, timer } = withTimeout(timeoutMs);
  try {
    const result = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.LOCAL_LLM_API_KEY ? { Authorization: `Bearer ${process.env.LOCAL_LLM_API_KEY}` } : {}),
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
        input: messages.map((message) => `${message.role}: ${message.content}`).join("\n"),
      }),
    });
    const data = await result.json();
    if (!result.ok) {
      const error = new Error(data?.error || data?.message || "Local LLM request failed.");
      error.statusCode = result.status;
      throw error;
    }
    return data.text || data.response || data.content || data.message?.content || "";
  } finally {
    clearTimeout(timer);
  }
}

async function callLocalVision({ kind, imageDataUrl, prompt, extra = {} }) {
  const visionProvider = (process.env.LOCAL_FOOD_VISION_PROVIDER || "").toLowerCase();
  if (kind === "food" && (visionProvider === "openai" || visionProvider === "lmstudio")) {
    const base = (
      process.env.LOCAL_FOOD_OPENAI_BASE_URL ||
      process.env.LOCAL_OPENAI_BASE_URL ||
      process.env.LOCAL_FOOD_VISION_URL ||
      "http://127.0.0.1:1234/v1"
    ).replace(/\/$/, "");
    const endpoint = base.endsWith("/chat/completions") ? base : `${base}/chat/completions`;
    const model = process.env.LOCAL_FOOD_VISION_MODEL || "smolvlm-500m-instruct";
    const { controller, timer } = withTimeout(envNumber("LOCAL_FOOD_VISION_TIMEOUT_MS", 60_000));
    try {
      const result = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LOCAL_FOOD_VISION_API_KEY || process.env.LOCAL_LLM_API_KEY || "lm-studio"}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: compactText(prompt, 900) },
                { type: "image_url", image_url: { url: imageDataUrl } },
              ],
            },
          ],
          temperature: Number(process.env.LOCAL_FOOD_VISION_TEMPERATURE ?? 0.1),
          max_tokens: envNumber("LOCAL_FOOD_VISION_MAX_TOKENS", 220),
          stream: false,
        }),
      });
      const data = await result.json();
      if (!result.ok) {
        const error = new Error(data?.error?.message || data?.error || "Local LM Studio vision request failed.");
        error.statusCode = result.status;
        throw error;
      }
      const text = requireVisionText(data?.choices?.[0]?.message?.content, model);
      return parseJsonishText(text, {
        dishName: "SmolVLM food review",
        estimatedCalories: "Estimate unavailable",
        detectedFoods: [],
        balanceScore: 60,
        proteinLevel: "unknown",
        suggestions: [text || "SmolVLM returned no text."],
        caution: "Local vision estimate only. This is not a medical nutrition label.",
      });
    } finally {
      clearTimeout(timer);
    }
  }

  if (kind === "food" && (visionProvider === "ollama" || process.env.LOCAL_FOOD_VISION_MODEL)) {
    const match = imageDataUrl.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
    if (!match) {
      const error = new Error("Food image is not a valid base64 data URL.");
      error.statusCode = 400;
      throw error;
    }

    const endpoint = process.env.LOCAL_FOOD_VISION_URL || process.env.OLLAMA_URL || "http://127.0.0.1:11434/api/chat";
    const model = process.env.LOCAL_FOOD_VISION_MODEL || "smolvlm";
    const { controller, timer } = withTimeout(envNumber("LOCAL_FOOD_VISION_TIMEOUT_MS", 60_000));
    try {
      const result = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: compactText(prompt, 900),
              images: [match[1]],
            },
          ],
          stream: false,
          keep_alive: process.env.LOCAL_FOOD_VISION_KEEP_ALIVE || "0",
          options: {
            num_ctx: envNumber("LOCAL_FOOD_VISION_NUM_CTX", 1024),
            num_predict: envNumber("LOCAL_FOOD_VISION_MAX_TOKENS", 220),
            num_thread: envNumber("LOCAL_FOOD_VISION_NUM_THREAD", 2),
            temperature: Number(process.env.LOCAL_FOOD_VISION_TEMPERATURE ?? 0.1),
          },
        }),
      });
      const data = await result.json();
      if (!result.ok) {
        const error = new Error(data?.error || "Local SmolVLM request failed.");
        error.statusCode = result.status;
        throw error;
      }
      const text = requireVisionText(data?.message?.content || data?.response, model);
      return parseJsonishText(text, {
        dishName: "SmolVLM food review",
        estimatedCalories: "Estimate unavailable",
        detectedFoods: [],
        balanceScore: 60,
        proteinLevel: "unknown",
        suggestions: [text || "SmolVLM returned no text."],
        caution: "Local vision estimate only. This is not a medical nutrition label.",
      });
    } finally {
      clearTimeout(timer);
    }
  }

  const endpoint =
    kind === "posture"
      ? process.env.LOCAL_POSTURE_URL || process.env.LOCAL_CV_URL
      : process.env.LOCAL_FOOD_VISION_URL || process.env.LOCAL_CV_URL;

  if (!endpoint) {
    const error = new Error("No local computer-vision endpoint configured.");
    error.statusCode = 503;
    throw error;
  }

  const { controller, timer } = withTimeout(envNumber("LOCAL_CV_TIMEOUT_MS", kind === "posture" ? 12_000 : 25_000));
  try {
    const result = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.LOCAL_CV_API_KEY ? { Authorization: `Bearer ${process.env.LOCAL_CV_API_KEY}` } : {}),
      },
      signal: controller.signal,
      body: JSON.stringify({
        kind,
        imageDataUrl,
        image: imageDataUrl,
        prompt: compactText(prompt, 900),
        ...extra,
      }),
    });
    const data = await result.json();
    if (!result.ok) {
      const error = new Error(data?.error || data?.message || "Local computer-vision request failed.");
      error.statusCode = result.status;
      throw error;
    }
    if (typeof data?.text === "string") {
      return parseJsonishText(data.text, { suggestions: [data.text], feedback: [data.text], nextCue: data.text });
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function localTextAIConfigured() {
  return Boolean(
    process.env.LOCAL_LLM_PROVIDER ||
      process.env.LOCAL_LLM_URL ||
      process.env.LOCAL_OPENAI_BASE_URL ||
      process.env.OLLAMA_URL,
  );
}

async function callOpenAI(input) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error("OPENAI_API_KEY is not set on the local server.");
    error.statusCode = 503;
    throw error;
  }

  const result = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      input,
    }),
  });

  const data = await result.json();
  if (!result.ok) {
    const error = new Error(data?.error?.message || "OpenAI request failed.");
    error.statusCode = result.status;
    throw error;
  }

  return data.output_text || data.output?.[0]?.content?.[0]?.text || "";
}

async function callAI(input, options = {}) {
  if (localTextAIConfigured()) {
    return callLocalAI(input, options);
  }
  return callOpenAI(input);
}

function mergeFoodAnalysis(base, enhancement = {}) {
  const baseFoods = displayList(base.detectedFoods || base.foods);
  const enhancedFoods = displayList(enhancement.detectedFoods || enhancement.foods);
  const mergedFoods = enhancedFoods.length ? enhancedFoods : baseFoods;
  const foodsChanged = mergedFoods.join("|").toLowerCase() !== baseFoods.join("|").toLowerCase();
  const nextFoodItems = foodsChanged ? enhancement.foodItems : enhancement.foodItems || base.foodItems;
  const nextTotalCalories = foodsChanged ? enhancement.totalCalories : enhancement.totalCalories || base.totalCalories;
  const nextNutrients = foodsChanged ? enhancement.nutrients : enhancement.nutrients || base.nutrients;
  const nextBodyFunctions = foodsChanged ? enhancement.bodyFunctions : enhancement.bodyFunctions || base.bodyFunctions;
  const nextSuggestions = foodsChanged ? enhancement.suggestions : enhancement.suggestions || base.suggestions;
  const nextNutrientSynergy = foodsChanged ? enhancement.nutrientSynergy : enhancement.nutrientSynergy || base.nutrientSynergy;
  return normalizeFoodAnalysis({
    ...base,
    ...enhancement,
    dishName: displayText(enhancement.dishName || base.dishName, "Food review"),
    detectedFoods: mergedFoods,
    foodItems: nextFoodItems,
    totalCalories: nextTotalCalories,
    nutrients: nextNutrients,
    bodyFunctions: nextBodyFunctions,
    suggestions: nextSuggestions,
    nutrientSynergy: nextNutrientSynergy,
    estimatedCalories: enhancement.estimatedCalories || enhancement.calories || base.estimatedCalories || base.calories,
    caution:
      enhancement.caution ||
      "SmolVLM identified the visible foods. Qwen/local nutrition logic estimated nutrients for education only.",
  });
}

async function enrichFoodWithQwen(foodReview, source = "vision") {
  if (!localTextAIConfigured()) return null;

  const seed = normalizeFoodAnalysis(foodReview);
  const text = await callAI(
    [
      {
        role: "system",
        content:
          "You are AfiaCare's local nutrition explainer. Use only the listed foods. Do not invent exact medical labels. Return compact JSON only.",
      },
      {
        role: "user",
        content: JSON.stringify({
          task:
            "Estimate meal balance for a school wellness app. Include calories range, protein level, nutrients with likelySource and functions, bodyFunctions, suggestions, nutrientSynergy, movementLink, dashboardLink.",
          source,
          dishName: seed.dishName,
          detectedFoods: seed.detectedFoods,
          localEstimate: {
            estimatedCalories: seed.estimatedCalories,
            balanceScore: seed.balanceScore,
            proteinLevel: seed.proteinLevel,
            nutrients: seed.nutrients,
            suggestions: seed.suggestions,
          },
          requiredKeys: [
            "dishName",
            "estimatedCalories",
            "balanceScore",
            "proteinLevel",
            "nutrients",
            "bodyFunctions",
            "suggestions",
            "nutrientSynergy",
            "movementLink",
            "dashboardLink",
            "caution",
          ],
        }),
      },
    ],
    {
      maxTokens: envNumber("LOCAL_FOOD_REASONING_MAX_TOKENS", 260),
      timeoutMs: envNumber("LOCAL_FOOD_REASONING_TIMEOUT_MS", 12_000),
      temperature: 0.15,
      maxMessages: 2,
      maxPromptChars: envNumber("LOCAL_FOOD_REASONING_MAX_PROMPT_CHARS", 1700),
    },
  );

  return parseJsonishText(text, null);
}

async function handleApi(request, response, pathname) {
  try {
    const body = await readJson(request);

    if (pathname === "/api/therapist") {
      const messages = Array.isArray(body.messages) ? body.messages : [];
      const dailyContext = body.dailyContext && typeof body.dailyContext === "object" ? body.dailyContext : {};
      const transcript = messages
        .slice(-5)
        .map((message) => `${message.role}: ${message.text}`)
        .join("\n");
      const text = await callAI([
        {
          role: "system",
          content:
            "You are Salem, AfiaCare's supportive reflection coach. Not licensed therapy; no diagnosis. If crisis/self-harm/danger appears, tell the user to contact emergency services/trusted adult/professional now. Use today's food, mood, reminders, and movement if useful. Give one grounding step. Under 120 words.",
        },
        {
          role: "user",
          content: `Context:${JSON.stringify(dailyContext).slice(0, 1100)}\nConversation:${transcript}\nReply to latest user.`,
        },
      ], { maxTokens: 150, timeoutMs: envNumber("LOCAL_THERAPIST_TIMEOUT_MS", 50_000), maxPromptChars: 1600, maxMessages: 2, temperature: 0.2 });
      writeJson(response, 200, { text });
      return;
    }

    if (pathname === "/api/wellness-chat") {
      const question = String(body.question || "");
      const dailyContext = body.dailyContext && typeof body.dailyContext === "object" ? body.dailyContext : {};
      const text = await callAI([
        {
          role: "system",
          content:
            "You are Noura, AfiaCare's practical wellness guide for SDG 3. General education only; no diagnosis. For serious symptoms, advise healthcare professional. Use today's meals, nutrients, mood, reminders, and movement if useful. Under 110 words.",
        },
        { role: "user", content: `Context:${JSON.stringify(dailyContext).slice(0, 1100)}\nQuestion:${question}` },
      ], { maxTokens: 140, timeoutMs: envNumber("LOCAL_WELLNESS_TIMEOUT_MS", 50_000), maxPromptChars: 1500, maxMessages: 2, temperature: 0.2 });
      writeJson(response, 200, { text });
      return;
    }

    if (pathname === "/api/food-analysis") {
      const imageDataUrl = String(body.imageDataUrl || "");
      if (!imageDataUrl.startsWith("data:image/")) {
        writeJson(response, 400, { error: "Upload a valid image first." });
        return;
      }

      try {
        const localResult = await callLocalVision({
          kind: "food",
          imageDataUrl,
          prompt:
            "Identify the visible food only. Return compact JSON: dishName, detectedFoods[], estimatedCalories range, balanceScore 0-100, suggestions[]. Use common food names. Do not guess medical details. If unsure, say unknown.",
        });
        const visionReview = normalizeFoodAnalysis(localResult);
        let finalReview = visionReview;
        let reasoningProvider = "local-knowledge";
        try {
          const qwenReview = await enrichFoodWithQwen(visionReview, "smolvlm-image-detection");
          if (qwenReview) {
            finalReview = mergeFoodAnalysis(visionReview, qwenReview);
            reasoningProvider = "qwen2.5-local";
          }
        } catch {
          finalReview = visionReview;
        }
        writeJson(response, 200, {
          ...finalReview,
          provider: "smolvlm-local-vision",
          reasoningProvider,
        });
        return;
      } catch (localError) {
        if (
          process.env.LOCAL_CV_REQUIRED === "true" ||
          (localTextAIConfigured() && !process.env.OPENAI_API_KEY)
        ) {
          throw localError;
        }
      }

      const text = await callAI([
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Analyze this food image for an educational wellness app. Return only valid JSON with keys: dishName, estimatedCalories, detectedFoods, balanceScore, proteinLevel, nutrients, bodyFunctions, suggestions, nutrientSynergy, movementLink, dashboardLink, caution. nutrients must be an array of {name, likelySource, functions}. Calories must be an estimate range string. Suggestions should list foods to add to make it more balanced. Say it is not a medical nutrition label.",
            },
            {
              type: "input_image",
              image_url: imageDataUrl,
            },
          ],
        },
      ]);

      let parsed;
      try {
        parsed = JSON.parse(text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim());
      } catch {
        parsed = {
          dishName: "AI food analysis",
          estimatedCalories: "Unable to parse exact estimate",
          detectedFoods: [],
          balanceScore: 60,
          proteinLevel: "unknown",
          nutrients: [],
          bodyFunctions: [],
          suggestions: [text],
          nutrientSynergy: [],
          movementLink: "Try gentle movement after eating if it feels comfortable.",
          dashboardLink: "Meal review saved for daily SDG 3 habit tracking.",
          caution: "This is an educational estimate, not a medical nutrition label.",
        };
      }
      writeJson(response, 200, normalizeFoodAnalysis(parsed));
      return;
    }

    if (pathname === "/api/food-enrich") {
      const detectedFoods = displayList(body.detectedFoods || body.foods).slice(0, 10);
      const dishName = displayText(body.dishName, detectedFoods.length ? `${detectedFoods[0]} meal` : "Corrected meal");
      const {
        foodItems: _staleFoodItems,
        totalCalories: _staleTotalCalories,
        estimatedCalories: _staleEstimatedCalories,
        calories: _staleCalories,
        detectedFoods: _staleDetectedFoods,
        foods: _staleFoods,
        nutrients: _staleNutrients,
        nutrition: _staleNutrition,
        micronutrients: _staleMicronutrients,
        macros: _staleMacros,
        nutrientTotals: _staleNutrientTotals,
        bodyFunctions: _staleBodyFunctions,
        functions: _staleFunctions,
        nutrientFunctions: _staleNutrientFunctions,
        suggestions: _staleSuggestions,
        additions: _staleAdditions,
        balancedAdditions: _staleBalancedAdditions,
        nutrientSynergy: _staleNutrientSynergy,
        synergy: _staleSynergy,
        wellnessLinks: _staleWellnessLinks,
        ...freshBody
      } = body;
      const localReview = normalizeFoodAnalysis({
        ...freshBody,
        dishName,
        detectedFoods,
        caution: "Food list corrected by the user. Nutrition is an educational estimate, not a medical nutrition label.",
      });
      let finalReview = localReview;
      let reasoningProvider = "local-knowledge";
      try {
        const qwenReview = await enrichFoodWithQwen(localReview, "user-corrected-food-list");
        if (qwenReview) {
          finalReview = mergeFoodAnalysis(localReview, qwenReview);
          reasoningProvider = "qwen2.5-local";
        }
      } catch {
        finalReview = localReview;
      }
      writeJson(response, 200, { ...finalReview, provider: "corrected-foods", reasoningProvider });
      return;
    }

    if (pathname === "/api/posture-analysis") {
      const imageDataUrl = String(body.imageDataUrl || "");
      if (!imageDataUrl.startsWith("data:image/")) {
        writeJson(response, 400, { error: "Camera frame is missing." });
        return;
      }
      const pose = String(body.pose || "yoga");
      const localResult = await callLocalVision({
        kind: "posture",
        imageDataUrl,
        prompt:
          "Analyze the user's yoga or exercise posture. Return JSON with postureScore 0-100, feedback array, corrections array, riskLevel low/medium/high, and nextCue.",
        extra: { pose },
      });
      writeJson(response, 200, {
        postureScore: Number(localResult.postureScore ?? localResult.score ?? 0),
        feedback: localResult.feedback || localResult.observations || [],
        corrections: localResult.corrections || localResult.suggestions || [],
        riskLevel: localResult.riskLevel || localResult.risk || "unknown",
        nextCue: localResult.nextCue || localResult.cue || "Move slowly and keep breathing.",
        provider: "local-cv",
      });
      return;
    }

    if (pathname === "/api/movement-plan") {
      const mode = String(body.mode || "exercise");
      const goal = String(body.goal || "beginner wellness");
      const minutes = String(body.minutes || "10");
      const fallbackSteps = mode === "walking"
        ? ["Check the route and current conditions", "Warm up slowly", "Walk at a comfortable pace", "Sip water", "Cool down in shade"]
        : mode === "stretching"
          ? ["Breathe slowly", "Roll your shoulders", "Stretch wrists and forearms", "Turn gently through the upper back", "Finish with a relaxed forward fold"]
          : ["March in place", "Complete wall push-ups", "Use controlled chair squats", "Step side to side", "Cool down with slow breathing"];
      const fallbackPlan = {
        title: mode === "walking" ? "Comfort-safe walking plan" : mode === "stretching" ? "Study-break stretch" : "Beginner movement circuit",
        duration: `${minutes} minutes`,
        focus: goal,
        steps: fallbackSteps,
        safety: "Stop if you feel pain, dizziness, chest pain, or serious symptoms.",
      };

      let parsed = fallbackPlan;
      let provider = "built-in";
      let notice = "";
      try {
        const text = await callAI([
          {
            role: "system",
            content:
              "You are a physical wellness coach, not a travel guide. Create a gentle beginner routine for home, school, or a safe walking route. Return compact JSON only with keys title, duration, focus, steps, safety. steps must be an array of 5 short movement actions. Safety must tell the user to stop for pain, dizziness, or chest pain.",
          },
          {
            role: "user",
            content: `Mode: ${mode}. Goal: ${goal}. Duration: ${minutes} minutes. Suitable for a student or family at home or school.`,
          },
        ], {
          maxTokens: 220,
          timeoutMs: envNumber("LOCAL_MOVEMENT_TIMEOUT_MS", 45_000),
          maxPromptChars: 900,
          maxMessages: 2,
          temperature: 0.15,
        });
        const aiPlan = parseMovementPlanText(text, fallbackPlan, mode);
        if (aiPlan) {
          parsed = aiPlan;
          provider = "local-ai";
        } else {
          notice = "The local model did not return a usable movement plan, so AfiaCare used its built-in safe routine instead.";
        }
      } catch (movementError) {
        const timedOut = movementError?.name === "AbortError" || /abort|timeout/i.test(String(movementError?.message || ""));
        notice = timedOut
          ? "The local model took longer than expected, so AfiaCare used its built-in safe routine instead."
          : "The local model is unavailable, so AfiaCare used its built-in safe routine instead.";
      }
      writeJson(response, 200, { ...parsed, provider, notice });
      return;
    }

    writeJson(response, 404, { error: "Unknown API route." });
  } catch (error) {
    writeJson(response, error.statusCode || 500, {
      error: error.message || "Server error.",
    });
  }
}

function sendFile(response, filePath) {
  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  createReadStream(filePath).pipe(response);
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${host}:${port}`);
  if (request.method === "GET" && url.pathname === "/api/walk-network") {
    await handleWalkNetwork(url, response);
    return;
  }
  if (request.method === "POST" && url.pathname.startsWith("/api/")) {
    await handleApi(request, response, url.pathname);
    return;
  }

  const requestedPath = decodeURIComponent(url.pathname);
  const relativePath = requestedPath === "/" ? "index.html" : requestedPath.slice(1);
  let filePath = resolve(root, relativePath);

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const fileStats = await stat(filePath);
    if (fileStats.isDirectory()) {
      filePath = resolve(filePath, "index.html");
    }
    sendFile(response, filePath);
  } catch {
    sendFile(response, resolve(root, "index.html"));
  }
});

server.listen(port, host, () => {
  console.log(`AfiaCare demo: http://${host}:${port}`);
});

