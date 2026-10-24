import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock, Mail, MapPin, Send } from "lucide-react";
import { supabase } from "../lib/supabase";
import { LINKEDIN_URL, SUPPORT_EMAIL, YOUTUBE_URL } from "../lib/config";
import { usePageMeta } from "../lib/usePageMeta";
import { Field, inputStyle, btnPrimary } from "../components/ui";
import { PublicPage } from "./PublicPage";
import { LinkedInIcon, YouTubeIcon } from "./LegalPage";

const TOPICS = [
  ["demo", "Book a walkthrough"],
  ["pricing", "Pricing"],
  ["invoice", "Pay by invoice / procurement"],
  ["support", "Help with my account"],
  ["partnership", "Partnership"],
  ["general", "Something else"],
];

export default function ContactPage() {
  usePageMeta("Contact us · NC Compliance", "/contact");
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", topic: "demo", message: "" });
  const [status, setStatus] = useState("idle");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    const { error } = await supabase.rpc("submit_contact_message", {
      p_name: form.name, p_company: form.company, p_email: form.email,
      p_phone: form.phone, p_topic: form.topic, p_message: form.message,
    });
    setStatus(error ? "error" : "sent");
  };

  return (
    <PublicPage>
      <section className="nc-public-hero">
        <span className="nc-eyebrow">Contact</span>
        <h1>Talk to us</h1>
        <p>Questions about NCDMB reporting, a walkthrough for your team, or paying by invoice? Send us a message and we'll reply within one working day.</p>
      </section>

      <section className="nc-public-section nc-contact">
        <div className="nc-contact-info">
          {SUPPORT_EMAIL && <div><Mail size={18} /><div><strong>Email</strong><a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></div></div>}
          <div><MapPin size={18} /><div><strong>Location</strong><span>Port Harcourt, Rivers State, Nigeria</span></div></div>
          <div><Clock size={18} /><div><strong>Hours</strong><span>Monday to Friday, 8am to 6pm (WAT)</span></div></div>
          <div><LinkedInIcon size={18} /><div><strong>LinkedIn</strong><a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">NC Compliance</a></div></div>
          <div><YouTubeIcon size={18} /><div><strong>YouTube</strong><a href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer">@nccompliance</a></div></div>
          <p className="nc-public-note">Want to see the product first? Open the <Link to="/demo">live demo</Link>, or check which reports you owe with the free <Link to="/check">compliance check</Link>.</p>
        </div>

        {status === "sent" ? (
          <div className="nc-contact-done">
            <CheckCircle2 size={28} color="#4FAE7E" />
            <h2>Message sent</h2>
            <p>Thanks, {form.name.split(" ")[0] || "we've got it"}. We've emailed you a confirmation and will reply within one working day.</p>
          </div>
        ) : (
          <form className="nc-contact-form" onSubmit={submit}>
            <div className="nc-contact-row">
              <Field label="Your name"><input style={inputStyle} required maxLength={120} value={form.name} onChange={set("name")} /></Field>
              <Field label="Company"><input style={inputStyle} maxLength={160} value={form.company} onChange={set("company")} /></Field>
            </div>
            <div className="nc-contact-row">
              <Field label="Work email"><input style={inputStyle} type="email" required maxLength={200} value={form.email} onChange={set("email")} /></Field>
              <Field label="Phone (optional)"><input style={inputStyle} type="tel" maxLength={40} value={form.phone} onChange={set("phone")} /></Field>
            </div>
            <Field label="What's it about?">
              <select style={inputStyle} value={form.topic} onChange={set("topic")}>
                {TOPICS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </Field>
            <Field label="Message">
              <textarea style={{ ...inputStyle, minHeight: 130, resize: "vertical" }} required minLength={5} maxLength={4000} value={form.message} onChange={set("message")}
                placeholder="Tell us about your company and what you need help with." />
            </Field>
            {status === "error" && <p className="nc-checkout-error">Your message couldn't be sent. Please check your details{SUPPORT_EMAIL ? <>, or email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></> : ""}.</p>}
            <button type="submit" style={btnPrimary} disabled={status === "sending"}><Send size={15} /> {status === "sending" ? "Sending…" : "Send message"}</button>
            <p className="nc-public-note">We use your details only to reply to you. See our <Link to="/privacy">privacy policy</Link>.</p>
          </form>
        )}
      </section>
    </PublicPage>
  );
}
