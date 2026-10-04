import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Building, Sector, Service } from "@/lib/db-types"
import { useLocale } from "@/lib/locale"

import {
  DANGER_SEVERITIES,
  emptyDangerFormValues,
  type DangerFormValues,
  validateDangerForm,
} from "./danger-form-helpers"

interface DangerFormProps {
  open: boolean
  title: string
  description: string
  busy: boolean
  services: Service[]
  sectors: Sector[]
  buildings: Building[]
  initialValues?: DangerFormValues
  existingStatus?: DangerFormValues["status"]
  onClose: () => void
  onSubmit: (values: DangerFormValues, action: "save" | "activate") => void
}

function ArrayField({
  label,
  values,
  onChange,
  onAdd,
  onRemove,
  placeholder,
}: {
  label: string
  values: string[]
  onChange: (index: number, value: string) => void
  onAdd: () => void
  onRemove: (index: number) => void
  placeholder: string
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label>{label}</Label>
        <Button type="button" size="sm" variant="outline" onClick={onAdd}>+</Button>
      </div>
      {values.map((value, index) => (
        <div key={`${label}-${index}`} className="flex gap-2">
          <Input value={value} onChange={(event) => onChange(index, event.target.value)} placeholder={placeholder} />
          <Button type="button" size="sm" variant="outline" onClick={() => onRemove(index)} disabled={values.length === 1}>−</Button>
        </div>
      ))}
    </div>
  )
}

