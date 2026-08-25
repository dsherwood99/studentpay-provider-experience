import { AcademyAustraliaFooter } from "@/components/layout/AcademyAustraliaFooter";
import { BelaBeautyFooter } from "@/components/layout/BelaBeautyFooter";
import { StudentPayFooter } from "@/components/layout/StudentPayFooter";
import { getPlatformBrand } from "@/lib/provider-experience/branding";

export function PlatformFooter() {
  const brand = getPlatformBrand();

  if (brand === "academy-australia") {
    return <AcademyAustraliaFooter />;
  }

  if (brand === "bela-beauty-college") {
    return <BelaBeautyFooter />;
  }

  return <StudentPayFooter />;
}
