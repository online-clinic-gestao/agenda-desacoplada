import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const isIifeBuild = process.env.BUILD_TARGET === "iife";

export default defineConfig({
  plugins: [react()],
  define: isIifeBuild
    ? {
        "process.env.NODE_ENV": JSON.stringify("production"),
      }
    : {},
  build: {
    lib: {
      entry: isIifeBuild
        ? path.resolve(__dirname, "src/register.ts")
        : path.resolve(__dirname, "src/App.tsx"),
      name: "DecoupledAgenda",
      formats: isIifeBuild ? ["iife"] : ["es", "cjs"],
      fileName: (format) =>
        isIifeBuild
          ? `decoupled-agenda.iife.js`
          : `decoupled-agenda.${format}.js`,
    },
    outDir: isIifeBuild ? "dist/iife" : "dist/esm",
    rollupOptions: {
      external: isIifeBuild ? [] : ["react", "react-dom"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
  },
});
