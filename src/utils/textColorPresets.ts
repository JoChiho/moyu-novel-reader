export interface TextColorPreset {
  id: string;
  label: string;
  color: string;
}

export const TEXT_COLOR_PRESETS: TextColorPreset[] = [
  { id: "black", label: "黑", color: "#000000" },
  { id: "dark-gray", label: "深灰", color: "#3d3d3d" },
  { id: "light-gray", label: "浅灰", color: "#b0b0b0" },
  { id: "white", label: "白", color: "#ffffff" },
];