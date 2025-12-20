#!/usr/bin/env node

/**
 * Script to upload product images to Supabase storage and add products to the database
 * This ensures product data can be recreated locally easily
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, extname, basename } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local if it exists
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

// Get Supabase credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service key for admin operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables:");
  console.error("- VITE_SUPABASE_URL");
  console.error("- SUPABASE_SERVICE_ROLE_KEY");
  console.error("");
  console.error("Make sure .env.local exists with the required variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: "woolwitch",
  },
});

// Product data for items with local images
const PRODUCTS_WITH_IMAGES = [
  {
    name: "Custom Mini Viking Figures",
    description:
      "Adorable hand-crocheted Viking figures. Perfect collectibles or gifts for Norse mythology enthusiasts. Each figure is uniquely crafted with attention to detail.",
    price: 32.0,
    category: "Amigurumi",
    stock_quantity: 8,
    image_filename: "custom_mini_viking_figures.jpg",
    delivery_carge: 2.99
  },
  {
    name: "Dragonscale Fingerless Gloves",
    description:
      "Elegant fingerless gloves with a beautiful dragonscale pattern. Perfect for keeping hands warm while maintaining dexterity for typing or crafting.",
    price: 28.0,
    category: "Crochet",
    stock_quantity: 12,
    image_filename: "dragonscale_fingerless_gloves.jpg",
    delivery_carge: 2.99
  },
  {
    name: "Magical Fingerless Mittens",
    description:
      "Enchanting fingerless mittens with mystical color combinations. Soft and warm, perfect for everyday wear with a touch of magic.",
    price: 26.0,
    category: "Crochet",
    stock_quantity: 10,
    image_filename: "magical_fingerless_mittens.jpg",
    delivery_carge: 2.99
  },
  {
    name: "Magical Slouch Beanie",
    description:
      "Cozy slouch beanie with magical color gradients. Stylish and warm, perfect for autumn and winter weather. One size fits most.",
    price: 22.0,
    category: "Crochet",
    stock_quantity: 15,
    image_filename: "magical_slouch_beanie.jpg",
    delivery_carge: 2.99
  },
  {
    name: "Rainbow Starburst Baby Blanket",
    description:
      "Beautiful rainbow-colored baby blanket with starburst pattern. Soft and gentle for sensitive baby skin. A perfect gift for new parents.",
    price: 65.0,
    category: "Crochet",
    stock_quantity: 5,
    image_filename: "rainbow_starburst_baby_blanet.jpg",
    delivery_carge: 2.99
  },
];

async function uploadImage(imagePath, fileName) {
  try {
    console.log(`Uploading ${fileName}...`);

    const imageBuffer = readFileSync(imagePath);

    const { data, error } = await supabase.storage
      .from("woolwitch-images")
      .upload(fileName, imageBuffer, {
        contentType: getContentType(fileName),
        cacheControl: "3600",
        upsert: true, // Replace if exists
      });

    if (error) {
      console.error(`Error uploading ${fileName}:`, error);
      return null;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("woolwitch-images").getPublicUrl(fileName);

    console.log(`✅ Uploaded ${fileName} -> ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.error(`Error processing ${fileName}:`, err);
    return null;
  }
}

function getContentType(fileName) {
  const ext = extname(fileName).toLowerCase();
  const mimeTypes = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };
  return mimeTypes[ext] || "image/jpeg";
}

async function addProductToDatabase(product, imageUrl) {
  try {
    console.log(`Adding product: ${product.name}...`);

    // First try to find if product exists
    const { data: existing, error: selectError } = await supabase
      .from("products")
      .select("id")
      .eq("name", product.name)
      .single();

    if (existing) {
      // Update existing product
      const { data, error } = await supabase
        .from("products")
        .update({
          description: product.description,
          price: product.price,
          image_url: imageUrl,
          category: product.category,
          stock_quantity: product.stock_quantity,
          is_available: true,
        })
        .eq("id", existing.id)
        .select();

      if (error) {
        console.error(`Error updating product ${product.name}:`, error);
        return false;
      }
      console.log(`✅ Updated product: ${product.name}`);
    } else {
      // Insert new product
      const { data, error } = await supabase
        .from("products")
        .insert({
          name: product.name,
          description: product.description,
          price: product.price,
          image_url: imageUrl,
          category: product.category,
          stock_quantity: product.stock_quantity,
          is_available: true,
        })
        .select();

      if (error) {
        console.error(`Error adding product ${product.name}:`, error);
        return false;
      }
      console.log(`✅ Added product: ${product.name}`);
    }

    return true;
  } catch (err) {
    console.error(`Error processing product ${product.name}:`, err);
    return false;
  }
}

async function main() {
  console.log("🚀 Starting product image upload and database sync...");

  const assetsPath = join(__dirname, "..", "src", "assets", "products");

  for (const product of PRODUCTS_WITH_IMAGES) {
    const imagePath = join(assetsPath, product.image_filename);

    try {
      // Check if image file exists
      readFileSync(imagePath);
    } catch (err) {
      console.error(`❌ Image file not found: ${imagePath}`);
      continue;
    }

    // Upload image
    const imageUrl = await uploadImage(imagePath, product.image_filename);

    if (!imageUrl) {
      console.error(`❌ Failed to upload image for ${product.name}`);
      continue;
    }

    // Add product to database
    const success = await addProductToDatabase(product, imageUrl);

    if (!success) {
      console.error(`❌ Failed to add product ${product.name} to database`);
    }
  }

  console.log("✨ Product upload and sync complete!");
}

// Run the script
main().catch(console.error);
