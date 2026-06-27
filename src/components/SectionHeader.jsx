import React from "react";

export default function SectionHeader({ eyebrow, title, arabic, description }) {
  return (
    <div className="mb-6 border-b-[3px] border-[var(--border-dark)] pb-5">
      <div className="flex flex-wrap items-center gap-3 text-sm text-uae-muted">
        {eyebrow ? <p className="font-semibold text-uae-black">{eyebrow}</p> : null}
        {arabic ? <span className="sketch-badge">{arabic}</span> : null}
      </div>
      <h1 className="mt-3 text-3xl font-semibold leading-tight text-uae-black md:text-4xl">{title}</h1>
      {description ? (
        <p className="mt-3 max-w-3xl text-base leading-7 text-uae-muted">{description}</p>
      ) : null}
    </div>
  );
}
