import fs from "fs";

async function main() {
  const content = fs.readFileSync("src/lib/halal.ts", "utf8");
  const regex = /code:\s*"([^"]+)",\s*product_name:\s*"([^"]+)"[\s\S]*?image_front_small_url:\s*"([^"]+)"/g;
  let match;
  const products = [];
  while ((match = regex.exec(content)) !== null) {
    products.push({ code: match[1], name: match[2], url: match[3] });
  }

  console.log(`Found ${products.length} products with static images`);
  for (const p of products) {
    try {
      const res = await fetch(p.url, { method: "HEAD" });
      console.log(`${res.status} [${p.code}] ${p.name} -> ${p.url}`);
    } catch (e) {
      console.log(`ERR [${p.code}] ${p.name} -> ${e.message}`);
    }
  }
}

main();
