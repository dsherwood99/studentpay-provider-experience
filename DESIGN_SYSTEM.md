# StudentPay Enrolment Design System

## 1. Product identity

### Product name

StudentPay Enrolment

### Positioning

A modern, provider-branded enrolment platform that guides students from
course discovery through enrolment and payment.

### Core promise

Beautiful course pages, guided enrolments and flexible payment options in one
seamless experience.

---

## 2. Design principles

### Provider first

Students should feel that they are enrolling directly with the education
provider. StudentPay supports the journey without overpowering the provider
brand.

### Education, not finance

The experience should feel welcoming, clear and encouraging rather than
financial, institutional or administrative.

### Simple and guided

Each screen should have one clear purpose and one obvious next action.

### Mobile first

The experience must work naturally on a mobile phone before being enhanced for
larger screens.

### Reusable but distinctive

The underlying components remain consistent while each provider receives its
own logo, colours, imagery and personality.

### Accessible

Text, controls, focus states and validation must remain readable and usable for
all students.

---

## 3. Core platform colours

These colours belong to StudentPay Enrolment itself.

| Token | Value | Purpose |
|---|---:|---|
| `--colour-coral-500` | `#F45F68` | Primary actions and emphasis |
| `--colour-coral-600` | `#E64D58` | Primary hover state |
| `--colour-orange-500` | `#FF9A4D` | Secondary accents |
| `--colour-peach-200` | `#FFD8BD` | Soft highlights |
| `--colour-cream-50` | `#FFF9F4` | Main warm background |
| `--colour-cream-100` | `#FFF3E9` | Alternate section background |
| `--colour-charcoal-900` | `#272D35` | Main headings |
| `--colour-charcoal-700` | `#4B5058` | Body text |
| `--colour-grey-500` | `#727780` | Muted text |
| `--colour-grey-300` | `#D9DCE1` | Borders |
| `--colour-grey-100` | `#F4F5F6` | Subtle panels |
| `--colour-white` | `#FFFFFF` | Cards and surfaces |
| `--colour-success` | `#27885F` | Successful states |
| `--colour-warning` | `#C57B16` | Warning states |
| `--colour-danger` | `#C83C46` | Errors and destructive actions |

---

## 4. Academy Australia provider theme

| Token | Value |
|---|---:|
| Primary | `#F45F68` |
| Secondary | `#FF9A4D` |
| Accent | `#FFD8BD` |
| Background | `#FFF9F4` |
| Surface | `#FFFFFF` |
| Heading | `#43464B` |
| Body text | `#5F636A` |
| Hero gradient start | `#F45F68` |
| Hero gradient end | `#FFB34F` |

The Academy Australia theme should feel warm, approachable, energetic and
career focused.

---

## 5. Typography

### Primary typeface

Geist Sans

Used for headings, navigation, buttons, labels and body copy.

### Type scale

| Style | Desktop | Mobile | Weight |
|---|---:|---:|---:|
| Display | `72px` | `44px` | 700 |
| H1 | `56px` | `38px` | 700 |
| H2 | `40px` | `32px` | 700 |
| H3 | `26px` | `23px` | 700 |
| H4 | `20px` | `19px` | 650 |
| Lead | `20px` | `18px` | 400 |
| Body | `16px` | `16px` | 400 |
| Small | `14px` | `14px` | 400 |
| Caption | `12px` | `12px` | 600 |

### Typography rules

- Headings should use tight line heights and modest negative letter spacing.
- Body text should usually remain between 55 and 75 characters per line.
- Avoid fully justified text.
- Use sentence case rather than title case for interface labels.
- Avoid long paragraphs inside forms and cards.

---

## 6. Spacing

Use a consistent eight-point scale.

| Token | Size |
|---|---:|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `24px` |
| `--space-6` | `32px` |
| `--space-7` | `48px` |
| `--space-8` | `64px` |
| `--space-9` | `80px` |
| `--space-10` | `112px` |

---

## 7. Border radii

| Token | Size | Purpose |
|---|---:|---|
| `--radius-small` | `8px` | Inputs and compact controls |
| `--radius-medium` | `14px` | Buttons and small cards |
| `--radius-large` | `22px` | Course and content cards |
| `--radius-xlarge` | `32px` | Feature panels and hero media |
| `--radius-pill` | `999px` | Badges and chips |

---

## 8. Shadows

