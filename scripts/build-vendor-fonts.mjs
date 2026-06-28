import { cp, copyFile, mkdir, rm, stat, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

async function mustExist(file) {
  try {
    await stat(file);
  } catch {
    console.error(`Missing required font asset: ${file}`);
    console.error("Run `npm install` first.");
    process.exit(1);
  }
}

async function copyDirClean(source, target) {
  await mustExist(source);
  await rm(target, { recursive: true, force: true });
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target, { recursive: true });
  console.log(`Copied ${source} -> ${target}`);
}

async function copyFileClean(source, target) {
  await mustExist(source);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(source, target);
  console.log(`Copied ${source} -> ${target}`);
}

// Copy LXGW WenKai Screen
await copyDirClean(
  path.join(root, "node_modules", "lxgw-wenkai-screen-web", "lxgwwenkaiscreen"),
  path.join(root, "static", "vendor", "fonts", "lxgw-wenkai-screen", "regular"),
);

// Copy Maple Mono CN Regular
await copyDirClean(
  path.join(root, "node_modules", "@chinese-fonts", "maple-mono-cn", "dist", "MapleMono-CN-Regular"),
  path.join(root, "static", "vendor", "fonts", "maple-mono-cn", "regular"),
);

// Copy Maple Mono CN Italic
await copyDirClean(
  path.join(root, "node_modules", "@chinese-fonts", "maple-mono-cn", "dist", "MapleMono-CN-Italic"),
  path.join(root, "static", "vendor", "fonts", "maple-mono-cn", "italic"),
);

// Copy Material Symbols Rounded
await copyFileClean(
  path.join(root, "node_modules", "material-symbols", "material-symbols-rounded.woff2"),
  path.join(root, "static", "vendor", "fonts", "material-symbols", "material-symbols-rounded.woff2"),
);

// Subset Cormorant Garamond Italic
async function subsetCormorantGaramond() {
  const fontDir = path.join(root, "static", "vendor", "fonts", "cormorant-garamond");
  const tempTtf = path.join(root, "tools", "font-subsets", "source", "cormorant-garamond", "CormorantGaramond-Italic.ttf");
  const targetWoff2 = path.join(fontDir, "cormorant-garamond-meta.woff2");

  await mkdir(fontDir, { recursive: true });

  console.log("Subsetting Cormorant Garamond...");
  const chars = (await readFile(path.join(root, "tools", "font-subsets", "glyphs", "cormorant-garamond-meta.txt"), "utf-8")).trim();
  await new Promise((resolve, reject) => {
    const subset = spawn("pyftsubset", [
      tempTtf,
      `--text=${chars}`,
      "--flavor=woff2",
      `--output-file=${targetWoff2}`
    ], { stdio: "inherit" });
    subset.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pyftsubset failed with code ${code}`));
    });
  });
  console.log(`Subsampled Cormorant Garamond -> ${targetWoff2}`);
}

async function subsetSettingsFonts() {
  const fontDir = path.join(root, "static", "vendor", "fonts", "settings");
  const tempEng = path.join(root, "tools", "font-subsets", "source", "cormorant-garamond", "CormorantGaramond.ttf");
  const tempZh = path.join(root, "tools", "font-subsets", "source", "noto-serif-sc", "NotoSerifSC.ttf");
  
  const targetEng = path.join(fontDir, "cormorant-garamond-settings.woff2");
  const targetZh = path.join(fontDir, "noto-serif-sc-settings.woff2");

  await mkdir(fontDir, { recursive: true });

  console.log("Subsetting settings fonts...");
  
  // English: basic ASCII
  await new Promise((resolve, reject) => {
    const subset = spawn("pyftsubset", [
      tempEng,
      "--unicodes=U+0020-007F",
      "--flavor=woff2",
      `--output-file=${targetEng}`
    ], { stdio: "inherit" });
    subset.on("close", (code) => code === 0 ? resolve() : reject(new Error(`pyftsubset failed with code ${code}`)));
  });
  console.log(`Subsampled Settings Eng -> ${targetEng}`);

  // Chinese: exact subset from settings-overlay.html
  const zhChars = (await readFile(path.join(root, "tools", "font-subsets", "glyphs", "noto-serif-sc-settings.txt"), "utf-8")).trim();
  await new Promise((resolve, reject) => {
    const subset = spawn("pyftsubset", [
      tempZh,
      `--text=${zhChars}`,
      "--flavor=woff2",
      `--output-file=${targetZh}`
    ], { stdio: "inherit" });
    subset.on("close", (code) => code === 0 ? resolve() : reject(new Error(`pyftsubset failed with code ${code}`)));
  });
  console.log(`Subsampled Settings Zh -> ${targetZh}`);
}

await subsetCormorantGaramond();
await subsetSettingsFonts();

console.log("Vendor fonts copied successfully.");
