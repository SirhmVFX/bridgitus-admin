"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import type { AdminSection } from "@/lib/firestore";
import {
  MdDashboard, MdMenuBook, MdQuiz, MdPeople,
  MdAssignment, MdPerson, MdLogout, MdMenu,
  MdSchool, MdNotifications, MdClose, MdShield,
  MdLock, MdCampaign, MdWeb, MdEmail,
  MdExpandMore, MdExpandLess, MdImage, MdInfo,
  MdGavel, MdSettings, MdBarChart, MdSend,
  MdAutoAwesome, MdLibraryBooks,
  MdPayment,
} from "react-icons/md";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  section: AdminSection;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  // Some groups can be collapsible
  collapsible?: boolean;
  defaultOpen?: boolean;
}

// Top-level nav (always visible)
const MAIN_NAV: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: MdDashboard, section: "dashboard" },
  { href: "/admin/students", label: "Students", icon: MdPeople, section: "students" },
  { href: "/admin/payments", label: "Payments", icon: MdPayment, section: "payments" },
  { href: "/admin/materials", label: "Materials", icon: MdMenuBook, section: "materials" },
  { href: "/admin/tests", label: "Assesments", icon: MdQuiz, section: "tests" },
  { href: "/admin/assignments", label: "Assignments", icon: MdAssignment, section: "assignments" },
  { href: "/admin/analytics/students", label: "Student Analytics", icon: MdBarChart, section: "students" },
  { href: "/admin/ai-generator", label: "AI Generator", icon: MdAutoAwesome, section: "materials" },
  { href: "/admin/question-library", label: "Question Library", icon: MdLibraryBooks, section: "materials" },
  { href: "/admin/announcements", label: "Announcements", icon: MdCampaign, section: "announcements" },
  { href: "/admin/parent-messages", label: "Parent Messages", icon: MdSend, section: "parent-messages" },
  { href: "/admin/messages", label: "Contact Messages", icon: MdEmail, section: "messages" },
];

// Website Content sub-nav (grouped)
const WEBSITE_SUBNAV: { label: string; icon: React.ElementType; href: string; section: AdminSection }[] = [
  { label: "General", icon: MdSettings, href: "/admin/website/general", section: "website" },
  { label: "Hero & Brief", icon: MdImage, href: "/admin/website/content", section: "website" },
  { label: "About Page", icon: MdInfo, href: "/admin/website/about", section: "website" },
  { label: "Legal Pages", icon: MdGavel, href: "/admin/website/legal", section: "website" },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin/account", label: "My Account", icon: MdPerson, section: "account" },
  { href: "/admin/permissions", label: "Permissions", icon: MdShield, section: "permissions" },
];

