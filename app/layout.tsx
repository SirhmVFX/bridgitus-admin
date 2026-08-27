import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import { BreadcrumbProvider } from "@/lib/breadcrumb";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Bridgitus Admin",
  description: "Bridgitus Learning — Admin Panel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full`}>
      <body className="min-h-full antialiased font-sans">
        <AuthProvider>
          <BreadcrumbProvider>{children}</BreadcrumbProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
