export type ProviderTheme = {
  primaryColour: string;
  secondaryColour: string;
  accentColour: string;
  backgroundColour: string;
  surfaceColour: string;
  textColour: string;
  mutedTextColour: string;
};

export type Provider = {
  code: string;
  slug: string;
  name: string;
  shortName: string;
  description: string;
  logoPath: string;
  website?: string;
  supportEmail?: string;
  theme: ProviderTheme;
};