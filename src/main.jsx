import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import "./styles/index.css";
import "./styles/components.css";
import "./styles/agenda.css";
import "./styles/infotooltip.css";
const demo =
  import.meta.env.VITE_STUDIO_DEMO_ONLY === "true" ||
  window.location.pathname === "/demo";
// This root entry selects an isolated demo without evaluating Appwrite configuration.
// eslint-disable-next-line react-refresh/only-export-components
const Application = lazy(() =>
  demo ? import("./studio/StudioDemo.jsx") : import("./App.jsx"),
);

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  enabled: !!import.meta.env.VITE_SENTRY_DSN,
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Suspense
      fallback={
        <div role="status" style={{ padding: 40 }}>
          Caricamento Leandro Style…
        </div>
      }
    >
      <Application />
    </Suspense>
  </StrictMode>,
);
