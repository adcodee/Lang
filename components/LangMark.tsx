// Brand mark for the Japanese course: あ on forest green, gold ring.
// Matches the quiet Artwork posters (book/あ, あ-on-green) without the
// Imagine brochure clutter.
export default function LangMark({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-brand font-display font-bold leading-none text-washi ring-[1.5px] ring-gold ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.56 }}
      aria-hidden
    >
      あ
    </span>
  );
}
