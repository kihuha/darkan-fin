import type { Metadata } from "next";
import { Geist_Mono, Figtree } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const figtree = Figtree({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Darkan Fin",
  description: "Your personal finance app for managing money with ease",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} ${geistMono.variable} h-full bg-gray-900`}
    >
      <body className="font-sans antialiased h-full">
        <TooltipProvider>{children}</TooltipProvider>

        <Toaster />
      </body>
    </html>
  );
}
