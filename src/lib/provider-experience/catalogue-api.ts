import "server-only";

import type { PublicCatalogueCourse } from "@/types/catalogue";
import {
  CATALOGUE_API_KEY_MISSING,
  CATALOGUE_COURSE_FAILED,
  CATALOGUE_LIST_FAILED,
  catalogueCourseFromHttp,
  catalogueListFromHttp,
} from "@/lib/provider-experience/catalogue-availability";
import { resolveCatalogueBinding } from "@/lib/provider-experience/provider-bindings";

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

export function getCatalogueApiKey(providerCode: string): string {
  return resolveCatalogueBinding(providerCode)?.apiKey || "";
}

async function catalogueFetch(
  providerCode: string,
  path: string,
): Promise<{ response: Response; bindingApiBaseUrl: string }> {
  const binding = resolveCatalogueBinding(providerCode);

  if (!binding?.apiKey) {
    throw new CatalogueRequestError(
      503,
      CATALOGUE_API_KEY_MISSING,
      `Catalogue API key is not configured for ${providerCode}`,
    );
  }

  const response = await fetch(`${binding.apiBaseUrl}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${binding.apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  return { response, bindingApiBaseUrl: binding.apiBaseUrl };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchProviderCourses(
  providerCode: string,
): Promise<PublicCatalogueCourse[]> {
  const { response } = await catalogueFetch(
    providerCode,
    `/v1/providers/${encodeURIComponent(providerCode)}/courses`,
  );
  const body = (await readJson(response)) as CatalogueListResponse;
  const parsed = catalogueListFromHttp(response.status, body);

  if (parsed.status === "unavailable") {
    throw new CatalogueRequestError(
      response.status || 503,
      parsed.code || CATALOGUE_LIST_FAILED,
      parsed.message,
    );
  }

  return parsed.courses as PublicCatalogueCourse[];
}

export async function fetchProviderCourse(
  providerCode: string,
  courseCode: string,
): Promise<PublicCatalogueCourse | null> {
  const { response } = await catalogueFetch(
    providerCode,
    `/v1/providers/${encodeURIComponent(providerCode)}/courses/${encodeURIComponent(courseCode)}`,
  );
  const body = (await readJson(response)) as CatalogueCourseResponse;
  const parsed = catalogueCourseFromHttp(response.status, body, courseCode);

  if (parsed.status === "unavailable") {
    throw new CatalogueRequestError(
      response.status || 503,
      parsed.code || CATALOGUE_COURSE_FAILED,
      parsed.message,
    );
  }

  if (parsed.status === "missing") {
    return null;
  }

  return parsed.course as PublicCatalogueCourse;
}
