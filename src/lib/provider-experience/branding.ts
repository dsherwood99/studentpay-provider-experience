import { isAcademyProductionDemo } from "@/lib/provider-experience/checkout";
import { dedicatedHostPlatformBrand } from "@/lib/provider-experience/host-isolation";

export { isAcademyProductionDemo };

export type PlatformBrand =
  | "studentpay"
  | "academy-australia"
  | "bela-beauty-college";

/** Which platform shell (header, footer, homepage) to render for this deployment. */
export function getPlatformBrand(): PlatformBrand {
  if (isAcademyProductionDemo()) {
    return "academy-australia";
  }

  return dedicatedHostPlatformBrand() ?? "studentpay";
}

export function isStudentPayPlatform(): boolean {
  return getPlatformBrand() === "studentpay";
}
