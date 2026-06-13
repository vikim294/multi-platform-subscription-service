import fs from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const sourceDir = path.resolve(rootDir, 'browser-extension/dist');
const outputDir = path.resolve(rootDir, 'server/public/downloads');
const outputFile = path.join(outputDir, 'mpss-browser-extension.zip');
const zipRootName = 'mpss-browser-extension';
const ignoredNames = new Set(['.DS_Store']);
const buildDate = new Date();
const dosTimestamp = toDosTimestamp(buildDate);
const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  }
  return value >>> 0;
});

await fs.access(path.join(sourceDir, 'manifest.json')).catch(() => {
  throw new Error('browser-extension/dist/manifest.json not found. Run pnpm build:extension first.');
});
await fs.mkdir(outputDir, { recursive: true });

const files = await collectFiles(sourceDir);
const entries = [];
const chunks = [];
let offset = 0;

for (const filePath of files) {
  const relativePath = path.relative(sourceDir, filePath).split(path.sep).join('/');
  const zipPath = `${zipRootName}/${relativePath}`;
  const data = await fs.readFile(filePath);
  const crc = crc32(data);
  const localHeader = createLocalHeader(zipPath, data.length, crc);

  entries.push({
    zipPath,
    size: data.length,
    crc,
    offset,
  });

  chunks.push(localHeader, data);
  offset += localHeader.length + data.length;
}

const centralDirectoryStart = offset;
const centralDirectoryChunks = entries.map(createCentralDirectoryHeader);
const centralDirectorySize = centralDirectoryChunks.reduce((sum, chunk) => sum + chunk.length, 0);
const endOfCentralDirectory = createEndOfCentralDirectory(entries.length, centralDirectorySize, centralDirectoryStart);

await fs.writeFile(outputFile, Buffer.concat([...chunks, ...centralDirectoryChunks, endOfCentralDirectory]));

console.log(`Created ${path.relative(rootDir, outputFile)} with ${entries.length} files.`);

async function collectFiles(dir) {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    dirents
      .filter((dirent) => !ignoredNames.has(dirent.name))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(async (dirent) => {
        const fullPath = path.join(dir, dirent.name);
        if (dirent.isDirectory()) return collectFiles(fullPath);
        if (dirent.isFile()) return [fullPath];
        return [];
      }),
  );
  return nested.flat();
}

function createLocalHeader(zipPath, size, crc) {
  const name = Buffer.from(zipPath, 'utf8');
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x0800, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(dosTimestamp.time, 10);
  header.writeUInt16LE(dosTimestamp.date, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(size, 18);
  header.writeUInt32LE(size, 22);
  header.writeUInt16LE(name.length, 26);
  header.writeUInt16LE(0, 28);
  return Buffer.concat([header, name]);
}

function createCentralDirectoryHeader(entry) {
  const name = Buffer.from(entry.zipPath, 'utf8');
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0x0800, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(dosTimestamp.time, 12);
  header.writeUInt16LE(dosTimestamp.date, 14);
  header.writeUInt32LE(entry.crc, 16);
  header.writeUInt32LE(entry.size, 20);
  header.writeUInt32LE(entry.size, 24);
  header.writeUInt16LE(name.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(entry.offset, 42);
  return Buffer.concat([header, name]);
}

function createEndOfCentralDirectory(entryCount, centralDirectorySize, centralDirectoryStart) {
  const footer = Buffer.alloc(22);
  footer.writeUInt32LE(0x06054b50, 0);
  footer.writeUInt16LE(0, 4);
  footer.writeUInt16LE(0, 6);
  footer.writeUInt16LE(entryCount, 8);
  footer.writeUInt16LE(entryCount, 10);
  footer.writeUInt32LE(centralDirectorySize, 12);
  footer.writeUInt32LE(centralDirectoryStart, 16);
  footer.writeUInt16LE(0, 20);
  return footer;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toDosTimestamp(date) {
  const year = Math.max(1980, Math.min(2107, date.getFullYear()));
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  return {
    time: (hours << 11) | (minutes << 5) | seconds,
    date: ((year - 1980) << 9) | (month << 5) | day,
  };
}
