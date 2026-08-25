import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import { BreadcrumbProvider } from "@/lib/breadcrumb";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bridgitus Admin",
  description: "Bridgitus Learning — Admin Panel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full antialiased">
        <AuthProvider>
          <BreadcrumbProvider>{children}</BreadcrumbProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
