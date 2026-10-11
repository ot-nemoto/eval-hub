import { describe, expect, it } from "vitest";
import { createApiKeyValue, hashApiKey } from "./apiKey";

// `eh_` + base64url(32 bytes)（パディング無し 43 文字）
const API_KEY_RE = /^eh_[A-Za-z0-9_-]{43}$/;

describe("createApiKeyValue", () => {
  it("eh_ prefix 付きの base64url 形式のキーを生成する", () => {
    expect(createApiKeyValue()).toMatch(API_KEY_RE);
  });

  it("呼び出しごとに異なる値を返す", () => {
    expect(createApiKeyValue()).not.toBe(createApiKeyValue());
  });
});

describe("hashApiKey", () => {
  it("SHA-256 の hex を返す（既知ベクタ）", async () => {
    expect(await hashApiKey("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("マルチバイト文字は UTF-8 バイト列としてハッシュ化する", async () => {
    // PostgreSQL: encode(sha256(convert_to('あ', 'UTF8')), 'hex') と一致する値
    expect(await hashApiKey("あ")).toBe(
      "dc5a4d3d82f7e15792959dc661538ae0e541ce66494516f5c9cfd9cd3308494d",
    );
  });

  it("バックスラッシュを含む値も文字列のまま（4 バイト）ハッシュ化する", async () => {
    // PostgreSQL: encode(sha256(convert_to('\x41', 'UTF8')), 'hex') と一致する値
    // （'\x41'::bytea は hex 解釈で 1 バイトの 'A' になり一致しない）
    expect(await hashApiKey("\\x41")).toBe(
      "1896ffde59d289c620736dfe59b6cd146ab433b57ef92479bd77bdd57fcc3e27",
    );
  });

  it("空文字でもハッシュを返す", async () => {
    expect(await hashApiKey("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });
});
