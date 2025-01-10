export type VisiblePartRect = {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
};

export function get_visible_part(
  input: HTMLElement | DOMRect | null
): VisiblePartRect | null {
  if (!input) return null;
  const rect =
    input instanceof HTMLElement ? input.getBoundingClientRect() : input;
  const scroll_top = window.scrollY || document.documentElement.scrollTop;
  const scroll_left = window.scrollX || document.documentElement.scrollLeft;

  const viewport_height =
    window.innerHeight || document.documentElement.clientHeight;
  const viewport_width =
    window.innerWidth || document.documentElement.clientWidth;

  const visible_top = Math.max(0, rect.top);
  const visible_bottom = Math.min(viewport_height, rect.bottom);
  const visible_left = Math.max(0, rect.left);
  const visible_right = Math.min(viewport_width, rect.right);

  if (visible_top >= visible_bottom || visible_left >= visible_right) {
    return null;
  }

  return {
    top: visible_top + scroll_top,
    bottom: visible_bottom + scroll_top,
    left: visible_left + scroll_left,
    right: visible_right + scroll_left,
    width: visible_right - visible_left,
    height: visible_bottom - visible_top,
  };
}
