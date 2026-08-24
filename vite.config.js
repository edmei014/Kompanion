import { createReadStream, stat } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { defineConfig } from "vite";

const AMP_IMAGE_ROUTE = "/images/amps/";
const AMP_IMAGE_RESOURCE_DIR = resolve("src-tauri/resources/images/amps");

function serveAmpImagesFromTauriResources() {
  return {
    name: "serve-amp-images-from-tauri-resources",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        let pathname;

        try {
          pathname = decodeURIComponent(
            new URL(request.url ?? "/", "http://vite.local").pathname
          );
        } catch {
          next();
          return;
        }

        if (!pathname.startsWith(AMP_IMAGE_ROUTE)) {
          next();
          return;
        }

        const filename = pathname.slice(AMP_IMAGE_ROUTE.length);
        if (!filename || filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
          next();
          return;
        }

        const imagePath = resolve(AMP_IMAGE_RESOURCE_DIR, filename);
        if (!imagePath.startsWith(`${AMP_IMAGE_RESOURCE_DIR}${sep}`)) {
          next();
          return;
        }

        stat(imagePath, (error, fileStats) => {
          if (error || !fileStats.isFile()) {
            next();
            return;
          }

          const contentType =
            extname(imagePath).toLowerCase() === ".jpg" ? "image/jpeg" : "image/png";
          response.setHeader("Content-Type", contentType);
          response.setHeader("Content-Length", fileStats.size);
          createReadStream(imagePath).pipe(response);
        });
      });
    }
  };
}

export default defineConfig({
  base: "./",

  clearScreen: false,

  plugins: [serveAmpImagesFromTauriResources()],

  server: {
    port: 1420,
    strictPort: true
  },

  envPrefix: ["VITE_", "TAURI_"]
});