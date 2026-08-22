import { ProviderDemoBanner } from "@/components/layout/ProviderDemoBanner";

export default function ProvidersLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <ProviderDemoBanner />
      {children}
    </>
  );
}
