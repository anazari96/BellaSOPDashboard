import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { PushNotificationManager } from "@/components/notifications/PushNotificationManager";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bella SOP Dashboard",
  description: "Standard Operating Procedures for your cafe team",
  manifest: "/manifest.json",
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <PushNotificationManager />
        </AuthProvider>
      </body>
    </html>
  );
};

export default RootLayout;
