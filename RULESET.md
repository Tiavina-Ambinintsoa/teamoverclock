# AI Development Ruleset for Webcup 2026 Starter

**Purpose**: Ensure consistent, scoped development that leverages existing infrastructure and avoids reinventing the wheel.

---

## 1. CORE CONSTRAINTS

### 1.1 Technology Stack (Non-Negotiable)
- **Framework**: React 19.3 with TypeScript 7.0
- **Build Tool**: Vite 8.3 with @tailwindcss/vite
- **Styling**: TailwindCSS 4.3 + shadcn/ui components
- **State Management**: React Query (@tanstack/react-query 5.103)
- **Routing**: react-router 8.4 with client-side rendering
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Forms**: react-hook-form 7.88 + Zod 4.6 (schema validation)
- **Node Version**: >=20.19.0 or >=22.12.0

### 1.2 Code Quality Standards
- **Type Safety**: `strict: true` - no `any` types allowed
- **Linting**: oxlint 1.83 - run `npm run lint` before commits
- **Type Checking**: TypeScript strict mode - no unused vars/params
- **Testing**: Playwright e2e tests in `playwright.config.ts`

### 1.3 Project Scope Boundaries
- ✅ **DO**: Create pages, components, hooks, utilities that fit the existing structure
- ❌ **DON'T**: 
  - Add new npm packages without explicit approval
  - Create custom CSS/SCSS (use Tailwind only)
  - Bypass Supabase for data persistence
  - Create new authentication systems (use existing auth-provider)

---

## 2. FILE STRUCTURE & ORGANIZATION

### 2.1 Directory Mapping

```
src/
├── app/                    # Application bootstrap
│   ├── providers.tsx       # Root providers: AuthProvider, ThemeProvider, QueryClient
│   └── router.tsx          # React Router configuration
│
├── components/             # Reusable UI components
│   ├── ui/                 # shadcn/ui components (Button, Card, Input, etc.)
│   ├── animated/           # Animation effects (GradientText, Aurora, Meteor, etc.)
│   ├── interactive/        # User interactions (AsyncButton, LikeButton, etc.)
│   ├── charts/             # Data visualization (BarChart, DonutChart, Sparkline)
│   ├── layout/             # Layout wrappers (ApplicationLayout, RootLayout, SiteHeader)
│   ├── three/              # Three.js components (ThreeViewer)
│   ├── home-interactive-background.tsx
│   ├── theme-provider.tsx  # Theme context & provider
│   ├── storage-uploader.tsx
│   └── [others]
│
├── features/               # Feature modules (domain-specific)
│   ├── auth/               # Authentication feature
│   │   ├── auth-provider.tsx    # AppUser, AuthContext, auth logic
│   │   ├── auth-form.tsx
│   │   ├── login-page.tsx
│   │   ├── register-page.tsx
│   │   └── require-auth.tsx     # ProtectedRoute wrapper
│   ├── admin/              # Admin-only features
│   │   └── admin-page.tsx
│   ├── items/              # CRUD example (notes)
│   │   ├── item-form.tsx
│   │   ├── items-page.tsx
│   │   └── useItems() hook
│   └── notifications/      # Toast/notification system (Sonner)
│
├── pages/                  # Top-level route pages
│   ├── home-page.tsx
│   ├── app/                # Authenticated routes
│   │   ├── dashboard-page.tsx
│   │   ├── assistant-page.tsx
│   │   └── settings-page.tsx
│   ├── templates/          # Template examples
│   │   ├── animations-page.tsx
│   │   ├── gallery-page.tsx
│   │   ├── map-page.tsx
│   │   ├── three-d-page.tsx
│   │   └── [template-pages]
│   └── site-pages.tsx      # Site info pages
│
├── lib/                    # Utilities & helpers
│   ├── supabase.ts         # Supabase client singleton
│   ├── env.ts              # Environment variables (VITE_*)
│   ├── auth-context.ts     # AppUser, AuthState types
│   ├── http.ts             # Fetch wrapper with error handling
│   ├── storage.ts          # localStorage wrapper (safeStorage)
│   ├── format.ts           # Date/number formatting
│   ├── locale.tsx          # i18n context
│   ├── utils.ts            # General utilities (cn(), etc.)
│   ├── morphisms.ts        # Design tokens
│   ├── presets.ts          # Configuration presets
│   └── [helpers]
│
├── main.tsx                # Entry point
└── vite-env.d.ts           # Vite type declarations

public/                      # Static assets
```

