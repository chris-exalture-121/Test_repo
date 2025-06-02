import { describe, expect, it, vi } from "vitest";
import {} from "../../src/index";
import { exampleJwtToken } from "../__mock__/mockEvent";
import request from "supertest";
import app from "../../src/index";
import fs from "fs";
import path from "path";
import { unverifiedJwtDecode } from "../../src/jwt";

/**
 * This code mocks the JWT verification logic locally.
 */
vi.mock("jsonwebtoken", async (importOriginal) => {
  const original = await importOriginal<typeof import("jsonwebtoken")>();

  const verify = (bearerToken: string) => {
    try {
      const data = unverifiedJwtDecode(bearerToken);

      expect(data.header.kid).toBe("344bbf0a-3e22-40b0-9563-4c6513b747dd");
      expect(data.header.typ).toBe("JWT");
      expect(data.payload.aud).toBe("AAGOcWldqN8");
      expect(data.payload.userId).toBe("1234567890");

      return { ...data.payload };
    } catch (error) {
      throw error;
    }
  };

  // See also: https://vitest.dev/guide/mocking.html#:~:text=It%20is%20not%20possible%20to%20mock%20the%20foo%20method
  return {
    ...original,
    verify,
    default: {
      ...original.default,
      verify,
    },
  };
});

vi.mock("jwks-rsa", () => {
  return {
    JwksClient: vi.fn().mockImplementation(() => ({
      getSigningKey: vi.fn().mockResolvedValue({
        getPublicKey: vi.fn().mockResolvedValue("mocked-public-key"),
      }),
    })),
  };
});

// Mock fetch globally
global.fetch = vi.fn((url) => {
  // Check if the URL is for a Google Drive file download
  if (url.startsWith("https://www.googleapis.com/drive/v3/files/")) {
    const imagePath = path.resolve(__dirname, "../__mock__/example.png");
    const imageStream = fs.createReadStream(imagePath);

    return Promise.resolve({
      ok: true,
      body: imageStream,
      headers: new Headers({
        "Content-Type": "image/png",
      }),
    });
  }
});

vi.mock("aws-sdk", async (importOriginal) => {
  const mockKMS = {
    encrypt: vi.fn(({ Plaintext }) => ({
      promise: () => {
        return Promise.resolve({
          CiphertextBlob: Buffer.from(Plaintext),
        });
      },
    })),
    decrypt: vi.fn(({ CiphertextBlob }) => ({
      promise: () => {
        return Promise.resolve({
          Plaintext: CiphertextBlob.toString("utf-8"),
        });
      },
    })),
    verify: vi.fn().mockReturnValue({
      promise: () => Promise.resolve({ SignatureValid: true }),
    }),
    sign: vi.fn().mockReturnValue({
      promise: () => Promise.resolve({ Signature: Buffer.from("signature") }),
    }),
  };
  const actual = await importOriginal();
  return {
    ...actual,
    default: { ...actual.default, KMS: vi.fn(() => mockKMS) },
  };
});

/**
 * Tests begin
 */
describe("API Endpoint Testing", () => {
  it("should create a presigned URL", async () => {
    const response = await request(app)
      .post("/generate-url")
      .send({ fileId: "12345" })
      .set("X-Forward-Authorization", "Bearer token123")
      .set("Authorization", `Bearer ${exampleJwtToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("presignedUrl");
  });

  it("should create a presigned URL and should handle fetching assets", async () => {
    const presignedResponse = await request(app)
      .post("/generate-url")
      .send({ fileId: "12345" })
      .set("X-Forward-Authorization", "Bearer token123")
      .set("Authorization", `Bearer ${exampleJwtToken}`);

    expect(presignedResponse.status).toBe(200);
    expect(presignedResponse.body).toHaveProperty("presignedUrl");

    const presignedUrl = presignedResponse?.body?.presignedUrl;
    console.log(presignedUrl);

    const response = await request(app).get(
      `/asset?${presignedUrl?.split("?")?.[1]}`
    );

    expect(response.status).toBe(200);

    expect(response.headers["content-type"]).toBe("image/png");

    expect(response.body).toBeDefined();
    expect(response.body).not.toBeNull();
    expect(Buffer.isBuffer(response.body)).toBe(true); // Check if the body is a Buffer (common for binary data like files)
  });
});
