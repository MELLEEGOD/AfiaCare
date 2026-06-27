import React from "react";
import {
  ArrowRight,
  BarChart3,
  BedDouble,
  Brain,
  Camera,
  Clock3,
  Droplets,
  Footprints,
  HeartHandshake,
  Salad,
  SmilePlus,
} from "../components/icons.jsx";
import DailyProceedings from "../components/DailyProceedings.jsx";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import {
  buildDailyWellnessContext,
  calculateWellbeingScore,
  currentProceedingPeriod,
  defaultProgress,
  nudgeForMood,
  todayKey,
  todaysEntries,
} from "../utils/wellness.js";

const quickActions = [
  { title: "Log mood", page: "mood", icon: SmilePlus },
  { title: "Review meal", page: "food", icon: Camera },
  { title: "Set reminder", page: "reminders", icon: Clock3 },
  { title: "Full dashboard", page: "dashboard", icon: BarChart3 },
];

function buildCareQueue({ progress, reminders, lastMood, proceedings, latestMeal, latestMovement }) {
  const items = [];
  const today = todayKey();
  const period = currentProceedingPeriod();
  const todayEntries = proceedings.filter((entry) => entry.day === today);
  const morningDone = todayEntries.some((entry) => entry.period === "morning");
  const nightDone = todayEntries.some((entry) => entry.period === "night");

  if (!morningDone || (period === "night" && !nightDone)) {
    const nightDue = period === "night" && !nightDone;
    items.push({
      id: nightDue ? "night-check" : "morning-check",
      priority: 0,
      title: nightDue ? "Complete tonight's reflection" : "Complete today's check-in",
      reason: nightDue ? "Close the day with mood and recovery context." : "Set today's mood, energy, and main priority.",
      action: "Check in",
      page: "home",
      anchor: "daily-checkins",
      icon: Clock3,
    });
  }

  const nextReminder = reminders.find((item) => !item.done);
  if (nextReminder) {
    items.push({
      id: `reminder-${nextReminder.id}`,
      priority: 0,
      title: nextReminder.label,
      reason: `${nextReminder.type} reminder at ${nextReminder.time}.`,
      action: "Open",
      page: "reminders",
      icon: nextReminder.type === "Water" ? Droplets : HeartHandshake,
    });
  }

  if (Number(progress.water || 0) < 6) {
    items.push({
      id: "water",
      priority: 1,
      title: "Hydration is behind",
      reason: `${progress.water || 0} of 8 glasses logged today.`,
      action: "Remind me",
      page: "reminders",
      icon: Droplets,
    });
  }

  if (Number(progress.activity || 0) < 30 || !latestMovement) {
    items.push({
      id: "movement",
      priority: 2,
      title: "Add gentle movement",
      reason: `${progress.activity || 0} of 30 active minutes logged.`,
      action: "Start",
      page: "exercise",
      icon: Footprints,
    });
  }

  if (Number(progress.meals || 0) < 2 || !latestMeal) {
    items.push({
      id: "meal",
      priority: 2,
      title: "Review the next meal",
      reason: `${progress.meals || 0} of 3 balanced meals logged.`,
      action: "Review",
      page: "food",
      icon: Salad,
    });
  }

  if (!lastMood) {
    items.push({
      id: "mood",
      priority: 1,
      title: "Mood check-in missing",
      reason: "Add one mood signal to personalize today's guidance.",
      action: "Log mood",
      page: "mood",
      icon: SmilePlus,
    });
  } else if (["anxious", "stressed", "sad"].includes(lastMood.id)) {
    const nudge = nudgeForMood(lastMood.id);
    items.push({
      id: "mood-support",
      priority: 1,
      title: nudge.title,
      reason: `Support matched to your latest ${lastMood.label.toLowerCase()} check-in.`,
      action: "Open Salem",
      page: nudge.route,
      icon: Brain,
    });
  }

  if (Number(progress.sleep || 0) < 7) {
    items.push({
      id: "sleep",
      priority: 3,
      title: "Protect tonight's sleep",
      reason: `${progress.sleep || 0} of 8 hours logged.`,
      action: "Wind down",
      page: "yoga",
      icon: BedDouble,
    });
  }

  return items.sort((a, b) => a.priority - b.priority).slice(0, 3);
}

