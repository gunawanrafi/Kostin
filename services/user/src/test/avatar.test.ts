import { describe, expect, it } from "vitest";
import type { ApiResponse } from "@kostin/types";
import { buildTestApp, makeUser, signAccessToken } from "./helpers.js";
import type { PublicUser } from "../lib/dto.js";

const BOUNDARY = "----kostinTestBoundary";

function multipartBody(fields: { filename: string; contentType: string; content: Buffer }): {
  headers: Record<string, string>;
  payload: Buffer;
} {
  const payload = Buffer.concat([
    Buffer.from(
      `--${BOUNDARY}\r\nContent-Disposition: form-data; name="avatar"; filename="${fields.filename}"\r\nContent-Type: ${fields.contentType}\r\n\r\n`,
    ),
    fields.content,
    Buffer.from(`\r\n--${BOUNDARY}--\r\n`),
  ]);
  return {
    headers: { "content-type": `multipart/form-data; boundary=${BOUNDARY}` },
    payload,
  };
}

describe("POST /users/me/avatar", () => {
  it("uploads an avatar and updates avatarUrl", async () => {
    const user = makeUser();
    const { app, deps } = buildTestApp({ users: [user] });
    const token = signAccessToken(user.id, user.role);
    const { headers, payload } = multipartBody({
      filename: "avatar.jpg",
      contentType: "image/jpeg",
      content: Buffer.from("fake-jpeg-bytes"),
    });

    const res = await app.inject({
      method: "POST",
      url: "/users/me/avatar",
      headers: { authorization: `Bearer ${token}`, ...headers },
      payload,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<PublicUser>>();
    expect(body.error).toBeNull();
    expect(body.data?.avatarUrl).toContain(user.id);
    expect(deps.avatarUploader.uploads).toHaveLength(1);
    expect(deps.avatarUploader.uploads[0]?.userId).toBe(user.id);
  });

  it("rejects a non-image file with 400 INVALID_FILE", async () => {
    const user = makeUser();
    const { app } = buildTestApp({ users: [user] });
    const token = signAccessToken(user.id, user.role);
    const { headers, payload } = multipartBody({
      filename: "resume.pdf",
      contentType: "application/pdf",
      content: Buffer.from("%PDF-1.4"),
    });

    const res = await app.inject({
      method: "POST",
      url: "/users/me/avatar",
      headers: { authorization: `Bearer ${token}`, ...headers },
      payload,
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("INVALID_FILE");
  });

  it("rejects requests without an Authorization header with 401 UNAUTHORIZED", async () => {
    const { app } = buildTestApp();
    const { headers, payload } = multipartBody({
      filename: "avatar.jpg",
      contentType: "image/jpeg",
      content: Buffer.from("fake-jpeg-bytes"),
    });

    const res = await app.inject({ method: "POST", url: "/users/me/avatar", headers, payload });

    expect(res.statusCode).toBe(401);
    expect(res.json<ApiResponse<null>>().error?.code).toBe("UNAUTHORIZED");
  });
});
