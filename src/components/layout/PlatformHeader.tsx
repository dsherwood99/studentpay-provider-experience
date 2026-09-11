import { AcademyAustraliaHeader } from "@/components/layout/AcademyAustraliaHeader";
import { BelaBeautyHeader } from "@/components/layout/BelaBeautyHeader";
import { StudentPayHeader } from "@/components/layout/StudentPayHeader";
import { isNzEnrolmentProductAvailable } from "@/lib/nz-enrolment/environment";
import { getPlatformBrand } from "@/lib/provider-experience/branding";

export function PlatformHeader() {
  if (isNzEnrolmentProductAvailable()) {
    return null;
  }

  const brand = getPlatformBrand();

  if (brand === "academy-australia") {
    return <AcademyAustraliaHeader />;
  }

  if (brand === "bela-beauty-college") {
    return <BelaBeautyHeader />;
  }

  return <StudentPayHeader />;
}