// All nav items flat for permission checking
const ALL_NAV: NavItem[] = [
  ...MAIN_NAV,
  ...WEBSITE_SUBNAV.map((x) => ({ href: x.href, label: x.label, icon: x.icon, section: x.section })),
  ...ADMIN_NAV,
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, adminUser, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [websiteOpen, setWebsiteOpen] = useState(pathname.startsWith("/admin/website"));

  useEffect(() => {
    if (pathname.startsWith("/admin/website")) setWebsiteOpen(true);
  }, [pathname]);

  useEffect(() => {
    if (!loading && !user) { router.replace("/login"); return; }
    if (!loading && user && adminUser && adminUser.role !== "super") {
      const matched = ALL_NAV.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"));
      if (matched && !adminUser.permissions?.includes(matched.section)) {
        router.replace("/admin/dashboard");
      }
    }
  }, [user, adminUser, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7]">
        <div className="w-8 h-8 border-4 border-[#00369b] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  async function handleSignOut() { await signOut(); router.replace("/login"); }

  const isSuper = adminUser?.role === "super";
  function canSee(section: AdminSection) { return isSuper || adminUser?.permissions?.includes(section); }

  function NavLink({ href, icon: Icon, label, indent = false }: { href: string; icon: React.ElementType; label: string; indent?: boolean }) {
    const isActive = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link href={href} onClick={() => setSidebarOpen(false)}
        className={`nav-item ${isActive ? "active" : ""} ${indent ? "pl-10 text-xs" : ""}`}>
        <Icon size={indent ? 14 : 17} />
        {label}
      </Link>
    );
  }

  const isCurrentAccessible = (() => {
    if (isSuper) return true;
    const matched = ALL_NAV.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"));
    return !matched || canSee(matched.section) || pathname === "/admin/dashboard";
  })();

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#001233]">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#00369b] flex items-center justify-center shrink-0">
            <MdSchool size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#00c1ff]">Bridgitus</p>
            <p className="text-sm font-semibold text-white">Admin Panel</p>
          </div>
        </div>
        <button className="lg:hidden text-white/50 hover:text-white" onClick={() => setSidebarOpen(false)}>
          <MdClose size={20} />
        </button>
      </div>

      {/* Admin info */}
      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#00369b] flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-bold">
              {adminUser?.displayName?.[0] ?? user.email?.[0]?.toUpperCase() ?? "A"}
            </span>
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">{adminUser?.displayName ?? "Admin"}</p>
            <p className="text-xs text-white/40 truncate">{user.email}</p>
          </div>
        </div>
        <span className="mt-2 inline-block bg-[#00c1ff]/20 text-[#00c1ff] text-xs font-semibold px-2 py-0.5 uppercase tracking-wide">
          {adminUser?.role === "super" ? "Super Admin" : "Admin"}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {/* Main section */}
        <p className="nav-section-label">Main</p>
        {MAIN_NAV.filter((n) => canSee(n.section)).map((item) => (
          <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} />
        ))}

        {/* Website Content — collapsible group */}
        {canSee("website") && (
          <>
            <p className="nav-section-label">Website</p>
            <button onClick={() => setWebsiteOpen(!websiteOpen)}
              className={`nav-item w-full text-left ${pathname.startsWith("/admin/website") ? "text-white" : ""}`}>
              <MdWeb size={17} />
              <span className="flex-1">Website Content</span>
              {websiteOpen ? <MdExpandLess size={16} /> : <MdExpandMore size={16} />}
            </button>
            {websiteOpen && (
              <div className="bg-white/5">
                {WEBSITE_SUBNAV.map((item) => (
                  <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} indent />
                ))}
              </div>
            )}
          </>
        )}

        {/* Account / Admin */}
        <p className="nav-section-label">Account</p>
        {ADMIN_NAV.filter((n) => n.section !== "permissions" || isSuper).map((item) => (
          <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} />
        ))}
      </nav>

      {/* Sign out */}
      <div className="p-4 border-t border-white/10 space-y-1">
        <button onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all">
          <MdLogout size={16} /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden lg:flex lg:flex-col w-64 min-h-screen"><SidebarContent /></aside>
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 flex flex-col"><SidebarContent /></aside>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 lg:px-6 h-14 flex items-center gap-3">
          <button className="lg:hidden p-1.5 text-gray-600 hover:text-gray-900" onClick={() => setSidebarOpen(true)}>
            <MdMenu size={22} />
          </button>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-700 capitalize">
              {pathname.split("/").filter(Boolean).slice(1).join(" › ").replace(/-/g, " ") || "Dashboard"}
            </p>
          </div>
          <button className="p-1.5 text-gray-400 hover:text-gray-600"><MdNotifications size={20} /></button>
          <div className="w-7 h-7 bg-[#00369b] flex items-center justify-center">
            <span className="text-white text-xs font-bold">{adminUser?.displayName?.[0] ?? "A"}</span>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 bg-[#f4f5f7] overflow-x-hidden relative">
          {!isCurrentAccessible ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <MdLock size={48} className="text-gray-300 mb-4" />
              <h2 className="text-lg font-bold text-gray-900">Access Restricted</h2>
              <p className="text-gray-500 text-sm mt-2 max-w-sm">You don&apos;t have permission to view this section.</p>
              <Link href="/admin/dashboard" className="btn-primary mt-6 text-sm">Back to Dashboard</Link>
            </div>
          ) : children}
        </main>
      </div>
    </div>
  );
}
