import React from "react";
import { Ambulance, Brain, Landmark, Leaf, ShieldCheck } from "../components/icons.jsx";
import ResourceCard from "../components/ResourceCard.jsx";
import SectionHeader from "../components/SectionHeader.jsx";

const resources = [
  {
    type: "Official UAE health services",
    title: "UAE Ministry of Health and Prevention",
    description: "Official UAE public-health services, prevention guidance, and awareness material for families, students, and communities.",
    items: ["Health services", "Awareness center", "Preventive care"],
    href: "https://mohap.gov.ae/en",
    icon: Landmark,
  },
  {
    type: "Environmental health",
    title: "UAE climate and outdoor safety guidance",
    description: "Use official UAE information on weather, heat, and public conditions when planning outdoor activity, transport, and school routines.",
    items: ["Heat and weather awareness", "Outdoor planning", "Public conditions"],
    href: "https://u.ae/en/information-and-services/environment-and-energy/weather-and-climate",
    icon: Leaf,
  },
  {
    type: "Emergency information",
    title: "Emergency numbers",
    description: "Informational UAE emergency numbers for urgent situations. Always follow official local guidance.",
    items: ["Police: 999", "Ambulance: 998", "Fire / Civil Defence: 997"],
    href: "https://u.ae/en/information-and-services/justice-safety-and-the-law/emergency-phone-numbers-and-apps",
    icon: Ambulance,
  },
  {
    type: "Mental health",
    title: "Mental health support",
    description: "A placeholder for trusted school, university, clinic, or UAE-approved mental health support contacts.",
    items: ["Counselling services", "Trusted helplines", "Family support"],
    href: null,
    icon: Brain,
  },
  {
    type: "Healthy lifestyle",
    title: "Healthy lifestyle and prevention awareness",
    description: "Campaigns and guidance about nutrition, movement, sleep, hydration, screening, and prevention in daily UAE life.",
    items: ["Nutrition and hydration", "Physical activity", "Screening and prevention"],
    href: null,
    icon: Leaf,
  },
];

export default function Resources() {
  return (
    <section className="section-pad px-4 md:px-6">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="Trusted UAE resources"
          title="Health and environmental resources for a safer demo"
          arabic="مصادر صحية موثوقة"
          description="These cards connect AfiaCare to UAE health, emergency, and environmental context. For medical advice, diagnosis, or urgent symptoms, contact qualified professionals."
        />

        <div className="app-panel mb-6 p-5">
          <div className="flex items-start gap-4">
            <span className="sketch-icon-wrap flex h-11 w-11 shrink-0 items-center justify-center bg-uae-black text-white">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="sketch-badge">Important boundary</p>
              <p className="mt-3 text-sm leading-6 text-uae-muted">
                This project separates wellness education from medical care. It can point to trusted
                resources on health, emergency response, and environmental conditions, but it does not diagnose, treat, or replace professional healthcare.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {resources.map((resource) => (
            <ResourceCard key={resource.title} resource={resource} />
          ))}
        </div>
      </div>
    </section>
  );
}
