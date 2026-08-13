// Bảng màu dùng cho biểu đồ — lấy theo palette đã kiểm định (colorblind-safe) của skill
// "dataviz". Màu categorical PHẢI gán theo đúng thứ tự cố định dưới đây, không đảo lộn.

export const CATEGORICAL_COLORS = [
  "#2a78d6", // 1 blue
  "#eb6834", // 2 orange
  "#1baf7a", // 3 aqua
  "#eda100", // 4 yellow
  "#e87ba4", // 5 magenta
  "#008300", // 6 green
  "#4a3aa7", // 7 violet
  "#e34948", // 8 red
];

export const STATUS_COLORS = {
  good: "#1baf7a",
  warning: "#eda100",
  serious: "#eb6834",
  critical: "#e34948",
};

/** Gán màu cố định cho từng mã nhân viên theo thứ tự allowlist, để màu của 1 nhân viên
 * luôn giữ nguyên dù danh sách hiển thị có lọc/sắp xếp lại. */
export function colorForIndex(index: number): string {
  return CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length];
}
