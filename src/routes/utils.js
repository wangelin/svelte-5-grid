export function css_value_to_px(value, context = document.body) {
  const element = document.createElement('div');
  element.style.position = 'absolute';
  element.style.visibility = 'hidden';
  element.style.width = value;
  context.appendChild(element);
  const pixels = parseFloat(window.getComputedStyle(element).width);
  context.removeChild(element);
  return pixels;
}