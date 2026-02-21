#!/usr/bin/env node

/**
 * Update Dragonscale Fingerless Gloves with size options and custom pricing
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

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
      if (key && value && !process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: "woolwitch_api",
  },
});

async function updateDragonscaleGloves() {
  try {
    console.log("🔍 Fetching Dragonscale Fingerless Gloves product...");

    // Get the product to find its ID
    const { data: products, error: getError } = await supabase.rpc(
      "get_products",
      {
        p_category: null,
        p_search: "Dragonscale",
        p_limit: 10,
        p_offset: 0,
      }
    );

    if (getError) {
      console.error("Error fetching product:", getError);
      return;
    }

    const product = products.find((p) =>
      p.name.includes("Dragonscale Fingerless Gloves")
    );

    if (!product) {
      console.error("❌ Dragonscale Fingerless Gloves not found");
      return;
    }

    console.log(`✅ Found product: ${product.name} (ID: ${product.id})`);

    // Define custom properties with size options
    const customProperties = {
      properties: [
        {
          id: "size",
          label: "Size",
          type: "dropdown",
          required: true,
          options: ["Small", "Medium", "Large"],
          optionPrices: {
            "Small": 24.0,
            "Medium": 28.0,
            "Large": 32.0,
          },
        },
      ],
    };

    console.log("\n📝 Updating product with size options...");

    // Update the product with custom properties
    const { data, error: updateError } = await supabase.rpc("update_product", {
      p_product_id: product.id,
      p_name: product.name,
      p_description: product.description,
      p_price: 24.0, // Base price (Small)
      p_price_max: 32.0, // Max price (Large)
      p_image_url: product.image_url,
      p_category: product.category,
      p_stock_quantity: product.stock_quantity || 12,
      p_delivery_charge: product.delivery_charge || 0,
      p_is_available: true,
      p_sort_order: product.sort_order,
      p_custom_properties: customProperties,
    });

    if (updateError) {
      console.error("Error updating product:", updateError);
      return;
    }

    console.log("✅ Successfully updated Dragonscale Fingerless Gloves!");
    console.log("\n📋 Custom Properties:");
    console.log(JSON.stringify(customProperties, null, 2));
    console.log(
      `\n💰 Price Range: $24.00 (Small) - $32.00 (Large)\n`
    );
  } catch (err) {
    console.error("Error:", err);
  }
}

updateDragonscaleGloves();
