import Image from "next/image";
import type { Provider } from "@/types/provider";

type ProviderBrandProps = {
  provider: Provider;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
};

export function ProviderBrand({
  provider,
  width,
  height,
  className,
  priority,
}: ProviderBrandProps) {
  if (!provider.logoPath) {
    return (
      <strong className={className} style={{ display: "inline-block" }}>
        {provider.name}
      </strong>
    );
  }

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
