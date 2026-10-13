import { useState } from "react";
import { Handshake, BadgeCheck, Landmark, ChevronDown } from "lucide-react";
import { Field, inputStyle, btnPrimary } from "../../components/ui";
import { fmtNaira } from "../../lib/compliance";

export function MarketplaceView({ data, setData }) {
  const [deals, setDeals] = useState(data.dealRooms || []);
  const [form, setForm] = useState({ title: "", counterparty: "", value: "", category: "Services" });
  const save = (next) => { setDeals(next); setData({ ...data, dealRooms: next }); };
  const createRoom = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.counterparty.trim()) return;
    save([{ id: Date.now().toString(36), ...form, value: Number(form.value || 0), stage: "Due diligence", createdAt: new Date().toISOString().slice(0, 10) }, ...deals]);
    setForm({ title: "", counterparty: "", value: "", category: "Services" });
  };
  const advance = (id) => save(deals.map((deal) => deal.id === id ? { ...deal, stage: deal.stage === "Due diligence" ? "Milestone approval" : deal.stage === "Milestone approval" ? "Ready for settlement" : "Completed" } : deal));
  return <div className="nc-main-content nc-premium-page">
    <div className="nc-premium-heading"><div><span>VERIFIED B2B WORKSPACE</span><h1>Deal rooms & trade</h1><p>Open a controlled workspace with another company for RFQs, documents, approvals and payment-readiness.</p></div><Handshake color="#E6A23C" size={28} /></div>
    <div className="nc-trade-notice"><Landmark size={17} /><span><strong>Escrow-ready, not self-custodied.</strong> Connect a licensed Nigerian payment/escrow provider before holding or releasing funds.</span></div>
    <form onSubmit={createRoom} className="nc-deal-form"><Field label="Opportunity / RFQ"><input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Fabrication support RFQ" /></Field><Field label="Counterparty company"><input style={inputStyle} value={form.counterparty} onChange={(e) => setForm({ ...form, counterparty: e.target.value })} placeholder="Verified company name" /></Field><Field label="Estimated contract value (NGN)"><input style={inputStyle} type="number" min="0" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="0" /></Field><Field label="Category"><select style={inputStyle} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>Services</option><option>Materials</option><option>Marine</option><option>Fabrication</option></select></Field><button style={btnPrimary} type="submit"><Handshake size={16} /> Open deal room</button></form>
    <div className="nc-deal-list">{deals.length === 0 ? <div className="nc-empty-state"><BadgeCheck size={25} /> Create a deal room to start a controlled B2B trade workflow.</div> : deals.map((deal) => <article className="nc-deal-card" key={deal.id}><div><b>{deal.title}</b><p>{deal.counterparty} · {deal.category} · {fmtNaira(deal.value)}</p></div><div className="nc-deal-actions"><span>{deal.stage}</span>{deal.stage !== "Completed" && <button onClick={() => advance(deal.id)}>Advance <ChevronDown size={14} /></button>}</div></article>)}</div>
  </div>;
}
