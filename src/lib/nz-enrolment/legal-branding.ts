import type { NzTenantBranding } from "./types.ts";

export const HOSTED_LEGAL_CHROME_TEST_ID = "nz-legal-hosted-chrome";
export const HOSTED_LEGAL_CLOSE_TEST_ID = "nz-legal-popup-close";

type LegalTenant = {
  displayName: string;
  branding: NzTenantBranding;
};

const SAFE_COLOUR =
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeCssColour(value: string | undefined, fallback: string): string {
  const colour = String(value || "").trim();
  return SAFE_COLOUR.test(colour) ? colour : fallback;
}

function safeCssFontFamily(value: string | undefined, fallback: string): string {
  const raw = String(value || "").trim();
  if (!raw || /[{};<>]/.test(raw)) {
    return fallback;
  }
  const withoutVars = raw.replace(/var\([^)]+\)\s*,?\s*/g, "").replace(/^,+/, "").trim();
  return withoutVars || fallback;
}

function safeAssetPath(value: string | undefined): string {
  const path = String(value || "").trim();
  if (!path.startsWith("/") || path.startsWith("//") || /[\s"'<>\\]/.test(path)) {
    return "";
  }
  return path;
}

function injectBeforeClosingTag(html: string, tag: "</head>" | "</body>" | "<body>", snippet: string): string {
  if (tag === "<body>") {
    const match = html.match(/<body[^>]*>/i);
    if (!match || match.index == null) {
      return `${snippet}${html}`;
    }
    const end = match.index + match[0].length;
    return `${html.slice(0, end)}${snippet}${html.slice(end)}`;
  }
  const index = html.toLowerCase().lastIndexOf(tag);
  if (index === -1) {
    return `${html}${snippet}`;
  }
  return `${html.slice(0, index)}${snippet}${html.slice(index)}`;
}

export function brandingOverlayCss(tenant: LegalTenant): string {
  const branding = tenant.branding;
  const primary = safeCssColour(branding.primaryColour, "#161b1a");
  const accent = safeCssColour(branding.ctaColour || branding.accentColour, primary);
  const background = safeCssColour(branding.backgroundColour, "#ffffff");
  const card = safeCssColour(branding.surfaceColour, "#ffffff");
  const text = safeCssColour(branding.textColour, "#161b1a");
  const muted = safeCssColour(branding.mutedTextColour, "#4f5f59");
  const font = safeCssFontFamily(branding.fontFamily, 'Inter, "Segoe UI", sans-serif');
  const headingFont = safeCssFontFamily(
    branding.headingFontFamily,
    font,
  );

  return `
    :root {
      --doc-primary: ${primary} !important;
      --doc-accent: ${accent} !important;
      --doc-background: ${background} !important;
      --doc-card: ${card} !important;
      --doc-text: ${text} !important;
      --doc-muted: ${muted} !important;
      --brand-primary: ${primary} !important;
      --brand-accent: ${accent} !important;
      --page-background: ${background} !important;
      --card-background: ${card} !important;
      --text-primary: ${text} !important;
      --text-secondary: ${muted} !important;
      --border-colour: ${accent} !important;
      --notice-border: ${accent} !important;
      --brand-font: ${font} !important;
    }
    html, body {
      background: ${background} !important;
      color: ${text} !important;
      font-family: ${font} !important;
    }
    .page-header h1,
    .document-header h1,
    h1, h2 {
      font-family: ${headingFont} !important;
    }
    .hosted-legal-chrome {
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 16px;
      background: ${card};
      border-bottom: 1px solid color-mix(in srgb, ${primary} 18%, #e6e1d8);
      color: ${text};
      font-family: ${font};
    }
    .hosted-legal-chrome-identity {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }
    .hosted-legal-chrome-identity img {
      max-height: 32px;
      max-width: 120px;
      object-fit: contain;
    }
    .hosted-legal-chrome-identity span {
      font-size: 0.92rem;
      font-weight: 700;
      letter-spacing: 0.01em;
    }
    .hosted-legal-close {
      flex-shrink: 0;
      min-height: 40px;
      border: 0;
      border-radius: 10px;
      padding: 8px 14px;
      background: ${accent};
      color: #fff;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    @media print {
      .hosted-legal-chrome {
        display: none !important;
      }
    }
  `;
}

function chromeMarkup(tenant: LegalTenant, popup: boolean): string {
  const logo = safeAssetPath(tenant.branding.logoPath);
  const name = escapeHtml(tenant.displayName);
  const close = popup
    ? `<button type="button" class="hosted-legal-close" data-testid="${HOSTED_LEGAL_CLOSE_TEST_ID}" onclick="window.close()">Close and return to enrolment</button>`
    : "";
  const image = logo
    ? `<img src="${escapeHtml(logo)}" alt="${name}" />`
    : "";
  return `<div class="hosted-legal-chrome" data-testid="${HOSTED_LEGAL_CHROME_TEST_ID}" data-provider-branding="hosted-tenant"><div class="hosted-legal-chrome-identity">${image}<span>${name}</span></div>${close}</div>`;
}

function popupOnlyChrome(): string {
  return `<div class="hosted-legal-chrome" data-testid="${HOSTED_LEGAL_CHROME_TEST_ID}"><button type="button" class="hosted-legal-close" data-testid="${HOSTED_LEGAL_CLOSE_TEST_ID}" onclick="window.close()">Close and return to enrolment</button></div>`;
}

export function applyHostedLegalDocumentPresentation(input: {
  html: string;
  tenant?: LegalTenant | null;
  popup?: boolean;
}): string {
  const html = String(input.html || "");
  if (!/<html/i.test(html)) {
    return html;
  }

  if (!input.tenant) {
    if (!input.popup) {
      return html;
    }
    const withStyles = injectBeforeClosingTag(
      html,
      "</head>",
      `<style data-hosted-legal-chrome="true">.hosted-legal-chrome{position:sticky;top:0;display:flex;justify-content:flex-end;padding:10px 16px;background:#fff;} .hosted-legal-close{min-height:40px;border:0;border-radius:10px;padding:8px 14px;background:#161b1a;color:#fff;font-weight:700;cursor:pointer;} @media print{.hosted-legal-chrome{display:none!important;}}</style>`,
    );
    return injectBeforeClosingTag(withStyles, "<body>", popupOnlyChrome());
  }

  const withStyles = injectBeforeClosingTag(
    html,
    "</head>",
    `<style data-hosted-legal-branding="tenant">${brandingOverlayCss(input.tenant)}</style>`,
  );
  return injectBeforeClosingTag(
    withStyles,
    "<body>",
    chromeMarkup(input.tenant, Boolean(input.popup)),
  );
}

export function hostedLegalViewIsPopup(value: string | null): boolean {
  return value === "popup";
}
