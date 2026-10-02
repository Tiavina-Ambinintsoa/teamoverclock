import { createServer } from "vite"

export default async function globalSetup() {
  // Keep browser tests isolated from any developer Supabase configuration.
  process.env.VITE_SUPABASE_URL = ""
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = ""
  process.env.VITE_DEMO_EMAIL = ""
  process.env.VITE_DEMO_PASSWORD = ""
  process.env.VITE_ENABLE_AI_CHAT = "false"
  process.env.VITE_ENABLE_AI_HISTORY = "false"

  const server = await createServer({
    configFile: "vite.config.ts",
    mode: "test",
    server: { host: "127.0.0.1", port: 4173, strictPort: true },
  })
  await server.listen()

  return async () => {
    await server.close()
  }
}
