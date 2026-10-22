import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { connection } from "next/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Self Finance & Management",
  description:
    "Personal finance tracking, task management, and self-balancing dashboard.",
};

// This app renders live data from a local SQLite database on every visit, so
// routes are allowed to block on the server instead of serving a prerendered
// static shell.
export const instant = false;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Every page shows live data from the local SQLite database, which changes
  // while the app is running. Waiting for the incoming request keeps Next.js
  // from prerendering stale data, and lets client components read the current
  // date/time safely at request time.
  await connection();

  return (
    <html lang="id" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-gray-50 dark:bg-gray-950`}
      >
        {children}
      </body>
    </html>
  );
}
