"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import type { AdminSection } from "@/lib/firestore";
import {
  MdDashboard,
  MdMenuBook,
  MdQuiz,
  MdPeople,
  MdAssignment,
  MdPerson,
  MdLogout,
  MdMenu,
  MdSchool,
  MdNotifications,
  MdClose,
  MdShield,
  MdLock,
  MdCampaign,
  MdWeb,
  MdEmail,
  MdExpandMore,
  MdExpandLess,
  MdImage,
  MdInfo,
  MdGavel,
  MdSettings,
  MdBarChart,
  MdSend,
  MdAutoAwesome,
  MdLibraryBooks,
  MdPayment,
  MdVideocam,
  MdSearch,
  MdOpenInNew,
  MdFactCheck,
} from "react-icons/md";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  section: AdminSection;
  group?: "overview" | "learning" | "exam-prep" | "tools" | "account";
}

const MAIN_NAV: NavItem[] = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: MdDashboard,
    section: "dashboard",
    group: "overview",
  },
  {
    href: "/admin/students",
    label: "Students",
    icon: MdPeople,
    section: "students",
    group: "overview",
  },
  {
    href: "/admin/payments",
    label: "Payments",
    icon: MdPayment,
    section: "payments",
    group: "overview",
  },
  {
    href: "/admin/materials",
    label: "Materials",
    icon: MdMenuBook,
    section: "materials",
    group: "learning",
  },
  {
    href: "/admin/tests",
    label: "Assessments",
    icon: MdQuiz,
    section: "tests",
    group: "learning",
  },
  {
    href: "/admin/assignments",
    label: "Assignments",
    icon: MdAssignment,
    section: "assignments",
    group: "learning",
  },
  {
    href: "/admin/announcements",
    label: "Announcements",
    icon: MdCampaign,
    section: "announcements",
    group: "learning",
  },
  {
    href: "/admin/online-sessions",
    label: "Online Sessions",
    icon: MdVideocam,
    section: "online-sessions",
    group: "learning",
  },
  {
    href: "/admin/naplan",
    label: "NAPLAN",
    icon: MdFactCheck,
    section: "naplan",
    group: "exam-prep",
  },
  {
    href: "/admin/selective",
    label: "Selective Entry",
    icon: MdQuiz,
    section: "selective",
    group: "exam-prep",
  },
  {
    href: "/admin/analytics/students",
    label: "Student Analytics",
    icon: MdBarChart,
    section: "students",
    group: "tools",
  },
  {
    href: "/admin/ai-generator",
    label: "AI Generator",
    icon: MdAutoAwesome,
    section: "materials",
    group: "tools",
  },
  {
    href: "/admin/question-library",
    label: "Question Library",
    icon: MdLibraryBooks,
    section: "materials",
    group: "tools",
  },
  {
    href: "/admin/parent-messages",
    label: "Parent Messages",
    icon: MdSend,
    section: "parent-messages",
    group: "tools",
  },
  {
    href: "/admin/messages",
    label: "Contact Messages",
    icon: MdEmail,
    section: "messages",
    group: "tools",
  },
];

const WEBSITE_SUBNAV: {
  label: string;
  icon: React.ElementType;
  href: string;
  section: AdminSection;
}[] = [
  {
    label: "General",
    icon: MdSettings,
    href: "/admin/website/general",
    section: "website",
  },
  {
    label: "Hero & Brief",
    icon: MdImage,
    href: "/admin/website/content",
    section: "website",
  },
  {
    label: "About Page",
    icon: MdInfo,
    href: "/admin/website/about",
    section: "website",
  },
  {
    label: "Legal Pages",
    icon: MdGavel,
    href: "/admin/website/legal",
    section: "website",
  },
];

const ADMIN_NAV: NavItem[] = [
  {
    href: "/admin/account",
    label: "My Account",
    icon: MdPerson,
    section: "account",
    group: "account",
  },
  {
    href: "/admin/permissions",
    label: "Permissions",
    icon: MdShield,
    section: "permissions",
    group: "account",
  },
];

const ALL_NAV: NavItem[] = [
  ...MAIN_NAV,
  ...WEBSITE_SUBNAV.map((x) => ({
    href: x.href,
    label: x.label,
    icon: x.icon,
    section: x.section,
  })),
  ...ADMIN_NAV,
];

