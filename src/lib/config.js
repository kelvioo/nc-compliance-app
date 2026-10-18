// Public contact address shown on the legal, pricing and billing pages.
export const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || "support@nccompliance.com.ng";

// WhatsApp number in international format, digits only (e.g. 2348012345678).
// Set VITE_WHATSAPP_NUMBER to use a different number.
export const WHATSAPP_NUMBER = (import.meta.env.VITE_WHATSAPP_NUMBER || "2349152149665").replace(/\D/g, "");
