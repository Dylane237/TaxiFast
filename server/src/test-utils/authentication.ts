import type { Role } from "@prisma/client";
import type { Authentication } from "../services/authentication.js";

export function authenticationAs(userId: string, role: Role): Authentication {
  return {
    async requestOtp() {
      throw new Error("Non utilisé dans ce test");
    },
    async verifyOtp() {
      throw new Error("Non utilisé dans ce test");
    },
    async authenticate() {
      return { userId, role, phone: "+237690000000" };
    },
  };
}
