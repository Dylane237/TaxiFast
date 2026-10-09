import type { Api } from "./api";
import { httpApi } from "./httpApi";
import { mockApi } from "./mockApi";

const useMock = process.env.EXPO_PUBLIC_USE_MOCK !== "false";

export const api: Api = useMock ? mockApi : httpApi;

export type { Api } from "./api";
export { ApiError } from "./errors";
export * from "./types";
