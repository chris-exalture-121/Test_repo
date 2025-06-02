import { NextFunction, Response } from "express";
import { JwksClient } from "jwks-rsa";
import jwt from "jsonwebtoken";
import { logger } from "./logger";

const JWT_CACHE_EXPIRY_MS = 600000; // Default cache expiry
const JET_TIMEOUT_MS = 5000; // Default timeout

const APP_ID_ALLOWLIST = [
  "AAFj-rTO9p4", // Google Drive app
  "AAGOcWldqN8", // Google Drive Prod test (Robbie),
  "AAGRQ20WDLE", // Drive (jyotish)
  "AAGRQ-CBMjg", // Drive (shini)
  "AAGRQxOMUt0", // Drive (adith)
  "AAGRQ9n4erY", // Drive (adith)
];

interface JwtPayloadExtended extends jwt.JwtPayload {
  aud: string;
  brandId: string;
  userId: string;
}

interface AuthenticatedRequest extends Request {
  headers: {
    authorization: string;
  } & Request["headers"];
  verifiedToken?: JwtPayloadExtended;
  appId?: string;
}

/**
 * Decodes a JWT token, e.g. canvaUserToken
 *
 * CAUTION: this does not verify the JWT token.
 *
 * Do not use this method with untrusted data unless you
 * verify the token through other means.
 */
export function unverifiedJwtDecode(t: string) {
  const base64Decode = (str: string): string =>
    Buffer.from(str, "base64").toString("utf8");

  const returnValue = {
    raw: t,
    header: JSON.parse(base64Decode(t.split(".")[0])),
    payload: JSON.parse(base64Decode(t.split(".")[1])),
  };
  // Can be handy to log returnValue here in non-prod contexts
  return returnValue;
}

async function getActivePublicKey({
  appId,
  token,
  cacheExpiryMs = JWT_CACHE_EXPIRY_MS,
  timeoutMs = JET_TIMEOUT_MS,
}: {
  appId: string;
  token: string;
  cacheExpiryMs?: number;
  timeoutMs?: number;
}) {
  const decoded = jwt.decode(token, { complete: true });

  logger.debug(`appId`, appId);

  if (!appId) {
    console.error(`appId not decoded`);
    throw new Error(`appId not decoded`);
  }
  const jwks = new JwksClient({
    cache: process.env.CANVA_ENV === "prod",
    cacheMaxAge: cacheExpiryMs,
    timeout: timeoutMs,
    rateLimit: process.env.CANVA_ENV === "prod",
    jwksUri: `https://api.canva.com/rest/v1/apps/${appId}/jwks`,
  });

  const key = await jwks.getSigningKey(decoded?.header.kid);
  return key.getPublicKey();
}

export const jwtMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const bearerToken = req.headers.authorization.replace("Bearer ", ""); // Removed optional chaining as the type now ensures presence

  try {
    // @ts-ignore
    const unverifiedAppId = jwt.decode(bearerToken)?.["aud"] as string;
    const publicKey = await getActivePublicKey({
      appId: unverifiedAppId,
      token: bearerToken,
    });

    const verified = jwt.verify(bearerToken, publicKey, {
      audience: unverifiedAppId,
    }) as JwtPayloadExtended;

    if (!verified || !verified.aud || !verified.brandId || !verified.userId) {
      logger.error("The user token is not valid.");
      return res.status(403).json();
    }

    if (!APP_ID_ALLOWLIST.includes(verified.aud)) {
      logger.error(`App ID ${verified.aud} is not allowed.`);
      return res.status(403).json();
    }

    // Attaching verified token and validated appId to request for further processing
    req.verifiedToken = verified;
    req.appId = verified.aud;

    next(); // Pass control to the next middleware
    return;
  } catch (e) {
    logger.error("Error in JWT verification: ", e);
    return res.status(403).json();
  }
};
