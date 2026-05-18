---
version: alpha
name: Handshake Plus
description: A clean product overlay aligned to Handshake's logged-in app shell:
  white surfaces, near-black type, hairline borders, 8px controls, and dense
  operational layouts. Public Handshake brand energy appears only as small lime,
  cyan, and deep-teal moments, while day-to-day extension UI stays quiet,
  readable, and app-native.
colors:
  ink: "#121212"
  deep-neutral: "#1F202C"
  canvas: "#FFFFFF"
  surface: "#FFFFFF"
  quiet-surface: "#F6F6F6"
  active-fill: "#EAEAEA"
  hairline: "rgba(31, 32, 44, 0.2)"
  link-blue: "#1569E0"
  link-blue-active: "#003BCC"
  profile-cyan: "#B1F8FF"
  marketing-lime: "#D3FB52"
  marketing-deep-teal: "#052326"
  muted: "rgba(18, 18, 18, 0.7)"
  disabled: "rgba(18, 18, 18, 0.4)"
  success: "#327D0F"
  danger: "#BB3643"
typography:
  display-md:
    fontFamily: '"Noi Grotesk", system-ui, sans-serif'
    fontSize: 32px
    fontWeight: 700
    lineHeight: 40px
    letterSpacing: 0
  section-title:
    fontFamily: '"Noi Grotesk", system-ui, sans-serif'
    fontSize: 20px
    fontWeight: 700
    lineHeight: 24px
    letterSpacing: -0.15px
  nav-item:
    fontFamily: '"Noi Grotesk", system-ui, sans-serif'
    fontSize: 17px
    fontWeight: 500
    lineHeight: 23.8px
    letterSpacing: 0
  body-md:
    fontFamily: '"Noi Grotesk", system-ui, sans-serif'
    fontSize: 15px
    fontWeight: 400
    lineHeight: 18px
    letterSpacing: 0
  button:
    fontFamily: '"Noi Grotesk", system-ui, sans-serif'
    fontSize: 15px
    fontWeight: 500
    lineHeight: 18px
    letterSpacing: 0
  caption:
    fontFamily: '"Noi Grotesk", system-ui, sans-serif'
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0
rounded:
  sm: 4px
  md: 8px
  lg: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  base: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
  section: 48px
layout:
  left-nav-width: 200px
  top-nav-height: 56px
  control-sm: 36px
  control-md: 40px
components:
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    border: "1px solid {colors.hairline}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: "{layout.control-sm}"
    padding: "0 8px"
  button-ghost-icon:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    border: "0"
    typography: "{typography.nav-item}"
    rounded: "{rounded.md}"
    size: "32px"
  filter-pill:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    border: "1px solid {colors.hairline}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: "{layout.control-md}"
    padding: "4px 8px"
  search-input:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    border: "1px solid transparent"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: "{layout.control-md}"
    padding: "0 96px 0 40px"
  side-nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.nav-item}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  active-side-nav-item:
    backgroundColor: "{colors.active-fill}"
    textColor: "{colors.ink}"
    typography: "{typography.nav-item}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  job-card-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "0"
    border: "0"
    padding: "16px"
  profile-callout:
    backgroundColor: "{colors.profile-cyan}"
    textColor: "#000000"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "16px"
  extension-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    border: "1px solid {colors.hairline}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "16px"
  extension-status:
    backgroundColor: "{colors.quiet-surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "12px"
---

## Overview

Handshake Plus should feel like it belongs inside the logged-in Handshake product, not like a separate SaaS widget pasted over it. The dominant language is practical and quiet: white canvas, near-black type, tight navigation, 8px controls, hairline borders, and very little visual depth. The UI should help a user scan jobs, settings, status, and AI controls quickly while preserving the calm rhythm of the surrounding app.

Public Handshake brand energy is useful, but it is seasoning rather than structure. Lime {colors.marketing-lime}, cyan {colors.profile-cyan}, and deep teal {colors.marketing-deep-teal} can appear in small brand moments, progress highlights, empty states, or celebratory confirmations. Routine controls should stay white, bordered, and app-native.

**Key Characteristics:**
- App-first surfaces: white panels, quiet gray fills, and 1px borders carry almost all structure.
- 8px radius is the default control shape. Reserve full radius for avatars and circular icon affordances.
- Blue {colors.link-blue} is functional, not decorative: links, navigation affordances, and interactive text.
- Minimal shadows. Use borders and spacing before elevation.
- Dense but readable layouts. Prefer compact controls and strong alignment over marketing-style cards.

