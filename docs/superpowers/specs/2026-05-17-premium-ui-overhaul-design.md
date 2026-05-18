# Handshake Plus Premium UI/UX Overhaul — Design Spec

**Date:** 2026-05-17  
**Scope:** Complete visual and information-architecture overhaul of the injected panel (`panel.js`) and extension popup (`popup.html` / `popup.js`), plus one new feature (hide promoted listings).  
**Goal:** The extension should feel like a native Handshake product feature, not a third-party widget pasted over the page.

---

## 1. Guiding Principles

- **App-native, not widget-y.** White surfaces, near-black type, hairline borders, 8px controls, dense operational spacing.
- **Restraint with brand accents.** Lime (`#D3FB52`), cyan (`#B1F8FF`), and deep teal (`#052326`) appear only in small moments — success states, badges, empty states, celebratory confirmations. Routine controls stay white, bordered, and quiet.
- **Minimal shadows.** Use borders and spacing for separation, never floating cards with heavy drop shadows.
- **Noi Grotesk everywhere.** If unavailable, fall back to `system-ui, sans-serif`. No Arial, no Segoe UI as primary.
- **Quiet motion.** Transitions are functional, not playful. 120–200ms, ease-out, no bouncy springs.

---

## 2. Design Token Reference

All styling decisions must map to these tokens (from `DESIGN.md`):

| Token | Value | Usage |
|---|---|---|
| `colors.ink` | `#121212` | Primary text, icons, labels |
| `colors.deep-neutral` | `#1F202C` | Strong headings, structural borders |
| `colors.canvas` / `colors.surface` | `#FFFFFF` | Panel, popup, card backgrounds |
| `colors.quiet-surface` | `#F6F6F6` | Status wells, neutral fills, hover backgrounds |
| `colors.active-fill` | `#EAEAEA` | Active nav rows, selected tabs |
| `colors.hairline` | `rgba(31, 32, 44, 0.2)` | All borders, dividers, panel edges |
| `colors.link-blue` | `#1569E0` | Links, inline navigation affordances |
| `colors.muted` | `rgba(18, 18, 18, 0.7)` | Secondary body, helper text |
| `colors.disabled` | `rgba(18, 18, 18, 0.4)` | Disabled labels, inactive text |
| `colors.profile-cyan` | `#B1F8FF` | Profile callouts, soft highlighted wells |
| `colors.marketing-lime` | `#D3FB52` | Success badges, branded spark moments |
| `colors.marketing-deep-teal` | `#052326` | Paired with lime for branded moments |
| `colors.success` | `#327D0F` | Completion, positive saved status |
| `colors.danger` | `#BB3643` | Failed automation, destructive actions |
| `typography.section-title` | 20px/24px/700 | Panel header, section headings |
| `typography.nav-item` | 17px/23.8px/500 | Navigation rows, tab labels |
| `typography.body-md` | 15px/18px/400 | Body text, form labels, metadata |
| `typography.button` | 15px/18px/500 | Buttons, filter pills, commands |
| `typography.caption` | 12px/1.4/400 | Helper text, legal notes, char counts |
| `rounded.md` | 8px | Default control radius |
| `rounded.full` | 9999px | Avatars, circular affordances |
| `spacing.base` | 16px | Panel padding, row padding |
| `spacing.sm` | 8px | Control padding, compact gaps |
| `spacing.md` | 12px | Field groups, note padding |
| `spacing.xl` | 24px | Section separation |

---

## 3. Injected Panel (`panel.js`)

### 3.1 Panel Shell

- **Size:** 360px wide, 200–600px tall, resizable (min 320×200, max 600×800)
- **Position:** Fixed, top-right of viewport (`top: 20px; right: 20px`), draggable via header
- **Background:** `colors.surface` (`#FFFFFF`)
- **Border:** 1px solid `colors.hairline`
- **Border-radius:** `rounded.md` (8px)
- **Padding:** 0 (internal sections handle their own padding)
- **Shadow:** None
- **Font-family:** `"Noi Grotesk", system-ui, sans-serif`
- **z-index:** 999999 (unchanged)

### 3.2 Header

```
┌────────────────────────────────────────┐
│  🤝 Handshake Plus              [−]   │
│  ───────────────────────────────────── │
```

