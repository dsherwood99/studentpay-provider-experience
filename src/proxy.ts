import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { dedicatedProductionHomePath } from "@/lib/provider-experience/host-isolation";

const ACADEMY_NZ_TEST_PAGE_PATH =
  "/providers/academy-australia/courses/professional-photography-nz-test";

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  if (request.nextUrl.pathname === ACADEMY_NZ_TEST_PAGE_PATH) {
    requestHeaders.set("x-academy-nz-test-page", "1");
  }

  const homePath = dedicatedProductionHomePath();
  if (homePath && request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = homePath;
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/",
    "/providers/academy-australia/courses/professional-photography-nz-test",
  ],
};
