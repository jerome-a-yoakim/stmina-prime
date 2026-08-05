export interface Group {
  id: string;
  name: string;
  grade: string | null;
  active: boolean;
  sortOrder: number;
  mainServant: string | null;
  assistantServants: string[];
  servantContact: string | null;
}
