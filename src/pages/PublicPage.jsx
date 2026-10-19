import { Link } from "react-router-dom";
import { Brand } from "../components/ui";
import { useAuth } from "../auth/AuthProvider";
import { LegalFooter } from "./LegalPage";

// Shared shell for the public information pages (about, security, contact,
// deadlines): the site header, the page body and the footer.
export function PublicPage({ className = "", children }) {
  const { user } = useAuth();
  return (
    <div className={`nc-landing nc-legal nc-public ${className}`}>
      <header className="nc-landing-nav">
        <Link to="/" className="nc-brand-link" aria-label="NC Compliance home"><Brand /></Link>
        <nav>
          <Link to="/demo">Live demo</Link>
          <Link to="/#pricing">Pricing</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
        </nav>
        <div className="nc-landing-nav-cta">
          {user
            ? <Link to="/app" className="nc-btn nc-btn-primary">Open workspace</Link>
            : <Link to="/signup" className="nc-btn nc-btn-primary">Start free trial</Link>}
        </div>
      </header>
      <main className="nc-public-body">{children}</main>
      <LegalFooter />
    </div>
  );
}
