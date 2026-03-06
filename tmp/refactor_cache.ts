import { promises as fs } from 'fs';
import path from 'path';

const dirs = ['lib', 'app', 'tests'];

async function processFile(filePath: string) {
  const content = await fs.readFile(filePath, 'utf-8');
  const changed = false;

  if (content.includes('getFromCache') || content.includes('setInCache')) {
    // Replace setInCache(...) with await setInCache(...)
    // Make sure we don't accidentally add double await
    const newContent = content
      .replace(/(?<!await\s)setInCache\(/g, 'await setInCache(')
      .replace(/(?<!await\s)getFromCache</g, 'await getFromCache<')
      .replace(/(?<!await\s)getFromCache\(/g, 'await getFromCache(')
      // Fix!!getFromCache("ml_circuit_tripped") to !!(await getFromCache("ml_circuit_tripped"))
      .replace(/!!await getFromCache/g, '!!(await getFromCache')
      // Fix (await getFromCache("ml_circuit_tripped"))
      .replace(/\(await getFromCache/g, '(await getFromCache');

    if (newContent !== content) {
      await fs.writeFile(filePath, newContent, 'utf-8');
      console.log('Updated', filePath);
    }
  }
}

async function walk(dir: string) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const res = path.resolve(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(res);
    } else if (res.endsWith('.ts') || res.endsWith('.tsx')) {
      await processFile(res);
    }
  }
}

async function main() {
  for (const dir of dirs) {
    await walk(path.resolve(process.cwd(), dir));
  }
}

main().catch(console.error);
