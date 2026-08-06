"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { MdLock, MdEmail, MdVisibility, MdVisibilityOff, MdSchool } from "react-icons/md";

export default function LoginPage() {
  const { signIn, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/admin/dashboard");
  }, [user, loading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signIn(email, password);
      router.replace("/admin/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      if (msg.includes("invalid-credential") || msg.includes("wrong-password")) {
        setError("Incorrect email or password.");
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#001233]">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#001233]">
      {/* Left branding */}
      <div className="hidden lg:flex lg:w-2/5 flex-col items-center justify-center p-12 relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[-80px] left-[-80px] w-96 h-96 rounded-full bg-white/5" />
          <div className="absolute bottom-[-60px] right-[-60px] w-80 h-80 rounded-full bg-white/5" />
        </div>
        <div className="relative z-10 text-center text-white">
          <div className="w-16 h-16 bg-[#00c1ff]/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <MdSchool size={32} className="text-[#00c1ff]" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Bridgitus Admin</h1>
          <p className="text-white/60 max-w-xs mx-auto text-sm leading-relaxed">
            Manage students, learning materials, tests, and assignments from one place.
          </p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#f4f5f7]">
        <div className="w-full max-w-md">
          <div className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Admin Sign In</h2>
            <p className="text-gray-400 text-sm mb-8">Bridgitus Learning Management System</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="admin-label">Email Address</label>
                <div className="relative">
                  <MdEmail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="admin@bridgitus.com"
                    className="admin-input pl-9" />
                </div>
              </div>

              <div>
                <label className="admin-label">Password</label>
                <div className="relative">
                  <MdLock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="admin-input pl-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw ? <MdVisibilityOff size={16} /> : <MdVisibility size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full py-3 text-base disabled:opacity-60"
              >
                {submitting ? "Signing in…" : "Sign In"}
              </button>
            </form>
          </div>
          <p className="text-center text-xs text-gray-400 mt-5">
            © {new Date().getFullYear()} Bridgitus Learning
          </p>
        </div>
      </div>
    </div>
  );
}
