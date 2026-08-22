import { isAcademyProductionDemo } from "@/lib/provider-experience/checkout";

export { isAcademyProductionDemo };

export type PlatformBrand = "studentpay" | "academy-australia";

/** Which platform shell (header, footer, homepage) to render for this deployment. */
export function getPlatformBrand(): PlatformBrand {
  return isAcademyProductionDemo() ? "academy-australia" : "studentpay";
}

export function isStudentPayPlatform(): boolean {
  return getPlatformBrand() === "studentpay";
}
