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
  getAllPartners, createPartner, updatePartner, deletePartner,
  type SiteTestimonial, type SitePricingPlan, type SiteFaq,
  type SiteClass, type SiteService, type SitePartner,
} from "@/lib/firestore";
import { MdSave, MdAdd, MdEdit, MdDelete, MdClose, MdCheckCircle, MdWeb } from "react-icons/md";

type Tab = "hero" | "brief" | "header_info" | "contact_info" | "about_page" | "cta" | "classes" | "services" | "partners" | "testimonials" | "pricing" | "faqs";

const TABS: { key: Tab; label: string }[] = [
  { key: "hero", label: "Hero" },
  { key: "brief", label: "About Brief" },
  { key: "header_info", label: "Header Info" },
  { key: "contact_info", label: "Contact Info" },
  { key: "about_page", label: "About Page" },
  { key: "cta", label: "CTA Banner" },
  { key: "classes", label: "Classes" },
  { key: "services", label: "Services" },
  { key: "partners", label: "Partners" },
  { key: "testimonials", label: "Testimonials" },
  { key: "pricing", label: "Pricing" },
  { key: "faqs", label: "FAQs" },
];

// ── Hero Section ──────────────────────────────────────────
function HeroEditor() {
  const [form, setForm] = useState({ heading: "", headingHighlight: "", subheading: "", image: "", bgPattern: "" });
  const [saving, setSaving] = useState(false); const [ok, setOk] = useState(false);
  useEffect(() => { getSiteContent("hero").then((d) => { if (d) setForm(d.data as typeof form); }); }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    await upsertSiteContent("hero", form); setSaving(false); setOk(true); setTimeout(() => setOk(false), 3000);
  }
  return (
    <form onSubmit={save} className="space-y-4">
      <div><label className="admin-label">Main Heading</label>
        <input value={form.heading} onChange={(e) => setForm({ ...form, heading: e.target.value })} className="admin-input" placeholder="Bridging Curiosity and Confidence" /></div>
      <div><label className="admin-label">Highlighted Phrase (shown in colour)</label>
        <input value={form.headingHighlight} onChange={(e) => setForm({ ...form, headingHighlight: e.target.value })} className="admin-input" placeholder="One Student at a Time" /></div>
      <div><label className="admin-label">Subheading</label>
        <textarea value={form.subheading} onChange={(e) => setForm({ ...form, subheading: e.target.value })} rows={2} className="admin-input resize-none" /></div>
      <ImageUpload label="Hero Image (right side)" value={form.image} onChange={(v) => setForm({ ...form, image: v })} folder="bridgitus/site" />
      <ImageUpload label="Background Pattern (optional, low opacity)" value={form.bgPattern} onChange={(v) => setForm({ ...form, bgPattern: v })} folder="bridgitus/site" />
      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60"><MdSave size={15} />{saving ? "Saving…" : "Save Hero"}</button>
        {ok && <span className="text-sm text-emerald-600 flex items-center gap-1"><MdCheckCircle size={14} />Saved</span>}
      </div>
    </form>
  );
}

// ── Brief / About Section ─────────────────────────────────
function BriefEditor() {
  const EMPTY = { heading: "", tagline: "", body: "", quote: "", quoteAuthor: "", quoteRole: "", ctaLabel: "" };
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false); const [ok, setOk] = useState(false);
  useEffect(() => { getSiteContent("brief").then((d) => { if (d) setForm(d.data as typeof form); }); }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    await upsertSiteContent("brief", form); setSaving(false); setOk(true); setTimeout(() => setOk(false), 3000);
  }
  return (
    <form onSubmit={save} className="space-y-4">
      <div><label className="admin-label">Section Heading</label>
        <input value={form.heading} onChange={(e) => setForm({ ...form, heading: e.target.value })} className="admin-input" /></div>
      <div><label className="admin-label">Tagline</label>
        <input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className="admin-input" /></div>
      <div><label className="admin-label">Body Text (rich)</label>
        <WysiwygEditor content={form.body} onChange={(v) => setForm({ ...form, body: v })} placeholder="About the company…" /></div>
      <div><label className="admin-label">Quote</label>
        <textarea value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} rows={3} className="admin-input resize-none" /></div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div><label className="admin-label">Quote Author</label>
          <input value={form.quoteAuthor} onChange={(e) => setForm({ ...form, quoteAuthor: e.target.value })} className="admin-input" /></div>
        <div><label className="admin-label">Author Role / Title</label>
          <input value={form.quoteRole} onChange={(e) => setForm({ ...form, quoteRole: e.target.value })} className="admin-input" /></div>
      </div>
      <div><label className="admin-label">CTA Button Label</label>
        <input value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} className="admin-input" placeholder="Bridge the gap" /></div>
      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60"><MdSave size={15} />{saving ? "Saving…" : "Save Brief"}</button>
        {ok && <span className="text-sm text-emerald-600 flex items-center gap-1"><MdCheckCircle size={14} />Saved</span>}
      </div>
    </form>
  );
}

