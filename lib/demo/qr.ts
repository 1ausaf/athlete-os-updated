/**
 * Round 21.2: minimal QR encoder — zero libraries, same hand-built ethos as
 * the invoice PDF. Byte mode, error-correction level L, versions 1–5 (a
 * single Reed–Solomon block, up to 106 bytes — plenty for pay-link URLs).
 * Returns the module matrix; renderers draw the squares themselves. Returns
 * null when the text doesn't fit or isn't Latin-1, so callers simply skip
 * the code. Mask is chosen by the standard four penalty rules.
 */

/* ---------------------------------------------------------------- */
/* GF(256) arithmetic (polynomial 0x11d) for Reed–Solomon EC bytes  */
/* ---------------------------------------------------------------- */

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]!;
}

function reedSolomon(data: number[], ecLen: number): number[] {
  // Generator polynomial g(x) = Π (x − α^i), i = 0..ecLen-1.
  let gen = [1];
  for (let i = 0; i < ecLen; i++) {
    const factor = [1, EXP[i]!];
    const next = new Array<number>(gen.length + 1).fill(0);
    for (let a = 0; a < gen.length; a++) {
      for (let b = 0; b < 2; b++) {
        const ga = gen[a]!;
        const fb = factor[b]!;
        if (ga !== 0 && fb !== 0) {
          next[a + b] = next[a + b]! ^ EXP[(LOG[ga]! + LOG[fb]!) % 255]!;
        }
      }
    }
    gen = next;
  }
  // Polynomial division; the remainder is the EC block.
  const msg = data.concat(new Array<number>(ecLen).fill(0));
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i]!;
    if (coef === 0) continue;
    const lc = LOG[coef]!;
    for (let j = 0; j < gen.length; j++) {
      const gj = gen[j]!;
      if (gj !== 0) msg[i + j] = msg[i + j]! ^ EXP[(lc + LOG[gj]!) % 255]!;
    }
  }
  return msg.slice(data.length);
}

/* ---------------------------------------------------------------- */
/* Encoding                                                          */
/* ---------------------------------------------------------------- */

/** [version, data codewords, EC codewords] — EC level L, single block. */
const VERSIONS: ReadonlyArray<readonly [number, number, number]> = [
  [1, 19, 7],
  [2, 34, 10],
  [3, 55, 15],
  [4, 80, 20],
  [5, 108, 26],
];

const getBit = (x: number, i: number): boolean => ((x >>> i) & 1) !== 0;

/** Encode `text` into a QR module matrix (true = dark). Null if unfit. */
export function qrMatrix(text: string): boolean[][] | null {
  const bytes: number[] = [];
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code > 0xff) return null; // Latin-1 only — URLs are ASCII anyway
    bytes.push(code);
  }

  const spec = VERSIONS.find(([, dataCw]) => bytes.length <= dataCw - 2);
  if (!spec) return null;
  const [version, dataCw, ecCw] = spec;
  const size = 17 + 4 * version;

  /* Bit stream: mode 0100, 8-bit count, data, terminator, byte pads. */
  const bits: number[] = [];
  const push = (value: number, count: number) => {
    for (let i = count - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  push(0b0100, 4);
  push(bytes.length, 8);
  for (const b of bytes) push(b, 8);
  const capacity = dataCw * 8;
  push(0, Math.min(4, capacity - bits.length)); // terminator
  while (bits.length % 8 !== 0) bits.push(0);
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let cw = 0;
    for (let j = 0; j < 8; j++) cw = (cw << 1) | bits[i + j]!;
    codewords.push(cw);
  }
  for (let pad = 0xec; codewords.length < dataCw; pad ^= 0xfd) {
    codewords.push(pad); // 0xEC / 0x11 alternating
  }
  const all = codewords.concat(reedSolomon(codewords, ecCw));

  /* Matrix scaffolding: mat = darkness, fun = function/reserved cells. */
  const mat: boolean[][] = Array.from({ length: size }, () =>
    new Array<boolean>(size).fill(false),
  );
  const fun: boolean[][] = Array.from({ length: size }, () =>
    new Array<boolean>(size).fill(false),
  );
  const setF = (col: number, row: number, dark: boolean) => {
    mat[row]![col] = dark;
    fun[row]![col] = true;
  };

  // Timing patterns.
  for (let i = 0; i < size; i++) {
    setF(6, i, i % 2 === 0);
    setF(i, 6, i % 2 === 0);
  }
  // Finder patterns + separators (dist 2 and 4 rings are light).
  for (const [cx, cy] of [
    [3, 3],
    [size - 4, 3],
    [3, size - 4],
  ] as const) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const col = cx + dx;
        const row = cy + dy;
        if (col < 0 || col >= size || row < 0 || row >= size) continue;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        setF(col, row, dist !== 2 && dist !== 4);
      }
    }
  }
  // Single alignment pattern for v2+ (the only center clear of finders).
  if (version >= 2) {
    const c = 4 * version + 10;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        setF(c + dx, c + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }
  // Reserve the format-info areas (values drawn after mask selection).
  for (let i = 0; i <= 8; i++) {
    setF(8, i, false);
    setF(i, 8, false);
    if (i < 8) {
      setF(size - 1 - i, 8, false);
      setF(8, size - 1 - i, false);
    }
  }
  setF(8, size - 8, true); // dark module

  /* Zigzag data placement (skips the timing column). */
  let bitIdx = 0;
  const totalBits = all.length * 8;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const col = right - j;
        const upward = ((right + 1) & 2) === 0;
        const row = upward ? size - 1 - vert : vert;
        if (!fun[row]![col] && bitIdx < totalBits) {
          mat[row]![col] = getBit(all[bitIdx >>> 3]!, 7 - (bitIdx & 7));
          bitIdx++;
        }
        // Remainder cells stay light (0).
      }
    }
  }

  /* Try all 8 masks; keep the lowest-penalty result. */
  const MASKS: ReadonlyArray<(col: number, row: number) => boolean> = [
    (x, y) => (x + y) % 2 === 0,
    (_x, y) => y % 2 === 0,
    (x) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];
  const applyMask = (m: number) => {
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (!fun[row]![col] && MASKS[m]!(col, row)) {
          mat[row]![col] = !mat[row]![col];
        }
      }
    }
  };
  const drawFormat = (mask: number) => {
    const data = (0b01 << 3) | mask; // EC level L = 01
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const f = ((data << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i++) setF(8, i, getBit(f, i));
    setF(8, 7, getBit(f, 6));
    setF(8, 8, getBit(f, 7));
    setF(7, 8, getBit(f, 8));
    for (let i = 9; i < 15; i++) setF(14 - i, 8, getBit(f, i));
    for (let i = 0; i < 8; i++) setF(size - 1 - i, 8, getBit(f, i));
    for (let i = 8; i < 15; i++) setF(8, size - 15 + i, getBit(f, i));
    setF(8, size - 8, true);
  };

  let bestMask = 0;
  let bestPenalty = Infinity;
  for (let m = 0; m < 8; m++) {
    applyMask(m);
    drawFormat(m);
    const p = penalty(mat, size);
    if (p < bestPenalty) {
      bestPenalty = p;
      bestMask = m;
    }
    applyMask(m); // XOR twice = undo
  }
  applyMask(bestMask);
  drawFormat(bestMask);
  return mat;
}

