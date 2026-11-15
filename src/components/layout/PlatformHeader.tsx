import { headers } from "next/headers";
import { AcademyAustraliaHeader } from "@/components/layout/AcademyAustraliaHeader";
import { BelaBeautyHeader } from "@/components/layout/BelaBeautyHeader";
import { StudentPayHeader } from "@/components/layout/StudentPayHeader";
import { isNzEnrolmentProductAvailable } from "@/lib/nz-enrolment/environment";
import { getPlatformBrand } from "@/lib/provider-experience/branding";

export async function PlatformHeader() {
  const academyTestPage = (await headers()).get("x-academy-nz-test-page") === "1";
  if (isNzEnrolmentProductAvailable() && !academyTestPage) {
    return null;
  }

  const brand = academyTestPage ? "academy-australia" : getPlatformBrand();

  if (brand === "academy-australia") {
    return <AcademyAustraliaHeader />;
  }

  if (brand === "bela-beauty-college") {
    return <BelaBeautyHeader />;
  }

  return <StudentPayHeader />;
}
