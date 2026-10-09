
const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "frontend", "src");

const moves = [
  { old: "components/dashboard", new: "modules/dashboard/components", isDir: true },
  { old: "components/flow", new: "modules/automation/components", isDir: true },
  { old: "components/settings", new: "modules/settings/components", isDir: true },
  { old: "components/QRCodeDisplay.tsx", new: "modules/inbox/components/QRCodeDisplay.tsx", isDir: false },
  { old: "components/TriggerInput.tsx", new: "modules/automation/components/TriggerInput.tsx", isDir: false },
];

// Helper to walk dir
function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

// 1. First, create directories and move files
for (const move of moves) {
  const oldPath = path.join(srcDir, move.old);
  const newPath = path.join(srcDir, move.new);
  
  if (!fs.existsSync(oldPath)) {
    console.log(`Skipping ${oldPath}, does not exist`);
    continue;
  }

  // create parent of newPath
  const parent = path.dirname(newPath);
  if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });

  fs.renameSync(oldPath, newPath);
  console.log(`Moved ${move.old} to ${move.new}`);
}

// 2. We need to update imports.
// For files that were moved, their depth increased by 1 (e.g. components/dashboard (depth 2) -> modules/dashboard/components (depth 3))
// OR components/QRCodeDisplay.tsx (depth 1) -> modules/inbox/components/QRCodeDisplay.tsx (depth 3)
// To be safe, we will just fix ALL files in the `src` directory by rewriting their imports based on absolute paths.

function getImportPath(fromFile, toFile) {
    let rel = path.relative(path.dirname(fromFile), toFile).replace(/\\/g, "/");
    if (!rel.startsWith(".")) rel = "./" + rel;
    // remove extension
    rel = rel.replace(/\.tsx?$/, "");
    return rel;
}

// Read all files
const allFiles = [];
walkDir(srcDir, (f) => {
  if (f.endsWith(".tsx") || f.endsWith(".ts")) allFiles.push(f);
});

// We need a map of component names to their new absolute paths to fix imports
// Since we might not know exactly what was imported, a simpler Regex approach for known paths:

const replacements = [
  // If a file imports from dashboard components, the old import might have looked like:
  // `../../components/dashboard/X` or `../../../components/dashboard/X`
  // We can just replace any `.*components/dashboard/(.*)` with the correct relative path.
];

for (const file of allFiles) {
  let content = fs.readFileSync(file, "utf-8");
  let originalContent = content;

  // Let us just do a simple string replacement for the shifted directories
  // We look for any import that ends up hitting `components/dashboard`, `components/flow`, etc.
  
  // A simple hack: since we know the exact old relative paths are broken, 
  // let us let TypeScript tell us what is broken, or just replace occurrences.
  // Actually, replacing `components/dashboard` with `modules/dashboard/components`
  // and then running a lint/fix is hard. Let us do it manually.

  // 1. Fix internal imports inside the MOVED folders (they need an extra `../`)
  if (file.includes(path.normalize("modules/dashboard/components")) || 
      file.includes(path.normalize("modules/automation/components")) ||
      file.includes(path.normalize("modules/settings/components"))) {
    // If it is inside the new components dir, it was moved 1 level deeper.
    // So `../` becomes `../../`, `../../` becomes `../../../` etc.
    // Wait, let us only replace imports that start with `.`
    // Actually, only those that went up to `src` need to be changed.
    content = content.replace(/from [\x27\x22](\.\.\/)+/g, (match) => {
       return match.replace(/from [\x27\x22]/, "$&../");
    });
  }
  
  if (file.includes(path.normalize("modules/inbox/components/QRCodeDisplay.tsx")) ||
      file.includes(path.normalize("modules/automation/components/TriggerInput.tsx"))) {
      // moved 2 levels deeper
      content = content.replace(/from [\x27\x22](\.\.\/)+/g, (match) => {
       return match.replace(/from [\x27\x22]/, "$&../../");
    });
  }

  // 2. Fix imports pointing TO the moved components
  // E.g. in Dashboard.tsx: `from "../../../components/dashboard/MetricCard"` 
  // becomes `from "../components/MetricCard"` (since they are now in the same module)
  
  // For dashboard pages
  if (file.includes(path.normalize("modules/dashboard/pages"))) {
    content = content.replace(/from [\x27\x22].*\/components\/dashboard\//g, "from \x27../components/");
  }
  
  // For automation pages
  if (file.includes(path.normalize("modules/automation/pages"))) {
    content = content.replace(/from [\x27\x22].*\/components\/flow\//g, "from \x27../components/");
    content = content.replace(/from [\x27\x22].*\/components\/TriggerInput[\x27\x22]/g, "from \x27../components/TriggerInput\x27");
  }

  // For settings pages
  if (file.includes(path.normalize("modules/settings/pages"))) {
    content = content.replace(/from [\x27\x22].*\/components\/settings\//g, "from \x27../components/");
  }
  
  // For inbox pages
  if (file.includes(path.normalize("modules/inbox/pages"))) {
    content = content.replace(/from [\x27\x22].*\/components\/QRCodeDisplay[\x27\x22]/g, "from \x27../components/QRCodeDisplay\x27");
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content, "utf-8");
  }
}

console.log("Imports updated.");

