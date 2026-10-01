#!/usr/bin/env node
/**
 * Contrôles avant de déposer le build sur le serveur de compétition.
 *
 *   npm run predeploy   -> build + rapport (avertissements non bloquants)
 *   npm run release     -> build + rapport STRICT (échoue s'il reste des TODO(webcup))
 *
 * Vérifie : poids de dist/ (quota serveur HODI : 300 Mo par équipe), images/vidéos trop lourdes,
 * sourcemaps oubliées, .htaccess présent, clés secrètes embarquées par erreur, restes du modèle.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { extname, join, relative } from "node:path"

const STRICT = process.argv.includes("--strict")
const QUOTA_MB = 300 // règlement 24h by Webcup 2026 : 300 Mo de disque par équipe
const WARN_TOTAL_MB = 50 // au-delà, quelque chose de lourd s'est glissé dans le build
const WARN_IMAGE_KB = 300
const WARN_VIDEO_MB = 5

const root = process.cwd()
const dist = join(root, "dist")
let errors = 0
let warnings = 0
const ok = (message) => console.log(`  ok  ${message}`)
const warn = (message) => {
  warnings++
  console.log(`  !   ${message}`)
}
const fail = (message) => {
  errors++
  console.log(`  x   ${message}`)
}

const format = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} Mo` : `${Math.round(bytes / 1024)} Ko`)

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  })
}

// ---------------------------------------------------------------- 1. dist/
console.log("\nPoids et contenu du build (dist/)")
if (!existsSync(dist)) {
  fail("dist/ introuvable : lancez d'abord `npm run build`.")
  process.exit(1)
}

const files = walk(dist).map((path) => ({ path: relative(dist, path).replaceAll("\\", "/"), size: statSync(path).size }))
const total = files.reduce((sum, file) => sum + file.size, 0)
console.log(`      ${files.length} fichiers, ${format(total)} au total (quota du serveur : ${QUOTA_MB} Mo)`)

if (total > QUOTA_MB * 1024 * 1024) fail(`dist/ dépasse le quota de ${QUOTA_MB} Mo : le dépôt sur le serveur échouera.`)
else if (total > WARN_TOTAL_MB * 1024 * 1024) warn(`dist/ pèse ${format(total)} : cherchez les images ou vidéos non optimisées.`)
else ok("poids total raisonnable")

console.log("      Les plus lourds :")
;[...files]
  .sort((a, b) => b.size - a.size)
  .slice(0, 5)
  .forEach((file) => console.log(`        ${format(file.size).padStart(8)}  ${file.path}`))

const IMAGES = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif"])
const VIDEOS = new Set([".mp4", ".webm", ".mov"])
for (const file of files) {
  const extension = extname(file.path).toLowerCase()
  if (IMAGES.has(extension) && file.size > WARN_IMAGE_KB * 1024)
    warn(`Image lourde (${format(file.size)}) : ${file.path}. Passez en WebP/AVIF, 1600 px de large maximum.`)
  if (VIDEOS.has(extension) && file.size > WARN_VIDEO_MB * 1024 * 1024)
    warn(`Vidéo lourde (${format(file.size)}) : ${file.path}. Hébergez-la ailleurs (lien) ou compressez-la.`)
}

if (files.some((file) => file.path.endsWith(".map"))) warn("Des sourcemaps (.map) sont présentes : elles alourdissent le dépôt.")
if (!files.some((file) => file.path === "index.html")) fail("index.html absent de dist/.")
if (!files.some((file) => file.path === ".htaccess"))
  warn(".htaccess absent de dist/ : sans lui, un rechargement sur /app peut donner une 404 (ou utilisez VITE_USE_HASH_ROUTER=true).")
else ok(".htaccess présent (repli SPA)")

// ---------------------------------------------------------------- 2. secrets
console.log("\nSecrets embarqués dans le build")
let leaked = false
for (const file of files.filter((f) => /\.(js|html|css)$/.test(f.path))) {
  const text = readFileSync(join(dist, file.path), "utf8")
  if (/sb_secret_[A-Za-z0-9_-]{16,}/.test(text)) {
    fail(`Clé secrète Supabase (sb_secret_...) trouvée dans ${file.path} : RETIREZ-LA et régénérez-la.`)
    leaked = true
  }
  for (const [candidate] of text.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g)) {
    try {
      const payload = JSON.parse(Buffer.from(candidate.split(".")[1], "base64url").toString("utf8"))
      if (payload.role === "service_role") {
        fail(`Clé service_role trouvée dans ${file.path} : RETIREZ-LA immédiatement et régénérez-la.`)
        leaked = true
      }
    } catch {
      /* pas un JWT exploitable */
    }
  }
  for (const pattern of [/sk-ant-[A-Za-z0-9_-]{16,}/, /sk-[A-Za-z0-9]{16,}/]) {
    if (pattern.test(text)) {
      fail(`Une clé qui ressemble à une clé d'API tierce (LLM...) a été trouvée dans ${file.path}. Elle doit passer par une Edge Function, jamais être appelée directement depuis le front.`)
      leaked = true
      break
    }
  }
}
if (!leaked) ok("aucune clé secrète détectée")

// ---------------------------------------------------------------- 3. restes du modèle
console.log("\nRestes à traiter avant le rendu")
const CODE_FILE = /\.(ts|tsx|css|html)$/
const sourceFiles = [
  ...(existsSync(join(root, "src")) ? walk(join(root, "src")) : []),
  ...(existsSync(join(root, "index.html")) ? [join(root, "index.html")] : []),
].filter((path) => CODE_FILE.test(path))

const MARKERS = [
  { pattern: /TODO\(webcup\)/, label: "TODO(webcup)" },
  { pattern: /lorem ipsum/i, label: "Lorem ipsum" },
  { pattern: /Nom du projet|Prénom Nom|VOTRE-URL/, label: "texte d'exemple du modèle" },
  { pattern: /console\.(log|debug)\(/, label: "console.log oublié" },
]

const leftovers = []
for (const path of sourceFiles) {
  readFileSync(path, "utf8")
    .split("\n")
    .forEach((line, index) => {
      const marker = MARKERS.find(({ pattern }) => pattern.test(line))
      if (marker) leftovers.push(`${relative(root, path).replaceAll("\\", "/")}:${index + 1}  ${marker.label}`)
    })
}

if (leftovers.length === 0) ok("rien à signaler")
else {
  leftovers.slice(0, 25).forEach((item) => console.log(`        ${item}`))
  if (leftovers.length > 25) console.log(`        … et ${leftovers.length - 25} autres`)
  if (STRICT) fail(`${leftovers.length} reste(s) à traiter (mode strict).`)
  else warn(`${leftovers.length} reste(s) à traiter avant le rendu (\`npm run release\` les exige à zéro).`)
}

// ---------------------------------------------------------------- bilan
console.log(`\nBilan : ${errors} erreur(s), ${warnings} avertissement(s)${STRICT ? " (mode strict)" : ""}\n`)
process.exit(errors > 0 ? 1 : 0)