- **Background:** `colors.surface` (`#FFFFFF`)
- **Bottom border:** 1px solid `colors.hairline`
- **Padding:** 12px 16px
- **Title:** `typography.section-title` (20px/700/ink), "🤝 Handshake Plus"
- **Cursor:** `move` (draggable)
- **Controls:** Single ghost-icon minimize button, 32px square, transparent bg, ink icon
  - Hover: `colors.quiet-surface` fill
  - Icon: `−` (minimize) / `+` (maximized)

### 3.3 Tab Bar

Three tabs: **Apply** | **Profile** | **Settings**

- **Layout:** Horizontal row, gap 4px, padding 8px 12px, background transparent
- **Each tab:** `typography.nav-item` (17px/500), ink text, 8px radius, padding `2px 8px`
- **Active tab:** `colors.active-fill` background, ink text
- **Inactive tab:** transparent background, `colors.muted` text
- **Disabled tab:** `colors.disabled` text, `pointer-events: none`
- **No bottom border on tab row. No blue underline.** Selection is communicated solely via fill.
- **Tab content panels:** Each tab has its own scrollable body region.

### 3.4 Apply Tab

Structured as a vertical stack of bordered "wells" (cards), each separated by a hairline top border. All wells share 12px internal padding and 8px internal border-radius.

#### Well: Status
- **Style:** `extension-status` token — `colors.quiet-surface` bg, 8px radius, 12px padding
- **Text:** `typography.body-md`, ink. Changes to success color when active.
- **States:**
  - Default: "Ready to apply"
  - Active: "Applying to jobs..." (green)
  - Error/warning: "⚠️ Please upload resume in Profile first" (danger color)

#### Well: Actions
- **Primary button:** Full-width `button-secondary` token — white bg, 1px hairline border, ink text, 36px height, 8px radius
  - When applying, button switches to danger variant (white bg, 1px `colors.danger` border, danger text)
- **Label:** "Start Applying" / "Stop"

#### Well: Job Filters *(restructured)*
- **Hide promoted listings toggle:** NEW. Checkbox with label "Hide promoted listings". Default ON.
  - Persisted to `localStorage.handshake-plus-hide-promoted`
  - When ON, `content.js` detects and skips promoted/sponsored job cards during the apply loop.
- **Role search:** `search-input` styled field, placeholder "Type role and press Enter (max 5)"
- **Selected role chips:** `filter-pill` tokens — white bg, hairline border, 8px radius, small × remove button
- **Clear all:** Small text button, `colors.link-blue`

#### Well: Progress
- **Visible only when count > 0 or actively applying**
- **Style:** Quiet metric card. `colors.quiet-surface` bg, hairline border, 8px radius.
- **Label:** "Jobs applied today" — `typography.caption`, muted
- **Count:** Large number — `typography.section-title` (20px/700/ink)

#### Well: AI Cover Letter
- **Checkbox:** "Enable AI generated cover letters"
  - If no resume uploaded, clicking shows warning in Status well and does not check
- **Conditional sub-options (appear when checked):**
  - Checkbox: "Manually review cover letters, documents & screening answers before submitting"
  - Provider selector: compact segmented control or inline radio — Claude / Gemini
  - Both styled as `button-secondary` pills, active one gets `active-fill`

#### Footer Notes
- Small `typography.caption`, muted, centered
- "Submits your most recently uploaded transcript and/or resume on Handshake"
- "Tip: keep a claude.ai tab open..." — link in `colors.link-blue`

### 3.5 Profile Tab

Organized into three distinct wells with hairline top borders:

#### Well: Resume Upload
- **Label:** "Upload Your Resume (for cover letter)" — `typography.body-md`, 500 weight
- **Info tooltip:** Small ⓘ icon, ghost-icon style, hover shows tooltip in `colors.deep-neutral` bg, white text
- **File input:** Hidden. Triggered by `button-secondary` "Choose File"
- **File name:** `typography.caption`, muted, italic
- **Remove button:** `button-secondary` with danger border/text
- **Status message:** Inline success/loading/error text, `typography.caption`
- **Raw resume toggle:** Checkbox + label "Use raw resume text (skip AI summary)"
- **Contact form container:** Appears only after successful upload

#### Well: Contact Info
- **Fields:** Full Name, Email (required), Location, Phone
- **Each field:** `search-input` style — transparent bg, hairline border on focus, 8px radius, 40px height
- **Label + required tag:** Label in `typography.body-md`, required tag in `typography.caption`, muted
- **Spacing:** 12px gap between fields