// ── Contact Info ──────────────────────────────────────────
function ContactInfoEditor() {
  const EMPTY = { email: "", phone: "", altPhone: "", facebook: "", instagram: "", linkedin: "", abn: "" };
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false); const [ok, setOk] = useState(false);
  useEffect(() => { getSiteContent("contact_info").then((d) => { if (d) setForm(d.data as typeof form); }); }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    await upsertSiteContent("contact_info", form); setSaving(false); setOk(true); setTimeout(() => setOk(false), 3000);
  }
  const fields: Array<{ key: keyof typeof EMPTY; label: string; placeholder: string }> = [
    { key: "email", label: "Email Address", placeholder: "info@bridgitus.com" },
    { key: "phone", label: "Primary Phone", placeholder: "+61 433 600 592" },
    { key: "altPhone", label: "Alternate Phone", placeholder: "" },
    { key: "abn", label: "ABN", placeholder: "16146552112" },
    { key: "facebook", label: "Facebook URL", placeholder: "https://facebook.com/..." },
    { key: "instagram", label: "Instagram URL", placeholder: "https://instagram.com/bridgitus" },
    { key: "linkedin", label: "LinkedIn URL", placeholder: "https://linkedin.com/..." },
  ];
  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        {fields.map(({ key, label, placeholder }) => (
          <div key={key}><label className="admin-label">{label}</label>
            <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="admin-input" placeholder={placeholder} /></div>
        ))}
      </div>
      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60"><MdSave size={15} />{saving ? "Saving…" : "Save Contact Info"}</button>
        {ok && <span className="text-sm text-emerald-600 flex items-center gap-1"><MdCheckCircle size={14} />Saved</span>}
      </div>
    </form>
  );
}

// ── Testimonials ──────────────────────────────────────────
const T_EMPTY: Omit<SiteTestimonial, "id"> = { name: "", role: "Parent", quote: "", rating: 5, avatar: "", published: true, order: 0 };
function TestimonialsEditor() {
  const [items, setItems] = useState<SiteTestimonial[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<SiteTestimonial | null>(null);
  const [form, setForm] = useState(T_EMPTY);
  const [saving, setSaving] = useState(false);
  useEffect(() => { getAllTestimonials().then(setItems); }, []);
  function open(t?: SiteTestimonial) {
    setEditing(t ?? null);
    setForm(t ? { name: t.name, role: t.role, quote: t.quote, rating: t.rating, avatar: t.avatar ?? "", published: t.published, order: t.order } : T_EMPTY);
    setModal(true);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    if (editing?.id) await updateTestimonial(editing.id, form); else await createTestimonial(form);
    const fresh = await getAllTestimonials(); setItems(fresh); setModal(false); setSaving(false);
  }
  async function del(id: string) { if (!confirm("Delete?")) return; await deleteTestimonial(id); setItems(await getAllTestimonials()); }
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><p className="text-sm text-gray-500">{items.length} testimonial{items.length !== 1 ? "s" : ""}</p>
        <button onClick={() => open()} className="btn-primary flex items-center gap-2"><MdAdd size={16} />Add</button></div>
      <div className="space-y-2">
        {items.map((t) => (
          <div key={t.id} className="flex items-center justify-between border border-gray-200 px-4 py-3 bg-white">
            <div><p className="font-medium text-gray-800">{t.name} <span className="text-gray-400 text-xs">— {t.role}</span></p>
              <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{t.quote}</p></div>
            <div className="flex items-center gap-2">
              <span className={`badge ${t.published ? "badge-green" : "badge-yellow"}`}>{t.published ? "Live" : "Draft"}</span>
              <button onClick={() => open(t)} className="p-1.5 text-gray-400 hover:text-[#00369b]"><MdEdit size={15} /></button>
              <button onClick={() => del(t.id!)} className="p-1.5 text-gray-400 hover:text-red-500"><MdDelete size={15} /></button>
            </div>
          </div>
        ))}
      </div>
      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box max-w-lg">
            <div className="modal-header"><h2 className="font-semibold">{editing ? "Edit" : "Add"} Testimonial</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600"><MdClose size={20} /></button></div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="admin-label">Name *</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="admin-input" /></div>
                <div><label className="admin-label">Role</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="admin-input">
                    {["Parent", "Student", "Guardian"].map(r => <option key={r}>{r}</option>)}</select></div>
              </div>
              <div><label className="admin-label">Quote *</label><textarea required value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} rows={3} className="admin-input resize-none" /></div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="admin-label">Rating (1–5)</label><input type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} className="admin-input" /></div>
                <div><label className="admin-label">Order</label><input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} className="admin-input" /></div>
              </div>
              <ImageUpload label="Avatar (optional)" value={form.avatar ?? ""} onChange={(v) => setForm({ ...form, avatar: v })} folder="bridgitus/testimonials" />
              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setForm({ ...form, published: !form.published })} className={`w-10 h-6 relative transition-colors ${form.published ? "bg-[#00369b]" : "bg-gray-300"}`}>
                  <div className={`w-5 h-5 bg-white absolute top-0.5 transition-all ${form.published ? "left-4" : "left-0.5"}`} /></div>
                <span className="text-sm font-medium text-gray-700">{form.published ? "Published" : "Draft"}</span></label>
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">{saving ? "Saving…" : editing ? "Save" : "Create"}</button>
                <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button></div>
            </form></div></div>)}
    </div>
  );
}

