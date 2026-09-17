# OLI Hosted Checkout — forensic visual parity audit

Date: 2026-09-17  
Base: `origin/main` `4e5a60bd529891dc8136446f9b93c87898746968`  
Method: live computed styles + `getBoundingClientRect()` at identical viewports (Chrome/Playwright, `deviceScaleFactor: 1`), plus Oxygen/WordPress CSS from the course page HTML.

## References

| Role | URL |
| --- | --- |
| Priority 1 OLI | https://onlinelearninginstitute.co.nz/course/certificate-in-business-administration/ |
| Priority 1 Hosted | https://enrol.studentpay.co.nz/enrol/oli/certificate-in-business-administration |
| Priority 2 OLI | https://onlinelearninginstitute.co.nz/ |
| Priority 2 Hosted | https://enrol.studentpay.co.nz/enrol/oli |

Course-page chrome is authoritative where homepage and course differ.

## How measurements were taken

Viewports: `1440×1000`, `1280×900`, `768×1024`, `390×844`, `360×800`.  
Raw JSON: `/tmp/oli-parity-measure.json` (session artefact).  
Screenshots were not used to guess values.

## Exact OLI tokens (computed / declared)

| Token | OLI value |
| --- | --- |
| Page / header background | `#f9f7f3` / `rgb(249, 247, 243)` |
| Body font | `Montserrat`, `16px`, weight `400`, line-height `1.6` |
| Body colour | `#2b2c28` |
| Nav / chrome text | `#1c1c1c` |
| Nav hover | `#2c67c9` |
| Utility / header divider | `1px solid #757575` |
| Blue icon/button | `#2c67c9` / `rgb(44, 103, 201)` |
| Footer background | `transparent` (shows body `#f9f7f3`) |
| Footer heading | Inter `18px` / `700` / `#000` |
| Footer link | Montserrat `15px` / `400` / `#000`, `margin-top: 20px`, hover underline `#000` |
| Header container | `max-width: 1500px`, horizontal padding `20px`, width = viewport |
| Footer inner | `div.ct-section-inner-wrap` `max-width: 1440px`, padding `20px`, top/bottom `25px` (desktop) |
| Fonts loaded | Google Montserrat (100–900), Open Sans (300–800), Inter (100–900) |
| Nav hamburger breakpoint | Oxygen list hidden at `max-width: 991px`; Max Mega Menu `data-breakpoint="992"` |

## Live bounding boxes (before Hosted edits)

### 1440×1000

| Element | OLI | Hosted | Delta |
| --- | --- | --- | --- |
| Utility height | `57` | `57` | 0 |
| Main header row | `91.3` | `106.61` | +15.3 (logo too large) |
| Full header height | `148.3` | `198.61` | +50.3 (logo + Enrolment context row) |
| Logo | `150.0×58.3 @(20,73)` | `210.0×81.6 @(20,69)` | +60px wide, +23px tall |
| Header inner width | `1440` (pad `20px`) | `1400` (outer gutter `20px`) | container model differs |
| Social icon | `32×32 @(20,12)`, gap `16px` | `32×32 @(20,12)`, CSS gap not 16px on wrap | size OK |
| Nav font | `14px` / `600` / Montserrat | `14.4px` (`0.9rem`) / `600` | +0.4px |
| Search | `300×42 @(1120,81)` | `280×40 @(1140,90)` | −20×−2, y +9 |
| Phone square | `40×40`, `#2c67c9`, radius `8px` | same colour/radius/size | position shifted by logo |
| Footer bg | transparent `#f9f7f3` | `#ffffff` | **visible colour jump** |
| Footer pad-top | `25px` | `48px` | +23 |
| Footer logo box | `89×150` (`footer-logo.png`, max-width `89px`) | `148×57.5` (header `logo.png`) | wrong asset + size |
| Footer heading | Inter `18px/700/#000` | Montserrat `14.72px/700` | wrong family/size/colour |

At 1440 OLI applies `@media (min-width:1300px) and (max-width:1500px)` so the logo is **150px**, not the base `229px`. Hosted used `210px`.

