import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/enrol/[providerSlug]/[courseSlug]": [
      "./docs/provider-terms-architecture/artefacts/BELA_NZ_agreement_skeleton.html",
      "./docs/provider-terms-architecture/artefacts/BELA_NZ_agreement_skeleton.meta.json",
    ],
    "/api/enrolment-checkout": [
      "./docs/provider-terms-architecture/artefacts/BELA_NZ_agreement_skeleton.html",
      "./docs/provider-terms-architecture/artefacts/BELA_NZ_agreement_skeleton.meta.json",
    ],
  },
};

export default nextConfig;