// ── Pricing Plans ─────────────────────────────────────────
const P_EMPTY: Omit<SitePricingPlan, "id"> = { title: "", tagline: "", price: "", per: "", perks: [{ desc: "" }, { desc: "" }, { desc: "" }], freePerks: ["", "", ""], highlighted: false, order: 0, published: true };
function PricingEditor() {
  const [items, setItems] = useState<SitePricingPlan[]>([]);
  const [modal, setModal] = useState(false); const [editing, setEditing] = useState<SitePricingPlan | null>(null);
  const [form, setForm] = useState(P_EMPTY); const [saving, setSaving] = useState(false);
  useEffect(() => { getAllPricingPlans().then(setItems); }, []);
  function open(p?: SitePricingPlan) {
    setEditing(p ?? null);
    setForm(p ? { title: p.title, tagline: p.tagline, price: p.price, per: p.per, perks: p.perks, freePerks: p.freePerks, highlighted: p.highlighted, order: p.order, published: p.published } : P_EMPTY);
    setModal(true);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    if (editing?.id) await updatePricingPlan(editing.id, form); else await createPricingPlan(form);
    setItems(await getAllPricingPlans()); setModal(false); setSaving(false);
  }
  async function del(id: string) { if (!confirm("Delete?")) return; await deletePricingPlan(id); setItems(await getAllPricingPlans()); }
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><p className="text-sm text-gray-500">{items.length} plan{items.length !== 1 ? "s" : ""}</p>
        <button onClick={() => open()} className="btn-primary flex items-center gap-2"><MdAdd size={16} />Add Plan</button></div>
      <div className="space-y-2">
        {items.map((p) => (
          <div key={p.id} className="flex items-center justify-between border border-gray-200 px-4 py-3 bg-white">
            <div><p className="font-medium text-gray-800">{p.title} <span className="text-gray-400 text-sm">· {p.price}</span></p>
              <p className="text-xs text-gray-400">{p.tagline}</p></div>
            <div className="flex items-center gap-2">
              <span className={`badge ${p.published ? "badge-green" : "badge-yellow"}`}>{p.published ? "Live" : "Draft"}</span>
              <button onClick={() => open(p)} className="p-1.5 text-gray-400 hover:text-[#00369b]"><MdEdit size={15} /></button>
              <button onClick={() => del(p.id!)} className="p-1.5 text-gray-400 hover:text-red-500"><MdDelete size={15} /></button>
            </div>
          </div>
        ))}
      </div>
      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box max-w-lg">
            <div className="modal-header"><h2 className="font-semibold">{editing ? "Edit" : "Add"} Plan</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600"><MdClose size={20} /></button></div>
            <form onSubmit={save} className="p-6 space-y-4 overflow-y-auto" style={{ maxHeight: "75vh" }}>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="admin-label">Title *</label><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="admin-input" /></div>
                <div><label className="admin-label">Tagline</label><input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className="admin-input" /></div>
                <div><label className="admin-label">Price *</label><input required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="admin-input" placeholder="$50" /></div>
                <div><label className="admin-label">Per (label)</label><input value={form.per} onChange={(e) => setForm({ ...form, per: e.target.value })} className="admin-input" placeholder="/hour lesson" /></div>
                <div><label className="admin-label">Order</label><input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} className="admin-input" /></div>
              </div>
              <div><label className="admin-label">Key Perks (3)</label>
                {form.perks.map((pk, i) => (
                  <input key={i} value={pk.desc} onChange={(e) => { const p = [...form.perks]; p[i] = { desc: e.target.value }; setForm({ ...form, perks: p }); }} className="admin-input mb-2" placeholder={`Perk ${i + 1}`} />
                ))}</div>
              <div><label className="admin-label">Free Perks (shown below divider)</label>
                {form.freePerks.map((fp, i) => (
                  <input key={i} value={fp} onChange={(e) => { const p = [...form.freePerks]; p[i] = e.target.value; setForm({ ...form, freePerks: p }); }} className="admin-input mb-2" placeholder={`Free perk ${i + 1}`} />
                ))}</div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={form.highlighted} onChange={(e) => setForm({ ...form, highlighted: e.target.checked })} />Highlight (featured)</label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />Published</label>
              </div>
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">{saving ? "Saving…" : editing ? "Save" : "Create"}</button>
                <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button></div>
            </form></div></div>)}
    </div>
  );
}

