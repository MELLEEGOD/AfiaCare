import React, { useEffect, useState } from "react";
import { BarChart3, Camera, Footprints, HeartPulse, Salad } from "../components/icons.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { describeApiFallback, postJson } from "../lib/aiClient.js";
import {
  applyProgressDelta,
  defaultProgress,
  foodItemsFromMeal,
  mealSlotLabel,
  mealSlots,
  parseCalories,
  upsertDailySession,
} from "../utils/wellness.js";

function imageFileToDataUrl(file, maxWidth = 384, quality = 0.5) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      image.onload = () => {
        const scale = Math.min(1, maxWidth / image.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      image.onerror = reject;
      image.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}

function shortText(value, maxLength = 96) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}...`;
}

function builtInFoodReview(detectedFoods = []) {
  const foods = detectedFoods.length ? detectedFoods : ["visible meal"];
  const dishName = detectedFoods.length ? `${foods[0]} meal review` : "Meal photo review";

  return {
    dishName,
    estimatedCalories: "Estimate available after food correction",
    totalCalories: 0,
    detectedFoods: foods,
    balanceScore: detectedFoods.length ? 62 : 50,
    proteinLevel: "unknown",
    foodItems: [],
    nutrients: [],
    nutrientTotals: [],
    bodyFunctions: ["energy planning", "meal awareness"],
    suggestions: [
      "Add the foods you can identify, then update nutrition from corrected foods.",
      "Aim for protein, vegetables or fruit, fiber-rich carbohydrates, and water.",
      "Use this as a planning aid, not a medical nutrition label.",
    ],
    nutrientSynergy: [],
    movementLink: "After eating, choose a gentle walk or stretch if it feels comfortable.",
    dashboardLink: "Save the review after correction to count it in today's SDG 3 habits.",
    caution: "Live image analysis is unavailable. Correct the food list before relying on this estimate.",
    provider: "built-in",
    reasoningProvider: "built-in",
  };
}

export default function FoodPhotoCoach() {
  const [imageUrl, setImageUrl] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [mealSlot, setMealSlot] = useState("lunch");
  const [correctedFoods, setCorrectedFoods] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [, setProgress] = useLocalStorage("afiacare-sdg-progress", defaultProgress);
  const [, setMealReviews] = useLocalStorage("afiacare-meal-reviews", []);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(file));
    setAnalysis(null);
    setError("");
    try {
      setImageDataUrl(await imageFileToDataUrl(file));
    } catch {
      setError("Could not prepare this image for local vision analysis.");
    }
  };

  const analyzeFood = async () => {
    if (!imageDataUrl) return;
    setLoading(true);
    setError("");
    try {
      const data = await postJson(
        "/api/food-analysis",
        { imageDataUrl },
        { timeoutMs: 75000, fallbackMessage: "Live vision is still warming up. Correct the foods you can see, then update nutrition." },
      );
      setAnalysis(data);
      setCorrectedFoods((data.detectedFoods || []).join(", "));
      setSaved(false);
    } catch (requestError) {
      const fallback = builtInFoodReview();
      setAnalysis(fallback);
      setCorrectedFoods("");
      setSaved(false);
      setError(describeApiFallback(requestError, "Live vision is still warming up. Correct the foods you can see, then update nutrition."));
    } finally {
      setLoading(false);
    }
  };

  const enrichCorrectedFoods = async () => {
    const foods = correctedFoods
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (!foods.length || !analysis) return;
    setLoading(true);
    setError("");
    try {
      const data = await postJson(
        "/api/food-enrich",
        { ...analysis, detectedFoods: foods },
        { timeoutMs: 16000, fallbackMessage: "Live nutrition enrichment is offline. AfiaCare kept a basic corrected-food review." },
      );
      setAnalysis(data);
      setSaved(false);
    } catch (requestError) {
      setAnalysis(builtInFoodReview(foods));
      setSaved(false);
      setError(describeApiFallback(requestError, "Live nutrition enrichment is offline. AfiaCare kept a basic corrected-food review."));
    } finally {
      setLoading(false);
    }
  };

  const addToLog = () => {
    if (!analysis) return;
    const foodItems = foodItemsFromMeal(analysis);
    const totalCalories = foodItems.reduce((total, item) => total + Number(item.calories || 0), 0) ||
      parseCalories(analysis.estimatedCalories);

    setMealReviews((current) =>
      upsertDailySession(current, {
        type: "meal",
        mealSlot,
        dishName: analysis.dishName,
        calories: analysis.estimatedCalories,
        totalCalories,
        foodItems,
        balanceScore: analysis.balanceScore,
        detectedFoods: analysis.detectedFoods || [],
        nutrients: analysis.nutrients || [],
        bodyFunctions: analysis.bodyFunctions || [],
        suggestions: analysis.suggestions || [],
        nutrientSynergy: analysis.nutrientSynergy || [],
        nutrientTotals: analysis.nutrientTotals || [],
        movementLink: analysis.movementLink,
        dashboardLink: analysis.dashboardLink,
      }),
    );
    if (Number(analysis.balanceScore) >= 65) {
      setProgress((current) => applyProgressDelta(current, { meals: 1 }));
    }
    setSaved(true);
  };

  return (
    <section className="section-pad px-4 md:px-6">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="Food vision"
          title="Review a meal photo"
          description="Upload a dish photo to estimate calories, identify likely foods, understand key nutrients, and connect the meal to your daily plan."
        />

        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="sketch-card p-5">
            <label className="focus-ring flex min-h-80 cursor-pointer flex-col items-center justify-center rounded-[22px] border-[3px] border-dashed border-[var(--border-dark)] bg-uae-mist p-5 text-center transition hover:border-uae-green">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Uploaded food preview"
                  className="max-h-80 w-full rounded-lg object-cover"
                />
              ) : (
                <>
                  <span className="sketch-icon-wrap flex h-14 w-14 items-center justify-center bg-uae-green text-white">
                    <Camera className="h-7 w-7" aria-hidden="true" />
                  </span>
                  <span className="mt-4 block text-lg font-bold text-uae-black">Upload meal photo</span>
                  <span className="mt-2 block text-sm leading-6 text-uae-muted">
                    Choose an image from your device. The preview stays in your browser.
                  </span>
                </>
              )}
              <input className="hidden" type="file" accept="image/*" onChange={uploadImage} />
            </label>

            <button
              className="focus-ring sketch-button sketch-button--dark mt-5 w-full gap-2 px-5 py-3 text-sm"
              onClick={analyzeFood}
              disabled={!imageDataUrl || loading}
            >
              <Camera className="h-4 w-4" aria-hidden="true" />
              {loading ? "Reviewing meal..." : "Run vision review"}
            </button>
            {error ? (
              <p className="sketch-note mt-3 px-3 py-2 text-sm font-semibold text-uae-red">
                {error}
              </p>
            ) : null}
          </article>

          <article className="sketch-card p-6">
            <div className="flex items-start gap-4">
              <span className="sketch-icon-wrap flex h-11 w-11 shrink-0 items-center justify-center">
                <Salad className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="sketch-badge">Nutrition review</p>
                <h2 className="mt-1 text-2xl font-bold text-uae-black">
                  {analysis ? analysis.dishName : "No meal photo yet"}
                </h2>
                <p className="mt-3 text-sm leading-6 text-uae-muted">
                  {analysis
                    ? "Educational estimate only. Use it as a planning aid, not a medical nutrition label."
                    : "Upload a picture to see likely foods, calories, nutrients, and balance suggestions."}
                </p>
              </div>
            </div>

            {analysis ? (
              <>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <Metric
                    label="Estimated kcal"
                    value={analysis.totalCalories ? `${analysis.totalCalories} kcal` : analysis.estimatedCalories}
                    detail={analysis.totalCalories ? analysis.estimatedCalories : ""}
                  />
                  <Metric label="Balance" value={`${analysis.balanceScore}%`} detail={analysis.confidence ? `${analysis.confidence} confidence` : ""} highlight />
                  <Metric label="Protein" value={analysis.proteinLevel} detail="estimated from visible foods" />
                </div>

                {analysis.balanceBasis ? (
                  <p className="sketch-note mt-3 bg-uae-panel px-3 py-2 text-xs font-semibold leading-5 text-uae-muted">
                    {analysis.balanceBasis}
                  </p>
                ) : null}

                <CalorieBreakdown items={analysis.foodItems || []} total={analysis.totalCalories} />

                <NutrientAmountBreakdown totals={analysis.nutrientTotals || []} />

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <FoodList title="Likely foods detected" items={analysis.detectedFoods || []} />
                  <FoodList title="Quick balance moves" items={analysis.suggestions || []} />
                </div>

                <div className="sketch-card mt-5 bg-uae-panel p-4">
                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-uae-black">Correct foods if SmolVLM missed something</span>
                    <textarea
                      className="focus-ring sketch-input min-h-20 resize-none bg-white text-sm text-uae-black"
                      value={correctedFoods}
                      onChange={(event) => setCorrectedFoods(event.target.value)}
                      placeholder="Example: rice, grilled chicken, cucumber salad"
                    />
                  </label>
                  <button
                    className="focus-ring sketch-button sketch-button--dark mt-3 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={enrichCorrectedFoods}
                    disabled={loading || !correctedFoods.trim()}
                  >
                    Update nutrition from corrected foods
                  </button>
                </div>

                <div className="mt-6">
                  <h3 className="font-bold text-uae-black">Nutrients this meal may provide</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {(analysis.nutrients || []).length ? (
                      analysis.nutrients.map((nutrient, index) => (
                        <article
                          key={`${nutrient.name}-${index}`}
                          className="sketch-note p-4"
                        >
                          <p className="font-bold text-uae-black">{nutrient.name}</p>
                          {nutrient.likelySource ? (
                            <p className="mt-1 text-xs font-semibold text-uae-green">
                              Source: {nutrient.likelySource}
                            </p>
                          ) : null}
                          <ul className="mt-3 grid gap-1 text-sm leading-6 text-uae-muted">
                            {(nutrient.functions || []).map((item) => (
                              <li key={item}>Helps with {item}</li>
                            ))}
                          </ul>
                        </article>
                      ))
                    ) : (
                      <p className="sketch-note p-4 text-sm leading-6 text-uae-muted md:col-span-2">
                        The local model did not identify nutrient details for this photo.
                      </p>
                    )}
                  </div>
                  <p className="sketch-note mt-3 bg-uae-panel px-3 py-2 text-xs font-semibold leading-5 text-uae-muted">
                    Nutrients are enriched from AfiaCare&apos;s local food knowledge layer after SmolVLM identifies likely foods.
                    {analysis.reasoningProvider ? ` Reasoning: ${analysis.reasoningProvider}.` : ""}
                  </p>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <InsightCard icon={HeartPulse} title="Body functions" items={analysis.bodyFunctions || []} />
                  <InsightCard icon={Footprints} title="Movement link" items={[analysis.movementLink]} />
                  <InsightCard icon={BarChart3} title="Dashboard link" items={[analysis.dashboardLink]} />
                </div>

                {(analysis.nutrientSynergy || []).length ? (
                  <FoodList title="How this connects with the rest of today" items={analysis.nutrientSynergy} />
                ) : null}

                {analysis.caution ? (
                  <p className="sketch-note mt-4 px-3 py-2 text-sm font-semibold text-uae-muted">
                    {analysis.caution}
                  </p>
                ) : null}
                <div className="sketch-card mt-5 bg-uae-panel p-4">
                  <p className="text-sm font-bold text-uae-black">Add this review to today&apos;s food log</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-4">
                    {mealSlots.map((slot) => (
                      <button
                        key={slot}
                        className={`focus-ring sketch-button px-3 py-2 text-sm ${
                          mealSlot === slot ? "sketch-button--dark" : "sketch-button--secondary"
                        }`}
                        onClick={() => setMealSlot(slot)}
                      >
                        {mealSlotLabel(slot)}
                      </button>
                    ))}
                  </div>
                  <button
                    className="focus-ring sketch-button sketch-button--brand mt-3 w-full justify-center px-5 py-3 text-sm"
                    onClick={addToLog}
                  >
                    {saved ? `Added to ${mealSlotLabel(mealSlot)}` : "Add food review to logs"}
                  </button>
                  <p className="mt-2 text-xs leading-5 text-uae-muted">
                    AfiaCare only counts this meal after you add it here.
                  </p>
                </div>
              </>
            ) : null}

            <div className="sketch-card mt-6 flex items-start gap-3 bg-[var(--control-dark)] p-4 text-[var(--control-dark-text)]">
              <HeartPulse className="mt-1 h-5 w-5 shrink-0 text-uae-sand" aria-hidden="true" />
              <p className="text-sm leading-6 text-[color-mix(in_srgb,var(--control-dark-text)_88%,transparent)]">
                Image analysis uses your local SmolVLM model through LM Studio when it is running. Estimates are educational and should not replace a dietitian or doctor.
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, detail = "", highlight = false }) {
  return (
    <div className="sketch-note p-4">
      <p className="text-sm font-bold text-uae-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${highlight ? "text-uae-green" : "text-uae-black"}`}>
        {value}
      </p>
      {detail ? <p className="mt-1 text-xs font-semibold text-uae-muted">{detail}</p> : null}
    </div>
  );
}

