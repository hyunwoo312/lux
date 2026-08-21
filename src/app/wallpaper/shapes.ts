export const MESH_POLYGONS = [
  "174,142 490,426 86,557",
  "811,120 1000,411 709,600 520,309",
  "454,122 675,244 627,492 376,523 269,294",
  "683,447 840,621 767,845 537,893 380,719 453,495",
  "438,541 452,922 115,743",
  "600,11 824,125 710,349 486,235",
  "249,436 375,591 266,759 73,707 62,507",
  "832,418 1011,483 1044,670 898,792 719,727 686,540",
  "433,412 680,555 433,698",
  "512,27 588,217 398,293 322,103",
  "805,47 924,170 844,320 676,291 652,122",
  "726,371 823,612 566,576",
  "198,671 304,863 112,969 6,777",
  "930,206 1015,307 970,431 840,454 755,353 800,229",
];

export const MESH_DRIFTS = ["wp-drift-1", "wp-drift-2", "wp-drift-3"];

export type GradientBlob = {
  x: number;
  y: number;
  size: number;
  hue: number;
  drift: string;
  duration: number;
};

export const GRADIENT_SETS = {
  still: [
    { x: 50, y: -12, size: 95, hue: 0, drift: "", duration: 0 },
    { x: 12, y: 22, size: 62, hue: -28, drift: "", duration: 0 },
    { x: 88, y: 34, size: 58, hue: 24, drift: "", duration: 0 },
    { x: 32, y: 82, size: 70, hue: -12, drift: "", duration: 0 },
    { x: 78, y: 96, size: 66, hue: 40, drift: "", duration: 0 },
  ],
} as const satisfies Record<string, readonly GradientBlob[]>;

export type GradientStyle = keyof typeof GRADIENT_SETS;
