import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import "./index.css";
import "./styles/app.css";
import App from "./App.jsx";
import { AuthProvider } from "./auth/AuthProvider";

// Anonymous, cookie-free page-view counts (Vercel Web Analytics). Only utm_*
// campaign tags are kept; invite tokens, sign-in codes and payment references
// are removed from URLs before sending.
function scrubAnalytics(event) {
  const url = new URL(event.url);
  [...url.searchParams.keys()].forEach((k) => { if (!k.startsWith("utm_")) url.searchParams.delete(k); });
  url.hash = "";
  url.pathname = url.pathname.replace(/^\/invite\/[^/]+/, "/invite/[token]");
  return { ...event, url: url.toString() };
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
    <Analytics beforeSend={scrubAnalytics} />
  </StrictMode>,
);
