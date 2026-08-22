import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  Code2,
  CreditCard,
  FileCheck2,
  FileText,
  Layers3,
  Plug,
  Settings2,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";
import { providers } from "@/config/providers";

type CapabilityStatus = "available" | "demo" | "in-development";

type Capability = {
  title: string;
  description: string;
  status: CapabilityStatus;
  icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
};

const checkoutCapabilities: Capability[] = [
  {
    title: "Provider-branded enrolment",
    description:
      "Course pages and checkout inherit each provider's logo, colours and content.",
    status: "available",
    icon: Building2,
  },
  {
    title: "Course and student information",
    description:
      "Structured capture of course selection, student identity, address and supporting details.",
    status: "available",
    icon: UserRound,
  },
  {
    title: "Payment-plan calculation",
    description:
      "Deposit, instalment amounts, frequency and start-date configuration from course pricing.",
    status: "available",
    icon: Wallet,
  },
  {
    title: "Deposit handling",
    description:
      "Upfront and deposit-plus-plan payment paths with card tokenisation via Pinch.",
    status: "available",
    icon: CreditCard,
  },
  {
    title: "Direct debit authorisation",
    description:
      "Embedded and popup direct debit setup connected to StudentPay checkout sessions.",
    status: "available",
    icon: ShieldCheck,
  },
  {
    title: "StudentPay Payment Plan Agreement",
    description:
      "Personalised agreement content from StudentPay legal endpoints after checkout creation.",
    status: "available",
    icon: FileText,
  },
  {
    title: "Provider Student Agreement",
    description:
      "Provider enrolment terms presented where enabled in the checkout flow.",
    status: "available",
    icon: FileCheck2,
  },
  {
    title: "Electronic acceptance",
    description:
      "Checkbox consents and timestamped acceptance before enrolment confirmation.",
    status: "available",
    icon: CheckCircle2,
  },
  {
    title: "Checkout creation and confirmation",
    description:
      "Create and confirm enrolments through the StudentPay Provider Checkout API.",
    status: "available",
    icon: Plug,
  },
];

