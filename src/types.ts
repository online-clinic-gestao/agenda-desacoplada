export type Procedure = {
  id: string;
  name: string;
  description: string;
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
  weekday: number; // 0 - monday/ 6 - sunday
};

export type OneTimeTokenResponse = {
  token: {
    access_token: string;
    expires_in: number;
  };
  procedures: Procedure[];
  appointments: Appointments[];
  working_hours: WorkingHours[];
};
