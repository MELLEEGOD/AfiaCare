import React from "react";

function IconBase({ children, className = "h-5 w-5", ...props }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ArrowRight(props) {
  return (
    <IconBase {...props}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </IconBase>
  );
}

export function Menu(props) {
  return (
    <IconBase {...props}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </IconBase>
  );
}

export function X(props) {
  return (
    <IconBase {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </IconBase>
  );
}

export function Trash2(props) {
  return (
    <IconBase {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="m19 6-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </IconBase>
  );
}

export function Home(props) {
  return (
    <IconBase {...props}>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </IconBase>
  );
}

export function HeartPulse(props) {
  return (
    <IconBase {...props}>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
      <path d="M3 13h4l2-4 3 8 2-4h7" />
    </IconBase>
  );
}

export function Bot(props) {
  return (
    <IconBase {...props}>
      <rect x="5" y="8" width="14" height="10" rx="4" />
      <path d="M12 4v4" />
      <path d="M9 13h.01" />
      <path d="M15 13h.01" />
      <path d="M9 18v2" />
      <path d="M15 18v2" />
    </IconBase>
  );
}

export function Lightbulb(props) {
  return (
    <IconBase {...props}>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 4H9c0-2 0-3-1-4Z" />
    </IconBase>
  );
}

export function SmilePlus(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 10h.01" />
      <path d="M15 10h.01" />
      <path d="M8 15c1.3 1.3 3 2 4 2s2.7-.7 4-2" />
      <path d="M19 4v4" />
      <path d="M17 6h4" />
    </IconBase>
  );
}

export function BarChart3(props) {
  return (
    <IconBase {...props}>
      <path d="M4 20V10" />
      <path d="M12 20V4" />
      <path d="M20 20v-7" />
    </IconBase>
  );
}

export function UsersRound(props) {
  return (
    <IconBase {...props}>
      <path d="M16 21v-2a4 4 0 0 0-8 0v2" />
      <circle cx="12" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M2 21v-2a4 4 0 0 1 3-3.87" />
    </IconBase>
  );
}

export function ShieldCheck(props) {
  return (
    <IconBase {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-5" />
    </IconBase>
  );
}

export function Droplets(props) {
  return (
    <IconBase {...props}>
      <path d="M7 16a4 4 0 0 0 8 0c0-3-4-8-4-8s-4 5-4 8Z" />
      <path d="M18 13a3 3 0 0 0 3-3c0-2-3-6-3-6s-3 4-3 6" />
    </IconBase>
  );
}

export function HeartHandshake(props) {
  return (
    <IconBase {...props}>
      <path d="M19 14c1.5-1.5 2-3.7.7-5.4a4.3 4.3 0 0 0-6.2-.4L12 9.6l-1.5-1.4a4.3 4.3 0 0 0-6.2.4C3 10.3 3.5 12.5 5 14l7 7 7-7Z" />
      <path d="m8 14 2-2 2 2 2-2 2 2" />
    </IconBase>
  );
}

export function Sparkles(props) {
  return (
    <IconBase {...props}>
      <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
      <path d="M5 3v4" />
      <path d="M3 5h4" />
      <path d="M19 17v4" />
      <path d="M17 19h4" />
    </IconBase>
  );
}

export function Send(props) {
  return (
    <IconBase {...props}>
      <path d="m22 2-7 20-4-9-9-4 20-7Z" />
      <path d="M22 2 11 13" />
    </IconBase>
  );
}

export function UserRound(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 22a8 8 0 0 1 16 0" />
    </IconBase>
  );
}

export function RefreshCw(props) {
  return (
    <IconBase {...props}>
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
      <path d="M3 12A9 9 0 0 1 18 5.3L21 8" />
      <path d="M21 3v5h-5" />
    </IconBase>
  );
}

export function BedDouble(props) {
  return (
    <IconBase {...props}>
      <path d="M2 20v-8a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v8" />
      <path d="M2 14h20" />
      <path d="M6 8V5h5v3" />
      <path d="M13 8V5h5v3" />
    </IconBase>
  );
}

export function Footprints(props) {
  return (
    <IconBase {...props}>
      <path d="M6 4c1.7 0 3 1.8 3 4s-1.3 4-3 4-3-1.8-3-4 1.3-4 3-4Z" />
      <path d="M18 12c1.7 0 3 1.8 3 4s-1.3 4-3 4-3-1.8-3-4 1.3-4 3-4Z" />
    </IconBase>
  );
}

export function Moon(props) {
  return (
    <IconBase {...props}>
      <path d="M21 13A8 8 0 1 1 11 3a7 7 0 0 0 10 10Z" />
    </IconBase>
  );
}

export function Salad(props) {
  return (
    <IconBase {...props}>
      <path d="M4 11h16l-2 8H6l-2-8Z" />
      <path d="M8 11a4 4 0 0 1 8 0" />
      <path d="M9 7 7 4" />
      <path d="m15 7 2-3" />
    </IconBase>
  );
}

export function Sun(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.9 4.9 1.4 1.4" />
      <path d="m17.7 17.7 1.4 1.4" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m4.9 19.1 1.4-1.4" />
      <path d="m17.7 6.3 1.4-1.4" />
    </IconBase>
  );
}

export function Waves(props) {
  return (
    <IconBase {...props}>
      <path d="M2 8c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" />
      <path d="M2 14c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" />
      <path d="M2 20c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" />
    </IconBase>
  );
}

export function BatteryLow(props) {
  return (
    <IconBase {...props}>
      <rect x="2" y="7" width="17" height="10" rx="2" />
      <path d="M22 11v2" />
      <path d="M6 11v2" />
    </IconBase>
  );
}

export function CloudRain(props) {
  return (
    <IconBase {...props}>
      <path d="M20 16.5A5 5 0 0 0 18 7h-1.3A7 7 0 1 0 5 15" />
      <path d="M8 19v2" />
      <path d="M12 17v2" />
      <path d="M16 19v2" />
    </IconBase>
  );
}

export function Flame(props) {
  return (
    <IconBase {...props}>
      <path d="M8.5 14A4.5 4.5 0 0 0 17 12c0-4-4-6-4-10-3 2-5 5-5 9 0 1 .2 2 .5 3Z" />
      <path d="M12 22a5 5 0 0 1-5-5c0-1.5.7-3 1.5-4" />
    </IconBase>
  );
}

export function Frown(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 10h.01" />
      <path d="M16 10h.01" />
      <path d="M8 17c1.3-1.3 2.7-2 4-2s2.7.7 4 2" />
    </IconBase>
  );
}

