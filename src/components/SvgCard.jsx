import React, { useEffect, useState } from 'react';
import playingCardsSheet from '../assets/PlayingCards.svg';
import jokersSheet from '../assets/Jokers.svg';

// Sheet layout (no pixel sizes):
// PlayingCards.svg = 13 columns (Ace..K) x 4 rows (Clubs, Hearts, Spades, Diamonds)
// Jokers.svg       = 2 columns (Guarantee, Joker) x 1 row
const PLAYING_COLS = 13;
const PLAYING_ROWS = 4;
const JOKER_COLS = 2;
const JOKER_ROWS = 1;

const VALUE_TO_COL = {
  A: 0,
  '2': 1,
  '3': 2,
  '4': 3,
  '5': 4,
  '6': 5,
  '7': 6,
  '8': 7,
  '9': 8,
  '10': 9,
  J: 10,
  Q: 11,
  K: 12,
};

const SUIT_TO_ROW = { C: 0, H: 1, S: 2, D: 3 };
const SUIT_LABEL = { C: 'Clubs', H: 'Hearts', S: 'Spades', D: 'Diamonds' };
const VALUE_LABEL = { A: 'Ace', J: 'Jack', Q: 'Queen', K: 'King' };

const normalizeCode = (code) => (code || '').trim().toUpperCase();

const dimensionCache = new Map();

function useSheetDimensions(src) {
  const cached = dimensionCache.get(src) || null;
  const [dims, setDims] = useState(cached);

  useEffect(() => {
    if (dimensionCache.has(src)) {
      setDims(dimensionCache.get(src));
      return;
    }

    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      const next = { width, height };
      dimensionCache.set(src, next);
      setDims(next);
    };
    img.src = src;
  }, [src]);

  return dims;
}

function buildPlayingSpec(code) {
  const normalized = normalizeCode(code);
  const match = normalized.match(/^(A|[2-9]|10|J|Q|K)([CHSD])$/);
  if (!match) return null;
  const [, value, suit] = match;
  const col = VALUE_TO_COL[value];
  const row = SUIT_TO_ROW[suit];
  if (col === undefined || row === undefined) return null;

  return {
    sheet: playingCardsSheet,
    col,
    row,
    label: `${VALUE_LABEL[value] || value} of ${SUIT_LABEL[suit]}`,
    cols: PLAYING_COLS,
    rows: PLAYING_ROWS,
  };
}

function buildJokerSpec(code) {
  const normalized = normalizeCode(code);
  if (normalized === 'JG') {
    return {
      sheet: jokersSheet,
      label: 'Guarantee',
      col: 0,
      row: 0,
      cols: JOKER_COLS,
      rows: JOKER_ROWS,
    };
  }
  if (normalized === 'JJ') {
    return {
      sheet: jokersSheet,
      label: 'Joker',
      col: 1,
      row: 0,
      cols: JOKER_COLS,
      rows: JOKER_ROWS,
    };
  }
  return null;
}

function resolveSpec(code) {
  return buildJokerSpec(code) || buildPlayingSpec(code);
}

export default function SvgCard({ code, scale = 1, className, style, title }) {
  const spec = resolveSpec(code);
  if (!spec) return null;

  const dims = useSheetDimensions(spec.sheet);
  if (!dims) return null;

  const cardWidth = dims.width / spec.cols;
  const cardHeight = dims.height / spec.rows;

  const viewBoxX = spec.col * cardWidth;
  const viewBoxY = spec.row * cardHeight;

  const displayWidth = cardWidth * scale;
  const displayHeight = cardHeight * scale;
  const label = title || spec.label || code;

  return (
    <svg
      role="img"
      aria-label={label}
      width={displayWidth}
      height={displayHeight}
      viewBox={`${viewBoxX} ${viewBoxY} ${cardWidth} ${cardHeight}`}
      className={className}
      style={{ imageRendering: 'pixelated', shapeRendering: 'crispEdges', ...style }}
    >
      {label && <title>{label}</title>}
      <image
        href={spec.sheet}
        width={dims.width}
        height={dims.height}
        style={{ imageRendering: 'pixelated', shapeRendering: 'crispEdges' }}
      />
    </svg>
  );
}
