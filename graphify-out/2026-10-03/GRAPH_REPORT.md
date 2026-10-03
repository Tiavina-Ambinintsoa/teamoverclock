# Graph Report - teamoverclock  (2026-10-03)

## Corpus Check
- 171 files · ~76,845 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 994 nodes · 1002 edges · 162 communities (87 shown, 75 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 60 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e28ee0b8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- dependencies
- Component UI Library
- devDependencies
- react
- compilerOptions
- router.tsx
- .oxlintrc.json
- compilerOptions
- components.json
- predeploy.mjs
- _shared/http.ts
- Vitest Setup Complete ✅
- CRUD Example - Notes
- items-api.ts
- StorageUploader Component
- a11y-prefs.ts
- admin-page.tsx
- Notifications System
- auth-provider.tsx
- map-page.tsx
- marketing-page.tsx
- theme-switcher.tsx
- createThreeScene
- tabs.tsx
- use-items.ts
- locale.tsx
- gallery-page.tsx
- theme-provider.tsx
- auth-context.ts
- auth-form.tsx
- format.ts
- resolve-css-color.ts
- home-page.tsx
- agenda-page.tsx
- templates/dashboard-page.tsx
- scripts
- three-viewer.tsx
- aurora-shader.tsx
- application-layout.tsx
- theme-context.ts
- item-form.tsx
- lib/http.ts
- kit-page.tsx
- interactions-page.tsx
- Test Templates & Examples
- bar-chart.tsx
- donut-chart.tsx
- async-button.tsx
- avatar.tsx
- bento-grid.tsx
- video-player.tsx
- auth-shell.tsx
- env.ts
- local-db.ts
- morphisms.ts
- presets.ts
- typography-presets.ts
- assistant-page.tsx
- templates-index-page.tsx
- providers.tsx
- text-reveal.tsx
- confirm-dialog.tsx
- empty-state.tsx
- home-interactive-background.tsx
- alternate-home-heroes.tsx
- image-parallax-background.tsx
- root-layout.tsx
- lightbox.tsx
- page-header.tsx
- pagination.tsx
- reveal.tsx
- storage-uploader.tsx
- badge.tsx
- breadcrumb.tsx
- button.tsx
- progress.tsx
- slider.tsx
- switch.tsx
- notifications-menu.tsx
- site.ts
- supabase.ts
- app/dashboard-page.tsx
- animations-page.tsx
- home-variants-page.tsx
- video-page.tsx
- vite-env.d.ts
- tsconfig.json
- playwright.config.ts
- Déploiement HODI et configuration de production
- 11.1 Unit Tests for New Functionality
- 15. WHAT TO DO WHEN...
- types.ts
- AI Development Ruleset for Webcup 2026 Starter
- permissions.ts
- home-background-config.ts
- storage.ts
- utils.ts
- Admin Console Pages
- Container Layout Component
- Local Storage Utilities
- Site Configuration
- Templates Index (/modeles)
- useCountUp Animation Hook
- useMounted Hook
- useNow Timer Hook
- Animations et composants à choisir pendant le sprint
- vitest.setup.ts
- 3. AVAILABLE COMPONENTS & HOOKS
- 4. SUPABASE INTEGRATION
- 10. STYLING GUIDELINES
- 8. AUTHENTICATION PATTERNS
- 12. DEPLOYMENT
- 13. NAMING CONVENTIONS
- 16. QUICK REFERENCE
- 1. CORE CONSTRAINTS
- 6. CREATING NEW PAGES
- 7. CREATING NEW COMPONENTS
- 9. DATA FETCHING & MUTATIONS
- accessibility-context.ts
- RootLayout Component
- 2. FILE STRUCTURE & ORGANIZATION
- animated-gradient-text.tsx
- accessibility-panel.tsx
- CLAUDE.md
- Reveal Component
- vitest.config.ts
- Home Interactive Background
- Image Parallax Background
- Public Information Pages
- useReducedMotion Preference Hook

## God Nodes (most connected - your core abstractions)
1. `react` - 78 edges
2. `compilerOptions` - 20 edges
3. `AI Development Ruleset for Webcup 2026 Starter` - 19 edges
4. `compilerOptions` - 16 edges
5. `Vitest Setup Complete ✅` - 15 edges
6. `Test Templates & Examples` - 14 edges
7. `Component UI Library` - 14 edges
8. `scripts` - 13 edges
9. `15. WHAT TO DO WHEN...` - 11 edges
10. `11.1 Unit Tests for New Functionality` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Vite Bundler` ----> `react-router`  [INFERRED]
  README.md → package.json
- `NPM Project Setup` ----> `typescript`  [INFERRED]
  README.md → package.json
- `Oxlint Linting` ----> `typescript`  [INFERRED]
  README.md → package.json
- `Vite Bundler` ----> `typescript`  [INFERRED]
  README.md → package.json

## Import Cycles
- None detected.

## Communities (162 total, 75 thin omitted)

### Community 0 - "dependencies"
Cohesion: 0.04
Nodes (45): class-variance-authority, clsx, @fontsource-variable/bricolage-grotesque, @fontsource-variable/fraunces, @fontsource-variable/instrument-sans, @hookform/resolvers, lucide-react, dependencies (+37 more)

### Community 1 - "Component UI Library"
Cohesion: 0.11
Nodes (19): Alternate Home Hero Presets, AsyncButton Component, Chart Components, Color Palettes, Component UI Library, ConfirmDialog Component, EmptyState Component, Kit Gallery Page (/kit) (+11 more)

### Community 2 - "devDependencies"
Cohesion: 0.06
Nodes (33): jsdom, oxlint, devDependencies, jsdom, oxlint, @playwright/test, tailwindcss, @tailwindcss/vite (+25 more)

### Community 4 - "compilerOptions"
Cohesion: 0.07
Nodes (26): DOM, DOM.Iterable, ES2022, src, vite/client, compilerOptions, allowImportingTsExtensions, jsx (+18 more)

### Community 6 - ".oxlintrc.json"
Cohesion: 0.10
Nodes (20): categories, correctness, suspicious, env, browser, es2022, ignorePatterns, overrides (+12 more)

### Community 7 - "compilerOptions"
Cohesion: 0.10
Nodes (20): ES2023, node, vite.config.ts, compilerOptions, allowImportingTsExtensions, lib, module, moduleDetection (+12 more)

### Community 8 - "components.json"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 9 - "predeploy.mjs"
Cohesion: 0.12
Nodes (10): dist, files, IMAGES, leftovers, MARKERS, root, sourceFiles, STRICT (+2 more)

### Community 10 - "_shared/http.ts"
Cohesion: 0.33
Nodes (10): allowedOrigins, authenticatedUser(), corsHeaders(), getBearerToken(), htmlEscape(), json(), originAllowed(), preflight() (+2 more)

### Community 11 - "Vitest Setup Complete ✅"
Cohesion: 0.06
Nodes (35): 1. **Utility Function Tests** (`src/lib/utils.test.ts`), 2. **Format Function Tests** (`src/lib/format.test.ts`), 3. **Component Tests** (`src/components/ui/button.test.tsx`), Add console logs, Configuration Files, Coverage Report, Debugging Tests, Example Test Output (+27 more)

### Community 12 - "CRUD Example - Notes"
Cohesion: 0.09
Nodes (27): Admin Console, Items API Module, ApplicationLayout Component, Authentication System, Build Commands, CRUD Example - Notes, Demo Mode (Local), Home Page Variants (+19 more)

### Community 13 - "items-api.ts"
Cohesion: 0.29
Nodes (11): createItem(), deleteItem(), fail(), getItem(), Item, ItemRow, listItems(), NewItem (+3 more)

### Community 16 - "a11y-prefs.ts"
Cohesion: 0.15
Nodes (20): A11Y_STORAGE_KEY, A11yPrefs, applyA11yPrefs(), clamp(), clampFontScale(), clampNumber(), DEFAULT_A11Y_PREFS, FONT_SCALE_MAX (+12 more)

### Community 18 - "admin-page.tsx"
Cohesion: 0.22
Nodes (5): AdminUser, ContactMessage, metrics, sectionCopy, sections

### Community 21 - "auth-provider.tsx"
Cohesion: 0.36
Nodes (6): AuthProvider(), DEMO_ADMIN, DEMO_USER, fromSupabaseUser(), readLocalUser(), translateAuthError()

### Community 22 - "map-page.tsx"
Cohesion: 0.32
Nodes (6): mapEmbedUrl(), MapPage(), mapPageUrl(), MapTilerFrame(), Place, PLACES

### Community 23 - "marketing-page.tsx"
Cohesion: 0.25
Nodes (5): FAQ, FEATURES, HOME_STATS, PLANS, TESTIMONIALS

### Community 27 - "use-items.ts"
Cohesion: 0.52
Nodes (6): requireUser(), useCreateItem(), useDeleteItem(), useItem(), useItems(), useUpdateItem()

### Community 28 - "locale.tsx"
Cohesion: 0.29
Nodes (4): Locale, LocaleContext, LocaleContextValue, messages

### Community 29 - "gallery-page.tsx"
Cohesion: 0.29
Nodes (4): CATEGORIES, CHART_PAIRS, Piece, PIECES

### Community 30 - "theme-provider.tsx"
Cohesion: 0.60
Nodes (5): readMode(), readMorphism(), readPreset(), readTypography(), ThemeProvider()

### Community 31 - "auth-context.ts"
Cohesion: 0.33
Nodes (4): AppUser, AuthContext, AuthState, OAuthProvider

### Community 33 - "format.ts"
Cohesion: 0.43
Nodes (5): ariaryFormatter, dateFormatter, formatAriary(), formatDate(), formatDuration()

### Community 34 - "resolve-css-color.ts"
Cohesion: 0.47
Nodes (4): getCtx(), resolveCssColor(), resolveThemeColor(), RGB

### Community 35 - "home-page.tsx"
Cohesion: 0.40
Nodes (4): features, HOME_HERO_DEFAULT, HomePage(), step()

### Community 37 - "agenda-page.tsx"
Cohesion: 0.40
Nodes (5): AgendaEntry, AgendaFilter, AgendaPage(), ENTRIES, formatDay()

### Community 38 - "templates/dashboard-page.tsx"
Cohesion: 0.33
Nodes (3): ACTIVITY, SPLIT, WEEKLY

### Community 39 - "scripts"
Cohesion: 0.10
Nodes (20): description, engines, node, name, private, scripts, build, dev (+12 more)

### Community 40 - "three-viewer.tsx"
Cohesion: 0.50
Nodes (3): hasWebGLSupport(), ThreeViewer(), ThreeViewerProps

### Community 41 - "aurora-shader.tsx"
Cohesion: 0.60
Nodes (4): AuroraShader(), AuroraShaderProps, compileShader(), hexToRgb()

### Community 43 - "theme-context.ts"
Cohesion: 0.40
Nodes (3): Mode, ThemeContext, ThemeState

### Community 46 - "item-form.tsx"
Cohesion: 0.40
Nodes (3): FormValues, ItemFormProps, schema

### Community 47 - "lib/http.ts"
Cohesion: 0.50
Nodes (3): http(), HttpError, parseJson()

### Community 50 - "Test Templates & Examples"
Cohesion: 0.10
Nodes (20): Common Testing Patterns, Coverage Goals, Debugging Tests, ✅ DO, ❌ DON'T, Need Help?, Quick Start, Template 1: Testing Utility Functions (+12 more)

### Community 56 - "video-player.tsx"
Cohesion: 0.67
Nodes (3): formatTime(), VideoPlayer(), VideoPlayerProps

### Community 99 - "Déploiement HODI et configuration de production"
Cohesion: 0.12
Nodes (13): Authentification, Google/Facebook et courriels, Avant le build HODI, Déploiement HODI et configuration de production, Fonctions serveur et secrets, Première mise en place Supabase, Assistant OpenRouter, Historique facultatif, Prérequis (+5 more)

### Community 104 - "11.1 Unit Tests for New Functionality"
Cohesion: 0.17
Nodes (12): 11.1 Unit Tests for New Functionality, 11.2 E2E Tests with Playwright, 11.3 Running Tests, 11.4 Running Linter, 11.5 Test Coverage, 11. TESTING, Setting Up Unit Tests, Testing Custom Hooks (+4 more)

### Community 105 - "15. WHAT TO DO WHEN..."
Cohesion: 0.18
Nodes (11): 15.10 I added styles or updated CSS classes, 15.1 I need a new UI element not in shadcn/ui, 15.2 I need to add a new table to Supabase, 15.3 I need a new hook, 15.4 I need authentication, 15.5 I need to store data, 15.6 I need to add a new package, 15.7 I added a new utility function (+3 more)

### Community 110 - "types.ts"
Cohesion: 0.20
Nodes (9): AccountStatus, DangerSeverity, KycStatus, PriorityLevel, ReportSource, ReportStatus, RequestStatus, ServiceStatus (+1 more)

### Community 115 - "AI Development Ruleset for Webcup 2026 Starter"
Cohesion: 0.22
Nodes (8): 14. COMMIT CHECKLIST, 17. KNOWLEDGE GRAPH REFERENCE, 18. GETTING HELP, 5.1 Create Forms with react-hook-form + Zod, 5. FORM & VALIDATION PATTERNS, AI Development Ruleset for Webcup 2026 Starter, Check These Files First, Run These Commands

### Community 117 - "permissions.ts"
Cohesion: 0.43
Nodes (6): can(), homeForRole(), isStaffRole(), MATRIX, PermissionCode, permissionScope

### Community 134 - "Animations et composants à choisir pendant le sprint"
Cohesion: 0.29
Nodes (6): Ajouter d'autres composants shadcn/ui au besoin, Ajouter des effets Magic UI, Animations et composants à choisir pendant le sprint, Démonstration prête à ouvrir, Primitives d'interface déjà disponibles, Utilisation et installation hors ligne

### Community 136 - "3. AVAILABLE COMPONENTS & HOOKS"
Cohesion: 0.33
Nodes (6): 3.1 UI Components (shadcn/ui), 3.2 Custom Components, 3.3 Authentication & Authorization, 3.4 Custom Hooks (Available), 3.5 Query & Data Fetching, 3. AVAILABLE COMPONENTS & HOOKS

### Community 137 - "4. SUPABASE INTEGRATION"
Cohesion: 0.33
Nodes (6): 4.1 Supabase Client Setup, 4.2 Database Tables (Available), 4.3 Using Supabase in Components, 4.4 Row-Level Security (RLS), 4.5 Environment Variables, 4. SUPABASE INTEGRATION

### Community 138 - "10. STYLING GUIDELINES"
Cohesion: 0.40
Nodes (5): 10.1 Tailwind Classes Only, 10.2 Dark Mode Support, 10.3 Responsive Design, 10.4 Color Tokens, 10. STYLING GUIDELINES

### Community 139 - "8. AUTHENTICATION PATTERNS"
Cohesion: 0.40
Nodes (5): 8.1 Protected Routes, 8.2 Admin-Only Routes, 8.3 Getting Current User, 8.4 Demo Mode, 8. AUTHENTICATION PATTERNS

### Community 140 - "12. DEPLOYMENT"
Cohesion: 0.50
Nodes (4): 12.1 Build, 12.2 Preview, 12.3 HODI Deployment, 12. DEPLOYMENT

### Community 141 - "13. NAMING CONVENTIONS"
Cohesion: 0.50
Nodes (4): 13.1 Files & Folders, 13.2 Components, 13.3 Routes, 13. NAMING CONVENTIONS

### Community 142 - "16. QUICK REFERENCE"
Cohesion: 0.50
Nodes (4): 16. QUICK REFERENCE, Common Patterns, Common Test Patterns, Import Paths

### Community 143 - "1. CORE CONSTRAINTS"
Cohesion: 0.50
Nodes (4): 1.1 Technology Stack (Non-Negotiable), 1.2 Code Quality Standards, 1.3 Project Scope Boundaries, 1. CORE CONSTRAINTS

### Community 144 - "6. CREATING NEW PAGES"
Cohesion: 0.50
Nodes (4): 6.1 Page Template, 6.2 Register in Router, 6.3 Styling, 6. CREATING NEW PAGES

### Community 145 - "7. CREATING NEW COMPONENTS"
Cohesion: 0.50
Nodes (4): 7.1 Component Structure, 7.2 Where to Place Components, 7.3 Props Pattern, 7. CREATING NEW COMPONENTS

### Community 146 - "9. DATA FETCHING & MUTATIONS"
Cohesion: 0.50
Nodes (4): 9.1 Query Data (Read), 9.2 Mutate Data (Create/Update/Delete), 9.3 Existing Hooks for CRUD Items, 9. DATA FETCHING & MUTATIONS

### Community 148 - "RootLayout Component"
Cohesion: 0.67
Nodes (3): RootLayout Component, SiteFooter Layout Component, SiteHeader Layout Component

### Community 149 - "2. FILE STRUCTURE & ORGANIZATION"
Cohesion: 0.67
Nodes (3): 2.1 Directory Mapping, 2.2 Path Alias, 2. FILE STRUCTURE & ORGANIZATION

## Knowledge Gaps
- **448 isolated node(s):** `$schema`, `typescript`, `jsx-a11y`, `oxc`, `correctness` (+443 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **75 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `.oxlintrc.json`, `dialog.tsx`, `table.tsx`, `admin-page.tsx`, `accessibility-context.ts`, `card.tsx`, `auth-provider.tsx`, `animated-gradient-text.tsx`, `map-page.tsx`, `container.tsx`, `tabs.tsx`, `admin-login-page.tsx`, `item-detail-page.tsx`, `theme-provider.tsx`, `auth-context.ts`, `auth-form.tsx`, `locale.tsx`, `gallery-page.tsx`, `home-page.tsx`, `site-pages.tsx`, `agenda-page.tsx`, `three-viewer.tsx`, `aurora-shader.tsx`, `application-layout.tsx`, `theme-context.ts`, `accordion.tsx`, `tooltip.tsx`, `kit-page.tsx`, `async-button.tsx`, `avatar.tsx`, `bento-grid.tsx`, `video-player.tsx`, `auth-shell.tsx`, `assistant-page.tsx`, `providers.tsx`, `text-reveal.tsx`, `confirm-dialog.tsx`, `empty-state.tsx`, `home-interactive-background.tsx`, `image-parallax-background.tsx`, `site-header.tsx`, `lightbox.tsx`, `page-header.tsx`, `reveal.tsx`, `storage-uploader.tsx`, `badge.tsx`, `breadcrumb.tsx`, `button.tsx`, `progress.tsx`, `slider.tsx`, `switch.tsx`, `notifications-menu.tsx`, `animations-page.tsx`, `home-variants-page.tsx`, `video-page.tsx`, `border-beam.tsx`, `sonner.tsx`, `textarea.tsx`, `use-mounted.ts`, `use-reduced-motion.ts`, `settings-page.tsx`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Why does `plugins` connect `.oxlintrc.json` to `react`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `CRUD Example - Notes`, `scripts`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `$schema`, `typescript`, `jsx-a11y` to the rest of the system?**
  _448 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._
- **Should `Component UI Library` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._