// ── FAQs ──────────────────────────────────────────────────
const F_EMPTY: Omit<SiteFaq, "id"> = { question: "", answer: "", order: 0, published: true };
function FaqsEditor() {
  const [items, setItems] = useState<SiteFaq[]>([]);
  const [modal, setModal] = useState(false); const [editing, setEditing] = useState<SiteFaq | null>(null);
  const [form, setForm] = useState(F_EMPTY); const [saving, setSaving] = useState(false);
  useEffect(() => { getAllFaqs().then(setItems); }, []);
  function open(f?: SiteFaq) { setEditing(f ?? null); setForm(f ? { question: f.question, answer: f.answer, order: f.order, published: f.published } : F_EMPTY); setModal(true); }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    if (editing?.id) await updateFaq(editing.id, form); else await createFaq(form);
    setItems(await getAllFaqs()); setModal(false); setSaving(false);
  }
  async function del(id: string) { if (!confirm("Delete?")) return; await deleteFaq(id); setItems(await getAllFaqs()); }
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><p className="text-sm text-gray-500">{items.length} FAQ{items.length !== 1 ? "s" : ""}</p>
        <button onClick={() => open()} className="btn-primary flex items-center gap-2"><MdAdd size={16} />Add FAQ</button></div>
      <div className="space-y-2">
        {items.map((f) => (
          <div key={f.id} className="flex items-start justify-between border border-gray-200 px-4 py-3 bg-white">
            <div className="flex-1 mr-4"><p className="font-medium text-gray-800 text-sm">{f.question}</p>
              <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{f.answer}</p></div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`badge ${f.published ? "badge-green" : "badge-yellow"}`}>{f.published ? "Live" : "Draft"}</span>
              <button onClick={() => open(f)} className="p-1.5 text-gray-400 hover:text-[#00369b]"><MdEdit size={15} /></button>
              <button onClick={() => del(f.id!)} className="p-1.5 text-gray-400 hover:text-red-500"><MdDelete size={15} /></button>
            </div>
          </div>
        ))}
      </div>
      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box max-w-lg">
            <div className="modal-header"><h2 className="font-semibold">{editing ? "Edit" : "Add"} FAQ</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600"><MdClose size={20} /></button></div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div><label className="admin-label">Question *</label><input required value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} className="admin-input" /></div>
              <div><label className="admin-label">Answer *</label><textarea required value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} rows={4} className="admin-input resize-none" /></div>
              <div><label className="admin-label">Order</label><input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} className="admin-input" /></div>
              <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />Published</label>
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">{saving ? "Saving…" : editing ? "Save" : "Create"}</button>
                <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button></div>
            </form></div></div>)}
    </div>
  );
}

// ── Header Info ───────────────────────────────────────────
function HeaderInfoEditor() {
  const EMPTY = { phone: "", email: "", rating: "5 star rating from 5000+ verified reviews", abn: "" };
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false); const [ok, setOk] = useState(false);
  useEffect(() => { getSiteContent("header_info").then((d) => { if (d) setForm(d.data as typeof form); }); }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    await upsertSiteContent("header_info", form); setSaving(false); setOk(true); setTimeout(() => setOk(false), 3000);
  }
  const fields: Array<{ key: keyof typeof EMPTY; label: string; placeholder: string }> = [
    { key: "phone", label: "Top Bar Phone", placeholder: "+61433600592" },
    { key: "email", label: "Top Bar Email", placeholder: "info@bridgitus.com" },
    { key: "abn", label: "ABN", placeholder: "16146552112" },
    { key: "rating", label: "Rating Text", placeholder: "5 star rating from 5000+ verified reviews" },
  ];
  return (
    <form onSubmit={save} className="space-y-4">
      {fields.map(({ key, label, placeholder }) => (
        <div key={key}><label className="admin-label">{label}</label>
          <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="admin-input" placeholder={placeholder} /></div>
      ))}
      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60"><MdSave size={15} />{saving ? "Saving…" : "Save Header Info"}</button>
        {ok && <span className="text-sm text-emerald-600 flex items-center gap-1"><MdCheckCircle size={14} />Saved</span>}
      </div>
    </form>
  );
}

