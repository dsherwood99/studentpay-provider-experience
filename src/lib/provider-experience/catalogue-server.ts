import "server-only";

import { fetchProviderCourse, fetchProviderCourses } from "@/lib/provider-experience/catalogue-api";
import { isCatalogueProvider } from "@/lib/provider-experience/catalogue";
import {
  courseCodeFromSlug,
  toCatalogueCourseView,
  uniqueActiveCatalogueCourses,
} from "@/lib/provider-experience/catalogue-view";
import type { CatalogueCourseView } from "@/types/catalogue";
import type { Provider } from "@/types/provider";

export async function listCatalogueCourses(
  provider: Provider,
): Promise<CatalogueCourseView[]> {
  if (!isCatalogueProvider(provider)) {
    return [];
  }

  const coursesFromApi = await fetchProviderCourses(provider.code);
  return uniqueActiveCatalogueCourses(
    coursesFromApi.map((course) => toCatalogueCourseView(provider.code, course)),
  );
}

export async function getCatalogueCourse(
  provider: Provider,
  courseSlug: string,
): Promise<CatalogueCourseView | null> {
  if (!isCatalogueProvider(provider)) {
    return null;
  }

  const courseCode = courseCodeFromSlug(courseSlug);
  const course = await fetchProviderCourse(provider.code, courseCode);

  if (!course) {
    return null;
  }

  const view = toCatalogueCourseView(provider.code, course);

  if (view.slug !== courseSlug) {
    return null;
  }

  return view;
}
