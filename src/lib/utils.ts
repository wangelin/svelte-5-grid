export function create_multi_sort(
  criteria: Array<{
    key: string;
    type: "asc" | "desc";
    comparer?: (
      a: { [key: string]: any },
      b: { [key: string]: any }
    ) => 1 | -1 | 0;
  }>
): (a: { [key: string]: any }, b: { [key: string]: any }) => 1 | -1 | 0 {
  return (a, b) => {
    for (let { key, type, comparer } of criteria) {
      if (comparer) {
        if (comparer(a[key], b[key]) === -1) return type === "asc" ? -1 : 1;
        if (comparer(a[key], b[key]) === 1) return type === "asc" ? 1 : -1;
      } else {
        if (typeof a[key] === "string" && typeof b[key] === "string") {
          if (a[key].localeCompare(b[key]) === -1)
            return type === "asc" ? -1 : 1;
          if (a[key].localeCompare(b[key]) === 1)
            return type === "asc" ? 1 : -1;
        } else {
          if (a[key] < b[key]) return type === "asc" ? -1 : 1;
          if (a[key] > b[key]) return type === "asc" ? 1 : -1;
        }
      }
    }
    return 0;
  };
}

export function string_to_boolean(str: string) {
  return ["true", "yes", "1", "on"].includes(str.toLowerCase());
}
