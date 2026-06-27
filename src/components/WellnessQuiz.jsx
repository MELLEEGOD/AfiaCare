import React, { useMemo, useState } from "react";
import { HeartPulse, ShieldCheck } from "./icons.jsx";
import { WELLNESS_QUIZ_INTERVAL_MS, WELLNESS_QUIZ_VERSION } from "../constants/quiz.js";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { addMoodEntry, defaultProgress, moodToScore } from "../utils/wellness.js";

const questions = [
  {
    id: "currentMood",
    label: "Mood now",
    prompt: "How do you feel right now?",
    options: ["happy", "stressed", "tired", "sad", "motivated", "anxious"],
  },
  {
    id: "stressFrequency",
    label: "School stress",
    prompt: "How often do you feel stressed because of school?",
    options: ["Rarely", "Sometimes", "Often", "Very often"],
  },
  {
    id: "sleepHours",
    label: "Sleep",
    prompt: "On school nights, how many hours do you usually sleep?",
    options: ["Less than 5", "5-6", "7-8", "More than 8"],
  },
  {
    id: "exerciseDays",
    label: "Movement",
    prompt: "How many days per week do you exercise for at least 30 minutes?",
    options: ["0", "1-2", "3-4", "5+"],
  },
  {
    id: "dailyWater",
    label: "Hydration",
    prompt: "How many glasses of water did you drink yesterday?",
    options: ["0-2", "3-4", "5-6", "7+"],
  },
  {
    id: "healthyMeals",
    label: "Meals",
    prompt: "How many balanced meals did you eat yesterday?",
    options: ["0", "1", "2", "3+"],
  },
];

function progressFromResponses(responses) {
  const sleepMap = {
    "Less than 5": 4.5,
    "5-6": 5.5,
    "7-8": 7.5,
    "More than 8": 8,
  };
  const activityMap = {
    0: 5,
    "1-2": 15,
    "3-4": 25,
    "5+": 35,
  };
  const stepMap = {
    0: 1500,
    "1-2": 3500,
    "3-4": 6500,
    "5+": 8500,
  };
  const waterMap = {
    "0-2": 2,
    "3-4": 4,
    "5-6": 6,
    "7+": 8,
  };
  const mealMap = {
    0: 0,
    1: 1,
    2: 2,
    "3+": 3,
  };
  const stressMoodMap = {
    Rarely: 4,
    Sometimes: 3,
    Often: 2,
    "Very often": 1,
  };

  return {
    water: waterMap[responses.dailyWater] ?? defaultProgress.water,
    steps: stepMap[responses.exerciseDays] ?? defaultProgress.steps,
    sleep: sleepMap[responses.sleepHours] ?? defaultProgress.sleep,
    mood: moodToScore(responses.currentMood) || stressMoodMap[responses.stressFrequency] || defaultProgress.mood,
    meals: mealMap[responses.healthyMeals] ?? defaultProgress.meals,
    activity: activityMap[responses.exerciseDays] ?? defaultProgress.activity,
  };
}

function recommendationsFromResponses(responses) {
  const items = [];
  if (["anxious", "stressed"].includes(responses.currentMood)) {
    items.push("Start with Salem for breathing, grounding, and one small next step.");
  }
  if (responses.currentMood === "tired") {
    items.push("Choose gentle yoga or stretching instead of intense exercise today.");
  }
  if (["Often", "Very often"].includes(responses.stressFrequency)) {
    items.push("Start with Salem for a short grounding reflection.");
  }
  if (["Less than 5", "5-6"].includes(responses.sleepHours)) {
    items.push("Try the sleep yoga flow and reduce screens after 9 pm.");
  }
  if (["0", "1-2"].includes(responses.exerciseDays)) {
    items.push("Use the exercise page for a short indoor or shaded movement routine.");
  }
  if (["0-2", "3-4"].includes(responses.dailyWater)) {
    items.push("Set water reminders so hydration is part of your school and home rhythm.");
  }
  if (["0", "1"].includes(responses.healthyMeals)) {
    items.push("Use the food coach to make one meal more balanced today.");
  }
  if (!items.length) {
    items.push("Keep your routine steady and use the dashboard to protect your progress.");
  }
  return items.slice(0, 3);
}

