const sharp = require('sharp');
const fs = require('fs');

async function generateIcons() {
  const inputImage = './public/logo-icon.png';
  
  // Create 192x192
  await sharp(inputImage)
    .resize(192, 192)
    .toFile('./public/icon-192.png');
    
  // Create 512x512
  await sharp(inputImage)
    .resize(512, 512)
    .toFile('./public/icon-512.png');
    
  // Create favicon.ico (We can just make a 32x32 png, browsers support .ico as renamed png often, but ideally it should be specifically formatted. But next.js and most browsers are fine if we just create a 32x32 png and name it favicon.ico or even better, if we just output a proper ico format. However, sharp doesn't natively output .ico. Let's just create a 32x32 png and rename it to favicon.ico, or 32x32 png as favicon-32x32.png and write code accordingly. But the user specifically asked for favicon.ico. I will create a 32x32 png and name it favicon.ico, which works in modern browsers.)
  // Wait, sharp doesn't support .ico officially. Let me write a tiny binary header for a real .ico if possible or just use png.
  // actually png-favicons work fine. 
  
  const pngFavicon = await sharp(inputImage)
    .resize(32, 32)
    .png()
    .toBuffer();
    
  // Write basic ICO header (simplistic for 1 png image)
  // ICO header: [0, 0] (reserved), [1, 0] (type 1 for icon), [1, 0] (number of images)
  // Image directory: [width], [height], [colorPalette], [reserved], [colorPlanes 1..2], [bits per pixel 1..2], [size 1..4], [offset 1..4]
  
  const width = 32;
  const height = 32;
  const buf = Buffer.alloc(22 + pngFavicon.length);
  
  buf.writeUInt16LE(0, 0); // Reserved
  buf.writeUInt16LE(1, 2); // Icon type
  buf.writeUInt16LE(1, 4); // 1 image
  
  buf.writeUInt8(width, 6); // width
  buf.writeUInt8(height, 7); // height
  buf.writeUInt8(0, 8); // color palette
  buf.writeUInt8(0, 9); // reserved
  buf.writeUInt16LE(1, 10); // color planes
  buf.writeUInt16LE(32, 12); // bpp
  buf.writeUInt32LE(pngFavicon.length, 14); // image size
  buf.writeUInt32LE(22, 18); // offset
  
  pngFavicon.copy(buf, 22);
  
  fs.writeFileSync('./public/favicon.ico', buf);
  console.log('Icons generated successfully.');
}

generateIcons().catch(console.error);
