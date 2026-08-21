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
  primaryColour: "#F45F68",
  secondaryColour: "#FF9A4D",
  accentColour: "#FFD8BD",
  backgroundColour: "#FFF9F4",
  surfaceColour: "#FFFFFF",
  textColour: "#43464B",
  mutedTextColour: "#666A71",
},
  },
  {
    code: "BELA_BEAUTY_SANDBOX",
    slug: "bela-beauty-sandbox",
    name: "Bela Beauty College",
    shortName: "Bela Beauty",
    description:
      "AU sandbox enrolment for the draft Bela Beauty College Student Agreement. Synthetic students only.",
    logoPath: "",
    supportEmail: "support@belabeautycollege.com",
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