export type InstitutionalFlow = {
  id: string;

  // -1..1 bias; negative = cautious bias, positive = constructive bias (synthetic for now)
  biasTone: number;

  narrative: string;

  intensity: number; // 0..1
};
