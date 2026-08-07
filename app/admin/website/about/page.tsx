"use client";
import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import ImageUpload from "@/components/ImageUpload";
import WysiwygEditor from "@/components/WysiwygEditor";
import { getSiteContent, upsertSiteContent, getAllServices, createService, updateService, deleteService, type SiteService } from "@/lib/firestore";
import { MdSave, MdAdd, MdEdit, MdDelete, MdClose, MdCheckCircle, MdInfo } from "react-icons/md";

function AboutPageEditor() {
  const E = { heroHeading:"", heroImage:"", vision:"", mission:"", directorName:"", directorRole:"", directorImage:"", directorBio:"", storyHeading:"", storyBody:"", storyImage:"", storyQuote:"", approachHeading:"", approachBody:"", approachImageDesktop:"", approachImageMobile:"", testimonialsHeading:"What Our Students Say About Us", faqHeading:"We know you have questions, We also have answers" };
  const [f,setF]=useState(E); const [sv,setSv]=useState(false); const [ok,setOk]=useState(false);
  useEffect(()=>{getSiteContent("about_page").then(d=>{if(d)setF(d.data as typeof E)});},[]);
  async function save(e:React.FormEvent){e.preventDefault();setSv(true);await upsertSiteContent("about_page",f);setSv(false);setOk(true);setTimeout(()=>setOk(false),3000);}
  const inp=(key:keyof typeof E, label:string)=>(<div key={key}><label className="admin-label">{label}</label><input value={f[key]} onChange={e=>setF({...f,[key]:e.target.value})} className="admin-input"/></div>);
  const ta=(key:keyof typeof E, label:string, rows=3)=>(<div key={key}><label className="admin-label">{label}</label><textarea value={f[key]} onChange={e=>setF({...f,[key]:e.target.value})} rows={rows} className="admin-input resize-none"/></div>);
  return (<form onSubmit={save} className="space-y-5">
    <h3 className="font-semibold text-gray-700 border-b border-gray-200 pb-2">Hero</h3>
    {inp("heroHeading","Hero Page Heading")}
    <ImageUpload label="Hero Background Image" value={f.heroImage} onChange={v=>setF({...f,heroImage:v})} folder="bridgitus/site"/>
    <h3 className="font-semibold text-gray-700 border-b border-gray-200 pb-2 pt-2">Vision & Mission</h3>
    {ta("vision","Vision Statement",2)}{ta("mission","Mission Statement",3)}
    <h3 className="font-semibold text-gray-700 border-b border-gray-200 pb-2 pt-2">Director&apos;s Desk</h3>
    <div className="grid sm:grid-cols-2 gap-4">{inp("directorName","Director Name")}{inp("directorRole","Director Role/Title")}</div>
    {ta("directorBio","Director Bio (use blank lines to separate paragraphs)",6)}
    <ImageUpload label="Director Photo" value={f.directorImage} onChange={v=>setF({...f,directorImage:v})} folder="bridgitus/site"/>
    <h3 className="font-semibold text-gray-700 border-b border-gray-200 pb-2 pt-2">Our Story</h3>
    {inp("storyHeading","Story Heading")}{ta("storyBody","Story Body",4)}{inp("storyQuote","Story Quote")}
    <ImageUpload label="Story Image" value={f.storyImage} onChange={v=>setF({...f,storyImage:v})} folder="bridgitus/site"/>
    <h3 className="font-semibold text-gray-700 border-b border-gray-200 pb-2 pt-2">Our Approach</h3>
    {inp("approachHeading","Approach Heading")}{ta("approachBody","Approach Body",3)}
    <ImageUpload label="Process Diagram (Desktop)" value={f.approachImageDesktop} onChange={v=>setF({...f,approachImageDesktop:v})} folder="bridgitus/site"/>
    <ImageUpload label="Process Diagram (Mobile)" value={f.approachImageMobile} onChange={v=>setF({...f,approachImageMobile:v})} folder="bridgitus/site"/>
    <h3 className="font-semibold text-gray-700 border-b border-gray-200 pb-2 pt-2">Section Headings</h3>
    {inp("testimonialsHeading","Testimonials Section Heading")}{inp("faqHeading","FAQ Section Heading")}
    <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
      <button type="submit" disabled={sv} className="btn-primary flex items-center gap-2 disabled:opacity-60"><MdSave size={15}/>{sv?"Saving…":"Save About Page"}</button>
      {ok&&<span className="text-sm text-emerald-600 flex items-center gap-1"><MdCheckCircle size={14}/>Saved</span>}
    </div>
  </form>);
}

