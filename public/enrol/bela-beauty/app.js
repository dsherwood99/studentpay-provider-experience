const STORAGE_KEY = "bela-nz-enrol-draft-v7";

const money = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const state = {
  config: null,
  checkout: null,
  ddaReady: false,
  ddaAuthorised: false,
  busy: false,
  popup: null,
  ddaWatchTimer: null
};

const els = {
  form: document.getElementById("enrol-form"),
  error: document.getElementById("form-error"),
  review: document.getElementById("review-panel"),
  outcome: document.getElementById("outcome"),
  outcomeTitle: document.getElementById("outcome-title"),
  outcomeBody: document.getElementById("outcome-body"),
  outcomeActions: document.getElementById("outcome-actions"),
  outcomeDebug: document.getElementById("outcome-debug"),
  outcomeDebugWrap: document.getElementById("outcome-debug-wrap"),
  submit: document.getElementById("submit-enrol"),
  setupDda: document.getElementById("setup-dda"),
  ddaStatus: document.getElementById("dda-status"),
  blockDda: document.getElementById("block-dda"),
  blockPaynow: document.getElementById("block-paynow"),
  firstPaymentDate: document.querySelector('[name="first_payment_date"]'),
  termsModal: document.getElementById("terms-modal"),
  termsModalTitle: document.getElementById("terms-modal-title"),
  termsModalBody: document.getElementById("terms-modal-body"),
  ddaPanel: document.getElementById("dda-panel"),
  ddaDone: document.getElementById("dda-done"),
  ddaDoneTitle: document.getElementById("dda-done-title"),
  ddaDoneBody: document.getElementById("dda-done-body")
};

function apiBase() {
  return "/api/demos/bela-beauty";
}

function legalBaseUrl() {
  // Legal pages + JWT verification live on the StudentPay NZ API host.
  // This page is hosted on Provider Experience; do not use same-origin here.
  return "https://sandbox-api.studentpay.co.nz";
}

function closeTermsModal() {
  if (!els.termsModal) return;
  els.termsModal.hidden = true;
  els.termsModalBody.innerHTML = "";
  document.body.style.overflow = "";
}

function openTermsModal(type) {
  if (!els.termsModal) return;

  const base = legalBaseUrl().replace(/\/$/, "");
  const providerCode = "BELA_NZ";
  let title = "Terms";
  let bodyHtml = "";

  if (type === "provider") {
    title = "Bela Beauty College Terms & Conditions";
    bodyHtml = `
      <div class="terms-provider-copy">
        <p>These are draft enrolment terms for the Bela Beauty College NZ StudentPay sandbox demo.</p>
        <p>The production version will contain Bela’s approved enrolment, course, cancellation, refund and student-obligation terms.</p>
        <h4>Placeholder topics</h4>
        <p>Course enrolment, fees, payment arrangements, cancellation rights, online course delivery and student responsibilities.</p>
        <p><a href="https://belabeautycollege.com/" target="_blank" rel="noopener">View belabeautycollege.com</a></p>
      </div>
    `;
  } else if (type === "studentpay") {
    title = "Student Payment Plan Agreement";
    const token =
      state.checkout?.checkout_token ||
      state.checkout?.direct_debit?.token ||
      null;
    if (token) {
      const src = `${base}/legal/payment-plan-terms?token=${encodeURIComponent(token)}`;
      bodyHtml = `<iframe class="legal-terms-frame" src="${src}" title="Student Payment Plan Agreement" loading="lazy"></iframe>`;
    } else if (state.ddaAuthorised || state.ddaReady) {
      bodyHtml = `
        <div class="terms-unavailable">
          <p>Direct debit is set up, but the personalised agreement token is missing from this browser session.</p>
          <p>Click <strong>Set Up Direct Debit</strong> again to recreate the checkout, or refresh and retry the enrolment flow.</p>
        </div>
      `;
    } else {
      bodyHtml = `
        <div class="terms-unavailable">
          <p>Your personalised Student Payment Plan Agreement will be available after the StudentPay payment plan has been created.</p>
          <p>Please complete the direct debit setup first.</p>
        </div>
      `;
    }
  } else if (type === "direct-debit") {
    title = "Direct Debit Service Agreement";
    const src = `${base}/legal/direct-debit-terms?provider_code=${encodeURIComponent(providerCode)}`;
    bodyHtml = `<iframe class="legal-terms-frame" src="${src}" title="StudentPay Direct Debit Request and Service Agreement" loading="lazy"></iframe>`;
  } else {
    return;
  }

  els.termsModalTitle.textContent = title;
  els.termsModalBody.innerHTML = bodyHtml;
  els.termsModal.hidden = false;
  document.body.style.overflow = "hidden";
}

