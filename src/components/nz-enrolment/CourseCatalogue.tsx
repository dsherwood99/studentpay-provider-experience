"use client";

import { useMemo, useState } from "react";
import { formatNzdFromCents, describeDerivedWeeklyPlan } from "@/lib/nz-enrolment/plan-math";
import { kitDisclosureForPolicy } from "@/lib/nz-enrolment/kit-policy";
import { coursePath } from "@/lib/nz-enrolment/presentation";
import type { NzPublicCourse, NzPublicTenant } from "@/lib/nz-enrolment/types";
import { ProviderNativeHeader } from "@/components/nz-enrolment/ProviderNativeHeader";
import styles from "./provider-chrome.module.css";

type Props = {
  tenant: NzPublicTenant;
  courses: NzPublicCourse[];
  reviewMode?: boolean;
};

export function NzCourseCatalogue({ tenant, courses, reviewMode = false }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const categories = useMemo(() => {
    return [...new Set(courses.map((course) => course.category).filter(Boolean))] as string[];
  }, [courses]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesCategory = category === "all" || course.category === category;
      const haystack = `${course.name} ${course.courseCode} ${course.category || ""}`.toLowerCase();
      const matchesQuery = !needle || haystack.includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [courses, query, category]);

  return (
    <>
      <ProviderNativeHeader tenant={tenant} />
      <section className={styles.catalogue}>
      <p className={styles.catalogueKicker}>{tenant.displayName}</p>
      <h1>Choose your course</h1>
      <p className={styles.catalogueLead}>
        If you arrived from a {tenant.displayName} course page, use that course’s enrolment
        link instead. This list is the fallback if you need to find a course here.
      </p>
      {!reviewMode && courses.some((course) => course.legalGateClosed) ? (
        <p className={styles.catalogueLead}>
          Payment plan amounts come from the provider catalogue. Enrolment stays closed
          until the provider agreement is active.
        </p>
      ) : null}
      {kitDisclosureForPolicy(tenant.kitPolicy) ? (
        <p className={styles.catalogueLead}>{kitDisclosureForPolicy(tenant.kitPolicy)}</p>
      ) : null}
      {courses.some((course) => course.catalogueOnly) ? (
        <p className={styles.catalogueLead}>
          Courses without an open payment plan show the provider’s published price.
        </p>
      ) : null}
      <div className={styles.filters}>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search courses"
          aria-label="Search courses"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <ul className={styles.grid}>
        {filtered.length === 0 ? (
          <li className={styles.empty}>No courses match that search.</li>
        ) : (
          filtered.map((course) => {
            const described =
              course.planPolicy.mode === "derived_regular"
                ? describeDerivedWeeklyPlan({
                    coursePriceCents: course.paymentPlanCourseFeeCents,
                    upfrontAmountCents: course.planPolicy.upfrontAmountCents,
                    regularInstalmentCents: course.planPolicy.regularInstalmentCents,
                  })
                : null;
            const describedPlanOpen =
              course.planPolicy.mode === "derived_regular" &&
              course.planPolicy.regularInstalmentCents > 0;
            const canStartPlan = reviewMode
              ? !course.catalogueOnly && describedPlanOpen
              : !course.catalogueOnly &&
                !course.legalGateClosed &&
                course.enrolmentPaymentOptions.includes("payment_plan");
            return (
            <li key={course.slug}>
              <article className={styles.card}>
                {course.category ? <p className={styles.category}>{course.category}</p> : null}
                <h2>
                  <a href={coursePath(tenant, course)}>{course.name}</a>
                </h2>
                {described ? (
                  <>
                    <p className={styles.price}>
                      Course fee{" "}
                      <strong>{formatNzdFromCents(course.paymentPlanCourseFeeCents)}</strong>
                    </p>
                    <p className={styles.note}>{described.summary}</p>
                    {canStartPlan ? (
                      <a className={styles.enrol} href={coursePath(tenant, course)}>
                        {reviewMode ? "Review checkout" : "Start payment plan"}
                      </a>
                    ) : (
                      <p className={styles.note}>
                        {course.legalGateClosed
                          ? "Enrolment is not open until the provider agreement is active."
                          : "StudentPay payment plan is not open yet."}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className={styles.price}>
                      Published price{" "}
                      <strong>{formatNzdFromCents(course.paymentPlanCourseFeeCents)}</strong>
                    </p>
                    <p className={styles.note}>StudentPay payment plan is not open yet.</p>
                    {course.websiteUrl ? (
                      <a href={course.websiteUrl}>View on the provider website</a>
                    ) : null}
                  </>
                )}
              </article>
            </li>
            );
          })
        )}
      </ul>
    </section>
    </>
  );
}
