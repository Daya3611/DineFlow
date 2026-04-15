import fs from 'fs';
import path from 'path';

function replaceInDir(dir) {
  const items = fs.readdirSync(dir);
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.tsx') && !fullPath.includes('sonner.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('from "sonner"')) {
        content = content.replace(/import\s+\{\s*toast\s*\}\s*from\s*"sonner";?/g, 'import { toast } from "sonner";');
        fs.writeFileSync(fullPath, content);
      }
    }
  });
}

replaceInDir('e:/DineFlow/app');
replaceInDir('e:/DineFlow/components');