function tasksFromResponses(responses) {
  const tasks = [];

  if (["anxious", "stressed"].includes(responses.currentMood) || ["Often", "Very often"].includes(responses.stressFrequency)) {
    tasks.push({
      page: "therapist",
      title: "Do a 3-minute grounding reflection",
      reason: `Mood is ${responses.currentMood || "noted"} and stress is ${responses.stressFrequency?.toLowerCase() || "unknown"}.`,
    });
  } else {
    tasks.push({
      page: "mood",
      title: "Log one mood check-in",
      reason: "Keep the SDG mood record current.",
    });
  }

  if (["Less than 5", "5-6"].includes(responses.sleepHours)) {
    tasks.push({
      page: "yoga",
      title: "Try the sleep wind-down flow",
      reason: `Sleep baseline is ${responses.sleepHours} hours.`,
    });
  }

  if (["0", "1-2"].includes(responses.exerciseDays)) {
    tasks.push({
      page: "exercise",
      title: "Complete a short climate-smart movement routine",
      reason: `Exercise baseline is ${responses.exerciseDays} days per week.`,
    });
  }

  if (["0-2", "3-4"].includes(responses.dailyWater)) {
    tasks.push({
      page: "reminders",
      title: "Set a water reminder schedule",
      reason: `Hydration baseline is ${responses.dailyWater} glasses.`,
    });
  }

  if (["0", "1"].includes(responses.healthyMeals)) {
    tasks.push({
      page: "food",
      title: "Balance your next meal",
      reason: `Balanced meal baseline is ${responses.healthyMeals}.`,
    });
  }


  return tasks.slice(0, 4);
}

