import type { Metadata } from "next";
import { Caveat, Plus_Jakarta_Sans } from "next/font/google";
import { PlatformFooter } from "@/components/layout/PlatformFooter";
import { PlatformHeader } from "@/components/layout/PlatformHeader";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-academy-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const caveat = Caveat({
  variable: "--font-academy-script",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Academy Australia | Flexible Online Courses",
    template: "%s | Academy Australia",
  },
  description:
    "Job-ready online courses with tutor support and flexible weekly, fortnightly or monthly payment options.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${plusJakarta.variable} ${caveat.variable}`}>
        <div className="site-frame">
          <PlatformHeader />
          <main>{children}</main>
          <PlatformFooter />
        </div>
      </body>
    </html>
  );
}