### 2.2 Path Alias
- `@/*` → `src/*` (configured in tsconfig.app.json)
- **Always use**: `import { Button } from "@/components/ui/button"`
- **Never use**: `import { Button } from "../../../components/ui/button"`

---

## 3. AVAILABLE COMPONENTS & HOOKS

### 3.1 UI Components (shadcn/ui)
All components are in `src/components/ui/`. Import as:
```typescript
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
// ... and 20+ more
```

**Available**: Accordion, Avatar, Badge, Bento Grid, Breadcrumb, Button, Card, Checkbox, Dialog, Input, Label, Progress, Select, Separator, Skeleton, Slider, Sonner (Toasts), Switch, Table, Tabs, Textarea, Tooltip

### 3.2 Custom Components
- **Animations**: `AnimatedGradientText`, `AuroraShader`, `MeteorField`, `TextReveal`, `Marquee`, `BorderBeam`, `TransitionLink`
- **Interactive**: `AsyncButton`, `LikeButton`, `StorageUploader`
- **Charts**: `BarChart`, `DonutChart`, `Sparkline`
- **Layout**: `ApplicationLayout`, `RootLayout`, `SiteHeader`, `SiteFooter`, `Container`
- **Utilities**: `PageLoader`, `Confirm Dialog`, `EmptyState`, `Pagination`, `Lightbox`, `VideoPlayer`

### 3.3 Authentication & Authorization
```typescript
import { useAuth } from "@/features/auth/auth-context"  // Hook for current user
import { RequireAuth } from "@/features/auth/require-auth"  // Wrapper for protected routes
import { RequireAdmin } from "@/features/auth/require-admin"  // Wrapper for admin-only routes
```

**AppUser Type**:
```typescript
interface AppUser {
  id: string
  email: string
  displayName: string
  role: "admin" | "member"
  isAdmin: boolean
  isDemo: boolean  // True for demo mode
}
```

### 3.4 Custom Hooks (Available)
- `useAuth()` - Get current user & auth state
- `useItems()` / `useItem()` / `useCreateItem()` / `useDeleteItem()` - CRUD for items
- `useLocale()` - Get/set language (fr/en)
- `useTheme()` - Get/set theme (light/dark) + morphism/typography presets

### 3.5 Query & Data Fetching
```typescript
import { useQuery, useMutation } from "@tanstack/react-query"
```

All data operations use React Query with automatic caching, refetching, and error handling.

---

## 4. SUPABASE INTEGRATION

### 4.1 Supabase Client Setup
```typescript
import { supabase } from "@/lib/supabase"
```

**Already configured**: Auth, PostgreSQL, Row-Level Security (RLS), Storage buckets, JWT

### 4.2 Database Tables (Available)
From the knowledge graph, standard tables include:
- `profiles` - User profiles linked to auth.users
- `items` - CRUD example table
- `contact_messages` - Contact form submissions
- And others (check Supabase dashboard)

### 4.3 Using Supabase in Components
```typescript
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/features/auth/auth-context"

export function MyComponent() {
  const { user } = useAuth()
  
  // Fetch data
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("user_id", user?.id)
  
  // Create
  await supabase
    .from("items")
    .insert({ title, user_id: user?.id })
  
  // Update
  await supabase
    .from("items")
    .update({ title })
    .eq("id", itemId)
  
  // Delete
  await supabase
    .from("items")
    .delete()
    .eq("id", itemId)
}
```

