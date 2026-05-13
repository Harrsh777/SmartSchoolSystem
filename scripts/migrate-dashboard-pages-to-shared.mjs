// Moves each static app/dashboard/[school]/.../page.tsx into shared/modules/.../page.tsx,
// replaces admin page with re-export, adds teacher page under app/teacher/dashboard/[school]/.
// Skips route segments containing '[' (dynamic routes).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dashboardRoot = path.join(root, 'app', 'dashboard', '[school]');
const teacherSchoolRoot = path.join(root, 'app', 'teacher', 'dashboard', '[school]');

const ADMIN_REEXPORT = (rel) =>
  `'use client';\n\nexport { default } from '@/shared/modules/${rel}/page';\n`;

function isAlreadyMigratedAdminSource(src) {
  return (
    src.includes("export { default } from '@/shared/modules/") &&
    src.split('\n').length < 12
  );
}

function walk(dir, relParts = []) {
  /** @type {{ rel: string; adminPage: string }[]} */
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue;
    if (ent.name.includes('[')) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...walk(p, [...relParts, ent.name]));
    } else if (ent.name === 'page.tsx') {
      const rel = relParts.join('/');
      if (!rel) continue;
      out.push({ rel, adminPage: p });
    }
  }
  return out;
}

function mkdirpSync(d) {
  fs.mkdirSync(d, { recursive: true });
}

const entries = walk(dashboardRoot).sort((a, b) => a.rel.localeCompare(b.rel));

let migrated = 0;
for (const { rel, adminPage } of entries) {
  const sharedPage = path.join(root, 'shared', 'modules', ...rel.split('/'), 'page.tsx');
  const teacherPage = path.join(teacherSchoolRoot, ...rel.split('/'), 'page.tsx');

  const body = fs.readFileSync(adminPage, 'utf8');
  mkdirpSync(path.dirname(sharedPage));
  mkdirpSync(path.dirname(teacherPage));

  if (!fs.existsSync(sharedPage)) {
    if (isAlreadyMigratedAdminSource(body)) {
      console.error('Skip (no shared backup):', rel);
      continue;
    }
    fs.writeFileSync(sharedPage, body, 'utf8');
  }

  fs.writeFileSync(adminPage, ADMIN_REEXPORT(rel), 'utf8');
  fs.writeFileSync(teacherPage, ADMIN_REEXPORT(rel), 'utf8');
  migrated += 1;
}

console.log('Migrated', migrated, 'pages to shared/modules + teacher/[school]');
