# Test Templates & Examples

Use these templates as a starting point for writing tests in your project.

## Quick Start

```bash
npm run test           # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:ui       # Open interactive test UI
npm run test:coverage # Generate coverage report
```

---

## Template 1: Testing Utility Functions

**File**: `src/lib/my-utility.test.ts`

```typescript
import { describe, it, expect } from "vitest"
import { myFunction } from "./my-utility"

describe("myFunction", () => {
  it("should return expected result for valid input", () => {
    const result = myFunction("input")
    expect(result).toBe("expected output")
  })

  it("should handle edge cases", () => {
    expect(myFunction("")).toBe("")
    expect(myFunction(null)).toThrow()
  })

  it("should process multiple values", () => {
    expect(myFunction("a")).toBe("A")
    expect(myFunction("b")).toBe("B")
  })
})
```

**Run**: `npm run test -- src/lib/my-utility.test.ts`

---

## Template 2: Testing React Components

**File**: `src/components/my-component.test.tsx`

```typescript
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MyComponent } from "./my-component"

describe("MyComponent", () => {
  it("should render with children", () => {
    render(<MyComponent>Test Content</MyComponent>)
    expect(screen.getByText("Test Content")).toBeInTheDocument()
  })

  it("should handle click events", async () => {
    const onClick = vi.fn()
    render(<MyComponent onClick={onClick} />)
    
    await userEvent.click(screen.getByRole("button"))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it("should be disabled when disabled prop is true", () => {
    const { container } = render(<MyComponent disabled />)
    expect(container.querySelector("[disabled]")).toBeInTheDocument()
  })
})
```

---

## Template 3: Testing Custom Hooks

**File**: `src/features/my-feature/use-my-hook.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useMyHook } from "./use-my-hook"

describe("useMyHook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return initial state", () => {
    const { result } = renderHook(() => useMyHook())
    expect(result.current.value).toBe("initial")
  })

  it("should update state when function is called", async () => {
    const { result } = renderHook(() => useMyHook())
    
    result.current.setValue("new value")
    
    await waitFor(() => {
      expect(result.current.value).toBe("new value")
    })
  })

  it("should handle async operations", async () => {
    const { result } = renderHook(() => useMyHook())
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    
    expect(result.current.data).toBeDefined()
  })
})
```

---

## Template 4: Testing Forms with React Hook Form + Zod

**File**: `src/features/auth/auth-form.test.tsx`

```typescript
import { describe, it, expect, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AuthForm } from "./auth-form"

describe("AuthForm", () => {
  it("should render form fields", () => {
    render(<AuthForm onSubmit={vi.fn()} />)
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it("should validate required fields", async () => {
    const user = userEvent.setup()
    render(<AuthForm onSubmit={vi.fn()} />)
    
    // Try to submit empty form
    await user.click(screen.getByRole("button", { name: /submit/i }))
    
    // Check for validation errors
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    })
  })

  it("should reject invalid email", async () => {
    const user = userEvent.setup()
    render(<AuthForm onSubmit={vi.fn()} />)
    
    await user.type(screen.getByLabelText(/email/i), "invalid-email")
    await user.click(screen.getByRole("button", { name: /submit/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
    })
  })

  it("should call onSubmit with valid data", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<AuthForm onSubmit={onSubmit} />)
    
    await user.type(screen.getByLabelText(/email/i), "user@example.com")
    await user.type(screen.getByLabelText(/password/i), "ValidPassword123!")
    await user.click(screen.getByRole("button", { name: /submit/i }))
    
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "ValidPassword123!",
      })
    })
  })
})
```

---

## Template 5: Testing Zod Schemas

**File**: `src/features/auth/auth-schema.test.ts`

```typescript
import { describe, it, expect } from "vitest"
import { loginSchema } from "./auth-schema"

describe("loginSchema", () => {
  it("should validate correct credentials", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "SecurePassword123!",
    })
    
    expect(result.success).toBe(true)
  })

  it("should reject invalid email format", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "SecurePassword123!",
    })
    
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].code).toBe("invalid_string")
    }
  })

  it("should reject short passwords", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "short",
    })
    
    expect(result.success).toBe(false)
  })

  it("should reject missing fields", () => {
    const result = loginSchema.safeParse({ email: "user@example.com" })
    expect(result.success).toBe(false)
  })
})
```

