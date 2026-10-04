import type { FieldErrors, Path, UseFormRegister } from "react-hook-form"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { REPORT_CATEGORIES } from "@/features/reports/report-workflow"
import type { Locale } from "@/lib/locale"
import { pickLabel, REPORT_CATEGORY_LABELS } from "@/lib/status-labels"
import type { ReportCategory } from "@/lib/db-types"

interface SectorOption {
  id: string
  code: string
  name: string
}

interface BuildingOption {
  id: string
  name: string
  sector_id: string
}

export interface ReportEditableFieldValues {
  title: string
  description: string
  category: ReportCategory
  sectorId: string
  buildingId: string
}

interface ReportFormFieldsProps<T extends ReportEditableFieldValues> {
  errors: FieldErrors<T>
  buildings: readonly BuildingOption[]
  locale: Locale
  register: UseFormRegister<T>
  sectorId: string
  sectors: readonly SectorOption[]
  tx: (fr: string, en: string) => string
  onSectorChange?: () => void
}

export function ReportFormFields<T extends ReportEditableFieldValues>({
  errors,
  buildings,
  locale,
  register,
  sectorId,
  sectors,
  tx,
  onSectorChange,
}: ReportFormFieldsProps<T>) {
  const field = (name: Path<T>) => errors[name]?.message ? <p role="alert" className="text-sm text-destructive">{String(errors[name]?.message)}</p> : null

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="rp-sector">{tx("Secteur", "Sector")}</Label>
          <Select
            id="rp-sector"
            aria-invalid={errors.sectorId ? true : undefined}
            {...register("sectorId" as Path<T>, { onChange: onSectorChange })}
          >
            <option value="">{tx("Choisir…", "Choose…")}</option>
            {sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.code} — {sector.name}</option>)}
          </Select>
          {field("sectorId" as Path<T>)}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="rp-building">{tx("Bâtiment (facultatif)", "Building (optional)")}</Label>
          <Select id="rp-building" disabled={!sectorId} {...register("buildingId" as Path<T>)}>
            <option value="">—</option>
            {buildings.filter((building) => building.sector_id === sectorId).map((building) => (
              <option key={building.id} value={building.id}>{building.name}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="rp-category">{tx("Catégorie", "Category")}</Label>
        <Select id="rp-category" {...register("category" as Path<T>)}>
          {REPORT_CATEGORIES.map((category) => (
            <option key={category} value={category}>{pickLabel(REPORT_CATEGORY_LABELS, category, locale)}</option>
          ))}
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="rp-title">{tx("Titre", "Title")}</Label>
        <Input id="rp-title" aria-invalid={errors.title ? true : undefined} {...register("title" as Path<T>)} />
        {field("title" as Path<T>)}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="rp-desc">{tx("Description", "Description")}</Label>
        <Textarea id="rp-desc" className="min-h-32" aria-invalid={errors.description ? true : undefined} {...register("description" as Path<T>)} />
        {field("description" as Path<T>)}
      </div>
    </>
  )
}
