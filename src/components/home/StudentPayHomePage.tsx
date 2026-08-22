import Image from "next/image";
import Link from "next/link";
import { providers } from "@/config/providers";

type CapabilityStatus = "available" | "demo" | "in-development";

type Capability = {
  title: string;
  description: string;
  status: CapabilityStatus;
};

const enrolmentCapabilities: Capability[] = [
  {
    title: "Course & pricing configuration",
    description:
      "Provider course catalogues, fees, deposits and repayment schedules defined in configuration.",
    status: "available",
  },
  {
    title: "Provider-branded checkout",
    description:
      "Course pages and checkout surfaces inherit each provider's logo, colours and content.",
    status: "available",
  },
  {
    title: "Student details",
    description:
      "Guided capture of student identity, address, emergency contact and supporting information.",
    status: "available",
  },
  {
    title: "Deposit / upfront payment",
    description:
      "Pay-in-full and deposit-plus-plan options with card tokenisation via Pinch.",
    status: "available",
  },
  {
    title: "StudentPay payment plan",
    description:
      "Weekly, fortnightly or monthly instalment plans with configurable start dates.",
    status: "available",
  },
  {
    title: "Direct debit authorisation",
    description:
      "Embedded and popup direct debit setup flows connected to StudentPay checkout sessions.",
    status: "available",
  },
  {
    title: "Payment Plan Agreement",
    description:
      "Personalised agreement content loaded from StudentPay legal endpoints after checkout creation.",
    status: "available",
  },
  {
    title: "Direct Debit Service Agreement",
    description:
      "Provider-scoped direct debit terms presented during enrolment acceptance.",
    status: "available",
  },
  {
    title: "Electronic acceptance",
    description:
      "Checkbox consents and timestamped acceptance captured before enrolment confirmation.",
    status: "available",
  },
  {
    title: "Agreement PDF generation",
    description:
      "Downloadable agreement artefacts for students and providers after enrolment.",
    status: "in-development",
  },
  {
    title: "Provider-specific configuration",
    description:
      "Per-provider themes, catalogue content and API binding without forking the application.",
    status: "available",
  },
  {
    title: "API-driven enrolment",
    description:
      "Create and confirm checkouts through the StudentPay Provider Checkout API.",
    status: "available",
  },
];

const integrationCapabilities: Capability[] = [
  {
    title: "Provider Checkout API",
    description:
      "Create checkout sessions, direct debit setup URLs and confirm enrolments via REST endpoints.",
    status: "available",
  },
  {
    title: "Sandbox & mock modes",
    description:
      "Sandbox API integration with optional local mock mode for development without credentials.",
    status: "available",
  },
  {
    title: "Pinch card capture",
    description:
      "Publishable-key card tokenisation for upfront and deposit payments.",
    status: "available",
  },
  {
    title: "Production provider binding",
    description:
      "Environment-scoped hard binding for dedicated provider production demos.",
    status: "demo",
  },
  {
    title: "Webhook & event callbacks",
    description:
      "Asynchronous enrolment and payment status notifications to provider systems.",
    status: "in-development",
  },
  {
    title: "Embedded enrolment SDK",
    description:
      "Drop-in components for provider websites and learning management systems.",
    status: "in-development",
  },
];

function statusLabel(status: CapabilityStatus): string {
  if (status === "available") {
    return "Available";
  }

  if (status === "demo") {
    return "Demo";
  }

  return "In development";
}

function CapabilityCard({ capability }: { capability: Capability }) {
  return (
    <article className="sp-capability-card">
      <div className="sp-capability-card__meta">
        <span
          className={`sp-status-badge sp-status-badge--${capability.status}`}
        >
          {statusLabel(capability.status)}
        </span>
      </div>
      <h3>{capability.title}</h3>
      <p>{capability.description}</p>
    </article>
  );
}