function wireTermsModal() {
  document.querySelectorAll("[data-terms]").forEach((node) => {
    node.addEventListener("click", (event) => {
      event.preventDefault();
      openTermsModal(node.getAttribute("data-terms"));
    });
  });

  document.querySelectorAll("[data-terms-close]").forEach((node) => {
    node.addEventListener("click", () => closeTermsModal());
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && els.termsModal && !els.termsModal.hidden) {
      closeTermsModal();
    }
  });
}

function defaultFirstPaymentDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

function showError(message) {
  if (!message) {
    els.error.hidden = true;
    els.error.textContent = "";
    return;
  }
  els.error.hidden = false;
  els.error.textContent = message;
}

function readForm() {
  const data = new FormData(els.form);
  return {
    first_name: String(data.get("first_name") || "").trim(),
    last_name: String(data.get("last_name") || "").trim(),
    email: String(data.get("email") || "").trim(),
    mobile: String(data.get("mobile") || "").trim(),
    date_of_birth: String(data.get("date_of_birth") || "").trim(),
    region: String(data.get("region") || "").trim(),
    street_address: String(data.get("street_address") || "").trim(),
    suburb: String(data.get("suburb") || "").trim(),
    postcode: String(data.get("postcode") || "").trim(),
    country: String(data.get("country") || "New Zealand").trim(),
    payment_choice: String(data.get("payment_choice") || "weekly_plan"),
    first_payment_date: String(data.get("first_payment_date") || "").trim(),
    information_confirmed: Boolean(data.get("information_confirmed")),
    payment_plan_accepted: Boolean(data.get("payment_plan_accepted"))
  };
}

function persistDraft() {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        form: readForm(),
        checkout: state.checkout,
        ddaReady: state.ddaReady,
        ddaAuthorised: state.ddaAuthorised
      })
    );
  } catch {
    // ignore
  }
}

function restoreDraft() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const draft = JSON.parse(raw);
    if (draft?.form) {
      for (const [key, value] of Object.entries(draft.form)) {
        const field = els.form.elements.namedItem(key);
        if (!field) continue;
        if (field instanceof RadioNodeList) {
          for (const node of field) {
            if (node.value === value) node.checked = true;
          }
        } else if (field.type === "checkbox") {
          field.checked = Boolean(value);
        } else {
          field.value = value ?? "";
        }
      }
    }
    if (draft?.checkout) state.checkout = draft.checkout;
    if (draft?.ddaReady) state.ddaReady = true;
    if (draft?.ddaAuthorised) state.ddaAuthorised = true;
  } catch {
    // ignore
  }
}

function validateDetails() {
  const values = readForm();
  const required = [
    ["first_name", "First name"],
    ["last_name", "Last name"],
    ["email", "Email"],
    ["mobile", "Phone"],
    ["date_of_birth", "Date of birth"],
    ["region", "Region"],
    ["street_address", "Street address"],
    ["suburb", "Suburb"],
    ["postcode", "Postcode"]
  ];

  for (const [key, label] of required) {
    if (!values[key]) return `${label} is required.`;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    return "Enter a valid email address.";
  }

  return null;
}