/** The four standard mask-evaluation penalty rules. */
function penalty(mat: boolean[][], size: number): number {
  let score = 0;
  const runScore = (line: boolean[]): number => {
    let s = 0;
    let run = 1;
    for (let i = 1; i <= line.length; i++) {
      if (i < line.length && line[i] === line[i - 1]) {
        run++;
      } else {
        if (run >= 5) s += 3 + (run - 5);
        run = 1;
      }
    }
    return s;
  };
  const finderScore = (line: boolean[]): number => {
    // 1011101 with 4 light modules on either side.
    const P1 = [true, false, true, true, true, false, true, false, false, false, false];
    const P2 = [false, false, false, false, true, false, true, true, true, false, true];
    let s = 0;
    for (let i = 0; i + 11 <= line.length; i++) {
      if (P1.every((v, j) => line[i + j] === v)) s += 40;
      if (P2.every((v, j) => line[i + j] === v)) s += 40;
    }
    return s;
  };
  let dark = 0;
  for (let r = 0; r < size; r++) {
    const row = mat[r]!;
    const col = mat.map((line) => line[r]!);
    score += runScore(row) + runScore(col) + finderScore(row) + finderScore(col);
    for (let c = 0; c < size; c++) {
      if (row[c]) dark++;
      if (
        r + 1 < size &&
        c + 1 < size &&
        row[c] === row[c + 1] &&
        row[c] === mat[r + 1]![c] &&
        row[c] === mat[r + 1]![c + 1]
      ) {
        score += 3;
      }
    }
  }
  const pct = (dark * 100) / (size * size);
  score += 10 * Math.floor(Math.abs(pct - 50) / 5);
  return score;
}

/* ---------------------------------------------------------------- */
/* Renderers                                                         */
/* ---------------------------------------------------------------- */

/** SVG path data covering every dark module in a 1-unit grid. */
export function qrPathData(mat: boolean[][]): string {
  const parts: string[] = [];
  for (let r = 0; r < mat.length; r++) {
    const row = mat[r]!;
    for (let c = 0; c < row.length; c++) {
      if (!row[c]) continue;
      let run = 1;
      while (c + run < row.length && row[c + run]) run++;
      parts.push(`M${c} ${r}h${run}v1h-${run}z`);
      c += run - 1;
    }
  }
  return parts.join("");
}

/** Self-contained `<svg>` markup (white tile + quiet zone) for HTML use. */
export function qrSvg(text: string, sizePx: number): string {
  const mat = qrMatrix(text);
  if (!mat) return "";
  const n = mat.length;
  const q = 4; // quiet zone, modules
  return `<svg width="${sizePx}" height="${sizePx}" viewBox="${-q} ${-q} ${n + 2 * q} ${n + 2 * q}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><rect x="${-q}" y="${-q}" width="${n + 2 * q}" height="${n + 2 * q}" fill="#fff"/><path d="${qrPathData(mat)}" fill="#111"/></svg>`;
}
