export type ProviderBindingEnvironment = "production" | "sandbox";

export type ProviderBinding = {
  slug: string;
  providerCode: string;
  displayName: string;
  apiKeyEnv: string;
  accountIdEnv: string;
  defaultAccountId: string;
  defaultApiBaseUrl: string;
  catalogueCapable: boolean;
  environment: ProviderBindingEnvironment;
};

const PRODUCTION_API_BASE_URL = "https://api.studentpay.com.au";
const SANDBOX_API_BASE_URL = "https://sandbox-api.studentpay.com.au";

export const PROVIDER_BINDINGS: readonly ProviderBinding[] = [
  {
    slug: "bela-beauty-college",
    providerCode: "BELA",
    displayName: "Bela Beauty College",
    apiKeyEnv: "BELA_API_KEY",
    accountIdEnv: "STUDENTPAY_PROVIDER_ACCOUNT_ID",
    defaultAccountId: "001Mp00000WkleDIAR",
    defaultApiBaseUrl: PRODUCTION_API_BASE_URL,
    catalogueCapable: true,
    environment: "production",
  },
  {
    slug: "bela-beauty-sandbox",
    providerCode: "BELA_BEAUTY_SANDBOX",
    displayName: "Bela Beauty College",
    apiKeyEnv: "BELA_BEAUTY_SANDBOX_API_KEY",
    accountIdEnv: "BELA_BEAUTY_SANDBOX_PROVIDER_ACCOUNT_ID",
    defaultAccountId: "0018r000017BAHFAA4",
    defaultApiBaseUrl: SANDBOX_API_BASE_URL,
    catalogueCapable: true,
    environment: "sandbox",
  },
];

function trimEnv(name: string): string {
  return process.env[name]?.trim() || "";
}

export function getProviderBindingBySlug(
  slug: string,
): ProviderBinding | undefined {
  return PROVIDER_BINDINGS.find((binding) => binding.slug === slug);
}

export function getProviderBindingByCode(
  providerCode: string,
): ProviderBinding | undefined {
  return PROVIDER_BINDINGS.find(
    (binding) => binding.providerCode === providerCode,
  );
}

export function getCatalogueBindingByCode(
  providerCode: string,
): ProviderBinding | undefined {
  const binding = getProviderBindingByCode(providerCode);
  return binding?.catalogueCapable ? binding : undefined;
}

export function configuredDeploymentProviderCode(): string {
  return (
    process.env.ACADEMY_PROVIDER_CODE ||
    process.env.STUDENTPAY_PROVIDER_CODE ||
    ""
  )
    .trim()
    .toUpperCase();
}

export function getCatalogueProductionBoundSlug(): string | null {
  const code = configuredDeploymentProviderCode();
  const binding = getCatalogueBindingByCode(code);

  if (binding?.environment === "production") {
    return binding.slug;
  }

  return null;
}

export function isProviderSlugBlockedByDeployment(slug: string): boolean {
  const catalogueBoundSlug = getCatalogueProductionBoundSlug();

  if (catalogueBoundSlug) {
    return slug !== catalogueBoundSlug;
  }

  // Dedicated Academy production demo is not catalogue-bound, but it is still
  // a single-provider host and must not render Bela catalogue routes.
  if (configuredDeploymentProviderCode() === "ACADEMYAU") {
    return slug !== "academy-australia";
  }

  return false;
}

export function resolveBindingApiKey(binding: ProviderBinding): string {
  return trimEnv(binding.apiKeyEnv);
}

export function resolveBindingAccountId(binding: ProviderBinding): string {
  if (binding.accountIdEnv === "STUDENTPAY_PROVIDER_ACCOUNT_ID") {
    const boundCode = configuredDeploymentProviderCode();

    if (boundCode === binding.providerCode) {
      return trimEnv(binding.accountIdEnv) || binding.defaultAccountId;
    }

    return binding.defaultAccountId;
  }

  return trimEnv(binding.accountIdEnv) || binding.defaultAccountId;
}

export function resolveBindingApiBaseUrl(binding: ProviderBinding): string {
  return binding.defaultApiBaseUrl.replace(/\/$/, "");
}

export type ResolvedCatalogueBinding = {
  apiKey: string;
  providerCode: string;
  providerAccountId: string;
  apiBaseUrl: string;
};

export function resolveCatalogueBinding(
  providerCode: string,
): ResolvedCatalogueBinding | null {
  const binding = getCatalogueBindingByCode(providerCode);

  if (!binding) {
    return null;
  }

  return {
    apiKey: resolveBindingApiKey(binding),
    providerCode: binding.providerCode,
    providerAccountId: resolveBindingAccountId(binding),
    apiBaseUrl: resolveBindingApiBaseUrl(binding),
  };
}

export function bindingUsesApiKeyEnv(
  binding: ProviderBinding,
  envName: string,
): boolean {
  return binding.apiKeyEnv === envName;
}
