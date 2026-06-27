import {
  BarChart3,
  Bot,
  Brain,
  Camera,
  Clock3,
  Flame,
  Home,
  Leaf,
  Lightbulb,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Salad,
  ShieldCheck,
  SmilePlus,
  UsersRound,
  X,
} from "./components/icons.jsx";
import React, { useEffect, useMemo, useRef, useState } from "react";
import AITherapist from "./pages/AITherapist.jsx";
import ArabicPageTranslator from "./components/ArabicPageTranslator.jsx";
import Navbar from "./components/Navbar.jsx";
import WellnessQuiz from "./components/WellnessQuiz.jsx";
import AIWellnessAssistant from "./pages/AIWellnessAssistant.jsx";
import DailyTips from "./pages/DailyTips.jsx";
import FamilyChallenges from "./pages/FamilyChallenges.jsx";
import FoodLog from "./pages/FoodLog.jsx";
import FoodPhotoCoach from "./pages/FoodPhotoCoach.jsx";
import HomePage from "./pages/HomePage.jsx";
import MoodCheckIn from "./pages/MoodCheckIn.jsx";
import Reminders from "./pages/Reminders.jsx";
import Resources from "./pages/Resources.jsx";
import SDGDashboard from "./pages/SDGDashboard.jsx";
import YogaAssistant from "./pages/YogaAssistant.jsx";
import { WELLNESS_QUIZ_INTERVAL_MS, WELLNESS_QUIZ_VERSION } from "./constants/quiz.js";
import { readLocalStorage, useLocalStorage } from "./hooks/useLocalStorage.js";

const ExerciseAssistant = React.lazy(() => import("./pages/ExerciseAssistant.jsx"));
const Community = React.lazy(() => import("./pages/Community.jsx"));

const pages = [
  { id: "home", label: "Today", mobileLabel: "Today", group: "Overview", icon: Home },
  { id: "dashboard", label: "SDG 3 + Environment", mobileLabel: "SDG", group: "Overview", icon: BarChart3 },
  { id: "mood", label: "Mood Check-in", mobileLabel: "Mood", group: "Care", icon: SmilePlus },
  { id: "assistant", label: "Noura AI", mobileLabel: "Noura", group: "Care", icon: Bot },
  { id: "therapist", label: "Salem AI", group: "Care", icon: Brain },
  { id: "food", label: "Food Vision", group: "Guidance", icon: Camera },
  { id: "foodlog", label: "Food Log", group: "Guidance", icon: Salad },
  { id: "yoga", label: "Yoga", group: "Guidance", icon: Leaf },
  { id: "exercise", label: "Exercise", group: "Guidance", icon: Flame },
  { id: "reminders", label: "Reminders", group: "Habits", icon: Clock3 },
  { id: "tips", label: "UAE Daily Tips", group: "Habits", icon: Lightbulb },
  { id: "challenges", label: "Family Challenges", group: "Habits", icon: UsersRound },
  { id: "community", label: "Community", mobileLabel: "Community", group: "Community", icon: UsersRound },
  { id: "resources", label: "UAE Resources", mobileLabel: "Resources", group: "Safety", icon: ShieldCheck },
];

const languageOptions = [
  { id: "en", label: "English", nativeLabel: "English", lang: "en", dir: "ltr" },
  { id: "ar", label: "Arabic", nativeLabel: "العربية", lang: "ar", dir: "rtl" },
];

