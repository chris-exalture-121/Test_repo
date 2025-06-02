require("dotenv").config();
import express from "express";
import { pipeline } from "stream";
import { promisify } from "util";
import cors from "cors";
import AWS from "aws-sdk";
import { logger } from "./logger";
import { jwtMiddleware } from "./jwt";
import { corsOptionsDelegate } from "./cors";
// @ts-ignore types not pulling in correctly for helmet
import helmet, { HelmetOptions } from "helmet";
import { body, query, validationResult } from "express-validator";

const app = express();
const port = process.env.PORT || 3000;
const streamPipeline = promisify(pipeline);
const SYMMETRIC_KEY_ALIAS = "asset-proxy";

// TODO: we can make this shorter if required
const PRESIGNED_URL_TIMEOUT_MS = 1000 * 60 * 4;

// Setup AWS KMS
AWS.config.update({ region: "us-east-1" });
const kms = new AWS.KMS();

// Security: Helmet to set various HTTP headers and Content Security Policy
const helmetOptions = {
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'"],
      "connect-src": ["'self'", "https://www.googleapis.com"],
      "img-src": ["'self'", "data:"],
      "style-src": ["'self'", "'unsafe-inline'"],
    },
  },
  frameguard: { action: "deny" },
  referrerPolicy: { policy: "no-referrer" },
};

// CORS setup
app.use(cors(corsOptionsDelegate));
app.use(express.json());

// add healthcheck endpoint
app.get("/health", (req, res) => {
  res.send("OK");
});

// Strict input validation for body and headers
app.post(
  "/generate-url",
  helmet(helmetOptions as HelmetOptions),
  // @ts-ignore
  jwtMiddleware,
  body("fileId").isString().notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("🚀 ~ generate-url,  errors:", errors);

      return res.status(400).json({ errors: errors.array() });
    }

    try {
      logger.debug("body", req.body);

      const { fileId } = req.body;
      const accessToken = (
        req.headers["x-forward-authorization"] as string
      )?.replace("Bearer ", "");

      if (!accessToken || !fileId) {
        console.log("🚀 ~ generate-url,  accessToken:", accessToken);
        logger.error("Error, no fileId or accessToken");
        return res.status(400).send();
      }

      const expiryTime = Date.now() + PRESIGNED_URL_TIMEOUT_MS;
      const payload = { accessToken, expiry: expiryTime, fileId };
      console.log("🚀 ~ generate-url,  payload:", payload);
      // Encrypt the payload
      const { CiphertextBlob } = await kms
        .encrypt({
          KeyId: `alias/${SYMMETRIC_KEY_ALIAS}`,
          Plaintext: JSON.stringify(payload),
        })
        .promise();

      logger.debug("CiphertextBlob", CiphertextBlob);
      const encryptedPayload = CiphertextBlob!.toString("base64");

      const presignedUrl = `https://${req.get(
        "host"
      )}/asset?payload=${encodeURIComponent(encryptedPayload!)}`;

      return res.send({ presignedUrl });
    } catch (error) {
      console.log("🚀 ~ generate-url,  error:", error);
      logger.error("Error generating URL", error);
      // @ts-ignore
      logger.debug(error?.message);
      return res.status(500).send();
    }
  }
);

// Validate inputs for the GET /asset route
app.get(
  "/asset",
  helmet(helmetOptions as HelmetOptions),
  query("payload").isString().notEmpty(),
  // @ts-ignore
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { payload } = req.query as { payload: string };

      const normalizedPayload = Buffer.from(
        decodeURIComponent(payload as string),
        "base64"
      );

      const { Plaintext } = await kms
        .decrypt({
          CiphertextBlob: normalizedPayload,
          KeyId: `alias/${SYMMETRIC_KEY_ALIAS}`,
        })
        .promise();

      const decryptedPayload = JSON.parse(Plaintext!.toString());
      const { fileId, accessToken, expiryTime } = decryptedPayload;

      if (!fileId || !accessToken) {
        throw new Error("Invalid decrypted payload");
      }

      // TODO: add support for clock skew
      if (Date.now() > expiryTime) {
        logger.error("Link used after expiry");
        throw new Error("Time Expired");
      }

      try {
        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch video: ${response.statusText}`);
        }

        // Force content type for security reasons
        let contentType =
          response.headers.get("Content-Type") || "application/octet-stream";

        // Google tags `mimeType: image/heif` to all `.heic` / `.heif` files, while on Canva asset SDK we only accept `mimeType: image/heic`.
        // https://www.canva.dev/docs/apps/uploading-assets/#images
        // `image/heic` is the most widely type of HEIF files, so even for `.heif` files, it is highly likely that Canva can process it as `image/heic`.
        // So we are converting all `image/heif` mimeTypes to `image/heic`.
        if (contentType.toLowerCase() === "image/heif") {
          contentType = "image/heic";
        }
        res.setHeader("Content-Type", contentType);

        if (response.body) {
          // @ts-ignore
          await streamPipeline(response.body, res);
        } else {
          logger.error("No response body from Google Drive");
          return res.status(400).send();
        }
      } catch (error) {
        logger.error("Error fetching video from Google Drive:");
        // @ts-ignore
        logger.debug(error?.message);
        return res.status(400).send();
      }
    } catch (error) {
      logger.error("Signature verification or decryption failed");
      // @ts-ignore
      logger.debug(error?.message);
      return res.status(500).send();
    }
  }
);

// See PAU-2342. Redirect to Google OAuth without the `origin` parameter that
// causes it to fail.
app.get(
  "/auth",
  helmet({
    ...(helmetOptions as HelmetOptions),
    crossOriginOpenerPolicy: false,
  }),
  async (req, res) => {
    const redirectUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    const params = req.query as Record<string, string>;
    for (const [key, value] of Object.entries(params)) {
      if (key !== "origin") {
        redirectUrl.searchParams.append(key, value);
      }
    }
    res.redirect(redirectUrl.toString());
  }
);

app.listen(port, () => {
  logger.info(`App listening at port ${port}`);
});

// Exporting app for testing
export default app;
