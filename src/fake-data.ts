import { OneTimeTokenResponse } from "./types";

export const oneTimeResponse: OneTimeTokenResponse = {
  token: {
    access_token: "fake_access_token",
    expires_in: 3600,
  },

  procedures: [
    {
      id: "1",
      name: "Procedure A",
      description: "Description A",
      price: 100,
      time: 15,
      health_operators: [
        { name: "Operator A", id: "1" },
        { name: "Operator B", id: "2" },
      ],
    },
    {
      id: "2",
      name: "Procedure B",
      description: "Description B",
      price: 200,
      time: 45,
      health_operators: [{ name: "Operator B", id: "2" }],
    },
  ],
  appointments: [
    { start: "2025-04-12T09:00:00", end: "2025-04-12T09:15:00" },
    { start: "2025-04-13T10:00:00", end: "2025-04-13T10:13:00" },
  ],
  working_hours: [
    {
      weekday: 6,
      start: "09:00",
      end: "18:00",
    },
    {
      weekday: 0,
      start: "12:00",
      end: "18:00",
    },
  ],
};
