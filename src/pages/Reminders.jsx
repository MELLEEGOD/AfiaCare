import React, { useEffect, useState } from "react";
import { CheckCircle2, Clock3, Droplets, HeartPulse } from "../components/icons.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import { useLocalStorage } from "../hooks/useLocalStorage.js";

const defaultReminders = [
  { id: "water-morning", type: "Water", label: "Morning water", time: "08:00", done: false },
  { id: "water-afternoon", type: "Water", label: "Afternoon water", time: "14:00", done: false },
  { id: "med-evening", type: "Medication", label: "Evening medication", time: "20:00", done: false },
];

export default function Reminders() {
  const [reminders, setReminders] = useLocalStorage("afiacare-reminders", defaultReminders);
  const [form, setForm] = useState({ type: "Water", label: "", time: "09:00" });
  const [notificationStatus, setNotificationStatus] = useState(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );

  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    const timers = reminders
      .filter((reminder) => !reminder.done)
      .map((reminder) => {
        const [hours, minutes] = reminder.time.split(":").map(Number);
        const reminderTime = new Date();
        reminderTime.setHours(hours, minutes, 0, 0);
        if (reminderTime < new Date()) return null;

        return window.setTimeout(() => {
          new Notification(`AfiaCare: ${reminder.label}`, {
            body:
              reminder.type === "Water"
                ? "Time for a hydration break."
                : "Medication reminder. Follow your doctor's instructions.",
          });
        }, reminderTime.getTime() - Date.now());
      })
      .filter(Boolean);

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [reminders]);

  const requestNotifications = async () => {
    if (typeof Notification === "undefined") {
      setNotificationStatus("unsupported");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationStatus(permission);
  };

  const addReminder = (event) => {
    event.preventDefault();
    const label = form.label.trim() || `${form.type} reminder`;
    setReminders((current) => [
      ...current,
      {
        id: `${Date.now()}`,
        type: form.type,
        label,
        time: form.time,
        done: false,
      },
    ]);
    setForm({ type: "Water", label: "", time: "09:00" });
  };

  const toggleReminder = (id) => {
    setReminders((current) =>
      current.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
    );
  };

  const deleteReminder = (id) => {
    setReminders((current) => current.filter((item) => item.id !== id));
  };

  const completedCount = reminders.filter((item) => item.done).length;

  return (
    <section className="section-pad px-4 md:px-6">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="Medication and water reminders"
          title="Remember hydration and medicine routines"
          arabic="تذكير الماء والدواء"
          description="Create simple local reminders for water and medication. This demo stores reminders on this device only."
        />

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="sketch-card p-6">
            <h2 className="text-lg font-bold text-uae-black">Add reminder</h2>
            <form className="mt-4 grid gap-4" onSubmit={addReminder}>
              <FieldLabel label="Type">
                <select
                  className="focus-ring sketch-select"
                  value={form.type}
                  onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
                >
                  <option>Water</option>
                  <option>Medication</option>
                </select>
              </FieldLabel>
              <FieldLabel label="Label">
                <input
                  className="focus-ring sketch-input"
                  value={form.label}
                  onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                  placeholder="Example: Vitamin D or water bottle"
                />
              </FieldLabel>
              <FieldLabel label="Time">
                <input
                  className="focus-ring sketch-input"
                  type="time"
                  value={form.time}
                  onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
                />
              </FieldLabel>
              <button className="focus-ring sketch-button sketch-button--brand gap-2 px-5 py-3 text-sm">
                <Clock3 className="h-4 w-4" aria-hidden="true" />
                Add reminder
              </button>
            </form>
            <button
              className="focus-ring sketch-button sketch-button--secondary mt-4 w-full gap-2 px-5 py-3 text-sm"
              onClick={requestNotifications}
            >
              Enable browser notifications
            </button>
            <p className="mt-3 text-sm font-semibold text-uae-muted">
              Notification status: {notificationStatus}
            </p>
          </article>

          <article className="sketch-card p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="sketch-badge">Today</p>
                <h2 className="mt-1 text-2xl font-bold text-uae-black">
                  {completedCount}/{reminders.length} completed
                </h2>
              </div>
              <span className="sketch-icon-wrap flex h-12 w-12 items-center justify-center">
                <HeartPulse className="h-6 w-6" aria-hidden="true" />
              </span>
            </div>

            <div className="mt-6 grid gap-3">
              {reminders.map((reminder) => {
                const Icon = reminder.type === "Water" ? Droplets : HeartPulse;
                return (
                  <div
                    key={reminder.id}
                    className={`sketch-card p-4 ${reminder.done ? "bg-uae-mist" : ""}`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <span className="sketch-icon-wrap flex h-10 w-10 shrink-0 items-center justify-center bg-uae-green text-white">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div>
                          <h3 className="font-bold text-uae-black">{reminder.label}</h3>
                          <p className="text-sm text-uae-muted">
                            {reminder.type} at {reminder.time}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          className="focus-ring sketch-button sketch-button--brand gap-2 px-3 py-2 text-sm"
                          onClick={() => toggleReminder(reminder.id)}
                        >
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          {reminder.done ? "Undo" : "Done"}
                        </button>
                        <button
                          className="focus-ring sketch-button sketch-button--secondary px-3 py-2 text-sm"
                          onClick={() => deleteReminder(reminder.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-5 text-sm leading-6 text-uae-muted">
              Medication reminders are personal memory aids only. Notifications work while the app is open.
              Follow your doctor's instructions and medicine label.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

function FieldLabel({ label, children }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold text-uae-muted">{label}</span>
      {children}
    </label>
  );
}

