import { RGBColor } from "./bitmap";

export type Yarn = {
  color: RGBColor;
};

export type SingleYarnConfig = {
  yarn: Yarn;
};

export type FairisleConfig = {
  feeder_1: Yarn; // Main yarn
  feeder_2: Yarn; // Contrast yarn
};

export type YarnChangerConfig = {
  a: Yarn | null;
  b: Yarn | null;
  c: Yarn | null;
  d: Yarn | null;
};

export type YarnConfig = FairisleConfig | YarnChangerConfig | SingleYarnConfig;

export type PatternConfig = {
  double_cols: boolean;
  double_rows: boolean;
  negative: boolean;
  mirror_vertical: boolean;
  mirror_horizontal: boolean;
  repeat_horizontal: boolean;
  repeat_vertical: boolean;
  centerX: boolean;
  endNeedleSelection: boolean; // knit contrast yarn on the end needles
  marginLeft: number;
  marginRight: number;
};

export type MachineState = {
  pointCams: [number, number];
  carriageSide: "left" | "right";
  yarnConfig: YarnConfig;
};

export type KnittingState = {
  patterning: boolean; // If we are doing auto patterning
  currentRowNumber: number;
  carriageSide: "left" | "right";
  row: number[];
};

export type DesignState = {
  selectedColor: RGBColor;
  selectedTool: "brush" | "flood" | "rect" | "line" | "shift" | "pan";
};
