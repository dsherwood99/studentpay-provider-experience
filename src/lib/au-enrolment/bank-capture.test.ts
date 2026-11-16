import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bankAccountForCapture, createBankSourceToken } from "./bank-capture.ts";

describe("Academy bank capture", () => {
  it("rejects an all-zero account before tokenisation", () => {
    const result = bankAccountForCapture({
      accountName: "Sarah Nguyen",
      bsb: "123456",
      accountNumber: "000000",
    });
    assert.equal(result.ok, false);
  });

  it("returns a token and does not treat the account number as the token", async () => {
    const result = await createBankSourceToken(async () => ({ token: "src_12345678" }), {
      accountName: "Sarah Nguyen",
      bsb: "123-456",
      accountNumber: "12345678",
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.token, "src_12345678");
  });

  it("rejects a numeric-only token", async () => {
    const result = await createBankSourceToken(async () => ({ token: "123456789" }), {
      accountName: "Sarah Nguyen",
      bsb: "123456",
      accountNumber: "12345678",
    });
    assert.equal(result.ok, false);
  });
});
