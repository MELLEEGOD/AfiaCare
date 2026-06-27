import React, { useMemo, useState } from "react";
import { Clock3, HeartPulse } from "./icons.jsx";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import {
  currentProceedingPeriod,
  practiceForMood,
  saveProceedingEntry,
  summarizeProceedings,
  todayKey,
} from "../utils/wellness.js";

const moodOptions = ["happy", "anxious", "stressed", "tired", "sad", "motivated"];

const prompts = {
  morning: {
    title: "Morning plan",
    description: "Set the tone for the day before school, study, or family routines begin.",
    questions: [
      ["energy", "How is your energy this morning?", ["Low", "Okay", "Good", "High"]],
      ["mood", "What mood are you starting with?", moodOptions],
      ["priority", "What needs most support today?", ["Stress", "Sleep", "Movement", "Food", "Family", "Screens"]],
      ["intention", "What small action will help today?", ["Breathing", "Yoga", "Walk", "Water", "Healthy meal", "Screen break"]],
    ],
  },
  night: {
    title: "Night reflection",
    description: "Review how the day went and prepare a calmer next step before sleep.",
    questions: [
      ["dayProgress", "How did today go overall?", ["Difficult", "Mixed", "Good", "Very good"]],
      ["mood", "What mood are you ending with?", moodOptions],
      ["screenBalance", "How was screen balance tonight?", ["Too much", "Okay", "Good", "Screen-free hour"]],
      ["recovery", "What would help recovery now?", ["Breathing", "Meditation", "Sleep yoga", "Journal", "Family talk", "Early sleep"]],
    ],
  },
};

export default function DailyProceedings({ onNavigate }) {
  const [entries, setEntries] = useLocalStorage("afiacare-daily-proceedings", []);
  const [periodOverride, setPeriodOverride] = useState(null);
  const naturalPeriod = currentProceedingPeriod();
  const period = periodOverride || (naturalPeriod === "night" ? "night" : "morning");
  const day = todayKey();
  const todayEntries = entries.filter((entry) => entry.day === day);
  const existing = todayEntries.find((entry) => entry.period === period);
  const config = prompts[period];
  const [answers, setAnswers] = useState(() =>
    config.questions.reduce((acc, [id]) => ({ ...acc, [id]: "" }), {}),
  );

  const pattern = summarizeProceedings(entries);
  const complete = config.questions.every(([id]) => answers[id]);
  const selectedMood = answers.mood || existing?.mood;
  const practice = selectedMood ? practiceForMood(selectedMood, period) : null;

  const setAnswer = (id, value) => {
    setAnswers((current) => ({ ...current, [id]: value }));
  };

  const switchPeriod = (nextPeriod) => {
    setPeriodOverride(nextPeriod);
    const nextConfig = prompts[nextPeriod];
    setAnswers(nextConfig.questions.reduce((acc, [id]) => ({ ...acc, [id]: "" }), {}));
  };

  const save = () => {
    if (!complete) return;
    const entry = {
      day,
      period,
      mood: answers.mood,
      answers,
      practice: practiceForMood(answers.mood, period),
    };
    setEntries((current) => saveProceedingEntry(current, entry));
  };

  const dueLabel = useMemo(() => {
    const morningDone = todayEntries.some((entry) => entry.period === "morning");
    const nightDone = todayEntries.some((entry) => entry.period === "night");
    if (!morningDone) return "Morning check-in due";
    if (naturalPeriod === "night" && !nightDone) return "Night reflection due";
    return "Today is tracked";
  }, [naturalPeriod, todayEntries]);

  return (
    <section className="app-panel overflow-hidden">
      <div className="border-b-[3px] border-[var(--border-dark)] px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-uae-black">Daily proceedings</h2>
            <p className="mt-1 text-sm leading-6 text-uae-muted">
              Ask in the morning and night, then suggest yoga, meditation, or breathing from the current mood.
            </p>
          </div>
          <span className="sketch-chip">
            {dueLabel}
          </span>
        </div>
      </div>

      <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {["morning", "night"].map((item) => (
              <button
                key={item}
                className={`focus-ring sketch-button min-h-11 px-3 py-2 text-sm capitalize ${
                  period === item ? "sketch-button--dark" : "sketch-button--secondary"
                }`}
                onClick={() => switchPeriod(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="sketch-card p-4">
            <div className="flex items-start gap-3">
              <span className="sketch-icon-wrap flex h-10 w-10 shrink-0 items-center justify-center">
                <Clock3 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-uae-black">{config.title}</h3>
                <p className="mt-1 text-sm leading-6 text-uae-muted">{config.description}</p>
              </div>
            </div>

            {existing ? (
              <p className="sketch-note mt-4 p-3 text-sm font-semibold text-uae-green">
                {config.title} already recorded for today. You can submit again to refresh it.
              </p>
            ) : null}

            <div className="mt-4 grid gap-4">
              {config.questions.map(([id, question, options]) => (
                <label key={id} className="grid gap-2">
                  <span className="text-sm font-bold text-uae-muted">{question}</span>
                  <select
                    className="focus-ring sketch-select"
                    value={answers[id]}
                    onChange={(event) => setAnswer(id, event.target.value)}
                  >
                    <option value="">Choose...</option>
                    {options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            <button
              className="focus-ring sketch-button sketch-button--brand mt-5 px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              onClick={save}
              disabled={!complete}
            >
              Save {period} check-in
            </button>
          </div>
        </div>

        <aside className="grid gap-4">
          <div className="sketch-card p-4">
            <p className="sketch-badge">Suggested practice</p>
            <h3 className="mt-1 text-xl font-bold text-uae-black">
              {practice ? practice.title : "Choose a mood"}
            </h3>
            <p className="mt-3 text-sm leading-6 text-uae-muted">
              {practice
                ? practice.detail
                : "The app will recommend yoga, meditation, breathing, or movement based on mood."}
            </p>
            {practice ? (
              <button
                className="focus-ring sketch-button sketch-button--dark mt-4 px-4 py-2 text-sm"
                onClick={() => onNavigate?.(practice.route)}
              >
                Open suggested tool
              </button>
            ) : null}
          </div>

          <div className="sketch-card p-4">
            <div className="flex items-center gap-3">
              <HeartPulse className="h-5 w-5 text-uae-green" aria-hidden="true" />
              <h3 className="font-bold text-uae-black">Proceedings pattern</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-uae-muted">{pattern.weekly.message}</p>
            <p className="mt-2 text-sm leading-6 text-uae-muted">{pattern.monthly.message}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
