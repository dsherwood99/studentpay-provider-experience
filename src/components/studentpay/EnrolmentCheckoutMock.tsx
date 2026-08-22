export function EnrolmentCheckoutMock() {
  return (
    <div className="sp-checkout-mock" aria-hidden="true">
      <div className="sp-checkout-mock__sidebar">
        <p className="sp-checkout-mock__brand">Academy Australia</p>
        <p className="sp-checkout-mock__step-label">Step 2 of 5</p>
        <p className="sp-checkout-mock__step-title">Confirm and Pay</p>
        <div className="sp-checkout-mock__progress">
          <span className="is-complete" />
          <span className="is-complete" />
          <span className="is-active" />
          <span />
          <span />
        </div>
      </div>

      <div className="sp-checkout-mock__main">
        <p className="sp-checkout-mock__eyebrow">StudentPay Enrolment Checkout</p>
        <h3>Choose your payment option</h3>

        <div className="sp-checkout-mock__option is-selected">
          <strong>StudentPay payment plan</strong>
          <span>$28 per week · 40 payments</span>
        </div>

        <div className="sp-checkout-mock__option">
          <strong>Pay in full today</strong>
          <span>$1,200 upfront</span>
        </div>

        <div className="sp-checkout-mock__summary">
          <div>
            <span>Deposit due today</span>
            <strong>$100.00</strong>
          </div>
          <div>
            <span>Plan balance</span>
            <strong>$1,100.00</strong>
          </div>
        </div>

        <div className="sp-checkout-mock__cta">Continue to direct debit</div>
      </div>
    </div>
  );
}
