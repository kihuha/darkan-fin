import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist_Mono, Figtree } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-bricolage",
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
      className={`${figtree.variable} ${bricolageGrotesque.variable} ${geistMono.variable}`}
    >
      <body className="font-sans antialiased">
        {children}

        <Toaster />
      </body>
    </html>
  );
}
