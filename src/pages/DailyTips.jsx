import React, { useState } from "react";
import { BedDouble, Footprints, Salad, Sun, UsersRound, Waves } from "../components/icons.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import TipCard from "../components/TipCard.jsx";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { upsertDailySession } from "../utils/wellness.js";

const tips = [
  {
    topic: "Hydration",
    title: "Match water to UAE heat, not just habit",
    body: "Keep a bottle near your desk or bag and increase water breaks on hotter days, long commutes, or outdoor school activities.",
    action: "Set a water reminder",
    page: "reminders",
    icon: Waves,
  },
  {
    topic: "Heat and movement",
    title: "Choose safer movement windows",
    body: "Use early morning, evening, shade, or indoor routes when outdoor heat is uncomfortable. A shorter safe walk is better than skipping movement entirely.",
    action: "Open exercise plan",
    page: "exercise",
    icon: Sun,
  },
  {
    topic: "Food balance",
    title: "Upgrade meals for health and climate",
    body: "After a meal review, add the missing piece: protein, vegetables or fruit, fiber-rich carbohydrates, or water. Choose lighter, less processed options when possible.",
    action: "Review a meal photo",
    page: "food",
    icon: Salad,
  },
  {
    topic: "Movement",
    title: "Use short movement to reset attention",
    body: "Five to ten minutes of walking, stretching, or light bodyweight movement can support energy without turning the day into a workout project.",
    action: "Open exercise plan",
    page: "exercise",
    icon: Footprints,
  },
  {
    topic: "Sleep",
    title: "Make the final hour quieter",
    body: "Dim lights, reduce screen switching, prepare tomorrow's essentials, and use the sleep yoga flow if your body feels restless.",
    action: "Open sleep yoga",
    page: "yoga",
    icon: BedDouble,
  },
  {
    topic: "Family health",
    title: "Make one habit shared at home",
    body: "Invite family members into one simple action: an indoor walk circuit, a shared meal upgrade, a water chart, or a screen-free majlis hour.",
    action: "Start a family challenge",
    page: "challenges",
    icon: UsersRound,
  },
  {
    topic: "Built environment",
    title: "Use your surroundings as a health tool",
    body: "Choose shaded paths, cooler hours, walkable indoor spaces, and calmer screen routines. Environment changes can protect both mood and physical health.",
    action: "View trusted resources",
    page: "resources",
    icon: Sun,
  },
];

export default function DailyTips({ onNavigate }) {
  const [index, setIndex] = useState(0);
  const [, setTipHistory] = useLocalStorage("afiacare-tip-history", []);
  const tip = tips[index];

  const saveTip = (nextTip) => {
    setTipHistory((current) =>
      upsertDailySession(current, {
        type: "tip",
        title: nextTip.title,
        topic: nextTip.topic,
        page: nextTip.page,
      }),
    );
  };

  const nextTip = () => {
    const nextIndex = (index + Math.ceil(Math.random() * (tips.length - 1))) % tips.length;
    setIndex(nextIndex);
    saveTip(tips[nextIndex]);
  };

  return (
    <section className="px-4 py-8 md:px-6 md:py-12">
      <div className="mx-auto max-w-4xl">
        <SectionHeader
          eyebrow="Daily UAE health tips"
          title="Environmental health guidance that leads to action"
          description="Tips connect UAE heat, hydration, food, movement, family routines, and trusted resources to SDG 3."
        />
        <TipCard tip={tip} onNext={nextTip} onAction={() => onNavigate(tip.page)} />
      </div>
    </section>
  );
}