### 4.4 Row-Level Security (RLS)
- **NEVER** bypass RLS - always use authenticated queries
- **NEVER** expose service_role keys in frontend code
- Users can only access/modify their own data (enforced by RLS policies)

### 4.5 Environment Variables
```env
VITE_SUPABASE_URL=<your-url>
VITE_SUPABASE_ANON_KEY=<your-key>
VITE_OPENROUTER_API_KEY=<optional>
VITE_BASE=/  # If deployed to subdirectory
```

Access in code via:
```typescript
import { env } from "@/lib/env"
console.log(env.VITE_SUPABASE_URL)
```

---

## 5. FORM & VALIDATION PATTERNS

### 5.1 Create Forms with react-hook-form + Zod
```typescript
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export function MyForm() {
  const form = useForm({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: z.infer<typeof schema>) {
    // Use data - types are automatically inferred
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Use form.register("fieldName") */}
    </form>
  )
}
```

**Why this pattern?**
- Type-safe: schema is the single source of truth
- Automatic validation
- Built-in error messages
- Already installed & used everywhere

---

## 6. CREATING NEW PAGES

### 6.1 Page Template
```typescript
// src/pages/my-new-page.tsx
import { useAuth } from "@/features/auth/auth-context"
import { PageHeader } from "@/components/page-header"
import { PageLoader } from "@/components/page-loader"

export function MyNewPage() {
  const { user } = useAuth()
  
  if (!user) {
    return <PageLoader />
  }

  return (
    <div className="container py-8">
      <PageHeader title="My New Page" />
      {/* Content here */}
    </div>
  )
}
```

### 6.2 Register in Router
Edit `src/app/router.tsx`:
```typescript
{
  path: "/my-new-page",
  element: <MyNewPage />,
  // or if authenticated-only:
  element: <RequireAuth><MyNewPage /></RequireAuth>,
}
```

### 6.3 Styling
- **ONLY use TailwindCSS classes** - no inline `<style>` tags
- **Use existing color tokens** from `src/lib/morphisms.ts`
- **Use Tailwind components**: `flex`, `grid`, `gap-4`, `text-lg`, etc.

Example:
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <Card className="bg-white dark:bg-slate-900">
    <CardHeader>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
        My Card
      </h2>
    </CardHeader>
  </Card>
</div>
```

---

## 7. CREATING NEW COMPONENTS

### 7.1 Component Structure
```typescript
// src/components/my-component.tsx
import { type ReactNode } from "react"

export interface MyComponentProps {
  title: string
  children?: ReactNode
  variant?: "primary" | "secondary"
}

export function MyComponent({ title, children, variant = "primary" }: MyComponentProps) {
  return (
    <div className={`p-4 rounded ${variant === "primary" ? "bg-blue-500" : "bg-gray-500"}`}>
      <h3>{title}</h3>
      {children}
    </div>
  )
}
```

### 7.2 Where to Place Components
- **Reusable UI components** → `src/components/ui/` (if missing, create here)
- **Domain-specific** → `src/features/[feature-name]/` (e.g., `src/features/items/ItemForm.tsx`)
- **One-off page components** → `src/pages/` (in same file as page)
- **Animations/effects** → `src/components/animated/`
- **Layout wrappers** → `src/components/layout/`

### 7.3 Props Pattern
- Always define a `Props` interface
- Export the interface for external type checking
- Use `type ReactNode` for children
- Prefer destructuring in function signature

---

## 8. AUTHENTICATION PATTERNS

### 8.1 Protected Routes
```typescript
import { RequireAuth } from "@/features/auth/require-auth"

// In router.tsx
{
  path: "/dashboard",
  element: <RequireAuth><DashboardPage /></RequireAuth>,
}
```

### 8.2 Admin-Only Routes
```typescript
import { RequireAdmin } from "@/features/auth/require-admin"

{
  path: "/admin",
  element: <RequireAdmin><AdminPage /></RequireAdmin>,
}
```

### 8.3 Getting Current User
```typescript
const { user, isLoading } = useAuth()

