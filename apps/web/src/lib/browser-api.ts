import axios from "axios";

// Talks only to this app's own /api/* Route Handlers, never to a backend
// service directly. No JWT interceptor needed here (unlike lib/api.ts's
// server-side clients): the access token lives in an httpOnly cookie, which
// the browser attaches to same-origin requests automatically — the Route
// Handler on the other end is what reads it and attaches the Bearer header
// for the actual backend call.
export const browserApi = axios.create({ baseURL: "/api", timeout: 15_000 });

export default browserApi;
