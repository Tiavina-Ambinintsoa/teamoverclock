import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useCreateItem } from "@/features/items/use-items"

const schema = z.object({
  title: z.string().trim().min(3, "3 caractères minimum").max(80, "80 caractères maximum"),
  content: z.string().max(500, "500 caractères maximum"),
  is_public: z.boolean(),
})
type FormValues = z.infer<typeof schema>

export function ItemForm() {
  const create = useCreateItem()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", content: "", is_public: true },
  })

  const onSubmit = handleSubmit((values) => {
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
        {errors.title && (
          <p id="title-error" role="alert" className="text-sm text-destructive">
            {errors.title.message}
          </p>
        )}
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
        {errors.content && (
          <p id="content-error" role="alert" className="text-sm text-destructive">
            {errors.content.message}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input id="is_public" type="checkbox" className="size-4 accent-primary" {...register("is_public")} />
        <Label htmlFor="is_public">Visible par tous les utilisateurs</Label>
      </div>

      <Button type="submit" disabled={create.isPending}>
        Publier la note
      </Button>
    </form>
  )
}
