import { Bitmap, RGBColor } from "./bitmap";

type Yarn = {
  color: RGBColor;
};

type SingleYarnConfig = {
  yarn: Yarn;
};

type FairisleConfig = {
  feeder_1: Yarn; // Main yarn
  feeder_2: Yarn; // Contrast yarn
};

type YarnChangerConfig = {
  a: Yarn | null;
  b: Yarn | null;
  c: Yarn | null;
  d: Yarn | null;
};

type YarnConfig = FairisleConfig | YarnChangerConfig | SingleYarnConfig;

export type PatternConfig = {
  double_cols: boolean;
  double_rows: boolean;
  negative: boolean;
  mirror_vertical: boolean;
  mirror_horizontal: boolean;
  repeat_horizontal: boolean;
  repeat_vertical: boolean;
  center: boolean;
  end_needles: boolean; // knit contrast yarn on the end needles
  margin_left: number;
  margin_right: number;
};

export type MachineState = {
  pointCams: [number, number];
  carriageSide: "left" | "right";
  yarnConfig: YarnConfig;
};

export type KnittingMode = {
  currentRow: number;
  carriageSide: "left" | "right";
};

export type DesignMode = {
  selectedColor: RGBColor;
  selectedTool: "brush" | "flood" | "rect" | "line" | "shift" | "pan";
};

export type InteractionMode = KnittingMode | DesignMode;

export const initialState = {
  patternConfig: {
    double_cols: false,
    double_rows: false,
    negative: false,
    mirror_vertical: false,
    mirror_horizontal: false,
    center: false,
    repeat_horizontal: true,
    repeat_vertical: true,
    end_needles: false,
    margin_left: 0,
    margin_right: 0,
  } as PatternConfig,
  machineState: {
    pointCams: [0, 0],
    carriageSide: "left",
    yarnConfig: {
      feeder_1: { color: [255, 0, 0] },
      feeder_2: { color: [0, 255, 0] },
    } as FairisleConfig,
  } as MachineState,
  basePattern: {
    data: new Array(3000).fill(0).map(() => Math.round(Math.random())), // 100x30 = 3000 pixels
    width: 100,
    height: 30,
    palette: [
      [0, 0, 0],
      [255, 255, 255],
    ],
  } as Bitmap,
  interactionMode: {
    currentRow: 0,
    carriageSide: "left",
  } as InteractionMode,
};

export type GlobalState = typeof initialState;