| Token | Purpose |
|---|---|
| `--shadow-small` | Inputs, menus and subtle cards |
| `--shadow-medium` | Course and payment cards |
| `--shadow-large` | Hero previews and important panels |

Shadows should remain soft and warm. Avoid dark, sharp or overly dramatic
shadows.

---

## 9. Buttons

### Primary

Used for the main action on a page.

- Coral background
- White text
- Medium radius
- Strong focus indicator
- Maximum of one primary action per section where practical

### Secondary

Used for alternative actions.

- White or translucent background
- Charcoal text
- Visible border

### Ghost

Used for low-priority actions and navigation.

- No permanent background
- Background visible on hover

### Destructive

Used only for cancellation, deletion or irreversible actions.

- Danger colour
- Never used for ordinary navigation

### Button states

All buttons must support:

- default
- hover
- active
- focus-visible
- disabled
- loading

---

## 10. Forms

### Field structure

Each form field should contain:

1. Visible label
2. Optional supporting hint
3. Control
4. Validation message when required

### Form rules

- Do not rely on placeholder text as the label.
- Use one-column mobile layouts.
- Use two columns only when fields have a clear relationship.
- Validate after interaction or attempted progression.
- Preserve entered information when the user moves backwards.
- Error messages must state how to correct the issue.
- Required fields should be clear without filling every label with symbols.

---

## 11. Cards

### Course card

Contains:

- course image or visual
- category
- course title
- short description
- duration or delivery mode
- price or payment-plan summary
- clear course action

### Payment card

Contains:

- payment-option name
- amount and frequency
- concise explanation
- selection control
- selected state

### Wizard card

Contains:

- current step title
- short supporting text
- fields or choices
- navigation controls
- clear validation

### Provider card

Contains:

- provider logo
- brief description
- provider theme
- link to provider experience

---

## 12. Layout

### Page container

Maximum width: `1200px`

### Reading width

Maximum width for long-form text: `720px`

### Section spacing

Desktop: `80px` to `112px`

Mobile: `56px` to `72px`

### Breakpoints

| Name | Width |
|---|---:|
| Mobile | below `640px` |
| Tablet | `640px` to `959px` |
| Desktop | `960px` and above |
| Wide | `1280px` and above |

---

## 13. Provider theming

Provider branding will be delivered through configuration rather than
provider-specific component duplication.

A provider theme may define:

- logo
- primary colour
- secondary colour
- accent colour
- background colour
- surface colour
- heading colour
- body colour
- hero gradient
- imagery
- support contact information

Provider themes may alter appearance but must not undermine accessibility,
layout integrity or usability.

---

## 14. Motion

Motion should reinforce progression and state changes.

Suitable uses include:

- wizard step transitions
- card hover feedback
- validation state changes
- loading indicators
- progress updates

Animation should normally remain between `150ms` and `300ms`.

Avoid decorative movement that delays the student or distracts from
completion.

Respect reduced-motion preferences.

---

## 15. Accessibility

The platform should target WCAG 2.2 AA.

Core requirements include:

- adequate colour contrast
- visible keyboard focus
- correctly associated form labels
- keyboard-operable controls
- descriptive error messages
- semantic headings
- alt text for meaningful images
- reduced-motion support
- minimum practical touch targets of approximately 44px

---

## 16. Content style

Copy should be:

- direct
- reassuring
- concise
- student focused
- written in plain Australian English

Prefer:

> Choose how you would like to pay.

Avoid:

> Please select your preferred payment methodology from the options detailed
> below.

---

## 17. Initial reusable components

The first component library will include:

- `Button`
- `Badge`
- `Card`
- `Section`
- `PageShell`
- `ProviderLogo`
- `CourseCard`
- `PaymentOptionCard`
- `FormField`
- `TextInput`
- `SelectField`
- `CheckboxField`
- `RadioCard`
- `WizardProgress`
- `WizardNavigation`
- `Notice`

---

## 18. Product roadmap

### Sprint 1 — Design system

- Tokens
- Typography
- Buttons
- Cards
- forms
- provider theme configuration

### Sprint 2 — Marketing experience

- StudentPay Enrolment homepage
- Academy Australia provider page
- course catalogue
- course detail pages

### Sprint 3 — Enrolment experience

- reusable enrolment wizard
- validation
- autosave
- payment-option selection
- review and confirmation

### Sprint 4 — Integration

- StudentPay Provider Checkout API
- Salesforce
- Pinch direct debit
- production provider configuration
- reporting and analytics