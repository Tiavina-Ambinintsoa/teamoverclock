import { render, screen } from "@testing-library/react"
import { act } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  PdfReportDocument,
  PdfReportField,
  PdfReportFields,
  PdfReportRecord,
  PdfReportSection,
  PdfReportValue,
  printPdfDocument,
} from "@/components/pdf-report"
import { LocaleProvider } from "@/lib/locale"

describe("PDF report template", () => {
  afterEach(() => {
    document.body.classList.remove("printing-pdf-report")
    vi.restoreAllMocks()
  })

  it("renders document metadata and nested personal data as readable fields", () => {
    render(
      <LocaleProvider>
        <PdfReportDocument title="Personal report" kind="PERSONAL DATA REPORT" generatedAt="October 4, 2026" owner="Aina">
          <PdfReportSection title="Profile">
            <PdfReportRecord title="Record 1">
              <PdfReportFields>
                <PdfReportField label="Email"><PdfReportValue value="aina@example.test" /></PdfReportField>
                <PdfReportField label="Preferences"><PdfReportValue value={{ language: "French" }} /></PdfReportField>
              </PdfReportFields>
            </PdfReportRecord>
          </PdfReportSection>
        </PdfReportDocument>
      </LocaleProvider>,
    )

    expect(screen.getByRole("heading", { name: "Personal report" })).toBeInTheDocument()
    expect(screen.getByText("October 4, 2026")).toBeInTheDocument()
    expect(screen.getByText("aina@example.test")).toBeInTheDocument()
    expect(screen.getByText("French")).toBeInTheDocument()
  })

  it("opens the print dialog with a PDF title and restores the page afterward", () => {
    const originalTitle = document.title
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined)

    act(() => printPdfDocument("Report PDF"))
    expect(document.body).toHaveClass("printing-pdf-report")
    expect(document.title).toBe("Report PDF")
    expect(print).toHaveBeenCalledOnce()

    act(() => window.dispatchEvent(new Event("afterprint")))
    expect(document.body).not.toHaveClass("printing-pdf-report")
    expect(document.title).toBe(originalTitle)
  })
})
