import type { Metadata } from "next";
import { Caveat, Plus_Jakarta_Sans } from "next/font/google";
import { PlatformFooter } from "@/components/layout/PlatformFooter";
import { PlatformHeader } from "@/components/layout/PlatformHeader";
import { getPlatformBrand } from "@/lib/provider-experience/branding";
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

export function generateMetadata(): Metadata {
  const brand = getPlatformBrand();

  if (brand === "academy-australia") {
    return {
      title: {
        default: "Academy Australia | Flexible Online Courses",
        template: "%s | Academy Australia",
      },
      description:
        "Job-ready online courses with tutor support and flexible weekly, fortnightly or monthly payment options.",
    };
  }

  return {
    title: {
      default: "StudentPay | Provider Experience",
      template: "%s | StudentPay Provider Experience",
    },
    description:
      "Reusable enrolment and payment experiences for education providers. Explore provider demos, StudentPay Enrolment Checkout and integration capabilities.",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const brand = getPlatformBrand();
  const bodyClassName =
    brand === "academy-australia"
      ? `${plusJakarta.variable} ${caveat.variable} platform--academy-australia`
      : `${plusJakarta.variable} platform--studentpay`;

  return (
    <html lang="en">
      <body className={bodyClassName}>
        <div className="site-frame">
          <PlatformHeader />
          <main>{children}</main>
          <PlatformFooter />
        </div>
      </body>
    </html>
  );
}
