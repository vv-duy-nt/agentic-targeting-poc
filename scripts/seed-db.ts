import { execFileSync } from "node:child_process";

const customerCount = 500;
const purchaseCount = 4_000;

function createRandom(seed = 20260916) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 2 ** 32;
  };
}

const random = createRandom();
const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)]!;
const money = (value: number) => Math.round(value * 100) / 100;
const sqlString = (value: string) => `'${value.replaceAll("'", "''")}'`;
const dateDaysAgo = (days: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return sqlString(date.toISOString());
};

function values(rows: string[], batchSize = 500) {
  return rows
    .reduce<string[][]>((batches, row, index) => {
      const batchIndex = Math.floor(index / batchSize);
      (batches[batchIndex] ??= []).push(row);
      return batches;
    }, [])
    .map((batch) => batch.join(",\n"));
}

function runPsql(sql: string) {
  execFileSync(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      "postgres",
      "sh",
      "-c",
      'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"',
    ],
    { cwd: process.cwd(), input: sql, stdio: ["pipe", "inherit", "inherit"] },
  );
}

const cities = ["Ho Chi Minh City", "Ha Noi", "Da Nang", "Can Tho"] as const;
const categories = ["electronics", "fashion", "food", "home", "beauty"] as const;
const firstNames = ["An", "Bình", "Chi", "Dũng", "Giang", "Hà", "Huy", "Lan", "Minh", "Ngọc"] as const;
const lastNames = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đặng", "Bùi"] as const;

const productRows: string[] = [];
const products: Array<{ category: string; price: number }> = [];
for (const [categoryIndex, category] of categories.entries()) {
  for (let offset = 1; offset <= 10; offset += 1) {
    const productId = categoryIndex * 10 + offset;
    const priceBase = category === "electronics" ? 4_500_000 : category === "home" ? 750_000 : 150_000;
    const price = money(priceBase + offset * (category === "electronics" ? 1_250_000 : 125_000));
    const imageKey = `products/${category}-${String(offset).padStart(2, "0")}.png`;
    products.push({ category, price });
    productRows.push(
      `(${sqlString(`${category} product ${offset}`)}, ${sqlString(category)}, ${price}, ${sqlString(imageKey)}, TRUE)`,
    );
  }
}

const customerRows: string[] = [];
const consentRows: string[] = [];
for (let id = 1; id <= customerCount; id += 1) {
  const city = id <= 220 ? "Ho Chi Minh City" : id <= 350 ? "Ha Noi" : id <= 450 ? "Da Nang" : "Can Tho";
  const gender = id % 2 === 0 ? "female" : "male";
  const name = `${pick(lastNames)} ${pick(firstNames)} ${id}`;
  const marketingAllowed = id <= 180 || id % 5 !== 0;
  customerRows.push(
    `(${sqlString(name)}, ${sqlString(gender)}, ${20 + (id % 41)}, ${sqlString(city)}, ${sqlString(`customer${id}@demo.local`)}, ${dateDaysAgo(30 + (id % 720))})`,
  );
  consentRows.push(
    `(${id}, ${marketingAllowed}, ${marketingAllowed && id % 3 !== 0}, ${marketingAllowed && id % 4 !== 0}, ${dateDaysAgo(id % 90)})`,
  );
}

const purchaseRows: string[] = [];
function addPurchase(customerId: number, productId: number, daysAgo: number) {
  const product = products[productId - 1]!;
  const quantity = 1 + Math.floor(random() * 2);
  const unitPrice = product.price;
  purchaseRows.push(
    `(${customerId}, ${productId}, ${quantity}, ${unitPrice}, ${money(unitPrice * quantity)}, ${dateDaysAgo(daysAgo)})`,
  );
}

// Guaranteed customers for the main demo prompt: HCMC + electronics + recent spend > 10m + consent.
for (let customerId = 1; customerId <= 60; customerId += 1) {
  addPurchase(customerId, 1 + (customerId % 10), customerId % 85);
  addPurchase(customerId, 1 + ((customerId + 4) % 10), 5 + (customerId % 80));
}
for (let index = purchaseRows.length; index < purchaseCount; index += 1) {
  const customerId = 1 + Math.floor(random() * customerCount);
  const productId = 1 + Math.floor(random() * products.length);
  addPurchase(customerId, productId, Math.floor(random() * 540));
}

const couponRows = categories.flatMap((category, index) => [
  `(${sqlString(`${category.toUpperCase()}10`)}, ${sqlString(`${category} 10% off`)}, ${sqlString(category)}, 'percentage', 10, ${sqlString(`coupons/${category}-10.png`)}, NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', TRUE)`,
  `(${sqlString(`${category.toUpperCase()}20`)}, ${sqlString(`${category} 20% off`)}, ${sqlString(category)}, 'percentage', 20, ${sqlString(`coupons/${category}-20.png`)}, NOW() - INTERVAL '1 day', NOW() + INTERVAL '14 days', TRUE)`,
]);

const sql = [
  "BEGIN;",
  "TRUNCATE TABLE purchases, customer_consents, coupons, products, customers RESTART IDENTITY CASCADE;",
  ...values(productRows).map((batch) => `INSERT INTO products (name, category, price, image_key, active) VALUES\n${batch};`),
  ...values(customerRows).map((batch) => `INSERT INTO customers (name, gender, age, city, email, created_at) VALUES\n${batch};`),
  ...values(consentRows).map((batch) => `INSERT INTO customer_consents (customer_id, marketing_allowed, email_allowed, sms_allowed, updated_at) VALUES\n${batch};`),
  ...values(purchaseRows).map((batch) => `INSERT INTO purchases (customer_id, product_id, quantity, unit_price, total_amount, purchased_at) VALUES\n${batch};`),
  `INSERT INTO coupons (code, name, category, discount_type, discount_value, image_key, start_at, end_at, active) VALUES\n${couponRows.join(",\n")};`,
  "COMMIT;",
  "ANALYZE;",
].join("\n\n");

runPsql(sql);
console.log(`Seeded ${customerCount} customers, ${products.length} products, ${purchaseRows.length} purchases, ${customerCount} consents and ${couponRows.length} coupons.`);
