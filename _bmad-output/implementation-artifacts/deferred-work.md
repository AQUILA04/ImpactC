# Deferred Work

## Deferred from: code review of 1-1-multi-project-repository-scaffolding (2026-06-19)

- **`next@16.2.9` unusual version** — Installed by `create-next-app` CLI. Not actionable at scaffold stage; revisit when Next.js stable release history clarifies this version's status.
- **Boilerplate content in `mobile-client` screens** — `index.tsx` says "Welcome to Expo" and `explore.tsx` is the full Expo template. Expected at scaffold stage; product screens will replace these in Epic 3 mobile UI stories.
- **`mobile-client/app.json` slug/name `"mobile-client"`** — Default scaffold value. Update to product branding (e.g., `impactc-mobile`) when product identity is defined.
- **`experimental_backgroundImage` in `animated-icon.tsx`** — Experimental React Native API in the template splash animation. Will be replaced with the ImpactC branded splash in a future mobile UI story.
- **SSR color-scheme flash in `use-color-scheme.web.ts`** — Light-mode flash before hydration on dark-mode systems. Template code; addressed when web rendering is productionized in later stories.
- **`INITIAL_SCALE_FACTOR` stale on orientation change** — Module-level `Dimensions.get('screen')` call frozen at load time. Template splash animation; not the production implementation.
- **`scheduleOnRN` no error boundary** — `react-native-worklets` call in splash animation has no fallback. Template code to be replaced.
- **Collapsible chevron direction inverted** — `isOpen ? '-90deg' : '90deg'` is backwards (open → left ◀ instead of down ▼). Template UI component; not used in the product.
- **`import '@/global.css'` in `theme.ts` on native** — CSS side-effect import processed by Metro on native platforms, but is a no-op. Type-suppressed. Will be revisited if Metro starts warning on this pattern.
