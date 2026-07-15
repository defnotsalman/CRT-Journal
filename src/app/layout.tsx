import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { TopBar } from "@/components/TopBar";
import { Toaster } from "@/components/ui/sonner";
import { BatcaveEffect } from "@/components/BatcaveEffect";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gotham Journals",
  description: "Wayne Enterprises Encrypted Trade Log",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans antialiased min-h-screen relative`}
      >
        <AuthProvider>
          <BatcaveEffect />
          <TopBar />
          <div className="container mx-auto p-4 md:p-8 max-w-5xl relative z-10">
            {children}
          </div>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
