import { redirect } from "next/navigation";
import { getNzCourse } from "@/lib/nz-enrolment/courses";
import { isNzEnrolmentProductAvailable } from "@/lib/nz-enrolment/environment";
import { readNzSession } from "@/lib/nz-enrolment/request-context";
import { getNzTenantBySlug } from "@/lib/nz-enrolment/tenants";

export default async function EnrolmentResumePage() {
  if (!isNzEnrolmentProductAvailable()) {
    redirect("/");
  }

  const session = await readNzSession();
  const providerSlug = session?.providerSlug;
  const courseSlug = session?.courseSlug;
  if (providerSlug && courseSlug) {
    const tenant = getNzTenantBySlug(providerSlug);
    const course = tenant ? getNzCourse(providerSlug, courseSlug) : undefined;
    if (tenant && course) {
      redirect(`/enrol/${tenant.slug}/${course.slug}?dda=return`);
    }
  }

  return (
    <main
      style={{
        maxWidth: 640,
        margin: "48px auto",
        padding: "0 20px",
        fontFamily: "Inter, Segoe UI, sans-serif",
        color: "#1c2b24",
      }}
    >
      <h1 style={{ fontSize: "1.45rem" }}>Return to enrolment</h1>
      <p>
        Open your original StudentPay enrolment link to continue. This page only
        resumes a known StudentPay hosted checkout session.
      </p>
    </main>
  );
}
