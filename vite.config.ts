// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// Never set ssr.external or resolve.external: the Worker has no runtime module resolution, so
// the build fails. Never add compression (compressPublicAssets, vite-plugin-compression):
// hosting already compresses at the edge.
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const githubPages = process.env.GITHUB_PAGES === "true";
const basepath = process.env.VITE_BASE_PATH || "/";

export default defineConfig({
  nitro: githubPages ? false : undefined,
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    ...(githubPages ? {
      router: { basepath },
      pages: [{ path: basepath }],
      prerender: { enabled: true, autoStaticPathsDiscovery: false },
    } : {}),
  },
  // Pre-bundle UI deps so Vite doesn't re-optimize mid-session (that caused duplicate React copies).
  vite: {
    base: githubPages ? basepath : "/",
    optimizeDeps: {
      include: ["@radix-ui/react-dialog", "lucide-react", "@standardnotes/component-relay"],
    },
  },
});