#### Well: Screening Facts
- **Section label:** "Screening facts" — `typography.body-md`, 600 weight
- **Fields:** Languages, Willing to relocate, US work authorization (select), Visa sponsorship (select)
- **Same input styling as Contact Info**
- **Top border:** 1px hairline, creating visual separation within the well if needed

### 3.6 Settings Tab *(NEW — extracted from nested AI block)*

#### Well: AI Provider
- **Label:** "AI Provider" — `typography.body-md`, 500 weight
- **Segmented control:** Two pills side by side — "Claude" / "Gemini"
  - Active: `active-fill` bg, ink text
  - Inactive: transparent, hairline border, muted text
  - 8px radius, 36px height
- **Claude URL input:** `search-input` style, placeholder "Optional Claude chat/project URL"
- **Gemini URL input:** `search-input` style, placeholder "Optional Gemini chat URL"
- **Helper text:** `typography.caption`, muted — "Optional: route AI prompts to a specific page..."

#### Well: Custom Instructions
- **Label:** "Custom AI Instructions" — `typography.body-md`, 500 weight
- **Textarea:** `search-input` style but multi-line, min-height 72px, resize vertical
- **Char counter:** `typography.caption`, muted — "0 / 5000"
- **Helper text:** "Added to every AI prompt..."

#### Well: Aggressive Mode
- **Style:** Subtle warning well — white bg, 1px `colors.danger` border (or hairline with danger accent)
- **Checkbox + bold label:** "Enable Aggressive Mode"
- **Description:** `typography.caption`, muted — explains behavior
- **Persisted to:** `localStorage.handshake-plus-aggressive-mode`

#### Well: Appearance *(if font toggle kept)*
- **Label:** "Font" — `typography.body-md`
- **Select:** `search-input` style — "Noi Grotesk", "System default", etc.

### 3.7 Minimized State

- **Height:** Auto (header only)
- **Width:** Auto (shrink to content)
- **Content:** Title + maximize button only
- **All tabs, body, resize handle:** Hidden
- **Transition:** 200ms ease-out on height and opacity

### 3.8 Scrollbar Styling

- **Track:** `colors.quiet-surface` (`#F6F6F6`)
- **Thumb:** `colors.hairline` (`rgba(31,32,44,0.2)`), 8px radius
- **Thumb hover:** `colors.muted` (`rgba(18,18,18,0.3)`)
- **No blue scrollbar.**

---

## 4. Extension Popup (`popup.html` + `popup.js`)

### 4.1 Popup Shell

- **Width:** 320px (up from 300px)
- **Background:** `colors.canvas` (`#FFFFFF`)
- **Padding:** 16px (`spacing.base`)
- **Border:** None (browser chrome handles popup border)
- **Font-family:** `"Noi Grotesk", system-ui, sans-serif`
- **No blue left accent border.** Clean white card.

### 4.2 Content — Not on Handshake

```
┌────────────────────────────┐
│  🤝 Handshake Plus         │  ← section-title, ink
├────────────────────────────┤
│                            │
│  ┌─ Get Started ─────────┐ │
│  │  Select your school    │ │  ← body-md, muted
│  │  to open Handshake:    │ │
│  │                        │ │
│  │  [Cornell University ▼]│ │  ← search-input style
│  │                        │ │
│  │  [Take me to Handshake]│ │  ← button-secondary, full width
│  └───────────────────────┘ │
│                            │
│  ───────────────────────── │  ← hairline divider
│  v5.7.5                  │  ← caption, muted, centered
└────────────────────────────┘
```

- **University selector:** `search-input` styled field. Datalist populated from `universities.js`. Top 5 matches filter.
- **Button:** `button-secondary` — white bg, hairline border, ink text, 36px height, 8px radius, full width
- **Hover:** `colors.quiet-surface` fill
- **Saved state:** Previous selection loaded from `chrome.storage.local.savedUniversity`

### 4.3 Content — On Handshake

- Hide university selector and button
- Show `profile-callout` well (`colors.profile-cyan` bg, black text, 8px radius):
  - "✓ You're on Handshake. The extension panel is active on this page."
- Version number below, `typography.caption`, muted, centered

---

