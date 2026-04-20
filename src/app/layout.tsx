import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import "@/app/globals.css";
import AuthProvider from "@/components/AuthProvider";
import GroupProvider from "@/components/GroupProvider";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import GroupGate from "@/components/GroupGate";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#050507",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "TumbaNet",
  description: "The official network of the Tumbas",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TumbaNet",
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="ltr">
      <body className={spaceGrotesk.className}>
        <AuthProvider>
          <GroupProvider>
            <GroupGate>
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <main className="flex-1 pb-20 lg:pb-0">{children}</main>
                <BottomNav />
              </div>
            </GroupGate>
          </GroupProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
