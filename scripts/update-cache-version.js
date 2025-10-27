import fs from 'fs';
import path from 'path';

const swPath = path.join(process.cwd(), 'public', 'sw.js');
const content = fs.readFileSync(swPath, 'utf-8');

// Найти текущую версию и увеличить её
const versionMatch = content.match(/const CACHE_NAME = 'gymlog-pwa-cache-v(\d+)'/);
if (versionMatch) {
  const currentVersion = parseInt(versionMatch[1], 10);
  const newVersion = currentVersion + 1;
  const updatedContent = content.replace(
    /const CACHE_NAME = 'gymlog-pwa-cache-v\d+'/,
    `const CACHE_NAME = 'gymlog-pwa-cache-v${newVersion}'`
  );
  fs.writeFileSync(swPath, updatedContent, 'utf-8');
  console.log(`✓ Версия кэша обновлена: v${currentVersion} → v${newVersion}`);
} else {
  console.warn('⚠ Не удалось найти версию кэша в sw.js');
}
