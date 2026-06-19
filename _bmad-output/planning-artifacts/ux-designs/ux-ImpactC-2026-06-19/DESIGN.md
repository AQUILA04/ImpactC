---
name: ImpactC Matrimonial
status: final
colors:
  primary: '#3B5998'
  secondary: '#C9A84C'
  success: '#4CAF82'
  warning: '#F59E0B'
  danger: '#EF4444'
  bg-primary: '#F8F7F4'
  bg-secondary: '#EFEFEF'
  text-primary: '#1F2937'
  text-secondary: '#6B7280'
  gold-text: '#856404'
  slate-text: '#2C4270'
typography:
  headings:
    fontFamily: 'Playfair Display'
    fontWeight: '700'
  subheadings:
    fontFamily: 'Montserrat'
    fontWeight: '600'
  body:
    fontFamily: 'Inter'
    fontSize: '16px'
rounded:
  sm: '4px'
  md: '6px'
  lg: '8px'
  xl: '12px'
  full: '9999px'
spacing:
  base: '4px'
components:
  profile-card:
    background: '#FFFFFF'
    shadow: 'shadow-md'
    radius: '{rounded.xl}'
    aspectRatio: '4:5'
  cta-button:
    background: '{colors.primary}'
    foreground: '#FFFFFF'
    radius: '{rounded.md}'
  status-badge:
    radius: '{rounded.full}'
  kanban-board:
    background: '{colors.bg-primary}'
    card-background: '#FFFFFF'
    card-radius: '{rounded.md}'
    border: '1px solid {colors.bg-secondary}'
---

# ImpactC Matrimonial — Design Spine

## Brand & Style

The Matrimonial Module of ImpactC embodies the values of trust, seriousness, goodwill, and hope within the church community. Seeking a spouse is treated as a sacred, intentional journey. Therefore, the visual style adopts a dignified, warm, and highly structured aesthetic. It avoids the gamified elements, flashy colors, or superficial layouts typical of secular dating apps. 

The layout is strictly Mobile-First for the single member (Célibataire) client, optimizing readability and touch ergonomics on smaller screens. For the relationship leaders (Responsables), the admin workspace adopts a premium, high-density desktop SaaS layout using **Shadcn/ui** design structures to facilitate moderation, tracking, and communication oversight.

## Colors

The color system focuses on reassurance, warmth, and high readability:

- **Primary Slate Blue (`{colors.primary}`)**: The foundation color. Used for headers, active navigation icons, primary action buttons, and active interactive borders. It projects trust, authority, and safety.
- **Gold Accent (`{colors.secondary}`)**: Used selectively for highlights, stars, and stepper progress lines to denote value and spiritual commitment.
- **Dark Gold (`{colors.gold-text}`)**: Used for status badge text and critical indicators that require a gold/amber appearance to ensure contrast compliance.
- **Dark Slate (`{colors.slate-text}`)**: Used for small text or inline links that require a blue accent.
- **Sage Success (`{colors.success}`)**: Used for confirmation alerts, validated match displays, and successful progression states.
- **Amber Warning (`{colors.warning}`)**: Reserved for alerts, expiration notices (e.g., end of chat phases), and pending verification banners.
- **Soft Red (`{colors.danger}`)**: Used for warning banners (such as anti-contact filters), errors, blocked states, and journey cancellation buttons.
- **Off-White Background (`{colors.bg-primary}`)**: Applied as the primary page background to reduce eye strain compared to pure white.
- **Grey Light Background (`{colors.bg-secondary}`)**: Used for cards, input element fills, and divider lines.
- **Anthracite Text (`{colors.text-primary}`)**: Primary text color. Meets WCAG 2.1 AA contrast requirements against all backgrounds without the visual harshness of pure black.
- **Mid-Grey Text (`{colors.text-secondary}`)**: Secondary text for captions, timestamps, placeholder text, and secondary labels.

To satisfy WCAG 2.1 AA contrast requirements, regular-sized text and icons must not use the default Gold Accent (`#C9A84C`) or Slate Blue (`#3B5998`) directly on white/off-white backgrounds. Instead, they must utilize Dark Gold (`{colors.gold-text}`) and Dark Slate (`{colors.slate-text}`) respectively.

## Typography

Typography establishes clear visual hierarchy and reflects a serious, respectful atmosphere:

- **Primary Headings (H1, H2)**: Set in **Playfair Display** (700 Bold). It brings a solemn, classic editorial quality suitable for marriage intention.
- **Subheadings (H3, H4)**: Set in **Montserrat** (600 SemiBold) to provide a modern, clean structuring voice.
- **Body, Inputs, and Labels**: Set in **Inter** (400 Regular, 500 Medium, 600 SemiBold). This ensures maximum readability across small screens and dense dashboard tables.
- **Body Sizing**: Matches `16px` as the base on mobile devices to prevent browser-zooming on focus and ensure legibility.