const PORTAL_URL =
  process.env.NEXT_PUBLIC_PORTAL_URL ||
  "https://www.bridgitus.com/portal/login";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, adminUser, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [websiteOpen, setWebsiteOpen] = useState(
    pathname.startsWith("/admin/website"),
  );
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (pathname.startsWith("/admin/website")) setWebsiteOpen(true);
  }, [pathname]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (!loading && user && adminUser && adminUser.role !== "super") {
      const matched = ALL_NAV.find(
        (n) => pathname === n.href || pathname.startsWith(n.href + "/"),
      );
      if (matched && !adminUser.permissions?.includes(matched.section)) {
        router.replace("/admin/dashboard");
      }
    }
  }, [user, adminUser, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eef1f6]">
        <div className="w-9 h-9 border-4 border-[#00369b] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  const isSuper = adminUser?.role === "super";
  function canSee(section: AdminSection) {
    return isSuper || adminUser?.permissions?.includes(section);
  }

  function NavLink({
    href,
    icon: Icon,
    label,
    indent = false,
  }: {
    href: string;
    icon: React.ElementType;
    label: string;
    indent?: boolean;
  }) {
    const isActive = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        href={href}
        onClick={() => setSidebarOpen(false)}
        className={`nav-item ${isActive ? "active" : ""} ${indent ? "pl-9 text-xs" : ""}`}
      >
        <Icon size={indent ? 14 : 17} />
        {label}
      </Link>
    );
  }

  const isCurrentAccessible = (() => {
    if (isSuper) return true;
    const matched = ALL_NAV.find(
      (n) => pathname === n.href || pathname.startsWith(n.href + "/"),
    );
    return (
      !matched || canSee(matched.section) || pathname === "/admin/dashboard"
    );
  })();

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#001233] text-white">
      <div className="px-5 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#00369b] flex items-center justify-center shrink-0 border border-white/10">
            <MdSchool size={20} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#00c1ff] font-bold">
              Bridgitus
            </p>
            <p className="text-sm font-semibold text-white">Admin</p>
          </div>
        </div>
        <button
          className="lg:hidden text-white/50 hover:text-white transition-colors"
          onClick={() => setSidebarOpen(false)}
        >
          <MdClose size={20} />
        </button>
      </div>

      <nav className="flex-1 py-2 overflow-y-auto">
        <p className="nav-section-label">Overview</p>
        {MAIN_NAV.filter((n) => n.group === "overview")
          .filter((n) => canSee(n.section))
          .map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
            />
          ))}

        <p className="nav-section-label">Learning</p>
        {MAIN_NAV.filter((n) => n.group === "learning")
          .filter((n) => canSee(n.section))
          .map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
            />
          ))}

        {(canSee("naplan") || canSee("selective")) && (
          <>
            <p className="nav-section-label">Exam Prep</p>
            {MAIN_NAV.filter((n) => n.group === "exam-prep")
              .filter((n) => canSee(n.section))
              .map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                />
              ))}
          </>
        )}

        <p className="nav-section-label">Tools</p>
        {MAIN_NAV.filter((n) => n.group === "tools")
          .filter((n) => canSee(n.section))
          .map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
            />
          ))}

        {canSee("website") && (
          <>
            <p className="nav-section-label">Website</p>
            <button
              onClick={() => setWebsiteOpen(!websiteOpen)}
              className={`nav-item w-full text-left ${
                pathname.startsWith("/admin/website") ? "text-white" : ""
              }`}
            >
              <MdWeb size={17} />
              <span className="flex-1">Website Content</span>
              {websiteOpen ? (
                <MdExpandLess size={16} />
              ) : (
                <MdExpandMore size={16} />
              )}
            </button>
            {websiteOpen && (
              <div className="pb-1">
                {WEBSITE_SUBNAV.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    indent
                  />
                ))}
              </div>
            )}
          </>
        )}

        <p className="nav-section-label">Account</p>
        {ADMIN_NAV.filter((n) => n.section !== "permissions" || isSuper).map(
          (item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
            />
          ),
        )}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-3">
        <a
          href={PORTAL_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-3 py-2 text-xs text-white/50 hover:text-[#00c1ff] transition-colors"
        >
          <MdOpenInNew size={14} /> View student portal
        </a>
        <div className="flex items-center gap-3 px-2 py-2 rounded-2xl bg-white/5">
          <div className="w-9 h-9 rounded-full bg-[#00369b] flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-bold">
              {adminUser?.displayName?.[0] ??
                user.email?.[0]?.toUpperCase() ??
                "A"}
            </span>
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-sm font-semibold text-white truncate">
              {adminUser?.displayName ?? "Admin"}
            </p>
            <p className="text-[11px] text-[#00c1ff] font-semibold uppercase tracking-wide">
              {adminUser?.role === "super" ? "Super admin" : "Admin"}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 text-white/40 hover:text-white transition-colors"
            title="Sign out"
          >
            <MdLogout size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#eef1f6]">
      <aside className="hidden lg:flex lg:flex-col w-[272px] min-h-screen sticky top-0 h-screen">
        <SidebarContent />
      </aside>
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-[#001233]/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-[272px] flex flex-col animate-[slideUp_0.25s_ease]">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 px-4 lg:px-6 pt-4 pb-2">
          <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-full px-4 lg:px-2 h-14 flex items-center gap-3">
            <button
              className="lg:hidden p-2 text-slate-500 hover:text-slate-900 transition-colors rounded-xl hover:bg-slate-50"
              onClick={() => setSidebarOpen(true)}
            >
              <MdMenu size={22} />
            </button>

            <div className="shell-search hidden sm:flex">
              <MdSearch size={18} className="text-slate-400 shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search admin…"
                aria-label="Search"
              />
              <span className="shell-kbd">⌘K</span>
            </div>

            <div className="flex-1 sm:flex-none" />

            <button className="relative p-2 text-slate-400 hover:text-slate-700 transition-colors rounded-xl hover:bg-slate-50">
              <MdNotifications size={20} />
            </button>
            <div className="w-8 h-8 rounded-full bg-[#00369b] flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {adminUser?.displayName?.[0] ?? "A"}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 lg:px-6 pb-8 pt-2 min-w-0">
          {!isCurrentAccessible ? (
            <div className="admin-card flex flex-col items-center justify-center min-h-[50vh] text-center">
              <MdLock size={48} className="text-slate-300 mb-4" />
              <h2 className="text-lg font-bold text-slate-900">
                Access Restricted
              </h2>
              <p className="text-slate-500 text-sm mt-2 max-w-sm">
                You don&apos;t have permission to view this section.
              </p>
              <Link
                href="/admin/dashboard"
                className="btn-primary mt-6 text-sm"
              >
                Back to Dashboard
              </Link>
            </div>
          ) : (
            <div className="page-enter" key={pathname}>
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