export default function WellnessQuiz({ onComplete }) {
  const [quizRecord, setQuizRecord] = useLocalStorage("afiacare-wellness-quiz", null);
  const [, setProgress] = useLocalStorage("afiacare-sdg-progress", defaultProgress);
  const [, setInitialTasks] = useLocalStorage("afiacare-initial-tasks", null);
  const [, setQuizHistory] = useLocalStorage("afiacare-quiz-history", []);
  const [, setLastMood] = useLocalStorage("afiacare-last-mood", null);
  const [, setMoodHistory] = useLocalStorage("afiacare-mood-history", []);
  const [responses, setResponses] = useState(() =>
    questions.reduce((acc, question) => ({ ...acc, [question.id]: "" }), {}),
  );
  const [step, setStep] = useState(0);
  const [insights, setInsights] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const currentQuestion = questions[step];
  const answeredCount = useMemo(
    () => Object.values(responses).filter(Boolean).length,
    [responses],
  );
  const complete = answeredCount === questions.length;

  const choose = (value) => {
    setResponses((current) => ({ ...current, [currentQuestion.id]: value }));
  };

  const submit = async () => {
    if (!complete) return;
    const derivedProgress = progressFromResponses(responses);
    const recommendations = recommendationsFromResponses(responses);
    const tasks = tasksFromResponses(responses);
    const record = {
      version: WELLNESS_QUIZ_VERSION,
      completedAt: new Date().toISOString(),
      responses,
      recommendations,
      tasks,
    };
    const taskPlan = {
      createdAt: record.completedAt,
      expiresAt: new Date(Date.now() + WELLNESS_QUIZ_INTERVAL_MS).toISOString(),
      tasks,
    };

    setQuizRecord(record);
    setQuizHistory((current) => [record, ...current].slice(0, 8));
    setInitialTasks(taskPlan);
    setProgress((current) => ({ ...defaultProgress, ...current, ...derivedProgress }));
    const moodEntry = {
      id: responses.currentMood || "stressed",
      label: responses.currentMood || "checked in",
      suggestion: recommendations[0] || "Use one small wellness action today.",
    };
    setLastMood(moodEntry);
    setMoodHistory((current) => addMoodEntry(current, moodEntry));
    setInsights({ recommendations, tasks });
    setSubmitted(true);
  };

  return (
    <main className="welcome-screen min-h-screen px-4 py-6 text-uae-black">
      <section className="welcome-layout mx-auto grid min-h-[calc(100vh-48px)] max-w-6xl content-center gap-5 lg:grid-cols-[0.92fr_1.08fr]">
        <aside className="welcome-companions">
          <div className="welcome-brandline">
            <img src="/assets/afiacare-logo.svg" alt="" aria-hidden="true" />
            <span>AfiaCare · UAE</span>
          </div>
          <div className="companion-scene" aria-label="Noura and Salem, your AfiaCare wellness companions">
            <div className="companion companion--noura">
              <span className="companion__name">Noura</span>
              <span className="companion__head"><span className="companion__face">•‿•</span></span>
              <span className="companion__body companion__body--abaya"><span className="companion__hand" /></span>
            </div>
            <div className="companion companion--salem">
              <span className="companion__name">Salem</span>
              <span className="companion__head companion__head--ghutra"><span className="companion__face">•ᴗ•</span></span>
              <span className="companion__body companion__body--kandura"><span className="companion__hand" /></span>
            </div>
          </div>
          <div className="welcome-copy">
            <p className="welcome-salaam" lang="ar" dir="rtl">أهلاً وسهلاً</p>
            <h1>{quizRecord ? "Welcome back—let’s check in" : "Salem and Noura are here for you"}</h1>
            <p>Answer a few questions so we can shape today around your mood, food, movement, and UAE routine.</p>
            <span><ShieldCheck className="h-4 w-4" aria-hidden="true" /> Your answers stay on this device.</span>
          </div>
        </aside>

        <section className="app-panel welcome-question-panel p-5 md:p-7">
          {submitted && insights ? (
            <div>
              <div className="flex items-start gap-3">
                <span className="sketch-icon-wrap flex h-11 w-11 shrink-0 items-center justify-center">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="sketch-badge">Ready for today</p>
                  <h2 className="mt-1 text-2xl font-bold text-uae-black">Here’s your gentle starting plan</h2>
                  <p className="mt-2 text-sm leading-6 text-uae-muted">
                    These recommendations, starting tasks, and dashboard progress values will appear as connected UAE environmental-health signals in the app.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                {(insights.recommendations || []).map((item) => (
                  <p key={item} className="sketch-note p-3 text-sm leading-6 text-uae-muted">
                    {item}
                  </p>
                ))}
              </div>
              <div className="sketch-card mt-5 p-4">
                <p className="text-sm font-bold text-uae-green">Configured starting tasks</p>
                <div className="mt-3 grid gap-2">
                  {(insights.tasks || []).map((task) => (
                    <p key={`${task.page}-${task.title}`} className="sketch-note p-3 text-sm leading-6 text-uae-muted">
                      <span className="font-bold text-uae-black">{task.title}</span>: {task.reason}
                    </p>
                  ))}
                </div>
              </div>
              <button
                className="focus-ring sketch-button sketch-button--dark mt-6 px-5 py-3 text-sm"
                onClick={onComplete}
              >
                Start my day
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-uae-green">Salem & Noura ask · {currentQuestion.label}</p>
                  <h2 className="mt-2 text-2xl font-bold leading-tight text-uae-black">
                    {currentQuestion.prompt}
                  </h2>
                </div>
                <span className="sketch-chip">
                  {step + 1}/{questions.length}
                </span>
              </div>

              <div className="mt-6 grid gap-3">
                {currentQuestion.options.map((option) => {
                  const selected = responses[currentQuestion.id] === option;
                  return (
                    <button
                      key={option}
                      className={`focus-ring sketch-button w-full px-4 py-3 text-left text-sm ${
                        selected ? "sketch-button--dark" : "sketch-button--secondary"
                      }`}
                      onClick={() => choose(option)}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  className="focus-ring sketch-button sketch-button--secondary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => setStep((current) => Math.max(current - 1, 0))}
                  disabled={step === 0}
                >
                  Back
                </button>
                {step < questions.length - 1 ? (
                  <button
                    className="focus-ring sketch-button sketch-button--brand px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => setStep((current) => Math.min(current + 1, questions.length - 1))}
                    disabled={!responses[currentQuestion.id]}
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    className="focus-ring sketch-button sketch-button--brand px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={submit}
                    disabled={!complete}
                  >
                    Save mood and health baseline
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

