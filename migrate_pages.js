
const fs = require("fs");
const path = require("path");

const mappings = {
  "Login.tsx": "auth",
  "Register.tsx": "auth",
  "RecoverPassword.tsx": "auth",
  "ProfileSelection.tsx": "auth",
  "Dashboard.tsx": "dashboard",
  "Analytics.tsx": "dashboard",
  "Leads.tsx": "crm",
  "Pipeline.tsx": "crm",
  "Clients.tsx": "crm",
  "Organizations.tsx": "crm",
  "Catalogs.tsx": "crm",
  "CRM.tsx": "crm",
  "Conversations.tsx": "inbox",
  "Connections.tsx": "inbox",
  "WhatsAppManager.tsx": "inbox",
  "WhatsAppQR.tsx": "inbox",
  "FacebookConfig.tsx": "inbox",
  "InstagramConfig.tsx": "inbox",
  "TelegramConfig.tsx": "inbox",
  "TikTokConfig.tsx": "inbox",
  "FlowManager.tsx": "automation",
  "FlowBuilder.tsx": "automation",
  "Billing.tsx": "billing",
  "Reports.tsx": "reports",
  "StaffManagement.tsx": "hr",
  "Settings.tsx": "settings",
};

const pagesDir = path.join(__dirname, "frontend", "src", "pages");
const modulesDir = path.join(__dirname, "frontend", "src", "modules");
const appTsxPath = path.join(__dirname, "frontend", "src", "App.tsx");

// 1. Update App.tsx
let appTsxContent = fs.readFileSync(appTsxPath, "utf-8");

for (const [fileName, moduleName] of Object.entries(mappings)) {
  const baseName = fileName.replace(".tsx", "");
  
  // Create target directory
  const targetDir = path.join(modulesDir, moduleName, "pages");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const sourcePath = path.join(pagesDir, fileName);
  const targetPath = path.join(targetDir, fileName);

  if (fs.existsSync(sourcePath)) {
    // Read file and update imports
    let content = fs.readFileSync(sourcePath, "utf-8");
    // Replace `from "../` with `from "../../../`
    content = content.replace(/from \x27\.\.\//g, "from \x27../../../");
    content = content.replace(/from \x22\.\.\//g, "from \x22../../../");
    // Wait, if it was `from "../../` we need to replace it with `from "../../../../`
    // So order matters:
    // First: replace `../../` with `../../../../`
    // Then: replace `../(not .)` with `../../../(not .)` -> Actually simpler using regex function
    
    // Let us reload the original content to do it safely
    content = fs.readFileSync(sourcePath, "utf-8");
    content = content.replace(/from [\x27\x22](\.\.\/)+/g, (match) => {
       // match is something like `from "../` or `from "../../`
       const quote = match.charAt(5); // either ' or ""
       const prefix = match.slice(0, 6); // `from "`
       const dots = match.slice(6); // `../` or `../../`
       // we just prepend `../../` to whatever the relative path was
       return prefix + "../../" + dots;
    });
    
    fs.writeFileSync(targetPath, content, "utf-8");
    console.log(`Moved ${fileName} to ${moduleName}/pages/`);
    
    // delete old file
    fs.unlinkSync(sourcePath);
  }

  // Update App.tsx
  // looking for `./pages/${baseName}`
  const regex1 = new RegExp(`\\.\\/pages\\/${baseName}(?![a-zA-Z])`, "g");
  appTsxContent = appTsxContent.replace(regex1, `./modules/${moduleName}/pages/${baseName}`);
}

fs.writeFileSync(appTsxPath, appTsxContent, "utf-8");
console.log("Updated App.tsx");


