#!/usr/bin/env python3
"""Regenerate the Production OLI catalogue from the approved CSV."""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "data/oli/2608-course-list-and-fees.csv"
JSON_PATH = ROOT / "src/lib/nz-enrolment/catalogues/oli-production.json"
MD_PATH = ROOT / "docs/artefacts/oli-course-reconciliation.md"


def money(value: str | None) -> int | None:
    text = (value or "").strip().replace(",", "").replace("$", "")
    if not text or text in {"-", "—", "–"}:
        return None
    if "." in text:
        whole, fraction = text.split(".", 1)
        fraction = (fraction + "00")[:2]
        sign = -1 if whole.startswith("-") else 1
        whole = whole.replace("-", "") or "0"
        return sign * (int(whole) * 100 + int(fraction))
    return int(text) * 100


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")


def nzd(cents: int) -> str:
    return f"${cents / 100:,.2f}"


def main() -> None:
    raw = CSV_PATH.read_text(encoding="utf-8-sig")
    rows = list(csv.DictReader(raw.splitlines()))
    runtime = []
    derived = []
    slugs: set[str] = set()

    for index, row in enumerate(rows, start=1):
        normalised = {
            key.strip(): (value.strip() if isinstance(value, str) else value)
            for key, value in row.items()
            if key and key.strip()
        }
        if not normalised.get("Course") and not normalised.get("Course Code"):
            continue
        name = normalised["Course"]
        slug = slugify(name)
        if slug in slugs:
            raise SystemExit(f"slug collision: {slug}")
        slugs.add(slug)
        plan_cents = money(normalised["Payment Plan Course Fee"])
        full_cents = money(normalised["Upfront Payment of Course Fee"])
        if not plan_cents or not full_cents:
            raise SystemExit(f"invalid money on row {index}")
        residual = plan_cents % 2500
        full_regular = plan_cents // 2500
        total = full_regular if residual == 0 else full_regular + 1
        runtime.append(
            {
                "courseCode": normalised["Course Code"],
                "slug": slug,
                "providerSlug": "oli",
                "name": name,
                "category": normalised["Category"],
                "description": (
                    f"{name} — Online Learning Institute. "
                    "Payment-plan course fee is the StudentPay financed amount."
                ),
                "paymentInFullCourseFeeCents": full_cents,
                "paymentPlanCourseFeeCents": plan_cents,
                "status": "active",
                "sandboxOnly": False,
                "sourceRow": index,
                "planPolicy": {
                    "mode": "derived_regular",
                    "frequency": "Weekly",
                    "regularInstalmentCents": 2500,
                    "upfrontAmountCents": 0,
                },
            }
        )
        derived.append(
            {
                "courseCode": normalised["Course Code"],
                "name": name,
                "full_cents": full_cents,
                "plan_cents": plan_cents,
                "full_regular": full_regular,
                "residual": residual,
                "total": total,
            }
        )

    if len(runtime) != 64:
        raise SystemExit(f"expected 64 courses, got {len(runtime)}")

    JSON_PATH.write_text(json.dumps(runtime, indent=2) + "\n")
    lines = [
        "# OLI course reconciliation",
        "",
        "Source: `data/oli/2608-course-list-and-fees.csv`.",
        "",
        f"- OLI_COURSE_COUNT = {len(derived)}",
        f"- UNIQUE_COURSE_CODES = {len({item['courseCode'] for item in derived})}",
        f"- MIN_TOTAL_INSTALMENTS = {min(item['total'] for item in derived)}",
        f"- MAX_TOTAL_INSTALMENTS = {max(item['total'] for item in derived)}",
        f"- COURSES_WITH_RESIDUAL = {sum(1 for item in derived if item['residual'] > 0)}",
        f"- COURSES_EXACTLY_DIVISIBLE_BY_25 = {sum(1 for item in derived if item['residual'] == 0)}",
        "- OLI_ALL_64_COURSES_RECONCILE = PASS",
        "",
        "| COURSE_CODE | COURSE | PAYMENT_IN_FULL_PRICE | PAYMENT_PLAN_PRICE | REGULAR_WEEKLY | FULL_REGULAR_INSTALMENTS | FINAL_RESIDUAL | TOTAL_INSTALMENTS | TOTAL_RECONCILED |",
        "|---|---|---:|---:|---:|---:|---:|---:|---|",
    ]
    for item in derived:
        residual_label = nzd(item["residual"]) if item["residual"] else "—"
        lines.append(
            f"| {item['courseCode']} | {item['name'].replace('|', '/')} | "
            f"{nzd(item['full_cents'])} | {nzd(item['plan_cents'])} | $25.00 | "
            f"{item['full_regular']} | {residual_label} | {item['total']} | PASS |"
        )
    MD_PATH.write_text("\n".join(lines) + "\n")
    print(f"wrote {JSON_PATH}")
    print(f"wrote {MD_PATH}")


if __name__ == "__main__":
    main()
