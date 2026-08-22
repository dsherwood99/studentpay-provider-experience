import { AcademyAustraliaHomePage } from "@/components/home/AcademyAustraliaHomePage";
import { StudentPayHomePage } from "@/components/home/StudentPayHomePage";
import { getPlatformBrand } from "@/lib/provider-experience/branding";

export default function HomePage() {
  const brand = getPlatformBrand();

  if (brand === "academy-australia") {
    return <AcademyAustraliaHomePage />;
  }

  return <StudentPayHomePage />;
}
