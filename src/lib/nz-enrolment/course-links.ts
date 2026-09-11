import { getNzCoursesForProvider } from "./courses.ts";
import {
  currentCourseDeepLink,
  futureCourseDeepLink,
  providerCourseWebsiteUrl,
} from "./presentation.ts";
import { toPublicTenant } from "./tenants.ts";
import type { NzPublicTenant, NzTenant } from "./types.ts";

export type NzCourseLinkMapping = {
  providerSlug: string;
  courseName: string;
  courseCode: string;
  websiteUrl: string | null;
  studentPaySlug: string;
  currentDeepLink: string;
  futureProviderDomainDeepLink: string;
};

export function buildCourseLinkMapping(
  tenant: NzTenant,
): NzCourseLinkMapping[] {
  const publicTenant: NzPublicTenant = toPublicTenant(tenant);
  return getNzCoursesForProvider(tenant.slug).map((course) => ({
    providerSlug: tenant.slug,
    courseName: course.name,
    courseCode: course.courseCode,
    websiteUrl: providerCourseWebsiteUrl(publicTenant, course),
    studentPaySlug: course.slug,
    currentDeepLink: currentCourseDeepLink(publicTenant, course),
    futureProviderDomainDeepLink: futureCourseDeepLink(publicTenant, course),
  }));
}
