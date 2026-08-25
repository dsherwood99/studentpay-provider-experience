import { getProviderBySlug } from "../../config/providers.ts";
import { getCatalogueProductionBoundSlug } from "./provider-bindings.ts";
import type { Provider } from "../../types/provider.ts";

export const BELA_PRODUCTION_SLUG = "bela-beauty-college";

export function dedicatedProductionHomePath(): string | null {
  const slug = getCatalogueProductionBoundSlug();
  return slug ? `/providers/${slug}/courses` : null;
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
  return isDedicatedCatalogueProductionHost();
}

export function dedicatedHostPlatformBrand(): "bela-beauty-college" | null {
  return isDedicatedBelaProductionHost() ? "bela-beauty-college" : null;
}
