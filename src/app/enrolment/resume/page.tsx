import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ResumeEnrolment } from "@/components/au-enrolment/ResumeEnrolment";
import { academyEnrolmentProxyAllowed } from "@/lib/au-enrolment/forward";
import { getHostedProductMode } from "@/lib/nz-enrolment/environment";

export const metadata = {
  title: "Resume enrolment",
  robots: { index: false, follow: false },
};

export default async function ResumeEnrolmentPage() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host") || "";
  if (!academyEnrolmentProxyAllowed(host, getHostedProductMode())) {
    notFound();
  }
  return <ResumeEnrolment />;
}
