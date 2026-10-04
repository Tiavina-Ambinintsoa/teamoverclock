import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useLocale } from "@/lib/locale"
import { supabase } from "@/lib/supabase"

const projectEditSchema = z.object({
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().min(10).max(5000),
  serviceId: z.string().min(1),
})

type ProjectEditValues = z.infer<typeof projectEditSchema>

interface ServiceOption {
  id: string
  name: string
}

interface ProjectRowLike {
  id: string
  service_id: string
  title: string
  description: string
}

interface ProjectEditDialogProps {
  onOpenChange: (open: boolean) => void
  open: boolean
  project: ProjectRowLike
  services: readonly ServiceOption[]
}

export function ProjectEditDialog({ onOpenChange, open, project, services }: ProjectEditDialogProps) {
  const { tx } = useLocale()
  const queryClient = useQueryClient()
  const { formState: { errors }, handleSubmit, register, reset } = useForm<ProjectEditValues>({
    resolver: zodResolver(projectEditSchema),
    defaultValues: {
      title: project.title,
      description: project.description,
      serviceId: project.service_id,
    },
  })

  const save = useMutation({
    mutationFn: async (values: ProjectEditValues) => {
      if (!supabase) throw new Error(tx("Supabase n'est pas configuré.", "Supabase is not configured."))
      const { error } = await supabase.from("city_projects").update({
        title: values.title.trim(),
        description: values.description.trim(),
        service_id: values.serviceId,
      }).eq("id", project.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success(tx("Projet mis à jour.", "Project updated."))
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-city-projects"] }),
        queryClient.invalidateQueries({ queryKey: ["city-projects"] }),
        queryClient.invalidateQueries({ queryKey: ["city-project-stats"] }),
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
            title: project.title,
            description: project.description,
            serviceId: project.service_id,
          })
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{tx("Modifier le projet", "Edit project")}</DialogTitle>
          <DialogDescription>{tx("Le créateur peut modifier le titre, la description et le service tant que le projet n'a pas changé de statut et qu'aucun autre gestionnaire ne l'a repris.", "The creator can edit the title, description, and service while the project status has not changed and no other manager has taken it over.")}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={(event) => void handleSubmit((values) => save.mutate(values))(event)}>
          <div className="grid gap-2">
            <Label htmlFor="project-edit-title">{tx("Nom du projet", "Project name")}</Label>
            <Input id="project-edit-title" {...register("title")} aria-invalid={errors.title ? true : undefined} />
            {errors.title?.message && <p role="alert" className="text-sm text-destructive">{errors.title.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="project-edit-service">{tx("Service responsable", "Responsible service")}</Label>
            <Select id="project-edit-service" {...register("serviceId")} aria-invalid={errors.serviceId ? true : undefined}>
              <option value="">{tx("Choisir un service", "Choose a service")}</option>
              {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="project-edit-description">{tx("Description", "Description")}</Label>
            <Textarea id="project-edit-description" {...register("description")} className="min-h-36" aria-invalid={errors.description ? true : undefined} />
            {errors.description?.message && <p role="alert" className="text-sm text-destructive">{errors.description.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{tx("Annuler", "Cancel")}</Button>
            <Button type="submit" disabled={save.isPending}>{tx("Enregistrer", "Save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