---

## Template 6: Testing with Mocked Async Data

**File**: `src/features/items/use-items.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useItems } from "./use-items"

// Mock Supabase
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}))

describe("useItems hook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch items successfully", async () => {
    const mockItems = [
      { id: "1", title: "Item 1", completed: false },
      { id: "2", title: "Item 2", completed: true },
    ]

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: mockItems,
        error: null,
      }),
    } as any)

    const { result } = renderHook(() => useItems("user-123"))

    // Initially loading
    expect(result.current.isLoading).toBe(true)

    // Wait for data
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(mockItems)
    expect(result.current.error).toBeNull()
  })

  it("should handle fetch errors", async () => {
    const mockError = new Error("Database error")

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    } as any)

    const { result } = renderHook(() => useItems("user-123"))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeDefined()
    expect(result.current.data).toBeUndefined()
  })
})
```

---

## Testing Best Practices

### ✅ DO
- Test one thing per test
- Use descriptive test names
- Setup and teardown with `beforeEach`/`afterEach`
- Mock external dependencies (APIs, database)
- Test user behavior, not implementation
- Use `userEvent` for interactions, not `fireEvent`

### ❌ DON'T
- Test framework or library internals
- Test styling/CSS classes extensively
- Make tests too specific/brittle
- Use magic values - use named constants
- Test multiple scenarios in one test

---

## Useful Testing Library Queries

```typescript
// Find elements
screen.getByRole("button", { name: /save/i })
screen.getByLabelText(/email/i)
screen.getByText(/welcome/i)
screen.getByPlaceholderText(/search/i)
screen.queryByText(/not found/) // Returns null if not found

// Assertions
expect(element).toBeInTheDocument()
expect(element).toBeVisible()
expect(element).toBeDisabled()
expect(element).toHaveClass("active")
expect(element).toHaveAttribute("href", "/home")
expect(element).toHaveValue("hello")
expect(screen.getByText(/email/i)).toBeInTheDocument()
```

---

## Common Testing Patterns

### Test a Click Handler
```typescript
const onClick = vi.fn()
render(<Button onClick={onClick}>Click</Button>)
await userEvent.click(screen.getByText("Click"))
expect(onClick).toHaveBeenCalledOnce()
```

### Test Form Input
```typescript
await userEvent.type(screen.getByLabelText(/name/i), "John")
expect(screen.getByLabelText(/name/i)).toHaveValue("John")
```

### Test Async Data Loading
```typescript
await waitFor(() => {
  expect(screen.getByText(/loading/i)).not.toBeInTheDocument()
})
expect(screen.getByText(/data/i)).toBeInTheDocument()
```

### Test Conditional Rendering
```typescript
const { rerender } = render(<Component isVisible={false} />)
expect(screen.queryByText(/content/i)).not.toBeInTheDocument()

rerender(<Component isVisible={true} />)
expect(screen.getByText(/content/i)).toBeInTheDocument()
```

---

## Coverage Goals

```
Statements   : > 80%  (overall coverage)
Branches     : > 75%  (if/else paths)
Functions    : > 80%  (exported functions)
Lines        : > 80%  (actual lines of code)
```

View coverage: `npm run test:coverage`

---

## Debugging Tests

```bash
# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run a specific test file
npm run test -- src/lib/utils.test.ts

# Run tests matching a pattern
npm run test -- --grep "button"

# Open interactive UI
npm run test:ui

# Debug in Node.js inspector
node --inspect-brk ./node_modules/vitest/vitest.mjs
```

---

## Need Help?

- Vitest Docs: https://vitest.dev
- Testing Library Docs: https://testing-library.com
- Check example tests in `src/lib/*.test.ts` and `src/components/ui/*.test.tsx`
