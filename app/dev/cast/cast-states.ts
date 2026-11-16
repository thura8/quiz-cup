export type CastState = "idle" | "thinking" | "answered" | "correct" | "wrong" | "missed";

export type UvPair = [number, number];

export const SHEET_COLUMNS = 3;
export const SHEET_ROWS = 2;
const TOP_ROW_V = 0.5;
const BOTTOM_ROW_V = 0;

export const CAST_STATES: { id: CastState; label: string; cellOffset: UvPair }[] = [
  { id: "idle", label: "idle (ready)", cellOffset: [0, TOP_ROW_V] },
  { id: "thinking", label: "thinking (idea)", cellOffset: [1 / 3, TOP_ROW_V] },
  { id: "answered", label: "answered (focus)", cellOffset: [2 / 3, TOP_ROW_V] },
  { id: "correct", label: "correct (celebrate)", cellOffset: [0, BOTTOM_ROW_V] },
  { id: "wrong", label: "wrong (disappointed)", cellOffset: [1 / 3, BOTTOM_ROW_V] },
  { id: "missed", label: "missed (surprised)", cellOffset: [2 / 3, BOTTOM_ROW_V] },
];

export const CELL_OFFSET_BY_STATE = Object.fromEntries(
  CAST_STATES.map((state) => [state.id, state.cellOffset]),
) as Record<CastState, UvPair>;

export function isTopRow(cellOffset: UvPair) {
  return cellOffset[1] > 0;
}

export type Frame = { offset: UvPair; repeat: UvPair; height: number; aspect: number };

export function fullCellFrame(state: CastState): Frame {
  return {
    offset: CELL_OFFSET_BY_STATE[state],
    repeat: [1 / SHEET_COLUMNS, 1 / SHEET_ROWS],
    height: 1,
    aspect: 1,
  };
}
