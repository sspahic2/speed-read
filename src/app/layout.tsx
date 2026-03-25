import type { Metadata } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/custom/nav-bar";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { MetaPixel } from "@/components/meta-pixel";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const siteUrl = "https://quicky.now";

export const metadata: Metadata = {
  title: {
    default: "Speed Reader — Read Faster with RSVP Technology | quicky.now",
    template: "%s | Speed Reader",
  },
  description:
    "Upload PDFs & EPUBs and read 3x faster with RSVP speed-reading. Adjustable pacing, personal cloud library, and speech practice — all in one distraction-free app.",
  keywords: [
    "speed reading",
    "RSVP",
    "rapid serial visual presentation",
    "read faster",
    "speed reader app",
    "PDF reader",
    "EPUB reader",
    "reading speed",
    "words per minute",
    "online speed reader",
    "speech practice",
    "book reader",
  ],
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    siteName: "Speed Reader",
    title: "Speed Reader — Read Faster with RSVP Technology",
    description:
      "Upload your books and read 3x faster. One word at a time, at the speed you choose.",
    url: siteUrl,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Speed Reader — Read Faster with RSVP Technology",
    description:
      "Upload your books and read 3x faster. One word at a time, at the speed you choose.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${poppins.variable} ${geistMono.variable} bg-background text-foreground antialiased`}
      >
        <MetaPixel />
        <AuthSessionProvider>
          <NavBar />
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  );
}
