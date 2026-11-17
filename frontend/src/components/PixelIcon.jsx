// Small pixel-art icons drawn from text grids, in place of emojis (emojis look like a phone app, not a game).
// '#' = the icon's colour (currentColor unless `color` is given), '+' = a lighter shine, '.' = empty.
// Usage: <PixelIcon name="lock" size={20} />   (size = height in px; width follows the grid)

const ICONS = {
  lock: [
    '..####..',
    '.#....#.',
    '.#....#.',
    '########',
    '###++###',
    '###..###',
    '####.###',
    '########',
  ],
  crown: [
    '#...#...#',
    '##.###.##',
    '#########',
    '#+##+##+#',
    '#########',
    '#########',
  ],
  check: [
    '.......##',
    '......###',
    '.....###.',
    '##..###..',
    '###.##...',
    '.#####...',
    '..###....',
    '...#.....',
  ],
  cross: [
    '##....##',
    '###..###',
    '.######.',
    '..####..',
    '..####..',
    '.######.',
    '###..###',
    '##....##',
  ],
  orb: [
    '...###...',
    '.#######.',
    '.#++####.',
    '##+######',
    '#########',
    '.#######.',
    '..#####..',
    '.#.....#.',
    '#########',
  ],
  trophy: [
    '#########',
    '#.#####.#',
    '#.##+##.#',
    '.#######.',
    '..#####..',
    '...###...',
    '....#....',
    '..#####..',
    '.#######.',
  ],
};

const PixelIcon = ({ name, size = 16, color, className, style, label }) => {
  const grid = ICONS[name];
  if (!grid) return null;
  const h = grid.length, w = grid[0].length;
  const cells = [];
  grid.forEach((row, y) => [...row].forEach((c, x) => {
    if (c === '#') cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />);
    else if (c === '+') cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#fff" opacity="0.75" />);
  }));
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={Math.round((size * w) / h)}
      height={size}
      shapeRendering="crispEdges"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', color, ...style }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {cells}
    </svg>
  );
};

export default PixelIcon;
