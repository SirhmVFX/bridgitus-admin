"use client";
import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import ImageUpload from "@/components/ImageUpload";
import { getSiteContent, upsertSiteContent, getAllPartners, createPartner, updatePartner, deletePartner, type SitePartner } from "@/lib/firestore";
import { MdSave, MdAdd, MdEdit, MdDelete, MdClose, MdCheckCircle, MdSettings } from "react-icons/md";

// ── Header Info ────────────────────────────────────────────
function HeaderEditor() {
  const E = { phone:"", email:"", abn:"", rating:"5 star rating from 5000+ verified reviews" };
  const [f,setF]=useState(E); const [sv,setSv]=useState(false); const [ok,setOk]=useState(false);
  useEffect(()=>{getSiteContent("header_info").then(d=>{if(d)setF(d.data as typeof E)});},[]);
  async function save(e:React.FormEvent){e.preventDefault();setSv(true);await upsertSiteContent("header_info",f);setSv(false);setOk(true);setTimeout(()=>setOk(false),3000);}
  return (<form onSubmit={save} className="space-y-4">
    <p className="text-xs text-gray-400 bg-blue-50 border border-blue-200 px-3 py-2">Controls the top bar and logo area across all pages.</p>
    {[{k:"phone",l:"Top Bar Phone"},{k:"email",l:"Top Bar Email"},{k:"abn",l:"ABN (below logo)"},{k:"rating",l:"Rating / Trust Text"}].map(({k,l})=>(
      <div key={k}><label className="admin-label">{l}</label>
        <input value={f[k as keyof typeof E]} onChange={e=>setF({...f,[k]:e.target.value})} className="admin-input"/></div>
    ))}
    <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
      <button type="submit" disabled={sv} className="btn-primary flex items-center gap-2 disabled:opacity-60"><MdSave size={15}/>{sv?"Saving…":"Save Header"}</button>
      {ok&&<span className="text-sm text-emerald-600 flex items-center gap-1"><MdCheckCircle size={14}/>Saved</span>}
    </div>
  </form>);
}

// ── Contact Info ───────────────────────────────────────────
function ContactEditor() {
  const E = { email:"", phone:"", altPhone:"", facebook:"", instagram:"", linkedin:"" };
  const [f,setF]=useState(E); const [sv,setSv]=useState(false); const [ok,setOk]=useState(false);
  useEffect(()=>{getSiteContent("contact_info").then(d=>{if(d)setF(d.data as typeof E)});},[]);
  async function save(e:React.FormEvent){e.preventDefault();setSv(true);await upsertSiteContent("contact_info",f);setSv(false);setOk(true);setTimeout(()=>setOk(false),3000);}
  const fields=[{k:"email",l:"Email"},{k:"phone",l:"Primary Phone"},{k:"altPhone",l:"Alternate Phone"},{k:"facebook",l:"Facebook URL"},{k:"instagram",l:"Instagram URL"},{k:"linkedin",l:"LinkedIn URL"}];
  return (<form onSubmit={save} className="space-y-4">
    <div className="grid sm:grid-cols-2 gap-4">
      {fields.map(({k,l})=>(
        <div key={k}><label className="admin-label">{l}</label>
          <input value={f[k as keyof typeof E]} onChange={e=>setF({...f,[k]:e.target.value})} className="admin-input"/></div>
      ))}
    </div>
    <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
      <button type="submit" disabled={sv} className="btn-primary flex items-center gap-2 disabled:opacity-60"><MdSave size={15}/>{sv?"Saving…":"Save Contact Info"}</button>
      {ok&&<span className="text-sm text-emerald-600 flex items-center gap-1"><MdCheckCircle size={14}/>Saved</span>}
    </div>
  </form>);
}

