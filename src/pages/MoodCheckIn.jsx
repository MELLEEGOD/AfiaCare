import React from "react";
import { BatteryLow, CloudRain, Flame, Frown, HeartPulse, Smile } from "../components/icons.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import {
  addMoodEntry,
  applyProgressDelta,
  defaultProgress,
  moodToScore,
  nudgeForMood,
  summarizeMoodPatterns,
} from "../utils/wellness.js";

const moods = [
  {
    id: "happy",
    label: "Happy",
    icon: Smile,
    suggestion: "Share the good energy with someone at home and protect one healthy habit today.",
  },
  {
    id: "anxious",
    label: "Anxious",
    icon: CloudRain,
    suggestion: "Try a breathing reset: inhale for 4, hold for 2, exhale for 6. Repeat four times.",
  },
  {
    id: "stressed",
    label: "Stressed",
    icon: CloudRain,
    suggestion: "Pause for slow breathing, drink water, and write down one task you can postpone.",
  },
  {
    id: "tired",
    label: "Tired",
    icon: BatteryLow,
    suggestion: "Choose a lighter activity, dim screens earlier, and aim for a calmer bedtime routine.",
  },
  {
    id: "sad",
    label: "Sad",
    icon: Frown,
    suggestion: "Send one message to a trusted person and step outside for a few minutes of daylight.",
  },
  {
    id: "motivated",
    label: "Motivated",
    icon: Flame,
    suggestion: "Use that momentum for a 10-minute walk or to prepare a healthy snack for later.",
  },
];

export default function MoodCheckIn({ onNavigate }) {
  const [lastMood, setLastMood] = useLocalStorage("afiacare-last-mood", null);
  const [moodHistory, setMoodHistory] = useLocalStorage("afiacare-mood-history", []);
  const [, setProgress] = useLocalStorage("afiacare-sdg-progress", defaultProgress);
  const selectedMood = moods.find((mood) => mood.id === lastMood?.id);
  const nudge = lastMood ? nudgeForMood(lastMood.id) : null;
  const patterns = summarizeMoodPatterns(moodHistory);

  const chooseMood = (mood) => {
    const entry = {
      id: mood.id,
      label: mood.label,
      date: new Date().toISOString(),
      nudge: nudgeForMood(mood.id),
    };
    setLastMood(entry);
    setMoodHistory((current) => addMoodEntry(current, entry));
    setProgress((current) => applyProgressDelta(current, { mood: moodToScore(mood.id) }));
  };

  const formattedDate = lastMood?.date
    ? new Intl.DateTimeFormat("en-AE", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(lastMood.date))
    : null;

  return (
    <section className="section-pad px-4 md:px-6">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="Mood check-in"
          title="How are you feeling today?"
          arabic="كيف حالك اليوم؟"
          description="Pick a mood. The app saves the check-in, sends a useful nudge, and tracks weekly and monthly patterns."
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {moods.map((mood) => {
            const Icon = mood.icon;
            const active = lastMood?.id === mood.id;
            return (
              <button
                key={mood.id}
                className={`focus-ring sketch-card sketch-card--interactive grid justify-items-center gap-3 p-5 text-center ${
                  active ? "bg-uae-sand" : ""
                }`}
                onClick={() => chooseMood(mood)}
              >
                <span
                  className={`sketch-icon-wrap flex h-12 w-12 items-center justify-center ${
                    active ? "bg-uae-black text-white" : ""
                  }`}
                >
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="block text-base font-bold text-uae-black">{mood.label}</span>
                <span className="sketch-chip text-xs">{active ? "Selected" : "Tap to save"}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="sketch-card p-6">
            <div className="flex items-start gap-4">
              <span className="sketch-icon-wrap flex h-11 w-11 shrink-0 items-center justify-center bg-[var(--danger)] text-white">
                <HeartPulse className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="sketch-badge">Saved check-in</p>
                <h2 className="mt-1 text-2xl font-bold text-uae-black">
                  {selectedMood ? selectedMood.label : "No mood selected yet"}
                </h2>
                {formattedDate ? <p className="mt-1 text-sm text-uae-muted">{formattedDate}</p> : null}
                <p className="mt-4 text-base leading-7 text-uae-muted">
                  {selectedMood
                    ? selectedMood.suggestion
                    : "Choose a mood above to save your first local check-in."}
                </p>
              </div>
            </div>
          </article>

          <article className="sketch-card p-6">
            <p className="sketch-badge">Nudge</p>
            <h2 className="mt-1 text-2xl font-bold text-uae-black">
              {nudge ? nudge.title : "Waiting for check-in"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-uae-muted">
              {nudge ? nudge.action : "Select a mood to receive a suggested next step."}
            </p>
            {nudge ? (
              <button
                className="focus-ring sketch-button sketch-button--dark mt-5 px-4 py-2 text-sm"
                onClick={() => onNavigate?.(nudge.route)}
              >
                Open suggested tool
              </button>
            ) : null}
          </article>
        </div>

        <section className="app-panel mt-6 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-uae-black">Mood patterns</h2>
              <p className="mt-1 text-sm leading-6 text-uae-muted">
                AfiaCare keeps local weekly and monthly patterns so nudges can become smarter over time.
              </p>
            </div>
            <span className="sketch-chip">
              {moodHistory.length} saved check-ins
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <PatternCard title="This week" pattern={patterns.weekly} />
            <PatternCard title="This month" pattern={patterns.monthly} />
          </div>
        </section>
      </div>
    </section>
  );
}

function PatternCard({ title, pattern }) {
  return (
    <div className="sketch-note p-4">
      <p className="text-sm font-bold text-uae-green">{title}</p>
      <h3 className="mt-1 text-lg font-bold text-uae-black">{pattern.message}</h3>
      <p className="mt-2 text-sm leading-6 text-uae-muted">
        Anxious or stressed check-ins: {pattern.anxiousOrStressed}. Total check-ins: {pattern.total}.
      </p>
    </div>
  );
}

