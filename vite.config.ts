import { fileURLToPath, URL } from "node:url"
import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")

  return {
    // Si l'app est servie dans un sous-dossier (ex: https://hote/equipe-12/),
    // définir VITE_BASE=/equipe-12/ dans .env.local (voir docs/06-deploiement-hodi.md)
    base: env.VITE_BASE || "/",
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: { host: true, port: 5173 },
    // Pré-bundle des addons Three.js de la carte 3D : sinon Vite les découvre un par un et invalide le cache en boucle.
    optimizeDeps: {
      include: [
        "three",
        "three/addons/controls/OrbitControls.js",
        "three/addons/postprocessing/EffectComposer.js",
        "three/addons/postprocessing/RenderPass.js",
        "three/addons/postprocessing/UnrealBloomPass.js",
        "three/addons/postprocessing/OutputPass.js",
        "three/addons/environments/RoomEnvironment.js",
      ],
    },
    build: {
      sourcemap: false, // 300 Mo de quota sur le serveur : pas de sourcemaps en prod
      rolldownOptions: {
        output: {
          // Découpage "vendor" : les bibliothèques changent rarement, le navigateur les garde en cache
          // entre deux déploiements (moins d'octets retéléchargés à chaque mise à jour).
          codeSplitting: {
            groups: [
              { name: "supabase", test: /node_modules[\\/]@supabase[\\/]/ },
              { name: "react", test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/ },
            ],
          },
        },
      },
    },
  }
})
