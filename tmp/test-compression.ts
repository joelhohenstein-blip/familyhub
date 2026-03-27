import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const testDir = '/tmp/compression-test';
const outputDir = '/tmp/compression-output';

if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

async function createTestImages() {
  console.log('=== Creating Test Images ===\n');

  await sharp({
    create: {
      width: 1920,
      height: 1080,
      channels: 3,
      background: { r: 100, g: 150, b: 200 }
    }
  })
    .jpeg({ quality: 85 })
    .toFile(path.join(testDir, 'photo-landscape.jpg'));
  console.log('✅ Created photo-landscape.jpg (1920x1080)');

  await sharp({
    create: {
      width: 1080,
      height: 1920,
      channels: 3,
      background: { r: 200, g: 100, b: 150 }
    }
  })
    .jpeg({ quality: 85 })
    .toFile(path.join(testDir, 'photo-portrait.jpg'));
  console.log('✅ Created photo-portrait.jpg (1080x1920)');

  await sharp({
    create: {
      width: 800,
      height: 600,
      channels: 3,
      background: { r: 255, g: 255, b: 255 }
    }
  })
    .png()
    .toFile(path.join(testDir, 'graphic-simple.png'));
  console.log('✅ Created graphic-simple.png (800x600)\n');
}

async function testCompressionFormats() {
  console.log('=== Testing Compression Formats ===\n');

  const testImages = fs.readdirSync(testDir);
  const results: any[] = [];

  for (const file of testImages) {
    const inputPath = path.join(testDir, file);
    const stat = fs.statSync(inputPath);
    const originalSize = stat.size;

    console.log(`\n📷 Testing: ${file} (${(originalSize / 1024).toFixed(2)} KB)`);
    console.log('─'.repeat(60));

    const image = sharp(inputPath);
    const metadata = await image.metadata();
    console.log(`   Format: ${metadata.format}, Dimensions: ${metadata.width}x${metadata.height}`);

    // Test JPEG compression at different quality levels
    console.log('\n   JPEG Compression:');
    for (const quality of [50, 70, 85, 95]) {
      const outputPath = path.join(outputDir, `${path.basename(file, path.extname(file))}-q${quality}.jpg`);
      await sharp(inputPath).jpeg({ quality }).toFile(outputPath);
      const compressedStat = fs.statSync(outputPath);
      const savings = ((1 - compressedStat.size / originalSize) * 100).toFixed(1);
      console.log(`     Q${quality}: ${(compressedStat.size / 1024).toFixed(2)} KB (${savings}% savings)`);
      results.push({
        file,
        format: 'JPEG',
        quality,
        originalSize,
        compressedSize: compressedStat.size,
        savings: parseFloat(savings)
      });
    }

    // Test WebP compression
    console.log('\n   WebP Compression:');
    for (const quality of [50, 70, 85, 95]) {
      const outputPath = path.join(outputDir, `${path.basename(file, path.extname(file))}-q${quality}.webp`);
      await sharp(inputPath).webp({ quality }).toFile(outputPath);
      const compressedStat = fs.statSync(outputPath);
      const savings = ((1 - compressedStat.size / originalSize) * 100).toFixed(1);
      console.log(`     Q${quality}: ${(compressedStat.size / 1024).toFixed(2)} KB (${savings}% savings)`);
      results.push({
        file,
        format: 'WebP',
        quality,
        originalSize,
        compressedSize: compressedStat.size,
        savings: parseFloat(savings)
      });
    }

    // Test AVIF compression
    console.log('\n   AVIF Compression:');
    for (const quality of [50, 70, 85, 95]) {
      const outputPath = path.join(outputDir, `${path.basename(file, path.extname(file))}-q${quality}.avif`);
      await sharp(inputPath).avif({ quality }).toFile(outputPath);
      const compressedStat = fs.statSync(outputPath);
      const savings = ((1 - compressedStat.size / originalSize) * 100).toFixed(1);
      console.log(`     Q${quality}: ${(compressedStat.size / 1024).toFixed(2)} KB (${savings}% savings)`);
      results.push({
        file,
        format: 'AVIF',
        quality,
        originalSize,
        compressedSize: compressedStat.size,
        savings: parseFloat(savings)
      });
    }
  }

  return results;
}

