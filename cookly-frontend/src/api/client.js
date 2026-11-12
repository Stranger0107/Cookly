/**
 * One axios instance for the whole app.
 *
 * - Adds "Authorization: Bearer <token>" to every request when logged in.
 * - Unwraps the backend envelope: { success, data } -> resolves with `data`.
 * - Turns failures into an ApiError with { status, message, fieldErrors }
 *   so components can show inline form errors or a toast.
 * - Calls a registered handler on 401 so the app can log the user out.
 */
import axios from 'axios';

const TOKEN_KEY = 'cookly-token';

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token) => {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage blocked (private mode): token lives only in memory for this tab */
    }
  },
};

export class ApiError extends Error {
  constructor({ status, message, fieldErrors = {}, raw }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors; // { email: "Please provide a valid email", ... }
    this.raw = raw;
  }
}

let unauthorizedHandler = null;
export const onUnauthorized = (handler) => {
  unauthorizedHandler = handler;
};

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 20000, // /api/match can take a few seconds on a cold cache
});

client.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (response) => response.data?.data,
  (error) => {
    const status = error.response?.status ?? 0;
    const body = error.response?.data;

    let message = body?.message;
    if (!message) {
      if (error.code === 'ECONNABORTED') message = 'The server took too long to respond';
      else if (!error.response) message = "Can't reach the server. Is the API running?";
      else message = 'Something went wrong';
    }

    const fieldErrors = {};
    for (const e of body?.errors || []) {
      // "ingredients[0].name" -> also expose under "ingredients" for simple forms
      if (!fieldErrors[e.field]) fieldErrors[e.field] = e.message;
      const root = e.field.split(/[.[]/)[0];
      if (!fieldErrors[root]) fieldErrors[root] = e.message;
    }

    // A 401 on a request that sent a token means the session is no longer valid.
    if (status === 401 && error.config?.headers?.Authorization && unauthorizedHandler) {
      unauthorizedHandler(message);
    }

    return Promise.reject(new ApiError({ status, message, fieldErrors, raw: body }));
  }
);

export default client;
