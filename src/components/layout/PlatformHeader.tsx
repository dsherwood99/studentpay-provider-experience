import { AcademyAustraliaHeader } from "@/components/layout/AcademyAustraliaHeader";
import { StudentPayHeader } from "@/components/layout/StudentPayHeader";
import { getPlatformBrand } from "@/lib/provider-experience/branding";

export function PlatformHeader() {
  const brand = getPlatformBrand();

  if (brand === "academy-australia") {
    return <AcademyAustraliaHeader />;
  }

  return <StudentPayHeader />;
}
