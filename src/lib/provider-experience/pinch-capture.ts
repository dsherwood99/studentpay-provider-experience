const PINCH_CAPTURE_SCRIPT =
  "https://cdn.getpinch.com.au/capturejs/pinch.capture.v2.js";

/** Pinch sandbox Visa — any future expiry + any CVC. */
export const PINCH_SANDBOX_TEST_CARD = "4242424242424242";

type PinchCaptureInstance = {
  createToken: (input: Record<string, string>) => Promise<{
    token?: string;
    source_token?: string;
    sourceToken?: string;
    id?: string;
  }>;
};

type PinchCaptureConstructor = {
  new (options: { publishableKey: string }): PinchCaptureInstance;
  (options: { publishableKey: string }): PinchCaptureInstance;
};

type PinchGlobal = {
  Capture: PinchCaptureConstructor;
};

declare global {
  interface Window {
    Pinch?: PinchGlobal;
  }
}

let scriptLoadPromise: Promise<void> | null = null;

function loadPinchCaptureScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Pinch Capture.js is browser-only."));
  }

  if (window.Pinch?.Capture) {
    return Promise.resolve();
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${PINCH_CAPTURE_SCRIPT}"]`,
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Pinch Capture.js.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = PINCH_CAPTURE_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Pinch Capture.js."));
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

export function parseCardExpiry(expiry: string): {
  expiryMonth: string;
  expiryYear: string;
} {
  const digits = expiry.replace(/\D/g, "");

  if (digits.length < 4) {
    throw new Error("Enter card expiry as MM/YY.");
  }

  const expiryMonth = digits.slice(0, 2);
  const yearPart = digits.slice(2);
  const expiryYear =
    yearPart.length === 2 ? `20${yearPart}` : yearPart.slice(0, 4);

  const monthNumber = Number(expiryMonth);
  if (!Number.isFinite(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    throw new Error("Enter a valid expiry month (01–12).");
  }

  if (!/^\d{4}$/.test(expiryYear)) {
    throw new Error("Enter a valid expiry year.");
  }

  return { expiryMonth, expiryYear };
}

function formatPinchError(error: unknown): string {
  if (!error) {
    return "Pinch card tokenisation failed.";
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === "object") {
    const record = error as Record<string, unknown>;

    for (const key of ["message", "error", "detail", "title", "description"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }

    if (Array.isArray(record.errors) && record.errors.length) {
      const parts = record.errors
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }
          if (item && typeof item === "object") {
            const nested = item as Record<string, unknown>;
            return (
              (typeof nested.message === "string" && nested.message) ||
              (typeof nested.error === "string" && nested.error) ||
              ""
            );
          }
          return "";
        })
        .filter(Boolean);

      if (parts.length) {
        return parts.join("; ");
      }
    }

    try {
      return JSON.stringify(error);
    } catch {
      return "Pinch card tokenisation failed.";
    }
  }

  return String(error);
}

function createCaptureInstance(publishableKey: string): PinchCaptureInstance {
  const Capture = window.Pinch?.Capture;

  if (!Capture) {
    throw new Error("Pinch Capture.js did not initialise.");
  }

  try {
    return new Capture({ publishableKey });
  } catch {
    return Capture({ publishableKey });
  }
}

export async function createPinchCardToken({
  publishableKey,
  cardholderName,
  cardNumber,
  expiry,
  cvc,
}: {
  publishableKey: string;
  cardholderName: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
}): Promise<string> {
  if (!publishableKey.trim()) {
    throw new Error(
      "Pinch publishable key is not configured for this environment.",
    );
  }

  await loadPinchCaptureScript();

  const { expiryMonth, expiryYear } = parseCardExpiry(expiry);
  const capture = createCaptureInstance(publishableKey);

  let tokenResult: Awaited<ReturnType<PinchCaptureInstance["createToken"]>>;

  try {
    tokenResult = await capture.createToken({
      sourceType: "credit-card",
      cardNumber: cardNumber.replace(/\s+/g, ""),
      expiryMonth,
      expiryYear,
      cvc: cvc.trim(),
      cardHolderName: cardholderName.trim(),
    });
  } catch (error) {
    const detail = formatPinchError(error);
    throw new Error(
      `${detail} Use a Pinch sandbox test card such as ${PINCH_SANDBOX_TEST_CARD}.`,
    );
  }

  const token =
    tokenResult?.token ||
    tokenResult?.source_token ||
    tokenResult?.sourceToken ||
    tokenResult?.id;

  if (!token) {
    throw new Error(
      `Pinch did not return a card token. Use a Pinch sandbox test card such as ${PINCH_SANDBOX_TEST_CARD}.`,
    );
  }

  return token;
}
