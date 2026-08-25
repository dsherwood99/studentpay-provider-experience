import { redirect } from "next/navigation";
import { AcademyAustraliaHomePage } from "@/components/home/AcademyAustraliaHomePage";
import { StudentPayHomePage } from "@/components/home/StudentPayHomePage";
import { getPlatformBrand } from "@/lib/provider-experience/branding";
import { dedicatedProductionHomePath } from "@/lib/provider-experience/host-isolation";

export default function HomePage() {
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
