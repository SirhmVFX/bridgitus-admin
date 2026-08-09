"use client";
import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import ImageUpload from "@/components/ImageUpload";
import WysiwygEditor from "@/components/WysiwygEditor";
import {
  getSiteContent, upsertSiteContent,
  getAllTestimonials, createTestimonial, updateTestimonial, deleteTestimonial,
  getAllPricingPlans, createPricingPlan, updatePricingPlan, deletePricingPlan,
  getAllFaqs, createFaq, updateFaq, deleteFaq,
  getAllClasses, createClass, updateClass, deleteClass,
  getAllServices, createService, updateService, deleteService,
  type SiteTestimonial, type SitePricingPlan, type SiteFaq, type SiteClass, type SiteService,
} from "@/lib/firestore";
import { MdSave, MdAdd, MdEdit, MdDelete, MdClose, MdCheckCircle, MdImage } from "react-icons/md";

// ── Hero ───────────────────────────────────────────────────
function HeroEditor() {
  const E = { heading: "", headingHighlight: "", subheading: "", image: "", bgPattern: "" };
  const [f, setF] = useState(E); const [sv, setSv] = useState(false); const [ok, setOk] = useState(false);
  useEffect(() => { getSiteContent("hero").then(d => { if (d) setF(d.data as typeof E) }); }, []);
  async function save(e: React.FormEvent) { e.preventDefault(); setSv(true); await upsertSiteContent("hero", f); setSv(false); setOk(true); setTimeout(() => setOk(false), 3000); }
  return (<form onSubmit={save} className="space-y-4">
    <div><label className="admin-label">Main Heading</label><input value={f.heading} onChange={e => setF({ ...f, heading: e.target.value })} className="admin-input" placeholder="Bridging Curiosity and Confidence —" /></div>
    <div><label className="admin-label">Highlighted Phrase (coloured)</label><input value={f.headingHighlight} onChange={e => setF({ ...f, headingHighlight: e.target.value })} className="admin-input" placeholder="One Student at a Time" /></div>
    <div><label className="admin-label">Subheading</label><textarea value={f.subheading} onChange={e => setF({ ...f, subheading: e.target.value })} rows={2} className="admin-input resize-none" /></div>
    <ImageUpload label="Hero Image (right)" value={f.image} onChange={v => setF({ ...f, image: v })} folder="bridgitus/site" />
    <ImageUpload label="Background Pattern (optional)" value={f.bgPattern} onChange={v => setF({ ...f, bgPattern: v })} folder="bridgitus/site" />
    <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
      <button type="submit" disabled={sv} className="btn-primary flex items-center gap-2 disabled:opacity-60"><MdSave size={15} />{sv ? "Saving…" : "Save Hero"}</button>
      {ok && <span className="text-sm text-emerald-600 flex items-center gap-1"><MdCheckCircle size={14} />Saved</span>}
    </div>
  </form>);
}

