import type { Metadata } from "next";
import { Caveat, Inter, Plus_Jakarta_Sans, Poppins } from "next/font/google";
import { PlatformFooter } from "@/components/layout/PlatformFooter";
import { PlatformHeader } from "@/components/layout/PlatformHeader";
import { isNzEnrolmentProductAvailable } from "@/lib/nz-enrolment/environment";
import { listActiveNzTenants } from "@/lib/nz-enrolment/tenants";
import { getPlatformBrand } from "@/lib/provider-experience/branding";
import "./globals.css";
import "../styles/studentpay-platform.css";

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

const poppins = Poppins({
  variable: "--font-studentpay-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700", "900"],
});

const inter = Inter({
  variable: "--font-studentpay-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export function generateMetadata(): Metadata {
  const brand = getPlatformBrand();

  if (isNzEnrolmentProductAvailable()) {
    const tenant = listActiveNzTenants().find((item) => !item.sandboxOnly);
    if (tenant) {
      return {
        title: {
          default: `${tenant.displayName} | Enrolment`,
          template: `%s`,
        },
        description: `Enrol with ${tenant.displayName} using a StudentPay NZ payment plan.`,
      };
    }
  }

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

  if (brand === "bela-beauty-college") {
    return {
      title: {
        default: "Bela Beauty College | Enrolment",
        template: "%s | Bela Beauty College",
      },
      description:
        "Enrolment and payment plans for Bela Beauty College, provided through StudentPay.",
    };
  }

  return {
    title: {
      default: "StudentPay | Provider Experience",
      template: "%s | StudentPay Provider Experience",
    },
    description:
      "A reusable product environment for demonstrating and deploying StudentPay-powered enrolment and payment experiences.",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const brand = getPlatformBrand();
  const nzEnrolment = isNzEnrolmentProductAvailable();
  const bodyClassName =
    brand === "academy-australia"
      ? `${plusJakarta.variable} ${caveat.variable} platform--academy-australia`
      : brand === "bela-beauty-college"
        ? `${poppins.variable} ${inter.variable} platform--bela-beauty-college`
        : nzEnrolment
          ? `${poppins.variable} ${inter.variable} platform--nz-enrolment`
          : `${poppins.variable} ${inter.variable} platform--studentpay`;

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
