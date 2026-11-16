export const BANK_CAPTURE_SCRIPT =
  "https://cdn.getpinch.com.au/capturejs/pinch.capture.v2.js";

export const BSB_DIGIT_LENGTH = 6;
export const ACCOUNT_NUMBER_MAX_LENGTH = 9;

export type BankField = "accountName" | "bsb" | "accountNumber";
export type BankFieldErrors = Partial<Record<BankField, string>>;

const MESSAGES = {
  accountName: "Enter the account name.",
  bsb: "Enter a 6-digit BSB.",
  accountNumber: "Enter the account number.",
  accountNumberZeros: "Enter an account number that is not all zeros.",
} as const;

export function digitsOnly(value: string, maxLength: number): string {
  return String(value || "").replace(/\D/g, "").slice(0, maxLength);
}

export function formatBsb(digits: string): string {
  const clean = digitsOnly(digits, BSB_DIGIT_LENGTH);
  if (clean.length <= 3) return clean;
  return `${clean.slice(0, 3)}-${clean.slice(3)}`;
}

export function bankAccountForCapture(fields: {
  accountName: string;
  bsb: string;
  accountNumber: string;
}):
  | { ok: true; bankAccountName: string; bankAccountRouting: string; bankAccountNumber: string }
  | { ok: false; message: string; errors: BankFieldErrors } {
  const accountName = fields.accountName.trim();
  const bsb = digitsOnly(fields.bsb, BSB_DIGIT_LENGTH);
  const accountNumber = digitsOnly(fields.accountNumber, ACCOUNT_NUMBER_MAX_LENGTH);
  const errors: BankFieldErrors = {};
  if (!accountName) errors.accountName = MESSAGES.accountName;
  if (bsb.length !== BSB_DIGIT_LENGTH) errors.bsb = MESSAGES.bsb;
  if (!accountNumber) errors.accountNumber = MESSAGES.accountNumber;
  else if (/^0+$/.test(accountNumber)) errors.accountNumber = MESSAGES.accountNumberZeros;
  const message = errors.accountName || errors.bsb || errors.accountNumber || "";
  if (message) return { ok: false, message, errors };
  return {
    ok: true,
    bankAccountName: accountName,
    bankAccountRouting: bsb,
    bankAccountNumber: accountNumber,
  };
}

function tokenFrom(result: Record<string, unknown>): string {
  const nested = result.data && typeof result.data === "object"
    ? result.data as Record<string, unknown>
    : {};
  for (const candidate of [result.token, result.sourceToken, result.source_token, result.id, nested.token, nested.sourceToken]) {
    if (typeof candidate === "string" && /^[A-Za-z0-9._:-]{8,200}$/.test(candidate) && !/^\d+$/.test(candidate)) {
      return candidate;
    }
  }
  return "";
}

export async function createBankSourceToken(
  createToken: (input: {
    sourceType: "bank-account";
    bankAccountName: string;
    bankAccountRouting: string;
    bankAccountNumber: string;
  }) => Promise<Record<string, unknown>>,
  fields: { accountName: string; bsb: string; accountNumber: string },
): Promise<{ ok: true; token: string } | { ok: false; message: string; errors: BankFieldErrors }> {
  const prepared = bankAccountForCapture(fields);
  if (!prepared.ok) return prepared;
  try {
    const result = await createToken({
      sourceType: "bank-account",
      bankAccountName: prepared.bankAccountName,
      bankAccountRouting: prepared.bankAccountRouting,
      bankAccountNumber: prepared.bankAccountNumber,
    });
    const token = tokenFrom(result || {});
    if (!token) {
      return { ok: false, message: "Payment authorisation was not completed. No plan was created.", errors: {} };
    }
    return { ok: true, token };
  } catch {
    return {
      ok: false,
      message: "Payment authorisation was not completed. You can try again. No plan was created.",
      errors: {},
    };
  }
}
