import { oneTimeResponse } from "./fake-data";
import { OneTimeTokenResponse } from "./types";

export class Api {
  public async getOneTimeToken(): Promise<OneTimeTokenResponse> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(oneTimeResponse);
      }, 1000);
    });
  }

  public createAppointment(data: any) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("Appointment created");
      }, 1000);
    });
  }
}