// ── About Page Editor ─────────────────────────────────────
function AboutPageEditor() {
  const EMPTY = { heroHeading: "", heroImage: "", vision: "", mission: "", directorName: "", directorRole: "", directorImage: "", directorBio: "", storyHeading: "", storyBody: "", storyImage: "", storyQuote: "", approachHeading: "", approachBody: "", approachImageDesktop: "", approachImageMobile: "", testimonialsHeading: "What Our Students Say About Us", faqHeading: "We know you have questions, We also have answers" };
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false); const [ok, setOk] = useState(false);
  useEffect(() => { getSiteContent("about_page").then((d) => { if (d) setForm(d.data as typeof form); }); }, []);
  async function save(e: React.FormEvent) { e.preventDefault(); setSaving(true); await upsertSiteContent("about_page", form); setSaving(false); setOk(true); setTimeout(() => setOk(false), 3000); }
  const tf = (key: keyof typeof EMPTY, label: string, rows?: number) => (
    <div key={key}><label className="admin-label">{label}</label>
      {rows ? <textarea value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} rows={rows} className="admin-input resize-none" /> : <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="admin-input" />}
    </div>
  );
  return (
    <form onSubmit={save} className="space-y-4">
      <p className="text-xs text-gray-400 bg-blue-50 border border-blue-200 px-3 py-2">These fields control every section of the About page. Leave blank to use the defaults.</p>
      <h3 className="admin-label text-sm text-gray-600 font-bold pt-2">Hero Section</h3>
      {tf("heroHeading", "Hero Heading")}
      <ImageUpload label="Hero Background Image" value={form.heroImage} onChange={(v) => setForm({ ...form, heroImage: v })} folder="bridgitus/site" />
      <h3 className="admin-label text-sm text-gray-600 font-bold pt-2">Vision & Mission</h3>
      {tf("vision", "Vision Statement", 2)}
      {tf("mission", "Mission Statement", 3)}
      <h3 className="admin-label text-sm text-gray-600 font-bold pt-2">Director's Desk</h3>
      <div className="grid sm:grid-cols-2 gap-4">{tf("directorName", "Director Name")}{tf("directorRole", "Director Role/Title")}</div>
      {tf("directorBio", "Director Bio (separate paragraphs with blank lines)", 6)}
      <ImageUpload label="Director Photo" value={form.directorImage} onChange={(v) => setForm({ ...form, directorImage: v })} folder="bridgitus/site" />
      <h3 className="admin-label text-sm text-gray-600 font-bold pt-2">Our Story</h3>
      {tf("storyHeading", "Story Heading")}
      {tf("storyBody", "Story Body", 4)}
      {tf("storyQuote", "Story Quote (optional)")}
      <ImageUpload label="Story Image" value={form.storyImage} onChange={(v) => setForm({ ...form, storyImage: v })} folder="bridgitus/site" />
      <h3 className="admin-label text-sm text-gray-600 font-bold pt-2">Our Approach</h3>
      {tf("approachHeading", "Approach Heading")}
      {tf("approachBody", "Approach Body", 3)}
      <ImageUpload label="Process Diagram (Desktop)" value={form.approachImageDesktop} onChange={(v) => setForm({ ...form, approachImageDesktop: v })} folder="bridgitus/site" />
      <ImageUpload label="Process Diagram (Mobile)" value={form.approachImageMobile} onChange={(v) => setForm({ ...form, approachImageMobile: v })} folder="bridgitus/site" />
      <h3 className="admin-label text-sm text-gray-600 font-bold pt-2">Section Headings</h3>
      {tf("testimonialsHeading", "Testimonials Section Heading")}
      {tf("faqHeading", "FAQ Section Heading")}
      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60"><MdSave size={15} />{saving ? "Saving…" : "Save About Page"}</button>
        {ok && <span className="text-sm text-emerald-600 flex items-center gap-1"><MdCheckCircle size={14} />Saved</span>}
      </div>
    </form>
  );
}

// ── CTA Banner Editor ─────────────────────────────────────
function CtaEditor() {
  const EMPTY = { heading: "Every class is an opportunity to succeed.", subheading: "Ready to take the first step? Register today and start your learning journey.", buttonLabel: "Get Started", buttonHref: "/register" };
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false); const [ok, setOk] = useState(false);
  useEffect(() => { getSiteContent("cta").then((d) => { if (d) setForm(d.data as typeof form); }); }, []);
  async function save(e: React.FormEvent) { e.preventDefault(); setSaving(true); await upsertSiteContent("cta", form); setSaving(false); setOk(true); setTimeout(() => setOk(false), 3000); }
  return (
    <form onSubmit={save} className="space-y-4">
      <div><label className="admin-label">Heading</label><input value={form.heading} onChange={(e) => setForm({ ...form, heading: e.target.value })} className="admin-input" /></div>
      <div><label className="admin-label">Sub-heading</label><textarea value={form.subheading} onChange={(e) => setForm({ ...form, subheading: e.target.value })} rows={2} className="admin-input resize-none" /></div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div><label className="admin-label">Button Label</label><input value={form.buttonLabel} onChange={(e) => setForm({ ...form, buttonLabel: e.target.value })} className="admin-input" /></div>
        <div><label className="admin-label">Button Link</label><input value={form.buttonHref} onChange={(e) => setForm({ ...form, buttonHref: e.target.value })} className="admin-input" placeholder="/register" /></div>
      </div>
      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60"><MdSave size={15} />{saving ? "Saving…" : "Save CTA"}</button>
        {ok && <span className="text-sm text-emerald-600 flex items-center gap-1"><MdCheckCircle size={14} />Saved</span>}
      </div>
    </form>
  );
}

