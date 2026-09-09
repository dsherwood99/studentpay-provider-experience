import { notFound, redirect } from "next/navigation";
import { getNzCoursesForProvider } from "@/lib/nz-enrolment/courses";
import { getNzTenantBySlug, toPublicTenant } from "@/lib/nz-enrolment/tenants";

type PageProps = {
  params: Promise<{ providerSlug: string }>;
};

export default async function NzProviderEnrolPage({ params }: PageProps) {
  const { providerSlug } = await params;
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
      <p>Choose a course to continue.</p>
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
            <h2 style={{ marginTop: 0 }}>{course.name}</h2>
            <p>{course.description}</p>
            <a href={`/enrol/${tenant.slug}/${course.slug}`}>Enrol</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
