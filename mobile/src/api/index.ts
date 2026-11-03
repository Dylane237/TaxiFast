import type { Api } from "./api";
import { configApi } from "./config";
import { httpApi } from "./httpApi";
import { mockApi } from "./mockApi";

export const api: Api = configApi.modeDemo ? mockApi : httpApi;

export type { Api } from "./api";
export { ApiError } from "./errors";
export { configApi } from "./config";
export * from "./types";
