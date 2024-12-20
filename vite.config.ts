import path from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "SpinHttp",
      fileName: (format) => `spin-http.${format}.js`,
    },
    rollupOptions: {
      external: ["undici", "url"],
      output: {
        globals: {
          undici: "undici",
        },
      },
    },
  },
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
  ],
});
