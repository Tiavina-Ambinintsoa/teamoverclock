import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useBuildings, useSectors, useTransports } from "@/features/city/city-queries"
import { axialToPixel } from "@/features/map/hex"
import { HEX_SIZE, HexMap, type MapLayers, type MapSelection } from "@/features/map/hex-map"
import type { Building, BuildingType, Sector, Transport, TransportType } from "@/lib/db-types"
import { useLocale } from "@/lib/locale"
import { BUILDING_TYPE_LABELS, pickLabel, TRANSPORT_TYPE_LABELS } from "@/lib/status-labels"
import { supabase } from "@/lib/supabase"

const LAYERS: MapLayers = { sectors: true, buildings: true, transports: true, dangers: false, reports: false, observations: false }
const BUILDING_STATUSES: Building["status"][] = ["operational", "temporarily_closed", "under_maintenance", "restricted"]
const TRANSPORT_STATUSES: Transport["status"][] = ["active", "idle", "maintenance", "out_of_service"]

/** Prochain code libre de secteur : S-11 après S-10 (ou S-01 si vide). */
export function nextSectorCode(codes: string[]): string {
  const max = codes.reduce((m, code) => Math.max(m, Number(code.replace(/\D/g, "")) || 0), 0)
  return `S-${String(max + 1).padStart(2, "0")}`
}

