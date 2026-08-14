import fs from 'fs';
import path from 'path';

function pngToIco(pngBuffer) {
  // Read PNG width & height from IHDR (bytes 16-24 of PNG)
  const width = pngBuffer.readUInt32BE(16);
  const height = pngBuffer.readUInt32BE(20);
  
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // Type 1 = ICO
  icoHeader.writeUInt16LE(1, 4); // 1 image

  const icoEntry = Buffer.alloc(16);
  icoEntry.writeUInt8(width >= 256 ? 0 : width, 0);   // Width (0 = 256px)
  icoEntry.writeUInt8(height >= 256 ? 0 : height, 1); // Height (0 = 256px)
  icoEntry.writeUInt8(0, 2);                          // Color palette count
  icoEntry.writeUInt8(0, 3);                          // Reserved
  icoEntry.writeUInt16LE(1, 4);                       // Color planes
  icoEntry.writeUInt16LE(32, 6);                      // Bits per pixel
  icoEntry.writeUInt32LE(pngBuffer.length, 8);         // Image size in bytes
  icoEntry.writeUInt32LE(22, 12);                     // Image data offset (6 + 16 = 22)

  return Buffer.concat([icoHeader, icoEntry, pngBuffer]);
}

const inputPng = path.join(process.cwd(), 'resources', 'icon.png');
const outputIco = path.join(process.cwd(), 'resources', 'icon.ico');

if (fs.existsSync(inputPng)) {
  const pngData = fs.readFileSync(inputPng);
  const icoData = pngToIco(pngData);
  fs.writeFileSync(outputIco, icoData);
  console.log(`Generated ${outputIco} (${icoData.length} bytes) successfully!`);
} else {
  console.error(`Missing ${inputPng}`);
  process.exit(1);
}
