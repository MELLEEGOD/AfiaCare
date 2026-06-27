import React, { useMemo, useState } from "react";
import { HeartPulse, Leaf, Moon, Sun } from "../components/icons.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { describeApiFallback, postJson } from "../lib/aiClient.js";
import {
  applyProgressDelta,
  defaultProgress,
  estimateCaloriesBurned,
  upsertDailySession,
} from "../utils/wellness.js";
import LivePostureCoach from "../components/LivePostureCoach.jsx";

const yogaPlans = {
  calm: {
    title: "Calm Reset Flow",
    duration: "8 minutes",
    steps: ["Box breathing", "Seated neck release", "Child pose", "Cat-cow", "Legs up the wall"],
    focus: "Stress relief and nervous system calm",
  },
  morning: {
    title: "Morning Energy Flow",
    duration: "10 minutes",
    steps: ["Deep breathing", "Standing side stretch", "Sun salutation", "Low lunge", "Forward fold"],
    focus: "Gentle energy before school or work",
  },
  sleep: {
    title: "Sleep Wind-down Flow",
    duration: "7 minutes",
    steps: ["Slow breathing", "Butterfly pose", "Seated forward fold", "Supine twist", "Stillness"],
    focus: "Preparing the body for rest",
  },
};

export default function YogaAssistant() {
  const [goal, setGoal] = useState("calm");
  const [minutesDone, setMinutesDone] = useState(0);
  const [aiPlan, setAiPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [, setProgress] = useLocalStorage("afiacare-sdg-progress", defaultProgress);
  const [, setMovementSessions] = useLocalStorage("afiacare-movement-sessions", []);
  const [logged, setLogged] = useState(false);
  const plan = useMemo(() => aiPlan || yogaPlans[goal], [aiPlan, goal]);

  const generatePlan = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await postJson(
        "/api/movement-plan",
        { mode: "yoga", goal, minutes: 10 },
        { timeoutMs: 55000, fallbackMessage: "Live movement planning is still starting or busy, so the selected flow is still ready to use." },
      );
      setAiPlan(data);
    } catch (requestError) {
      setError(describeApiFallback(requestError, "Live movement planning is still starting or busy, so the selected flow is still ready to use."));
    } finally {
      setLoading(false);
    }
  };

  const logYoga = () => {
    const minutes = Math.max(1, Number(minutesDone || parseInt(plan.duration, 10) || 8));
    const caloriesBurned = estimateCaloriesBurned({ type: "yoga", minutes, intensity: 2 });
    setProgress((current) => applyProgressDelta(current, { activity: minutes }));
    setMovementSessions((current) =>
      upsertDailySession(current, {
        type: "yoga",
        title: plan.title,
        minutes,
        intensity: 2,
        caloriesBurned,
      }),
    );
    setLogged(true);
  };

  return (
    <section className="section-pad px-4 md:px-6">
      <div className="mx-auto max-w-5xl">
        <SectionHeader
          eyebrow="Yoga assistance"
          title="Choose a gentle yoga flow"
          arabic="يوغا للصحة"
          description="Simple, beginner-friendly yoga plans for calm, energy, and sleep. Move slowly and stop if something hurts."
        />

        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <article className="sketch-card p-5">
            <h2 className="text-lg font-bold text-uae-black">Today's intention</h2>
            <div className="mt-4 grid gap-3">
              {[
                ["calm", "Calm stress", Moon],
                ["morning", "Morning energy", Sun],
                ["sleep", "Better sleep", Leaf],
              ].map(([id, label, Icon]) => (
                <button
                  key={id}
                  className={`focus-ring sketch-button flex items-center gap-3 px-4 py-3 text-left text-sm ${
                    goal === id ? "sketch-button--dark" : "sketch-button--secondary"
                  }`}
                  onClick={() => {
                    setGoal(id);
                    setAiPlan(null);
                    setLogged(false);
                  }}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>

            <label className="mt-6 grid gap-2">
              <span className="text-sm font-bold text-uae-muted">Minutes completed</span>
              <input
                className="h-2 w-full accent-uae-green"
                type="range"
                min="0"
                max="15"
                value={minutesDone}
                onChange={(event) => setMinutesDone(Number(event.target.value))}
              />
              <span className="text-sm font-semibold text-uae-green">{minutesDone} minutes</span>
            </label>
            <button
              className="focus-ring sketch-button sketch-button--brand mt-5 w-full gap-2 px-5 py-3 text-sm disabled:cursor-wait disabled:opacity-70"
              onClick={generatePlan}
              disabled={loading}
            >
              <Leaf className="h-4 w-4" aria-hidden="true" />
              {loading ? "Preparing flow..." : "Generate yoga flow"}
            </button>
            <button
              className="focus-ring sketch-button sketch-button--secondary mt-3 w-full gap-2 px-5 py-3 text-sm"
              onClick={logYoga}
            >
              <HeartPulse className="h-4 w-4" aria-hidden="true" />
              {logged ? "Logged to SDG activity" : "Log completed flow"}
            </button>
            {error ? (
              <p className="sketch-note mt-3 px-3 py-2 text-sm font-semibold text-uae-red">
                {error}
              </p>
            ) : null}
          </article>

          <article className="sketch-card p-6">
            <div className="flex items-start gap-4">
              <span className="sketch-icon-wrap flex h-12 w-12 shrink-0 items-center justify-center">
                <Leaf className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <p className="sketch-badge">{plan.duration}</p>
                <h2 className="mt-1 text-2xl font-bold text-uae-black">{plan.title}</h2>
                <p className="mt-2 text-sm leading-6 text-uae-muted">{plan.focus}</p>
              </div>
            </div>

            <ol className="mt-6 grid gap-3">
              {(plan.steps || []).map((step, index) => (
                <li key={step} className="sketch-note flex items-center gap-3 p-4">
                  <span className="sketch-icon-wrap flex h-8 w-8 shrink-0 items-center justify-center bg-white text-sm font-bold text-uae-green">
                    {index + 1}
                  </span>
                  <span className="font-semibold text-uae-black">{step}</span>
                </li>
              ))}
            </ol>

            <div className="mt-6 flex items-start gap-3 rounded-lg bg-uae-black p-4 text-white">
              <HeartPulse className="mt-1 h-5 w-5 shrink-0 text-uae-sand" aria-hidden="true" />
              <p className="text-sm leading-6 text-white/85">
                {plan.safety || "Tip: use this after prayer, before sleep, or during a study break. Yoga should feel steady, not painful."}
              </p>
            </div>
          </article>
        </div>

        <LivePostureCoach />
      </div>
    </section>
  );
}

