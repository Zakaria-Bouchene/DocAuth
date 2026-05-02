import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocAuth - Trusted Practitioner Onboarding",
  description: "Onboarding & Verification System for Healthcare Professionals",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
