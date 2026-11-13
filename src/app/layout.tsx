import type { Metadata } from "next";
import localFont from "next/font/local";
import { PlatformFooter } from "@/components/layout/PlatformFooter";
import { PlatformHeader } from "@/components/layout/PlatformHeader";
import { isNzEnrolmentProductAvailable } from "@/lib/nz-enrolment/environment";
import {
  getDefaultProductionNzTenantSlug,
  listActiveNzTenants,
} from "@/lib/nz-enrolment/tenants";
import { getPlatformBrand } from "@/lib/provider-experience/branding";
import "./globals.css";
import "../styles/studentpay-platform.css";

const plusJakarta = localFont({
  src: "../fonts/plus-jakarta-sans-latin.woff2",
  variable: "--font-academy-sans",
  weight: "200 800",
  display: "swap",
});

const caveat = localFont({
  src: "../fonts/caveat-latin.woff2",
  variable: "--font-academy-script",
  weight: "400 700",
  display: "swap",
});

const poppins = localFont({
  src: [
    { path: "../fonts/poppins-latin-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/poppins-latin-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/poppins-latin-700.woff2", weight: "700", style: "normal" },
    { path: "../fonts/poppins-latin-900.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-studentpay-heading",
  display: "swap",
});

const inter = localFont({
  src: "../fonts/inter-latin.woff2",
  variable: "--font-studentpay-body",
  weight: "100 900",
  display: "swap",
});

const montserrat = localFont({
  src: "../fonts/montserrat-latin.woff2",
  variable: "--font-nz-heading",
  weight: "100 900",
  display: "swap",
});

const dmSans = localFont({
  src: "../fonts/dm-sans-latin.woff2",
  variable: "--font-nz-body",
  weight: "100 1000",
  display: "swap",
});

export function generateMetadata(): Metadata {
  const brand = getPlatformBrand();

  if (isNzEnrolmentProductAvailable()) {
    const tenants = listActiveNzTenants();
    const defaultSlug = getDefaultProductionNzTenantSlug(tenants);
    const tenant = tenants.find((item) => item.slug === defaultSlug);
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
          ? `${montserrat.variable} ${dmSans.variable} ${inter.variable} platform--nz-enrolment`
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
