import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BACKEND_URL = process.env.BACKEND_URL ?? 'https://what-to-do-production-6c28.up.railway.app';
const MIGRATION_SECRET = process.env.MIGRATION_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;
const LOCAL_FILES_ROOT = process.env.LOCAL_FILES_ROOT ?? '/tmp/gcs-migration';

if (!MIGRATION_SECRET) { console.error('MIGRATION_SECRET is required'); process.exit(1); }
if (!DATABASE_URL) { console.error('DATABASE_URL is required'); process.exit(1); }

const db = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function uploadFile(localPath, targetPath) {
  const fileBuffer = fs.readFileSync(localPath);
  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer]), path.basename(localPath));
  formData.append('targetPath', targetPath);

  const res = await fetch(`${BACKEND_URL}/api/migration/upload`, {
    method: 'POST',
    headers: { 'x-migration-secret': MIGRATION_SECRET },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed for ${targetPath}: ${res.status} ${text}`);
  }
  return await res.json();
}

async function main() {
  await db.connect();
  console.log('Connected to DB');

  // ── GPX files ──────────────────────────────────────────────────────────────
  console.log('\n── Migrating GPX files ──');
  const { rows: routes } = await db.query('SELECT id, "originalFilePath" FROM routes ORDER BY id');

  for (const route of routes) {
    const oldPath = route.originalFilePath;
    const filename = path.basename(oldPath);

    // Determine local file location
    let localFile = path.join(LOCAL_FILES_ROOT, 'gpx-storage', filename);
    let targetPath = `gpx-storage/${filename}`;

    // Handle GCS-style paths (gpx/userId/filename)
    if (oldPath.startsWith('gpx/')) {
      localFile = path.join(LOCAL_FILES_ROOT, oldPath);
      targetPath = oldPath;
    }

    if (!fs.existsSync(localFile)) {
      console.log(`  [SKIP] Route ${route.id}: file not found locally (${filename})`);
      continue;
    }

    try {
      await uploadFile(localFile, targetPath);
      await db.query('UPDATE routes SET "originalFilePath" = $1 WHERE id = $2', [targetPath, route.id]);
      console.log(`  [OK]   Route ${route.id}: ${filename} → ${targetPath}`);
    } catch (err) {
      console.error(`  [ERR]  Route ${route.id}: ${err.message}`);
    }
  }

  // ── Photo files ────────────────────────────────────────────────────────────
  console.log('\n── Migrating photos ──');
  const { rows: photos } = await db.query('SELECT id, "filePath", url FROM route_photos ORDER BY id');

  for (const photo of photos) {
    const oldFilePath = photo.filePath;
    const filename = path.basename(oldFilePath);

    // Determine local file location
    let localFile = path.join(LOCAL_FILES_ROOT, 'photo-storage', filename);
    let targetPath = `photo-storage/${filename}`;

    // Handle GCS-style paths (photos/userId/filename)
    if (oldFilePath.startsWith('photos/')) {
      localFile = path.join(LOCAL_FILES_ROOT, oldFilePath);
      targetPath = oldFilePath;
    }

    if (!fs.existsSync(localFile)) {
      console.log(`  [SKIP] Photo ${photo.id}: file not found locally (${filename})`);
      continue;
    }

    try {
      await uploadFile(localFile, targetPath);
      const newUrl = `/uploads/${targetPath}`;
      await db.query(
        'UPDATE route_photos SET "filePath" = $1, url = $2 WHERE id = $3',
        [targetPath, newUrl, photo.id]
      );
      console.log(`  [OK]   Photo ${photo.id}: ${filename} → ${newUrl}`);
    } catch (err) {
      console.error(`  [ERR]  Photo ${photo.id}: ${err.message}`);
    }
  }

  await db.end();
  console.log('\nMigration complete.');
}

main().catch(err => { console.error(err); process.exit(1); });
