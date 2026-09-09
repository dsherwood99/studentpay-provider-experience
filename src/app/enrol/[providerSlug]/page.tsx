import { notFound, redirect } from "next/navigation";
import { getNzCoursesForProvider } from "@/lib/nz-enrolment/courses";
import { isNzEnrolmentProductAvailable } from "@/lib/nz-enrolment/environment";
import { getNzTenantBySlug, toPublicTenant } from "@/lib/nz-enrolment/tenants";
import { formatNzdFromCents } from "@/lib/nz-enrolment/plan-math";

type PageProps = {
  params: Promise<{ providerSlug: string }>;
};

export default async function NzProviderEnrolPage({ params }: PageProps) {
  const { providerSlug } = await params;
  if (!isNzEnrolmentProductAvailable()) {
    notFound();
  }

  const tenant = getNzTenantBySlug(providerSlug);

  if (!tenant) {
    notFound();
  }

  const courses = getNzCoursesForProvider(tenant.slug);
  if (courses.length === 1) {
    redirect(`/enrol/${tenant.slug}/${courses[0].slug}`);
  }

  const publicTenant = toPublicTenant(tenant);

  return (
    <section className="sp-shell" style={{ padding: "48px 0 80px" }}>
      <p style={{ letterSpacing: "0.04em", textTransform: "uppercase", color: "#6f7d77" }}>
        Enrolment Checkout
      </p>
      <h1>{publicTenant.displayName}</h1>
      <p>Choose a course. Prices below are Payment Plan Course Fees.</p>
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 16 }}>
        {courses.map((course) => (
          <li
            key={course.slug}
            style={{
              border: "1px solid #e4ebe8",
              borderRadius: 16,
              padding: 20,
              background: "#fff",
            }}
          >
            {course.category ? (
              <p style={{ margin: "0 0 8px", color: "#6f7d77" }}>{course.category}</p>
            ) : null}
            <h2 style={{ marginTop: 0 }}>{course.name}</h2>
            <p>{course.description}</p>
            <p>
              Payment Plan Course Fee{" "}
              <strong>{formatNzdFromCents(course.paymentPlanCourseFeeCents)}</strong>
            </p>
            <p>
              Payment in Full of Course Fees{" "}
              {formatNzdFromCents(course.paymentInFullCourseFeeCents)}{" "}
              (not available in this checkout)
            </p>
            <a href={`/enrol/${tenant.slug}/${course.slug}`}>Enrol with a payment plan</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
