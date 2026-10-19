import { useEffect, useState } from "react";
import { supabase } from "./supabase";

// Whether new companies can still lock in the founding price. null while
// loading, so pages show list prices until the server answers.
export function useFoundingOfferOpen() {
  const [open, setOpen] = useState(null);
  useEffect(() => {
    let live = true;
    supabase.rpc("founding_offer_open").then(({ data, error }) => { if (live) setOpen(!error && data === true); });
    return () => { live = false; };
  }, []);
  return open;
}

// Mirrors the billing function: a company keeps the founding price while its
// lock lasts; one that never had it qualifies while the offer is open.
export function orgGetsFounding(org, offerOpen) {
  if (org?.founding_until) return new Date(org.founding_until) > new Date();
  return offerOpen === true;
}