// ── Stats editor ──────────────────────────────────────────
function StatsEditor() {
  const EMPTY = { stat1Label: "100% Positive Feedback", stat1Sub: "Over 100+ positive feedback", stat2Label: "99% Success Rate", stat2Sub: "Students who stick with us succeed", stat3Label: "24/7 Expert Support", stat3Sub: "Always here when you need help" };
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false); const [ok, setOk] = useState(false);
  useEffect(() => { getSiteContent("stats").then((d) => { if (d) setForm(d.data as typeof form); }); }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    await upsertSiteContent("stats", form); setSaving(false); setOk(true); setTimeout(() => setOk(false), 3000);
  }
  const fields: Array<{ key: keyof typeof EMPTY; label: string }> = [
    { key: "stat1Label", label: "Stat 1 Headline" }, { key: "stat1Sub", label: "Stat 1 Sub-text" },
    { key: "stat2Label", label: "Stat 2 Headline" }, { key: "stat2Sub", label: "Stat 2 Sub-text" },
    { key: "stat3Label", label: "Stat 3 Headline" }, { key: "stat3Sub", label: "Stat 3 Sub-text" },
  ];
  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        {fields.map(({ key, label }) => (
          <div key={key}><label className="admin-label">{label}</label>
            <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="admin-input" /></div>
        ))}
      </div>
      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60"><MdSave size={15} />{saving ? "Saving…" : "Save Stats"}</button>
        {ok && <span className="text-sm text-emerald-600 flex items-center gap-1"><MdCheckCircle size={14} />Saved</span>}
      </div>
    </form>
  );
}

// ── Classes ───────────────────────────────────────────────
const CL_EMPTY: Omit<SiteClass, "id"> = { title: "", grades: "", description: "", subjects: [], type: "one-on-one", image: "", published: true, order: 0 };
function ClassesEditor() {
  const [items, setItems] = useState<SiteClass[]>([]);
  const [modal, setModal] = useState(false); const [editing, setEditing] = useState<SiteClass | null>(null);
  const [form, setForm] = useState(CL_EMPTY); const [saving, setSaving] = useState(false);
  const [subjectsRaw, setSubjectsRaw] = useState("");
  useEffect(() => { getAllClasses().then(setItems); }, []);
  function open(c?: SiteClass) { setEditing(c ?? null); setForm(c ? { title: c.title, grades: c.grades, description: c.description, subjects: c.subjects, type: c.type, image: c.image ?? "", published: c.published, order: c.order } : CL_EMPTY); setSubjectsRaw(c ? c.subjects.join(", ") : ""); setModal(true); }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const data = { ...form, subjects: subjectsRaw.split(",").map(s => s.trim()).filter(Boolean) };
    if (editing?.id) await updateClass(editing.id, data); else await createClass(data);
    setItems(await getAllClasses()); setModal(false); setSaving(false);
  }
  async function del(id: string) { if (!confirm("Delete?")) return; await deleteClass(id); setItems(await getAllClasses()); }
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><p className="text-sm text-gray-500">{items.length} class{items.length !== 1 ? "es" : ""}</p>
        <button onClick={() => open()} className="btn-primary flex items-center gap-2"><MdAdd size={16} />Add Class</button></div>
      <div className="space-y-2">{items.map((c) => (
        <div key={c.id} className="flex items-center justify-between border border-gray-200 px-4 py-3 bg-white">
          <div><p className="font-medium text-gray-800">{c.title} <span className="text-gray-400 text-xs">· {c.grades}</span></p>
            <p className="text-xs text-gray-400">{c.type} · {c.subjects.slice(0, 3).join(", ")}</p></div>
          <div className="flex items-center gap-2">
            <span className={`badge ${c.published ? "badge-green" : "badge-yellow"}`}>{c.published ? "Live" : "Draft"}</span>
            <button onClick={() => open(c)} className="p-1.5 text-gray-400 hover:text-[#00369b]"><MdEdit size={15} /></button>
            <button onClick={() => del(c.id!)} className="p-1.5 text-gray-400 hover:text-red-500"><MdDelete size={15} /></button>
          </div>
        </div>))}</div>
      {modal && (<div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
        <div className="modal-box max-w-lg"><div className="modal-header"><h2 className="font-semibold">{editing ? "Edit" : "Add"} Class</h2><button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600"><MdClose size={20} /></button></div>
          <form onSubmit={save} className="p-6 space-y-4">
            <div><label className="admin-label">Title *</label><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="admin-input" /></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className="admin-label">Grades</label><input value={form.grades} onChange={(e) => setForm({ ...form, grades: e.target.value })} className="admin-input" placeholder="K–6" /></div>
              <div><label className="admin-label">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as SiteClass["type"] })} className="admin-input">
                  <option value="one-on-one">One-on-One</option><option value="group">Group</option><option value="online">Online</option>
                </select></div>
            </div>
            <div><label className="admin-label">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="admin-input resize-none" /></div>
            <div><label className="admin-label">Subjects (comma-separated)</label><input value={subjectsRaw} onChange={(e) => setSubjectsRaw(e.target.value)} className="admin-input" placeholder="Maths, English, Science" /></div>
            <div><label className="admin-label">Order</label><input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} className="admin-input" /></div>
            <ImageUpload label="Class Image" value={form.image ?? ""} onChange={(v) => setForm({ ...form, image: v })} folder="bridgitus/classes" />
            <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />Published</label>
            <div className="flex gap-3 pt-2 border-t border-gray-100"><button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">{saving ? "Saving…" : editing ? "Save" : "Create"}</button><button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button></div>
          </form></div></div>)}
    </div>
  );
}

