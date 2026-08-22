import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Code2,
  CreditCard,
  FileText,
  Plug,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { EnrolmentCheckoutMock } from "@/components/studentpay/EnrolmentCheckoutMock";
import { ProductBrowserFrame } from "@/components/studentpay/ProductBrowserFrame";
import { StudentPayButton } from "@/components/studentpay/StudentPayButton";
import { providers } from "@/config/providers";

const checkoutFeatures = [
  "Course and student details",
  "Payment-plan calculation",
  "Deposit handling",
  "Direct debit authorisation",
  "Payment Plan Agreement",
  "Provider Student Agreement",
  "Electronic acceptance",
  "Checkout confirmation",
] as const;

const integrationFeatures = [
  {
    title: "StudentPay API",
    description:
      "Create checkouts, direct debit setup URLs and confirm enrolments through REST endpoints.",
    icon: Code2,
  },
  {
    title: "Provider configuration",
    description:
      "Per-provider themes, catalogue content and API binding without forking the application.",
    icon: Settings2,
  },
  {
    title: "Checkout creation",
    description:
      "Initiate enrolment sessions from a provider's existing systems or embedded flows.",
    icon: Plug,
  },
  {
    title: "Checkout confirmation",
    description:
      "Confirm enrolment outcomes after payment authorisation and agreement acceptance.",
    icon: ShieldCheck,
  },
  {
    title: "Payment authorisation",
    description:
      "Card tokenisation and direct debit authorisation through Pinch and StudentPay.",
    icon: CreditCard,
  },
  {
    title: "Agreement generation",
    description:
      "Payment plan, direct debit and provider terms from StudentPay legal services.",
    icon: FileText,
  },
] as const;

