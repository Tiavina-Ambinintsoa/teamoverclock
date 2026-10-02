import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Button } from "./button"

describe("Button component", () => {
  it("should render button with text", () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText("Click me")).toBeInTheDocument()
  })

  it("should handle click events", async () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    await userEvent.click(screen.getByText("Click me"))
    expect(handleClick).toHaveBeenCalledOnce()
  })

  it("should be disabled when disabled prop is true", () => {
    render(<Button disabled>Click me</Button>)
    const button = screen.getByText("Click me") as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it("should not trigger onClick when disabled", async () => {
    const handleClick = vi.fn()
    render(
      <Button disabled onClick={handleClick}>
        Click me
      </Button>
    )

    await userEvent.click(screen.getByText("Click me"))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it("should apply variant classes", () => {
    const { container } = render(
      <Button variant="destructive">Delete</Button>
    )
    const button = container.querySelector("button")
    expect(button).toHaveClass("bg-destructive")
  })

  it("should support different sizes", () => {
    const { container: smContainer } = render(<Button size="sm">Small</Button>)
    const { container: lgContainer } = render(<Button size="lg">Large</Button>)

    expect(smContainer.querySelector("button")).toBeInTheDocument()
    expect(lgContainer.querySelector("button")).toBeInTheDocument()
  })

  it("should render with type='submit' by default", () => {
    render(<Button>Click</Button>)
    const button = screen.getByText("Click") as HTMLButtonElement
    expect(button.type).toBe("submit")
  })

  it("should support type='submit' and type='reset'", () => {
    const { rerender } = render(<Button type="submit">Submit</Button>)
    expect(screen.getByText("Submit")).toHaveAttribute("type", "submit")

    rerender(<Button type="reset">Reset</Button>)
    expect(screen.getByText("Reset")).toHaveAttribute("type", "reset")
  })
})