// ── Brief ──────────────────────────────────────────────────
function BriefEditor() {
  const E = { heading: "", tagline: "", body: "", quote: "", quoteAuthor: "", quoteRole: "", ctaLabel: "" };
  const [f, setF] = useState(E); const [sv, setSv] = useState(false); const [ok, setOk] = useState(false);
  useEffect(() => { getSiteContent("brief").then(d => { if (d) setF(d.data as typeof E) }); }, []);
  async function save(e: React.FormEvent) { e.preventDefault(); setSv(true); await upsertSiteContent("brief", f); setSv(false); setOk(true); setTimeout(() => setOk(false), 3000); }
  return (<form onSubmit={save} className="space-y-4">
    <div><label className="admin-label">Section Heading</label><input value={f.heading} onChange={e => setF({ ...f, heading: e.target.value })} className="admin-input" /></div>
    <div><label className="admin-label">Tagline</label><input value={f.tagline} onChange={e => setF({ ...f, tagline: e.target.value })} className="admin-input" /></div>
    <div><label className="admin-label">Body Text (rich)</label><WysiwygEditor content={f.body} onChange={v => setF({ ...f, body: v })} placeholder="About the company…" /></div>
    <div><label className="admin-label">Quote</label><textarea value={f.quote} onChange={e => setF({ ...f, quote: e.target.value })} rows={3} className="admin-input resize-none" /></div>
    <div className="grid sm:grid-cols-2 gap-4">
      <div><label className="admin-label">Quote Author</label><input value={f.quoteAuthor} onChange={e => setF({ ...f, quoteAuthor: e.target.value })} className="admin-input" /></div>
      <div><label className="admin-label">Author Role</label><input value={f.quoteRole} onChange={e => setF({ ...f, quoteRole: e.target.value })} className="admin-input" /></div>
    </div>
    <div><label className="admin-label">CTA Label</label><input value={f.ctaLabel} onChange={e => setF({ ...f, ctaLabel: e.target.value })} className="admin-input" placeholder="Bridge the gap" /></div>
    <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
      <button type="submit" disabled={sv} className="btn-primary flex items-center gap-2 disabled:opacity-60"><MdSave size={15} />{sv ? "Saving…" : "Save Brief"}</button>
      {ok && <span className="text-sm text-emerald-600 flex items-center gap-1"><MdCheckCircle size={14} />Saved</span>}
    </div>
  </form>);
}

// ── Testimonials ───────────────────────────────────────────
const T_EMPTY: Omit<SiteTestimonial, "id"> = { name: "", role: "Parent", quote: "", rating: 5, avatar: "", published: true, order: 0 };
function TestimonialsEditor() {
  const [items, setItems] = useState<SiteTestimonial[]>([]); const [modal, setModal] = useState(false); const [editing, setEditing] = useState<SiteTestimonial | null>(null);
  const [f, setF] = useState(T_EMPTY); const [sv, setSv] = useState(false);
  useEffect(() => { getAllTestimonials().then(setItems); }, []);
  function open(t?: SiteTestimonial) { setEditing(t ?? null); setF(t ? { name: t.name, role: t.role, quote: t.quote, rating: t.rating, avatar: t.avatar ?? "", published: t.published, order: t.order } : T_EMPTY); setModal(true); }
  async function save(e: React.FormEvent) { e.preventDefault(); setSv(true); if (editing?.id) await updateTestimonial(editing.id, f); else await createTestimonial(f); setItems(await getAllTestimonials()); setModal(false); setSv(false); }
  async function del(id: string) { if (!confirm("Delete?")) return; await deleteTestimonial(id); setItems(await getAllTestimonials()); }
  return (<div className="space-y-4">
    <div className="flex justify-between"><p className="text-sm text-gray-500">{items.length} testimonial{items.length !== 1 ? "s" : ""}</p><button onClick={() => open()} className="btn-primary flex items-center gap-2"><MdAdd size={16} />Add</button></div>
    <div className="space-y-2">{items.map(t => (<div key={t.id} className="flex items-center justify-between border border-gray-200 px-4 py-3 bg-white">
      <div><p className="font-medium text-gray-800">{t.name} <span className="text-gray-400 text-xs">— {t.role}</span></p><p className="text-xs text-gray-400 line-clamp-1">{t.quote}</p></div>
      <div className="flex items-center gap-2"><span className={`badge ${t.published ? "badge-green" : "badge-yellow"}`}>{t.published ? "Live" : "Draft"}</span>
        <button onClick={() => open(t)} className="p-1.5 text-gray-400 hover:text-[#00369b]"><MdEdit size={15} /></button>
        <button onClick={() => del(t.id!)} className="p-1.5 text-gray-400 hover:text-red-500"><MdDelete size={15} /></button></div>
    </div>))}</div>
    {modal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
      <div className="modal-box max-w-lg"><div className="modal-header"><h2 className="font-semibold">{editing ? "Edit" : "Add"} Testimonial</h2><button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600"><MdClose size={20} /></button></div>
        <form onSubmit={save} className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="admin-label">Name *</label><input required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} className="admin-input" /></div>
            <div><label className="admin-label">Role</label><select value={f.role} onChange={e => setF({ ...f, role: e.target.value })} className="admin-input">{["Parent", "Student", "Guardian"].map(r => <option key={r}>{r}</option>)}</select></div>
          </div>
          <div><label className="admin-label">Quote *</label><textarea required value={f.quote} onChange={e => setF({ ...f, quote: e.target.value })} rows={3} className="admin-input resize-none" /></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="admin-label">Rating (1–5)</label><input type="number" min={1} max={5} value={f.rating} onChange={e => setF({ ...f, rating: Number(e.target.value) })} className="admin-input" /></div>
            <div><label className="admin-label">Order</label><input type="number" value={f.order} onChange={e => setF({ ...f, order: Number(e.target.value) })} className="admin-input" /></div>
          </div>
          <ImageUpload label="Avatar (optional)" value={f.avatar ?? ""} onChange={v => setF({ ...f, avatar: v })} folder="bridgitus/testimonials" />
          <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={f.published} onChange={e => setF({ ...f, published: e.target.checked })} />Published</label>
          <div className="flex gap-3 pt-2 border-t border-gray-100"><button type="submit" disabled={sv} className="btn-primary disabled:opacity-60">{sv ? "Saving…" : editing ? "Save" : "Create"}</button><button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button></div>
        </form></div></div>)}
  </div>);
}

