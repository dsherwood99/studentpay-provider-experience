import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { courses } from "../../config/courses.ts";
import { providers } from "../../config/providers.ts";

const srcRoot = fileURLToPath(new URL("../../", import.meta.url));

function walkSourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkSourceFiles(fullPath));
      continue;
    }

    if (/\.(ts|tsx|js|jsx|mjs|cjs|md|example)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

describe("Bela production security contract", () => {
  it("never prefixes BELA_API_KEY with NEXT_PUBLIC_", () => {
    const files = walkSourceFiles(srcRoot).filter(
      (file) => !file.endsWith(".test.ts"),
    );
    const hits: string[] = [];

    for (const file of files) {
      const text = fs.readFileSync(file, "utf8");
      if (text.includes("NEXT_PUBLIC_BELA_API_KEY") || /NEXT_PUBLIC_[^\n]*BELA_API_KEY/.test(text)) {
        hits.push(path.relative(srcRoot, file));
      }
    }

    assert.deepEqual(hits, []);
  });

  it("does not hardcode the 20 production Bela courses or prices in PE config", () => {
    const courseSource = fs.readFileSync(
      path.join(srcRoot, "config/courses.ts"),
      "utf8",
    );
    const providerSource = fs.readFileSync(
      path.join(srcRoot, "config/providers.ts"),
      "utf8",
    );
    const bindingSource = fs.readFileSync(
      path.join(srcRoot, "lib/provider-experience/provider-bindings.ts"),
      "utf8",
    );

    assert.equal(
      courses.filter((course) => course.providerCode === "BELA").length,
      0,
    );
    assert.doesNotMatch(courseSource, /BRIDAL_FREELANCER_BUNDLE/);
    assert.doesNotMatch(courseSource, /CLASSIC_LASH/);
    assert.doesNotMatch(providerSource, /3500/);
    assert.doesNotMatch(providerSource, /BRIDAL_FREELANCER/);
    assert.doesNotMatch(bindingSource, /BRIDAL_FREELANCER/);
    assert.doesNotMatch(bindingSource, /BELA-AU-2026-08-25-v1/);
  });

  it("does not hardcode the production agreement version into app source", () => {
    const files = walkSourceFiles(srcRoot).filter(
      (file) => !file.endsWith(".test.ts"),
    );
    const hits: string[] = [];

    for (const file of files) {
      const text = fs.readFileSync(file, "utf8");
      if (text.includes("BELA-AU-2026-08-25-v1")) {
        hits.push(path.relative(srcRoot, file));
      }
    }

    assert.deepEqual(hits, []);
  });

  it("keeps API keys out of client component source", () => {
    const clientFiles = walkSourceFiles(path.join(srcRoot, "components")).filter(
      (file) => {
        const text = fs.readFileSync(file, "utf8");
        return text.includes('"use client"');
      },
    );
    const hits: string[] = [];

    for (const file of clientFiles) {
      const text = fs.readFileSync(file, "utf8");
      if (/BELA_API_KEY|BELA_BEAUTY_SANDBOX_API_KEY|ACADEMYAU_API_KEY/.test(text)) {
        hits.push(path.relative(srcRoot, file));
      }
    }

    assert.deepEqual(hits, []);
  });

  it("keeps dedicated Bela chrome free of Academy, sandbox and generic PE demo paths", () => {
    const header = fs.readFileSync(
      path.join(srcRoot, "components/layout/BelaBeautyHeader.tsx"),
      "utf8",
    );
    const footer = fs.readFileSync(
      path.join(srcRoot, "components/layout/BelaBeautyFooter.tsx"),
      "utf8",
    );
    const isolation = fs.readFileSync(
      path.join(srcRoot, "lib/provider-experience/host-isolation.ts"),
      "utf8",
    );
    const combined = `${header}\n${footer}\n${isolation}`;

    assert.doesNotMatch(combined, /academy-australia/);
    assert.doesNotMatch(combined, /criminal-psychology/);
    assert.doesNotMatch(combined, /bela-beauty-sandbox/);
    assert.doesNotMatch(combined, /makeup-artistry/);
    assert.doesNotMatch(combined, /Provider demos/);
    assert.doesNotMatch(combined, /StudentPayHomePage/);
  });

  it("keeps Academy on configured courses rather than Bela catalogue mode", () => {
    const academy = providers.find((provider) => provider.slug === "academy-australia");
    const makeup = courses.find((course) => course.slug === "makeup-artistry");

    assert.notEqual(academy?.catalogueEnabled, true);
    assert.equal(makeup?.providerCode, "ACADEMY_AUSTRALIA");
    assert.equal(academy?.code, "ACADEMY_AUSTRALIA");
  });
});