// ── Stats / TrustedBy ──────────────────────────────────────
function StatsEditor() {
  const E={stat1Label:"100% Positive Feedback",stat1Sub:"Over 100+ positive feedback",stat2Label:"99% Success Rate",stat2Sub:"Students who stick with us succeed",stat3Label:"24/7 Expert Support",stat3Sub:"Always here when you need help"};
  const [f,setF]=useState(E); const [sv,setSv]=useState(false); const [ok,setOk]=useState(false);
  useEffect(()=>{getSiteContent("stats").then(d=>{if(d)setF(d.data as typeof E)});},[]);
  async function save(e:React.FormEvent){e.preventDefault();setSv(true);await upsertSiteContent("stats",f);setSv(false);setOk(true);setTimeout(()=>setOk(false),3000);}
  const pairs=[["stat1Label","stat1Sub","Stat 1"],["stat2Label","stat2Sub","Stat 2"],["stat3Label","stat3Sub","Stat 3"]];
  return (<form onSubmit={save} className="space-y-5">
    {pairs.map(([k1,k2,label])=>(
      <div key={k1} className="grid sm:grid-cols-2 gap-3 border border-gray-100 p-3 bg-gray-50">
        <div><label className="admin-label">{label} Headline</label><input value={f[k1 as keyof typeof E]} onChange={e=>setF({...f,[k1]:e.target.value})} className="admin-input"/></div>
        <div><label className="admin-label">{label} Sub-text</label><input value={f[k2 as keyof typeof E]} onChange={e=>setF({...f,[k2]:e.target.value})} className="admin-input"/></div>
      </div>
    ))}
    <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
      <button type="submit" disabled={sv} className="btn-primary flex items-center gap-2 disabled:opacity-60"><MdSave size={15}/>{sv?"Saving…":"Save Stats"}</button>
      {ok&&<span className="text-sm text-emerald-600 flex items-center gap-1"><MdCheckCircle size={14}/>Saved</span>}
    </div>
  </form>);
}

// ── CTA Banner ─────────────────────────────────────────────
function CtaEditor() {
  const E={heading:"Every class is an opportunity to succeed.",subheading:"Ready to take the first step?",buttonLabel:"Get Started",buttonHref:"/register"};
  const [f,setF]=useState(E); const [sv,setSv]=useState(false); const [ok,setOk]=useState(false);
  useEffect(()=>{getSiteContent("cta").then(d=>{if(d)setF(d.data as typeof E)});},[]);
  async function save(e:React.FormEvent){e.preventDefault();setSv(true);await upsertSiteContent("cta",f);setSv(false);setOk(true);setTimeout(()=>setOk(false),3000);}
  return (<form onSubmit={save} className="space-y-4">
    <div><label className="admin-label">Heading</label><input value={f.heading} onChange={e=>setF({...f,heading:e.target.value})} className="admin-input"/></div>
    <div><label className="admin-label">Sub-heading</label><textarea value={f.subheading} onChange={e=>setF({...f,subheading:e.target.value})} rows={2} className="admin-input resize-none"/></div>
    <div className="grid sm:grid-cols-2 gap-4">
      <div><label className="admin-label">Button Label</label><input value={f.buttonLabel} onChange={e=>setF({...f,buttonLabel:e.target.value})} className="admin-input"/></div>
      <div><label className="admin-label">Button Link</label><input value={f.buttonHref} onChange={e=>setF({...f,buttonHref:e.target.value})} className="admin-input"/></div>
    </div>
    <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
      <button type="submit" disabled={sv} className="btn-primary flex items-center gap-2 disabled:opacity-60"><MdSave size={15}/>{sv?"Saving…":"Save CTA"}</button>
      {ok&&<span className="text-sm text-emerald-600 flex items-center gap-1"><MdCheckCircle size={14}/>Saved</span>}
    </div>
  </form>);
}

