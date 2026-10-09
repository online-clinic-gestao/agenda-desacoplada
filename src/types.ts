export type Procedure = {
  id: string;
  name: string;
  description?: string;
  time: number;
  price: number;
  health_operators: HealthOperator[];
};

export type HealthOperator = {
  name: string;
  id: string;
};

export type Appointments = {
  start: string;
  end: string;
};

export type WorkingHours = {
  start: string;
  end: string;
  weekday: number; // 0 - sunday / 6 - saturday (como `Date.getDay()` e o backend)
};

export type OneTimeTokenResponse = {
  access_token: string;
  procedures: Procedure[];
  appointments: Appointments[];
  working_hours: WorkingHours[];
  // OLC-1070: quantos horarios oferecer por dia. Ausente ou null = sem limite, que e' o
  // caso de toda clinica que nao configurou o recurso -- a tela segue mostrando a grade
  // inteira, exatamente como antes.
  max_slots_per_day?: number | null;
  // OLC-1028: faixa etaria que o medico atende (anos inteiros, inclusiva). Ausente ou null
  // = sem limite daquele lado -- o caso de todo medico que a clinica nao configurou.
  min_age?: number | null;
  max_age?: number | null;
};
