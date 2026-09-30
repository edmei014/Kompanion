import { createReadStream, stat } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { defineConfig } from "vite";

const AMP_IMAGE_ROUTE = "/images/amps/";
const AMP_IMAGE_RESOURCE_DIR = resolve("src-tauri/resources/images/amps");
const AMP_PERFORMANCE_THUMB_ROUTE = "/images/amps-performance/";
const AMP_PERFORMANCE_THUMB_RESOURCE_DIR = resolve(
  "src-tauri/resources/images/amps-performance"
);

function contentTypeForImagePath(imagePath) {
  const extension = extname(imagePath).toLowerCase();

  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  return "image/png";
}

function serveTauriImageDirectory(routePrefix, resourceDir, pluginName) {
  return {
    name: pluginName,
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

        if (!pathname.startsWith(routePrefix)) {
          next();
          return;
        }

        const filename = pathname.slice(routePrefix.length);
        if (!filename || filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
          next();
          return;
        }

        const imagePath = resolve(resourceDir, filename);
        if (!imagePath.startsWith(`${resourceDir}${sep}`)) {
          next();
          return;
        }

        stat(imagePath, (error, fileStats) => {
          if (error || !fileStats.isFile()) {
            next();
            return;
          }

          response.setHeader("Content-Type", contentTypeForImagePath(imagePath));
          response.setHeader("Content-Length", fileStats.size);
          createReadStream(imagePath).pipe(response);
        });
      });
    }
  };
}

function serveAmpImagesFromTauriResources() {
  return serveTauriImageDirectory(
    AMP_IMAGE_ROUTE,
    AMP_IMAGE_RESOURCE_DIR,
    "serve-amp-images-from-tauri-resources"
  );
}

function serveAmpPerformanceThumbnailsFromTauriResources() {
  return serveTauriImageDirectory(
    AMP_PERFORMANCE_THUMB_ROUTE,
    AMP_PERFORMANCE_THUMB_RESOURCE_DIR,
    "serve-amp-performance-thumbnails-from-tauri-resources"
  );
}

export default defineConfig({
  base: "./",

  clearScreen: false,

  plugins: [
    serveAmpImagesFromTauriResources(),
    serveAmpPerformanceThumbnailsFromTauriResources()
  ],

  server: {
    port: 1420,
    strictPort: true
  },

  envPrefix: ["VITE_", "TAURI_"]
});