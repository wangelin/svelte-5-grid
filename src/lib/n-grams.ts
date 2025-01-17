export function generate_n_grams(str: string, n: number): string[] {
  str = "*" + str.toLowerCase().replace(/\s+/g, "*") + "*";
  const n_grams = [];
  for (let i = 0; i <= str.length - n; i++) {
    n_grams.push(str.slice(i, i + n));
  }
  return n_grams;
}

export function generate_trigrams(str: string): string[] {
  return generate_n_grams(str, 3);
}

export function calculate_similarity(
  n_grams_1: Set<string> | string[],
  n_grams_2: Set<string> | string[]
): number {
  const set_1 = n_grams_1 instanceof Set ? n_grams_1 : new Set(n_grams_1);
  const set_2 = n_grams_2 instanceof Set ? n_grams_2 : new Set(n_grams_2);
  const intersection = [...set_1].filter((x) => set_2.has(x));
  return intersection.length / Math.max(set_1.size, set_2.size);
}

function example_filter_with_n_grams(
  list: { name: string }[],
  search_string: string,
  n: number,
  threshold: number
) {
  const search_string_n_grams = generate_n_grams(search_string, n);

  return list.filter((item) => {
    const item_n_grams = generate_n_grams(item.name, n);
    const similarity = calculate_similarity(
      search_string_n_grams,
      item_n_grams
    );
    return similarity >= threshold;
  });
}

export function create_detailed_search_map(
  array: Record<string, any>[]
): Map<Record<string, any>, Map<string, Set<string>>> {
  const search_map = new Map<Record<string, any>, Map<string, Set<string>>>();

  for (const rec of array) {
    const property_map = new Map<string, Set<string>>();

    for (const key in rec) {
      const value = rec[key];
      if (typeof value === "string" || typeof value === "number") {
        const trigrams = new Set(generate_trigrams(value.toString()));
        property_map.set(key, trigrams);
      }
    }

    search_map.set(rec, property_map);
  }
  return search_map;
}
