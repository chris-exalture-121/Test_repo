/**
 * Decodes a JWT token, e.g. designUserToken
 *
 * CAUTION: this does not verify the JWT token.
 * Do not use this for anything sensitive.
 *
 * Do not use this method with untrusted data unless you
 * verify the token through other means.
 */
export function unverifiedJwtDecode(t) {
  const base64Decode = (str) => {
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/"); // Replace URL-safe characters
    return decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  };

  const returnValue = {
    raw: t,
    header: JSON.parse(base64Decode(t.split(".")[0])),
    payload: JSON.parse(base64Decode(t.split(".")[1])),
  };

  return returnValue;
}