// ── Pricing Plans ──────────────────────────────────────────
const P_EMPTY: Omit<SitePricingPlan, "id"> = { title: "", tagline: "", price: "", per: "", badge: "", description: "", icon: "", ctaLabel: "Book your lesson now", ctaHref: "/register", perks: [{ desc: "" }, { desc: "" }, { desc: "" }], freePerks: ["", "", ""], features: [{ icon: "🎯", title: "", desc: "" }], bottomNote1: "", bottomNote2: "Cancel or pause anytime", highlighted: false, order: 0, published: true, amountKobo: 0 };
function PricingEditor() {
  const [items, setItems] = useState<SitePricingPlan[]>([]); const [modal, setModal] = useState(false); const [editing, setEditing] = useState<SitePricingPlan | null>(null);
  const [f, setF] = useState(P_EMPTY); const [sv, setSv] = useState(false);
  useEffect(() => { getAllPricingPlans().then(setItems); }, []);
  function open(p?: SitePricingPlan) {
    setEditing(p ?? null);
    setF(p ? { title: p.title, tagline: p.tagline, price: p.price, per: p.per, badge: p.badge ?? "", description: p.description ?? "", icon: p.icon ?? "", ctaLabel: p.ctaLabel ?? "Book your lesson now", ctaHref: p.ctaHref ?? "/register", perks: p.perks, freePerks: p.freePerks, features: p.features ?? [], bottomNote1: p.bottomNote1 ?? "", bottomNote2: p.bottomNote2 ?? "", highlighted: p.highlighted, order: p.order, published: p.published, amountKobo: p.amountKobo ?? 0 } : P_EMPTY);
    setModal(true);
  }
  async function save(e: React.FormEvent) { e.preventDefault(); setSv(true); if (editing?.id) await updatePricingPlan(editing.id, f); else await createPricingPlan(f); setItems(await getAllPricingPlans()); setModal(false); setSv(false); }
  async function del(id: string) { if (!confirm("Delete?")) return; await deletePricingPlan(id); setItems(await getAllPricingPlans()); }

  function updateFeature(i: number, patch: Partial<{ icon: string; title: string; desc: string }>) {
    const features = [...(f.features ?? [])];
    features[i] = { ...features[i], ...patch };
    setF({ ...f, features });
  }

  return (<div className="space-y-4">
    <div className="flex justify-between"><p className="text-sm text-gray-500">{items.length} plan{items.length !== 1 ? "s" : ""}</p><button onClick={() => open()} className="btn-primary flex items-center gap-2"><MdAdd size={16} />Add Plan</button></div>
    <div className="space-y-2">{items.map(p => (<div key={p.id} className="flex items-center justify-between border border-gray-200 px-4 py-3 bg-white">
      <div><p className="font-medium text-gray-800">{p.icon} {p.title} <span className="text-gray-400 text-sm">· {p.price}</span></p><p className="text-xs text-gray-400">{p.tagline} {p.badge ? `· ${p.badge}` : ""}</p></div>
      <div className="flex items-center gap-2"><span className={`badge ${p.published ? "badge-green" : "badge-yellow"}`}>{p.published ? "Live" : "Draft"}</span>
        <button onClick={() => open(p)} className="p-1.5 text-gray-400 hover:text-[#00369b]"><MdEdit size={15} /></button>
        <button onClick={() => del(p.id!)} className="p-1.5 text-gray-400 hover:text-red-500"><MdDelete size={15} /></button></div>
    </div>))}</div>
    {modal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
      <div className="modal-box max-w-2xl"><div className="modal-header"><h2 className="font-semibold">{editing ? "Edit" : "Add"} Plan</h2><button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600"><MdClose size={20} /></button></div>
        <form onSubmit={save} className="p-6 space-y-5 overflow-y-auto" style={{ maxHeight: "80vh" }}>

          {/* Basic info */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 border-b border-gray-100 pb-2">Plan Info</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className="admin-label">Title *</label><input required value={f.title} onChange={e => setF({ ...f, title: e.target.value })} className="admin-input" /></div>
              <div><label className="admin-label">Tagline (shown in brackets)</label><input value={f.tagline} onChange={e => setF({ ...f, tagline: e.target.value })} className="admin-input" placeholder="e.g. Best Value for Families" /></div>
              <div><label className="admin-label">Icon (emoji)</label><input value={f.icon ?? ""} onChange={e => setF({ ...f, icon: e.target.value })} className="admin-input" placeholder="👨‍👩‍👧‍👦" /></div>
              <div><label className="admin-label">Badge text</label><input value={f.badge ?? ""} onChange={e => setF({ ...f, badge: e.target.value })} className="admin-input" placeholder="e.g. 1 to 4 Children" /></div>
              <div><label className="admin-label">Display Price *</label><input required value={f.price} onChange={e => setF({ ...f, price: e.target.value })} className="admin-input" placeholder="$49.99" /></div>
              <div><label className="admin-label">Per label</label><input value={f.per} onChange={e => setF({ ...f, per: e.target.value })} className="admin-input" placeholder="/week" /></div>
            </div>
            <div className="mt-3"><label className="admin-label">Description (shown under badge)</label><textarea value={f.description ?? ""} onChange={e => setF({ ...f, description: e.target.value })} rows={2} className="admin-input resize-none" placeholder="Short plan description…" /></div>
          </div>

          {/* CTA */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 border-b border-gray-100 pb-2">Button</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className="admin-label">Button Label</label><input value={f.ctaLabel ?? ""} onChange={e => setF({ ...f, ctaLabel: e.target.value })} className="admin-input" placeholder="Book your family plan now" /></div>
              <div><label className="admin-label">Button Link</label><input value={f.ctaHref ?? ""} onChange={e => setF({ ...f, ctaHref: e.target.value })} className="admin-input" placeholder="/register" /></div>
            </div>
          </div>

          {/* Payment */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 border-b border-gray-100 pb-2">Payment (Paystack)</p>
            <div>
              <label className="admin-label">Amount in kobo (smallest currency unit)</label>
              <input type="number" min={0} value={f.amountKobo ?? 0} onChange={e => setF({ ...f, amountKobo: Number(e.target.value) })} className="admin-input" placeholder="e.g. 5000000 for ₦50,000" />
              <p className="text-xs text-gray-400 mt-1">NGN: ₦50,000 = 5000000 kobo. Used when student pays for this plan via Paystack.</p>
            </div>
          </div>

          {/* Features grid (What's Included) */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 border-b border-gray-100 pb-2">What&apos;s Included (feature grid)</p>
            <div className="space-y-2">
              {(f.features ?? []).map((feat, i) => (
                <div key={i} className="grid grid-cols-6 gap-2 items-center">
                  <input value={feat.icon} onChange={e => updateFeature(i, { icon: e.target.value })} className="admin-input col-span-1 text-center text-xl" placeholder="🎯" />
                  <input value={feat.title} onChange={e => updateFeature(i, { title: e.target.value })} className="admin-input col-span-2" placeholder="Title" />
                  <input value={feat.desc} onChange={e => updateFeature(i, { desc: e.target.value })} className="admin-input col-span-2" placeholder="Description" />
                  <button type="button" onClick={() => setF({ ...f, features: (f.features ?? []).filter((_, j) => j !== i) })} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                </div>
              ))}
              <button type="button" onClick={() => setF({ ...f, features: [...(f.features ?? []), { icon: "✨", title: "", desc: "" }] })} className="text-xs text-[#00369b] hover:underline">+ Add feature</button>
            </div>
          </div>

          {/* Classic perks */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 border-b border-gray-100 pb-2">Key Perks (checklist)</p>
            {f.perks.map((pk, i) => (<input key={i} value={pk.desc} onChange={e => { const p = [...f.perks]; p[i] = { desc: e.target.value }; setF({ ...f, perks: p }); }} className="admin-input mb-2" placeholder={`Perk ${i + 1}`} />))}
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 border-b border-gray-100 pb-2">Free Perks (included benefits)</p>
            {f.freePerks.map((fp, i) => (<input key={i} value={fp} onChange={e => { const p = [...f.freePerks]; p[i] = e.target.value; setF({ ...f, freePerks: p }); }} className="admin-input mb-2" placeholder={`Free perk ${i + 1}`} />))}
          </div>

          {/* Bottom notes */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 border-b border-gray-100 pb-2">Bottom Notes</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className="admin-label">Note 1 (left)</label><input value={f.bottomNote1 ?? ""} onChange={e => setF({ ...f, bottomNote1: e.target.value })} className="admin-input" placeholder="More learning. More progress." /></div>
              <div><label className="admin-label">Note 2 (right)</label><input value={f.bottomNote2 ?? ""} onChange={e => setF({ ...f, bottomNote2: e.target.value })} className="admin-input" placeholder="Cancel or pause anytime" /></div>
            </div>
          </div>

          {/* Flags */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={f.highlighted} onChange={e => setF({ ...f, highlighted: e.target.checked })} />Highlighted (Most Popular)</label>
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={f.published} onChange={e => setF({ ...f, published: e.target.checked })} />Published</label>
            <div><label className="admin-label">Order</label><input type="number" min={0} value={f.order} onChange={e => setF({ ...f, order: Number(e.target.value) })} className="admin-input w-20" /></div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100"><button type="submit" disabled={sv} className="btn-primary disabled:opacity-60">{sv ? "Saving…" : editing ? "Save" : "Create"}</button><button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button></div>
        </form></div></div>)}
  </div>);
}

// ── FAQs ───────────────────────────────────────────────────
const F_EMPTY: Omit<SiteFaq, "id"> = { question: "", answer: "", order: 0, published: true };
function FaqsEditor() {
  const [items, setItems] = useState<SiteFaq[]>([]); const [modal, setModal] = useState(false); const [editing, setEditing] = useState<SiteFaq | null>(null);
  const [f, setF] = useState(F_EMPTY); const [sv, setSv] = useState(false);
  useEffect(() => { getAllFaqs().then(setItems); }, []);
  function open(faq?: SiteFaq) { setEditing(faq ?? null); setF(faq ? { question: faq.question, answer: faq.answer, order: faq.order, published: faq.published } : F_EMPTY); setModal(true); }
  async function save(e: React.FormEvent) { e.preventDefault(); setSv(true); if (editing?.id) await updateFaq(editing.id, f); else await createFaq(f); setItems(await getAllFaqs()); setModal(false); setSv(false); }
  async function del(id: string) { if (!confirm("Delete?")) return; await deleteFaq(id); setItems(await getAllFaqs()); }
  return (<div className="space-y-4">
    <div className="flex justify-between"><p className="text-sm text-gray-500">{items.length} FAQ{items.length !== 1 ? "s" : ""}</p><button onClick={() => open()} className="btn-primary flex items-center gap-2"><MdAdd size={16} />Add FAQ</button></div>
    <div className="space-y-2">{items.map(faq => (<div key={faq.id} className="flex items-start justify-between border border-gray-200 px-4 py-3 bg-white">
      <div className="flex-1 mr-4"><p className="font-medium text-gray-800 text-sm">{faq.question}</p><p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{faq.answer}</p></div>
      <div className="flex items-center gap-2 shrink-0"><span className={`badge ${faq.published ? "badge-green" : "badge-yellow"}`}>{faq.published ? "Live" : "Draft"}</span>
        <button onClick={() => open(faq)} className="p-1.5 text-gray-400 hover:text-[#00369b]"><MdEdit size={15} /></button>
        <button onClick={() => del(faq.id!)} className="p-1.5 text-gray-400 hover:text-red-500"><MdDelete size={15} /></button></div>
    </div>))}</div>
    {modal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
      <div className="modal-box max-w-lg"><div className="modal-header"><h2 className="font-semibold">{editing ? "Edit" : "Add"} FAQ</h2><button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600"><MdClose size={20} /></button></div>
        <form onSubmit={save} className="p-6 space-y-4">
          <div><label className="admin-label">Question *</label><input required value={f.question} onChange={e => setF({ ...f, question: e.target.value })} className="admin-input" /></div>
          <div><label className="admin-label">Answer *</label><textarea required value={f.answer} onChange={e => setF({ ...f, answer: e.target.value })} rows={4} className="admin-input resize-none" /></div>
          <div><label className="admin-label">Order</label><input type="number" value={f.order} onChange={e => setF({ ...f, order: Number(e.target.value) })} className="admin-input" /></div>
          <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={f.published} onChange={e => setF({ ...f, published: e.target.checked })} />Published</label>
          <div className="flex gap-3 pt-2 border-t border-gray-100"><button type="submit" disabled={sv} className="btn-primary disabled:opacity-60">{sv ? "Saving…" : editing ? "Save" : "Create"}</button><button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button></div>
        </form></div></div>)}
  </div>);
}

// ── Classes ────────────────────────────────────────────────
const CL_EMPTY: Omit<SiteClass, "id"> = { title: "", grades: "", description: "", subjects: [], type: "one-on-one", image: "", published: true, order: 0 };
function ClassesEditor() {
  const [items, setItems] = useState<SiteClass[]>([]); const [modal, setModal] = useState(false); const [editing, setEditing] = useState<SiteClass | null>(null);
  const [f, setF] = useState(CL_EMPTY); const [subjectsRaw, setSubjectsRaw] = useState(""); const [sv, setSv] = useState(false);
  useEffect(() => { getAllClasses().then(setItems); }, []);
  function open(c?: SiteClass) { setEditing(c ?? null); setF(c ? { title: c.title, grades: c.grades, description: c.description, subjects: c.subjects, type: c.type, image: c.image ?? "", published: c.published, order: c.order } : CL_EMPTY); setSubjectsRaw(c ? c.subjects.join(", ") : ""); setModal(true); }
  async function save(e: React.FormEvent) { e.preventDefault(); setSv(true); const data = { ...f, subjects: subjectsRaw.split(",").map(s => s.trim()).filter(Boolean) }; if (editing?.id) await updateClass(editing.id, data); else await createClass(data); setItems(await getAllClasses()); setModal(false); setSv(false); }
  async function del(id: string) { if (!confirm("Delete?")) return; await deleteClass(id); setItems(await getAllClasses()); }
  return (<div className="space-y-4">
    <div className="flex justify-between"><p className="text-sm text-gray-500">{items.length} class{items.length !== 1 ? "es" : ""}</p><button onClick={() => open()} className="btn-primary flex items-center gap-2"><MdAdd size={16} />Add Class</button></div>
    <div className="space-y-2">{items.map(c => (<div key={c.id} className="flex items-center justify-between border border-gray-200 px-4 py-3 bg-white">
      <div><p className="font-medium text-gray-800">{c.title} <span className="text-gray-400 text-xs">· {c.grades}</span></p><p className="text-xs text-gray-400">{c.type} · {c.subjects.slice(0, 3).join(", ")}</p></div>
      <div className="flex items-center gap-2"><span className={`badge ${c.published ? "badge-green" : "badge-yellow"}`}>{c.published ? "Live" : "Draft"}</span>
        <button onClick={() => open(c)} className="p-1.5 text-gray-400 hover:text-[#00369b]"><MdEdit size={15} /></button>
        <button onClick={() => del(c.id!)} className="p-1.5 text-gray-400 hover:text-red-500"><MdDelete size={15} /></button></div>
    </div>))}</div>
    {modal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
      <div className="modal-box max-w-lg"><div className="modal-header"><h2 className="font-semibold">{editing ? "Edit" : "Add"} Class</h2><button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600"><MdClose size={20} /></button></div>
        <form onSubmit={save} className="p-6 space-y-4">
          <div><label className="admin-label">Title *</label><input required value={f.title} onChange={e => setF({ ...f, title: e.target.value })} className="admin-input" /></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="admin-label">Grades</label><input value={f.grades} onChange={e => setF({ ...f, grades: e.target.value })} className="admin-input" placeholder="K–6" /></div>
            <div><label className="admin-label">Type</label><select value={f.type} onChange={e => setF({ ...f, type: e.target.value as SiteClass["type"] })} className="admin-input"><option value="one-on-one">One-on-One</option><option value="group">Group</option><option value="online">Online</option></select></div>
          </div>
          <div><label className="admin-label">Description</label><textarea value={f.description} onChange={e => setF({ ...f, description: e.target.value })} rows={3} className="admin-input resize-none" /></div>
          <div><label className="admin-label">Subjects (comma-separated)</label><input value={subjectsRaw} onChange={e => setSubjectsRaw(e.target.value)} className="admin-input" placeholder="Maths, English, Science" /></div>
          <ImageUpload label="Class Image" value={f.image ?? ""} onChange={v => setF({ ...f, image: v })} folder="bridgitus/classes" />
          <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={f.published} onChange={e => setF({ ...f, published: e.target.checked })} />Published</label>
          <div className="flex gap-3 pt-2 border-t border-gray-100"><button type="submit" disabled={sv} className="btn-primary disabled:opacity-60">{sv ? "Saving…" : editing ? "Save" : "Create"}</button><button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button></div>
        </form></div></div>)}
  </div>);
}

type Section = "hero" | "brief" | "testimonials" | "pricing" | "faqs" | "classes";
const SECTIONS: { key: Section; label: string }[] = [
  { key: "hero", label: "Hero Section" }, { key: "brief", label: "About Brief" },
  { key: "testimonials", label: "Testimonials" }, { key: "pricing", label: "Pricing Plans" },
  { key: "faqs", label: "FAQs" }, { key: "classes", label: "Classes" },
];
export default function ContentPage() {
  const [section, setSection] = useState<Section>("hero");
  return (<AdminLayout>
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-3"><MdImage size={22} className="text-[#00369b]" />
        <div><h1 className="text-xl font-bold text-gray-900">Hero, Brief & Content</h1><p className="text-gray-500 text-sm">Edit hero, testimonials, pricing, FAQs and classes</p></div></div>
      <div className="flex flex-wrap gap-1 bg-gray-100 p-1">
        {SECTIONS.map(s => (<button key={s.key} onClick={() => setSection(s.key)} className={`px-3 py-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${section === s.key ? "bg-white text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>{s.label}</button>))}
      </div>
      <div className="admin-card">
        {section === "hero" && <HeroEditor />}{section === "brief" && <BriefEditor />}
        {section === "testimonials" && <TestimonialsEditor />}{section === "pricing" && <PricingEditor />}
        {section === "faqs" && <FaqsEditor />}{section === "classes" && <ClassesEditor />}
      </div>
    </div>
  </AdminLayout>);
}