## Colors

### Product Foundation
- **Ink** ({colors.ink} - #121212): Primary text, icons, and button labels. It is the default foreground for app UI.
- **Deep Neutral** ({colors.deep-neutral} - #1F202C): Stronger structural neutral used for deep borders, high-emphasis headings, and app shell contrast.
- **Canvas** ({colors.canvas} - #FFFFFF): The default page floor and the default panel background.
- **Surface** ({colors.surface} - #FFFFFF): Cards, rows, popovers, panels, and controls sit on the same white as canvas.
- **Quiet Surface** ({colors.quiet-surface} - #F6F6F6): Used for status wells, neutral icon buttons, and secondary control backgrounds.
- **Active Fill** ({colors.active-fill} - #EAEAEA): Active side-nav rows and selected app-shell navigation states.
- **Hairline** ({colors.hairline} - rgba(31, 32, 44, 0.2)): Standard border color for buttons, pills, inputs, dividers, and extension panel edges.

### Interactive Color
- **Link Blue** ({colors.link-blue} - #1569E0): Links, inline navigation, and text affordances that leave or reveal content.
- **Link Blue Active** ({colors.link-blue-active} - #003BCC): Pressed or strongly active link state.
- **Muted** ({colors.muted} - rgba(18, 18, 18, 0.7)): Secondary body copy and helper text.
- **Disabled** ({colors.disabled} - rgba(18, 18, 18, 0.4)): Disabled labels, inactive helper text, and unavailable controls.

### Brand Accents
- **Profile Cyan** ({colors.profile-cyan} - #B1F8FF): Soft highlighted callouts, profile-related status blocks, and gentle AI/session hints.
- **Marketing Lime** ({colors.marketing-lime} - #D3FB52): Public-brand spark. Use sparingly for success moments, branded badges, or a single highlight in an otherwise white interface.
- **Marketing Deep Teal** ({colors.marketing-deep-teal} - #052326): Pair with lime for explicitly branded moments. Do not use as the default app background.

### Semantic Color
- **Success** ({colors.success} - #327D0F): Completion, applied-state success, and positive saved status.
- **Danger** ({colors.danger} - #BB3643): Failed automation, destructive actions, and upload/send errors.

## Typography

Handshake's app uses `"Noi Grotesk", system-ui, sans-serif`. Keep that stack everywhere in extension UI. The system relies on modest sizes, practical weights, and short line heights rather than dramatic display type.

| Token | Use | Style |
|---|---|---|
| `{typography.display-md}` | Job titles, panel hero status, rare top-level headings | 32px / 40px, 700 |
| `{typography.section-title}` | Section headings such as settings groups or modal sections | 20px / 24px, 700 |
| `{typography.nav-item}` | Primary navigation rows and high-emphasis list labels | 17px / 23.8px, 500 |
| `{typography.body-md}` | Default body, form labels, metadata, status text | 15px / 18px, 400 |
| `{typography.button}` | Buttons, filter pills, compact command labels | 15px / 18px, 500 |
| `{typography.caption}` | Helper text, legal notes, compact descriptions | 12px / 1.4, 400 |

### Principles
- Do not use oversized marketing headlines inside the extension panel.
- Keep letter spacing at 0 except where matching app headings already use a tiny negative value, such as section titles at -0.15px.
- Prefer weight 500 for navigational labels and controls; reserve 700 for true section hierarchy.

### Note on Font Substitutes
If Noi Grotesk is unavailable, fall back to `system-ui, sans-serif`. Do not introduce decorative or serif alternatives.

## Layout

The inspected app shell uses a 200px left navigation rail and a 56px top navigation bar. Extension UI should respect that density: compact controls, predictable rows, and tight but clear spacing.

| Token | Value | Use |
|---|---:|---|
| `{layout.left-nav-width}` | 200px | Desktop app rail reference |
| `{layout.top-nav-height}` | 56px | Top app bar reference |
| `{layout.control-sm}` | 36px | Secondary buttons and compact controls |
| `{layout.control-md}` | 40px | Search inputs, filter pills, primary row controls |
| `{spacing.xs}` | 4px | Icon gaps, small offsets |
| `{spacing.sm}` | 8px | Control padding, compact row gaps |
| `{spacing.md}` | 12px | Field groups, note padding |
| `{spacing.base}` | 16px | Panel padding, row padding |
| `{spacing.lg}` | 20px | Larger group gaps |
| `{spacing.xl}` | 24px | Section separation |
| `{spacing.xxl}` | 32px | Major panel regions |
| `{spacing.section}` | 48px | Rare large separations |

### Whitespace Philosophy
Use whitespace to separate tasks, not to make a page feel spacious. Handshake's app is information-dense: filter controls, job rows, and metadata sit close together but align cleanly. In extension UI, prefer vertical stacks with 8-16px gaps and visible dividers over roomy card layouts.

## Elevation

Handshake's logged-in UI is mostly flat. The side nav, top nav, job rows, and filter controls use white surfaces and borders rather than shadows.

| Tier | Treatment | Use |
|---|---|---|
| Flat | No shadow, no border | Page canvas and transparent icon controls |
| Bordered | 1px `{colors.hairline}` | Buttons, pills, inputs, extension panel |
| Soft Fill | `{colors.quiet-surface}` or `{colors.active-fill}` | Active nav, neutral status blocks |

Avoid floating cards with heavy shadows. If separation is needed, use a 1px border, a quiet fill, or 16px of spacing.

## Components

**`button-secondary`** - The default command button. White background `{colors.surface}`, ink text `{colors.ink}`, 1px `{colors.hairline}` border, `{typography.button}`, 8px radius, 36px height, and horizontal 8px padding. Use for neutral actions like refresh, secondary submit, settings, or app-like commands.

**`button-ghost-icon`** - Icon-only actions such as save, hide, close, and minimize. Transparent background, ink icon, no border, 8px radius, 32px square target. Hover can use `{colors.quiet-surface}`.

**`filter-pill`** - Compact filter disclosure control. White background, ink text, 1px `{colors.hairline}` border, 8px radius, 40px height, and 4px x 8px padding. It should look like Handshake's Location, Filters, and collection controls.

**`search-input`** - App-style search field. Transparent or white surface, 8px radius, 40px height, body typography, and enough left padding for an icon. Use a border only on focus or when the input sits on a white panel where its bounds need clarity.

**`side-nav-item`** - Navigation row. Transparent by default, `{typography.nav-item}`, ink text, 8px radius, compact padding. It should read like a row in a product rail, not a marketing menu.

**`active-side-nav-item`** - Active navigation row. Same as `side-nav-item`, with `{colors.active-fill}` background. Do not use blue for active app navigation unless it is a link state.

**`job-card-row`** - Job-result row or repeated record. White background, body text, no shadow, no rounded card frame. Use row padding and subtle dividers or spacing to separate entries.

**`profile-callout`** - Soft highlighted callout using `{colors.profile-cyan}` with black text and 8px radius. Use for account/profile/session information and friendly reminders.

**`extension-panel`** - Handshake Plus injected panel. White surface, 1px `{colors.hairline}` border, 8px radius, 16px padding, body typography. Keep it compact, practical, and aligned with the app's control language. Avoid nested cards inside the panel.

**`extension-status`** - Status well inside the extension panel. Quiet surface `{colors.quiet-surface}`, ink text, 8px radius, 12px padding. Use semantic text and small color changes for success or danger states rather than large banners.

## Responsive Behavior

| Name | Width | Key Changes |
|---|---:|---|
| Mobile | < 720px | App rail collapses; extension panel should become a full-width bottom or top sheet with 40px controls and stacked groups. |
| Tablet | 720-1024px | Preserve compact controls; reduce side-by-side groups before shrinking text. |
| Desktop | 1024-1440px | Match the 200px rail and 56px top bar rhythm; panel may float but should remain narrow and operational. |
| Wide | > 1440px | Do not stretch controls. Keep content capped and let gutters take extra space. |

### Touch Targets
- Primary and secondary controls should be at least 40px high when space allows.
- Icon-only targets should be at least 32px in dense desktop UI and 40px on touch-first layouts.

### Collapsing Strategy
- Stack form controls vertically before reducing font size.
- Keep labels visible; do not rely on icon-only controls unless the icon is standard and has a tooltip.
- Job rows and repeated records should remain scan-friendly, with metadata wrapping below the title on narrow screens.

## Known Gaps

- This file is based on observed logged-in job-search surfaces plus lightweight public-site inspection; it is not a complete audit of every Handshake product area.
- Motion timings are not documented beyond "keep transitions quiet and functional."
- Dark mode is not covered.
- Complex form validation, empty-state illustration style, and modal internals are not fully extracted.
- Public marketing visuals include large lime/cyan/dark hero treatments, but those should not be copied into routine extension UI.
