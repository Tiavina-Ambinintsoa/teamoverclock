# Vitest Setup Complete ✅

**Date**: 2026-10-02  
**Status**: Ready for use  
**Test Coverage**: 25/25 tests passing

---

## What's Installed

### Packages
- ✅ **vitest** ^5.0.3 - Fast unit test framework
- ✅ **@testing-library/react** ^16.3.3 - React component testing
- ✅ **@testing-library/user-event** ^14.6.7 - User interaction simulation
- ✅ **@testing-library/jest-dom** ^7.0.1 - DOM matchers
- ✅ **@vitest/ui** ^5.0.3 - Interactive test UI
- ✅ **jsdom** ^30.1.1 - DOM environment for tests

### Configuration Files
- ✅ **vitest.config.ts** - Vitest configuration with path aliases
- ✅ **vitest.setup.ts** - Test environment setup (mocks, globals)

### Test Scripts
```bash
npm run test           # Run all tests
npm run test:watch    # Run in watch mode (auto-rerun on changes)
npm run test:ui       # Open interactive test UI (browser)
npm run test:coverage # Generate coverage report
```

---

## Example Tests Included

### 1. **Utility Function Tests** (`src/lib/utils.test.ts`)
Tests for the `cn()` class name merge utility
- ✅ Handles multiple classes
- ✅ Handles conditional classes
- ✅ Handles arrays and nulls

### 2. **Format Function Tests** (`src/lib/format.test.ts`)
Tests for date and currency formatting
- ✅ formatDate() - Date formatting
- ✅ formatAriary() - Currency formatting
- ✅ formatDuration() - Duration formatting (HH:MM:SS)

### 3. **Component Tests** (`src/components/ui/button.test.tsx`)
Tests for the Button component
- ✅ Renders with correct props
- ✅ Handles click events
- ✅ Respects disabled state
- ✅ Supports different variants and sizes

---

## Quick Start

### Run Tests
```bash
npm run test
```

**Output:**
```
 Test Files  3 passed (3)
      Tests  25 passed (25)
```

### Watch Mode (Auto-rerun)
```bash
npm run test:watch
```

Then edit a test file - it will rerun automatically.

### Interactive UI
```bash
npm run test:ui
```

Opens browser at `http://localhost:51204/__vitest__/` with interactive test explorer.

### Coverage Report
```bash
npm run test:coverage
```

Generates `coverage/` directory with HTML report.

---

## Writing Your First Test

### Template 1: Utility Function Test
```typescript
// src/lib/my-utility.test.ts
import { describe, it, expect } from "vitest"
import { myFunction } from "./my-utility"

describe("myFunction", () => {
  it("should return expected result", () => {
    const result = myFunction("input")
    expect(result).toBe("expected output")
  })
})
```

### Template 2: Component Test
```typescript
// src/components/my-component.test.tsx
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MyComponent } from "./my-component"

describe("MyComponent", () => {
  it("should render with children", () => {
    render(<MyComponent>Test</MyComponent>)
    expect(screen.getByText("Test")).toBeInTheDocument()
  })

  it("should handle clicks", async () => {
    const onClick = vi.fn()
    render(<MyComponent onClick={onClick} />)
    
    await userEvent.click(screen.getByRole("button"))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
```

### Template 3: Hook Test
```typescript
// src/features/my-feature/use-my-hook.test.ts
import { describe, it, expect } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useMyHook } from "./use-my-hook"

describe("useMyHook", () => {
  it("should return initial state", () => {
    const { result } = renderHook(() => useMyHook())
    expect(result.current.value).toBe("initial")
  })
})
```

---

## Key Commands

| Command | Purpose |
|---------|---------|
| `npm run test` | Run all tests once |
| `npm run test -- src/lib/utils.test.ts` | Run specific file |
| `npm run test -- --grep "button"` | Run tests matching pattern |
| `npm run test:watch` | Run in watch mode |
| `npm run test:ui` | Open interactive UI |
| `npm run test:coverage` | Generate coverage report |

---

