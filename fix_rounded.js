const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'frontend/src/components/flow');

function processDir(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // We want to replace rounded-2xl, rounded-3xl, rounded-xl, rounded-lg, rounded-[2.5rem], rounded-[2rem] with rounded-sm
      // But we shouldn't replace rounded-full, rounded-sm, rounded-md, or rounded (by itself)
      
      const beforeLength = content.length;
      content = content.replace(/rounded-(2xl|3xl|xl|lg)/g, 'rounded-sm');
      content = content.replace(/rounded-\[2\.5rem\]/g, 'rounded-sm');
      content = content.replace(/rounded-\[2rem\]/g, 'rounded-sm');
      content = content.replace(/rounded-t-3xl/g, 'rounded-t-sm');
      content = content.replace(/rounded-b-3xl/g, 'rounded-b-sm');
      
      if (content.length !== beforeLength || true) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${file}`);
      }
    }
  }
}

processDir(dir);
