#!/usr/bin/env node

/**
 * Test script to verify that the woolwitch schema is working correctly
 * Tests basic database operations and authentication
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
const envPath = join(dirname(__dirname), ".env.local");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf8");
  const envLines = envContent.split("\n");
  for (const line of envLines) {
    const trimmedLine = line.trim();
    if (
      trimmedLine &&
      !trimmedLine.startsWith("#") &&
      trimmedLine.includes("=")
    ) {
      const [key, ...valueParts] = trimmedLine.split("=");
      const value = valueParts.join("=");
      process.env[key.trim()] = value.trim();
    }
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing required environment variables");
  process.exit(1);
}

// Create client with woolwitch schema
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'woolwitch'
  }
});

console.log("🧶 Testing Wool Witch Schema Configuration...\n");

async function testProductFetching() {
  console.log("📦 Testing product fetching...");
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .limit(3);

    if (error) {
      console.error("❌ Error fetching products:", error);
      return false;
    }

    console.log(`✅ Successfully fetched ${products.length} products`);
    if (products.length > 0) {
      console.log(`   Sample product: ${products[0].name} - £${products[0].price}`);
    }
    return true;
  } catch (error) {
    console.error("❌ Exception during product fetch:", error);
    return false;
  }
}

async function testSchemaFunction() {
  console.log("\n🔍 Testing schema function access...");
  try {
    const { data, error } = await supabase.rpc('is_admin');
    
    if (error) {
      console.error("❌ Error calling is_admin function:", error);
      return false;
    }

    console.log(`✅ is_admin() function returned: ${data}`);
    return true;
  } catch (error) {
    console.error("❌ Exception calling is_admin function:", error);
    return false;
  }
}

async function testStorageBucket() {
  console.log("\n🖼️ Testing storage bucket access...");
  try {
    const { data, error } = await supabase.storage
      .from('woolwitch-images')
      .list('', { limit: 5 });

    if (error) {
      console.error("❌ Error accessing storage bucket:", error);
      return false;
    }

    console.log(`✅ Successfully accessed storage bucket with ${data.length} files`);
    return true;
  } catch (error) {
    console.error("❌ Exception accessing storage bucket:", error);
    return false;
  }
}

async function runTests() {
  const tests = [
    testProductFetching,
    testSchemaFunction,
    testStorageBucket
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await test();
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log("🎉 All tests passed! Woolwitch schema is working correctly.");
  } else {
    console.log("⚠️ Some tests failed. Please check the configuration.");
    process.exit(1);
  }
}

runTests();