function validateDeclarations() {
  const values = readForm();
  if (!values.information_confirmed || !values.payment_plan_accepted) {
    return "Please accept all declarations to continue.";
  }
  return null;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderReview() {
  const values = readForm();
  const plan = state.config?.weekly_plan;
  const upfront = plan?.upfront_payment ?? 10;
  const weekly = plan?.instalment_amount ?? 15;
  const count = plan?.number_of_instalments ?? 186;
  const total = plan?.course_price ?? 2800;

  if (values.payment_choice === "pay_in_full") {
    els.review.innerHTML = `
    <div><dt>Name</dt><dd>${escapeHtml(values.first_name)} ${escapeHtml(values.last_name)}</dd></div>
    <div><dt>Address</dt><dd>${escapeHtml(values.street_address)}, ${escapeHtml(values.suburb)}, ${escapeHtml(values.region)} ${escapeHtml(values.postcode)}</dd></div>
    <div><dt>Course</dt><dd>Lash Business Bundle</dd></div>
    <div><dt>Payment</dt><dd>Pay Now · ${money.format(total)}</dd></div>
  `;
    return;
  }

  els.review.innerHTML = `
    <div><dt>Name</dt><dd>${escapeHtml(values.first_name)} ${escapeHtml(values.last_name)}</dd></div>
    <div><dt>Address</dt><dd>${escapeHtml(values.street_address)}, ${escapeHtml(values.suburb)}, ${escapeHtml(values.region)} ${escapeHtml(values.postcode)}</dd></div>
    <div><dt>Course</dt><dd>Lash Business Bundle · ${money.format(total)}</dd></div>
    <div><dt>Payment plan</dt><dd>${money.format(upfront)} within ~24 hours of enrolment and then ${money.format(weekly)}/week for ${count} weekly payments</dd></div>
    ${
      values.first_payment_date
        ? `<div><dt>First weekly payment</dt><dd>${escapeHtml(values.first_payment_date)}</dd></div>`
        : ""
    }
  `;
}

function updatePaymentMode() {
  const choice = readForm().payment_choice;
  const isPlan = choice === "weekly_plan";

  els.blockDda.hidden = !isPlan;
  els.blockPaynow.hidden = isPlan;

  if (els.firstPaymentDate) {
    els.firstPaymentDate.required = isPlan;
    if (isPlan && !els.firstPaymentDate.value) {
      els.firstPaymentDate.value = defaultFirstPaymentDate();
    }
  }

  els.submit.textContent = isPlan
    ? "Confirm Enrolment & Activate Payment Plan"
    : "Confirm Enrolment";

  if (isPlan && state.checkout && (state.ddaAuthorised || state.ddaReady)) {
    showDdaComplete({
      authorised: state.ddaAuthorised,
      pending: state.ddaReady && !state.ddaAuthorised
    });
  } else if (isPlan) {
    if (els.ddaPanel) els.ddaPanel.hidden = false;
    if (els.ddaDone) els.ddaDone.hidden = true;
  }

  updateConfirmEnabled();
  renderReview();
  persistDraft();
}

function updateConfirmEnabled() {
  const values = readForm();
  const declarationsOk =
    values.information_confirmed && values.payment_plan_accepted;
  // ddaReady is only set after return handoff or bank-details-collected status —
  // never merely because a Billing Request Flow was created (Customer In Progress).
  const ddaOk = state.ddaAuthorised || state.ddaReady;

  if (values.payment_choice === "weekly_plan") {
    els.submit.disabled = !(declarationsOk && state.checkout && ddaOk);
  } else {
    els.submit.disabled = !declarationsOk;
  }
}

/**
 * True once GoCardless has collected bank details / mandate progressed.
 * Does NOT include "Customer In Progress" — that status is also set when a
 * Billing Request Flow URL is first created, before the customer finishes.
 */
function isBankDetailsCollectedStatus(directDebit = {}) {
  const ddStatus = String(directDebit.status || "")
    .trim()
    .toLowerCase();
  const processor = String(
    directDebit.processor_status || directDebit.mandate_status || ""
  )
    .trim()
    .toLowerCase();

  if (ddStatus === "authorised" || processor === "active") return true;

  const collectedStatuses = new Set(["authorised"]);
  const collectedProcessors = new Set([
    "pending_submission",
    "submitted",
    "pending_customer_approval",
    "active",
    "fulfilled"
  ]);

  return (
    collectedStatuses.has(ddStatus) || collectedProcessors.has(processor)
  );
}

function showDdaComplete({ authorised = false, pending = false } = {}) {
  if (els.ddaPanel) els.ddaPanel.hidden = true;
  if (els.ddaDone) els.ddaDone.hidden = false;

  if (els.ddaDoneTitle && els.ddaDoneBody) {
    if (authorised) {
      els.ddaDoneTitle.textContent = "Direct Debit Authorised";
      els.ddaDoneBody.textContent =
        "Your bank account has been successfully authorised for your StudentPay NZ payment plan.";
    } else if (pending) {
      els.ddaDoneTitle.textContent = "Direct debit setup received";
      els.ddaDoneBody.textContent =
        "Bank setup was recorded with StudentPay NZ. You can continue to review and confirm enrolment.";
    } else {
      els.ddaDoneTitle.textContent = "Direct debit setup complete";
      els.ddaDoneBody.textContent =
        "Your bank account setup for the StudentPay NZ payment plan is complete. Continue to review and confirm enrolment.";
    }
  }

  state.ddaReady = true;
  if (authorised) state.ddaAuthorised = true;
  updateConfirmEnabled();
  persistDraft();
}

function resetDdaUi() {
  if (els.ddaPanel) els.ddaPanel.hidden = false;
  if (els.ddaDone) els.ddaDone.hidden = true;
  state.ddaReady = false;
  state.ddaAuthorised = false;
  setDdaStatus("");
}

function setDdaStatus(message) {
  if (!message) {
    els.ddaStatus.hidden = true;
    els.ddaStatus.textContent = "";
    return;
  }
  els.ddaStatus.hidden = false;
  els.ddaStatus.textContent = message;
}

async function loadConfig() {
  try {
    const res = await fetch(`${apiBase()}/status`);
    const json = await res.json();
    if (json?.demo) {
      state.config = json.demo;
      applyConfigPricing(json.demo);
    }
  } catch {
    // keep HTML defaults
  }
}

function applyConfigPricing(demo) {
  const full = demo.pay_in_full;
  const weekly = demo.weekly_plan;
  const map = {
    full: money.format(full.course_price),
    weekly: money.format(weekly.instalment_amount),
    "weekly-total": money.format(weekly.course_price)
  };
  for (const [key, value] of Object.entries(map)) {
    document.querySelectorAll(`[data-money="${key}"]`).forEach((node) => {
      node.textContent = value;
    });
  }
}

function showOutcome({ title, body, bodyHtml = null, actions = [], debug = null }) {
  els.form.hidden = true;
  els.outcome.hidden = false;
  els.outcomeTitle.textContent = title;
  if (bodyHtml) {
    els.outcomeBody.innerHTML = bodyHtml;
  } else {
    els.outcomeBody.textContent = body || "";
  }
  els.outcomeActions.innerHTML = "";
  for (const action of actions) {
    const el = document.createElement(action.href ? "a" : "button");
    el.className = `btn ${action.primary ? "btn--accent" : "btn--secondary"}`;
    el.textContent = action.label;
    if (action.href) {
      el.href = action.href;
      if (action.external) {
        el.target = "_blank";
        el.rel = "noopener";
      }
    } else {
      el.type = "button";
      el.addEventListener("click", action.onClick);
    }
    els.outcomeActions.appendChild(el);
  }

  const showDebug =
    Boolean(debug) &&
    (new URLSearchParams(window.location.search).has("debug") ||
      window.localStorage.getItem("bela-nz-debug") === "1");

  if (showDebug && els.outcomeDebug && els.outcomeDebugWrap) {
    els.outcomeDebugWrap.hidden = false;
    els.outcomeDebug.textContent = JSON.stringify(debug, null, 2);
  } else if (els.outcomeDebugWrap) {
    els.outcomeDebugWrap.hidden = true;
    if (els.outcomeDebug) els.outcomeDebug.textContent = "";
  }
}

function buildWeeklySuccessHtml({ firstPaymentDate, agreementOk }) {
  const plan = state.config?.weekly_plan || {};
  const upfront = plan.upfront_payment ?? 10;
  const weekly = plan.instalment_amount ?? 15;
  const count = plan.number_of_instalments ?? 186;
  const agreementLine = agreementOk
    ? `<p class="outcome-note">Your Payment Plan Agreement has been generated successfully.</p>`
    : `<p class="outcome-note">Your enrolment is confirmed. Your Payment Plan Agreement is being finalised.</p>`;

  return `
    <p>Your enrolment in the Lash Business Bundle has been confirmed and your StudentPay NZ payment plan is now set up.</p>
    <ul class="outcome-plan">
      <li>Initial account validation payment: ${money.format(upfront)} within 24 hours</li>
      <li>Weekly payment: ${money.format(weekly)}</li>
      <li>Number of weekly payments: ${count}</li>
      <li>First weekly payment date: ${escapeHtml(firstPaymentDate || "as scheduled")}</li>
    </ul>
    ${agreementLine}
  `;
}

function isSandboxDebugHost() {
  const host = window.location.hostname || "";
  return (
    host.includes("vercel.app") ||
    host.includes("sandbox-api.studentpay") ||
    host === "localhost" ||
    host === "127.0.0.1"
  );
}

async function createCheckout() {
  const values = readForm();
  const payload = {
    payment_choice: values.payment_choice,
    first_payment_date: values.first_payment_date || defaultFirstPaymentDate(),
    student: {
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email,
      mobile: values.mobile,
      date_of_birth: values.date_of_birth,
      address: {
        street_address: values.street_address,
        suburb: values.suburb,
        city: values.region,
        state: values.region,
        postcode: values.postcode,
        country: values.country
      }
    },
    declarations: {
      information_confirmed: values.information_confirmed,
      payment_plan_accepted: values.payment_plan_accepted
    },
    success_url: `${window.location.origin}/enrol/bela-beauty/?step=bank-return`,
    cancel_url: `${window.location.origin}/enrol/bela-beauty/?step=cancelled`
  };

  const res = await fetch(`${apiBase()}/checkout`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": `bela-${values.email}-${Date.now()}`
    },
    body: JSON.stringify(payload)
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(formatCheckoutError(json, res.status));
  }

  // NZ create response puts the DDA/agreement JWT on direct_debit.token
  // (docs also refer to checkout.checkout_token — accept either).
  const checkoutToken =
    json.checkout?.checkout_token ||
    json.direct_debit?.token ||
    null;

  const setupUrl = resolveSetupUrl(
    json.direct_debit?.setup_url || json.direct_debit?.redirect_url || null
  );

  state.checkout = {
    checkout_id: json.checkout?.checkout_id,
    checkout_token: checkoutToken,
    opportunity_id: json.records?.opportunity_id,
    dda_id: json.records?.dda_id || json.direct_debit?.dda_id,
    provider_order_id: json.provider?.provider_order_id,
    setup_url: setupUrl,
    requires_direct_debit: json.checkout?.requires_direct_debit,
    payment_choice: values.payment_choice,
    status: json.checkout?.status,
    direct_debit: json.direct_debit || null,
    raw: json
  };
  persistDraft();
  return state.checkout;
}

