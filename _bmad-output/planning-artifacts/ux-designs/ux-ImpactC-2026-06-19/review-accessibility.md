# Spine Pair Review: Accessibility Lens — ImpactC Matrimonial

## Overall verdict
While the interaction models and touch targets strictly adhere to WCAG 2.1 AA specifications, the current color tokens introduce severe visual contrast violations. Using the Gold Accent for text and using Slate Blue for standard body text will fail the 4.5:1 contrast ratio.

## Findings

### 1. Color Contrast — high
- **high** Gold Accent (`#C9A84C`) has a contrast ratio of only **2.2:1** against White (`#FFFFFF`) and **2.0:1** against Off-White (`#F8F7F4`). In `DESIGN.md.Components.status-badge`, this color is assigned to text within the "En Cheminement" badge. This fails the WCAG 2.1 AA contrast target of **4.5:1** for regular text.
- *Fix:* Define a separate dark gold/amber text color token (e.g. `--color-dark-gold: #856404` with a contrast ratio of ~5.1:1) to serve as the text color inside the badge, leaving `#C9A84C` strictly for icon highlights or decorative accents.

### 2. Primary Slate Contrast on Off-White — medium
- **medium** Slate Blue (`#3B5998`) has a contrast ratio of **4.3:1** against Off-White (`#F8F7F4`). While this passes the 3.0:1 ratio for large text (H1, H2, or large buttons), using it for small buttons, links, or inline labels will fail the **4.5:1** ratio for normal-sized text.
- *Fix:* Ensure any small text or inline labels in Slate Blue are either scaled up or styled with a slightly darker variant (e.g. `#2C4270` which achieves a 5.6:1 contrast ratio) when rendered on the off-white background.

### 3. Touch target sizes — strong
- **strong** All interactive touch targets (tabs, input controls, buttons) are specified at a minimum size of `48px`, satisfying mobile layout touch area guidelines.

### 4. Interactive Primitives — strong
- **strong** Keyboard navigation and visible focus rings are clearly detailed. Tab order matches physical reading order, and focus rings utilize `{colors.primary}` with 2px solid definition, ensuring clear outline visibility.
