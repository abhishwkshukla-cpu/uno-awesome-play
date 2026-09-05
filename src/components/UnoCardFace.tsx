import { cardGlyph, COLOR_HEX, type UnoCard } from "@/lib/uno";
import { cn } from "@/lib/utils";

interface Props {
  card?: UnoCard;
  back?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
}

const SIZES = {
  sm: "w-11 h-[66px] text-base",
  md: "w-[76px] h-[114px] text-2xl",
  lg: "w-28 h-[168px] text-4xl",
};

export function UnoCardFace({
  card,
  back,
  size = "md",
  className,
  onClick,
  disabled,
  selected,
}: Props) {
  const glyph = card ? cardGlyph(card) : "UNO";
  const isWild = !card || card.color === "wild";
  const panel = back ? "#111111" : isWild ? "#111111" : COLOR_HEX[card!.color];

  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick, disabled } : {})}
      className={cn(
        "relative shrink-0 rounded-xl bg-white p-[6px] shadow-card transition-transform duration-200",
        SIZES[size],
        onClick && !disabled && "cursor-pointer hover:-translate-y-4 hover:shadow-glow",
        disabled && onClick && "opacity-55",
        selected && "-translate-y-4 ring-4 ring-uno-yellow",
        className,
      )}
      aria-label={back ? "Face down card" : `${card?.color} ${glyph}`}
    >
      <span
        className="flex h-full w-full items-center justify-center overflow-hidden rounded-lg"
        style={{ backgroundColor: panel }}
      >
        {back || !card ? (
          <span className="uno-oval flex items-center justify-center bg-uno-red">
            <span className="uno-word text-uno-yellow" style={{ fontSize: "0.62em" }}>
              UNO
            </span>
          </span>
        ) : (
          <span
            className={cn(
              "uno-oval flex items-center justify-center",
              isWild ? "uno-oval-wild" : "bg-white",
            )}
          >
            <span
              className="uno-word"
              style={{
                color: isWild ? "#fff" : COLOR_HEX[card.color],
                fontSize: glyph.length > 1 ? "1.1em" : "1.6em",
              }}
            >
              {glyph}
            </span>
          </span>
        )}
      </span>
      {!back && card && (
        <>
          <span className="uno-corner absolute left-2 top-1 text-white">{glyph}</span>
          <span className="uno-corner absolute bottom-1 right-2 rotate-180 text-white">
            {glyph}
          </span>
        </>
      )}
    </Tag>
  );
}
