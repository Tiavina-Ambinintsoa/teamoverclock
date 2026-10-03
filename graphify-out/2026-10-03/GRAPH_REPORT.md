# Graph Report - teamoverclock  (2026-10-03)

## Corpus Check
- 273 files · ~149,748 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1673 nodes · 1819 edges · 236 communities (133 shown, 103 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 62 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `31f0998a`
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
- chatbot-engine.ts
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
- 3. Cahier des charges par entrée de la Todo List
- home-interactive-background.tsx
- alternate-home-heroes.tsx
- image-parallax-background.tsx
- root-layout.tsx
- site-header.tsx
- voice-commands.ts
- empty-state.tsx
- pagination.tsx
- reveal.tsx
- storage-uploader.tsx
- badge.tsx
- breadcrumb.tsx
- button.tsx
- progress.tsx
- request-workflow.ts
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
- hex.ts
- REQUESTS.md
- 11.1 Unit Tests for New Functionality
- 15. WHAT TO DO WHEN...
- speech.ts
- db-types.ts
- types.ts
- guide-tours.ts
- AI Development Ruleset for Webcup 2026 Starter
- 4. Fonctionnalités complémentaires
- permissions.ts
- home-background-config.ts
- storage.ts
- utils.ts
- 9. Implementation roadmap (ordered by REQUESTS "priorité de réalisation")
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
- Nova Terra — Master Plan
- 9. DATA FETCHING & MUTATIONS
- accessibility-context.ts
- RootLayout Component
- 3. Database design
- animated-gradient-text.tsx
- accessibility-panel.tsx
- CLAUDE.md
- Reveal Component
- report-workflow.ts
- 3.3 Tables (39) — each gets **10 seed rows**
- package.json
- vitest.config.ts
- Home Interactive Background
- Image Parallax Background
- Public Information Pages
- useReducedMotion Preference Hook
- status-labels.ts
- city-queries.ts
- profile-api.ts
- nav-config.ts
- auth/schema.ts
- hex-map.tsx
- page-reader.ts
- admin-extra-pages.tsx
- users-page.tsx
- hours.ts
- ai-content.ts
- report-queries.ts
- support-pages.tsx
- query-helpers.ts
- news-manager.tsx
- services-manager.tsx
- map-editor-page.tsx
- profile/schema.ts
- request-queries.ts
- dangers-manager.tsx
- stats.ts
- login-throttle.ts
- guide-provider.tsx
- chatbot-page.tsx
- newsletter-page.tsx
- require-role.tsx
- dangers-pages.tsx
- guide-context.ts
- voice-context.ts
- slug.ts
- data-state.tsx
- status-badge.tsx
- verifications-page.tsx
- agent-team-page.tsx
- sync-queries.ts
- citizen-dashboard.tsx
- map/map-page.tsx
- signup-form.tsx
- verification-page.tsx
- report-new-page.tsx
- dictation-button.tsx
- use-dictation.ts
- voice-provider.tsx
- facilities-manager.tsx
- 5. Architecture (frontend)
- service-detail-page.tsx
- 4. Fictional data (10 rows per table)
- 18. GETTING HELP
- lightbox.tsx
- slider.tsx
- request-new-page.tsx
- oxlint
- @playwright/test
- tailwindcss
- @testing-library/jest-dom
- @testing-library/react
- @types/node
- @types/react
- @vitejs/plugin-react
- vitest

## God Nodes (most connected - your core abstractions)
1. `react` - 112 edges
2. `compilerOptions` - 20 edges
3. `AI Development Ruleset for Webcup 2026 Starter` - 19 edges
4. `compilerOptions` - 16 edges
5. `Vitest Setup Complete ✅` - 15 edges
6. `Test Templates & Examples` - 14 edges
7. `Component UI Library` - 14 edges
8. `scripts` - 13 edges
9. `Nova Terra — Master Plan` - 13 edges
10. `9. Implementation roadmap (ordered by REQUESTS "priorité de réalisation")` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Vite Bundler` ----> `react-router`  [INFERRED]
  README.md → package.json
- `NPM Project Setup` ----> `typescript`  [INFERRED]
  README.md → package.json
- `Oxlint Linting` ----> `typescript`  [INFERRED]
  README.md → package.json
- `Vite Bundler` ----> `typescript`  [INFERRED]
  README.md → package.json
- `ids()` --calls--> `navForRole()`  [EXTRACTED]
  src/components/layout/nav-config.test.ts → src/components/layout/nav-config.ts

## Import Cycles
- None detected.

## Communities (236 total, 103 thin omitted)

### Community 0 - "dependencies"
Cohesion: 0.04
Nodes (45): class-variance-authority, clsx, @fontsource-variable/bricolage-grotesque, @fontsource-variable/fraunces, @fontsource-variable/instrument-sans, @hookform/resolvers, lucide-react, dependencies (+37 more)

### Community 1 - "Component UI Library"
Cohesion: 0.05
Nodes (46): Admin Console, Alternate Home Hero Presets, Items API Module, ApplicationLayout Component, AsyncButton Component, Authentication System, Build Commands, Chart Components (+38 more)

### Community 2 - "devDependencies"
Cohesion: 0.13
Nodes (15): jsdom, devDependencies, jsdom, @tailwindcss/vite, @testing-library/user-event, @types/react-dom, @types/three, vite (+7 more)

### Community 3 - "react"
Cohesion: 0.03
Nodes (3): react, PageHeaderProps, CommentRow

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

### Community 12 - "chatbot-engine.ts"
Cohesion: 0.13
Nodes (29): buildReply(), CATEGORY_RULES, ChatReply, ChatSource, clip(), detectFacet(), detectIntent(), EMERGENCY_NUMBERS (+21 more)

### Community 13 - "items-api.ts"
Cohesion: 0.29
Nodes (11): createItem(), deleteItem(), fail(), getItem(), Item, ItemRow, listItems(), NewItem (+3 more)

### Community 16 - "a11y-prefs.ts"
Cohesion: 0.11
Nodes (27): A11Y_NEEDS, A11Y_STORAGE_KEY, A11yNeed, A11yPrefs, A11yRow, applyA11yPrefs(), clamp(), clampFontScale() (+19 more)

### Community 18 - "admin-page.tsx"
Cohesion: 0.22
Nodes (5): AdminUser, ContactMessage, metrics, sectionCopy, sections

### Community 21 - "auth-provider.tsx"
Cohesion: 0.33
Nodes (7): AuthProvider(), DEMO_ADMIN, DEMO_USER, fromSupabaseUser(), readLocalUser(), translateAuthError(), withExtras()

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
Cohesion: 0.29
Nodes (5): AppUser, AuthContext, AuthState, OAuthProvider, SignUpDetails

### Community 33 - "format.ts"
Cohesion: 0.43
Nodes (5): ariaryFormatter, dateFormatter, formatAriary(), formatDate(), formatDuration()

### Community 34 - "resolve-css-color.ts"
Cohesion: 0.47
Nodes (4): getCtx(), resolveCssColor(), resolveThemeColor(), RGB

### Community 37 - "agenda-page.tsx"
Cohesion: 0.40
Nodes (5): AgendaEntry, AgendaFilter, AgendaPage(), ENTRIES, formatDay()

### Community 38 - "templates/dashboard-page.tsx"
Cohesion: 0.33
Nodes (3): ACTIVITY, SPLIT, WEEKLY

### Community 39 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, dev, lint, predeploy, preview, release, test (+5 more)

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

### Community 68 - "3. Cahier des charges par entrée de la Todo List"
Cohesion: 0.04
Nodes (48): 3. Cahier des charges par entrée de la Todo List, Administrateur de service, Administrateur général, Agent municipal, Citoyen, Contenu recommandé, Critères d’acceptation, Critères d’acceptation (+40 more)

### Community 74 - "voice-commands.ts"
Cohesion: 0.18
Nodes (17): Actionable, canUseCommand(), CommandMatch, DEFAULT_COMMANDS, dictateIntoField(), findActionable(), isVisible(), labelOf() (+9 more)

### Community 83 - "request-workflow.ts"
Cohesion: 0.16
Nodes (16): allowedTransitions(), ATTACHMENT_MAX_BYTES, ATTACHMENT_MAX_COUNT, ATTACHMENT_MIME_TYPES, dueDateFor(), isTerminal(), needsAction(), PRIORITY_RANK (+8 more)

### Community 98 - "hex.ts"
Cohesion: 0.22
Nodes (16): Axial, axialToPixel(), distance(), estimateMinutes(), findRoute(), hexDistance(), hexPoints(), isBuildingOpen() (+8 more)

### Community 99 - "REQUESTS.md"
Cohesion: 0.06
Nodes (32): Authentification, Google/Facebook et courriels, Avant le build HODI, Déploiement HODI et configuration de production, Fonctions serveur et secrets, Première mise en place Supabase, Assistant OpenRouter, Historique facultatif, Prérequis (+24 more)

### Community 104 - "11.1 Unit Tests for New Functionality"
Cohesion: 0.17
Nodes (12): 11.1 Unit Tests for New Functionality, 11.2 E2E Tests with Playwright, 11.3 Running Tests, 11.4 Running Linter, 11.5 Test Coverage, 11. TESTING, Setting Up Unit Tests, Testing Custom Hooks (+4 more)

### Community 105 - "15. WHAT TO DO WHEN..."
Cohesion: 0.18
Nodes (11): 15.10 I added styles or updated CSS classes, 15.1 I need a new UI element not in shadcn/ui, 15.2 I need to add a new table to Supabase, 15.3 I need a new hook, 15.4 I need authentication, 15.5 I need to store data, 15.6 I need to add a new package, 15.7 I added a new utility function (+3 more)

### Community 107 - "speech.ts"
Cohesion: 0.16
Nodes (15): collectTranscript(), describeRecognitionError(), getRecognitionConstructor(), isRecognitionSupported(), isSynthesisSupported(), RecognitionAlternative, RecognitionConstructor, RecognitionErrorEvent (+7 more)

### Community 108 - "db-types.ts"
Cohesion: 0.12
Nodes (16): Building, BuildingStatus, BuildingType, DangerRow, FacilityType, NewsImportance, NewsItem, NewsStatus (+8 more)

### Community 110 - "types.ts"
Cohesion: 0.20
Nodes (9): AccountStatus, DangerSeverity, KycStatus, PriorityLevel, ReportSource, ReportStatus, RequestStatus, ServiceStatus (+1 more)

### Community 114 - "guide-tours.ts"
Cohesion: 0.20
Nodes (12): ALL, BUILT_IN_TOURS, GuideLocale, GuideStep, GuideTour, mergeTours(), pendingWelcome(), Placement (+4 more)

### Community 115 - "AI Development Ruleset for Webcup 2026 Starter"
Cohesion: 0.15
Nodes (12): 14. COMMIT CHECKLIST, 17. KNOWLEDGE GRAPH REFERENCE, 2.1 Directory Mapping, 2.2 Path Alias, 2. FILE STRUCTURE & ORGANIZATION, 5.1 Create Forms with react-hook-form + Zod, 5. FORM & VALIDATION PATTERNS, 7.1 Component Structure (+4 more)

### Community 116 - "4. Fonctionnalités complémentaires"
Cohesion: 0.05
Nodes (40): 4.1 Chatbot texte et vocal, 4.2 Générer la structure de données, 4.3 Les services — ville fictive et futuriste, 4.4 Les signalements, 4.5 Les structures de la base de données, 4.6 Les profils, 4.7 La carte interactive, 4.8 Les dangers (+32 more)

### Community 117 - "permissions.ts"
Cohesion: 0.43
Nodes (6): can(), homeForRole(), isStaffRole(), MATRIX, PermissionCode, permissionScope

### Community 121 - "9. Implementation roadmap (ordered by REQUESTS "priorité de réalisation")"
Cohesion: 0.15
Nodes (13): 9. Implementation roadmap (ordered by REQUESTS "priorité de réalisation"), Implementation status and known gaps (updated after phases 1–10), Phase 0 — Foundations, Phase 10 — Accessibility, voice & guidance (starts after Phase 1; re-checked in Phase 9), Phase 1 — Identity & access (D01, D03, D08, D09), Phase 2 — Public portal (D05, D06, D07), Phase 3 — Requests (D04, F22), Phase 4 — Agent workspace (D19) (+5 more)

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

### Community 145 - "Nova Terra — Master Plan"
Cohesion: 0.22
Nodes (9): 10. Requirement traceability, 11. Out of scope (for now), 12. Changelog, 1. Product summary, 2. Decisions taken (defaults — change here if the team disagrees), 6. Security & compliance checklist, 7. Accessibility, performance, UX, 8. Testing (+1 more)

### Community 146 - "9. DATA FETCHING & MUTATIONS"
Cohesion: 0.50
Nodes (4): 9.1 Query Data (Read), 9.2 Mutate Data (Create/Update/Delete), 9.3 Existing Hooks for CRUD Items, 9. DATA FETCHING & MUTATIONS

### Community 148 - "RootLayout Component"
Cohesion: 0.67
Nodes (3): RootLayout Component, SiteFooter Layout Component, SiteHeader Layout Component

### Community 149 - "3. Database design"
Cohesion: 0.22
Nodes (9): 3.1 Conventions, 3.2 Enums, 3.4 Key relations (ER overview), 3.5 Functions & triggers, 3.6 Indexes, 3.7 Row-Level Security (matrix mapped from D09), 3.7b Implementation notes (deviations from the first draft — the SQL is the reference), 3.8 Delivery files (import into Supabase → SQL Editor, in this order) (+1 more)

### Community 154 - "report-workflow.ts"
Cohesion: 0.19
Nodes (13): canPublish(), canValidateReport(), GroupableReport, groupReports(), PUBLISHABLE, REPORT_CATEGORIES, REPORT_PRIORITY_VALUES, ReportFormValues (+5 more)

### Community 155 - "3.3 Tables (39) — each gets **10 seed rows**"
Cohesion: 0.22
Nodes (9): 3.3 Tables (39) — each gets **10 seed rows**, A. Geography & organisation, B. Identity, roles & reputation, C. Requests (D04 / F22), D. Reports (signalements), E. Content & communication, F. Dangers & observation, G. Platform, AI & traceability (+1 more)

### Community 156 - "package.json"
Cohesion: 0.25
Nodes (7): description, engines, node, name, private, type, version

### Community 162 - "status-labels.ts"
Cohesion: 0.17
Nodes (14): BadgeTone, BUILDING_TYPE_LABELS, FACILITY_TYPE_LABELS, LabelLocale, LabelTable, pickLabel(), REPORT_CATEGORY_LABELS, REPORT_STATUSES (+6 more)

### Community 163 - "city-queries.ts"
Cohesion: 0.15
Nodes (6): filterBuildingsForService(), filterFacilities(), isNewsActive(), NewsFilters, ServiceFilters, useNews()

### Community 164 - "profile-api.ts"
Cohesion: 0.22
Nodes (10): blockedAccountMessage(), CitizenRow, fetchProfileExtras(), isBlockedAccount(), mapProfileExtras(), MemberRow, ProfileExtras, ProfileRow (+2 more)

### Community 165 - "nav-config.ts"
Cohesion: 0.24
Nodes (8): adminGroup, agentGroup, citizenGroup, cityGroup, navForRole(), NavGroup, NavItem, ids()

### Community 166 - "auth/schema.ts"
Cohesion: 0.38
Nodes (8): ageFromBirthDate(), cinSchema, isMinorBirthDate(), loginSchema, passwordStrength, signupSchema, SignupValues, NOW

### Community 167 - "hex-map.tsx"
Cohesion: 0.22
Nodes (9): boundsOf(), BUILDING_FILL, HEX_SIZE, HexMap(), HexMapProps, MapLayers, MapMarker, MapSelection (+1 more)

### Community 168 - "page-reader.ts"
Cohesion: 0.47
Nodes (8): clean(), describePage(), fieldLabels(), isHidden(), Locale, readableText(), visibleTexts(), WORDS

### Community 169 - "admin-extra-pages.tsx"
Cohesion: 0.31
Nodes (6): AdminAuditPage(), AdminOverviewPage(), AiRow, AuditRow, changedKeys(), countOf()

### Community 170 - "users-page.tsx"
Cohesion: 0.25
Nodes (7): AdminUsersPage(), EditUserDialogProps, kycOf(), MemberRow, ROLES, STATUSES, UserRow

### Community 171 - "hours.ts"
Cohesion: 0.39
Nodes (7): DAY_LABELS, DAYS, describeClosingDays(), describeDays(), describeOpeningHours(), isDay(), Locale

### Community 172 - "ai-content.ts"
Cohesion: 0.32
Nodes (5): AiTargetTable, generateDescription(), isValidDescription(), KIND, THEMES

### Community 173 - "report-queries.ts"
Cohesion: 0.25
Nodes (4): EvidenceRow, PublicReport, ReportDetailData, ReportHistoryRow

### Community 174 - "support-pages.tsx"
Cohesion: 0.32
Nodes (5): AgentCallsPage(), callDuration(), CallRow, CallStatus, STATUS_LABEL

### Community 175 - "query-helpers.ts"
Cohesion: 0.43
Nodes (6): escapeSearch(), formatDate(), formatDateTime(), isOverdue(), QueryResult, unwrap()

### Community 176 - "news-manager.tsx"
Cohesion: 0.38
Nodes (4): NewsDraft, NewsManager(), newsTransition(), NOW

### Community 177 - "services-manager.tsx"
Cohesion: 0.38
Nodes (4): publicationPatch(), ServiceDialog(), STATUSES, NOW

### Community 178 - "map-editor-page.tsx"
Cohesion: 0.33
Nodes (5): BUILDING_STATUSES, LAYERS, MapEditorPage(), nextSectorCode(), TRANSPORT_STATUSES

### Community 179 - "profile/schema.ts"
Cohesion: 0.38
Nodes (5): phoneSchema, profileDetailsSchema, ProfileDetailsValues, valid, toProfileUpdate()

### Community 180 - "request-queries.ts"
Cohesion: 0.33
Nodes (5): fetchDisplayNames(), RequestComment, RequestDetail, RequestHistory, useRequestDetail()

### Community 181 - "dangers-manager.tsx"
Cohesion: 0.47
Nodes (3): activationPatch(), DangersManager(), SEVERITIES

### Community 182 - "stats.ts"
Cohesion: 0.40
Nodes (4): AggregatedStats, aggregateStats(), CLOSED, ServiceStats

### Community 183 - "login-throttle.ts"
Cohesion: 0.40
Nodes (4): createLoginThrottle(), Entry, loginThrottle, ThrottleOptions

### Community 184 - "guide-provider.tsx"
Cohesion: 0.47
Nodes (5): GuideProvider(), measure(), StepRow, TourRow, useDbTours()

### Community 186 - "chatbot-page.tsx"
Cohesion: 0.60
Nodes (4): ChatbotPage(), Message, nextId(), useKnowledge()

### Community 187 - "newsletter-page.tsx"
Cohesion: 0.40
Nodes (3): Frequency, Subscription, Topic

### Community 210 - "facilities-manager.tsx"
Cohesion: 0.29
Nodes (6): BUILDING_STATUSES, BUILDING_TYPES, FACILITY_TYPES, FacilityDialog(), FacilityValues, isOpeningHours()

### Community 211 - "5. Architecture (frontend)"
Cohesion: 0.33
Nodes (6): 5.1 Routes, 5.2 Hex map specifics, 5.3 Chatbot rules (REQUESTS §4.1), 5.4 Reputation rules, 5.5 Accessibility, voice & guidance, 5. Architecture (frontend)

### Community 219 - "4. Fictional data (10 rows per table)"
Cohesion: 0.50
Nodes (4): 4.1 The city, 4.2 Stable IDs, 4.3 Seed content per table (10 rows each), 4. Fictional data (10 rows per table)

### Community 220 - "18. GETTING HELP"
Cohesion: 0.67
Nodes (3): 18. GETTING HELP, Check These Files First, Run These Commands

## Knowledge Gaps
- **744 isolated node(s):** `$schema`, `typescript`, `jsx-a11y`, `oxc`, `correctness` (+739 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **103 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `.oxlintrc.json`, `dialog.tsx`, `table.tsx`, `admin-page.tsx`, `card.tsx`, `auth-provider.tsx`, `map-page.tsx`, `tabs.tsx`, `locale.tsx`, `gallery-page.tsx`, `theme-provider.tsx`, `auth-context.ts`, `auth-form.tsx`, `home-page.tsx`, `site-pages.tsx`, `agenda-page.tsx`, `three-viewer.tsx`, `aurora-shader.tsx`, `application-layout.tsx`, `theme-context.ts`, `accordion.tsx`, `tooltip.tsx`, `kit-page.tsx`, `async-button.tsx`, `avatar.tsx`, `bento-grid.tsx`, `video-player.tsx`, `auth-shell.tsx`, `assistant-page.tsx`, `providers.tsx`, `text-reveal.tsx`, `confirm-dialog.tsx`, `home-interactive-background.tsx`, `image-parallax-background.tsx`, `root-layout.tsx`, `site-header.tsx`, `empty-state.tsx`, `reveal.tsx`, `storage-uploader.tsx`, `badge.tsx`, `breadcrumb.tsx`, `button.tsx`, `progress.tsx`, `switch.tsx`, `notifications-menu.tsx`, `animations-page.tsx`, `home-variants-page.tsx`, `video-page.tsx`, `accessibility-context.ts`, `animated-gradient-text.tsx`, `hex-map.tsx`, `admin-extra-pages.tsx`, `users-page.tsx`, `support-pages.tsx`, `news-manager.tsx`, `services-manager.tsx`, `map-editor-page.tsx`, `dangers-manager.tsx`, `guide-provider.tsx`, `chatbot-page.tsx`, `dangers-pages.tsx`, `guide-context.ts`, `report-detail.tsx`, `reports-lists.tsx`, `request-detail.tsx`, `voice-context.ts`, `data-state.tsx`, `agent-team-page.tsx`, `map/map-page.tsx`, `signup-form.tsx`, `verification-page.tsx`, `report-new-page.tsx`, `use-dictation.ts`, `voice-provider.tsx`, `facilities-manager.tsx`, `service-detail-page.tsx`, `lightbox.tsx`, `slider.tsx`, `transition-link.tsx`, `request-new-page.tsx`, `login-page.tsx`, `news-page.tsx`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Why does `3. Cahier des charges par entrée de la Todo List` connect `3. Cahier des charges par entrée de la Todo List` to `REQUESTS.md`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `Nova Terra — Master Plan` connect `Nova Terra — Master Plan` to `REQUESTS.md`, `5. Architecture (frontend)`, `3. Database design`, `9. Implementation roadmap (ordered by REQUESTS "priorité de réalisation")`, `4. Fictional data (10 rows per table)`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `$schema`, `typescript`, `jsx-a11y` to the rest of the system?**
  _744 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._
- **Should `Component UI Library` be split into smaller, more focused modules?**
  _Cohesion score 0.04927536231884058 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._