export function DangerForm({
  open,
  title,
  description,
  busy,
  services,
  sectors,
  buildings,
  initialValues,
  existingStatus = "draft",
  onClose,
  onSubmit,
}: DangerFormProps) {
  const { tx } = useLocale()
  const [values, setValues] = useState<DangerFormValues>(initialValues ?? emptyDangerFormValues())

  const errors = useMemo(() => validateDangerForm(values), [values])
  const invalid = errors.length > 0 || busy
  const isDraft = existingStatus === "draft"
  const isActive = existingStatus === "active"

  const update = <K extends keyof DangerFormValues>(key: K, value: DangerFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const updateList = (key: "recommendedActions" | "forbiddenActions", index: number, value: string) => {
    setValues((current) => ({
      ...current,
      [key]: current[key].map((item, itemIndex) => itemIndex === index ? value : item),
    }))
  }

  const addListItem = (key: "recommendedActions" | "forbiddenActions") => {
    setValues((current) => ({ ...current, [key]: [...current[key], ""] }))
  }

  const removeListItem = (key: "recommendedActions" | "forbiddenActions", index: number) => {
    setValues((current) => ({ ...current, [key]: current[key].filter((_, itemIndex) => itemIndex !== index) || [""] }))
  }

  const updateStep = (index: number, field: "title" | "detail", value: string) => {
    setValues((current) => ({
      ...current,
      protocolSteps: current.protocolSteps.map((step, stepIndex) => stepIndex === index ? { ...step, [field]: value } : step),
    }))
  }

  const updateContact = (index: number, field: "name" | "role" | "phone", value: string) => {
    setValues((current) => ({
      ...current,
      emergencyContacts: current.emergencyContacts.map((contact, contactIndex) => contactIndex === index ? { ...contact, [field]: value } : contact),
    }))
  }

  const toggleChoice = (key: "affectedSectorIds" | "assemblyBuildingIds", value: string) => {
    setValues((current) => ({
      ...current,
      [key]: current[key].includes(value) ? current[key].filter((entry) => entry !== value) : [...current[key], value],
    }))
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="danger-title">{tx("Titre", "Title")}</Label>
              <Input id="danger-title" value={values.title} onChange={(event) => update("title", event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="danger-severity">{tx("Gravité", "Severity")}</Label>
              <Select id="danger-severity" value={values.severity} onChange={(event) => update("severity", event.target.value as DangerFormValues["severity"])}>
                {DANGER_SEVERITIES.map((severity) => <option key={severity} value={severity}>{severity}</option>)}
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="danger-summary">{tx("Résumé", "Summary")}</Label>
            <Textarea id="danger-summary" rows={3} value={values.summary} onChange={(event) => update("summary", event.target.value)} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="danger-valid-from">{tx("Valable depuis", "Valid from")}</Label>
              <Input id="danger-valid-from" type="datetime-local" value={values.validFrom} onChange={(event) => update("validFrom", event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="danger-valid-until">{tx("Valable jusqu'au", "Valid until")}</Label>
              <Input id="danger-valid-until" type="datetime-local" value={values.validUntil} onChange={(event) => update("validUntil", event.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="danger-source">{tx("Source", "Source")}</Label>
            <Input id="danger-source" value={values.source} onChange={(event) => update("source", event.target.value)} placeholder={tx("Ex. observation satellite, cellule terrain…", "E.g. satellite observation, field team…")} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="danger-service">{tx("Service responsable", "Responsible service")}</Label>
            <Select id="danger-service" value={values.responsibleServiceId} onChange={(event) => update("responsibleServiceId", event.target.value)}>
              <option value="">{tx("Choisir un service", "Choose a service")}</option>
              {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
            </Select>
          </div>

          <div className="grid gap-3">
            <Label>{tx("Secteurs concernés", "Affected sectors")}</Label>
            <div className="grid gap-2 rounded-xl border p-3 md:grid-cols-2">
              {sectors.map((sector) => (
                <label key={sector.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={values.affectedSectorIds.includes(sector.id)} onChange={() => toggleChoice("affectedSectorIds", sector.id)} />
                  <span>{sector.code} — {sector.name}</span>
                </label>
              ))}
            </div>
          </div>

          <ArrayField
            label={tx("À faire", "What to do")}
            values={values.recommendedActions}
            onChange={(index, value) => updateList("recommendedActions", index, value)}
            onAdd={() => addListItem("recommendedActions")}
            onRemove={(index) => removeListItem("recommendedActions", index)}
            placeholder={tx("Consigne recommandée", "Recommended action")}
          />

          <ArrayField
            label={tx("À ne pas faire", "What not to do")}
            values={values.forbiddenActions}
            onChange={(index, value) => updateList("forbiddenActions", index, value)}
            onAdd={() => addListItem("forbiddenActions")}
            onRemove={(index) => removeListItem("forbiddenActions", index)}
            placeholder={tx("Action interdite", "Forbidden action")}
          />

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <Label>{tx("Protocole pas à pas", "Step-by-step protocol")}</Label>
              <Button type="button" size="sm" variant="outline" onClick={() => setValues((current) => ({ ...current, protocolSteps: [...current.protocolSteps, { title: "", detail: "" }] }))}>+</Button>
            </div>
            <div className="grid gap-3">
              {values.protocolSteps.map((step, index) => (
                <div key={`step-${index}`} className="grid gap-2 rounded-xl border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{tx(`Étape ${index + 1}`, `Step ${index + 1}`)}</p>
                    <Button type="button" size="sm" variant="outline" onClick={() => setValues((current) => ({ ...current, protocolSteps: current.protocolSteps.filter((_, stepIndex) => stepIndex !== index) || [{ title: "", detail: "" }] }))} disabled={values.protocolSteps.length === 1}>−</Button>
                  </div>
                  <Input value={step.title} onChange={(event) => updateStep(index, "title", event.target.value)} placeholder={tx("Titre de l'étape", "Step title")} />
                  <Textarea rows={2} value={step.detail} onChange={(event) => updateStep(index, "detail", event.target.value)} placeholder={tx("Détail de l'étape", "Step detail")} />
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <Label>{tx("Contacts d'urgence", "Emergency contacts")}</Label>
              <Button type="button" size="sm" variant="outline" onClick={() => setValues((current) => ({ ...current, emergencyContacts: [...current.emergencyContacts, { name: "", role: "", phone: "" }] }))}>+</Button>
            </div>
            <div className="grid gap-3">
              {values.emergencyContacts.map((contact, index) => (
                <div key={`contact-${index}`} className="grid gap-2 rounded-xl border p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                  <Input value={contact.name} onChange={(event) => updateContact(index, "name", event.target.value)} placeholder={tx("Nom", "Name")} />
                  <Input value={contact.role} onChange={(event) => updateContact(index, "role", event.target.value)} placeholder={tx("Rôle", "Role")} />
                  <Input value={contact.phone} onChange={(event) => updateContact(index, "phone", event.target.value)} placeholder={tx("Téléphone", "Phone")} />
                  <Button type="button" size="sm" variant="outline" onClick={() => setValues((current) => ({ ...current, emergencyContacts: current.emergencyContacts.filter((_, contactIndex) => contactIndex !== index) || [{ name: "", role: "", phone: "" }] }))} disabled={values.emergencyContacts.length === 1}>−</Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            <Label>{tx("Points de rassemblement", "Assembly points")}</Label>
            <div className="grid gap-2 rounded-xl border p-3 md:grid-cols-2">
              {buildings.map((building) => (
                <label key={building.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={values.assemblyBuildingIds.includes(building.id)} onChange={() => toggleChoice("assemblyBuildingIds", building.id)} />
                  <span>{building.name}</span>
                </label>
              ))}
            </div>
          </div>

          {errors.length > 0 && (
            <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {tx("Complétez les champs requis avant d'enregistrer.", "Complete the required fields before saving.")}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>{tx("Annuler", "Cancel")}</Button>
            <Button type="button" variant="outline" disabled={invalid} onClick={() => onSubmit(values, "save")}>
              {isActive ? tx("Enregistrer la nouvelle version", "Save new version") : isDraft ? tx("Enregistrer le brouillon", "Save draft") : tx("Enregistrer", "Save")}
            </Button>
            {(isDraft || !initialValues) && (
              <Button type="button" disabled={invalid} onClick={() => onSubmit(values, "activate")}>
                {tx("Valider et activer", "Validate & activate")}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
