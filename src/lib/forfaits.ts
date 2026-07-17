export type Forfait = {
  id: string;
  name: string;
  priceCents: number;
  budgetCapCents: number;
};

export const FORFAITS: Forfait[] = [
  { id: "forfait_1", name: "Forfait 1", priceCents: 5000, budgetCapCents: 20000 },
  { id: "forfait_2", name: "Forfait 2", priceCents: 10000, budgetCapCents: 50000 },
  { id: "forfait_3", name: "Forfait 3", priceCents: 20000, budgetCapCents: 120000 },
  { id: "forfait_4", name: "Forfait 4", priceCents: 50000, budgetCapCents: 500000 },
];

export function formatEUR(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}
