/** Unlisted Academy Australia entry into the sandbox NZ checkout. */
export const ACADEMY_NZ_TEST_PAGE_PATH =
  "/providers/academy-australia/courses/professional-photography-nz-test";

export const ACADEMY_NZ_TEST_CHECKOUT_PATH =
  "/enrol/academy-nz-test/professional-photography-nz-test";

export const ACADEMY_NZ_TEST_COURSE_CODE = "ACADEMY_NZ_PHOTO_TEST";

/** Illustrative comparison schedule. Not Academy Australia's commercial fee. */
export const ACADEMY_NZ_TEST_PLAN = {
  courseFeeCents: 183_425,
  regularInstalmentCents: 2_500,
  upfrontCents: 0,
  frequency: "Weekly",
} as const;

export function academyNzTestCheckoutHref(): string {
  const configured = process.env.NEXT_PUBLIC_ACADEMY_NZ_TEST_CHECKOUT_URL?.trim().replace(
    /\/$/,
    "",
  );
  const path = `${ACADEMY_NZ_TEST_CHECKOUT_PATH}?timings=1`;
  return configured ? `${configured}${path}` : path;
}
