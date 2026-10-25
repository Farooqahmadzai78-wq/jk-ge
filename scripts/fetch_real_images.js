import fs from "fs";

const barcodes = [
  { code: "5449000000996", name: "Coca-Cola Original" },
  { code: "5000159461122", name: "M&M's Peanut (Cacahuète)" },
  { code: "3103220009574", name: "Haribo Croco" },
  { code: "8690526010014", name: "Haribo Halal" },
  { code: "8000500037560", name: "Kinder Bueno" },
  { code: "3017620422003", name: "Nutella" },
  { code: "7622210449283", name: "Oreo Original" },
  { code: "9002490100070", name: "Red Bull Energy Drink" },
  { code: "3228857000166", name: "Oasis Tropical" },
  { code: "8715700110487", name: "Pringles Original" },
  { code: "3168930010003", name: "Capri-Sun Multivitamin" },
  { code: "3560070498765", name: "Steak Haché Halal AVS" },
  { code: "3181232145678", name: "Haché L'Ultra Tendre 100% Pur Bœuf" },
  // Common Haribo variants
  { code: "3103220009185", name: "Haribo Dragibus" },
  { code: "3103220009024", name: "Haribo Goldbären" },
];

async function main() {
  const results = {};
  for (const item of barcodes) {
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${item.code}?fields=code,product_name,image_front_url,image_front_small_url,image_url,selected_images`);
      if (!res.ok) {
        console.log(`Failed OFF for ${item.code}: ${res.status}`);
        continue;
      }
      const data = await res.json();
      const p = data.product;
      if (!p) {
        console.log(`No product found in OFF for ${item.code}`);
        continue;
      }
      const img = p.image_front_url || p.image_front_small_url || p.image_url;
      console.log(`OK [${item.code}] ${item.name}: ${img}`);
      // Test the image URL immediately
      if (img) {
        const testRes = await fetch(img, { method: "HEAD" });
        console.log(`  -> Image HTTP status: ${testRes.status}`);
        results[item.code] = {
          name: item.name,
          img,
          status: testRes.status,
          fallback: p.image_url
        };
      }
    } catch (err) {
      console.error(`Error for ${item.code}:`, err.message);
    }
  }

  fs.writeFileSync("scripts/real_images_result.json", JSON.stringify(results, null, 2));
}

main();