export function StudentPayHomePage() {
  const academyAustralia = providers.find(
    (provider) => provider.slug === "academy-australia",
  );

  return (
    <>
      <section className="sp-marketing-hero">
        <div className="sp-shell sp-marketing-hero__grid">
          <div className="sp-marketing-hero__copy">
            <p className="sp-eyebrow">StudentPay product environment</p>
            <h1>
              StudentPay payment experiences,
              <br />
              built for education.
            </h1>
            <p className="sp-lead">
              Explore reusable StudentPay enrolment, payment and agreement
              experiences — then see them operating inside a demonstration
              education provider.
            </p>

            <div className="sp-marketing-hero__actions">
              <StudentPayButton
                href="/#enrolment-checkout"
                variant="primary"
                showArrow
              >
                Explore Enrolment Checkout
              </StudentPayButton>
              <StudentPayButton
                href="/#provider-demos"
                variant="secondary"
                showArrow
              >
                View Provider Demo
              </StudentPayButton>
            </div>
          </div>

          <ProductBrowserFrame>
            <EnrolmentCheckoutMock />
          </ProductBrowserFrame>
        </div>
      </section>

      <section className="sp-architecture-band">
        <div className="sp-shell sp-architecture-band__inner">
          <div className="sp-architecture-band__copy">
            <p className="sp-eyebrow sp-eyebrow--on-dark">
              Built for education providers
            </p>
            <h2>StudentPay powers the payment experience. Your brand stays front and centre.</h2>
            <p>
              StudentPay is a specialist education payment-plan provider. We
              administer payment plans, course fee collection and the enrolment
              checkout experiences that support them — without becoming the
              education provider.
            </p>
          </div>

          <div className="sp-architecture-flow" aria-label="Product architecture">
            <div className="sp-architecture-flow__step">
              <span className="sp-architecture-flow__label">StudentPay</span>
              <p>Reusable payment and enrolment technology</p>
            </div>
            <ArrowRight className="sp-architecture-flow__arrow" aria-hidden="true" />
            <div className="sp-architecture-flow__step">
              <span className="sp-architecture-flow__label">Enrolment Checkout</span>
              <p>Configurable provider-facing enrolment flow</p>
            </div>
            <ArrowRight className="sp-architecture-flow__arrow" aria-hidden="true" />
            <div className="sp-architecture-flow__step sp-architecture-flow__step--muted">
              <span className="sp-architecture-flow__label">Academy Australia</span>
              <p>Demonstration education provider</p>
            </div>
          </div>
        </div>
      </section>

      <section className="sp-section" id="provider-demos">
        <div className="sp-shell">
          <div className="sp-section-intro">
            <p className="sp-eyebrow">Provider demonstration</p>
            <h2>See StudentPay inside a complete provider journey</h2>
            <p>
              Academy Australia is a demonstration education provider — not
              StudentPay itself. It shows how enrolment checkout, payment plans
              and agreements can live inside a provider&apos;s own brand.
            </p>
          </div>

          {academyAustralia ? (
            <article className="sp-demo-card">
              <div className="sp-demo-card__main">
                <div className="sp-demo-card__logo-wrap">
                  <Image
                    src={academyAustralia.logoPath}
                    alt={`${academyAustralia.name} logo`}
                    width={220}
                    height={76}
                    className="sp-demo-card__logo"
                  />
                </div>
                <p className="sp-demo-card__tag">Demo provider</p>
                <h3>{academyAustralia.name}</h3>
                <p>
                  See StudentPay Enrolment Checkout operating inside a complete
                  education provider enrolment journey — course catalogue, course
                  pages and live checkout on Criminal Psychology.
                </p>
                <StudentPayButton
                  href={`/providers/${academyAustralia.slug}`}
                  variant="primary"
                  showArrow
                >
                  View Academy Australia
                </StudentPayButton>
              </div>

              <div className="sp-demo-card__aside">
                <p className="sp-demo-card__aside-label">Included in this demo</p>
                <ul>
                  <li>Provider-branded course catalogue and detail pages</li>
                  <li>StudentPay Enrolment Checkout with payment-plan selection</li>
                  <li>Direct debit authorisation and agreement acceptance</li>
                </ul>
                <Link
                  href={`/providers/${academyAustralia.slug}/courses`}
                  className="sp-text-link"
                >
                  Explore courses
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </article>
          ) : null}
        </div>
      </section>

      <section className="sp-section sp-section--soft" id="enrolment-checkout">
        <div className="sp-shell sp-checkout-section">
          <ProductBrowserFrame label="Academy Australia · Criminal Psychology">
            <EnrolmentCheckoutMock />
          </ProductBrowserFrame>

          <div className="sp-checkout-section__copy">
            <p className="sp-eyebrow">StudentPay Enrolment Checkout</p>
            <h2>Integrate payment into the enrolment journey</h2>
            <p>
              Providers can embed StudentPay into their existing enrolment
              experience rather than sending students into a separate payment
              flow. The demonstration below uses the live Criminal Psychology
              checkout as product proof.
            </p>

            <ul className="sp-feature-list">
              {checkoutFeatures.map((feature) => (
                <li key={feature}>
                  <Check size={18} aria-hidden="true" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <StudentPayButton
              href="/providers/academy-australia/courses/criminal-psychology/enrol"
              variant="primary"
              showArrow
            >
              Open sample enrolment checkout
            </StudentPayButton>
          </div>
        </div>
      </section>

      <section className="sp-section" id="integrations">
        <div className="sp-shell">
          <div className="sp-section-intro sp-section-intro--center">
            <p className="sp-eyebrow">Developer platform</p>
            <h2>Built to integrate</h2>
            <p>
              Providers can integrate StudentPay using hosted checkout
              experiences, reusable components and API capabilities — the
              foundation for a future StudentPay Developer Hub.
            </p>
          </div>

          <div className="sp-integration-grid">
            {integrationFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="sp-integration-item">
                  <span className="sp-integration-item__icon" aria-hidden="true">
                    <Icon size={20} />
                  </span>
                  <div>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="sp-api-panel">
            <div>
              <p className="sp-api-panel__label">Provider Checkout API</p>
              <code>POST /v1/provider-checkouts</code>
              <code>POST /api/provider-checkout-confirm</code>
            </div>
            <p>
              Sandbox and mock modes are available in this environment for
              development without production credentials.
            </p>
          </div>
        </div>
      </section>

      <section className="sp-closing-band">
        <div className="sp-shell sp-closing-band__inner">
          <blockquote>
            You focus on education. We&apos;ll handle the rest.
          </blockquote>
          <p>
            StudentPay administers payment plans and course fee collection for
            education providers. We are not a course provider and we are not
            positioned as a lender.
          </p>
        </div>
      </section>
    </>
  );
}
