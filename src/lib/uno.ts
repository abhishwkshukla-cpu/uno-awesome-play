export type UnoColor = "red" | "yellow" | "green" | "blue";
export type CardColor = UnoColor | "wild";
export type CardValue =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "skip"
  | "reverse"
  | "draw2"
  | "wild"
  | "wild4";

export interface UnoCard {
  id: string;
  color: CardColor;
  value: CardValue;
}

export const COLORS: UnoColor[] = ["red", "yellow", "green", "blue"];

export const COLOR_HEX: Record<CardColor, string> = {
  red: "#D72600",
  yellow: "#FFCC00",
  green: "#00A651",
  blue: "#0057B8",
  wild: "#111111",
};

let counter = 0;
function newId() {
  counter += 1;
  return `c${counter}_${Math.random().toString(36).slice(2, 8)}`;
}

export function buildDeck(): UnoCard[] {
  const deck: UnoCard[] = [];
  for (const color of COLORS) {
    deck.push({ id: newId(), color, value: "0" });
    for (let n = 1; n <= 9; n++) {
      const v = String(n) as CardValue;
      deck.push({ id: newId(), color, value: v });
      deck.push({ id: newId(), color, value: v });
    }
    for (const v of ["skip", "reverse", "draw2"] as CardValue[]) {
      deck.push({ id: newId(), color, value: v });
      deck.push({ id: newId(), color, value: v });
    }
  }
  for (let i = 0; i < 4; i++) {
    deck.push({ id: newId(), color: "wild", value: "wild" });
    deck.push({ id: newId(), color: "wild", value: "wild4" });
  }
  return shuffle(deck);
}

export function shuffle<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export function canPlay(card: UnoCard, top: UnoCard | undefined, currentColor: CardColor | null) {
  if (!top) return true;
  if (card.color === "wild") return true;
  if (currentColor && card.color === currentColor) return true;
  return card.value === top.value;
}

export function cardLabel(card: UnoCard): string {
  switch (card.value) {
    case "skip":
      return "Skip";
    case "reverse":
      return "Reverse";
    case "draw2":
      return "+2";
    case "wild":
      return "Wild";
    case "wild4":
      return "+4";
    default:
      return card.value;
  }
}

/** Short glyph drawn in the middle of the card face. */
export function cardGlyph(card: UnoCard): string {
  switch (card.value) {
    case "skip":
      return "\u2298";
    case "reverse":
      return "\u21C4";
    case "draw2":
      return "+2";
    case "wild":
      return "W";
    case "wild4":
      return "+4";
    default:
      return card.value;
  }
}
