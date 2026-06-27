import React from "react";
import { ExternalLink } from "./icons.jsx";

export default function ResourceCard({ resource }) {
  const Icon = resource.icon;

  return (
    <article className="sketch-card sketch-card--interactive p-5">
      <div className="flex items-start gap-4">
        <span className="sketch-icon-wrap flex h-11 w-11 shrink-0 items-center justify-center bg-uae-black text-white">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="sketch-badge">{resource.type}</p>
          <h2 className="mt-1 text-lg font-bold text-uae-black">{resource.title}</h2>
          <p className="mt-3 text-sm leading-6 text-uae-muted">{resource.description}</p>
        </div>
      </div>
      <ul className="mt-4 grid gap-2 text-sm text-uae-muted">
        {resource.items.map((item) => (
          <li key={item} className="sketch-note px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
      {resource.href ? (
        <a
          className="focus-ring sketch-button sketch-button--brand mt-5 inline-flex gap-2 px-4 py-3 text-sm no-underline"
          href={resource.href}
          target="_blank"
          rel="noreferrer"
        >
          Open resource
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      ) : null}
    </article>
  );
}
