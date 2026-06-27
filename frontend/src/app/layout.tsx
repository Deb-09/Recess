import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Recess - Your Safe Study Break Companion",
  description: "A generative AI-powered, zero-pressure space for Indian competitive exam students to step away from exam prep, talk to Bono the Golden Retriever, lock away anxiety, and reset.",
  keywords: ["JEE", "NEET", "UPSC", "Competitive Exams", "Mental Wellness", "Student Stress", "CBT Journaling", "Grounding", "Bono"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
      </head>
      <body className={`${outfit.variable} ${inter.variable} font-sans h-full bg-slate-900 text-slate-100 antialiased flex flex-col`}>
        {children}
      </body>
    </html>
  );
}
