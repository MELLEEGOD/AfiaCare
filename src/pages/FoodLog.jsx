import React from "react";
import { Camera, Salad } from "../components/icons.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import {
  foodItemsFromMeal,
  entryTimeLabel,
  mealSlotLabel,
  mealSlots,
  summarizeDailyCalories,
  todaysEntries,
} from "../utils/wellness.js";

export default function FoodLog({ onNavigate = () => {} }) {
  const [mealReviews] = useLocalStorage("afiacare-meal-reviews", []);
  const [movementSessions] = useLocalStorage("afiacare-movement-sessions", []);
  const todayMeals = todaysEntries(mealReviews);
  const calories = summarizeDailyCalories(todayMeals, movementSessions);

  const grouped = mealSlots.map((slot) => {
    const meals = todayMeals.filter((meal) => (meal.mealSlot || "snack") === slot);
    const total = meals.reduce(
      (sum, meal) =>
        sum + (meal.totalCalories || foodItemsFromMeal(meal).reduce((itemSum, item) => itemSum + item.calories, 0)),
      0,
    );
    return { slot, meals, total };
  });

  return (
    <section className="section-pad px-4 md:px-6">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="Food log"
          title="What you ate today"
          description="Only meals you explicitly add from Food Vision appear here. This keeps the dashboard and AI agents grounded in confirmed entries."
        />

        <div className="grid gap-4 md:grid-cols-3">
          <Metric label="Total eaten" value={`${calories.totalEaten} kcal`} />
          <Metric label="Exercise subtracted" value={`${calories.totalBurned} kcal`} />
          <Metric label="Net after movement" value={`${calories.netCalories} kcal`} />
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {grouped.map(({ slot, meals, total }) => (
            <article key={slot} className="sketch-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="sketch-icon-wrap flex h-10 w-10 items-center justify-center">
                    <Salad className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="font-bold text-uae-black">{mealSlotLabel(slot)}</h2>
                    <p className="text-sm text-uae-muted">{meals.length} logged meal{meals.length === 1 ? "" : "s"}</p>
                  </div>
                </div>
                <span className="sketch-chip text-uae-green">
                  {total} kcal
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                {meals.length ? (
                  meals.map((meal) => {
                    const items = foodItemsFromMeal(meal);
                    const mealTotal =
                      meal.totalCalories || items.reduce((sum, item) => sum + Number(item.calories || 0), 0);
                    return (
                      <div key={meal.id} className="sketch-note bg-uae-panel p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-bold text-uae-black">{meal.dishName || "Meal"}</p>
                          <span className="sketch-chip bg-white px-2 py-1 text-xs font-bold text-uae-green">
                            {mealTotal} kcal
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-bold text-uae-muted">{entryTimeLabel(meal)}</p>
                        <div className="mt-3 grid gap-2">
                          {items.map((item) => (
                            <div
                              key={`${meal.id}-${item.name}`}
                              className="sketch-note flex items-center justify-between gap-3 bg-white px-3 py-2 text-sm"
                            >
                              <span className="font-semibold text-uae-black">{item.name}</span>
                              <span className="font-bold text-uae-muted">{item.calories} kcal</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="sketch-note bg-uae-panel p-4 text-sm leading-6 text-uae-muted">
                    No {mealSlotLabel(slot).toLowerCase()} logged yet.
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>

        <button
          className="focus-ring sketch-button sketch-button--dark mt-6 inline-flex min-h-11 items-center justify-center gap-2 px-5 py-3 text-sm"
          onClick={() => onNavigate("food")}
        >
          <Camera className="h-4 w-4" aria-hidden="true" />
          Review another meal
        </button>
      </div>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <article className="sketch-card p-5">
      <p className="text-sm font-bold text-uae-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold text-uae-black">{value}</p>
    </article>
  );
}
