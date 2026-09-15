import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ResearchNotice from "@/components/ResearchNotice";
import FinishFeedback from "@/components/FinishFeedback";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Netflix",
  description: "Watch While You Eat - validation prototype",
};

// viewportFit: "cover" is what makes env(safe-area-inset-*) resolve to real values,
// which the survey's fixed bottom action bar needs to clear the home indicator.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#141414",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-nfbg text-white">
        {children}
        <FinishFeedback />
        <ResearchNotice />
      </body>
    </html>
  );
}
