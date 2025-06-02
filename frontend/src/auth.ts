import { auth } from "@canva/user";

export const googleDriveScopes: string[] = [
  "email",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.readonly",
];

const oauth = auth.initOauth();

/**
 * Retrieves the access token.
 */
export async function getAccessToken(): Promise<string | undefined> {
  let accessToken = await oauth.getAccessToken({ scope: new Set(googleDriveScopes) });
  return accessToken?.token;
}

export function logout() {
  return oauth.deauthorize();
}
