const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname);
const envVars = new Set();

function walk(currentDir) {
  const files = fs.readdirSync(currentDir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git') continue;
    const fullPath = path.join(currentDir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const matches = content.match(/process\.env\.[A-Z_0-9]+/g);
      if (matches) {
        for (const match of matches) {
          envVars.add(match.replace('process.env.', ''));
        }
      }
    }
  }
}

walk(dir);
console.log(Array.from(envVars).sort().join('\n'));
