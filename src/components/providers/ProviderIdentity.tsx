import Image from "next/image";
import type { Provider } from "@/types/provider";

type ProviderIdentityProps = {
  provider: Provider;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
};

export function ProviderIdentity({
  provider,
  width = 220,
  height = 80,
  className,
  priority = false,
}: ProviderIdentityProps) {
  if (provider.logoPath) {
    return (
      <Image
        src={provider.logoPath}
        alt={`${provider.name} logo`}
        width={width}
        height={height}
        className={className}
        priority={priority}
      />
    );
  }

  return (
    <p className={className ? `${className} provider-wordmark` : "provider-wordmark"}>
      {provider.name}
    </p>
  );
}
