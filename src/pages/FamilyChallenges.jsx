import React from "react";
import { Droplets, Footprints, HeartHandshake, MonitorOff, Salad } from "../components/icons.jsx";
import ChallengeCard from "../components/ChallengeCard.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { applyProgressDelta, defaultProgress } from "../utils/wellness.js";

const challenges = [
  {
    id: "walking",
    title: "7-Day Cooler-Hour Walking Challenge",
    description: "Walk together for at least 15 minutes each day, choosing shaded, indoor, or cooler-hour routes when needed.",
    impact: { activity: 15, steps: 1600 },
    impactText: "+15 activity minutes, +1,600 steps",
    icon: Footprints,
  },
  {
    id: "balanced-dinner",
    title: "Balanced UAE Dinner Challenge",
    description: "Build one shared meal with water, protein, vegetables or fruit, and lighter, less processed ingredients.",
    impact: { meals: 1, water: 1 },
    impactText: "+1 balanced meal, +1 water glass",
    icon: Salad,
  },
  {
    id: "water",
    title: "Heat-Safe Hydration Challenge",
    description: "Keep a shared hydration chart and celebrate consistent water breaks, especially on hotter days.",
    impact: { water: 2 },
    impactText: "+2 water glasses",
    icon: Droplets,
  },
  {
    id: "screen-free",
    title: "Screen-Free Majlis Hour",
    description: "Set aside one hour for conversation, tea, stories, or a calm family check-in without passive scrolling.",
    impact: { mood: 4 },
    impactText: "Mood score support",
    icon: MonitorOff,
  },
  {
    id: "kindness",
    title: "Kindness and Well-being Challenge",
    description: "Each family member chooses one kind action that supports someone else's well-being.",
    impact: { mood: 5 },
    impactText: "Mood score support",
    icon: HeartHandshake,
  },
];

export default function FamilyChallenges() {
  const [challengeProgress, setChallengeProgress] = useLocalStorage(
    "afiacare-family-challenges",
    {},
  );
  const [, setProgress] = useLocalStorage("afiacare-sdg-progress", defaultProgress);

  const setStatus = (challenge, status) => {
    setChallengeProgress((current) => ({
      ...current,
      [challenge.id]: status,
    }));

    if (status === "completed" && challengeProgress[challenge.id] !== "completed") {
      setProgress((current) => applyProgressDelta(current, challenge.impact));
    }
  };

  return (
    <section className="section-pad px-4 md:px-6">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="Family challenges"
          title="Turn UAE well-being into a shared routine"
          description="Join or complete family-centered challenges that connect hydration, movement, screen balance, and food quality to the SDG 3 dashboard."
        />

        <div className="app-panel mb-5 p-5">
          <h2 className="text-lg font-bold text-uae-black">How challenges connect</h2>
          <p className="mt-2 text-sm leading-6 text-uae-muted">
            Completed challenges update water, meals, movement, mood, or steps. That makes shared family habits and UAE environmental-health responses visible in the same daily log as food reviews and exercise sessions.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {challenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              status={challengeProgress[challenge.id]}
              onJoin={() => setStatus(challenge, "joined")}
              onComplete={() => setStatus(challenge, "completed")}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