function StatusPill({ label, value }) {
  return (
    <div className="home-status-pill">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function QuickAction({ action, onClick }) {
  const Icon = action.icon;
  return (
    <button className="focus-ring home-quick-action" onClick={onClick}>
      <span className="sketch-icon-wrap flex h-10 w-10 shrink-0 items-center justify-center">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span>{action.title}</span>
    </button>
  );
}

function MiniLog({ label, value, detail }) {
  return (
    <article className="home-mini-log">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

export default function HomePage({ onNavigate }) {
  const [progress] = useLocalStorage("afiacare-sdg-progress", defaultProgress);
  const [lastMood] = useLocalStorage("afiacare-last-mood", null);
  const [reminders] = useLocalStorage("afiacare-reminders", []);
  const [mealReviews] = useLocalStorage("afiacare-meal-reviews", []);
  const [movementSessions] = useLocalStorage("afiacare-movement-sessions", []);
  const [proceedings] = useLocalStorage("afiacare-daily-proceedings", []);

  const score = calculateWellbeingScore(progress);
  const todayMeals = todaysEntries(mealReviews);
  const todayMovement = todaysEntries(movementSessions);
  const dueReminders = reminders.filter((item) => !item.done).length;
  const latestMeal = mealReviews[0];
  const latestMovement = movementSessions[0];
  const dailyContext = buildDailyWellnessContext({
    progress,
    lastMood,
    meals: mealReviews,
    movement: movementSessions,
  });
  const careQueue = buildCareQueue({
    progress,
    reminders,
    lastMood,
    proceedings,
    latestMeal,
    latestMovement,
  });

  function openArea(page, anchor) {
    onNavigate(page);
    if (page === "home" && anchor) {
      window.requestAnimationFrame(() => {
        const target = document.getElementById(anchor);
        if (target instanceof HTMLDetailsElement) target.open = true;
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  return (
    <section className="section-pad mx-auto max-w-6xl">
      <header className="home-dashboard-summary">
        <div className="min-w-0">
          <p className="sketch-badge">Today in AfiaCare</p>
          <h1>Your day, at a glance</h1>
          <p>Focus on the next useful step. Everything else stays out of the way.</p>
        </div>
        <div className="home-status-row" aria-label="Today's wellness summary">
          <StatusPill label="Score" value={`${score}/100`} />
          <StatusPill label="Meals" value={todayMeals.length} />
          <StatusPill label="Move" value={`${dailyContext.summary.movementMinutes}m`} />
        </div>
      </header>

      <section className="app-panel home-priority-panel">
        <div className="home-section-heading">
          <div>
            <h2>Next up</h2>
            <p>Only the three actions with the strongest effect today.</p>
          </div>
          <span className="sketch-chip">{careQueue.length} priorities</span>
        </div>

        <div className="home-care-list">
          {careQueue.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className="focus-ring home-care-item"
                onClick={() => openArea(item.page, item.anchor)}
              >
                <span className="sketch-icon-wrap flex h-11 w-11 shrink-0 items-center justify-center">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <strong>{item.title}</strong>
                  <span>{item.reason}</span>
                </span>
                <span className="home-care-item__action">
                  {item.action}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <nav className="home-quick-actions" aria-label="Quick actions">
        {quickActions.map((action) => (
          <QuickAction key={action.page} action={action} onClick={() => openArea(action.page)} />
        ))}
      </nav>

      <div className="home-secondary-stack">
        <details id="daily-checkins" className="app-panel home-disclosure scroll-mt-24">
          <summary className="focus-ring home-disclosure__summary">
            <span>
              <strong>Morning and night check-in</strong>
              <small>Open only when you want to record the day.</small>
            </span>
            <ArrowRight className="home-disclosure__arrow h-5 w-5" aria-hidden="true" />
          </summary>
          <div className="home-disclosure__body">
            <DailyProceedings onNavigate={onNavigate} />
          </div>
        </details>

        <details className="app-panel home-disclosure">
          <summary className="focus-ring home-disclosure__summary">
            <span>
              <strong>Today's details</strong>
              <small>{dueReminders} reminders, {todayMeals.length} meals, {todayMovement.length} movement sessions.</small>
            </span>
            <ArrowRight className="home-disclosure__arrow h-5 w-5" aria-hidden="true" />
          </summary>
          <div className="home-disclosure__body home-detail-grid">
            <MiniLog
              label="Meals"
              value={todayMeals.length ? `${todayMeals.length} reviewed` : "None yet"}
              detail={todayMeals[0] ? `${todayMeals[0].dishName}, ${todayMeals[0].balanceScore}% balance` : "Review a meal when it is useful."}
            />
            <MiniLog
              label="Movement"
              value={todayMovement.length ? `${dailyContext.summary.movementMinutes} minutes` : "None yet"}
              detail={todayMovement[0]?.title || "Movement can be logged later."}
            />
            <MiniLog
              label="Mood"
              value={lastMood?.label || "Not logged"}
              detail={lastMood ? "Synced with today's guidance." : "Add it when your state changes."}
            />
          </div>
        </details>
      </div>
    </section>
  );
}
