import React, { useCallback, useMemo, useState } from "react";
import { Clock3, Flame, Footprints, HeartPulse } from "../components/icons.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import ShadeWalkPlanner from "../components/ShadeWalkPlanner.jsx";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { describeApiFallback, postJson } from "../lib/aiClient.js";
import {
  applyProgressDelta,
  defaultProgress,
  estimateCaloriesBurned,
  upsertDailySession,
} from "../utils/wellness.js";

const routines = {
  stretch: {
    title: "Desk and Study Stretch",
    minutes: 6,
    moves: ["Neck circles", "Shoulder rolls", "Wrist stretch", "Seated twist", "Standing hamstring stretch"],
    note: "Great between study sessions.",
  },
  beginner: {
    title: "Beginner Bodyweight Circuit",
    minutes: 12,
    moves: ["March in place", "Wall push-ups", "Chair squats", "Step touches", "Cool-down breathing"],
    note: "Low-impact and equipment-free.",
  },
  walk: {
    title: "Comfort-Safe Walking Plan",
    minutes: 15,
    moves: ["Choose shade or indoor route", "Warm up slowly", "Walk steady", "Sip water", "Stretch calves"],
    note: "Best before sunrise, after sunset, or indoors.",
  },
};

export default function ExerciseAssistant() {
  const [routineId, setRoutineId] = useState("stretch");
  const [intensity, setIntensity] = useState(2);
  const [aiRoutine, setAiRoutine] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [planNotice, setPlanNotice] = useState("");
  const [, setProgress] = useLocalStorage("afiacare-sdg-progress", defaultProgress);
  const [, setMovementSessions] = useLocalStorage("afiacare-movement-sessions", []);
  const [logged, setLogged] = useState(false);
  const [walkPlan, setWalkPlan] = useState(null);
  const handleWalkPlanChange = useCallback((plan) => {
    setWalkPlan(plan);
    setLogged(false);
  }, []);
  const routine = useMemo(() => {
    const selectedRoutine = aiRoutine || routines[routineId];
    if (routineId !== "walk" || !walkPlan) return selectedRoutine;
    return {
      ...selectedRoutine,
      title: walkPlan.name,
      minutes: walkPlan.minutes,
      note: `${walkPlan.areaLabel} · ${walkPlan.distanceKm} km · about ${walkPlan.shadeScore}% estimated shade at ${walkPlan.departureTime}.`,
      moves: aiRoutine?.moves?.length
        ? aiRoutine.moves
        : ["Check the route and current conditions", "Warm up slowly", "Follow the highlighted path", "Sip water", "Cool down in shade"],
    };
  }, [aiRoutine, routineId, walkPlan]);

  const buildWalkMoves = useCallback((plan) => {
    if (!plan) return routines.walk.moves;
    const finishStep = plan.loopType === "out-and-back" ? "Return on the same shaded path and slow down for the final minute" : "Complete the loop, then ease into a slow cool-down";
    return [
      "Check heat, route conditions, and your water before you start",
      `Warm up for 1 minute, then settle into a ${intensity <= 2 ? "comfortable" : intensity <= 4 ? "steady" : "brisk"} walking pace`,
      plan.loopType === "out-and-back" ? "Follow the highlighted shaded route outward while keeping posture relaxed" : "Follow the highlighted shaded circuit and stay on mapped pedestrian paths",
      `Use shaded segments to recover and keep pace controlled for about ${plan.minutes} minutes`,
      finishStep,
    ];
  }, [intensity]);

  const generateRoutine = async () => {
    setLoading(true);
    setError("");
    setPlanNotice("");
    try {
      if (routineId === "walk" && walkPlan) {
        setAiRoutine({
          title: walkPlan.name,
          minutes: walkPlan.minutes,
          moves: buildWalkMoves(walkPlan),
          note: walkPlan.reason,
          safety: "Stay on visible pedestrian paths, carry water, and stop if you feel pain, dizziness, chest pain, or heat stress.",
        });
        setPlanNotice("Built from live shade routing, your selected start point, and the current intensity level.");
        return;
      }
      const data = await postJson(
        "/api/movement-plan",
        {
          mode: routineId === "stretch" ? "stretching" : routineId === "walk" ? "walking" : "exercise",
          goal: routineId === "walk" && walkPlan ? walkPlan.name : routines[routineId].title,
          minutes: routineId === "walk" && walkPlan ? walkPlan.minutes : routines[routineId].minutes,
        },
        { timeoutMs: 55000, fallbackMessage: "Live movement planning is still starting or busy, so your selected routine is still ready to use." },
      );
      setAiRoutine({
        title: data.title,
        minutes: routineId === "walk" && walkPlan ? walkPlan.minutes : routines[routineId].minutes,
        moves: data.steps || [],
        note: data.focus || data.safety,
        safety: data.safety,
      });
      setPlanNotice(data.notice || (data.provider === "local-ai" ? "Personalized by your local Qwen model." : ""));
    } catch (requestError) {
      setError(describeApiFallback(requestError, "Live movement planning is still starting or busy, so your selected routine is still ready to use."));
    } finally {
      setLoading(false);
    }
  };

  const logRoutine = () => {
    if (routineId === "walk" && !walkPlan) return;
    const minutes = Number(routine.minutes || routines[routineId].minutes || 10);
    const stepDelta = routineId === "walk"
      ? Math.round(Number(walkPlan?.distanceKm || minutes / 12) * 1300)
      : 0;
    const caloriesBurned = estimateCaloriesBurned({ type: routineId, minutes, intensity });
    setProgress((current) =>
      applyProgressDelta(current, {
        activity: minutes,
        steps: stepDelta,
      }),
    );
    setMovementSessions((current) =>
      upsertDailySession(current, {
        type: routineId,
        title: routine.title,
        minutes,
        steps: stepDelta,
        intensity,
        caloriesBurned,
        ...(routineId === "walk" && walkPlan
          ? {
              distanceKm: walkPlan.distanceKm,
              departureTime: walkPlan.departureTime,
              shadeScore: walkPlan.shadeScore,
              areaLabel: walkPlan.areaLabel,
              routePeriod: walkPlan.period,
            }
          : {}),
      }),
    );
    setLogged(true);
  };

  return (
    <section className="section-pad px-4 md:px-6">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="Exercise and stretching"
          title="Build a safe movement routine"
          description="Pick a beginner-friendly routine for stretching, walking, or light exercise. Stop if you feel pain, dizziness, or serious symptoms."
        />

        <div className="grid gap-3 lg:grid-cols-3">
          {Object.entries(routines).map(([id, option]) => (
            <button
              key={id}
              className={`focus-ring sketch-card sketch-card--interactive p-5 text-left ${
                routineId === id
                  ? "bg-uae-sand"
                  : ""
              }`}
              onClick={() => {
                setRoutineId(id);
                setAiRoutine(null);
                setLogged(false);
              }}
            >
              <Footprints className="h-7 w-7" aria-hidden="true" />
              <span className="mt-4 block text-lg font-bold">{option.title}</span>
              <span className="mt-2 block text-sm text-uae-muted">
                {option.minutes} minutes
              </span>
            </button>
          ))}
        </div>

        {routineId === "walk" ? (
          <ShadeWalkPlanner onPlanChange={handleWalkPlanChange} intensity={intensity} />
        ) : null}

        <article className="sketch-card mt-6 p-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <p className="sketch-badge">Selected routine</p>
              <h2 className="mt-2 text-2xl font-bold text-uae-black">{routine.title}</h2>
              <p className="mt-3 text-sm leading-6 text-uae-muted">{routine.note}</p>

              <label className="mt-6 grid gap-2">
                <span className="text-sm font-bold text-uae-muted">Intensity level</span>
                <input
                  className="h-2 w-full accent-uae-red"
                  type="range"
                  min="1"
                  max="5"
                  value={intensity}
                  onChange={(event) => setIntensity(Number(event.target.value))}
                />
                <span className="text-sm font-semibold text-uae-red">
                  {intensity <= 2 ? "Easy" : intensity <= 4 ? "Moderate" : "Challenging"}
                </span>
              </label>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="sketch-note p-4">
                  <Clock3 className="h-5 w-5 text-uae-green" aria-hidden="true" />
                  <p className="mt-2 text-lg font-bold">{routine.minutes} min</p>
                </div>
                <div className="sketch-note p-4">
                  <Flame className="h-5 w-5 text-uae-red" aria-hidden="true" />
                  <p className="mt-2 text-lg font-bold">
                    ~{estimateCaloriesBurned({ type: routineId, minutes: routine.minutes, intensity })} kcal
                  </p>
                </div>
              </div>
              <button
                className="focus-ring sketch-button sketch-button--brand mt-5 min-h-12 w-full gap-2 px-5 py-3 text-sm disabled:cursor-wait disabled:opacity-70"
                onClick={generateRoutine}
                disabled={loading}
              >
                <Footprints className="h-4 w-4" aria-hidden="true" />
                {loading ? "Preparing routine..." : "Generate routine"}
              </button>
              <button
                className="focus-ring sketch-button sketch-button--secondary mt-3 w-full gap-2 px-5 py-3 text-sm disabled:cursor-not-allowed disabled:bg-uae-mist disabled:text-uae-muted"
                onClick={logRoutine}
                disabled={routineId === "walk" && !walkPlan}
              >
                <HeartPulse className="h-4 w-4" aria-hidden="true" />
                {logged ? "Logged to SDG activity" : routineId === "walk" && !walkPlan ? "Choose a valid route first" : "Log completed routine"}
              </button>
              {error ? (
                <p className="sketch-note mt-3 px-3 py-2 text-sm font-semibold text-uae-red">
                  Could not prepare a new routine. Your selected routine is still ready to use. {error}
                </p>
              ) : null}
              {planNotice ? (
                <p className="mt-3 text-sm leading-5 text-uae-muted" role="status">
                  {planNotice}
                </p>
              ) : null}
            </div>

            <div>
              <h3 className="font-bold text-uae-black">Step-by-step guidance</h3>
              <ol className="mt-4 grid gap-3">
                {(routine.moves || routine.steps || []).map((move, index) => (
                  <li key={move} className="sketch-note flex items-center gap-3 p-4">
                    <span className="sketch-icon-wrap flex h-8 w-8 shrink-0 items-center justify-center bg-white text-sm font-bold text-uae-green">
                      {index + 1}
                    </span>
                    <span className="font-semibold text-uae-black">{move}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-5 flex items-start gap-3 rounded-lg bg-uae-black p-4 text-white">
                <HeartPulse className="mt-1 h-5 w-5 shrink-0 text-uae-sand" aria-hidden="true" />
                <p className="text-sm leading-6 text-white/85">
                  {routine.safety || "Keep water nearby and avoid intense outdoor exercise when conditions feel uncomfortable."}
                </p>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

