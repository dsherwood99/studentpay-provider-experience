import assert from "node:assert/strict";
import test from "node:test";
import { kitDisclosureForPolicy } from "./kit-policy.ts";
import { NZ_TENANTS } from "./tenants.ts";

test("kit disclosure is tuition-only and does not invent a kit price", () => {
  const copy = kitDisclosureForPolicy("KIT_NOT_INCLUDED");
  assert.match(copy || "", /course tuition only/);
  assert.match(copy || "", /Kit not included/);
  assert.doesNotMatch(copy || "", /\$/);
  assert.equal(kitDisclosureForPolicy("KIT_UPFRONT_PAYMENT"), null);
  assert.equal(kitDisclosureForPolicy(undefined), null);
});

test("Bela uses kit not included and OLI does not gain a kit policy", () => {
  const bela = NZ_TENANTS.find((tenant) => tenant.slug === "bela-nz");
  const oli = NZ_TENANTS.find((tenant) => tenant.slug === "oli");
  assert.equal(bela?.kitPolicy, "KIT_NOT_INCLUDED");
  assert.equal(bela?.legalName, "Jessica Buff trading as Bela Beauty College");
  assert.equal(oli?.kitPolicy, undefined);
});
