const formatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 2,
});

export function formatNaira(amount: number): string {
  return formatter.format(amount);
}
