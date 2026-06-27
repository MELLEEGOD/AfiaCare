import React, { useState } from "react";
import ChatWorkspace from "../components/ChatWorkspace.jsx";
import { Brain, HeartHandshake, ShieldCheck } from "../components/icons.jsx";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { describeApiFallback, postJson } from "../lib/aiClient.js";
import { buildDailyWellnessContext, defaultProgress } from "../utils/wellness.js";

const startingMessages = [
  {
    role: "assistant",
    text: "Hi, I am Salem. I can help you reflect, calm your breathing, and plan one small next step. I am not a licensed therapist, but I can use today's logged habits to make the support more practical.",
  },
];

function therapistReply(input, dailyContext) {
  const text = input.toLowerCase();
  const movementContext = dailyContext?.summary?.movement || "No movement sessions logged today.";

  if (["harm", "suicide", "kill myself", "unsafe", "danger"].some((word) => text.includes(word))) {
    return "I am really sorry you are feeling this. Please contact emergency services or a trusted person near you right now. If you may be in immediate danger, call local emergency services. You deserve live support, not just an app response.";
  }

  if (["stress", "panic", "anxious", "anxiety", "worried"].some((word) => text.includes(word))) {
    return `Let us slow the moment down. Breathe in for 4 counts and out for 6 counts three times. Today movement log: ${movementContext} If you have not moved yet, try a two-minute stretch after this.`;
  }

  if (["sad", "lonely", "cry", "down"].some((word) => text.includes(word))) {
    return "That sounds heavy. A gentle step is to message one safe person and do one grounding action: drink water, sit near light, or take a short walk. You do not have to solve everything today.";
  }

  if (["family", "parents", "friend", "school"].some((word) => text.includes(word))) {
    return "Relationships can carry a lot. Try naming the feeling first, then the need: 'I feel ___ and I need ___.' Choose a calm moment when everyone is more ready to listen.";
  }

  if (["angry", "mad", "frustrated"].some((word) => text.includes(word))) {
    return "Anger often points to a boundary or unmet need. Before replying, pause for 90 seconds, relax your shoulders, and choose whether you need space, help, or a clear conversation.";
  }

  return "Thank you for sharing that. Try writing three lines: what happened, what I feel, and one kind action I can take next. Small emotional check-ins support SDG 3 mental well-being.";
}

export default function AITherapist() {
  const [messages, setMessages] = useState(startingMessages);
  const [entry, setEntry] = useState("");
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

  const sendMessage = async (event) => {
    event.preventDefault();
    const trimmed = entry.trim();
    if (!trimmed) return;

    const nextMessages = [...messages, { role: "user", text: trimmed }];
    setMessages(nextMessages);
    setEntry("");
    setError("");
    setLoading(true);

    try {
      const data = await postJson(
        "/api/therapist",
        { messages: nextMessages, dailyContext },
        { timeoutMs: 55000, fallbackMessage: "Live Salem is still starting or busy, so AfiaCare used built-in reflection guidance." },
      );
      setMessages((current) => [...current, { role: "assistant", text: data.text }]);
    } catch (requestError) {
      setError(describeApiFallback(requestError, "Live Salem is still starting or busy, so AfiaCare used built-in reflection guidance."));
      setMessages((current) => [
        ...current,
        { role: "assistant", text: therapistReply(trimmed, dailyContext) },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ChatWorkspace
        section={{
          eyebrow: "Salem AI",
          title: "Reflect with Salem and choose a kinder next step",
          description: "A supportive reflection space for grounding and emotional well-being. It does not replace professional therapy.",
        }}
        header={{
          icon: Brain,
          iconClassName: "bg-[var(--danger)] text-white",
          title: "Salem, Reflection Coach",
          description: "Grounding prompts connected to today's logged habits",
          context: `Context active: mood is ${dailyContext.mood}; movement is ${dailyContext.summary.movement}`,
        }}
        messages={messages}
        loading={loading}
        error={error}
        input={entry}
        onInputChange={setEntry}
        onSubmit={sendMessage}
        inputLabel="What is on your mind?"
        inputPlaceholder="Example: I feel stressed and want a small next step."
        safetyNote="Not a crisis service or licensed therapy. For urgent risk, contact emergency services or a trusted adult."
        submitButtonClassName="sketch-button--dark"
        chatHeightClassName="h-[54vh] min-h-[360px]"
        assistantIcon={HeartHandshake}
        assistantIconClassName="bg-[var(--danger)] text-white"
        userIconClassName="bg-uae-green text-white"
      />

      <section className="px-4 pb-8 md:px-6 md:pb-12">
        <article className="sketch-card mx-auto max-w-4xl p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-uae-green" aria-hidden="true" />
            <p className="text-sm leading-6 text-uae-muted">
              Future versions could connect to approved school counselling resources, crisis contacts, and multilingual mental health education.
            </p>
          </div>
        </article>
      </section>
    </>
  );
}
