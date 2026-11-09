import { redirect } from "next/navigation";
import { OliCheckoutRecoveryForm } from "@/components/nz-enrolment/OliCheckoutRecoveryForm";
import { isOliRecoverableCheckoutId } from "@/lib/nz-enrolment/checkout-recovery";
import { isNzEnrolmentProductAvailable } from "@/lib/nz-enrolment/environment";
import { readNzSession } from "@/lib/nz-enrolment/request-context";
import { getNzTenantBySlug } from "@/lib/nz-enrolment/tenants";

export default async function EnrolmentResumePage({
  searchParams,
}: {
  searchParams?: Promise<{ checkout?: string | string[] }>;
}) {
  if (!isNzEnrolmentProductAvailable()) {
    redirect("/");
  }

  const session = await readNzSession();
  const providerSlug = session?.providerSlug;
  const courseSlug = session?.courseSlug;
  if (providerSlug && courseSlug) {
    const tenant = getNzTenantBySlug(providerSlug);
    if (tenant) {
      redirect(`/enrol/${tenant.slug}/${courseSlug}?dda=return`);
    }
  }

  const resolved = searchParams ? await searchParams : {};
  const rawCheckout = Array.isArray(resolved.checkout)
    ? resolved.checkout[0]
    : resolved.checkout;
  const checkoutId = String(rawCheckout || "").trim();
  const showOliRecovery = !checkoutId || isOliRecoverableCheckoutId(checkoutId);

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
      {showOliRecovery ? (
        <>
          <p>
            Resume an Online Learning Institute enrolment without the original
            browser session. The enrolment reference alone is not enough — enter
            the email and date of birth used when you started.
          </p>
          <OliCheckoutRecoveryForm initialCheckoutId={checkoutId} />
        </>
      ) : (
        <p>
          Open your original StudentPay enrolment link to continue. This page only
          resumes a known StudentPay hosted checkout session.
        </p>
      )}
    </main>
  );
}
