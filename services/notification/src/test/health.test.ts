import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { buildTestApp } from "./helpers.js";

describe("GET /health", () => {
  it("returns ok in the standard envelope", async () => {
    const { app } = buildTestApp();

    const res = await app.inject({ method: "GET", url: "/health" });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<{ status: string }>>();
    expect(body.data?.status).toBe("ok");
    expect(body.error).toBeNull();
    expect(body.meta.requestId).toBeTypeOf("string");
  });
});
