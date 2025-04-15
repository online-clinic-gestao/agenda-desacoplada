import axios from "axios";
import { OneTimeTokenResponse } from "./types";
import { CONFIG } from "./config";

export class Api {
  public async getOneTimeToken(): Promise<OneTimeTokenResponse> {
    const env: string = CONFIG.ENVIRONMENT;
    try {
      const response = await axios.post(
        `${CONFIG.AUTHORIZATION_ENDPOINT}`,
        env == "DEVELOPMENT"
          ? {
              doctor_id: CONFIG.DOCTOR_ID,
              clinic_id: CONFIG.CLINIC_ID,
            }
          : {},
        {
          headers: {
            "Content-Type": "application/json",
            ...(env == "DEVELOPMENT"
              ? {
                  "X-API-KEY": CONFIG.X_API_KEY,
                }
              : {}),
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching one-time token:", error);
      throw error;
    }
  }

  public async createAppointment(data: any, token: any) {
    const env = CONFIG.ENVIRONMENT;
    const urls: any = {
      SANDBOX: "https://hml.onlineclinic.com.br/api/v1/appointment/create/",
      PRODUCTION: "https://app.onlineclinic.com.br/api/v1/appointment/create/",
      DEVELOPMENT: CONFIG.DEVELOPMENT_ENDPOINT,
    };
    const url = urls[env];

    try {
      const response = await axios.post(
        url,
        {
          ...data,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching one-time token:", error);
      throw error;
    }
  }
}
