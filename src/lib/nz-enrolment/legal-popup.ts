export const LEGAL_POPUP_NAME = "studentpay-legal-agreement";
export const LEGAL_POPUP_WIDTH = 960;
export const LEGAL_POPUP_HEIGHT = 800;

const MOBILE_UA = /iphone|ipad|ipod|android|mobile/i;

export type HostedLegalKind = "payment-plan" | "direct-debit";

export function hostedLegalDocumentHref(
  kind: HostedLegalKind,
  options?: { popup?: boolean },
): string {
  const params = new URLSearchParams({ kind });
  if (options?.popup) {
    params.set("view", "popup");
  }
  return `/api/enrolment-checkout/legal?${params.toString()}`;
}

export function withLegalPopupView(href: string): string {
  const url = new URL(href, "https://enrol.studentpay.co.nz");
  url.searchParams.set("view", "popup");
  return `${url.pathname}?${url.searchParams.toString()}`;
}

export function withoutLegalPopupView(href: string): string {
  const url = new URL(href, "https://enrol.studentpay.co.nz");
  url.searchParams.delete("view");
  return `${url.pathname}?${url.searchParams.toString()}`;
}

export function legalPopupFeatures(screen: {
  screenX?: number;
  screenY?: number;
  outerWidth?: number;
  outerHeight?: number;
}): string {
  const width = LEGAL_POPUP_WIDTH;
  const height = LEGAL_POPUP_HEIGHT;
  const outerWidth = Number(screen.outerWidth) || width;
  const outerHeight = Number(screen.outerHeight) || height;
  const screenX = Number(screen.screenX) || 0;
  const screenY = Number(screen.screenY) || 0;
  const left = screenX + Math.max(0, (outerWidth - width) / 2);
  const top = screenY + Math.max(0, (outerHeight - height) / 2);
  return [
    `width=${width}`,
    `height=${height}`,
    `left=${Math.round(left)}`,
    `top=${Math.round(top)}`,
    "resizable=yes",
    "scrollbars=yes",
  ].join(",");
}

export function shouldUseDesktopLegalPopup(input: {
  innerWidth?: number;
  userAgent?: string;
  maxTouchPoints?: number;
}): boolean {
  const ua = String(input.userAgent || "");
  if (MOBILE_UA.test(ua)) {
    return false;
  }
  const width = Number(input.innerWidth) || 0;
  if (width > 0 && width < 768) {
    return false;
  }
  return true;
}

export function shouldHandleLegalAgreementClick(event: {
  button?: number;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}): boolean {
  if (event.button != null && event.button !== 0) {
    return false;
  }
  return !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export function openLegalAgreementDocument(input: {
  href: string;
  preferDesktopPopup: boolean;
  screen: {
    screenX?: number;
    screenY?: number;
    outerWidth?: number;
    outerHeight?: number;
  };
  openWindow: (
    url: string,
    name: string,
    features?: string,
  ) => { focus?: () => void } | null;
  event?: {
    preventDefault: () => void;
    button?: number;
    metaKey?: boolean;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
  };
}): "popup" | "tab" | "ignored" {
  if (input.event && !shouldHandleLegalAgreementClick(input.event)) {
    return "ignored";
  }
  input.event?.preventDefault();
  const tabHref = withoutLegalPopupView(input.href);
  if (!input.preferDesktopPopup) {
    input.openWindow(tabHref, "_blank", "noopener,noreferrer");
    return "tab";
  }
  const popupHref = withLegalPopupView(input.href);
  const popup = input.openWindow(
    popupHref,
    LEGAL_POPUP_NAME,
    legalPopupFeatures(input.screen),
  );
  if (!popup) {
    input.openWindow(tabHref, "_blank", "noopener,noreferrer");
    return "tab";
  }
  popup.focus?.();
  return "popup";
}
