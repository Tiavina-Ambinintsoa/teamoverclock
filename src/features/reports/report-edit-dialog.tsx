import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useBuildings, useSectors } from "@/features/city/city-queries"
import { ReportFormFields } from "@/features/reports/report-form-fields"
import type { ReportRow } from "@/lib/db-types"
import { useLocale } from "@/lib/locale"
import { supabase } from "@/lib/supabase"

const reportEditSchema = z.object({
  title: z.string().trim().min(3, "Le titre doit contenir au moins 3 caractères.").max(150),
  description: z.string().trim().min(10, "Décrivez le problème (10 caractères minimum).").max(5000),
  category: z.enum(["infrastructure", "safety", "health", "environment", "transport", "noise", "other"]),
  sectorId: z.string().min(1, "Choisissez un secteur."),
  buildingId: z.string(),
  x: z.string(),
  y: z.string(),
  isPublic: z.boolean(),
})

type ReportEditFormValues = z.infer<typeof reportEditSchema>

type EditableReportRow = ReportRow & { x?: number | null; y?: number | null }

interface ReportEditDialogProps {
  allowPublicEdit?: boolean
  onOpenChange: (open: boolean) => void
  open: boolean
  report: EditableReportRow
}

function stringifyCoordinate(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : ""
}

function parseCoordinate(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export function ReportEditDialog({ allowPublicEdit = false, onOpenChange, open, report }: ReportEditDialogProps) {
  const { tx, locale } = useLocale()
  const queryClient = useQueryClient()
  const sectors = useSectors()
  const buildings = useBuildings()
  const { control, formState: { errors }, handleSubmit, register, reset, setValue } = useForm<ReportEditFormValues>({
    resolver: zodResolver(reportEditSchema),
    defaultValues: {
      title: report.title,
      description: report.description,
      category: report.category,
      sectorId: report.sector_id,
      buildingId: report.building_id ?? "",
      x: stringifyCoordinate(report.x),
      y: stringifyCoordinate(report.y),
      isPublic: report.is_public,
    },
  })
  const sectorId = useWatch({ control, name: "sectorId" })
  const isPublic = useWatch({ control, name: "isPublic" })

  const save = useMutation({
    mutationFn: async (values: ReportEditFormValues) => {
      if (!supabase) throw new Error(tx("Supabase n'est pas configuré.", "Supabase is not configured."))
      const { error } = await supabase.from("reports").update({
        title: values.title.trim(),
        description: values.description.trim(),
        category: values.category,
        sector_id: values.sectorId,
        building_id: values.buildingId || null,
        x: parseCoordinate(values.x),
        y: parseCoordinate(values.y),
        ...(allowPublicEdit ? { is_public: values.isPublic } : {}),
      }).eq("id", report.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success(tx("Signalement mis à jour.", "Report updated."))
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["report-detail", report.id] }),
        queryClient.invalidateQueries({ queryKey: ["my-reports"] }),
        queryClient.invalidateQueries({ queryKey: ["public-reports"] }),
        queryClient.invalidateQueries({ queryKey: ["agent-reports"] }),
      ])
      onOpenChange(false)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          reset({
            title: report.title,
            description: report.description,
            category: report.category,
            sectorId: report.sector_id,
            buildingId: report.building_id ?? "",
            x: stringifyCoordinate(report.x),
            y: stringifyCoordinate(report.y),
            isPublic: report.is_public,
          })
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{tx("Modifier le signalement", "Edit report")}</DialogTitle>
          <DialogDescription>{tx("Vous pouvez corriger le contenu tant qu'aucun agent ne l'a pris en charge et que son statut initial n'a pas changé.", "You can correct the content while no agent has taken it over and its initial status has not changed.")}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={(event) => void handleSubmit((values) => save.mutate(values))(event)}>
          <ReportFormFields
            buildings={buildings.data ?? []}
            errors={errors}
            locale={locale}
            register={register}
            sectorId={sectorId}
            sectors={sectors.data ?? []}
            tx={tx}
            onSectorChange={() => setValue("buildingId", "")}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="rp-x">{tx("Position X (facultatif)", "Position X (optional)")}</Label>
              <Input id="rp-x" inputMode="decimal" placeholder="47.51" {...register("x")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rp-y">{tx("Position Y (facultatif)", "Position Y (optional)")}</Label>
              <Input id="rp-y" inputMode="decimal" placeholder="-18.91" {...register("y")} />
            </div>
          </div>
          {allowPublicEdit && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isPublic} onChange={(event) => setValue("isPublic", event.target.checked)} />
              <span>{tx("Rendre ce signalement public", "Make this report public")}</span>
            </label>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{tx("Annuler", "Cancel")}</Button>
            <Button type="submit" disabled={save.isPending}>{tx("Enregistrer", "Save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
