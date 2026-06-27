import React from "react";
import { ArrowRight, Moon, Sun } from "./icons.jsx";

const defaultCopy = {
  eyebrow: "Active workspace · UAE",
  homeDescription: "Your full daily operations view for wellness, movement, food, and family routines.",
  pageDescription: "A focused tool inside the AfiaCare daily wellness workspace.",
  darkTheme: "Dark theme",
  lightTheme: "Light theme",
  switchToLight: "Switch to light theme",
  switchToDark: "Switch to dark theme",
  light: "Light",
  dark: "Dark",
  returnHome: "Return to today",
  languageLabel: "Language",
};

export default function Navbar({
  activePage,
  activePageLabel,
  onNavigate,
  theme = "light",
  onToggleTheme,
  language = "en",
  languageOptions = [],
  onLanguageChange,
  copy = defaultCopy,
}) {
  return (
    <header className="app-topbar">
      <nav className="app-topbar__inner">
        <div className="min-w-0">
          <p className="app-topbar__eyebrow">{copy.eyebrow}</p>
          <h1 className="truncate text-xl font-semibold text-uae-black">{activePageLabel}</h1>
          <p className="mt-1 text-sm text-uae-muted">
            {activePage === "home" ? copy.homeDescription : copy.pageDescription}
          </p>
        </div>

        <div className="app-topbar__actions">
          {languageOptions.length ? (
            <select
              className="focus-ring app-language-select"
              value={language}
              onChange={(event) => onLanguageChange?.(event.target.value)}
              aria-label={copy.languageLabel}
              title={copy.languageLabel}
            >
              {languageOptions.map((option) => (
                <option key={option.id} value={option.id} lang={option.lang} dir={option.dir}>
                  {option.nativeLabel}
                </option>
              ))}
            </select>
          ) : null}
          <div className="hidden lg:flex lg:flex-col lg:items-end">
            <span className="app-topbar__tag">{theme === "dark" ? copy.darkTheme : copy.lightTheme}</span>
          </div>
          <button
            className="focus-ring sketch-button sketch-button--secondary gap-2 px-3 py-2 text-sm"
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? copy.switchToLight : copy.switchToDark}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
            {theme === "dark" ? copy.light : copy.dark}
          </button>
          {activePage !== "home" ? (
            <button
              className="focus-ring sketch-button sketch-button--dark gap-2 px-4 py-2 text-sm"
              onClick={() => onNavigate("home")}
            >
              {copy.returnHome}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </nav>
    </header>
  );
}
