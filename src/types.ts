import { RGBColor } from "./utils/bitmap";

export type PatternConfig = {
  double_cols: boolean;
  double_rows: boolean;
  negative: boolean;
  mirror_vertical: boolean;
  mirror_horizontal: boolean;
  repeat_horizontal: boolean;
  repeat_vertical: boolean;
  alignment: "left" | "center" | "right";
  endNeedleSelection: boolean; // knit contrast yarn on the end needles
  marginLeft: number;
  marginRight: number;
  height: number;
  heightFromTile: boolean; // If true, use the base tile height (after doubling/mirroring)
};

export type KnittingState = {
  pointCams: [number, number];
  carriageSide: "left" | "right";
  patterning: boolean; // If interactive patterning is active
  currentRowNumber: number; // Current row number in the pattern
  totalRows: number; // Total row counter
};

export type FairisleRowColors = {
  yarn1: RGBColor;
  yarn2: RGBColor;
};

export type YarnLibraryEntry = {
  id: string;
  name: string;
  color: RGBColor;
};

export type DesignState = {
  selectedPaletteIndex: number;
  selectedTool: "brush" | "flood" | "rect" | "line" | "shift";
  mousePos: [number, number] | null;
  fairisleMode: boolean;
  fairisleColors: FairisleRowColors[]; // One entry per base pattern row
  showFairisleColors: boolean; // Whether to display yarn colors or black/white
};
