import fs from "fs";
import path from "path";

const distDir = path.resolve("dist");
const indexPath = path.join(distDir, "index.html");
const notFoundPath = path.join(distDir, "404.html");

if (!fs.existsSync(indexPath)) {
  console.error("dist/index.html not found. Run `npm run build` first.");
  process.exit(1);
}

fs.copyFileSync(indexPath, notFoundPath);
console.log("Created dist/404.html for GitHub Pages SPA fallback.");
