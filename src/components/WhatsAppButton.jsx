import { WHATSAPP_NUMBER } from "../lib/config";

const MESSAGE = "Hello NC Compliance, I'd like to know more about NCDMB reporting for my company.";

// Floating "Chat on WhatsApp" button. Hidden until a number is configured.
export default function WhatsAppButton({ message = MESSAGE }) {
  if (!WHATSAPP_NUMBER) return null;
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  return (
    <a className="nc-whatsapp no-print" href={href} target="_blank" rel="noreferrer" aria-label="Chat with us on WhatsApp">
      <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
        <path fill="currentColor" d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2.1 7L3 29l6.4-2c2 1.1 4.3 1.7 6.6 1.7 7.2 0 13-5.7 13-12.8S23.2 3 16 3zm0 23.4c-2.1 0-4.1-.6-5.9-1.7l-.4-.2-3.8 1.2 1.2-3.7-.3-.4a10.4 10.4 0 0 1-1.6-5.6C5.2 10 10 5.3 16 5.3s10.8 4.7 10.8 10.5S22 26.4 16 26.4zm5.9-7.8c-.3-.2-1.9-1-2.2-1-.3-.1-.5-.2-.7.2l-1 1.2c-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6.3-.5v-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1.1 1-1.1 2.5s1.1 2.9 1.3 3.1c.2.2 2.2 3.3 5.3 4.6.7.3 1.3.5 1.8.6.7.2 1.4.2 1.9.1.6-.1 1.9-.8 2.1-1.5.3-.7.3-1.4.2-1.5-.1-.1-.3-.2-.6-.3z"/>
      </svg>
      <span>Chat with us</span>
    </a>
  );
}
