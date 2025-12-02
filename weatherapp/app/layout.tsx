import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Weather Finder",
  description: "Find weather in your favorite cities",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-gray-50">
      <body>
        <header className="flex justify-center items-center px-8 py-4 bg-white shadow-sm relative">
          <h1 className="text-3xl font-bold text-gray-800">
            Weather Finder
          </h1>
          <nav className="absolute right-8 flex gap-x-6">
            <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium">
              Home
            </Link>
            <Link href="/saved" className="text-gray-700 hover:text-blue-600 font-medium">
              My Saved Places
            </Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
