import type { ReactNode } from "react";

type ProductBrowserFrameProps = {
  children: ReactNode;
  label?: string;
};

export function ProductBrowserFrame({
  children,
  label = "StudentPay Enrolment Checkout",
}: ProductBrowserFrameProps) {
  return (
    <div className="sp-product-frame">
      <div className="sp-product-frame__glow" aria-hidden="true" />
      <div className="sp-product-frame__window">
        <div className="sp-product-frame__chrome">
          <div className="sp-product-frame__dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p className="sp-product-frame__title">{label}</p>
        </div>
        <div className="sp-product-frame__content">{children}</div>
      </div>
    </div>
  );
}
