import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const srcRoot = fileURLToPath(new URL("../../", import.meta.url));

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(full);
    }
    return /\.(ts|tsx|js|mjs)$/.test(entry.name) ? [full] : [];
  });
}

describe("NZ enrolment checkout security", () => {
  it("never prefixes provider API keys with NEXT_PUBLIC_", () => {
    const files = walk(srcRoot).filter((file) => !file.endsWith(".test.ts"));
    const hits: string[] = [];
    for (const file of files) {
      const text = fs.readFileSync(file, "utf8");
      if (
        /NEXT_PUBLIC_[A-Z0-9_]*PROVIDER_API_KEY\s*=/.test(text) ||
        /process\.env\.NEXT_PUBLIC_[A-Z0-9_]*PROVIDER_API_KEY/.test(text)
      ) {
        hits.push(path.relative(srcRoot, file));
      }
    }
    assert.deepEqual(hits, []);
  });

  it("keeps OLI out of generic checkout control flow", () => {
    const genericDirs = [
      path.join(srcRoot, "components/nz-enrolment"),
      path.join(srcRoot, "app/enrol"),
      path.join(srcRoot, "app/api/enrolment-checkout"),
      path.join(srcRoot, "lib/nz-enrolment"),
    ];
    const hits: string[] = [];
    for (const dir of genericDirs) {
      for (const file of walk(dir)) {
        if (file.endsWith("tenants.ts") || file.endsWith("courses.ts")) {
          continue;
        }
        if (file.endsWith(".test.ts")) {
          continue;
        }
        const text = fs.readFileSync(file, "utf8");
        if (
          /provider(?:Slug|Code)?\s*===\s*['"]oli['"]/i.test(text) ||
          /if\s*\(\s*provider\s*===\s*['"]OLI['"]/.test(text)
        ) {
          hits.push(path.relative(srcRoot, file));
        }
      }
    }
    assert.deepEqual(hits, []);
  });

  it("keeps generic PE demo navigation out of the provider-native header", () => {
    const header = fs.readFileSync(
      path.join(srcRoot, "components/nz-enrolment/ProviderNativeHeader.tsx"),
      "utf8",
    );
    const footer = fs.readFileSync(
      path.join(srcRoot, "components/nz-enrolment/ProviderNativeFooter.tsx"),
      "utf8",
    );
    for (const text of [header, footer]) {
      assert.doesNotMatch(text, /Provider demos/);
      assert.doesNotMatch(text, /View demo/);
      assert.doesNotMatch(text, /Enrolment checkout/);
      assert.doesNotMatch(text, /Developers/);
    }
    assert.match(header, /attributionLabel/);
  });

  it("does not change BFF enrolment-checkout route files in this presentation layer", () => {
    const bff = path.join(srcRoot, "app/api/enrolment-checkout/route.ts");
    const text = fs.readFileSync(bff, "utf8");
    assert.match(text, /sameOriginOrConfigured/);
    assert.match(text, /writeNzSession/);
    assert.doesNotMatch(text, /NEXT_PUBLIC_PROVIDER_API_KEY/);
  });

  it("keeps NZ enrolment checkout as a single page without a visual stepper", () => {
    const checkout = fs.readFileSync(
      path.join(srcRoot, "components/nz-enrolment/EnrolmentCheckout.tsx"),
      "utf8",
    );
    assert.match(checkout, /nz-enrolment-single-page/);
    assert.match(checkout, /nz-section-plan/);
    assert.match(checkout, /nz-section-student/);
    assert.match(checkout, /nz-section-dda/);
    assert.match(checkout, /nz-section-review/);
    assert.match(checkout, /NZ_DIRECT_DEBIT_CTA/);
    assert.match(checkout, /NZ_CONFIRM_CTA/);
    assert.doesNotMatch(checkout, /styles\.progress/);
    assert.doesNotMatch(checkout, /NZ_ENROLMENT_STEPS/);
    assert.doesNotMatch(checkout, /Payment option/);
    assert.doesNotMatch(checkout, /Enrolment progress/);
  });

  it("does not create or confirm checkout from an effect", () => {
    const checkout = fs.readFileSync(
      path.join(srcRoot, "components/nz-enrolment/EnrolmentCheckout.tsx"),
      "utf8",
    );
    const effects = [...checkout.matchAll(/useEffect\(\(\) => \{([\s\S]*?)\n  \},/g)];
    assert.ok(effects.length >= 1);
    for (const effect of effects) {
      assert.doesNotMatch(effect[1], /method:\s*["']POST["']/);
      assert.doesNotMatch(effect[1], /createCheckout\(/);
      assert.doesNotMatch(effect[1], /confirmCheckout\(/);
      assert.doesNotMatch(effect[1], /\/api\/enrolment-checkout["']/);
    }
    assert.match(checkout, /method: "POST"/);
    assert.match(checkout, /\/api\/enrolment-checkout\/confirm/);
  });
});