async function confirmCheckout() {
  if (!state.checkout) throw new Error("Missing checkout context.");

  const values = readForm();
  const payload = {
    provider_order_id: state.checkout.provider_order_id,
    first_payment_date: values.first_payment_date || defaultFirstPaymentDate(),
    checkout: {
      checkout_id: state.checkout.checkout_id,
      checkout_token: state.checkout.checkout_token,
      opportunity_id: state.checkout.opportunity_id,
      dda_id: state.checkout.dda_id
    },
    declarations: {
      information_confirmed: values.information_confirmed,
      payment_plan_accepted: values.payment_plan_accepted
    }
  };

  let lastMessage = "Confirm failed.";
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    if (attempt > 1) {
      setDdaStatus(
        `Waiting for GoCardless mandate activation (try ${attempt}/4)…`
      );
      await new Promise((resolve) => setTimeout(resolve, 2500));
      await refreshStatus().catch(() => {});
    }

    const res = await fetch(`${apiBase()}/confirm`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const json = await res.json().catch(() => ({}));
    if (res.ok && json.success !== false) {
      setDdaStatus("");
      return json;
    }

    const code = json?.error?.code || json?.error?.error?.code || "";
    lastMessage =
      json?.error?.message ||
      json?.error?.error?.message ||
      (typeof json?.error === "string" ? json.error : null) ||
      `Confirm failed (${res.status}).`;

    const notReady =
      code === "DIRECT_DEBIT_NOT_AUTHORISED" ||
      String(lastMessage).toLowerCase().includes("not yet been authorised");

    if (!notReady || attempt === 4) {
      break;
    }
  }

  throw new Error(
    typeof lastMessage === "string"
      ? lastMessage
      : "Confirm failed. Direct debit may still be activating — wait a moment and try again."
  );
}

