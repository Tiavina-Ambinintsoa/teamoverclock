import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { useAuth, type AppUser } from "@/features/auth/auth-context"
import { createItem, deleteItem, getItem, listItems, updateItem, type NewItem } from "@/features/items/items-api"

function requireUser(user: AppUser | null): AppUser {
  if (!user) throw new Error("Connexion requise")
  return user
}

export function useItems() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ["items", user?.id],
    queryFn: () => listItems(requireUser(user)),
    enabled: user !== null,
  })
}

export function useItem(id: string | undefined) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ["items", user?.id, id],
    queryFn: () => getItem(id ?? "", requireUser(user)),
    enabled: user !== null && Boolean(id),
  })
}

// Vocabulaire cohérent : l'action "Publier" produit le toast "Note publiée", etc.
export function useCreateItem() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: NewItem) => createItem(input, requireUser(user)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["items"] })
      toast.success("Note publiée")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useDeleteItem() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteItem(id, requireUser(user)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["items"] })
      toast.success("Note supprimée")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useUpdateItem() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: NewItem }) => updateItem(id, input, requireUser(user)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["items"] })
      toast.success("Note modifiée")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}
