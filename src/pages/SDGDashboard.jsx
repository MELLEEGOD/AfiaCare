import React from "react";
import { ArrowRight, BedDouble, Clock3, Droplets, Footprints, HeartPulse, Salad, SmilePlus } from "../components/icons.jsx";
import ProgressCard from "../components/ProgressCard.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import {
  buildDailyWellnessContext,
  calculateWellbeingScore,
  clamp,
  defaultProgress,
  estimateCaloriesBurned,
  entryTimeLabel,
  mealSlotLabel,
  summarizeDailyCalories,
  summarizeMoodPatterns,
  summarizeProceedings,
  todaysEntries,
} from "../utils/wellness.js";

const progressCards = [
  {
    key: "water",
    label: "Water",
    helper: "Hydration and focus",
    unit: "glasses",
    min: 0,
    max: 12,
    target: 8,
    icon: Droplets,
    route: "reminders",
    action: "Set water reminder",
  },
  {
    key: "steps",
    label: "Steps",
    helper: "Walking and daily movement",
    unit: "steps",
    min: 0,
    max: 15000,
    step: 100,
    target: 8000,
    icon: Footprints,
    route: "exercise",
    action: "Plan a walk",
  },
  {
    key: "sleep",
    label: "Sleep",
    helper: "Recovery and focus",
    unit: "hours",
    min: 0,
    max: 12,
    step: 0.5,
    target: 8,
    icon: BedDouble,
    route: "yoga",
    action: "Try sleep yoga",
  },
  {
    key: "mood",
    label: "Mood",
    helper: "Emotional well-being",
    unit: "score",
    min: 1,
    max: 5,
    target: 5,
    icon: SmilePlus,
    route: "mood",
    action: "Check in",
  },
  {
    key: "meals",
    label: "Balanced meals",
    helper: "Food quality today",
    unit: "meals",
    min: 0,
    max: 5,
    target: 3,
    icon: Salad,
    route: "food",
    action: "Review a meal",
  },
  {
    key: "activity",
    label: "Active minutes",
    helper: "Exercise, yoga, stretching",
    unit: "minutes",
    min: 0,
    max: 120,
    step: 5,
    target: 30,
    icon: Clock3,
    route: "exercise",
    action: "Start routine",
  },
];

function metricRatio(card, progress) {
  return Math.min(Number(progress[card.key] ?? 0) / card.target, 1);
}

function metricStatus(card, progress) {
  const ratio = metricRatio(card, progress);
  if (ratio >= 1) return { label: "On target", tone: "good" };
  if (ratio >= 0.65) return { label: "Nearly there", tone: "steady" };
  return { label: "Needs attention", tone: "low" };
}

function formatValue(card, value) {
  if (card.key === "steps") return `${Math.round(value).toLocaleString()} ${card.unit}`;
  return `${value ?? 0} ${card.unit}`;
}

function scoreLabel(score) {
  if (score >= 80) return "Strong day";
  if (score >= 60) return "Steady day";
  return "Needs care today";
}

function deriveEnvironmentalSignals(progress, calorieSummary) {
  const hydrationGap = Math.max(0, 8 - Number(progress.water || 0));
  const lowHydration = Number(progress.water || 0) < 6;
  const lowSleep = Number(progress.sleep || 0) < 7;
  const lowMovement = Number(progress.activity || 0) < 20;

  return [
    {
      label: "Heat and hydration",
      value: hydrationGap ? `${hydrationGap} glasses below target` : "Hydration target met",
      detail: lowHydration ? "Prioritise water before outdoor movement." : "Hydration is on track for a typical UAE day.",
    },
    {
      label: "Movement setting",
      value: lowMovement ? "Indoor or cooler-hour routine suggested" : "Movement baseline is active",
      detail: lowMovement ? "Use indoor walking, stretching, or evening movement." : "Keep activity in shaded or cooler-hour windows.",
    },
    {
      label: "Food and energy",
      value: `${calorieSummary.totalEaten} kcal logged`,
      detail: "Food quality and movement are judged together.",
    },
    {
      label: "Recovery pressure",
      value: lowSleep ? "Sleep debt risk" : "Recovery looks steadier",
      detail: lowSleep ? "Short sleep plus heat and screens may raise strain." : "Sleep is less likely to amplify stress today.",
    },
  ];
}