async function refreshStatus({ syncUi = true } = {}) {
  if (!state.checkout?.checkout_id) return null;
  const res = await fetch(
    `${apiBase()}/status?checkout_id=${encodeURIComponent(state.checkout.checkout_id)}`,
    { credentials: "same-origin" }
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) return null;
  if (json.records?.dda_id) state.checkout.dda_id = json.records.dda_id;
  state.checkout.status = json.checkout?.status || state.checkout.status;
  state.checkout.direct_debit = json.direct_debit || null;
  if (syncUi) {
    applyDdaStatusFromPayload(json.direct_debit || {});
  }
  persistDraft();
  updateConfirmEnabled();
  return json;
}

function applyDdaStatusFromPayload(directDebit = {}) {
  // Never treat "Customer In Progress" alone as complete — that is also the
  // status right after /dd-setup creates a hosted flow URL.
  if (!isBankDetailsCollectedStatus(directDebit)) {
    return false;
  }

  const ddStatus = String(directDebit.status || "")
    .trim()
    .toLowerCase();
  const processor = String(
    directDebit.processor_status || directDebit.mandate_status || ""
  )
    .trim()
    .toLowerCase();
  const authorised = ddStatus === "authorised" || processor === "active";

  showDdaComplete({
    authorised,
    pending: !authorised
  });
  // Do not close the popup here — watchDdaPopup / return message own that.
  return true;
}

