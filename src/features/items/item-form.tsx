import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import type { Item } from "@/features/items/items-api"
import { useCreateItem, useUpdateItem } from "@/features/items/use-items"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const schema = z.object({
  title: z.string().trim().min(3, "3 caractères minimum").max(80, "80 caractères maximum"),
  content: z.string().max(500, "500 caractères maximum"),
  is_public: z.boolean(),
})
type FormValues = z.infer<typeof schema>

type ItemFormProps = { item?: Item; onCancel?: () => void }

/** Même formulaire pour créer une note ou modifier celle qui est déjà ouverte. */
export function ItemForm({ item, onCancel }: ItemFormProps) {
  const create = useCreateItem()
  const update = useUpdateItem()
  const editing = item !== undefined
  const pending = editing ? update.isPending : create.isPending
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: item?.title ?? "", content: item?.content ?? "", is_public: item?.is_public ?? true },
  })

  const onSubmit = handleSubmit((values) => {
    if (item) {
      update.mutate({ id: item.id, input: values }, { onSuccess: () => onCancel?.() })
      return
    }
    create.mutate(values, { onSuccess: () => reset() })
  })

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="title">Titre</Label>
        <Input
          id="title"
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? "title-error" : undefined}
          {...register("title")}
        />
        {errors.title && <p id="title-error" role="alert" className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="content">Contenu (facultatif)</Label>
        <Textarea
          id="content"
          rows={4}
          aria-invalid={errors.content ? true : undefined}
          aria-describedby={errors.content ? "content-error" : undefined}
          {...register("content")}
        />
        {errors.content && <p id="content-error" role="alert" className="text-sm text-destructive">{errors.content.message}</p>}
      </div>

      <div className="flex items-center gap-2">
        <input id="is_public" type="checkbox" className="size-4 accent-primary" {...register("is_public")} />
        <Label htmlFor="is_public">Visible par tous les utilisateurs</Label>
      </div>

      <div className="flex flex-wrap gap-2">
        {editing && <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>}
        <Button type="submit" disabled={pending}>{editing ? "Enregistrer les changements" : "Publier la note"}</Button>
      </div>
    </form>
  )
}