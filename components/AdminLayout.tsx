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
} from "react-icons/md";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  section: AdminSection;
}

const ALL_NAV: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: MdDashboard, section: "dashboard" },
  { href: "/admin/students", label: "Students", icon: MdPeople, section: "students" },
  { href: "/admin/materials", label: "Learning Materials", icon: MdMenuBook, section: "materials" },
  { href: "/admin/tests", label: "Tests & Exams", icon: MdQuiz, section: "tests" },
  { href: "/admin/assignments", label: "Assignments", icon: MdAssignment, section: "assignments" },
  { href: "/admin/announcements", label: "Announcements", icon: MdCampaign, section: "announcements" },
  { href: "/admin/website", label: "Website Content", icon: MdWeb, section: "website" },
  { href: "/admin/messages", label: "Contact Messages", icon: MdEmail, section: "messages" },
  { href: "/admin/account", label: "My Account", icon: MdPerson, section: "account" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, adminUser, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) { router.replace("/login"); return; }

    // Check section-level access for non-super admins
    if (!loading && user && adminUser && adminUser.role !== "super") {
      const matchedNav = ALL_NAV.find(
        (n) => pathname === n.href || pathname.startsWith(n.href + "/")
      );
      if (matchedNav && !adminUser.permissions?.includes(matchedNav.section)) {
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

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  // Determine which nav items this admin can see
  const isSuper = adminUser?.role === "super";
  const visibleNav = isSuper
    ? ALL_NAV
    : ALL_NAV.filter((n) => adminUser?.permissions?.includes(n.section));

  // Check if current page is accessible (for access-denied overlay)
  const currentNav = ALL_NAV.find(
    (n) => pathname === n.href || pathname.startsWith(n.href + "/")
  );
  const isCurrentAccessible =
    isSuper ||
    !currentNav ||
    adminUser?.permissions?.includes(currentNav.section) ||
    pathname === "/admin/dashboard"; // dashboard always accessible

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
            <p className="text-sm font-semibold text-white truncate">
              {adminUser?.displayName ?? "Admin"}
            </p>
            <p className="text-xs text-white/40 truncate">{user.email}</p>
          </div>
        </div>
        {adminUser?.role && (
          <span className="mt-2 inline-block bg-[#00c1ff]/20 text-[#00c1ff] text-xs font-semibold px-2 py-0.5 uppercase tracking-wide">
            {adminUser.role === "super" ? "Super Admin" : "Admin"}
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {/* Main nav items filtered by permission */}
        {visibleNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              <item.icon size={17} />
              {item.label}
            </Link>
          );
        })}

        {/* Permissions — super admins only */}
        {isSuper && (
          <>
            <p className="nav-section-label">Administration</p>
            <Link
              href="/admin/permissions"
              onClick={() => setSidebarOpen(false)}
              className={`nav-item ${pathname.startsWith("/admin/permissions") ? "active" : ""}`}
            >
              <MdShield size={17} />
              Permissions
            </Link>
          </>
        )}

        {/* If regular admin has no permissions at all */}
        {!isSuper && visibleNav.length === 0 && (
          <div className="px-5 py-6 text-xs text-white/30 leading-relaxed">
            No sections have been assigned to your account. Contact a Super Admin.
          </div>
        )}
      </nav>

      {/* Sign out */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all"
        >
          <MdLogout size={16} /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 min-h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 lg:px-6 h-14 flex items-center gap-3">
          <button className="lg:hidden p-1.5 text-gray-600 hover:text-gray-900" onClick={() => setSidebarOpen(true)}>
            <MdMenu size={22} />
          </button>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-700 capitalize">
              {pathname.split("/").pop()?.replace("-", " ") ?? "Dashboard"}
            </p>
          </div>
          <button className="p-1.5 text-gray-400 hover:text-gray-600">
            <MdNotifications size={20} />
          </button>
          <div className="w-7 h-7 bg-[#00369b] flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {adminUser?.displayName?.[0] ?? "A"}
            </span>
          </div>
        </header>

        {/* Page — show access-denied overlay if needed */}
        <main className="flex-1 p-4 lg:p-6 bg-[#f4f5f7] overflow-x-hidden relative">
          {!isCurrentAccessible ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <MdLock size={48} className="text-gray-300 mb-4" />
              <h2 className="text-lg font-bold text-gray-900">Access Restricted</h2>
              <p className="text-gray-500 text-sm mt-2 max-w-sm">
                You don&apos;t have permission to view this section. Contact your Super Admin to request access.
              </p>
              <Link href="/admin/dashboard" className="btn-primary mt-6 text-sm">
                Back to Dashboard
              </Link>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