function closeDdaPopup() {
  const popup = state.popup;
  if (!popup) return;
  try {
    if (!popup.closed) popup.close();
  } catch {
    // ignore
  }
  state.popup = null;
}

function stopDdaPopupWatch() {
  if (state.ddaWatchTimer) {
    clearInterval(state.ddaWatchTimer);
    state.ddaWatchTimer = null;
  }
}

function watchDdaPopup(popup) {
  stopDdaPopupWatch();
  state.popup = popup || state.popup;
  const started = Date.now();
  let bankDetailsCollected = false;

  state.ddaWatchTimer = setInterval(async () => {
    const current = state.popup;
    const closed = !current || current.closed;

    try {
      // Poll without driving "setup received" UI from Customer In Progress.
      const json = await refreshStatus({ syncUi: true });
      if (isBankDetailsCollectedStatus(json?.direct_debit || {})) {
        bankDetailsCollected = true;
      }
    } catch {
      // ignore transient poll errors
    }

    // Only auto-close once bank details / mandate have progressed — never
    // because a flow URL was created (Customer In Progress).
    if (bankDetailsCollected) {
      stopDdaPopupWatch();
      closeDdaPopup();
      return;
    }

    if (closed) {
      stopDdaPopupWatch();
      state.popup = null;
      try {
        const json = await refreshStatus({ syncUi: true });
        if (isBankDetailsCollectedStatus(json?.direct_debit || {})) {
          return;
        }
        // Return handoff may have already set ddaReady via postMessage.
        if (state.ddaReady || state.ddaAuthorised) {
          return;
        }
      } catch {
        // ignore
      }
      setDdaStatus(
        "Direct debit popup closed before bank authorisation finished. Click Set Up Direct Debit to continue."
      );
      return;
    }

    if (Date.now() - started > 6 * 60 * 1000) {
      stopDdaPopupWatch();
    }
  }, 2000);
}

function writePopupHtml(popup, { title, body, tone = "info" }) {
  if (!popup || popup.closed) return;
  const colour =
    tone === "error" ? "#8b2e2e" : tone === "success" ? "#2f6f4e" : "#5a332b";
  const safeTitle = escapeHtml(title);
  const safeBody = escapeHtml(body);
  try {
    popup.document.open();
    popup.document.write(`<!doctype html>
<html lang="en-NZ">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: Arial, "Helvetica Neue", sans-serif;
        color: #5a332b;
        background: linear-gradient(180deg, #faf7f4, #f3ebe6);
      }
      main {
        width: min(420px, calc(100% - 2rem));
        padding: 1.4rem 1.5rem;
        border-radius: 16px;
        background: #ffffff;
        border: 1px solid rgba(90,51,43,0.14);
        box-shadow: 0 18px 40px rgba(90,51,43,0.1);
      }
      h1 { margin: 0 0 0.5rem; font-size: 1.2rem; color: ${colour}; }
      p { margin: 0; color: #7a564e; line-height: 1.45; white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <main>
      <h1>${safeTitle}</h1>
      <p>${safeBody}</p>
    </main>
  </body>
</html>`);
    popup.document.close();
  } catch {
    // Popup may already have navigated cross-origin.
  }
}

function resolveSetupUrl(setupUrl) {
  // Direct debit setup must stay on the NZ API host (JWT + GoCardless).
  // Provider Experience only hosts this enrolment UI and demo proxies.
  return setupUrl || null;
}