// ── Partners ───────────────────────────────────────────────
const PA_EMPTY:Omit<SitePartner,"id">={name:"",logo:"",url:"",published:true,order:0};
function PartnersEditor() {
  const [items,setItems]=useState<SitePartner[]>([]);
  const [modal,setModal]=useState(false); const [editing,setEditing]=useState<SitePartner|null>(null);
  const [form,setForm]=useState(PA_EMPTY); const [sv,setSv]=useState(false);
  useEffect(()=>{getAllPartners().then(setItems);},[]);
  function open(p?:SitePartner){setEditing(p??null);setForm(p?{name:p.name,logo:p.logo,url:p.url??"",published:p.published,order:p.order}:PA_EMPTY);setModal(true);}
  async function save(e:React.FormEvent){e.preventDefault();setSv(true);if(editing?.id)await updatePartner(editing.id,form);else await createPartner(form);setItems(await getAllPartners());setModal(false);setSv(false);}
  async function del(id:string){if(!confirm("Delete?"))return;await deletePartner(id);setItems(await getAllPartners());}
  return (<div className="space-y-4">
    <div className="flex justify-between items-center"><p className="text-sm text-gray-500">{items.length} partner{items.length!==1?"s":""}</p>
      <button onClick={()=>open()} className="btn-primary flex items-center gap-2"><MdAdd size={16}/>Add Partner</button></div>
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
      {items.map(p=>(
        <div key={p.id} className="border border-gray-200 bg-white p-3 flex flex-col items-center gap-2 text-center">
          {p.logo&&<img src={p.logo} alt={p.name} className="h-8 object-contain"/>} {/* eslint-disable-line @next/next/no-img-element */}
          <p className="text-xs font-medium text-gray-700">{p.name}</p>
          <div className="flex gap-1"><button onClick={()=>open(p)} className="p-1 text-gray-400 hover:text-[#00369b]"><MdEdit size={13}/></button><button onClick={()=>del(p.id!)} className="p-1 text-gray-400 hover:text-red-500"><MdDelete size={13}/></button></div>
        </div>))}
    </div>
    {modal&&(<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
      <div className="modal-box max-w-sm"><div className="modal-header"><h2 className="font-semibold">{editing?"Edit":"Add"} Partner</h2><button onClick={()=>setModal(false)} className="text-gray-400 hover:text-gray-600"><MdClose size={20}/></button></div>
      <form onSubmit={save} className="p-6 space-y-4">
        <div><label className="admin-label">Name *</label><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="admin-input"/></div>
        <ImageUpload label="Logo *" value={form.logo} onChange={v=>setForm({...form,logo:v})} folder="bridgitus/partners"/>
        <div><label className="admin-label">Website URL</label><input type="url" value={form.url??""} onChange={e=>setForm({...form,url:e.target.value})} className="admin-input" placeholder="https://…"/></div>
        <div><label className="admin-label">Order</label><input type="number" value={form.order} onChange={e=>setForm({...form,order:Number(e.target.value)})} className="admin-input"/></div>
        <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={form.published} onChange={e=>setForm({...form,published:e.target.checked})}/>Published</label>
        <div className="flex gap-3 pt-2 border-t border-gray-100"><button type="submit" disabled={sv} className="btn-primary disabled:opacity-60">{sv?"Saving…":editing?"Save":"Create"}</button><button type="button" onClick={()=>setModal(false)} className="btn-secondary">Cancel</button></div>
      </form></div></div>)}
  </div>);
}

type Section = "header"|"contact"|"stats"|"cta"|"partners";
const SECTIONS:{key:Section;label:string}[]=[
  {key:"header",   label:"Header & Top Bar"},
  {key:"contact",  label:"Contact Info & Socials"},
  {key:"stats",    label:"Stats / Trust Banner"},
  {key:"cta",      label:"CTA Banner"},
  {key:"partners", label:"Partners / Logos"},
];

export default function GeneralPage() {
  const [section, setSection] = useState<Section>("header");
  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <MdSettings size={22} className="text-[#00369b]"/>
          <div><h1 className="text-xl font-bold text-gray-900">General Settings</h1>
            <p className="text-gray-500 text-sm">Site-wide settings, contact info, stats and partners</p></div>
        </div>
        <div className="flex flex-wrap gap-1 bg-gray-100 p-1">
          {SECTIONS.map(s=>(
            <button key={s.key} onClick={()=>setSection(s.key)}
              className={`px-3 py-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${section===s.key?"bg-white text-gray-900":"text-gray-500 hover:text-gray-700"}`}>
              {s.label}</button>
          ))}
        </div>
        <div className="admin-card">
          {section==="header"   && <HeaderEditor/>}
          {section==="contact"  && <ContactEditor/>}
          {section==="stats"    && <StatsEditor/>}
          {section==="cta"      && <CtaEditor/>}
          {section==="partners" && <PartnersEditor/>}
        </div>
      </div>
    </AdminLayout>
  );
}
