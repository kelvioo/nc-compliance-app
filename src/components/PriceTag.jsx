import { fmtNaira } from "../lib/compliance";
import { FOUNDING } from "../lib/plans";

const monthly = (yearly) => fmtNaira(Math.round(yearly / 12));

export function PriceTag({ plan, founding, className = "nc-price-amount" }) {
  const amount = founding ? plan.founding : plan.price;
  return (
    <div className="nc-price-tag">
      {founding && <s className="nc-price-was">{fmtNaira(plan.price)}</s>}
      <div className={className}>{fmtNaira(amount)}<small> / year</small></div>
      <div className="nc-price-month">≈ {monthly(amount)} / month, billed yearly</div>
      {founding && <div className="nc-price-founding">Founding price: {FOUNDING.percentOff}% off, locked for {FOUNDING.years} years</div>}
    </div>
  );
}
