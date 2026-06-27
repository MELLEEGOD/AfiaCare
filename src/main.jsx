import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

let reactOwnsRoot = false;

function showBootError(error) {
  if (reactOwnsRoot) return;

  const root = document.getElementById("root");
  if (!root) return;

  root.innerHTML = `
    <main style="min-height:100vh;background:#faf7ee;color:#16284d;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px;">
      <section style="max-width:760px;margin:0 auto;padding-top:48px;">
        <p style="margin:0 0 12px;color:#a63636;font-weight:800;font-size:14px;">AfiaCare startup error</p>
        <h1 style="margin:0;font-size:34px;line-height:1.1;">The app loaded, but React hit a runtime error.</h1>
        <pre style="margin-top:18px;white-space:pre-wrap;background:white;border:1px solid #d8d2c1;border-radius:8px;padding:16px;line-height:1.5;color:#16284d;">${String(error?.stack || error?.message || error)}</pre>
      </section>
    </main>
  `;
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    if (import.meta.env.DEV) {
      console.error("AfiaCare render error", error);
    }
  }

  render() {
    if (this.state.error) {
      return (
        <main className="min-h-screen bg-uae-mist px-4 py-12 text-uae-black">
          <section className="mx-auto max-w-3xl rounded-lg border border-uae-line bg-white p-6">
            <p className="text-sm font-bold text-uae-red">
              AfiaCare render error
            </p>
            <h1 className="mt-2 text-2xl font-bold">React caught a runtime error.</h1>
            <pre className="mt-4 overflow-auto whitespace-pre-wrap rounded-md bg-uae-mist p-4 text-sm text-uae-black">
              {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
            </pre>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

const handleStartupError = (event) => {
  showBootError(event.error || event.reason || event.message);
};

try {
  const root = document.getElementById("root");
  window.addEventListener("error", handleStartupError);
  window.addEventListener("unhandledrejection", handleStartupError);

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );
  reactOwnsRoot = true;
  window.removeEventListener("error", handleStartupError);
  window.removeEventListener("unhandledrejection", handleStartupError);

  window.setTimeout(() => {
    const visibleText = root?.textContent?.trim() || "";
    if (visibleText.length < 20) {
      showBootError("React mounted, but the root did not contain visible text after render.");
    }
  }, 800);
} catch (error) {
  showBootError(error);
}