## Test File Naming
- Place tests next to source code
- Use `.test.ts` or `.test.tsx` extension
- Tests are automatically discovered

Examples:
```
src/lib/utils.ts           → src/lib/utils.test.ts
src/components/Button.tsx  → src/components/Button.test.tsx
src/features/items/hooks.ts → src/features/items/hooks.test.ts
```

---

## Useful Testing Library Matchers

```typescript
// Existence
expect(element).toBeInTheDocument()
expect(element).toBeVisible()
expect(element).toBeDisabled()

// Text & Content
expect(element).toHaveTextContent("text")
expect(element).toHaveValue("value")

// Attributes & Classes
expect(element).toHaveClass("active")
expect(element).toHaveAttribute("href", "/home")

// Functions
expect(fn).toHaveBeenCalled()
expect(fn).toHaveBeenCalledWith(arg)
expect(fn).toHaveBeenCalledOnce()

// DOM Queries
screen.getByRole("button")
screen.getByLabelText(/email/i)
screen.getByText(/welcome/i)
screen.queryByText("not found") // Returns null if not found
```

---

## Debugging Tests

### Run single test file
```bash
npm run test -- src/lib/utils.test.ts --reporter=verbose
```

### Run with UI
```bash
npm run test:ui
```
Then click on failed tests to see details.

### Add console logs
```typescript
it("should work", () => {
  const result = myFunction()
  console.log("Result:", result) // Shows in test output
  expect(result).toBe("expected")
})
```

---

## Integration with Ruleset

The testing requirements from **RULESET.md** are now enforceable:

✅ **Section 11: Testing** - Unit tests with Vitest  
✅ **Section 14: Commit Checklist** - Run tests before committing  
✅ **Section 15.7-15.10** - Test new functionality, skip styling tests

---

## Example Test Output

```
 ✓ src/lib/utils.test.ts (4)
   ✓ cn utility (4)
     ✓ should merge class names correctly
     ✓ should handle conditional classes
     ✓ should handle array of classes
     ✓ should handle empty classes

 ✓ src/lib/format.test.ts (12)
   ✓ format utilities (12)
     ✓ formatDate (4)
     ✓ formatAriary (3)
     ✓ formatDuration (5)

 ✓ src/components/ui/button.test.tsx (8)
   ✓ Button component (8)
     ✓ should render button with text
     ✓ should handle click events
     ✓ should be disabled when disabled prop is true
     ... and 5 more

Test Files  3 passed (3)
Tests      25 passed (25)
```

---

## Next Steps

1. **Start writing tests for new features**
   - For every new function/hook, add a `.test.ts` file
   - For every new component, add a `.test.tsx` file
   - Use templates above as starting points

2. **Run tests before committing**
   - `npm run test` must pass
   - Update RULESET.md section 14 checklist

3. **Monitor coverage**
   - `npm run test:coverage` generates HTML report
   - Aim for >80% coverage on core logic

4. **Explore advanced patterns**
   - See `tests/TEST_TEMPLATES.md` for comprehensive examples
   - Mocking Supabase, testing async hooks, form testing, etc.

---

## Troubleshooting

### Tests not running?
```bash
npm install
npm run test
```

### Port already in use (for --ui)?
```bash
npm run test:ui -- --port 9000
```

### Need to debug?
```bash
npm run test:ui
# Opens browser - click on failed tests to debug
```

### TypeScript errors in tests?
```bash
npm run typecheck
# Check for type issues
```

---

## Resources

- **Vitest Docs**: https://vitest.dev
- **Testing Library Docs**: https://testing-library.com
- **Jest-DOM Matchers**: https://github.com/testing-library/jest-dom
- **Templates**: See `tests/TEST_TEMPLATES.md`

---

## Summary

Vitest is now fully configured and ready to use:
- ✅ 25 tests passing
- ✅ All dependencies installed
- ✅ Config files set up
- ✅ Example tests included
- ✅ Integrated with RULESET.md
- ✅ npm scripts ready

**Start testing!** 🚀
