import { getDedicatedProductionProvider } from "@/lib/provider-experience/host-isolation";

export function BelaBeautyFooter() {
  const provider = getDedicatedProductionProvider();
  const year = new Date().getFullYear();

  if (!provider) {
    return null;
  }

  return (
    <footer className="platform-footer">
      <div className="page-shell platform-footer__grid">
        <div className="platform-footer__brand">
          <p>{provider.name}</p>
          <p>
            Enrolment and payment plans for {provider.name} are provided through
            StudentPay.
          </p>
        </div>

        <div className="platform-footer__links">
          <div>
            <p className="platform-footer__heading">Support</p>
            <a href={`mailto:${provider.supportEmail}`}>{provider.supportEmail}</a>
          </div>
        </div>
      </div>

      <div className="page-shell platform-footer__bottom">
        <span>
          © {year} {provider.name}
        </span>
        <span>Payments by StudentPay</span>
      </div>
    </footer>
  );
}
