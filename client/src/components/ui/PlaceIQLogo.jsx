/**
 * PlaceIQLogo — Pure SVG logomark, transparent background.
 * Works on dark, light, colored, glass — any surface.
 *
 * Design: Bold geometric "P" letterform (stroke-based, like real app logos)
 *         + a smart dot at bottom-right representing precision/IQ.
 *
 * Props:
 *   size      — pixel size (default 36)
 *   color     — stroke/fill color (default brand orange #f97316)
 *   className — extra classes
 */
const PlaceIQLogo = ({ size = 36, color = '#f97316', className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="PlaceIQ"
    role="img"
  >
    {/* ── Bold "P" letterform ──────────────────────────────────
        Drawn as a single open stroke path:
        - Vertical stem from bottom (y=32) up to top (y=4)
        - Cubic bezier forming the P bowl: goes right to peak x=27
          then curves back to the mid-stem (y=22)
        strokeLinecap="round" gives the clean rounded terminals
        you see on premium logos (Claude, Gemini, etc.)        */}
    <path
      d="M 9 32 L 9 4 C 9 4 28 4 28 13.5 C 28 23 9 23 9 23"
      stroke={color}
      strokeWidth="7"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />

    {/* ── "IQ" accent dot ─────────────────────────────────────
        Represents intelligence / precision — a subtle mark that
        makes the logo unique and recognisable at small sizes    */}
    <circle cx="30" cy="30" r="3.5" fill={color} />
  </svg>
)

export default PlaceIQLogo
