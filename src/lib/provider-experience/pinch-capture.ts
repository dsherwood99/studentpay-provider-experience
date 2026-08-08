const PINCH_CAPTURE_SCRIPT =
  "https://cdn.getpinch.com.au/capturejs/pinch.capture.v2.js";

type PinchCaptureInstance = {
  createToken: (input: Record<string, string>) => Promise<{
    token?: string;
    source_token?: string;
    sourceToken?: string;
    id?: string;
  }>;
};

type PinchGlobal = {
  Capture: new (options: { publishableKey: string }) => PinchCaptureInstance;
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

  if (!window.Pinch?.Capture) {
    throw new Error("Pinch Capture.js did not initialise.");
  }

  const { expiryMonth, expiryYear } = parseCardExpiry(expiry);
  const capture = new window.Pinch.Capture({ publishableKey });

  const tokenResult = await capture.createToken({
    sourceType: "credit-card",
    cardNumber: cardNumber.replace(/\s+/g, ""),
    expiryMonth,
    expiryYear,
    cvc: cvc.trim(),
    cardHolderName: cardholderName.trim(),
  });

  const token =
    tokenResult?.token ||
    tokenResult?.source_token ||
    tokenResult?.sourceToken ||
    tokenResult?.id;

  if (!token) {
    throw new Error("Pinch did not return a card token.");
  }

  return token;
}
