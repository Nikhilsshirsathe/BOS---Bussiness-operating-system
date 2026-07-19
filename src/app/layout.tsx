import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AgentOS - AI-Powered Business Interaction Platform",
  description:
    "Give every business its own AI-powered page. AI Chat Assistant, Voice Receptionist, Appointment Booking, and Knowledge Base — all in one platform. Share with a QR code or public link.",
  keywords: ["AI receptionist", "chatbot", "voice AI", "appointment booking", "business page", "QR code", "AI assistant"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}