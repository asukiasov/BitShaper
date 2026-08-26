import { defineConfig } from "vite";

// GitHub Pages serves this app from a project page
// (https://asukiasov.github.io/BitShaper/), not a domain root, so every
// built asset URL must be prefixed with the repo name.
export default defineConfig({
  base: "/BitShaper/",
});