// ── Services / Features ────────────────────────────────────
const SV_EMPTY: Omit<SiteService, "id"> = { title: "", description: "", icon: "", bullets: ["", "", ""], image: "", section: "offer", published: true, order: 0 };
function ServicesEditor() {
  const [items, setItems] = useState<SiteService[]>([]);
  const [modal, setModal] = useState(false); const [editing, setEditing] = useState<SiteService | null>(null);
  const [form, setForm] = useState(SV_EMPTY); const [saving, setSaving] = useState(false);
  useEffect(() => { getAllServices().then(setItems); }, []);
  function open(s?: SiteService) { setEditing(s ?? null); setForm(s ? { title: s.title, description: s.description, icon: s.icon ?? "", bullets: s.bullets ?? ["", "", ""], image: s.image ?? "", section: s.section, published: s.published, order: s.order } : SV_EMPTY); setModal(true); }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const data = { ...form, bullets: form.bullets?.filter(Boolean) };
    if (editing?.id) await updateService(editing.id, data); else await createService(data);
    setItems(await getAllServices()); setModal(false); setSaving(false);
  }
  async function del(id: string) { if (!confirm("Delete?")) return; await deleteService(id); setItems(await getAllServices()); }
  const sc: Record<string, string> = { offer: "badge-blue", why: "badge-green", exam_prep: "badge-yellow" };
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><p className="text-sm text-gray-500">{items.length} service{items.length !== 1 ? "s" : ""}</p>
        <button onClick={() => open()} className="btn-primary flex items-center gap-2"><MdAdd size={16} />Add Service</button></div>
      <p className="text-xs text-gray-400"><strong>offer</strong>=feature cards · <strong>why</strong>=tutoring reasons · <strong>exam_prep</strong>=exam prep block</p>
      <div className="space-y-2">{items.map((s) => (
        <div key={s.id} className="flex items-center justify-between border border-gray-200 px-4 py-3 bg-white">
          <div><p className="font-medium text-gray-800">{s.icon} {s.title}</p><p className="text-xs text-gray-400 line-clamp-1">{s.description}</p></div>
          <div className="flex items-center gap-2">
            <span className={`badge ${sc[s.section]}`}>{s.section}</span>
            <span className={`badge ${s.published ? "badge-green" : "badge-yellow"}`}>{s.published ? "Live" : "Draft"}</span>
            <button onClick={() => open(s)} className="p-1.5 text-gray-400 hover:text-[#00369b]"><MdEdit size={15} /></button>
            <button onClick={() => del(s.id!)} className="p-1.5 text-gray-400 hover:text-red-500"><MdDelete size={15} /></button>
          </div>
        </div>))}</div>
      {modal && (<div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
        <div className="modal-box max-w-lg"><div className="modal-header"><h2 className="font-semibold">{editing ? "Edit" : "Add"} Service</h2><button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600"><MdClose size={20} /></button></div>
          <form onSubmit={save} className="p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className="admin-label">Title *</label><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="admin-input" /></div>
              <div><label className="admin-label">Icon (emoji)</label><input value={form.icon ?? ""} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="admin-input" placeholder="📚" /></div>
            </div>
            <div><label className="admin-label">Section</label>
              <select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value as SiteService["section"] })} className="admin-input">
                <option value="offer">offer</option><option value="why">why</option><option value="exam_prep">exam_prep</option>
              </select></div>
            <div><label className="admin-label">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="admin-input resize-none" /></div>
            <div><label className="admin-label">Bullet Points</label>
              {(form.bullets ?? []).map((b, i) => (<input key={i} value={b} onChange={(e) => { const a = [...(form.bullets ?? [])]; a[i] = e.target.value; setForm({ ...form, bullets: a }); }} className="admin-input mb-2" placeholder={`Bullet ${i + 1}`} />))}
              <button type="button" onClick={() => setForm({ ...form, bullets: [...(form.bullets ?? []), ""] })} className="text-xs text-[#00369b] hover:underline">+ Add bullet</button></div>
            <div><label className="admin-label">Order</label><input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} className="admin-input" /></div>
            <ImageUpload label="Image" value={form.image ?? ""} onChange={(v) => setForm({ ...form, image: v })} folder="bridgitus/services" />
            <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />Published</label>
            <div className="flex gap-3 pt-2 border-t border-gray-100"><button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">{saving ? "Saving…" : editing ? "Save" : "Create"}</button><button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button></div>
          </form></div></div>)}
    </div>
  );
}

