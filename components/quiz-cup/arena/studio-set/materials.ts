import * as THREE from "three";

export function glow(color: string, gain = 1.5) {
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color).multiplyScalar(gain),
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  material.fog = false;
  return material;
}

export function neon(color: string, gain: number) {
  const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(gain), toneMapped: false });
  material.fog = false;
  return material;
}

export function painted(
  color: string,
  roughness = 0.45,
  metalness = 0.1,
  extra: THREE.MeshStandardMaterialParameters = {},
) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, envMapIntensity: 1.1, ...extra });
}

export function dotTexture(repeat: number, base = "#141547") {
  const size = 256;
  const step = 16;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  context.fillStyle = base;
  context.fillRect(0, 0, size, size);
  context.fillStyle = "rgba(150,140,255,0.2)";
  for (let y = 0; y < size; y += step) {
    const isOddRow = (y / step) % 2;
    for (let x = 0; x < size; x += step) {
      context.beginPath();
      context.arc(x + (isOddRow ? step / 2 : 0), y, 2, 0, Math.PI * 2);
      context.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = 8;
  return texture;
}