## 5. New Feature: Hide Promoted Listings

### 5.1 Behavior

- **Default state:** ON (checked) for new users
- **Toggle location:** Apply tab → Job Filters well, top of the section
- **Persistence:** `localStorage.handshake-plus-hide-promoted`
- **Effect:** During the auto-apply loop in `content.js`, any job card containing a "Promoted" or "Sponsored" indicator is skipped entirely
- **Indicators to detect:**
  - Text content: "Promoted", "Sponsored", "Ad"
  - CSS classes: `sponsored`, `promoted`, `featured`
  - Data attributes: `data-promoted`, `data-sponsored`
- **Reporting:** Status well can optionally show: `"Skipped 3 promoted listings"` when applicable

### 5.2 UI

- Checkbox + label: "Hide promoted listings"
- Label in `typography.body-md`
- Small helper text below: "Skip employer-paid placements during auto-apply" — `typography.caption`, muted

---

## 6. Motion & Transitions

| Interaction | Duration | Easing | Property |
|---|---|---|---|
| Tab switch | 0ms (instant) | — | — |
| Panel minimize/maximize | 200ms | ease-out | height, opacity |
| Button hover | 150ms | ease-out | background-color |
| Checkbox reveal (conditional sections) | 150ms | ease-out | height, opacity |
| Dropdown open/close | 120ms | ease-out | opacity, transform |
| Dragging | 0ms | — | left, top |
| Resizing | 0ms | — | width, height |

**No bouncy springs. No flashy scale animations. No parallax.**

---

## 7. Responsive Behavior

| Viewport | Panel Behavior |
|---|---|
| Desktop (≥1024px) | Floats at `top: 20px; right: 20px`, 360px wide, draggable, resizable |
| Tablet (720–1024px) | Same as desktop, but consider capping height to 70vh |
| Mobile (<720px) | Bottom sheet — `position: fixed; bottom: 0; left: 0; width: 100%; max-height: 70vh;` Not draggable. Touch-optimized controls (40px min height). |

---

## 8. Accessibility

- All interactive elements must have visible focus states: 2px `colors.link-blue` outline, 2px offset
- Checkboxes and radios must have associated `<label>` elements
- Color alone must not communicate state (use text + icon + color)
- Minimize button needs `aria-label`
- Tab buttons need `role="tab"`, `aria-selected`, `aria-controls`

---

## 9. Files Modified

| File | Nature of Changes |
|---|---|
| `panel.js` | Complete HTML template rewrite; complete CSS block rewrite; add Settings tab logic; add hide-promoted toggle + persistence; restructure event listeners to match new DOM; ensure all existing functionality (drag, resize, minimize, tab switch, job role search, resume upload, contact save, AI provider routing) continues to work |
| `popup.html` | Complete markup rewrite with token-aligned styling |
| `popup.js` | Minor — ensure event listeners attach to new element IDs/classes; no logic changes |
| `content.js` | Add promoted job detection in job card scanning loop; read `localStorage.handshake-plus-hide-promoted`; skip promoted cards when toggle is ON |

---

## 10. Scope Boundaries

**In scope:**
- Visual reskin of panel and popup to DESIGN.md tokens
- IA restructure: 3-tab panel with extracted Settings tab
- Hide promoted listings feature (UI + content.js integration)
- Minimize, drag, resize, tab switching, all existing form functionality

**Out of scope:**
- Dark mode
- New AI capabilities or prompt changes
- Changes to background.js, screening-utils.js, required-document-utils.js, or any other background/content utilities beyond content.js promoted detection
- Changes to manifest.json
- Changes to claude.js / gemini.js / claude-response-utils.js
- Animation beyond the minimal transitions specified

---

## 11. Spec Self-Review

| Check | Result |
|---|---|
| No TBD/TODO placeholders | ✓ All sections complete |
| Internal consistency | ✓ Tokens used consistently; no contradictions between panel and popup styling |
| Scope appropriate for one plan | ✓ Four files, one new feature. Fits in one implementation plan. |
| No ambiguous requirements | ✓ All colors, sizes, and behaviors specified with concrete values |
| Event listener compatibility addressed | ✓ Plan notes that event listeners must be re-attached to new DOM structure |
| Existing functionality preserved | ✓ All existing features (drag, resize, minimize, upload, role search, AI routing) explicitly retained |
