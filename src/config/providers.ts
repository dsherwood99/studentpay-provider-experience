import type { Provider } from "@/types/provider";

export const providers: Provider[] = [
  {
    code: "ACADEMY_AUSTRALIA",
    slug: "academy-australia",
    name: "Academy Australia",
    shortName: "Academy Australia",
    description:
      "Explore flexible, career-focused courses from Australian education providers and enrol through a guided online experience.",
    logoPath: "/providers/academy-australia/academy-australia-logo.png",
    supportEmail: "enrolments@academyaustralia.com",
    theme: {
  primaryColour: "#EF5865",
  secondaryColour: "#F7A04B",
  accentColour: "#FFD8BD",
  backgroundColour: "#FEF8F4",
  surfaceColour: "#FFFFFF",
  textColour: "#3D3D3D",
    mutedTextColour: "#6B6B6B",
},
  },
  {
    code: "BELA_BEAUTY_SANDBOX",
    slug: "bela-beauty-sandbox",
    name: "Bela Beauty College",
    shortName: "Bela Beauty",
    description:
      "AU sandbox catalogue for Bela Beauty College. Course prices come from the StudentPay catalogue API.",
    logoPath: "",
    supportEmail: "support@belabeautycollege.com",
    catalogueEnabled: true,
    theme: {
      primaryColour: "#C45C7A",
      secondaryColour: "#111111",
      accentColour: "#C45C7A",
      backgroundColour: "#FFF7FA",
      surfaceColour: "#FFFFFF",
      textColour: "#1A1A1A",
      mutedTextColour: "#5C5458",
    },
  },
];

export function getProviderBySlug(slug: string): Provider | undefined {
  return providers.find((provider) => provider.slug === slug);
}

export function getProviderByCode(code: string): Provider | undefined {
  return providers.find((provider) => provider.code === code);
}