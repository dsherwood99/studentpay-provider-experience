import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { dedicatedProductionHomePath } from "@/lib/provider-experience/host-isolation";

export function proxy(request: NextRequest) {
  const homePath = dedicatedProductionHomePath();

  if (!homePath) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = homePath;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/",
};
