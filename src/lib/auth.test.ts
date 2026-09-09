// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createSessionToken, verifySessionToken, passwordMatches } from "./auth";

const secret = "a-long-test-secret-that-nobody-guesses";

describe("createSessionToken / verifySessionToken", () => {
  it("accepts a token it issued", async () => {
    const token = await createSessionToken(secret);
    expect(await verifySessionToken(token, secret)).toBe(true);
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await createSessionToken("some-other-secret");
    expect(await verifySessionToken(token, secret)).toBe(false);
  });

  it("rejects a tampered token", async () => {
    const token = await createSessionToken(secret);
    const [payload, signature] = token.split(".");
    const tampered = `${payload}x.${signature}`;
    expect(await verifySessionToken(tampered, secret)).toBe(false);
  });

  it("rejects rubbish", async () => {
    expect(await verifySessionToken("", secret)).toBe(false);
    expect(await verifySessionToken("not-a-token", secret)).toBe(false);
    expect(await verifySessionToken(undefined, secret)).toBe(false);
  });
});

describe("passwordMatches", () => {
  it("is true only for the exact password", () => {
    expect(passwordMatches("hunter2", "hunter2")).toBe(true);
    expect(passwordMatches("hunter2", "hunter3")).toBe(false);
    expect(passwordMatches("hunter2", "hunter22")).toBe(false);
    expect(passwordMatches("", "hunter2")).toBe(false);
  });
});