export function StudentPayHomePage() {
  const demoProviders = providers.map((provider) => ({
    ...provider,
    demoLabel:
      provider.slug === "academy-australia"
        ? "Demo education provider"
        : "Demonstration provider",
    demoDescription:
      provider.slug === "academy-australia"
        ? "Flexible online education example demonstrating a StudentPay-powered enrolment and payment-plan journey."
        : provider.description,
  }));

  return (
    <>
      <section className="sp-hero">
        <div className="page-shell sp-hero__inner">
          <p className="sp-hero__descriptor">StudentPay Product Environment</p>

          <div className="sp-hero__titles">
            <h1>StudentPay</h1>
            <p className="sp-hero__subtitle">Provider Experience</p>
          </div>

          <p className="sp-hero__lead">
            Reusable enrolment and payment experiences for education providers.
          </p>

          <p className="sp-hero__supporting">
            Explore StudentPay&apos;s provider-facing enrolment, payment-plan and
            integration experiences. These demonstrations show how StudentPay can
            be embedded into an education provider&apos;s enrolment journey while
            retaining the provider&apos;s own brand and student experience.
          </p>

          <div className="sp-hero__actions">
            <Link href="/#provider-demos" className="sp-button sp-button--primary">
              Explore provider demos
            </Link>
            <Link
              href="/#integration-capabilities"
              className="sp-button sp-button--secondary"
            >
              View integration capabilities
            </Link>
          </div>
        </div>
      </section>

      <section className="sp-section" id="provider-demos">
        <div className="page-shell">
          <div className="sp-section-heading">
            <h2>Provider demonstrations</h2>
            <p>
              Each demonstration provider showcases how StudentPay enrolment and
              payment capabilities can be presented within a provider&apos;s own
              brand and course catalogue.
            </p>
          </div>

          <div className="sp-provider-demo-grid">
            {demoProviders.map((provider) => (
              <article key={provider.slug} className="sp-provider-demo-card">
                <div className="sp-provider-demo-card__brand">
                  <Image
                    src={provider.logoPath}
                    alt={`${provider.name} logo`}
                    width={200}
                    height={72}
                    className="sp-provider-demo-card__logo"
                  />
                </div>

                <div className="sp-provider-demo-card__body">
                  <h3>{provider.name}</h3>
                  <p className="sp-provider-demo-card__label">
                    {provider.demoLabel}
                  </p>
                  <p>{provider.demoDescription}</p>
                </div>

                <div className="sp-provider-demo-card__actions">
                  <Link
                    href={`/providers/${provider.slug}`}
                    className="sp-button sp-button--primary sp-button--small"
                  >
                    View provider
                  </Link>
                  <Link
                    href={`/providers/${provider.slug}/courses`}
                    className="sp-button sp-button--ghost sp-button--small"
                  >
                    Explore courses
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="sp-section sp-section--muted" id="enrolment-checkout">
        <div className="page-shell">
          <div className="sp-section-heading">
            <h2>StudentPay Enrolment Checkout</h2>
            <p>
              A configurable enrolment and payment experience that can be
              embedded into an education provider&apos;s existing enrolment
              journey.
            </p>
          </div>

          <div className="sp-capability-grid">
            {enrolmentCapabilities.map((capability) => (
              <CapabilityCard key={capability.title} capability={capability} />
            ))}
          </div>

          <div className="sp-section-cta">
            <p>
              Try the full checkout flow on the Criminal Psychology demonstration
              course.
            </p>
            <Link
              href="/providers/academy-australia/courses/criminal-psychology/enrol"
              className="sp-button sp-button--primary"
            >
              Open sample enrolment checkout
            </Link>
          </div>
        </div>
      </section>

      <section className="sp-section" id="integration-capabilities">
        <div className="page-shell">
          <div className="sp-section-heading">
            <h2>Integration capabilities</h2>
            <p>
              APIs, configuration patterns and deployment modes that support
              provider-specific implementations built from this product
              environment.
            </p>
          </div>

          <div className="sp-capability-grid sp-capability-grid--compact">
            {integrationCapabilities.map((capability) => (
              <CapabilityCard key={capability.title} capability={capability} />
            ))}
          </div>

          <div className="sp-roadmap-note">
            <p>
              Future areas such as <code>/providers</code>,{" "}
              <code>/components</code>, <code>/integrations</code>,{" "}
              <code>/api</code> and <code>/docs</code> will extend this
              environment as the StudentPay product surface matures.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
