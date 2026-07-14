import type { Metadata } from "next";
import { Anton, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { TopBar } from "@/components/TopBar";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const anton = Anton({
  variable: "--font-heading",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CRT Journal - Next.js",
  description: "Trade log and checklist history",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${anton.variable} antialiased`}
      >
        <AuthProvider>
          <TopBar />
          
          {/* Bat-Symbol Watermark */}
          <div className="fixed inset-0 z-[-1] pointer-events-none flex items-center justify-center opacity-[0.03]">
            <svg viewBox="0 0 100 100" className="w-[80vw] max-w-[800px] h-auto fill-primary" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 85 C30 65 10 40 5 25 C5 20 8 15 15 15 C20 15 25 18 30 25 C35 15 45 10 50 20 C55 10 65 15 70 25 C75 18 80 15 85 15 C92 15 95 20 95 25 C90 40 70 65 50 85 Z"/>
            </svg>
          </div>

          <div className="container mx-auto p-4 md:p-8 max-w-5xl relative z-10">
            {children}
          </div>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