export function Smile(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 10h.01" />
      <path d="M16 10h.01" />
      <path d="M8 15c1.3 1.3 2.7 2 4 2s2.7-.7 4-2" />
    </IconBase>
  );
}

export function Clock3(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </IconBase>
  );
}

export function CheckCircle2(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 12 2 2 4-5" />
    </IconBase>
  );
}

export function Circle(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
    </IconBase>
  );
}

export function UserPlus(props) {
  return (
    <IconBase {...props}>
      <path d="M15 19a6 6 0 0 0-12 0" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6" />
      <path d="M16 11h6" />
    </IconBase>
  );
}

export function MonitorOff(props) {
  return (
    <IconBase {...props}>
      <path d="M6 18h12" />
      <path d="M12 14v4" />
      <path d="m2 2 20 20" />
      <path d="M5 5h14a2 2 0 0 1 2 2v8" />
      <path d="M3 7v8a2 2 0 0 0 2 2h10" />
    </IconBase>
  );
}

export function ExternalLink(props) {
  return (
    <IconBase {...props}>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" />
    </IconBase>
  );
}

export function Ambulance(props) {
  return (
    <IconBase {...props}>
      <path d="M10 17h4" />
      <path d="M7 17H5a3 3 0 0 1 0-6h1l2-4h6v10" />
      <path d="M14 9h4l3 4v4h-2" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
      <path d="M10 8v4" />
      <path d="M8 10h4" />
    </IconBase>
  );
}

export function Brain(props) {
  return (
    <IconBase {...props}>
      <path d="M8 6a3 3 0 0 1 6-1 3 3 0 0 1 4 4 3 3 0 0 1-1 5 3 3 0 0 1-3 5h-1V5" />
      <path d="M12 5a3 3 0 0 0-5 2 3 3 0 0 0-1 5 3 3 0 0 0 3 5h3" />
    </IconBase>
  );
}

export function Camera(props) {
  return (
    <IconBase {...props}>
      <path d="M14 5h-4l-2 3H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-3l-2-3Z" />
      <circle cx="12" cy="14" r="3" />
    </IconBase>
  );
}

export function Landmark(props) {
  return (
    <IconBase {...props}>
      <path d="M3 21h18" />
      <path d="M5 10h14" />
      <path d="M6 10v8" />
      <path d="M10 10v8" />
      <path d="M14 10v8" />
      <path d="M18 10v8" />
      <path d="m12 3 8 5H4l8-5Z" />
    </IconBase>
  );
}

export function Leaf(props) {
  return (
    <IconBase {...props}>
      <path d="M4 20c8 0 16-8 16-16C12 4 4 12 4 20Z" />
      <path d="M4 20 14 10" />
    </IconBase>
  );
}

export function MapPin(props) {
  return (
    <IconBase {...props}>
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </IconBase>
  );
}

export function Navigation(props) {
  return (
    <IconBase {...props}>
      <path d="m3 11 19-9-9 19-2-8-8-2Z" />
    </IconBase>
  );
}

export function PanelLeftClose(props) {
  return (
    <IconBase {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
      <path d="m15 9-3 3 3 3" />
    </IconBase>
  );
}

export function PanelLeftOpen(props) {
  return (
    <IconBase {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
      <path d="m12 9 3 3-3 3" />
    </IconBase>
  );
}