### 1280×900

| Element | OLI | Hosted | Delta |
| --- | --- | --- | --- |
| Logo | `150.0×58.3 @(20,73)` | `150.0×58.3 @(20,72)` | size OK, y −1 |
| Header height | `148.3` | `181` | +33 (context row) |
| Nav font | `13px` / `600` | `13.12px` | ~OK |
| Search | `290×42` | `220×40` | −70px width |
| Footer | same colour/padding deltas as 1440 | | |

### 768×1024

| Element | OLI | Hosted | Delta |
| --- | --- | --- | --- |
| Utility | `50` (pad `12px` until 767; 25px socials at 991) | `65` (`min-height: 64px`) | +15 |
| Logo | `150.0×58.3 @(20,60)` | `140.0×54.4 @(20,77)` | −10px wide, y +17 |
| Header | `129.3` | `179.41` | +50 |
| Social | `25×25 @(20,12)`, gap `10px` | `28×28 @(20,18)` | +3px, not vertically matching |
| Phone | `40×40`, number hidden | `40×40`, number hidden | OK |
| Search field | hidden | hidden | OK |
| Search square | `40×40` (`#div_block-146-12`) | Hosted uses a 40px control | geometry close |
| Hamburger | Mega Menu `30×30 @(718,74)` | Lucide `22` in `40×40` | wrong icon language |
| Gutter | `20px` | `20px` | OK |

### 390×844 and 360×800

| Element | OLI | Hosted | Delta |
| --- | --- | --- | --- |
| Utility height | `105.69` | `49` | OLI wraps **card-brand marks** on the right; Hosted must not clone those logos (locked by existing footer/chrome test) |
| Logo | `100.0×38.8 @(20,116)` (`max-width: 100px` at `≤479`) | `128.0×49.7 @(12,61)` | +28px wide, gutter `12` vs `20`, y −55 |
| Phone / search squares | `35×35` | `40×40` | +5 |
| Social | `25×25`, **centred** (`flex-direction: column` + `justify-content: center` at `≤767`) | `28×28`, left `12px` | alignment + size |
| Hamburger | `30×30` | `40×40` Lucide | |

## OLI logo cascade (declared CSS)

| Viewport | `#link-87-12` max-width | Live rendered (course page) |
| --- | --- | --- |
| `>1500` | `229px` | not in this pass |
| `1300–1500` (includes 1440) | `150px` | `150×58.3` |
| `1200–1299` (includes 1280) | `150px` | `150×58.3` |
| `991.1–1199` | `140px` | — |
| `≤991` (includes 768) | `150px` | `150×58.3` |
| `≤479` (includes 390/360) | `100px` | `100×38.8` |

Intrinsic header asset: `logo.png` **687×267**. Hosted already stores the same file (`sha256` match). Footer uses a different asset: `footer-logo.png` **356×244**, rendered max-width **89px**.

## OLI header cascade (other)

| Item | Desktop default | `1300–1500` | `1200–1299` | `991.1–1199` | `≤991` | `≤767` | `≤479` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Utility padding y | `12px` | 12 | 12 | 12 | 12 | `10px` | 10 |
| Main row padding y | `16px` | 16 | 16 | 16 | `10px` | 10 | 10 |
| Social | `32px`, gap `16px` | 32/16 | 32/16 | 32/16 | `25px`, gap `10px` | 25/10 | 25/10 |
| Nav | `16px/600`, margin `10px` | `14px` | `13px`, margin `8px` | `13px`, margin `7px` | hidden | hidden | hidden |
| Phone square | `40px`, pad `10px` | 40 | 40 | `32px` | 40, number hidden | 40 | `35px` |
| Phone / search margin | `40px` | `20px` | `20px` | `10px` | phone `0 20px` | phone `margin-right: 10px` | |
| Search width | `300px` | 300 | `290px` | `180px` (submit `32px`) | hidden; `40×40` search square | 40 square | `35×35` square |
| Search field | Montserrat `16px/400`, placeholder `rgba(28,28,28,.5)`, pad `16px/18px` | | | `13px` | | | |

