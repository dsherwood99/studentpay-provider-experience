import { headers } from "next/headers";
import { AcademyAustraliaFooter } from "@/components/layout/AcademyAustraliaFooter";
import { BelaBeautyFooter } from "@/components/layout/BelaBeautyFooter";
import { StudentPayFooter } from "@/components/layout/StudentPayFooter";
import { getPlatformBrand } from "@/lib/provider-experience/branding";
import { isNzEnrolmentProductAvailable } from "@/lib/nz-enrolment/environment";

export async function PlatformFooter() {
  const academyTestPage = (await headers()).get("x-academy-nz-test-page") === "1";
  if (isNzEnrolmentProductAvailable() && !academyTestPage) {
    return null;
  }

  const brand = academyTestPage ? "academy-australia" : getPlatformBrand();

  if (brand === "academy-australia") {
    return <AcademyAustraliaFooter />;
  }

  if (brand === "bela-beauty-college") {
    return <BelaBeautyFooter />;
  }

  return <StudentPayFooter />;
}