function CalorieBreakdown({ items, total }) {
  const cleanItems = (items || [])
    .filter((item) => item?.name)
    .map((item) => ({
      name: shortText(item.name, 36),
      calories: Number(item.calories || 0),
      serving: shortText(item.serving || "", 30),
      nutrients: (item.nutrientAmounts || []).slice(0, 4).map((nutrient) => ({
        name: shortText(nutrient.name, 18),
        amount: nutrient.amount,
        unit: nutrient.unit,
      })),
    }))
    .slice(0, 6);

  if (!cleanItems.length) return null;

  const calculatedTotal = cleanItems.reduce((sum, item) => sum + item.calories, 0);
  const displayTotal = Number(total || calculatedTotal || 0);

  return (
    <div className="sketch-card mt-4 bg-uae-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-uae-black">Calories by food</h3>
        <span className="sketch-chip bg-white px-3 py-1 text-sm font-bold text-uae-black">
          {displayTotal || calculatedTotal} kcal total
        </span>
      </div>
      <div className="mt-3 grid gap-2">
        {cleanItems.map((item, index) => (
          <div
            key={`${item.name}-${index}`}
            className="sketch-note grid gap-3 bg-white px-3 py-2 text-sm sm:grid-cols-[1fr_auto]"
          >
            <div>
              <p className="font-bold text-uae-black">{item.name}</p>
              {item.serving ? <p className="text-xs font-semibold text-uae-muted">{item.serving}</p> : null}
              {item.nutrients.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.nutrients.map((nutrient) => (
                    <span
                      key={`${item.name}-${nutrient.name}`}
                      className="sketch-chip bg-uae-mist px-2 py-1 text-xs font-bold text-uae-muted"
                    >
                      {nutrient.name}: {nutrient.amount}
                      {nutrient.unit}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <span className="font-bold text-uae-green">{item.calories || "?"} kcal</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NutrientAmountBreakdown({ totals }) {
  const cleanTotals = (totals || [])
    .filter((item) => item?.name && Number(item.amount || 0) > 0)
    .slice(0, 8);

  if (!cleanTotals.length) return null;

  return (
    <div className="sketch-card mt-4 p-4">
      <div>
        <h3 className="font-bold text-uae-black">Nutrients gained</h3>
        <p className="mt-1 text-xs font-semibold leading-5 text-uae-muted">
          Estimated from the corrected food list and visible ingredients.
        </p>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {cleanTotals.map((nutrient) => (
          <article key={`${nutrient.name}-${nutrient.unit}`} className="sketch-note p-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-bold text-uae-black">{nutrient.name}</p>
              <p className="text-sm font-bold text-uae-green">
                {nutrient.amount}
                {nutrient.unit}
              </p>
            </div>
            {nutrient.functions?.length ? (
              <p className="mt-2 text-xs font-semibold leading-5 text-uae-muted">
                Helps with {nutrient.functions.join(", ")}
              </p>
            ) : null}
            {nutrient.sources?.length ? (
              <p className="mt-1 text-xs leading-5 text-uae-muted">
                From {nutrient.sources.join(", ")}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}

function FoodList({ title, items }) {
  const cleanItems = (items || [])
    .map((item) => shortText(item, 92))
    .filter(Boolean)
    .slice(0, 5);

  return (
    <div className="mt-4 first:mt-0">
      <h3 className="font-bold text-uae-black">{title}</h3>
      <ul className="mt-3 flex flex-wrap gap-2 text-sm text-uae-muted">
        {cleanItems.length ? cleanItems.map((food, index) => (
          <li key={`${food}-${index}`} className="sketch-chip max-w-full px-3 py-2 leading-5">
            {food}
          </li>
        )) : (
          <li className="sketch-chip px-3 py-2">No clear items identified.</li>
        )}
      </ul>
    </div>
  );
}

function InsightCard({ icon: Icon, title, items }) {
  const clean = (items || []).filter(Boolean);
  return (
    <article className="sketch-card p-4">
      <Icon className="h-5 w-5 text-uae-green" aria-hidden="true" />
      <h3 className="mt-3 font-bold text-uae-black">{title}</h3>
      <ul className="mt-2 grid gap-1 text-sm leading-6 text-uae-muted">
        {clean.length ? clean.map((item, index) => <li key={`${item}-${index}`}>{item}</li>) : <li>Not available yet.</li>}
      </ul>
    </article>
  );
}

