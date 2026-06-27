import React, { useState } from "react";
import ChatWorkspace from "../components/ChatWorkspace.jsx";
import { Bot, HeartPulse } from "../components/icons.jsx";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { describeApiFallback, postJson } from "../lib/aiClient.js";
import { buildDailyWellnessContext, defaultProgress } from "../utils/wellness.js";

const initialMessages = [
  {
    role: "assistant",
    text: "Hi, I am Noura. Ask me about heat, hydration, food, exercise, sleep, or today's UAE routine. I can use your logged meals and movement when they are available.",
  },
];

function getMockAiResponse(question, dailyContext) {
  const text = question.toLowerCase();
  const foodContext = dailyContext?.summary?.food || "No meals reviewed today.";

  // Keyword matching keeps the demo useful even when the live model is not configured.
  if (["emergency", "chest pain", "faint", "serious", "severe"].some((word) => text.includes(word))) {
    return "For serious symptoms, please contact a healthcare professional or local emergency services immediately. I can only offer general wellness support.";
  }
  if (["stress", "stressed", "anxiety", "worry"].some((word) => text.includes(word))) {
    return "Try a two-minute reset: inhale for four counts, exhale for six, then name one controllable next step. If you have logged food or movement today, use that as evidence that the day is still adjustable.";
  }
  if (["food", "meal", "eat", "diet", "iftar"].some((word) => text.includes(word))) {
    return `Today's food context: ${foodContext} For the next meal, aim for protein, fiber-rich carbohydrates, vegetables or fruit, and water.`;
  }
  if (["exercise", "walk", "steps", "workout", "movement"].some((word) => text.includes(word))) {
    return "Choose a cooler time of day, walk indoors or in shade if needed, and start with 10 minutes. Consistent movement is more useful than a perfect workout plan.";
  }
  if (["sleep", "tired", "rest"].some((word) => text.includes(word))) {
    return "Protect a simple sleep routine: dim lights, reduce screens, and keep your room cool. If you can, set the same sleep and wake time for the next three nights.";
  }
  if (["water", "hydration", "heat", "hot"].some((word) => text.includes(word))) {
    return "Keep water visible and connect it to existing routines: after waking, after class, after movement, and before sleep. On hotter UAE days, increase reminders before outdoor time.";
  }
  if (["family", "parents", "children", "home"].some((word) => text.includes(word))) {
    return "Make wellness social: invite your family to a short walk, a shared meal review, or a screen-free hour. Shared habits are easier to keep.";
  }

  return "A gentle starting point: drink water, move for 10 minutes, check your mood, and connect with someone you trust. Tiny habits can support SDG 3 when repeated daily.";
}

export default function AIWellnessAssistant() {
  const [messages, setMessages] = useState(initialMessages);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress] = useLocalStorage("afiacare-sdg-progress", defaultProgress);
  const [lastMood] = useLocalStorage("afiacare-last-mood", null);
  const [mealReviews] = useLocalStorage("afiacare-meal-reviews", []);
  const [movementSessions] = useLocalStorage("afiacare-movement-sessions", []);
  const dailyContext = buildDailyWellnessContext({
    progress,
    lastMood,
    meals: mealReviews,
    movement: movementSessions,
  });

  const submitQuestion = async (event) => {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;

    setMessages((current) => [...current, { role: "user", text: trimmed }]);
    setQuestion("");
    setError("");
    setLoading(true);

    try {
      const data = await postJson(
        "/api/wellness-chat",
        { question: trimmed, dailyContext },
        { timeoutMs: 50000, fallbackMessage: "Live Noura is still starting or busy, so AfiaCare used built-in wellness guidance." },
      );
      setMessages((current) => [...current, { role: "assistant", text: data.text }]);
    } catch (requestError) {
      setError(describeApiFallback(requestError, "Live Noura is still starting or busy, so AfiaCare used built-in wellness guidance."));
      setMessages((current) => [
        ...current,
        { role: "assistant", text: getMockAiResponse(trimmed, dailyContext) },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ChatWorkspace
      section={{
        eyebrow: "Noura AI",
        title: "Ask Noura a practical health habit question",
        description: "Practical wellness education for daily habits, UAE heat and hydration, food, movement, sleep, and SDG 3 reflection.",
      }}
      header={{
        icon: Bot,
        iconClassName: "bg-uae-green text-white",
        title: "Noura, Wellness Guide",
        description: "Uses today's meals, movement, mood, score, and UAE daily context when available",
        context: `Today: ${dailyContext.summary.food} Movement: ${dailyContext.summary.movement}`,
      }}
      messages={messages}
      loading={loading}
      error={error}
      input={question}
      onInputChange={setQuestion}
      onSubmit={submitQuestion}
      inputLabel="Your wellness question"
      inputPlaceholder="Example: What should I do after what I ate today?"
      safetyNote="This app does not provide medical diagnosis. For serious symptoms, contact a healthcare professional."
      submitButtonClassName="sketch-button--brand"
      chatHeightClassName="h-[58vh] min-h-[390px]"
      assistantIcon={HeartPulse}
      assistantIconClassName="bg-uae-green text-white"
    />
  );
}
