// Presentational radial fingerprint. Wedge geometry comes from
// fingerprintGeometry.js (which mirrors mocks/gen-scrolly.mjs); colors come
// only from palette.js. Usable both as a small-multiples grid cell and scaled
// up in the profile — R is the scale knob.
import { PLAYER_COLORS, INK_TOKENS, SERIF } from './palette';
import { fingerprintWedges, hubR, ringR } from './fingerprintGeometry';
import './Fingerprint.css';

function Fingerprint({ name, R, labels = false, showName = false, excludeThirds = false, onClick }) {
  const color = PLAYER_COLORS[name];
  const wedges = fingerprintWedges(name, R, { excludeThirds });
  const hub = hubR(R);
  const ring = ringR(R);

  // Padding leaves room for rim labels (lr = R + 14) and the name below.
  const pad = labels ? 28 : 12;
  const extentX = R + pad;
  const top = R + pad;
  const bottom = R + pad + (showName ? 26 : 0);
  const width = extentX * 2;
  const height = top + bottom;
  // Group origin so the fingerprint center sits at (extentX, top).
  const cx = extentX;
  const cy = top;

  return (
    <svg
      className="fingerprint"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${name} fingerprint`}
      onClick={onClick ? () => onClick(name) : undefined}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <g transform={`translate(${cx},${cy})`}>
        {/* faint outer ring */}
        <circle r={ring} fill="none" stroke="#ffffff" strokeOpacity={0.06} />
        {/* 9 slot wedges */}
        {wedges.map((w) => (
          <path key={w.slot} d={w.d} fill={color} fillOpacity={0.9} />
        ))}
        {/* center hub dot */}
        <circle r={hub} fill={color} fillOpacity={0.9} />
        {/* optional slot labels */}
        {labels &&
          wedges.map((w) => (
            <text
              key={`lbl-${w.slot}`}
              x={w.labelX}
              y={w.labelY}
              fill={INK_TOKENS.muted}
              fontSize={Math.max(8, R * 0.13)}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {w.label}
            </text>
          ))}
      </g>
      {/* optional player name below */}
      {showName && (
        <text
          x={cx}
          y={cy + R + pad + 18}
          fill={INK_TOKENS.ink}
          fontSize={Math.max(12, R * 0.22)}
          fontWeight="bold"
          textAnchor="middle"
          style={{ fontFamily: SERIF }}
        >
          {name}
        </text>
      )}
    </svg>
  );
}

export default Fingerprint;