const integrationCapabilities: Capability[] = [
  {
    title: "StudentPay API",
    description:
      "REST endpoints for checkout creation, direct debit setup and enrolment confirmation.",
    status: "available",
    icon: Code2,
  },
  {
    title: "Provider configuration",
    description:
      "Per-provider themes, catalogue content and API binding without forking the application.",
    status: "available",
    icon: Settings2,
  },
  {
    title: "Enrolment Checkout",
    description:
      "Reusable checkout components that embed into a provider's existing enrolment journey.",
    status: "available",
    icon: Layers3,
  },
  {
    title: "Agreements",
    description:
      "Payment plan, direct debit and provider terms loaded from StudentPay legal services.",
    status: "available",
    icon: FileText,
  },
  {
    title: "Payment authorisation",
    description:
      "Card tokenisation and direct debit authorisation through Pinch and StudentPay.",
    status: "available",
    icon: CreditCard,
  },
  {
    title: "Production provider binding",
    description:
      "Environment-scoped hard binding for dedicated provider production demonstrations.",
    status: "demo",
    icon: ShieldCheck,
  },
  {
    title: "Web/API integration",
    description:
      "Patterns for provider systems to initiate checkouts and receive confirmation outcomes.",
    status: "in-development",
    icon: Plug,
  },
  {
    title: "Developer Hub",
    description:
      "Structured documentation, reference material and integration guides for providers.",
    status: "in-development",
    icon: BookOpen,
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
  const Icon = capability.icon;

  return (
    <article className="sp-capability-card">
      <div className="sp-capability-card__header">
        <span className="sp-capability-card__icon" aria-hidden="true">
          <Icon size={18} />
        </span>
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
  const academyAustralia = providers.find(
    (provider) => provider.slug === "academy-australia",
  );

  return (
    <>
      <section className="sp-hero">
        <div className="page-shell sp-hero__grid">
          <div className="sp-hero__content">
            <p className="sp-hero__descriptor">StudentPay Product Environment</p>

            <p className="sp-hero__eyebrow">StudentPay</p>
            <h1>StudentPay Provider Experience</h1>

            <p className="sp-hero__lead">
              A reusable product environment for demonstrating and deploying
              StudentPay-powered enrolment and payment experiences.
            </p>

            <p className="sp-hero__supporting">
              StudentPay is a specialist education payment-plan provider. We
              administer payment plans, course fee collection, arrears
              management, settlement and reporting — and the provider and student
              payment experiences that support them. This environment shows how
              that capability can be embedded into an education provider&apos;s
              enrolment journey while the provider retains their own brand.
            </p>

            <div className="sp-hero__actions">
              <Link href="/#provider-demos" className="sp-button sp-button--primary">
                Explore provider demos
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link
                href="/#integration-capabilities"
                className="sp-button sp-button--secondary"
              >
                View integration capabilities
              </Link>
            </div>
          </div>

          <aside className="sp-relationship-panel" aria-label="Product relationship">
            <div className="sp-relationship-panel__layer sp-relationship-panel__layer--product">
              <span className="sp-relationship-panel__label">StudentPay</span>
              <p>Reusable payment and enrolment technology</p>
            </div>
            <div className="sp-relationship-panel__connector" aria-hidden="true" />
            <div className="sp-relationship-panel__layer sp-relationship-panel__layer--provider">
              <span className="sp-relationship-panel__label">Academy Australia</span>
              <p>Demonstration education provider using StudentPay</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="sp-section" id="provider-demos">
        <div className="page-shell">
          <div className="sp-section-heading">
            <h2>Provider demonstrations</h2>
            <p>
              Each demonstration provider shows how StudentPay enrolment and
              payment capabilities can be presented within a provider&apos;s own
              brand and course catalogue. StudentPay is not the education
              provider.
            </p>
          </div>

          {academyAustralia ? (
            <article className="sp-provider-demo-feature">
              <div className="sp-provider-demo-feature__content">
                <div className="sp-provider-demo-feature__brand">
                  <Image
                    src={academyAustralia.logoPath}
                    alt={`${academyAustralia.name} logo`}
                    width={220}
                    height={80}
                    className="sp-provider-demo-feature__logo"
                  />
                </div>

                <p className="sp-provider-demo-feature__label">
                  Demo education provider
                </p>
                <h3>{academyAustralia.name}</h3>
                <p>
                  Flexible online education example demonstrating a
                  StudentPay-powered enrolment and payment-plan journey with a
                  full course catalogue and live checkout flow.
                </p>

                <div className="sp-provider-demo-feature__actions">
                  <Link
                    href={`/providers/${academyAustralia.slug}`}
                    className="sp-button sp-button--primary"
                  >
                    View Academy Australia demo
                    <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                  <Link
                    href={`/providers/${academyAustralia.slug}/courses`}
                    className="sp-button sp-button--ghost"
                  >
                    Explore courses
                  </Link>
                </div>
              </div>

              <div className="sp-provider-demo-feature__proof">
                <p className="sp-provider-demo-feature__proof-label">
                  Included in this demo
                </p>
                <ul>
                  <li>Provider-branded course catalogue and detail pages</li>
                  <li>StudentPay Enrolment Checkout on Criminal Psychology</li>
                  <li>Payment-plan, deposit and direct debit authorisation</li>
                </ul>
              </div>
            </article>
          ) : null}
        </div>
      </section>

      <section className="sp-section sp-section--feature" id="enrolment-checkout">
        <div className="page-shell">
          <div className="sp-section-heading sp-section-heading--on-dark">
            <h2>StudentPay Enrolment Checkout</h2>
            <p>
              A configurable enrolment and payment experience that can be
              embedded into an education provider&apos;s existing enrolment
              journey.
            </p>
          </div>

          <div className="sp-checkout-showcase">
            <div className="sp-checkout-showcase__copy">
              <p>
                The Academy Australia Criminal Psychology demonstration uses the
                full checkout flow as product proof — provider branding, student
                details, payment-plan selection, agreement acceptance and API
                confirmation.
              </p>
              <Link
                href="/providers/academy-australia/courses/criminal-psychology/enrol"
                className="sp-button sp-button--lime"
              >
                Open sample enrolment checkout
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>

            <div className="sp-checkout-showcase__frame" aria-hidden="true">
              <div className="sp-checkout-showcase__frame-bar">
                <span />
                <span />
                <span />
              </div>
              <div className="sp-checkout-showcase__frame-body">
                <p className="sp-checkout-showcase__frame-title">
                  StudentPay Enrolment Checkout
                </p>
                <ol>
                  <li>Course confirmation</li>
                  <li>Student screening and details</li>
                  <li>Payment plan and deposit</li>
                  <li>Direct debit authorisation</li>
                  <li>Agreement acceptance and confirm</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="sp-capability-grid">
            {checkoutCapabilities.map((capability) => (
              <CapabilityCard key={capability.title} capability={capability} />
            ))}
          </div>
        </div>
      </section>

      <section className="sp-section" id="integration-capabilities">
        <div className="page-shell">
          <div className="sp-section-heading">
            <h2>Integration capabilities</h2>
            <p>
              The foundation for a StudentPay developer and product platform —
              APIs, configuration patterns and checkout flows that provider
              implementations can build on.
            </p>
          </div>

          <div className="sp-capability-grid sp-capability-grid--compact">
            {integrationCapabilities.map((capability) => (
              <CapabilityCard key={capability.title} capability={capability} />
            ))}
          </div>

          <div className="sp-roadmap-note">
            <p>
              Future routes such as <code>/enrolment-checkout</code>,{" "}
              <code>/provider-demos</code>, <code>/integrations</code>,{" "}
              <code>/developers</code> and <code>/docs</code> will extend this
              environment as the product surface matures.
            </p>
          </div>
        </div>
      </section>

      <section className="sp-tagline-band">
        <div className="page-shell sp-tagline-band__inner">
          <p className="sp-tagline-band__quote">
            You focus on education. We&apos;ll handle the rest.
          </p>
          <p className="sp-tagline-band__note">
            StudentPay administers payment plans and course fee collection for
            education providers. We are not a course provider and we are not
            positioned as a lender.
          </p>
        </div>
      </section>
    </>
  );
}
