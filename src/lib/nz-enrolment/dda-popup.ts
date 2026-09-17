export const DDA_RETURN_MESSAGE_TYPE = "studentpay:dda-return" as const;
export const DDA_POPUP_NAME = "studentpay-dda-setup";
export const DDA_POPUP_WIDTH = 580;
export const DDA_POPUP_HEIGHT = 760;

export const TRUSTED_DDA_RETURN_ORIGINS = [
  "https://api.studentpay.co.nz",
  "https://sandbox-api.studentpay.co.nz",
] as const;

export const HOSTED_ENROLMENT_ORIGIN = "https://enrol.studentpay.co.nz";

export type DdaReturnResult = "success" | "cancelled" | "processing";

export type DdaReturnMessage = {
  type: typeof DDA_RETURN_MESSAGE_TYPE;
  result: DdaReturnResult;
  dda_id?: string | null;
  checkout_id?: string | null;
};

export type DdaPopupHandle = {
  closed: boolean;
  locationHref?: string;
  focus?: () => void;
  close?: () => void;
  assign?: (url: string) => void;
};

const MOBILE_UA = /iphone|ipad|ipod|android|mobile/i;

export function ddaPopupFeatures(screen: {
  screenX?: number;
  screenY?: number;
  outerWidth?: number;
  outerHeight?: number;
}): string {
  const width = DDA_POPUP_WIDTH;
  const height = DDA_POPUP_HEIGHT;
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

export function shouldUseDesktopDdaPopup(input: {
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

export function isTrustedDdaReturnOrigin(origin: string): boolean {
  return (TRUSTED_DDA_RETURN_ORIGINS as readonly string[]).includes(origin);
}

export function parseTrustedDdaReturnMessage(event: {
  origin: string;
  data: unknown;
}): DdaReturnMessage | null {
  if (!isTrustedDdaReturnOrigin(event.origin)) {
    return null;
  }
  const data = event.data;
  if (!data || typeof data !== "object") {
    return null;
  }
  const record = data as Record<string, unknown>;
  if (record.type !== DDA_RETURN_MESSAGE_TYPE) {
    return null;
  }
  const result = record.result;
  if (result !== "success" && result !== "cancelled" && result !== "processing") {
    return null;
  }
  const ddaId =
    typeof record.dda_id === "string"
      ? record.dda_id
      : typeof record.ddaId === "string"
        ? record.ddaId
        : null;
  const checkoutId =
    typeof record.checkout_id === "string"
      ? record.checkout_id
      : typeof record.checkoutId === "string"
        ? record.checkoutId
        : null;
  return {
    type: DDA_RETURN_MESSAGE_TYPE,
    result,
    dda_id: ddaId,
    checkout_id: checkoutId,
  };
}

export function ddaPopupPreparingHtml(): string {
  return `<!doctype html>
<html lang="en-NZ">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Preparing Direct Debit setup</title>
  </head>
  <body style="margin:0;min-height:100vh;display:grid;place-items:center;padding:32px;box-sizing:border-box;font-family:'Segoe UI',sans-serif;color:#1c2b24;background:#f3f7f4;text-align:center;">
    <div>
      <h1 style="margin:0 0 12px;font-size:1.35rem;">StudentPay NZ</h1>
      <p style="margin:0;color:#4f5f59;">Preparing Direct Debit setup…</p>
    </div>
  </body>
</html>`;
}

export function shouldRefreshStatusAfterDdaReturn(message: DdaReturnMessage | null): boolean {
  return Boolean(message);
}

export function shouldCreateDdaSession(input: {
  alreadyCreated: boolean;
  popupOpen: boolean;
  setupComplete: boolean;
}): boolean {
  return !input.alreadyCreated && !input.popupOpen && !input.setupComplete;
}

export type DdaSetupClickInput = {
  popupOpen: boolean;
  alreadyCreated: boolean;
  setupUrl: string;
  setupComplete: boolean;
  canCreate: boolean;
  preferDesktopPopup: boolean;
  screen: {
    screenX?: number;
    screenY?: number;
    outerWidth?: number;
    outerHeight?: number;
  };
  openWindow: (url: string, name: string, features: string) => DdaPopupHandle | null;
  createOrLoad: () => Promise<{ setupUrl: string }>;
};

export type DdaSetupClickResult = {
  openedPopupBeforeCreate: boolean;
  createOrLoadCalled: boolean;
  navigatedPopupTo: string | null;
  closedPopupOnError: boolean;
  usedSameTabFallback: boolean;
  focusedExistingPopup: boolean;
  skippedDuplicateCreate: boolean;
};

export async function runDdaSetupClick(
  input: DdaSetupClickInput,
): Promise<DdaSetupClickResult> {
  const result: DdaSetupClickResult = {
    openedPopupBeforeCreate: false,
    createOrLoadCalled: false,
    navigatedPopupTo: null,
    closedPopupOnError: false,
    usedSameTabFallback: false,
    focusedExistingPopup: false,
    skippedDuplicateCreate: false,
  };

  if (input.setupComplete) {
    result.skippedDuplicateCreate = true;
    return result;
  }

  if (input.popupOpen) {
    result.focusedExistingPopup = true;
    result.skippedDuplicateCreate = true;
    return result;
  }

  const features = input.preferDesktopPopup ? ddaPopupFeatures(input.screen) : "";
  const popup = input.openWindow("", DDA_POPUP_NAME, features);
  result.openedPopupBeforeCreate = true;

  const navigate = (url: string) => {
    if (popup && !popup.closed) {
      if (popup.assign) {
        popup.assign(url);
      } else {
        popup.locationHref = url;
      }
      popup.focus?.();
      result.navigatedPopupTo = url;
      return;
    }
    result.usedSameTabFallback = true;
    result.navigatedPopupTo = url;
  };

  if (input.alreadyCreated && input.setupUrl) {
    result.skippedDuplicateCreate = true;
    navigate(input.setupUrl);
    return result;
  }

  if (!input.canCreate) {
    if (popup && !popup.closed) {
      popup.close?.();
      result.closedPopupOnError = true;
    }
    return result;
  }

  try {
    result.createOrLoadCalled = true;
    const loaded = await input.createOrLoad();
    if (!loaded.setupUrl) {
      throw new Error("Missing Direct Debit setup URL.");
    }
    navigate(loaded.setupUrl);
    return result;
  } catch {
    if (popup && !popup.closed) {
      popup.close?.();
      result.closedPopupOnError = true;
    }
    return result;
  }
}

export function handleManuallyClosedDdaPopup(input: {
  alreadyCreated: boolean;
}): { refreshStatusOnce: boolean; createAnotherDda: boolean } {
  return {
    refreshStatusOnce: input.alreadyCreated,
    createAnotherDda: false,
  };
}