if (isLoading) return <PageLoader />
if (!user) return <NotAuthorizedPage />

return <div>Welcome, {user.displayName}!</div>
```

### 8.4 Demo Mode
- Demo users have `user.isDemo = true`
- Demo data is stored in localStorage (key: `webcup:local-user`)
- Perfect for testing without backend

---

## 9. DATA FETCHING & MUTATIONS

### 9.1 Query Data (Read)
```typescript
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"

export function MyComponent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["items", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("user_id", userId)
      
      if (error) throw error
      return data
    },
  })

  if (isLoading) return <Skeleton />
  if (error) return <div>Error: {error.message}</div>
  
  return <div>{data?.map(item => ...)}</div>
}
```

### 9.2 Mutate Data (Create/Update/Delete)
```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query"

export function DeleteButton({ itemId }: { itemId: string }) {
  const queryClient = useQueryClient()
  
  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("items")
        .delete()
        .eq("id", itemId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] })
      toast.success("Item deleted!")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return <Button onClick={() => mutation.mutate()}>Delete</Button>
}
```

### 9.3 Existing Hooks for CRUD Items
```typescript
import {
  useItems,
  useItem,
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
} from "@/features/items"

// List items
const { data: items } = useItems(userId)

// Get one item
const { data: item } = useItem(itemId)

// Create
const create = useCreateItem()
await create.mutateAsync({ title: "New item" })

// Update
const update = useUpdateItem()
await update.mutateAsync({ id: itemId, title: "Updated" })

// Delete
const del = useDeleteItem()
await del.mutateAsync(itemId)
```

---

## 10. STYLING GUIDELINES

### 10.1 Tailwind Classes Only
- ✅ `<div className="flex gap-4 p-6 bg-white rounded-lg">`
- ❌ `<div style={{ display: "flex", gap: "1rem" }}>`
- ❌ `<style>.my-class { ... }</style>`

### 10.2 Dark Mode Support
```typescript
<div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
  Content
</div>
```

### 10.3 Responsive Design
```typescript
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
  {/* Auto-responsive */}
