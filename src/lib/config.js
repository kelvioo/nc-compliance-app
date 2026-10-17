// Public contact address shown on the legal, pricing and billing pages.
export const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || "support@nccompliance.com.ng";

// WhatsApp number in international format, digits only (e.g. 2348012345678).
// The chat button stays hidden until this is set.
export const WHATSAPP_NUMBER = (import.meta.env.VITE_WHATSAPP_NUMBER || "").replace(/\D/g, "");
