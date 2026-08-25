export const CATALOGUE_NOT_ENABLED = "CATALOGUE_NOT_ENABLED";
export const CATALOGUE_API_KEY_MISSING = "CATALOGUE_API_KEY_MISSING";
export const CATALOGUE_LIST_FAILED = "CATALOGUE_LIST_FAILED";
export const CATALOGUE_COURSE_FAILED = "CATALOGUE_COURSE_FAILED";
export const COURSE_NOT_FOUND = "COURSE_NOT_FOUND";

export type CatalogueUnavailableState = {
  status: "unavailable";
  code: string;
  message: string;
};

export function readCatalogueErrorCode(body: unknown): string {
  if (!body || typeof body !== "object") {
    return "";
  }

  const error = (body as { error?: { code?: string; message?: string } }).error;
  return String(error?.code || "").trim();
}

export function catalogueUnavailableCopy(
  code: string,
  providerName: string,
): { title: string; body: string } {
  if (code === CATALOGUE_NOT_ENABLED) {
    return {
      title: `${providerName} enrolment is not available yet`,
      body: `Hosted enrolment and catalogue are not enabled for ${providerName}. Courses, prices and enrolment are hidden until StudentPay turns those flags on in Salesforce.`,
    };
  }

  if (code === CATALOGUE_API_KEY_MISSING) {
    return {
      title: `${providerName} is not configured`,
      body: "This Provider Experience deployment does not have a server-side API key for this provider. No courses are shown.",
    };
  }

  return {
    title: `${providerName} courses are unavailable`,
    body: "The StudentPay catalogue could not be loaded. No fallback courses or prices are shown.",
  };
}

export function catalogueListFromHttp(
  status: number,
  body: unknown,
):
  | { status: "ready"; courses: unknown[] }
  | CatalogueUnavailableState {
  if (status === 200) {
    const courses = (body as { courses?: unknown[] } | null)?.courses;
    return {
      status: "ready",
      courses: Array.isArray(courses) ? courses : [],
    };
  }

  const code =
    readCatalogueErrorCode(body) ||
    (status === 404 ? CATALOGUE_NOT_ENABLED : CATALOGUE_LIST_FAILED);

  if (code === COURSE_NOT_FOUND) {
    return {
      status: "unavailable",
      code: CATALOGUE_NOT_ENABLED,
      message: "Catalogue is not enabled for this provider.",
    };
  }

  return {
    status: "unavailable",
    code,
    message:
      catalogueUnavailableCopy(code, "This provider").body,
  };
}

export function catalogueCourseFromHttp(
  status: number,
  body: unknown,
  expectedCourseCode: string,
):
  | { status: "ready"; course: unknown }
  | { status: "missing" }
  | CatalogueUnavailableState {
  if (status === 200) {
    const course = (body as { course?: { course_code?: string } } | null)?.course;

    if (!course || course.course_code !== expectedCourseCode) {
      return { status: "missing" };
    }

    return { status: "ready", course };
  }

  const code = readCatalogueErrorCode(body);

  if (status === 404 && (code === COURSE_NOT_FOUND || !code)) {
    return { status: "missing" };
  }

  return {
    status: "unavailable",
    code: code || CATALOGUE_NOT_ENABLED,
    message: catalogueUnavailableCopy(code || CATALOGUE_NOT_ENABLED, "This provider")
      .body,
  };
}