</div>
```

### 10.4 Color Tokens
Use predefined colors from Tailwind and custom morphisms:
```typescript
import { morphisms } from "@/lib/morphisms"
import { typographyPresets } from "@/lib/typography-presets"
```

Available colors: `slate`, `gray`, `zinc`, `neutral`, `stone`, `red`, `orange`, `amber`, `yellow`, `lime`, `green`, `emerald`, `teal`, `cyan`, `sky`, `blue`, `indigo`, `violet`, `purple`, `fuchsia`, `pink`, `rose`

---

## 11. TESTING

### 11.1 Unit Tests for New Functionality
**RULE**: Every new testable feature/function MUST have unit tests.
**EXCEPTION**: Do NOT write tests for styles, design, or visual-only changes.

#### What Needs Unit Tests?
✅ **DO TEST**:
- Utility functions (`src/lib/*.ts`)
- Custom hooks (`useAuth`, `useItems`, etc.)
- Data transformation logic
- Validation functions
- Form schemas (Zod)
- API/Supabase interactions (mocked)
- Business logic in components

❌ **DON'T TEST**:
- Styling/TailwindCSS classes
- Component render (if no logic)
- Design-only changes
- Visual effects or animations (use E2E for these)
- Copy/text content

#### Setting Up Unit Tests
Project includes Playwright for E2E. For unit tests, use **Vitest** (lightweight, Vite-native):

1. **Install Vitest** (if not already):
```bash
npm install -D vitest @testing-library/react @testing-library/user-event
```

2. **Create test file** alongside the code:
```
src/lib/format.ts          → src/lib/format.test.ts
src/features/items/hooks.ts → src/features/items/hooks.test.ts
```

3. **Test structure**:
```typescript
// src/lib/format.test.ts
import { describe, it, expect } from "vitest"
import { formatDate, formatNumber } from "./format"

describe("format utilities", () => {
  it("should format date correctly", () => {
    const result = formatDate(new Date("2026-10-02"))
    expect(result).toBe("Oct 2, 2026")
  })

  it("should format large numbers with commas", () => {
    expect(formatNumber(1000)).toBe("1,000")
    expect(formatNumber(1000000)).toBe("1,000,000")
  })
})
```

#### Testing Custom Hooks
```typescript
// src/features/items/useItems.test.ts
import { describe, it, expect, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useItems } from "./useItems"

describe("useItems hook", () => {
  it("should fetch items for a user", async () => {
    const { result } = renderHook(() => useItems("user-123"))
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    
    expect(result.current.data).toBeDefined()
    expect(Array.isArray(result.current.data)).toBe(true)
  })

  it("should handle errors gracefully", async () => {
    const { result } = renderHook(() => useItems("invalid-user"))
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    
    expect(result.current.error).toBeDefined()
  })
})
```

#### Testing Utility Functions
```typescript
// src/lib/utils.test.ts
import { describe, it, expect } from "vitest"
import { cn, delay } from "./utils"

describe("cn utility", () => {
  it("should merge class names correctly", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2")
    expect(cn("px-4", false && "py-2")).toBe("px-4")
  })
})

describe("delay utility", () => {
  it("should delay execution", async () => {
    const start = Date.now()
    await delay(100)
    const elapsed = Date.now() - start
    
    expect(elapsed).toBeGreaterThanOrEqual(100)
    expect(elapsed).toBeLessThan(150)
  })
})
```

#### Testing Zod Schemas
```typescript
// src/features/auth/schema.test.ts
import { describe, it, expect } from "vitest"
import { loginSchema } from "./schema"

describe("loginSchema", () => {
  it("should validate correct credentials", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "SecurePassword123",
    })
    
    expect(result.success).toBe(true)
  })

  it("should reject invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "SecurePassword123",
    })
    
    expect(result.success).toBe(false)
  })

  it("should reject short password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "short",
    })
    
    expect(result.success).toBe(false)
  })
})
```

#### Testing Supabase Integration (Mocked)
```typescript
// src/lib/supabase.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { supabase } from "./supabase"

// Mock Supabase
vi.mock("./supabase", () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      signUp: vi.fn(),
      signIn: vi.fn(),
    },
  },
}))

describe("supabase interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch items from database", async () => {
    const mockData = [
      { id: "1", title: "Item 1" },
      { id: "2", title: "Item 2" },
    ]
    
    // Mock the query
    supabase.from.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    })
    
    const result = await supabase.from("items").select()
    
    expect(result.data).toEqual(mockData)
    expect(result.error).toBeNull()
  })
})
```

### 11.2 E2E Tests with Playwright
```bash
npm run test:e2e
```

Tests go in `tests/` directory. Use E2E for:
- User workflows (login → create → view → delete)
- Page navigation
- Form submissions
- Authentication flows
- Integration between multiple features

Example:
```typescript
import { test, expect } from "@playwright/test"

test("user can create and delete an item", async ({ page }) => {
  await page.goto("http://localhost:5173/login")
  await page.fill('input[name="email"]', "test@example.com")
  await page.fill('input[name="password"]', "password")
  await page.click('button:has-text("Sign in")')
  
  // Navigate to items page
  await page.goto("http://localhost:5173/app/items")
  
  // Create item
  await page.click('button:has-text("New Item")')
  await page.fill('input[name="title"]', "Test Item")
  await page.click('button:has-text("Create")')
  
  // Verify item exists
  await expect(page.locator("text=Test Item")).toBeVisible()
  
  // Delete item
  await page.click('button[aria-label="Delete"]')
  await page.click('button:has-text("Confirm")')
  
  // Verify item is deleted
  await expect(page.locator("text=Test Item")).not.toBeVisible()
})
```

### 11.3 Running Tests
```bash
# Run unit tests (Vitest)
npm run test

# Run unit tests in watch mode
npm run test -- --watch

# Run E2E tests
npm run test:e2e

# Run both
npm run test && npm run test:e2e
```

### 11.4 Running Linter
```bash
npm run lint
```

Fixes linting issues before committing.

### 11.5 Test Coverage
Aim for **>80% coverage** on:
- All utility functions
- Custom hooks
- API/data layer code
- Validation logic

Don't need high coverage on:
- Component rendering (covered by E2E)
- UI/visual code
- Third-party library code

---

## 12. DEPLOYMENT

### 12.1 Build
```bash
npm run build
```

Outputs to `dist/`. TypeScript checked, code split for caching (React, Supabase bundles).

### 12.2 Preview
```bash
npm run preview --host
```

Test production build locally.

### 12.3 HODI Deployment
See `docs/DEPLOIEMENT-HODI.md` for deployment to HODI hosting.

**Key**: If served from subdirectory, set `VITE_BASE=/path/` in `.env.local`.

---

## 13. NAMING CONVENTIONS

### 13.1 Files & Folders
- **PascalCase** for components: `MyComponent.tsx`
- **kebab-case** for non-components: `my-utility.ts`
- **camelCase** for functions, variables, hooks

### 13.2 Components
- Export as named export: `export function MyComponent() {}`
- Include Props interface: `export interface MyComponentProps {}`

### 13.3 Routes
- Use lowercase with hyphens: `/my-new-page`, `/admin/user-management`
- Private routes prefixed with `/app/`: `/app/dashboard`

---

## 14. COMMIT CHECKLIST

Before committing:
- [ ] Run `npm run lint` - fix all linting issues
- [ ] Run `npm run typecheck` - no TypeScript errors
- [ ] **NEW FUNCTIONALITY**: Added unit tests in `*.test.ts` file
- [ ] **NOT styling/design-only**: No unit tests needed
- [ ] Run `npm run test` - all unit tests pass
- [ ] Tested in browser at `http://localhost:5173`
- [ ] No console errors or warnings
- [ ] Only used already-installed packages
- [ ] Only used existing components/hooks
- [ ] Followed naming conventions
- [ ] Updated relevant documentation if needed
- [ ] For major features: added E2E test to `tests/` directory

---

## 15. WHAT TO DO WHEN...

### 15.1 I need a new UI element not in shadcn/ui
**Option 1**: Check if it's a custom component in `src/components/`
**Option 2**: Create a new component in `src/components/ui/` following shadcn pattern
**Option 3**: Ask before adding external packages

### 15.2 I need to add a new table to Supabase
1. Create table in Supabase dashboard
2. Enable RLS and add policies
3. Document in code comments
4. Create types in `src/lib/types.ts`

### 15.3 I need a new hook
- If feature-specific → `src/features/[feature]/use*.ts`
- If general utility → `src/lib/use*.ts`
- Always use React Query for async data

### 15.4 I need authentication
- Use existing `AuthProvider` and `useAuth()` hook
- Protect routes with `<RequireAuth>` wrapper
- Never create custom auth logic

### 15.5 I need to store data
- Use Supabase for persistent data
- Use localStorage only for UI state (theme, language)
- Use React Query for caching

### 15.6 I need to add a new package
**STOP** - Ask first. Check if functionality exists:
- UI: Check `src/components/ui/` and `src/components/`
- Hooks: Check `src/lib/` and `src/features/`
- Utilities: Check `src/lib/utils.ts` and related files

### 15.7 I added a new utility function
✅ **REQUIRED**: Create `src/lib/my-util.test.ts` with tests for:
- Normal cases (happy path)
- Edge cases (empty input, null, etc.)
- Error cases (invalid input)

Example: If you add `calculateDiscount(price, percentage)`, test:
- `calculateDiscount(100, 10)` → `90`
- `calculateDiscount(0, 10)` → `0`
- `calculateDiscount(-100, 10)` → error or validation

### 15.8 I added a custom hook
✅ **REQUIRED**: Create `src/features/[feature]/my-hook.test.ts` with tests for:
- Hook returns expected data
- Hook handles loading states
- Hook handles error states
- Hook triggers side effects correctly

See section 11.1 for examples.

### 15.9 I added a new API/database function
✅ **REQUIRED**: Create tests that mock Supabase and verify:
- Correct query is sent
- Data is returned/transformed correctly
- Errors are handled

See section 11.1 "Testing Supabase Integration" for examples.

### 15.10 I added styles or updated CSS classes
❌ **NO UNIT TESTS NEEDED** - Styling changes are covered by E2E/visual testing
⚠️ **DO**: Run `npm run test:e2e` to verify visual/layout didn't break
⚠️ **DO**: Test in browser at multiple breakpoints (mobile, tablet, desktop)

---

## 16. QUICK REFERENCE

### Import Paths
```typescript
// Components
import { Button } from "@/components/ui/button"
import { MyFeature } from "@/features/items/my-feature"

// Hooks
import { useAuth } from "@/features/auth/auth-context"
import { useQuery } from "@tanstack/react-query"

// Utilities
import { supabase } from "@/lib/supabase"
import { env } from "@/lib/env"
import { cn } from "@/lib/utils"

// Types
import type { AppUser } from "@/features/auth/auth-context"

// Testing (in .test.ts files)
import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { renderHook } from "@testing-library/react"
```

### Common Patterns
```typescript
// Protected page
export function MyPage() {
  const { user } = useAuth()
  if (!user) return null
  return <div>Content</div>
}

// Data fetching
const { data, isLoading } = useQuery({
  queryKey: ["items"],
  queryFn: () => supabase.from("items").select(),
})

// Form with validation
const form = useForm({
  resolver: zodResolver(schema),
})

// Mutation with toast
const mutation = useMutation({
  mutationFn: async (data) => { /* ... */ },
  onSuccess: () => toast.success("Success!"),
  onError: (err) => toast.error(err.message),
})
```

### Common Test Patterns
```typescript
// Test a utility function
describe("myUtil", () => {
  it("should do something", () => {
    const result = myUtil(input)
    expect(result).toBe(expectedOutput)
  })
})