function openDdaPopupShell() {
  const width = 720;
  const height = 860;
  const left = Math.round(
    window.screenX + Math.max(0, (window.outerWidth - width) / 2)
  );
  const top = Math.round(
    window.screenY + Math.max(0, (window.outerHeight - height) / 2)
  );
  const features = [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    "resizable=yes",
    "scrollbars=yes"
  ].join(",");

  // Open synchronously on the click gesture to avoid popup blockers.
  // Do NOT use noopener — return page needs window.opener for postMessage/close.
  // Unique name per attempt avoids reusing a cross-origin return/GoCardless
  // window that can no longer accept document.write / location updates.
  const popupName = `studentpay-dda-nz-${Date.now()}`;
  const popup = window.open("", popupName, features);
  if (!popup) return null;

  writePopupHtml(popup, {
    title: "Preparing StudentPay…",
    body: "Creating your New Zealand direct debit setup. This window will continue to secure bank authorisation."
  });
  return popup;
}

function formatCheckoutError(json, status) {
  const err = json?.error;
  if (typeof err === "string" && err.trim()) return err;
  if (err && typeof err === "object") {
    const parts = [err.message || err.code].filter(Boolean);
    if (json?.missingFields?.length) {
      parts.push(`Missing: ${json.missingFields.join(", ")}`);
    }
    if (json?.invalidFields?.length) {
      parts.push(`Invalid: ${json.invalidFields.join(", ")}`);
    }
    if (parts.length) return parts.join(" — ");
  }
  if (status === 503) {
    return "PROVIDER_API_KEY_BELA_NZ is not configured on this StudentPay NZ sandbox environment.";
  }
  if (status === 401) {
    return "This preview deployment requires Vercel authentication. Refresh the page, sign in, then try again.";
  }
  return `Checkout failed (${status || "unknown"}).`;
}

async function handleSetupDda() {
  if (state.busy) return;
  const detailError = validateDetails();
  if (detailError) {
    showError(detailError);
    return;
  }

  const values = readForm();
  if (!values.first_payment_date) {
    showError("First payment date is required.");
    return;
  }

  // Fresh attempt — clear any previous "setup received" so Confirm stays
  // disabled until return handoff / bank details are actually collected.
  stopDdaPopupWatch();
  closeDdaPopup();
  state.ddaReady = false;
  state.ddaAuthorised = false;
  if (els.ddaDone) els.ddaDone.hidden = true;
  if (els.ddaPanel) els.ddaPanel.hidden = false;
  updateConfirmEnabled();
  persistDraft();

  const popup = openDdaPopupShell();
  if (!popup) {
    showError(
      "Your browser blocked the StudentPay popup. Allow popups for this site, then try Set Up Direct Debit again."
    );
    return;
  }

  state.popup = popup;
  state.busy = true;
  els.setupDda.disabled = true;
  showError("");
  setDdaStatus("Creating your StudentPay NZ checkout…");

  try {
    const checkout = await createCheckout();
    const setupUrl = resolveSetupUrl(checkout.setup_url);
    if (!setupUrl) {
      throw new Error(
        "No direct debit setup URL was returned from the sandbox. Check PROVIDER_API_KEY_BELA_NZ and GoCardless/DDA configuration."
      );
    }

    if (popup.closed) {
      // Popup was closed before navigation — continue in this tab.
      setDdaStatus("Continuing direct debit setup in this tab…");
      window.location.assign(setupUrl);
      return;
    }

    setDdaStatus(
      "Checkout created. Complete bank authorisation in the StudentPay popup, then this page will update."
    );

    writePopupHtml(popup, {
      title: "Opening bank authorisation…",
      body: "Taking you to StudentPay secure direct debit setup."
    });

    try {
      popup.location.replace(setupUrl);
    } catch {
      try {
        popup.location.href = setupUrl;
      } catch {
        window.location.assign(setupUrl);
      }
    }

    watchDdaPopup(popup);
    updateConfirmEnabled();
  } catch (err) {
    const message = err.message || "Unable to start direct debit setup.";
    setDdaStatus("");
    showError(message);
    writePopupHtml(popup, {
      title: "Direct debit setup could not start",
      body: `${message}\n\nYou can close this window and try again from the enrolment page.`,
      tone: "error"
    });
    // Keep popup open so the failure reason is visible (do not auto-close).
  } finally {
    state.busy = false;
    els.setupDda.disabled = false;
  }
}

