import React from "react";

export default function ProgressCard({
  label,
  helper,
  value,
  unit,
  min = 0,
  max,
  step = 1,
  target,
  icon: Icon,
  onChange,
  statusLabel = "",
  statusTone = "steady",
}) {
  const percent = Math.min(Math.round((Number(value) / target) * 100), 100);
  const toneClass =
    statusTone === "good"
      ? "bg-uae-wash text-uae-green"
      : statusTone === "low"
        ? "bg-uae-sand text-uae-black"
        : "bg-uae-mist text-uae-muted";
  const quickStep = step >= 100 ? step * 5 : step;

  return (
    <article className="sketch-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="sketch-icon-wrap flex h-10 w-10 items-center justify-center">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-bold text-uae-black">{label}</h2>
            <p className="text-sm text-uae-muted">{helper}</p>
          </div>
        </div>
        {statusLabel ? (
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${toneClass}`}>
            {statusLabel}
          </span>
        ) : null}
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <label className="grid flex-1 gap-2">
          <span className="text-sm font-semibold text-uae-muted">Today</span>
          <input
            className="focus-ring sketch-input"
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
          />
        </label>
        <span className="pb-2 text-sm font-semibold text-uae-muted">{unit}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          className="focus-ring sketch-button sketch-button--secondary min-h-10 px-3 py-2 text-sm"
          onClick={() => onChange(Math.max(min, Number(value) - quickStep))}
          type="button"
        >
          - {quickStep}
        </button>
        <button
          className="focus-ring sketch-button sketch-button--brand min-h-10 px-3 py-2 text-sm"
          onClick={() => onChange(Math.min(max, Number(value) + quickStep))}
          type="button"
        >
          + {quickStep}
        </button>
      </div>

      <input
        className="mt-5 h-2 w-full accent-uae-green"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={`${label} progress`}
      />
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="font-semibold text-uae-green">{percent}% of target</span>
        <span className="text-uae-muted">
          Goal: {target} {unit}
        </span>
      </div>
    </article>
  );
}
