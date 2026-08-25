import "server-only";

import type { PublicCatalogueCourse } from "@/types/catalogue";

type CatalogueListResponse = {
  success?: boolean;
  provider_code?: string;
  courses?: PublicCatalogueCourse[];
  error?: {
    code?: string;
    message?: string;
  };
};

type CatalogueCourseResponse = {
  success?: boolean;
  provider_code?: string;
  course?: PublicCatalogueCourse;
  error?: {
    code?: string;
    message?: string;
  };
};

export class CatalogueRequestError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "CatalogueRequestError";
    this.status = status;
    this.code = code;
  }
}

function catalogueApiBaseUrl(): string {
  return (
    process.env.STUDENTPAY_API_BASE_URL?.replace(/\/$/, "") ||
    "https://sandbox-api.studentpay.com.au"
  );
}

export function getCatalogueApiKey(providerCode: string): string {
  if (providerCode === "BELA_BEAUTY_SANDBOX") {
    return process.env.BELA_BEAUTY_SANDBOX_API_KEY?.trim() || "";
  }

  return "";
}

async function catalogueFetch(
  providerCode: string,
  path: string,
): Promise<Response> {
  const apiKey = getCatalogueApiKey(providerCode);

  if (!apiKey) {
    throw new CatalogueRequestError(
      500,
      "CATALOGUE_API_KEY_MISSING",
      `Catalogue API key is not configured for ${providerCode}`,
    );
  }

  return fetch(`${catalogueApiBaseUrl()}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
}

export async function fetchProviderCourses(
  providerCode: string,
): Promise<PublicCatalogueCourse[]> {
  const response = await catalogueFetch(
    providerCode,
    `/v1/providers/${encodeURIComponent(providerCode)}/courses`,
  );

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new CatalogueRequestError(
      response.status,
      "CATALOGUE_LIST_FAILED",
      "Catalogue list request failed",
    );
  }

  const body = (await response.json()) as CatalogueListResponse;
  return Array.isArray(body.courses) ? body.courses : [];
}

export async function fetchProviderCourse(
  providerCode: string,
  courseCode: string,
): Promise<PublicCatalogueCourse | null> {
  const response = await catalogueFetch(
    providerCode,
    `/v1/providers/${encodeURIComponent(providerCode)}/courses/${encodeURIComponent(courseCode)}`,
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new CatalogueRequestError(
      response.status,
      "CATALOGUE_COURSE_FAILED",
      "Catalogue course request failed",
    );
  }

  const body = (await response.json()) as CatalogueCourseResponse;
  const course = body.course;

  if (!course || course.course_code !== courseCode) {
    return null;
  }

  return course;
}
