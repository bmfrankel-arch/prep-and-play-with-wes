import type { Metadata } from "next";
import "./globals.css";
import OfflineIndicator from "@/components/OfflineIndicator";

export const metadata: Metadata = {
  title: "Prep & Play with Wes",
  description: "A kindergarten skill-building app to help Wes prepare for Dallas private school admissions",
  manifest: "/manifest.json",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
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