/** Éditeur de carte (administrateur) : ajouter, modifier, supprimer et placer secteurs, bâtiments et transports (CRUD dynamique). */
export function MapEditorPage() {
  const { tx, locale } = useLocale()
  const queryClient = useQueryClient()
  const sectors = useSectors()
  const buildings = useBuildings()
  const transports = useTransports()
  const [selected, setSelected] = useState<MapSelection>(null)
  const [tab, setTab] = useState("sectors")

  const refresh = async () => {
    await Promise.all(["sectors", "buildings", "transports"].map((key) => queryClient.invalidateQueries({ queryKey: [key] })))
  }
  const run = useMutation({
    mutationFn: async (op: () => PromiseLike<{ error: { message: string } | null }>) => {
      const { error } = await op()
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => { toast.success(tx("Carte mise à jour.", "Map updated.")); await refresh() },
    onError: (error: Error) => toast.error(error.message),
  })
  const db = () => {
    if (!supabase) throw new Error("Supabase")
    return supabase
  }

  const move = (type: "building" | "transport", id: string, x: number, y: number) =>
    run.mutate(() => db().from(type === "building" ? "buildings" : "transports").update({ x, y }).eq("id", id))

  // --- Secteur
  const [sCode, setSCode] = useState("")
  const [sName, setSName] = useState("")
  const [sQ, setSQ] = useState(3)
  const [sR, setSR] = useState(0)
  const [sColor, setSColor] = useState("#6366f1")
  const addSector = () => {
    const code = sCode || nextSectorCode((sectors.data ?? []).map((s) => s.code))
    const { x, y } = axialToPixel(sQ, sR, HEX_SIZE)
    run.mutate(() => db().from("sectors").insert({ code, name: sName.trim(), hex_q: sQ, hex_r: sR, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, color: sColor }))
    setSName(""); setSCode("")
  }
  const selSector = selected?.type === "sector" ? sectors.data?.find((s) => s.id === selected.id) : undefined
  const selBuilding = selected?.type === "building" ? buildings.data?.find((b) => b.id === selected.id) : undefined
  const selTransport = selected?.type === "transport" ? transports.data?.find((t) => t.id === selected.id) : undefined

  // --- Bâtiment
  const [bName, setBName] = useState("")
  const [bType, setBType] = useState<BuildingType>("public_place")
  const [bSector, setBSector] = useState("")
  const addBuilding = () => {
    const sector = sectors.data?.find((s) => s.id === bSector)
    if (!sector) return toast.error(tx("Choisissez un secteur.", "Choose a sector."))
    run.mutate(() => db().from("buildings").insert({ name: bName.trim(), type: bType, sector_id: sector.id, x: sector.x, y: sector.y }))
    setBName("")
  }

  // --- Transport
  const [tCode, setTCode] = useState("")
  const [tType, setTType] = useState<TransportType>("shuttle")
  const [tSector, setTSector] = useState("")
  const addTransport = () => {
    const sector = sectors.data?.find((s) => s.id === tSector)
    if (!sector) return toast.error(tx("Choisissez un secteur.", "Choose a sector."))
    run.mutate(() => db().from("transports").insert({ code: tCode.trim().toUpperCase(), type: tType, sector_id: sector.id, x: sector.x + 20, y: sector.y + 20 }))
    setTCode("")
  }

  const confirmDelete = (message: string, op: () => PromiseLike<{ error: { message: string } | null }>) => {
    if (window.confirm(message)) run.mutate(op)
  }

  return (
    <Container className="max-w-7xl">
      <title>{tx("Éditeur de carte", "Map editor")}</title>
      <PageHeader eyebrow={tx("Administration", "Administration")} title={tx("Éditeur de carte", "Map editor")} description={tx("Glissez-déposez les bâtiments et les transports pour les replacer ; ajoutez, modifiez ou supprimez secteurs, bâtiments et transports.", "Drag and drop buildings and transports to reposition them; add, edit or delete sectors, buildings and transports.")} />
      <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
        <HexMap sectors={sectors.data ?? []} buildings={buildings.data ?? []} transports={transports.data ?? []} layers={LAYERS} selected={selected} onSelect={setSelected} editable onMove={move} />
        <div className="rounded-xl border bg-card p-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="sectors">{tx("Secteurs", "Sectors")}</TabsTrigger>
              <TabsTrigger value="buildings">{tx("Bâtiments", "Buildings")}</TabsTrigger>
              <TabsTrigger value="transports">{tx("Transports", "Transports")}</TabsTrigger>
            </TabsList>

            <TabsContent value="sectors" className="mt-4 grid gap-3">
              {selSector && <SectorEditor key={selSector.id} sector={selSector} busy={run.isPending} onSave={(patch) => run.mutate(() => db().from("sectors").update(patch).eq("id", selSector.id))} onDelete={() => confirmDelete(tx("Supprimer ce secteur ?", "Delete this sector?"), () => db().from("sectors").delete().eq("id", selSector.id))} />}
              <h3 className="font-semibold">{tx("Ajouter un secteur", "Add a sector")}</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1"><Label htmlFor="s-code">Code</Label><Input id="s-code" placeholder={nextSectorCode((sectors.data ?? []).map((s) => s.code))} value={sCode} onChange={(e) => setSCode(e.target.value)} /></div>
                <div className="grid gap-1"><Label htmlFor="s-name">{tx("Nom", "Name")}</Label><Input id="s-name" value={sName} onChange={(e) => setSName(e.target.value)} /></div>
                <div className="grid gap-1"><Label htmlFor="s-q">q</Label><Input id="s-q" type="number" value={sQ} onChange={(e) => setSQ(Number(e.target.value))} /></div>
                <div className="grid gap-1"><Label htmlFor="s-r">r</Label><Input id="s-r" type="number" value={sR} onChange={(e) => setSR(Number(e.target.value))} /></div>
                <div className="grid gap-1"><Label htmlFor="s-color">{tx("Couleur", "Color")}</Label><Input id="s-color" type="color" value={sColor} onChange={(e) => setSColor(e.target.value)} /></div>
              </div>
              <Button disabled={run.isPending || sName.trim().length < 2} onClick={addSector}>{tx("Ajouter", "Add")}</Button>
            </TabsContent>

            <TabsContent value="buildings" className="mt-4 grid gap-3">
              {selBuilding && (
                <div className="grid gap-2 rounded-lg border p-3">
                  <p className="font-medium">{selBuilding.name}</p>
                  <Select aria-label={tx("État", "State")} value={selBuilding.status} onChange={(e) => run.mutate(() => db().from("buildings").update({ status: e.target.value }).eq("id", selBuilding.id))}>
                    {BUILDING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                  <Button variant="destructive" size="sm" onClick={() => confirmDelete(tx("Supprimer ce bâtiment ?", "Delete this building?"), () => db().from("buildings").delete().eq("id", selBuilding.id))}>{tx("Supprimer", "Delete")}</Button>
                </div>
              )}
              <h3 className="font-semibold">{tx("Ajouter un bâtiment", "Add a building")}</h3>
              <Input aria-label={tx("Nom", "Name")} placeholder={tx("Nom", "Name")} value={bName} onChange={(e) => setBName(e.target.value)} />
              <Select aria-label="Type" value={bType} onChange={(e) => setBType(e.target.value as BuildingType)}>
                {Object.keys(BUILDING_TYPE_LABELS).map((t) => <option key={t} value={t}>{pickLabel(BUILDING_TYPE_LABELS, t, locale)}</option>)}
              </Select>
              <Select aria-label={tx("Secteur", "Sector")} value={bSector} onChange={(e) => setBSector(e.target.value)}>
                <option value="">{tx("Secteur…", "Sector…")}</option>
                {(sectors.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
              </Select>
              <Button disabled={run.isPending || bName.trim().length < 2} onClick={addBuilding}>{tx("Ajouter", "Add")}</Button>
            </TabsContent>

            <TabsContent value="transports" className="mt-4 grid gap-3">
              {selTransport && (
                <div className="grid gap-2 rounded-lg border p-3">
                  <p className="font-medium">{selTransport.code}</p>
                  <Select aria-label={tx("État", "State")} value={selTransport.status} onChange={(e) => run.mutate(() => db().from("transports").update({ status: e.target.value }).eq("id", selTransport.id))}>
                    {TRANSPORT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                  <Button variant="destructive" size="sm" onClick={() => confirmDelete(tx("Supprimer ce transport ?", "Delete this transport?"), () => db().from("transports").delete().eq("id", selTransport.id))}>{tx("Supprimer", "Delete")}</Button>
                </div>
              )}
              <h3 className="font-semibold">{tx("Ajouter un transport", "Add a transport")}</h3>
              <Input aria-label="Code" placeholder="Code (T2)" value={tCode} onChange={(e) => setTCode(e.target.value)} />
              <Select aria-label="Type" value={tType} onChange={(e) => setTType(e.target.value as TransportType)}>
                {Object.keys(TRANSPORT_TYPE_LABELS).map((t) => <option key={t} value={t}>{pickLabel(TRANSPORT_TYPE_LABELS, t, locale)}</option>)}
              </Select>
              <Select aria-label={tx("Secteur", "Sector")} value={tSector} onChange={(e) => setTSector(e.target.value)}>
                <option value="">{tx("Secteur…", "Sector…")}</option>
                {(sectors.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
              </Select>
              <Button disabled={run.isPending || tCode.trim().length < 2} onClick={addTransport}>{tx("Ajouter", "Add")}</Button>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Container>
  )
}

function SectorEditor({ sector, busy, onSave, onDelete }: { sector: Sector; busy: boolean; onSave: (patch: Record<string, unknown>) => void; onDelete: () => void }) {
  const { tx } = useLocale()
  const [name, setName] = useState(sector.name)
  const [color, setColor] = useState(sector.color)
  const [activity, setActivity] = useState(sector.activity_level)
  return (
    <div className="grid gap-2 rounded-lg border p-3">
      <p className="font-medium">{sector.code}</p>
      <Input aria-label={tx("Nom", "Name")} value={name} onChange={(e) => setName(e.target.value)} />
      <div className="flex items-center gap-3">
        <Input aria-label={tx("Couleur", "Color")} type="color" className="w-16" value={color} onChange={(e) => setColor(e.target.value)} />
        <Input aria-label={tx("Activité", "Activity")} type="number" min={0} max={100} value={activity} onChange={(e) => setActivity(Number(e.target.value))} />
      </div>
      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={() => onSave({ name: name.trim(), color, activity_level: Math.min(100, Math.max(0, activity)) })}>{tx("Enregistrer", "Save")}</Button>
        <Button size="sm" variant="destructive" disabled={busy} onClick={onDelete}>{tx("Supprimer", "Delete")}</Button>
      </div>
    </div>
  )
}
