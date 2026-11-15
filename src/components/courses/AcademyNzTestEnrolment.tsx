"use client";

import { useEffect, type MouseEvent } from "react";
import {
  ACADEMY_NZ_TEST_PLAN,
  academyNzTestCheckoutHref,
} from "@/lib/nz-enrolment/academy-nz-test";
import {
  navigationTiming,
  recordJourneyMark,
} from "@/lib/nz-enrolment/journey-timings";

function nzd(cents: number): string {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
  }).format(cents / 100);
}

export function AcademyNzTestEnrolment() {
  useEffect(() => {
    recordJourneyMark("academy_course_hydrated", navigationTiming());
    const frame = window.requestAnimationFrame(() => {
      recordJourneyMark("academy_course_usable", navigationTiming());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function enrol(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    recordJourneyMark("enrol_clicked", navigationTiming());
    const url = new URL(academyNzTestCheckoutHref(), window.location.href);
    url.searchParams.set("entry", "academy-course");
    url.searchParams.set("entryClickedAt", String(Date.now()));
    window.location.assign(url.toString());
  }

  const href = academyNzTestCheckoutHref();

  return (
    <aside className="simple-checkout" id="studentpay-checkout" data-testid="academy-nz-test-enrolment">
      <div className="simple-checkout__head">
        <p className="aa-script">New Zealand test</p>
        <h2>Enrol with StudentPay</h2>
        <p>
          This opens the existing StudentPay NZ checkout in the sandbox. It does
          not use the Australian card payment on this website.
        </p>
      </div>

      <div className="simple-checkout__form">
        <section className="simple-checkout__panel">
          <span className="simple-checkout__step">1</span>
          <div>
            <h3>Illustrative payment plan</h3>
            <div className="simple-checkout__choices">
              <label className="simple-checkout__choice is-selected">
                <input type="radio" name="academy_nz_test_plan" checked readOnly />
                <span>
                  <strong>Weekly payment plan</strong>
                  <small>
                    {nzd(ACADEMY_NZ_TEST_PLAN.regularInstalmentCents)} each week.
                    Illustrative schedule for comparison, not Academy
                    Australia&apos;s fee.
                  </small>
                  <b>{nzd(ACADEMY_NZ_TEST_PLAN.courseFeeCents)} course total</b>
                </span>
              </label>
            </div>
          </div>
        </section>

        <a
          href={href}
          className="button button--primary simple-checkout__action"
          data-testid="academy-nz-test-enrol"
          onClick={enrol}
        >
          Enrol with StudentPay
        </a>
        <p className="simple-checkout__note">
          No production enrolment, mandate, or payment is created from this test.
        </p>
      </div>
    </aside>
  );
}
