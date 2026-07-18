// Maid Flow — cleaning pricing engine (single source of truth).
// Shared by the public widget endpoint and the in-app quote endpoint so a
// homeowner and a cleaner always get the same number for the same inputs.
export const DEFAULTS = {
  RATE: {
    regular:           { perSqft: 0.10, min: 110 },
    deep:              { perSqft: 0.18, min: 180 },
    move_in:           { perSqft: 0.22, min: 200 },
    move_out:          { perSqft: 0.24, min: 220 },
    airbnb:            { perSqft: 0.12, min: 90  },
    post_construction: { perSqft: 0.40, min: 300 },
    office:            { perSqft: 0.10, min: 120 },
  },
  CONDITION: { light: 0.90, normal: 1.00, heavy: 1.35, very_heavy: 1.60 },
  PETS: { none: 0, light: 15, heavy: 35, stains: 60 },
  FURNISHED: { empty: 0.85, partial: 1.00, full: 1.10 },
  FREQ_DISCOUNT: { one_time: 0, weekly: 0.20, biweekly: 0.15, monthly: 0.10 },
  ADDON: {
    fridge: 30, oven: 30, cabinets: 40, windows: 60, blinds: 40, baseboards: 45,
    laundry: 25, dishes: 20, garage: 50, patio: 40, trash: 25, organization: 60,
  },
  BATHROOM_ADDER: 15,
  BEDROOM_ADDER: 8,
};
const BASE_HOURS = { regular:0.8, deep:1.4, move_in:1.6, move_out:1.8, airbnb:0.7, post_construction:2.2, office:0.9 };
const num = (v, f = 0) => { const n = Number(v); return Number.isFinite(n) ? n : f; };

// Deep-merge a cleaner's saved overrides onto the defaults (her "my rates").
// Only finite, non-negative numeric overrides are accepted — anything else
// (undefined, "", NaN, negative, wrong type) falls back to the default, so a
// half-typed or corrupt "Mis precios" entry can never produce NaN/negative
// prices in the app or on the public widget.
const okNum = (v, max = 1e6) => { const n = Number(v); return Number.isFinite(n) && n >= 0 && n <= max ? n : undefined; };
// Per-group sane upper bounds so an override can't invert the math (e.g. a
// frequency discount > 1 would make the recurring price negative).
const CAP = { RATE_perSqft: 100, RATE_min: 1e5, CONDITION: 10, FURNISHED: 10, FREQ_DISCOUNT: 0.95, PETS: 1e4, ADDON: 1e4, BATHROOM_ADDER: 1e4, BEDROOM_ADDER: 1e4 };
export function mergeRates(overrides) {
  if (!overrides || typeof overrides !== 'object') return DEFAULTS;
  const out = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS)) {
    const def = DEFAULTS[key], ov = overrides[key];
    if (typeof def === 'object' && !Array.isArray(def)) {
      if (!ov || typeof ov !== 'object') continue;
      if (key === 'RATE') {
        out.RATE = { ...DEFAULTS.RATE };
        for (const t of Object.keys(DEFAULTS.RATE)) {
          const o = ov[t] || {};
          out.RATE[t] = { perSqft: okNum(o.perSqft, CAP.RATE_perSqft) ?? DEFAULTS.RATE[t].perSqft, min: okNum(o.min, CAP.RATE_min) ?? DEFAULTS.RATE[t].min };
        }
      } else {
        out[key] = { ...def };
        for (const k of Object.keys(def)) { const v = okNum(ov[k], CAP[key]); if (v !== undefined) out[key][k] = v; }
        // ADDON also accepts custom extras the cleaner defines herself (custom:*)
        if (key === 'ADDON') {
          for (const k of Object.keys(ov)) {
            if (k in def || !/^custom:/.test(k)) continue;
            const v = okNum(ov[k], CAP.ADDON);
            if (v !== undefined) out.ADDON[k] = v;
          }
        }
      }
    } else { const v = okNum(ov, CAP[key]); if (v !== undefined) out[key] = v; }
  }
  return out;
}

export function quote(i = {}, rates = DEFAULTS) {
  const cleaningType = rates.RATE[i.cleaningType] ? i.cleaningType : 'regular';
  const condition = rates.CONDITION[i.condition] ? i.condition : 'normal';
  const r = rates.RATE[cleaningType];
  const sqft = Math.max(0, num(i.sqft, 0));
  let base = Math.max(r.min, r.perSqft * sqft);
  base += num(i.baths) * rates.BATHROOM_ADDER + num(i.beds) * rates.BEDROOM_ADDER;
  base *= rates.CONDITION[condition];
  if (['move_in','move_out'].includes(cleaningType)) base *= (rates.FURNISHED[i.furnished] ?? rates.FURNISHED.partial);
  base += rates.PETS[i.pets] ?? rates.PETS.none;
  base += (Array.isArray(i.addOns) ? i.addOns : []).reduce((s,a) => s + (rates.ADDON[a] || 0), 0);
  const recommended = Math.round(base / 5) * 5;
  const range = [Math.round(base*0.88/5)*5, Math.round(base*1.12/5)*5];
  const freq = i.frequency;
  const recurring = freq && freq !== 'one_time' && rates.FREQ_DISCOUNT[freq] != null
    ? Math.max(0, Math.round(recommended * (1 - rates.FREQ_DISCOUNT[freq]) / 5) * 5) : null;
  const bh = BASE_HOURS[cleaningType] ?? BASE_HOURS.regular;
  let hours = Math.max(1.5, (sqft/1000) * bh * rates.CONDITION[condition]);
  const cleaners = sqft > 1800 || hours > 5 ? 2 : 1;
  const per = hours / cleaners;
  return {
    cleaningType, condition, recommended, range, recurring,
    frequency: freq || 'one_time',
    time: { cleaners, low: Math.floor(per), high: Math.ceil(per + 0.5) },
    customQuote: condition === 'very_heavy',
  };
}