export default function SDGDashboard({ onNavigate = () => {} }) {
  const [progress, setProgress] = useLocalStorage("afiacare-sdg-progress", defaultProgress);
  const [lastMood] = useLocalStorage("afiacare-last-mood", null);
  const [mealReviews] = useLocalStorage("afiacare-meal-reviews", []);
  const [movementSessions] = useLocalStorage("afiacare-movement-sessions", []);
  const [reminders] = useLocalStorage("afiacare-reminders", []);
  const [challengeProgress] = useLocalStorage("afiacare-family-challenges", {});
  const [quizRecord] = useLocalStorage("afiacare-wellness-quiz", null);
  const [moodHistory] = useLocalStorage("afiacare-mood-history", []);
  const [proceedings] = useLocalStorage("afiacare-daily-proceedings", []);

  const updateProgress = (key, nextValue, min, max) => {
    setProgress((current) => ({
      ...current,
      [key]: clamp(nextValue, min, max),
    }));
  };

  const score = calculateWellbeingScore(progress);
  const completedReminders = reminders.filter((item) => item.done).length;
  const completedChallenges = Object.values(challengeProgress).filter((status) => status === "completed").length;
  const moodPatterns = summarizeMoodPatterns(moodHistory);
  const proceedingPatterns = summarizeProceedings(proceedings);
  const focusMetrics = [...progressCards].sort((a, b) => metricRatio(a, progress) - metricRatio(b, progress)).slice(0, 3);
  const todayFocus = focusMetrics[0];
  const secondaryMetrics = progressCards.filter((card) => !focusMetrics.some((focus) => focus.key === card.key));
  const completedTargets = progressCards.filter((card) => metricRatio(card, progress) >= 1).length;
  const quizTime = quizRecord?.completedAt
    ? new Date(quizRecord.completedAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : null;
  const todayMeals = todaysEntries(mealReviews);
  const todayMovement = todaysEntries(movementSessions);
  const dailyContext = buildDailyWellnessContext({
    progress,
    lastMood,
    meals: mealReviews,
    movement: movementSessions,
  });
  const calorieSummary = summarizeDailyCalories(todayMeals, todayMovement);
  const environmentalSignals = deriveEnvironmentalSignals(progress, calorieSummary);

  const recentSignals = [
    quizRecord ? ["Wellness quiz", "Baseline updated", quizTime || "Survey recorded"] : null,
    lastMood ? ["Mood", lastMood.label, "Mood score synced"] : null,
    mealReviews[0] ? ["Food review", mealReviews[0].dishName, `${mealReviews[0].balanceScore}% balance`] : null,
    movementSessions[0] ? ["Movement", movementSessions[0].title, `${movementSessions[0].minutes} minutes logged`] : null,
    reminders.length ? ["Reminders", `${completedReminders}/${reminders.length} done`, "Hydration and medication"] : null,
    completedChallenges ? ["Family", `${completedChallenges} challenges completed`, "Shared habits counted"] : null,
  ].filter(Boolean);

  return (
    <section className="section-pad px-4 md:px-6">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="AfiaCare dashboard"
          title="Your daily UAE well-being plan"
          arabic="الصحة الجيدة والرفاه"
          description="One cleaner SDG 3 view: top priorities, core trackers, and the signals shaping today."
        />

        <div className="grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
          <article className="sketch-card p-5 md:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div
                className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(oklch(35% 0.075 255) ${score * 3.6}deg, oklch(91% 0.045 235) 0deg)`,
                }}
                aria-label={`Well-being score ${score} percent`}
              >
                <div className="grid h-24 w-24 place-items-center rounded-full bg-[var(--neutral-primary-soft)] text-center">
                  <span className="block text-3xl font-bold text-uae-black">{score}</span>
                  <span className="block text-xs font-bold text-uae-muted">/100</span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="sketch-badge">Well-being score</p>
                <h2 className="mt-1 text-2xl font-bold text-uae-black">{scoreLabel(score)}</h2>
                <p className="mt-3 text-sm leading-6 text-uae-muted">
                  {completedTargets}/{progressCards.length} targets are complete. Lowest area right now is{" "}
                  <span className="font-bold text-uae-black">{todayFocus.label.toLowerCase()}</span>.
                </p>
                <button
                  className="focus-ring sketch-button sketch-button--dark mt-4 gap-2 px-4 py-2 text-sm"
                  onClick={() => onNavigate(todayFocus.route)}
                >
                  {todayFocus.action}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </article>

          <article className="sketch-card bg-uae-black p-5 text-white md:p-6">
            <div className="flex items-start gap-4">
              <span className="sketch-icon-wrap flex h-11 w-11 shrink-0 items-center justify-center bg-white text-uae-green">
                <HeartPulse className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-uae-sand">Start with these</p>
                <h2 className="mt-1 text-2xl font-bold">Three simple fixes for today</h2>
                <div className="mt-4 grid gap-2">
                  {focusMetrics.map((card) => (
                    <button
                      key={card.key}
                      className="focus-ring sketch-bubble grid grid-cols-[1fr_auto] items-center gap-3 rounded-[22px] bg-white/10 px-3 py-3 text-left transition hover:bg-white/15"
                      onClick={() => onNavigate(card.route)}
                    >
                      <span>
                        <span className="block text-sm font-bold">{card.label}</span>
                        <span className="mt-1 block text-xs text-white/70">
                          {formatValue(card, progress[card.key])} of {formatValue(card, card.target)}
                        </span>
                      </span>
                      <span className="sketch-chip border-0 bg-white text-xs font-bold text-uae-black">
                        Open
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </article>
        </div>

        <section className="app-panel mt-6 p-5 md:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-uae-black">Today&apos;s snapshot</h2>
              <p className="mt-1 text-sm leading-6 text-uae-muted">
                Short readout of what matters most before you edit deeper trackers.
              </p>
            </div>
            <span className="sketch-chip">UAE context active</span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <CompactInsight label={environmentalSignals[0].label} value={environmentalSignals[0].value} detail={environmentalSignals[0].detail} />
            <CompactInsight
              label="Calories today"
              value={`${calorieSummary.netCalories} kcal net`}
              detail={`${calorieSummary.totalEaten} in, ${calorieSummary.totalBurned} out`}
            />
            <CompactInsight
              label="Active sources"
              value={`${recentSignals.length} signals connected`}
              detail={recentSignals[0] ? `${recentSignals[0][0]} most recent` : "Add mood, food, or movement to feed the score"}
            />
            <CompactInsight
              label="Daily log"
              value={`${todayMeals.length} meals, ${todayMovement.length} sessions`}
              detail={lastMood ? `${lastMood.label} mood synced` : "Mood still missing today"}
            />
          </div>
        </section>

        <section className="app-panel mt-6 p-5 md:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-uae-black">Priority trackers</h2>
              <p className="mt-1 text-sm leading-6 text-uae-muted">
                The weakest areas sit first so the dashboard feels like a plan, not a spreadsheet.
              </p>
            </div>
            <span className="sketch-chip">{quizTime ? `Quiz: ${quizTime}` : "Quiz baseline pending"}</span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {focusMetrics.map((item) => {
              const status = metricStatus(item, progress);
              return (
                <ProgressCard
                  key={item.key}
                  {...item}
                  value={progress[item.key] ?? 0}
                  statusLabel={status.label}
                  statusTone={status.tone}
                  onChange={(value) => updateProgress(item.key, value, item.min, item.max)}
                />
              );
            })}
          </div>

          <details className="dashboard-disclosure mt-4">
            <summary className="focus-ring dashboard-disclosure__summary">
              <span>More trackers</span>
              <span className="sketch-chip">{secondaryMetrics.length} hidden</span>
            </summary>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {secondaryMetrics.map((item) => {
                const status = metricStatus(item, progress);
                return (
                  <ProgressCard
                    key={item.key}
                    {...item}
                    value={progress[item.key] ?? 0}
                    statusLabel={status.label}
                    statusTone={status.tone}
                    onChange={(value) => updateProgress(item.key, value, item.min, item.max)}
                  />
                );
              })}
            </div>
          </details>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <section className="app-panel p-5 md:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-uae-black">What updated your score?</h2>
                <p className="mt-1 text-sm leading-6 text-uae-muted">
                  AfiaCare reads connected health signals, not only manual dashboard edits.
                </p>
              </div>
              <span className="sketch-chip">{recentSignals.length} active sources</span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {recentSignals.length ? (
                recentSignals.map(([label, value, detail]) => (
                  <div key={label} className="sketch-note p-4">
                    <p className="text-sm font-bold text-uae-green">{label}</p>
                    <h3 className="mt-1 text-base font-bold text-uae-black">{value}</h3>
                    <p className="mt-2 text-sm leading-6 text-uae-muted">{detail}</p>
                  </div>
                ))
              ) : (
                <p className="sketch-note p-4 text-sm leading-6 text-uae-muted md:col-span-2">
                  Complete a mood check-in, food review, movement routine, reminder, or family challenge to populate this record.
                </p>
              )}
            </div>
          </section>

          <section className="app-panel p-5 md:p-6">
            <h2 className="text-xl font-bold text-uae-black">Patterns and daily log</h2>
            <p className="mt-1 text-sm leading-6 text-uae-muted">
              Quick pattern read plus the same visible log sent to Noura and Salem.
            </p>
            <div className="mt-5 grid gap-3">
              <LogDigest meals={todayMeals} movement={todayMovement} nutrients={dailyContext.summary.nutrients} />
              <PatternCard title="Mood this week" pattern={moodPatterns.weekly} />
              <PatternCard title="Mood this month" pattern={moodPatterns.monthly} />
              <ProceedingPatternCard title="Morning and night this week" pattern={proceedingPatterns.weekly} />
              <ProceedingPatternCard title="Morning and night this month" pattern={proceedingPatterns.monthly} />
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function CompactInsight({ label, value, detail }) {
  return (
    <article className="sketch-note p-4">
      <p className="text-sm font-bold text-uae-green">{label}</p>
      <p className="mt-2 text-lg font-bold text-uae-black">{value}</p>
      <p className="mt-1 text-sm leading-6 text-uae-muted">{detail}</p>
    </article>
  );
}

function LogDigest({ meals, movement, nutrients }) {
  const latestMeal = meals[0];
  const latestMovement = movement[0];

  return (
    <div className="sketch-note p-4">
      <p className="text-sm font-bold text-uae-green">Visible log</p>
      <div className="mt-3 grid gap-3">
        <div className="rounded-[16px] bg-white/80 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-uae-black">Food</p>
            <span className="sketch-chip text-xs">{meals.length} today</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-uae-muted">
            {latestMeal
              ? `${mealSlotLabel(latestMeal.mealSlot || "snack")}: ${latestMeal.dishName || "Meal"}, ${latestMeal.balanceScore ?? "?"}% balance.`
              : "No meal reviews logged today."}
          </p>
        </div>
        <div className="rounded-[16px] bg-white/80 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-uae-black">Movement</p>
            <span className="sketch-chip text-xs">{movement.length} today</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-uae-muted">
            {latestMovement
              ? `${latestMovement.title || latestMovement.type || "Movement"} at ${entryTimeLabel(latestMovement)}. ${latestMovement.caloriesBurned || estimateCaloriesBurned(latestMovement)} kcal burned.`
              : "No movement sessions logged today."}
          </p>
        </div>
        <p className="text-xs leading-5 text-uae-muted">Nutrients noticed: {nutrients}</p>
      </div>
    </div>
  );
}

function PatternCard({ title, pattern }) {
  return (
    <div className="sketch-note p-4">
      <p className="text-sm font-bold text-uae-green">{title}</p>
      <p className="mt-1 text-sm leading-6 text-uae-black">{pattern.message}</p>
      <p className="mt-2 text-xs leading-5 text-uae-muted">
        Anxious or stressed: {pattern.anxiousOrStressed}. Total check-ins: {pattern.total}.
      </p>
    </div>
  );
}

function ProceedingPatternCard({ title, pattern }) {
  return (
    <div className="sketch-note p-4">
      <p className="text-sm font-bold text-uae-green">{title}</p>
      <p className="mt-1 text-sm leading-6 text-uae-black">{pattern.message}</p>
      <p className="mt-2 text-xs leading-5 text-uae-muted">
        Total: {pattern.total}. Morning: {pattern.mornings}. Night: {pattern.nights}.
      </p>
    </div>
  );
}