Search control colour `#2c67c9`, radius `8px`, border `1px solid #2c67c9`. Submit glyph is `24px` on a `40×40` blue square. Phone glyph is `phone-icon-white.png` (88×88 intrinsic) filling the padded square.

## Intentional non-clones

| OLI chrome | Hosted decision |
| --- | --- |
| Utility-right “Pay it in 4 \| Interest-Free” + card-brand PNGs | **Do not copy.** Existing Hosted test forbids Afterpay/Visa/Mastercard/American Express in footer and chrome. Enrolment context stays in the dedicated strip. Mobile utility will therefore not wrap to 105px. |
| Footer Google Map, Xugar copyright, “Secure Payments Powered By” card marks | **Do not copy.** Keep required “Payment services powered by StudentPay NZ”. |
| Enrolment / Back to course strip | Keep. Not on OLI; style it as a native extra header row (`#f9f7f3`, `#757575` divider, Montserrat) rather than a StudentPay bar. |
| Enrolment form / payment cards / DDA / legal popup | Unchanged. |

## Proposed fixes

| Element | OLI value | Hosted current | Proposed fix |
| --- | --- | --- | --- |
| Logo desktop 1440 | `150×58.3` | `210×81.6` | Apply OLI max-width cascade on the logo link (`229 / 150 / 150 / 140 / 150 / 100`) |
| Logo mobile | `100×38.8` at ≤479 | `128×49.7`, gutter 12 | `100px` logo, `20px` gutter |
| Utility height | 57 / 50 | 57 / 65 / 49 | Drop `min-height: 56/64/48`; padding `12px` (`10px` ≤767) |
| Desktop header row | `91.3` (pad 16) | `106.61` | Pad `16px`; logo 150px at 1440 |
| Nav | 16/14/13px + 10/8/7px margins | `0.9rem` + gap 18/12 | Exact px + margins; hide at `991px` |
| Phone/search | 300×42 search; 40px squares | 280×40 / 220 / hide at 1100 | Match widths, `box-sizing` so height is 42px with 1px border; hide field at 991 not 1100 |
| Social | PNG 32/25 | Lucide SVG 22 in 32/28 | Local copies of OLI `fb-icon.png`, `instagram-icon.png`, `tiktok-icon.png` |
| Phone/search glyphs | OLI PNGs | Lucide 18px | Local `phone-icon-white.png`, `iconamoon_search.png` |
| Hamburger | 30×30 3-bar `#1c1c1c` | Lucide 22 / 40 | CSS 3-bar 30×30 |
| Container | 1500 / 20px pad | `100%-40px` capped 1500 | `width: min(100%,1500px); padding: 0 20px` |
| Mobile social | centred at ≤767 | left | Column + centre |
| Footer bg | `#f9f7f3` | `#ffffff` | Transparent / `#f9f7f3`; remove `#eceae6` top border |
| Footer pad | 25/25 desktop; 50/30 ≤991; 20 top ≤767 | 48/28 | Match |
| Footer logo | `footer-logo.png` 89px | header logo 148px | Import footer asset, `max-width: 89px` |
| Footer type | Inter 18/700 headings; Montserrat 15/400 links `#000` | 0.92rem headings, `#333` links | Match |
| Contact heading | “Get in Touch” + underlined “New Zealand” | heading “New Zealand” | Match labels; keep address lines locked by test |
| Body chrome font | Montserrat | Inter on `.frame` | Montserrat on site header/footer only; leave checkout form Inter |
| Montserrat weights | 100–900 (body/search 400) | next/font 500–800 | Add weight `400` |

## Assets

| Asset | Action |
| --- | --- |
| `public/nz-enrolment/oli/logo.png` | Reuse (already identical to live OLI `logo.png`) |
| `footer-logo.png`, `fb-icon.png`, `instagram-icon.png`, `tiktok-icon.png`, `phone-icon-white.png`, `iconamoon_search.png` | Import locally from OLI public WP uploads (no hotlink) |