const chromeCopy = {
  en: {
    launchAria: "AfiaCare is loading",
    launchTagline: "Small choices. Stronger days. Together in the UAE.",
    sidebarSubtitle: "UAE wellness workspace",
    calmMode: "Calm mode active",
    collapseSidebar: "Collapse sidebar",
    expandSidebar: "Expand sidebar",
    primaryNavigation: "Primary navigation",
    quickNavigation: "Quick navigation",
    close: "Close",
    browse: "Browse",
    loadingMap: "Loading walking map...",
    loadingCommunity: "Loading community...",
    nav: {
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
    },
    groups: {
      Overview: "Overview",
      Care: "Care",
      Guidance: "Guidance",
      Habits: "Habits",
      Community: "Community",
      Safety: "Safety",
    },
    pageLabels: {},
    mobileLabels: {},
  },
  ar: {
    launchAria: "يتم تحميل عافية كير",
    launchTagline: "اختيارات صغيرة. أيام أقوى. معا في الإمارات.",
    sidebarSubtitle: "مساحة العافية في الإمارات",
    calmMode: "وضع الهدوء نشط",
    collapseSidebar: "طي الشريط الجانبي",
    expandSidebar: "توسيع الشريط الجانبي",
    primaryNavigation: "التنقل الرئيسي",
    quickNavigation: "تنقل سريع",
    close: "إغلاق",
    browse: "تصفح",
    loadingMap: "جار تحميل خريطة المشي...",
    loadingCommunity: "جار تحميل المجتمع...",
    nav: {
      eyebrow: "مساحة العمل النشطة · الإمارات",
      homeDescription: "عرض يومي كامل للعافية والحركة والطعام وروتين العائلة.",
      pageDescription: "أداة مركزة داخل مساحة عافية كير اليومية.",
      darkTheme: "الوضع الداكن",
      lightTheme: "الوضع الفاتح",
      switchToLight: "التبديل إلى الوضع الفاتح",
      switchToDark: "التبديل إلى الوضع الداكن",
      light: "فاتح",
      dark: "داكن",
      returnHome: "العودة إلى اليوم",
      languageLabel: "اللغة",
    },
    groups: {
      Overview: "نظرة عامة",
      Care: "الرعاية",
      Guidance: "الإرشاد",
      Habits: "العادات",
      Community: "المجتمع",
      Safety: "السلامة",
    },
    pageLabels: {
      home: "اليوم",
      dashboard: "الهدف 3 والبيئة",
      mood: "تسجيل المزاج",
      assistant: "نورة AI",
      therapist: "سالم AI",
      food: "رؤية الطعام",
      foodlog: "سجل الطعام",
      yoga: "اليوغا",
      exercise: "التمارين",
      reminders: "التذكيرات",
      tips: "نصائح الإمارات اليومية",
      challenges: "تحديات العائلة",
      community: "المجتمع",
      resources: "موارد الإمارات",
    },
    mobileLabels: {
      home: "اليوم",
      dashboard: "الأهداف",
      mood: "المزاج",
      assistant: "نورة",
      community: "المجتمع",
      resources: "الموارد",
    },
  },
};

function localizePages(language) {
  const copy = chromeCopy[language] || chromeCopy.en;

  return pages.map((page) => {
    const label = copy.pageLabels[page.id] || page.label;
    return {
      ...page,
      label,
      mobileLabel: copy.mobileLabels[page.id] || page.mobileLabel || label,
      groupLabel: copy.groups[page.group] || page.group,
    };
  });
}

function quizIsFresh() {
  try {
    const record = readLocalStorage("afiacare-wellness-quiz", null);
    if (!record) return false;
    if (record.version !== WELLNESS_QUIZ_VERSION) return false;
    const completedAt = new Date(record.completedAt).getTime();
    if (!completedAt) return false;
    return Date.now() - completedAt < WELLNESS_QUIZ_INTERVAL_MS;
  } catch {
    return false;
  }
}