// Test a hook
describe("useMyHook", () => {
  it("should return data", async () => {
    const { result } = renderHook(() => useMyHook())
    await waitFor(() => expect(result.current.data).toBeDefined())
  })
})

// Test with mocked data
describe("API call", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  it("should fetch and process data", async () => {
    const mockData = [{ id: "1", name: "Test" }]
    vi.mock("./api", () => ({
      fetchData: vi.fn().mockResolvedValue(mockData),
    }))
    
    const result = await fetchData()
    expect(result).toEqual(mockData)
  })
})
```

---

## 17. KNOWLEDGE GRAPH REFERENCE

The `/graphify` command has built a knowledge graph of this project. Key insights:
- **787 nodes** across code, docs, and configuration
- **God nodes**: `react`, `compilerOptions`, `Component UI Library`, `Animation System`
- **134 communities** organized by feature/concern
- **Suggestions**: Check GRAPH_REPORT.md for surprising connections and weakly-connected modules

Use the graph to understand project structure: `graphify-out/graph.html`

---

## 18. GETTING HELP

### Check These Files First
- `docs/README.md` - Project overview
- `docs/TECHNOLOGIES.md` - Tech stack details
- `docs/ANIMATIONS-ET-COMPOSANTS.md` - Component documentation
- `src/features/items/` - CRUD example code
- Existing components in `src/components/` - Copy patterns

### Run These Commands
```bash
npm run dev          # Start dev server
npm run lint         # Check code quality
npm run typecheck    # Check TypeScript
npm run build        # Build for production
npm run test:e2e     # Run e2e tests
```

---

**Last Updated**: 2026-10-02  
**Graph Updated**: 2026-10-02  
**Maintained By**: AI Development Team
