export const colors = {
  bg: "#0C100E",
  card: "#171E1B",
  soft: "#1F2924",
  border: "#2C3A33",
  text: "#EEF3EF",
  muted: "#9AABA7",
  accent: "#C4A35A",
  accentStrong: "#DFC07A",
  danger: "#C45B5B",
  success: "#3D9A6A",
};

export function gbp(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}
