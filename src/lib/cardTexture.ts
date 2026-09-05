import * as THREE from "three";
import { COLOR_HEX, cardGlyph, type UnoCard } from "./uno";

const W = 256;
const H = 384;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawOval(ctx: CanvasRenderingContext2D, fill: string) {
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-Math.PI / 9);
  ctx.beginPath();
  ctx.ellipse(0, 0, W * 0.42, H * 0.26, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

function wildWedges(ctx: CanvasRenderingContext2D) {
  const quads: Array<[number, number, string]> = [
    [0, 0, COLOR_HEX.red],
    [W / 2, 0, COLOR_HEX.blue],
    [0, H / 2, COLOR_HEX.yellow],
    [W / 2, H / 2, COLOR_HEX.green],
  ];
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-Math.PI / 9);
  ctx.beginPath();
  ctx.ellipse(0, 0, W * 0.42, H * 0.26, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(-W / 2, -H / 2);
  for (const [x, y, c] of quads) {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, W / 2, H / 2);
  }
  ctx.restore();
}

export function drawCardFace(ctx: CanvasRenderingContext2D, card: UnoCard) {
  ctx.clearRect(0, 0, W, H);
  // white body
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 0, 0, W, H, 26);
  ctx.fill();
  // colored inner panel
  ctx.fillStyle = card.color === "wild" ? "#111111" : COLOR_HEX[card.color];
  roundRect(ctx, 14, 14, W - 28, H - 28, 20);
  ctx.fill();

  if (card.color === "wild") wildWedges(ctx);
  else drawOval(ctx, "#ffffff");

  const glyph = cardGlyph(card);
  const big = card.color === "wild" ? "#ffffff" : COLOR_HEX[card.color];
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 8;
  ctx.strokeStyle = card.color === "wild" ? "#111111" : "#ffffff";
  ctx.fillStyle = big;
  const size = glyph.length > 1 ? 96 : 140;
  ctx.font = `italic 900 ${size}px "Archivo Black", "Arial Black", sans-serif`;
  ctx.strokeText(glyph, W / 2, H / 2);
  ctx.fillText(glyph, W / 2, H / 2);

  // corners
  ctx.fillStyle = "#ffffff";
  ctx.font = `italic 900 ${glyph.length > 1 ? 34 : 44}px "Archivo Black", "Arial Black", sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText(glyph, 30, 52);
  ctx.save();
  ctx.translate(W - 30, H - 52);
  ctx.rotate(Math.PI);
  ctx.textAlign = "left";
  ctx.fillText(glyph, 0, 0);
  ctx.restore();
}

export function drawCardBack(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#111111";
  roundRect(ctx, 0, 0, W, H, 26);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 12, 12, W - 24, H - 24, 20);
  ctx.fill();
  ctx.fillStyle = "#111111";
  roundRect(ctx, 22, 22, W - 44, H - 44, 16);
  ctx.fill();
  drawOval(ctx, COLOR_HEX.red);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-Math.PI / 9);
  ctx.font = `italic 900 78px "Archivo Black", "Arial Black", sans-serif`;
  ctx.lineWidth = 10;
  ctx.strokeStyle = "#111111";
  ctx.fillStyle = "#ffcc00";
  ctx.strokeText("UNO", 0, 4);
  ctx.fillText("UNO", 0, 4);
  ctx.restore();
}

export function makeCardTexture(card: UnoCard | "back"): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  if (card === "back") drawCardBack(ctx);
  else drawCardFace(ctx, card);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
