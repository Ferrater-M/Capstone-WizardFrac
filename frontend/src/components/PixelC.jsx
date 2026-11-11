import './PixelC.css';

// The "C" at the end of the WIZARDFRAC logo. Pixelify Sans draws C with only a
// hairline gap, which the white outline seals, so it reads like an O. This cuts
// a wider opening and redraws the outline/3D shadow along the cut edges.
// Shadow sizes come from CSS vars (see PixelC.css) so each logo can match its own.
export default function PixelC() {
  return (
    <span className="pixel-c">
      <span className="pixel-c-blur" aria-hidden="true"><span className="pixel-c-cut">C</span></span>
      <span className="pixel-c-cut pixel-c-glyph">C</span>
    </span>
  );
}