// ── Partners ──────────────────────────────────────────────
const PA_EMPTY: Omit<SitePartner, "id"> = { name: "", logo: "", url: "", published: true, order: 0 };
function PartnersEditor() {
  const [items, setItems] = useState<SitePartner[]>([]);
  const [modal, setModal] = useState(false); const [editing, setEditing] = useState<SitePartner | null>(null);
  const [form, setForm] = useState(PA_EMPTY); const [saving, setSaving] = useState(false);
  useEffect(() => { getAllPartners().then(setItems); }, []);
  function open(p?: SitePartner) { setEditing(p ?? null); setForm(p ? { name: p.name, logo: p.logo, url: p.url ?? "", published: p.published, order: p.order } : PA_EMPTY); setModal(true); }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    if (editing?.id) await updatePartner(editing.id, form); else await createPartner(form);
    setItems(await getAllPartners()); setModal(false); setSaving(false);
  }
  async function del(id: string) { if (!confirm("Delete?")) return; await deletePartner(id); setItems(await getAllPartners()); }
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><p className="text-sm text-gray-500">{items.length} partner{items.length !== 1 ? "s" : ""}</p>
        <button onClick={() => open()} className="btn-primary flex items-center gap-2"><MdAdd size={16} />Add Partner</button></div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {items.map((p) => (
          <div key={p.id} className="border border-gray-200 bg-white p-3 flex flex-col items-center gap-2 text-center">
            {p.logo && <img src={p.logo} alt={p.name} className="h-8 object-contain" />} {/* eslint-disable-line @next/next/no-img-element */}
            <p className="text-xs font-medium text-gray-700">{p.name}</p>
            <div className="flex gap-1"><button onClick={() => open(p)} className="p-1 text-gray-400 hover:text-[#00369b]"><MdEdit size={13} /></button><button onClick={() => del(p.id!)} className="p-1 text-gray-400 hover:text-red-500"><MdDelete size={13} /></button></div>
          </div>))}
      </div>
      {modal && (<div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
        <div className="modal-box max-w-sm"><div className="modal-header"><h2 className="font-semibold">{editing ? "Edit" : "Add"} Partner</h2><button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600"><MdClose size={20} /></button></div>
          <form onSubmit={save} className="p-6 space-y-4">
            <div><label className="admin-label">Name *</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="admin-input" /></div>
            <ImageUpload label="Logo *" value={form.logo} onChange={(v) => setForm({ ...form, logo: v })} folder="bridgitus/partners" />
            <div><label className="admin-label">Website URL</label><input type="url" value={form.url ?? ""} onChange={(e) => setForm({ ...form, url: e.target.value })} className="admin-input" placeholder="https://…" /></div>
            <div><label className="admin-label">Order</label><input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} className="admin-input" /></div>
            <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />Published</label>
            <div className="flex gap-3 pt-2 border-t border-gray-100"><button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">{saving ? "Saving…" : editing ? "Save" : "Create"}</button><button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button></div>
          </form></div></div>)}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function WebsitePage() {
  const [tab, setTab] = useState<Tab>("hero");
  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <MdWeb size={22} className="text-[#00369b]" />
          <div><h1 className="text-xl font-bold text-gray-900">Website Content</h1>
            <p className="text-gray-500 text-sm">Edit every section of the public website</p></div>
        </div>
        {/* Tab bar — scrollable */}
        <div className="flex flex-wrap gap-1 bg-gray-100 p-1 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${tab === t.key ? "bg-white text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
              {t.label}</button>
          ))}
        </div>
        {/* Tab content */}
        <div className="admin-card">
          {tab === "hero" && <HeroEditor />}
          {tab === "brief" && <BriefEditor />}
          {tab === "header_info" && <HeaderInfoEditor />}
          {tab === "contact_info" && <ContactInfoEditor />}
          {tab === "about_page" && <AboutPageEditor />}
          {tab === "cta" && <CtaEditor />}
          {tab === "classes" && <ClassesEditor />}
          {tab === "services" && <ServicesEditor />}
          {tab === "partners" && <PartnersEditor />}
          {tab === "testimonials" && <TestimonialsEditor />}
          {tab === "pricing" && <PricingEditor />}
          {tab === "faqs" && <FaqsEditor />}
        </div>
      </div>
    </AdminLayout>
  );
}
