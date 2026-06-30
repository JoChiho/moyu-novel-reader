export interface EyeCareTheme {
  id: string;
  name: string;
  textColor: string;
  backgroundColor: string;
}

export const EYE_CARE_THEMES: EyeCareTheme[] = [
  {
    id: "green",
    name: "护眼绿",
    textColor: "#3d3d3d",
    backgroundColor: "#c7edcc",
  },
  {
    id: "parchment",
    name: "羊皮纸",
    textColor: "#4a3f35",
    backgroundColor: "#f5e6c8",
  },
  {
    id: "night",
    name: "夜间",
    textColor: "#c8c8c8",
    backgroundColor: "#1a1a1a",
  },
  {
    id: "blue",
    name: "淡蓝",
    textColor: "#2c3e50",
    backgroundColor: "#e8f4fc",
  },
];