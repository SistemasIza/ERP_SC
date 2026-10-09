const fs = require('fs');
const path = require('path');
const targetClass = 'flex items-center justify-center gap-2 px-4 h-10 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-semibold transition-all shadow-lg hover:scale-105 active:scale-95';

function walk(dir) {
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const regex = /<Button leftIcon=\{<Plus className="w-4 h-4" \/>\}>\s*([\s\S]*?)\s*<\/Button>/g;
      let changed = false;
      content = content.replace(regex, (match, text) => {
        changed = true;
        let newText = text.trim();
        if (newText === 'Configurar Horario') newText = 'Nuevo Horario';
        return '<button className="' + targetClass + '">\n            <Plus className="w-4 h-4" />\n            ' + newText + '\n          </button>';
      });

      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated:', fullPath);
      }
    }
  }
}
walk('frontend/src/modules');
