// Configuration Vite native — remplace @lovable.dev/vite-tanstack-config.
// Reproduit les comportements nécessaires au projet avec les API natives et
// les versions installées (vite 8.3.4, @tanstack/react-start 1.168.61,
// nitro 3.0.260603-beta). Le preset Cloudflare est la cible du build serveur.
import { loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";

export default (async ({ command, mode }: { command: string; mode: string }) => {
  const internalPlugins = [];

  internalPlugins.push(tailwindcss());

  internalPlugins.push(
    tanstackStart({
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
      spa: { enabled: false },
      server: { entry: "server" },
      prerender: { enabled: false },
    }),
  );

  // Target Node.js server runtime for AI Studio deployment
  if (command === "build") {
    internalPlugins.push(
      nitro({
        preset: "node-server",
        output: {
          dir: ".output",
          serverDir: ".output/server",
          publicDir: ".output/public",
        },
      }),
    );
  }

  internalPlugins.push(react());

  const envDefine: Record<string, string> = {};
  const loadedEnv = loadEnv(mode, process.cwd(), "VITE_");
  for (const [key, value] of Object.entries(loadedEnv)) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  const config = {
    define: envDefine,
    css: { transformer: "lightningcss" as const },
    resolve: {
      tsconfigPaths: true,
      alias: { "@": `${process.cwd()}/src` },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/react-router",
        "lucide-react",
        "adhan",
        "class-variance-authority",
        "clsx",
        "tailwind-merge",
        "zod",
        "sonner",
        "motion/react",
        "@radix-ui/react-accordion",
        "@radix-ui/react-dialog",
        "@radix-ui/react-popover",
        "@radix-ui/react-select",
        "@radix-ui/react-slider",
        "@radix-ui/react-slot",
        "@radix-ui/react-switch",
        "@radix-ui/react-avatar",
        "@capacitor/core",
      ],
      exclude: ["@tanstack/react-start"],
      ignoreOutdatedRequests: true,
    },
    build: {
      rollupOptions: {
        onwarn(warning, defaultHandler) {
          if (warning.code === "MODULE_LEVEL_DIRECTIVE") {
            return;
          }
          defaultHandler(warning);
        },
      },
    },
    server: {
      host: "0.0.0.0",
      port: 3000,
      allowedHosts: true,
      proxy: {
        "/api/off-search": {
          target: "https://search.openfoodfacts.org",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/off-search/, "/search"),
          headers: {
            "User-Agent": "IslamNoorApp/1.0 (https://islam-noor.app; contact@islamnoor.app)",
            Accept: "application/json",
          },
        },
      },
    },
    plugins: internalPlugins,
  };

  return config;
});



