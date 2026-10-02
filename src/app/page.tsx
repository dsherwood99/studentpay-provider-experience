import { notFound, redirect } from "next/navigation";
import { AcademyAustraliaHomePage } from "@/components/home/AcademyAustraliaHomePage";
import { StudentPayHomePage } from "@/components/home/StudentPayHomePage";
import { isNzEnrolmentProductAvailable } from "@/lib/nz-enrolment/environment";
import { getPlatformBrand } from "@/lib/provider-experience/branding";
import {
  dedicatedNzHostedTenantRejected,
  dedicatedProductionHomePath,
} from "@/lib/provider-experience/host-isolation";

export default function HomePage() {
  if (isNzEnrolmentProductAvailable() && dedicatedNzHostedTenantRejected()) {
    notFound();
  }

  const dedicatedHome = dedicatedProductionHomePath();

  if (dedicatedHome) {
    redirect(dedicatedHome);
  }

  const brand = getPlatformBrand();

  if (brand === "academy-australia") {
    return <AcademyAustraliaHomePage />;
  }

  return <StudentPayHomePage />;
}
