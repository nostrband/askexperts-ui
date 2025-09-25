import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import { SignInDialogProvider } from "../components/auth/SignInDialogProvider";
import { NostrAuthProvider } from "../components/auth/NostrAuthProvider";
import "./globals.css";
import Script from "next/script";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AskExperts.io | AI Experts Powered by Bitcoin",
  description:
    "Ask AI Experts trained with real human knowledge. Self-hosted. Open protocol. Lightning payments built-in.",
  keywords:
    "AI, Bitcoin, Lightning Network, Experts, Open Protocol, Self-hosted",
  icons: {
    icon: "/logo.jpeg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="scroll-smooth">
        <body className={`${inter.variable} font-sans antialiased`}>
          <NostrAuthProvider>
            <SignInDialogProvider>{children}</SignInDialogProvider>
          </NostrAuthProvider>
          <Script strategy="afterInteractive"
            src="https://www.unpkg.com/nostr-login@latest/dist/unpkg.js"
            data-perms="sign_event:27236"
            data-theme="default"
            data-no-banner="true"
            data-methods="connect,extension"
          ></Script>
        </body>
      </html>
    </ClerkProvider>
  );
}
