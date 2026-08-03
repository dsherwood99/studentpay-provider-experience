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
];

export function getProviderBySlug(slug: string): Provider | undefined {
  return providers.find((provider) => provider.slug === slug);
}

export function getProviderByCode(code: string): Provider | undefined {
  return providers.find((provider) => provider.code === code);
}