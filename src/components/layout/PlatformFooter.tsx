import { AcademyAustraliaFooter } from "@/components/layout/AcademyAustraliaFooter";
import { StudentPayFooter } from "@/components/layout/StudentPayFooter";
import { getPlatformBrand } from "@/lib/provider-experience/branding";

export function PlatformFooter() {
  const brand = getPlatformBrand();

  if (brand === "academy-australia") {
    return <AcademyAustraliaFooter />;
  }

  return <StudentPayFooter />;
}
