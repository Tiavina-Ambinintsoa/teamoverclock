import { readFile, stat } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const bucket = "hero-assets"
const version = "v1"

const assets = [
  ["hero-intro.webm", "video/webm"],
  ["hero-intro.mp4", "video/mp4"],
  ["bg-getStarted.webp", "image/webp"],
  ["city-terra-nova.webp", "image/webp"],
  ["cloud_sea.webp", "image/webp"],
  ["cloud.webp", "image/webp"],
  ["og.png", "image/png"],
  ["explorative_space_craft.glb", "model/gltf-binary"],
]

async function readLocalEnv(name) {
  try {
    const contents = await readFile(path.join(root, ".env.local"), "utf8")
    const line = contents.split(/\r?\n/).find((entry) => entry.trim().startsWith(`${name}=`))
    const value = line?.trim().slice(name.length + 1).trim()
    return value?.replace(/^["']|["']$/g, "")
  } catch (error) {
    if (error.code === "ENOENT") return undefined
    throw error
  }
}

const projectUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || (await readLocalEnv("VITE_SUPABASE_URL")))?.replace(/\/+$/, "")
const secretKey = process.env.SUPABASE_SECRET_KEY
const legacyServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const apiKey = secretKey || legacyServiceRoleKey

if (!projectUrl || !legacyServiceRoleKey) {
  throw new Error(
    "Set VITE_SUPABASE_URL in .env.local and SUPABASE_SERVICE_ROLE_KEY in the environment before uploading. " +
      "Storage requires a JWT bearer token; SUPABASE_SECRET_KEY alone is not sufficient.",
  )
}

let parsedProjectUrl
try {
  parsedProjectUrl = new URL(projectUrl)
} catch {
  throw new Error("VITE_SUPABASE_URL must be a valid absolute URL.")
}

if (parsedProjectUrl.protocol !== "https:" && parsedProjectUrl.hostname !== "localhost" && parsedProjectUrl.hostname !== "127.0.0.1") {
  throw new Error("The Supabase project URL must use HTTPS.")
}

for (const [fileName, contentType] of assets) {
  const filePath = path.join(root, "public", fileName)
  const fileSize = (await stat(filePath)).size
  const objectPath = `${version}/${fileName}`
  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/")
  const response = await fetch(`${projectUrl}/storage/v1/object/${bucket}/${encodedPath}`, {
    method: "POST",
    headers: {
      apikey: apiKey,
      authorization: `Bearer ${legacyServiceRoleKey}`,
      "cache-control": "max-age=31536000",
      "content-type": contentType,
      "x-upsert": "true",
    },
    body: await readFile(filePath),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Upload failed for ${fileName} (${fileSize} bytes): ${response.status} ${detail}`)
  }

  console.log(`Uploaded ${fileName} (${fileSize} bytes)`)
}

console.log(`Public asset base URL: ${projectUrl}/storage/v1/object/public/${bucket}/${version}`)
