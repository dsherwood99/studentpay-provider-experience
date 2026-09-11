"use client";

import { useMemo, useState } from "react";
import { formatNzdFromCents } from "@/lib/nz-enrolment/plan-math";
import { coursePath } from "@/lib/nz-enrolment/presentation";
import type { NzPublicCourse, NzPublicTenant } from "@/lib/nz-enrolment/types";
import styles from "./provider-chrome.module.css";

type Props = {
  tenant: NzPublicTenant;
  courses: NzPublicCourse[];
};

export function NzCourseCatalogue({ tenant, courses }: Props) {
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
    <section className={styles.catalogue}>
      <p className={styles.catalogueKicker}>{tenant.displayName}</p>
      <h1>Choose your course</h1>
      <p className={styles.catalogueLead}>
        If you arrived from a {tenant.displayName} course page, use that course’s enrolment
        link instead. This list is the fallback if you need to find a course here.
      </p>
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
          filtered.map((course) => (
            <li key={course.slug}>
              <article className={styles.card}>
                {course.category ? <p className={styles.category}>{course.category}</p> : null}
                <h2>{course.name}</h2>
                <p className={styles.price}>
                  Course fee{" "}
                  <strong>{formatNzdFromCents(course.paymentPlanCourseFeeCents)}</strong>
                </p>
                <p className={styles.price}>Payment plan available</p>
                <a className={styles.enrol} href={coursePath(tenant, course)}>
                  Start payment plan
                </a>
              </article>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