const SV_EMPTY:Omit<SiteService,"id">={title:"",description:"",icon:"",bullets:["","",""],image:"",section:"offer",published:true,order:0};
function ServicesEditor(){
  const [items,setItems]=useState<SiteService[]>([]);const [modal,setModal]=useState(false);const [editing,setEditing]=useState<SiteService|null>(null);
  const [f,setF]=useState(SV_EMPTY);const [sv,setSv]=useState(false);
  useEffect(()=>{getAllServices().then(setItems);},[]);
  function open(s?:SiteService){setEditing(s??null);setF(s?{title:s.title,description:s.description,icon:s.icon??"",bullets:s.bullets??["","",""],image:s.image??"",section:s.section,published:s.published,order:s.order}:SV_EMPTY);setModal(true);}
  async function save(e:React.FormEvent){e.preventDefault();setSv(true);const data={...f,bullets:(f.bullets as string[]).filter(Boolean)};if(editing?.id)await updateService(editing.id,data);else await createService(data);setItems(await getAllServices());setModal(false);setSv(false);}
  async function del(id:string){if(!confirm("Delete?"))return;await deleteService(id);setItems(await getAllServices());}
  const sc:Record<string,string>={offer:"badge-blue",why:"badge-green",exam_prep:"badge-yellow"};
  return (<div className="space-y-4">
    <div className="flex justify-between items-center"><p className="text-sm text-gray-500">{items.length} service{items.length!==1?"s":""}</p><button onClick={()=>open()} className="btn-primary flex items-center gap-2"><MdAdd size={16}/>Add Service</button></div>
    <p className="text-xs text-gray-400"><strong>offer</strong>=feature cards · <strong>why</strong>=tutoring reasons · <strong>exam_prep</strong>=exam prep</p>
    <div className="space-y-2">{items.map(s=>(<div key={s.id} className="flex items-center justify-between border border-gray-200 px-4 py-3 bg-white">
      <div><p className="font-medium text-gray-800">{s.icon} {s.title}</p><p className="text-xs text-gray-400 line-clamp-1">{s.description}</p></div>
      <div className="flex items-center gap-2"><span className={`badge ${sc[s.section]}`}>{s.section}</span><span className={`badge ${s.published?"badge-green":"badge-yellow"}`}>{s.published?"Live":"Draft"}</span>
        <button onClick={()=>open(s)} className="p-1.5 text-gray-400 hover:text-[#00369b]"><MdEdit size={15}/></button>
        <button onClick={()=>del(s.id!)} className="p-1.5 text-gray-400 hover:text-red-500"><MdDelete size={15}/></button></div>
    </div>))}</div>
    {modal&&(<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
      <div className="modal-box max-w-lg"><div className="modal-header"><h2 className="font-semibold">{editing?"Edit":"Add"} Service</h2><button onClick={()=>setModal(false)} className="text-gray-400 hover:text-gray-600"><MdClose size={20}/></button></div>
      <form onSubmit={save} className="p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="admin-label">Title *</label><input required value={f.title} onChange={e=>setF({...f,title:e.target.value})} className="admin-input"/></div>
          <div><label className="admin-label">Icon (emoji)</label><input value={f.icon??""} onChange={e=>setF({...f,icon:e.target.value})} className="admin-input" placeholder="📚"/></div>
        </div>
        <div><label className="admin-label">Section</label><select value={f.section} onChange={e=>setF({...f,section:e.target.value as SiteService["section"]})} className="admin-input"><option value="offer">offer</option><option value="why">why</option><option value="exam_prep">exam_prep</option></select></div>
        <div><label className="admin-label">Description</label><textarea value={f.description} onChange={e=>setF({...f,description:e.target.value})} rows={3} className="admin-input resize-none"/></div>
        <div><label className="admin-label">Bullet Points</label>{(f.bullets as string[]).map((b,i)=>(<input key={i} value={b} onChange={e=>{const a=[...(f.bullets as string[])];a[i]=e.target.value;setF({...f,bullets:a});}} className="admin-input mb-2" placeholder={`Bullet ${i+1}`}/>))}<button type="button" onClick={()=>setF({...f,bullets:[...(f.bullets as string[]),""]}) } className="text-xs text-[#00369b] hover:underline">+ Add bullet</button></div>
        <ImageUpload label="Image" value={f.image??""} onChange={v=>setF({...f,image:v})} folder="bridgitus/services"/>
        <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={f.published} onChange={e=>setF({...f,published:e.target.checked})}/>Published</label>
        <div className="flex gap-3 pt-2 border-t border-gray-100"><button type="submit" disabled={sv} className="btn-primary disabled:opacity-60">{sv?"Saving…":editing?"Save":"Create"}</button><button type="button" onClick={()=>setModal(false)} className="btn-secondary">Cancel</button></div>
      </form></div></div>)}
  </div>);
}

type Section="about"|"services";
export default function AboutPage(){
  const [section,setSection]=useState<Section>("about");
  return (<AdminLayout>
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-3"><MdInfo size={22} className="text-[#00369b]"/>
        <div><h1 className="text-xl font-bold text-gray-900">About Page</h1><p className="text-gray-500 text-sm">Director&apos;s desk, vision, mission, services and features</p></div></div>
      <div className="flex flex-wrap gap-1 bg-gray-100 p-1">
        {([{key:"about",label:"About Page Content"},{key:"services",label:"Services / Features"}] as {key:Section;label:string}[]).map(s=>(
          <button key={s.key} onClick={()=>setSection(s.key)} className={`px-3 py-2 text-xs sm:text-sm font-medium transition-all ${section===s.key?"bg-white text-gray-900":"text-gray-500 hover:text-gray-700"}`}>{s.label}</button>
        ))}
      </div>
      <div className="admin-card">
        {section==="about"&&<AboutPageEditor/>}
        {section==="services"&&<ServicesEditor/>}
      </div>
    </div>
  </AdminLayout>);
}