async function generateReport(results: any[]) {
  console.log('\n\n=== COMPRESSION QUALITY/SIZE TRADEOFF ANALYSIS ===\n');

  const byFile = new Map<string, any[]>();
  for (const result of results) {
    if (!byFile.has(result.file)) byFile.set(result.file, []);
    byFile.get(result.file)!.push(result);
  }

  for (const [file, fileResults] of byFile) {
    console.log(`\n📊 ${file}`);
    console.log('═'.repeat(80));

    const byFormat = new Map<string, any[]>();
    for (const result of fileResults) {
      if (!byFormat.has(result.format)) byFormat.set(result.format, []);
      byFormat.get(result.format)!.push(result);
    }

    for (const [format, formatResults] of byFormat) {
      console.log(`\n  ${format}:`);
      console.log('  Quality    Size            Savings      Ratio');
      console.log('  ' + '-'.repeat(47));

      for (const result of formatResults.sort((a, b) => a.quality - b.quality)) {
        const ratio = (result.originalSize / result.compressedSize).toFixed(2);
        const sizeStr = (result.compressedSize / 1024).toFixed(2);
        const savingsStr = result.savings.toFixed(1);
        console.log(`  ${result.quality}         ${sizeStr} KB       ${savingsStr}%        ${ratio}x`);
      }
    }
  }

  // Summary statistics
  console.log('\n\n=== SUMMARY STATISTICS ===\n');

  const byFormat = new Map<string, any[]>();
  for (const result of results) {
    if (!byFormat.has(result.format)) byFormat.set(result.format, []);
    byFormat.get(result.format)!.push(result);
  }

  console.log('Average Compression Savings by Format:');
  console.log('Format     Avg Savings      Best Quality     Best Size');
  console.log('-'.repeat(55));

  for (const [format, formatResults] of byFormat) {
    const avgSavings = (formatResults.reduce((sum, r) => sum + r.savings, 0) / formatResults.length).toFixed(1);
    const bestQuality = formatResults.find(r => r.quality === 95);
    const bestSize = formatResults.find(r => r.quality === 50);

    const q95Size = (bestQuality!.compressedSize / 1024).toFixed(2);
    const q50Size = (bestSize!.compressedSize / 1024).toFixed(2);
    console.log(`${format}     ${avgSavings}%           Q95: ${q95Size} KB      Q50: ${q50Size} KB`);
  }

  // Format comparison at Q85
  console.log('\n\nFormat Comparison at Q85 (Standard Quality):');
  console.log('File                      JPEG            WebP            AVIF');
  console.log('-'.repeat(70));

  for (const [file, fileResults] of byFile) {
    const jpeg = fileResults.find(r => r.format === 'JPEG' && r.quality === 85);
    const webp = fileResults.find(r => r.format === 'WebP' && r.quality === 85);
    const avif = fileResults.find(r => r.format === 'AVIF' && r.quality === 85);

    const jpegSize = (jpeg!.compressedSize / 1024).toFixed(2);
    const webpSize = (webp!.compressedSize / 1024).toFixed(2);
    const avifSize = (avif!.compressedSize / 1024).toFixed(2);
    const shortFile = file.substring(0, 24);
    console.log(`${shortFile.padEnd(25)} ${jpegSize} KB       ${webpSize} KB       ${avifSize} KB`);
  }

  console.log('\n✅ All compression tests completed!');
  console.log(`📁 Output files saved to: ${outputDir}`);
}

async function main() {
  try {
    await createTestImages();
    const results = await testCompressionFormats();
    await generateReport(results);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
