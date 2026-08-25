import "server-only";

import {
  CatalogueRequestError,
  fetchProviderCourse,
  fetchProviderCourses,
} from "@/lib/provider-experience/catalogue-api";
import {
  CATALOGUE_COURSE_FAILED,
  CATALOGUE_LIST_FAILED,
  type CatalogueUnavailableState,
  catalogueUnavailableCopy,
} from "@/lib/provider-experience/catalogue-availability";
import { isCatalogueProvider } from "@/lib/provider-experience/catalogue";
import {
  courseCodeFromSlug,
  toCatalogueCourseView,
  uniqueActiveCatalogueCourses,
} from "@/lib/provider-experience/catalogue-view";
import type { CatalogueCourseView } from "@/types/catalogue";
import type { Provider } from "@/types/provider";

export type CatalogueListLoad =
  | { status: "ready"; courses: CatalogueCourseView[] }
  | CatalogueUnavailableState;

export type CatalogueCourseLoad =
  | { status: "ready"; course: CatalogueCourseView }
  | { status: "missing" }
  | CatalogueUnavailableState;

function unavailableFromError(
  provider: Provider,
  error: unknown,
  fallbackCode: string,
): CatalogueUnavailableState {
  if (error instanceof CatalogueRequestError) {
    return {
      status: "unavailable",
      code: error.code,
      message: catalogueUnavailableCopy(error.code, provider.name).body,
    };
  }

  return {
    status: "unavailable",
    code: fallbackCode,
    message: catalogueUnavailableCopy(fallbackCode, provider.name).body,
  };
}

export async function listCatalogueCourses(
  provider: Provider,
): Promise<CatalogueListLoad> {
  if (!isCatalogueProvider(provider)) {
    return {
      status: "unavailable",
      code: CATALOGUE_LIST_FAILED,
      message: catalogueUnavailableCopy(CATALOGUE_LIST_FAILED, provider.name)
        .body,
    };
  }

  try {
    const coursesFromApi = await fetchProviderCourses(provider.code);
    return {
      status: "ready",
      courses: uniqueActiveCatalogueCourses(
        coursesFromApi.map((course) =>
          toCatalogueCourseView(provider.code, course),
        ),
      ),
    };
  } catch (error) {
    return unavailableFromError(provider, error, CATALOGUE_LIST_FAILED);
  }
}

export async function getCatalogueCourse(
  provider: Provider,
  courseSlug: string,
): Promise<CatalogueCourseLoad> {
  if (!isCatalogueProvider(provider)) {
    return { status: "missing" };
  }

  try {
    const courseCode = courseCodeFromSlug(courseSlug);
    const course = await fetchProviderCourse(provider.code, courseCode);

    if (!course) {
      return { status: "missing" };
    }

    const view = toCatalogueCourseView(provider.code, course);

    if (view.slug !== courseSlug) {
      return { status: "missing" };
    }

    return { status: "ready", course: view };
  } catch (error) {
    return unavailableFromError(provider, error, CATALOGUE_COURSE_FAILED);
  }
}
