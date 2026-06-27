import React from "react";
import { RefreshCw } from "./icons.jsx";

export default function TipCard({ tip, onNext, onAction }) {
  const Icon = tip.icon;

  return (
    <article className="sketch-card p-6">
      <div className="flex items-start gap-4">
        <span className="sketch-icon-wrap flex h-12 w-12 shrink-0 items-center justify-center bg-uae-green text-white">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <p className="sketch-badge">{tip.topic}</p>
          <h2 className="mt-2 text-2xl font-bold text-uae-black">{tip.title}</h2>
          <p className="mt-3 text-base leading-7 text-uae-muted">{tip.body}</p>
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {onAction ? (
          <button
            className="focus-ring sketch-button sketch-button--dark gap-2 px-4 py-3 text-sm"
            onClick={onAction}
          >
            {tip.action}
          </button>
        ) : null}
        <button
          className="focus-ring sketch-button sketch-button--secondary gap-2 px-4 py-3 text-sm"
          onClick={onNext}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Generate another tip
        </button>
      </div>
    </article>
  );
}