function onDdaReturnMessage(event) {
  const data = event?.data;
  if (!data || typeof data !== "object") return;

  const type = String(data.type || "");
  const status = String(data.status || "").toLowerCase();
  const isReturn =
    type === "studentpay:dda-authorised" ||
    type === "studentpay:dda-return" ||
    status === "authorised" ||
    status === "setup_received";

  if (!isReturn) return;

  if (data.ddaId && state.checkout) {
    state.checkout.dda_id = data.ddaId;
  }

  if (status === "authorised" || type === "studentpay:dda-authorised") {
    showDdaComplete({ authorised: true });
  } else {
    showDdaComplete({ pending: true });
  }

  showError("");
  setDdaStatus("");
  stopDdaPopupWatch();
  closeDdaPopup();
  // Soft refresh authoritative status from the API.
  refreshStatus().catch(() => {});
}

async function handleConfirm(event) {
  event.preventDefault();
  if (state.busy) return;

  const detailError = validateDetails();
  if (detailError) {
    showError(detailError);
    return;
  }

  const declarationError = validateDeclarations();
  if (declarationError) {
    showError(declarationError);
    return;
  }

  const values = readForm();
  state.busy = true;
  els.submit.disabled = true;
  showError("");

  try {
    if (values.payment_choice === "weekly_plan") {
      if (!state.checkout) {
        throw new Error("Set up direct debit before confirming enrolment.");
      }
      await refreshStatus();
      const result = await confirmCheckout();
      const valuesAfter = readForm();
      sessionStorage.removeItem(STORAGE_KEY);
      const agreementOk = Boolean(
        result?.agreement?.id ||
          result?.records?.agreement_id ||
          result?.payment_plan_agreement?.id ||
          result?.pdf?.content_document_id ||
          result?.success !== false
      );
      const providerUrl =
        state.config?.product_url ||
        "https://belabeautycollege.com/products/the-ultimate-lash-business-bundle";
      showOutcome({
        title: "You’re enrolled",
        bodyHtml: buildWeeklySuccessHtml({
          firstPaymentDate: valuesAfter.first_payment_date,
          agreementOk
        }),
        actions: [
          {
            label: "Return to Bela Beauty College",
            primary: true,
            href: providerUrl,
            external: true
          },
          {
            label: "Start another enrolment",
            onClick: () => window.location.assign("./")
          }
        ],
        debug: isSandboxDebugHost() ? result : null
      });
      return;
    }

    const checkout = await createCheckout();
    sessionStorage.removeItem(STORAGE_KEY);
    showOutcome({
      title: "Enrolment created",
      body: "Pay-in-full checkout was created in the StudentPay NZ sandbox. Card capture for NZ upfront payments is still being finalised on the API side.",
      actions: [
        {
          label: "Start another enrolment",
          primary: true,
          onClick: () => window.location.assign("./")
        }
      ],
      debug: checkout.raw
    });
  } catch (err) {
    showError(err.message || "Unable to confirm enrolment.");
    updateConfirmEnabled();
  } finally {
    state.busy = false;
  }
}

function handleBankReturn() {
  showDdaComplete({ pending: true });
  updatePaymentMode();
  document.getElementById("enrol")?.scrollIntoView({ behavior: "smooth" });
  refreshStatus().catch(() => {});
}

function wireForm() {
  els.form.addEventListener("change", () => {
    updatePaymentMode();
    showError("");
  });
  els.form.addEventListener("input", () => {
    renderReview();
    updateConfirmEnabled();
    persistDraft();
  });
  els.form.addEventListener("submit", handleConfirm);
  els.setupDda.addEventListener("click", handleSetupDda);
  window.addEventListener("message", onDdaReturnMessage);
}

function bootFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const step = params.get("step");
  if (step === "bank-return" || step === "return") {
    restoreDraft();
    handleBankReturn();
    return;
  }
  if (step === "cancelled") {
    showOutcome({
      title: "Bank setup cancelled",
      body: "No problem — you can restart enrolment whenever you’re ready.",
      actions: [
        {
          label: "Back to enrolment",
          primary: true,
          onClick: () => window.location.assign("./")
        }
      ]
    });
  }
}

if (els.firstPaymentDate && !els.firstPaymentDate.value) {
  els.firstPaymentDate.value = defaultFirstPaymentDate();
}

restoreDraft();
wireForm();
wireTermsModal();
updatePaymentMode();
loadConfig();
bootFromQuery();
if (state.checkout?.checkout_id) {
  refreshStatus({ syncUi: true }).catch(() => {});
}
