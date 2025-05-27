export function shuffle(arr: any[]) {
  return arr.sort(() => (Math.random() > 0.5 ? 1 : -1));
}

export function getRandomColor() {
  return [
    Math.floor(Math.random() * 256),
    Math.floor(Math.random() * 256),
    Math.floor(Math.random() * 256),
  ];
}

export function rgbToHex(rgb) {
  return rgb.map((c) => c.toString(16).padStart(2, "0")).join("");
}

export function hexToRgb(hex) {
  hex = hex.length > 7 ? hex.slice(0, 7) : hex;
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : [0, 0, 0];
}

export function isLeftClick(e) {
  if ("buttons" in e) {
    return e.buttons == 1;
  }
  const button = e.which || e.button;
  return button == 1;
}

export function getPointerPositionInElement(e, element) {
  const rect = element.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}
