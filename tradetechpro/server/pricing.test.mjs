// Maid Flow — pricing engine unit tests. Run: node server/pricing.test.mjs
import assert from "node:assert/strict";
import { quote, mergeRates, DEFAULTS } from "./pricing.mjs";

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log(`  ✓ ${name}`); };

// 1. Acceptance case from the handoff.
test("acceptance: deep clean 2200sqft, 4bed/2bath, heavy pets, fridge+oven", () => {
  const q = quote({ sqft: 2200, beds: 4, baths: 2, cleaningType: "deep", condition: "normal", pets: "heavy", addOns: ["fridge", "oven"] });
  assert.equal(q.recommended, 555);
  assert.deepEqual(q.range, [485, 620]);
  assert.deepEqual(q.time, { cleaners: 2, low: 1, high: 3 });
});

// 2. Minimum price floor applies for tiny homes.
test("min floor: tiny regular clean uses the per-type minimum", () => {
  const q = quote({ sqft: 100, cleaningType: "regular" });
  assert.equal(q.recommended, 110); // 0.10*100=10 < min 110
});

// 3. Frequency discount produces a recurring price.
test("recurring: weekly applies 20% discount", () => {
  const q = quote({ sqft: 1500, cleaningType: "regular", frequency: "weekly" });
  assert.ok(q.recurring && q.recurring < q.recommended);
  assert.equal(q.recurring, Math.round(q.recommended * 0.8 / 5) * 5);
});

// 4. Very-heavy condition flags a custom quote.
test("custom quote: very_heavy condition sets customQuote", () => {
  const q = quote({ sqft: 1200, cleaningType: "regular", condition: "very_heavy" });
  assert.equal(q.customQuote, true);
});

// 5. Unknown / missing inputs fall back to safe defaults.
test("defaults: unknown type falls back to regular, no NaN", () => {
  const q = quote({ sqft: 1000, cleaningType: "spaceship", condition: "???" });
  assert.equal(q.cleaningType, "regular");
  assert.equal(q.condition, "normal");
  assert.ok(Number.isFinite(q.recommended));
});

// 6. Per-cleaner rate overrides flow through.
test("mergeRates: cleaner override changes the quote", () => {
  const rates = mergeRates({ RATE: { regular: { perSqft: 0.20, min: 150 } } });
  assert.equal(rates.RATE.regular.perSqft, 0.20);
  assert.equal(rates.RATE.deep.perSqft, DEFAULTS.RATE.deep.perSqft); // others untouched
  const base = quote({ sqft: 2000, cleaningType: "regular" });
  const over = quote({ sqft: 2000, cleaningType: "regular" }, rates);
  assert.ok(over.recommended > base.recommended);
});

// 7. Custom cleaner-defined extras (custom:*) survive mergeRates and price in.
test("custom add-on: cleaner's own extra prices through", () => {
  const rates = mergeRates({ ADDON: { "custom:abc123": 40 } });
  assert.equal(rates.ADDON["custom:abc123"], 40);
  assert.equal(rates.ADDON.fridge, DEFAULTS.ADDON.fridge); // built-ins untouched
  const base = quote({ sqft: 1500, cleaningType: "regular" }, rates);
  const withExtra = quote({ sqft: 1500, cleaningType: "regular", addOns: ["custom:abc123"] }, rates);
  assert.equal(withExtra.recommended - base.recommended, 40);
  // a non-custom unknown key is still rejected
  const bad = mergeRates({ ADDON: { hackerKey: 999 } });
  assert.equal(bad.ADDON.hackerKey, undefined);
});

console.log(`\n${passed} passed`);
