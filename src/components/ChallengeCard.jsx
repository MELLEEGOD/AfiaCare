import React from "react";
import { CheckCircle2, Circle, UserPlus } from "./icons.jsx";

export default function ChallengeCard({ challenge, status, onJoin, onComplete }) {
  const Icon = challenge.icon;
  const completed = status === "completed";
  const joined = status === "joined" || completed;

  return (
    <article className="sketch-card p-5">
      <div className="flex items-start gap-4">
        <span className="sketch-icon-wrap flex h-11 w-11 shrink-0 items-center justify-center">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-uae-black">{challenge.title}</h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                completed
                  ? "bg-uae-green text-white"
                  : joined
                    ? "bg-uae-sand text-uae-black"
                    : "bg-uae-mist text-uae-muted"
              }`}
            >
              {completed ? "Completed" : joined ? "Joined" : "Open"}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-uae-muted">{challenge.description}</p>
          {challenge.impactText ? (
            <p className="sketch-note mt-2 px-3 py-2 text-sm font-semibold text-uae-green">
              Dashboard impact: {challenge.impactText}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          className={`focus-ring sketch-button inline-flex items-center justify-center gap-2 px-3 py-3 text-sm ${
            joined
              ? "sketch-button--secondary text-uae-muted"
              : "sketch-button--dark"
          }`}
          onClick={onJoin}
          disabled={joined}
        >
          {joined ? <CheckCircle2 className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {joined ? "Joined" : "Join"}
        </button>
        <button
          className={`focus-ring sketch-button inline-flex items-center justify-center gap-2 px-3 py-3 text-sm ${
            completed
              ? "sketch-button--secondary text-uae-muted"
              : "sketch-button--brand"
          }`}
          onClick={onComplete}
          disabled={completed}
        >
          {completed ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
          {completed ? "Done" : "Complete"}
        </button>
      </div>
    </article>
  );
}