## Layout & Spacing

- **Grid System**: Based on a `{spacing.base}` (4px) unit. Paddings and margins are strictly mapped to multiples of this grid: 4px, 8px, 12px, 16px, 24px, 32px, 48px.
- **Mobile Width**: The mobile layout is single-column, centered, and runs inside a maximum container width of `480px` (`max-w-md`) with `16px` of outer horizontal margins.
- **Desktop Grid**: Dashboard panels utilize a 12-column responsive layout, breaking down into a 2-column sidebar/main layout for wider desktop viewports (1024px+).

## Elevation & Depth

- **Cards and Modals**: Utilize subtle shadows (`shadow-md` or `shadow-sm`) to define container boundaries against the off-white background.
- **CTAs and Interactives**: On hover, active elements transition to a slightly higher shadow depth (`shadow-lg`) and scale up by `scale-[1.02]` to indicate interactability.
- **Overlay Panels**: System modals and alerts drop with an overlay backdrop (`bg-black/40` with `backdrop-blur-sm`) to anchor focus on the prompt.

## Shapes

- **Corner Radii**:
  - **Profile Cards**: Rounded at `{rounded.xl}` (12px) for a soft, friendly appearance.
  - **CTAs, Buttons, & Text Fields**: Rounded at `{rounded.md}` (6px) to maintain a modern, crisp SaaS tool feel.
  - **Badges & Progress Indicators**: Fully rounded pill shapes (`{rounded.full}`) to present statuses clearly.

## Components

- **Profile Card (`{components.profile-card}`)**:
  - Background: White (`#FFFFFF`), shadow depth: `shadow-md`, corner radius: `{rounded.xl}`.
  - Image: Renders in a strict `4:5` aspect ratio with center cover crop.
  - Text area: Displays primary name and age using `Montserrat`, with subtitle information (profession, church department) in `Inter` `{colors.text-secondary}`.
  - Interactive Action: A bottom primary CTA button labeled "Express Interest" utilizing `{colors.primary}` fill and white text.
- **Status Badges (`{components.status-badge}`)**:
  - Status pills have a 10% opacity color fill matching their text color:
    - *Célibataire Libre*: 10% `{colors.success}` fill, text `{colors.success}`.
    - *En Cheminement*: 10% `{colors.secondary}` fill, text `{colors.gold-text}` (modified to satisfy contrast).
    - *Suspended*: 10% `{colors.text-secondary}` fill, text `{colors.text-secondary}`.
- **Stepper Progress Indicator**:
  - A visual horizontal track mapping Steps 1, 2, 3, and 4.
  - Completed steps render with `{colors.primary}` connector lines and filled nodes. Active steps render with a pulsing outer ring. Inactive future steps are shown in `{colors.bg-secondary}`.
- **Anti-Contact Warning Banner**:
  - Displayed in the chat space during Step 2.
  - A fixed alert at the top of the interface featuring a 10% `{colors.danger}` fill, `{colors.danger}` borders, and a lock icon.
- **Journey Kanban Board (`{components.kanban-board}`)**:
  - A desktop-only management layout composed of 4 columns.
  - Background: `{colors.bg-primary}`.
  - Kanban Cards: Render with white background (`#FFFFFF`), 6px corner radius (`{rounded.md}`), and thin border (`{components.kanban-board.border}`).

## Do's and Don'ts

| Do | Don't |
|---|---|
| Use `{colors.primary}` Slate Blue for primary headers, main actions, and confirmed matches. | Use high-vibrancy primary blues, neon colors, or pinks that simulate casual dating applications. |
| Restrict Playfair Display strictly to main titles and onboarding headers. | Use Playfair Display for body text, form labels, or secondary captions. |
| Render profiles in a single column vertical feed on mobile viewports. | Use a double-column feed on small screens that compresses profile photos. |
| Maintain `{colors.text-primary}` and `{colors.text-secondary}` contrast ratios >= 4.5:1. | Use light gray or low-contrast text for metadata or helper messages. |
| Use `{colors.gold-text}` and `{colors.slate-text}` for standard-sized typography on light backgrounds to preserve visual contrast. | Use `{colors.secondary}` Gold or `{colors.primary}` Slate Blue for small body text or metadata elements. |
| Keep profile photos in a strict 4:5 vertical aspect ratio. | Stretch or distort photos, or allow arbitrary aspect ratios. |
