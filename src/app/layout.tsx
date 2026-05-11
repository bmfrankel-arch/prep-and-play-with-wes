import type { Metadata } from "next";
import "./globals.css";
import OfflineIndicator from "@/components/OfflineIndicator";

export const metadata: Metadata = {
  title: "Prep & Play with Wes",
  description: "A kindergarten skill-building app to help Wes prepare for Dallas private school admissions",
  manifest: "/manifest.json",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-nunito antialiased min-h-screen">
        <OfflineIndicator />
        {children}
      </body>
    </html>
  );
}
