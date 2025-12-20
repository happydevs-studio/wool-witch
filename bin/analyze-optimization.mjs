#!/usr/bin/env node

/**
 * Performance monitoring and analysis script for egress optimization
 * Measures data usage improvements and provides optimization insights
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(dirname(__dirname), ".env.local");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf8");
  envContent.split("\n").forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith("#") && trimmedLine.includes("=")) {
      const [key, ...valueParts] = trimmedLine.split("=");
      const value = valueParts.join("=");
      if (key && value && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables:");
  console.error("- VITE_SUPABASE_URL");
  console.error("- SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: "woolwitch" },
});

/**
 * Analyze storage usage and optimization opportunities
 */
async function analyzeStorageOptimization() {
  console.log("🔍 Analyzing Storage Optimization...\n");

  try {
    // Get storage bucket info
    const { data: files, error } = await supabase.storage
      .from('woolwitch-images')
      .list('', { limit: 1000 });

    if (error) throw error;

    if (!files || files.length === 0) {
      console.log("📁 No files found in woolwitch-images bucket");
      return;
    }

    let totalSize = 0;
    let largeFiles = [];
    let unoptimizedFormats = [];

    console.log("📊 Storage Analysis:");
    console.log("==================");

    for (const file of files) {
      const size = file.metadata?.size || 0;
      totalSize += size;

      // Check for large files (>500KB)
      if (size > 500 * 1024) {
        largeFiles.push({
          name: file.name,
          size: formatBytes(size)
        });
      }

      // Check for unoptimized formats
      if (file.name && !file.name.includes('.webp') && !file.name.includes('.avif')) {
        unoptimizedFormats.push({
          name: file.name,
          size: formatBytes(size)
        });
      }
    }

    console.log(`📁 Total files: ${files.length}`);
    console.log(`💾 Total storage: ${formatBytes(totalSize)}`);
    console.log(`📊 Average file size: ${formatBytes(totalSize / files.length)}`);

    if (largeFiles.length > 0) {
      console.log("\n⚠️  Large files (>500KB) - Consider compression:");
      largeFiles.forEach(file => {
        console.log(`   • ${file.name} - ${file.size}`);
      });
    }

    if (unoptimizedFormats.length > 0) {
      console.log("\n💡 Files that could benefit from modern formats:");
      unoptimizedFormats.forEach(file => {
        console.log(`   • ${file.name} - ${file.size}`);
      });
    }

    // Calculate potential savings
    const potentialSavings = calculatePotentialSavings(totalSize, unoptimizedFormats.length, files.length);
    console.log(`\n💰 Estimated data savings with optimization: ${formatBytes(potentialSavings)}`);

  } catch (error) {
    console.error("Error analyzing storage:", error);
  }
}

/**
 * Analyze database query optimization
 */
async function analyzeQueryOptimization() {
  console.log("\n🗃️  Analyzing Database Query Optimization...\n");

  try {
    // Test different query patterns
    console.log("📊 Query Performance Analysis:");
    console.log("=============================");

    // Test full product fetch vs. selective fields
    const startFull = performance.now();
    const { data: fullProducts } = await supabase
      .from('products')
      .select('*')
      .limit(10);
    const fullTime = performance.now() - startFull;

    const startSelective = performance.now();
    const { data: selectiveProducts } = await supabase
      .from('products')
      .select('id, name, price, image_url, category')
      .limit(10);
    const selectiveTime = performance.now() - startSelective;

    console.log(`🔍 Full product query: ${fullTime.toFixed(2)}ms`);
    console.log(`⚡ Selective query: ${selectiveTime.toFixed(2)}ms`);
    console.log(`📈 Performance improvement: ${((fullTime - selectiveTime) / fullTime * 100).toFixed(1)}%`);

    // Calculate data size differences
    const fullSize = JSON.stringify(fullProducts || []).length;
    const selectiveSize = JSON.stringify(selectiveProducts || []).length;
    
    console.log(`💾 Full data size: ${formatBytes(fullSize)}`);
    console.log(`⚡ Selective data size: ${formatBytes(selectiveSize)}`);
    console.log(`💰 Data reduction: ${formatBytes(fullSize - selectiveSize)} (${((fullSize - selectiveSize) / fullSize * 100).toFixed(1)}%)`);

  } catch (error) {
    console.error("Error analyzing queries:", error);
  }
}

/**
 * Provide optimization recommendations
 */
function provideRecommendations() {
  console.log("\n🎯 Optimization Recommendations:");
  console.log("=================================");

  console.log("\n📷 Image Optimization:");
  console.log("  ✅ Implement WebP/AVIF format support");
  console.log("  ✅ Add responsive image srcsets");
  console.log("  ✅ Enable lazy loading");
  console.log("  ✅ Compress images before upload");
  console.log("  ✅ Use modern image formats");

  console.log("\n🗃️  Data Optimization:");
  console.log("  ✅ Use selective field queries");
  console.log("  ✅ Implement caching strategies");
  console.log("  ✅ Add pagination for large datasets");
  console.log("  ✅ Cache frequently accessed data");

  console.log("\n🚀 Build Optimization:");
  console.log("  ✅ Enable code splitting");
  console.log("  ✅ Optimize bundle sizes");
  console.log("  ✅ Use compression");
  console.log("  ✅ Implement tree shaking");

  console.log("\n📦 Delivery Optimization:");
  console.log("  ✅ Configure long-term caching");
  console.log("  ✅ Enable gzip compression");
  console.log("  ✅ Use CDN-like optimizations");
  console.log("  ✅ Implement preloading strategies");
}

/**
 * Calculate potential data savings
 */
function calculatePotentialSavings(totalSize, unoptimizedCount, totalCount) {
  // Assume WebP provides ~25-50% savings over JPEG
  const webpSavings = 0.35;
  const unoptimizedRatio = unoptimizedCount / totalCount;
  return totalSize * unoptimizedRatio * webpSavings;
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Main execution
 */
async function main() {
  console.log("🧶 Wool Witch - Egress Optimization Analysis");
  console.log("=============================================");
  console.log("");

  await analyzeStorageOptimization();
  await analyzeQueryOptimization();
  provideRecommendations();

  console.log("\n✨ Analysis complete! Implement the recommendations above to optimize data usage.");
}

// Run the analysis
main().catch(console.error);