export default function App() {
  const appShellRef = useRef(null);
  const [launching, setLaunching] = useState(true);
  const [activePage, setActivePage] = useState("home");
  const [quizComplete, setQuizComplete] = useState(() => quizIsFresh());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [theme, setTheme] = useLocalStorage("afiacare-theme", "light");
  const [storedLanguage, setStoredLanguage] = useLocalStorage("afiacare-language", "en");
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage("afiacare-sidebar-collapsed", false);
  const language = languageOptions.some((option) => option.id === storedLanguage) ? storedLanguage : "en";
  const languageConfig = languageOptions.find((option) => option.id === language) || languageOptions[0];
  const copy = chromeCopy[language] || chromeCopy.en;
  const pageContentLanguage = languageConfig.lang;
  const pageContentDirection = languageConfig.dir;

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setLaunching(false), reducedMotion ? 250 : 1800);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  }, [activePage]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = languageConfig.lang;
    document.documentElement.dir = languageConfig.dir;
  }, [languageConfig.dir, languageConfig.lang]);

  useEffect(() => {
    if (!quizComplete) return undefined;

    const root = document.documentElement;
    const shell = appShellRef.current;
    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!shell || reducedMotion.matches) return undefined;

    let pointerFrame = 0;
    let scrollFrame = 0;
    let scrollTimer = 0;
    let signalTimer = 0;

    const moveAtmosphere = (event) => {
      window.cancelAnimationFrame(pointerFrame);
      pointerFrame = window.requestAnimationFrame(() => {
        const x = event.clientX / window.innerWidth - 0.5;
        const y = event.clientY / window.innerHeight - 0.5;
        root.style.setProperty("--ambient-shift-x", `${(x * 24).toFixed(2)}px`);
        root.style.setProperty("--ambient-shift-y", `${(y * 18).toFixed(2)}px`);
        root.style.setProperty("--ambient-shift-x-soft", `${(x * 8.4).toFixed(2)}px`);
        root.style.setProperty("--ambient-shift-y-soft", `${(y * 6.3).toFixed(2)}px`);
        root.style.setProperty("--ambient-shift-x-reverse", `${(x * -13.2).toFixed(2)}px`);
        root.style.setProperty("--ambient-shift-y-reverse", `${(y * -6.3).toFixed(2)}px`);
        root.style.setProperty("--ambient-shift-x-near", `${(x * 16.8).toFixed(2)}px`);
        root.style.setProperty("--ambient-shift-y-near", `${(y * 8.1).toFixed(2)}px`);
        root.style.setProperty("--ambient-shift-x-far", `${(x * 9.1).toFixed(2)}px`);
        root.style.setProperty("--ambient-shift-y-far", `${(y * 4).toFixed(2)}px`);
        root.style.setProperty("--ambient-shift-x-hero", `${(x * -4.8).toFixed(2)}px`);
        root.style.setProperty("--ambient-shift-y-hero", `${(y * -3.6).toFixed(2)}px`);
      });
    };

    const moveAtmosphereWithScroll = () => {
      window.cancelAnimationFrame(scrollFrame);
      scrollFrame = window.requestAnimationFrame(() => {
        const travel = Math.min(window.scrollY, 1600);
        const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
        root.style.setProperty("--scroll-progress", Math.min(window.scrollY / scrollable, 1).toFixed(4));
        root.style.setProperty("--ambient-scroll-sun", `${Math.min(travel * 0.025, 30).toFixed(2)}px`);
        root.style.setProperty("--ambient-scroll-coast", `${Math.min(travel * 0.03, 42).toFixed(2)}px`);
        root.style.setProperty("--ambient-scroll-near", `${Math.max(travel * -0.055, -72).toFixed(2)}px`);
        root.style.setProperty("--ambient-scroll-far", `${Math.max(travel * -0.035, -48).toFixed(2)}px`);
        root.style.setProperty("--ambient-scroll-route", `${Math.max(travel * -0.075, -90).toFixed(2)}px`);
      });

      shell.classList.add("app-shell--scrolling");
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => shell.classList.remove("app-shell--scrolling"), 140);
    };

    const fireSignal = (event) => {
      const target = event.target instanceof Element
        ? event.target.closest("button, a, summary, input, select, textarea")
        : null;
      if (!target || target.matches(":disabled")) return;

      const bounds = target.getBoundingClientRect();
      const x = event.clientX || bounds.left + bounds.width / 2;
      const y = event.clientY || bounds.top + bounds.height / 2;
      shell.style.setProperty("--signal-x", `${x.toFixed(1)}px`);
      shell.style.setProperty("--signal-y", `${y.toFixed(1)}px`);

      shell.classList.remove("app-shell--signal");
      void shell.offsetWidth;
      shell.classList.add("app-shell--signal");
      window.clearTimeout(signalTimer);
      signalTimer = window.setTimeout(() => shell.classList.remove("app-shell--signal"), 620);
    };

    if (finePointer.matches) {
      window.addEventListener("pointermove", moveAtmosphere, { passive: true });
    }
    window.addEventListener("scroll", moveAtmosphereWithScroll, { passive: true });
    shell.addEventListener("click", fireSignal);
    moveAtmosphereWithScroll();

    return () => {
      window.cancelAnimationFrame(pointerFrame);
      window.cancelAnimationFrame(scrollFrame);
      window.clearTimeout(scrollTimer);
      window.clearTimeout(signalTimer);
      window.removeEventListener("pointermove", moveAtmosphere);
      window.removeEventListener("scroll", moveAtmosphereWithScroll);
      shell.removeEventListener("click", fireSignal);
      shell.classList.remove("app-shell--scrolling", "app-shell--signal");
      root.style.removeProperty("--ambient-shift-x");
      root.style.removeProperty("--ambient-shift-y");
      root.style.removeProperty("--ambient-shift-x-soft");
      root.style.removeProperty("--ambient-shift-y-soft");
      root.style.removeProperty("--ambient-shift-x-reverse");
      root.style.removeProperty("--ambient-shift-y-reverse");
      root.style.removeProperty("--ambient-shift-x-near");
      root.style.removeProperty("--ambient-shift-y-near");
      root.style.removeProperty("--ambient-shift-x-far");
      root.style.removeProperty("--ambient-shift-y-far");
      root.style.removeProperty("--ambient-shift-x-hero");
      root.style.removeProperty("--ambient-shift-y-hero");
      root.style.removeProperty("--ambient-scroll-sun");
      root.style.removeProperty("--ambient-scroll-coast");
      root.style.removeProperty("--ambient-scroll-near");
      root.style.removeProperty("--ambient-scroll-far");
      root.style.removeProperty("--ambient-scroll-route");
      root.style.removeProperty("--scroll-progress");
    };
  }, [quizComplete]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [activePage]);

  useEffect(() => {
    const checkQuizFreshness = () => {
      if (!quizIsFresh()) setQuizComplete(false);
    };
    const timer = window.setInterval(checkQuizFreshness, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const pageProps = { onNavigate: setActivePage };
  const localizedPages = useMemo(() => localizePages(language), [language]);
  const activePageData = localizedPages.find((page) => page.id === activePage) || localizedPages[0];
  const groupedPages = useMemo(() => {
    return localizedPages.reduce((groups, page) => {
      if (!groups[page.group]) groups[page.group] = { label: page.groupLabel, items: [] };
      groups[page.group].items.push(page);
      return groups;
    }, {});
  }, [localizedPages]);
  const mobilePrimaryPages = localizedPages.filter((page) =>
    ["home", "mood", "assistant", "community", "resources"].includes(page.id),
  );

  if (launching) {
    return (
      <main className="launch-screen" aria-label={copy.launchAria} aria-live="polite">
        <div className="launch-flag" aria-label="United Arab Emirates flag" role="img">
          <span className="launch-flag__red" />
          <span className="launch-flag__green" />
          <span className="launch-flag__white" />
          <span className="launch-flag__black" />
        </div>
        <img className="launch-logo" src="/assets/afiacare-logo.svg" alt="" aria-hidden="true" />
        <p className="launch-arabic" lang="ar" dir="rtl">عافية كل يوم</p>
        <h1>AfiaCare</h1>
        <p className="launch-tagline">{copy.launchTagline}</p>
        <span className="launch-progress" aria-hidden="true"><span /></span>
      </main>
    );
  }

  if (!quizComplete) {
    return (
      <WellnessQuiz
        onComplete={() => {
          setQuizComplete(true);
          setActivePage("home");
        }}
      />
    );
  }

  return (
    <div
      ref={appShellRef}
      className={`app-shell min-h-screen text-uae-black ${sidebarCollapsed ? "app-shell--sidebar-collapsed" : ""}`}
      lang={languageConfig.lang}
      dir={languageConfig.dir}
    >
      <div className="app-atmosphere" aria-hidden="true">
        <span className="app-atmosphere__sun" />
        <span className="app-atmosphere__coast" />
        <span className="app-atmosphere__dune app-atmosphere__dune--near" />
        <span className="app-atmosphere__dune app-atmosphere__dune--far" />
        <span className="app-atmosphere__route">
          <span className="app-atmosphere__route-stop app-atmosphere__route-stop--one" />
          <span className="app-atmosphere__route-stop app-atmosphere__route-stop--two" />
        </span>
      </div>
      <span className="app-interaction-signal" aria-hidden="true">
        <span className="app-interaction-signal__ring app-interaction-signal__ring--one" />
        <span className="app-interaction-signal__ring app-interaction-signal__ring--two" />
        <span className="app-interaction-signal__ring app-interaction-signal__ring--three" />
      </span>
      <aside className={`app-sidebar hidden xl:block ${sidebarCollapsed ? "app-sidebar--collapsed" : ""}`}>
        <div className="app-sidebar__header">
          <div className="app-sidebar__header-row">
            <button
              className="focus-ring flex w-full items-center gap-3 rounded-xl px-2 py-1 text-left transition hover:bg-white/60"
              onClick={() => setActivePage("home")}
            >
              <img className="h-11 w-11 rounded-xl ring-1 ring-white/80" src="/assets/afiacare-logo.svg" alt="" aria-hidden="true" />
              <span className="app-sidebar__brand-copy min-w-0">
                <span className="app-brand-wordmark block text-base font-semibold text-uae-black">AfiaCare</span>
                <span className="block text-sm text-uae-muted">{copy.sidebarSubtitle}</span>
              </span>
            </button>
            <button
              className="focus-ring app-sidebar__toggle"
              type="button"
              onClick={() => setSidebarCollapsed((current) => !current)}
              aria-label={sidebarCollapsed ? copy.expandSidebar : copy.collapseSidebar}
              title={sidebarCollapsed ? copy.expandSidebar : copy.collapseSidebar}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" aria-hidden="true" /> : <PanelLeftClose className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
          <div className="app-sidebar__status">
            <span className="app-status-dot" aria-hidden="true" />
            {copy.calmMode}
          </div>
        </div>

        <nav className="app-sidebar__nav" aria-label={copy.primaryNavigation}>
          {Object.entries(groupedPages).map(([group, groupData]) => (
            <div key={group} className="app-nav-group">
              <p className="app-nav-group__label">{groupData.label}</p>
              <div className="app-nav-list">
                {groupData.items.map((page) => {
                  const Icon = page.icon;
                  const active = page.id === activePage;
                  return (
                    <button
                      key={page.id}
                      className={`focus-ring app-nav-item ${active ? "app-nav-item--active" : ""}`}
                      onClick={() => setActivePage(page.id)}
                      title={sidebarCollapsed ? page.label : undefined}
                    >
                      <span className="app-nav-item__icon">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="app-nav-item__content">
                        <span className="app-nav-item__title">{page.label}</span>
                        <span className="app-nav-item__meta">{page.groupLabel}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="app-workspace">
        <div className="app-mobile-bar xl:hidden">
          <button
            className="focus-ring app-mobile-bar__brand"
            onClick={() => setActivePage("home")}
          >
            <img className="h-10 w-10 rounded-xl ring-1 ring-white/80" src="/assets/afiacare-logo.svg" alt="" aria-hidden="true" />
            <span>
              <span className="block text-sm font-semibold text-uae-black">AfiaCare</span>
              <span className="block text-xs text-uae-muted">{activePageData.groupLabel}</span>
            </span>
          </button>
          <button
            className="focus-ring app-mobile-bar__menu"
            onClick={() => setMobileNavOpen((current) => !current)}
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-navigation-sheet"
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span>{mobileNavOpen ? copy.close : copy.browse}</span>
          </button>
        </div>

        {mobileNavOpen ? (
          <section id="mobile-navigation-sheet" className="app-mobile-sheet xl:hidden">
            {Object.entries(groupedPages).map(([group, groupData]) => (
              <div key={group} className="app-mobile-sheet__group">
                <p className="app-nav-group__label">{groupData.label}</p>
                <div className="app-mobile-sheet__grid">
                  {groupData.items.map((page) => {
                    const Icon = page.icon;
                    const active = page.id === activePage;
                    return (
                      <button
                        key={page.id}
                        className={`focus-ring app-mobile-tile ${active ? "app-mobile-tile--active" : ""}`}
                        onClick={() => setActivePage(page.id)}
                      >
                        <span className="app-mobile-tile__icon">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="app-mobile-tile__title">{page.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        ) : null}

        <Navbar
          activePage={activePage}
          activePageLabel={activePageData.label}
          onNavigate={setActivePage}
          theme={theme}
          onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
          language={language}
          languageOptions={languageOptions}
          onLanguageChange={setStoredLanguage}
          copy={copy.nav}
        />

        <main className="app-content" lang={pageContentLanguage} dir={pageContentDirection}>
          <ArabicPageTranslator key={language} enabled={language === "ar"}>
            <div key={`${language}-${activePage}`} className="app-page-frame">
              {activePage === "home" ? <HomePage {...pageProps} /> : null}
              {activePage === "assistant" ? <AIWellnessAssistant /> : null}
              {activePage === "therapist" ? <AITherapist /> : null}
              {activePage === "food" ? <FoodPhotoCoach /> : null}
              {activePage === "foodlog" ? <FoodLog {...pageProps} /> : null}
              {activePage === "yoga" ? <YogaAssistant /> : null}
              {activePage === "exercise" ? (
                <React.Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-12 text-sm font-semibold text-uae-muted">{copy.loadingMap}</p>}>
                  <ExerciseAssistant />
                </React.Suspense>
              ) : null}
              {activePage === "reminders" ? <Reminders /> : null}
              {activePage === "tips" ? <DailyTips {...pageProps} /> : null}
              {activePage === "mood" ? <MoodCheckIn {...pageProps} /> : null}
              {activePage === "dashboard" ? <SDGDashboard {...pageProps} /> : null}
              {activePage === "challenges" ? <FamilyChallenges /> : null}
              {activePage === "community" ? (
                <React.Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-12 text-sm font-semibold text-uae-muted">{copy.loadingCommunity}</p>}>
                  <Community />
                </React.Suspense>
              ) : null}
              {activePage === "resources" ? <Resources /> : null}
            </div>
          </ArabicPageTranslator>
        </main>

        <nav className="app-bottom-nav xl:hidden" aria-label={copy.quickNavigation}>
          {mobilePrimaryPages.map((page) => {
            const Icon = page.icon;
            const active = page.id === activePage;
            return (
              <button
                key={page.id}
                className={`focus-ring app-bottom-nav__item ${active ? "app-bottom-nav__item--active" : ""}`}
                onClick={() => setActivePage(page.id)}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{page.mobileLabel || page.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
