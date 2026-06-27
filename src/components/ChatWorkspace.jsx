import React from "react";
import { Send, UserRound } from "./icons.jsx";
import SectionHeader from "./SectionHeader.jsx";

export default function ChatWorkspace({
  section,
  header,
  messages,
  loading,
  error,
  input,
  onInputChange,
  onSubmit,
  inputLabel,
  inputPlaceholder,
  safetyNote,
  submitButtonClassName = "sketch-button--brand",
  chatHeightClassName = "h-[56vh] min-h-[370px]",
  assistantIcon: AssistantIcon,
  assistantIconClassName,
  userIcon: UserIcon = UserRound,
  userIconClassName = "bg-[var(--danger)] text-white",
}) {
  const HeaderIcon = header.icon;

  return (
    <section className="section-pad px-4 md:px-6">
      <div className="mx-auto max-w-4xl">
        <SectionHeader {...section} />

        <div className="app-panel overflow-hidden">
          <div className="border-b-[3px] border-[var(--border-dark)] bg-uae-panel p-4">
            <div className="flex items-center gap-3">
              <span className={`sketch-icon-wrap flex h-10 w-10 items-center justify-center ${header.iconClassName}`}>
                <HeaderIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-bold text-uae-black">{header.title}</h2>
                <p className="text-sm text-uae-muted">{header.description}</p>
              </div>
            </div>
            <p className="sketch-note mt-3 px-3 py-2 text-xs font-semibold leading-5 text-uae-muted">
              {header.context}
            </p>
          </div>

          <div className={`grid ${chatHeightClassName} content-start gap-4 overflow-y-auto p-4`}>
            {messages.map((message, index) => {
              const isUser = message.role === "user";
              const Icon = isUser ? UserIcon : AssistantIcon;
              return (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex items-start gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser ? (
                    <span className={`sketch-icon-wrap flex h-9 w-9 shrink-0 items-center justify-center ${assistantIconClassName}`}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                  ) : null}
                  <p
                    className={`sketch-bubble max-w-[82%] px-4 py-3 text-sm leading-6 ${
                      isUser
                        ? "rounded-[24px_24px_8px_24px] bg-[var(--control-dark)] text-[var(--control-dark-text)]"
                        : "rounded-[24px_24px_24px_8px] bg-uae-mist text-uae-black"
                    }`}
                  >
                    {message.text}
                  </p>
                  {isUser ? (
                    <span className={`sketch-icon-wrap flex h-9 w-9 shrink-0 items-center justify-center ${userIconClassName}`}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                  ) : null}
                </div>
              );
            })}
            {loading ? (
              <p className="sketch-note px-4 py-3 text-sm font-semibold text-uae-muted">
                Preparing response...
              </p>
            ) : null}
          </div>

          <form className="border-t-[3px] border-[var(--border-dark)] p-4" onSubmit={onSubmit}>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-uae-muted">{inputLabel}</span>
              <textarea
                className="focus-ring sketch-input min-h-24 resize-none"
                value={input}
                onChange={(event) => onInputChange(event.target.value)}
                placeholder={inputPlaceholder}
              />
            </label>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-uae-muted">{safetyNote}</p>
              <button
                className={`focus-ring sketch-button ${submitButtonClassName} gap-2 px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60`}
                disabled={loading || !input.trim()}
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                Send
              </button>
            </div>
            {error ? (
              <p className="sketch-note mt-3 px-3 py-2 text-sm font-semibold text-uae-red">
                {error}
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </section>
  );
}
