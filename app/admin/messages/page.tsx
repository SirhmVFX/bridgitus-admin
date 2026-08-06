"use client";
import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { getAllContactMessages, markMessageRead, deleteContactMessage, type ContactMessage } from "@/lib/firestore";
import { MdEmail, MdDelete, MdMarkEmailRead, MdSearch } from "react-icons/md";

export default function MessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all"|"unread"|"read">("all");
  const [selected, setSelected] = useState<ContactMessage|null>(null);

  async function load() {
    const m = await getAllContactMessages();
    setMessages(m); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleRead(id: string) {
    await markMessageRead(id);
    setMessages((prev) => prev.map((m) => m.id===id ? {...m,read:true} : m));
    if (selected?.id===id) setSelected((s) => s ? {...s,read:true} : null);
  }
  async function handleDelete(id: string) {
    if (!confirm("Delete this message?")) return;
    await deleteContactMessage(id);
    setMessages((prev) => prev.filter((m) => m.id!==id));
    if (selected?.id===id) setSelected(null);
  }

  const filtered = messages.filter((m) => {
    const textMatch = !search || `${m.name} ${m.email} ${m.message}`.toLowerCase().includes(search.toLowerCase());
    const statusMatch = filter==="all" || (filter==="unread" && !m.read) || (filter==="read" && m.read);
    return textMatch && statusMatch;
  });
  const unreadCount = messages.filter((m) => !m.read).length;

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <MdEmail size={20} className="text-[#00369b]"/> Contact Messages
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread` : "All messages read"} · {messages.length} total
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="admin-card flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-44">
            <MdSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search messages…" className="admin-input pl-8"/>
          </div>
          <div className="flex gap-1">
            {(["all","unread","read"] as const).map((f)=>(
              <button key={f} onClick={()=>setFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold capitalize transition-all border ${filter===f?"bg-[#00369b] text-white border-[#00369b]":"bg-white text-gray-600 border-gray-200"}`}>
                {f}</button>
            ))}
          </div>
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} result{filtered.length!==1?"s":""}</span>
        </div>

        <div className="grid lg:grid-cols-5 gap-5">
          {/* List */}
          <div className="lg:col-span-2 space-y-2">
            {loading ? (
              <div className="space-y-2">{[...Array(4)].map((_,i)=><div key={i} className="bg-white border h-16 animate-pulse"/>)}</div>
            ) : filtered.length===0 ? (
              <div className="bg-white border border-gray-200 p-10 text-center">
                <MdEmail size={32} className="mx-auto text-gray-300 mb-2"/>
                <p className="text-gray-500 text-sm">No messages found.</p>
              </div>
            ) : (
              filtered.map((m)=>(
                <button key={m.id} onClick={()=>{ setSelected(m); if(!m.read) handleRead(m.id!); }}
                  className={`w-full text-left border px-4 py-3 transition-all ${selected?.id===m.id?"border-[#00369b] bg-blue-50":"bg-white border-gray-200 hover:border-gray-300"} ${!m.read?"border-l-4 border-l-[#00369b]":""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${!m.read?"font-bold text-gray-900":"font-medium text-gray-700"}`}>{m.name}</p>
                      <p className="text-xs text-gray-400 truncate">{m.email}</p>
                      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{m.message}</p>
                    </div>
                    {!m.read && <div className="w-2 h-2 bg-[#00369b] rounded-full shrink-0 mt-1"/>}
                  </div>
                  {m.createdAt && (
                    <p className="text-xs text-gray-300 mt-1">
                      {(m.createdAt as { toDate?: () => Date })?.toDate?.()?.toLocaleDateString("en-AU",{day:"numeric",month:"short",year:"numeric"}) ?? ""}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Detail */}
          <div className="lg:col-span-3">
            {selected ? (
              <div className="bg-white border border-gray-200 h-full">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div>
                    <p className="font-semibold text-gray-900">{selected.name}</p>
                    <a href={`mailto:${selected.email}`} className="text-xs text-[#00369b] hover:underline">{selected.email}</a>
                  </div>
                  <div className="flex items-center gap-2">
                    {!selected.read && (
                      <button onClick={()=>handleRead(selected.id!)} className="btn-secondary text-xs py-1 flex items-center gap-1">
                        <MdMarkEmailRead size={14}/>Mark Read</button>
                    )}
                    <a href={`mailto:${selected.email}?subject=Re: Your enquiry`}
                      className="btn-primary text-xs py-1 flex items-center gap-1">Reply</a>
                    <button onClick={()=>handleDelete(selected.id!)} className="p-1.5 text-gray-400 hover:text-red-500"><MdDelete size={16}/></button>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selected.message}</p>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 p-12 text-center h-full flex flex-col items-center justify-center">
                <MdEmail size={40} className="text-gray-300 mb-3"/>
                <p className="text-gray-400 text-sm">Select a message to read it</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
