import { courses, getCourseBySlug as getConfiguredCourseBySlug } from "@/config/courses";
import {
  getProviderBySlug as getConfiguredProviderBySlug,
  providers,
} from "@/config/providers";
import type { Course } from "@/types/course";
import type { Provider } from "@/types/provider";

export const academyAustralia: Provider = providers[0];

export const criminalPsychology: Course =
  courses.find((course) => course.slug === "criminal-psychology") ?? courses[0];

export function getProviderBySlug(slug: string): Provider | undefined {
  return getConfiguredProviderBySlug(slug);
}

export function getCourseBySlug(
  providerCode: string,
  courseSlug: string,
): Course | undefined {
  return getConfiguredCourseBySlug(providerCode, courseSlug);
}

export function isCatalogueProvider(
  provider: Provider | undefined,
): provider is Provider & { catalogueEnabled: true } {
  return provider?.catalogueEnabled === true;
}
