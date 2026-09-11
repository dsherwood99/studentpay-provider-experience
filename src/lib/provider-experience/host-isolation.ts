import { isNzEnrolmentProductAvailable } from "../nz-enrolment/environment.ts";
import { getDefaultProductionNzTenantSlug, listActiveNzTenants } from "../nz-enrolment/tenants.ts";
import { getProviderBySlug } from "../../config/providers.ts";
import { getCatalogueProductionBoundSlug } from "./provider-bindings.ts";
import type { Provider } from "../../types/provider.ts";

export const BELA_PRODUCTION_SLUG = "bela-beauty-college";

export function dedicatedNzEnrolmentHomePath(): string | null {
  if (!isNzEnrolmentProductAvailable()) {
    return null;
  }
  const slug = getDefaultProductionNzTenantSlug(listActiveNzTenants());
  return slug ? `/enrol/${slug}` : null;
}

export function dedicatedProductionHomePath(): string | null {
  const slug = getCatalogueProductionBoundSlug();
  if (slug) {
    return `/providers/${slug}/courses`;
  }
  return dedicatedNzEnrolmentHomePath();
}

export function isDedicatedCatalogueProductionHost(): boolean {
  return getCatalogueProductionBoundSlug() !== null;
}

export function isDedicatedBelaProductionHost(): boolean {
  return getCatalogueProductionBoundSlug() === BELA_PRODUCTION_SLUG;
}

export function getDedicatedProductionProvider(): Provider | undefined {
  const slug = getCatalogueProductionBoundSlug();
  return slug ? getProviderBySlug(slug) : undefined;
}

export function dedicatedHostHidesGenericDemoChrome(): boolean {
  return isDedicatedCatalogueProductionHost() || isNzEnrolmentProductAvailable();
}

export function dedicatedHostPlatformBrand(): "bela-beauty-college" | null {
  return isDedicatedBelaProductionHost() ? "bela-beauty-college" : null;
}
