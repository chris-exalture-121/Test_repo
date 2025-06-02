import jwt from "jsonwebtoken";

export const jwtPayload = {
  userId: "1234567890",
  brandId: "12345678910",
  aud: "AAGOcWldqN8",
  exp: 1719446510589,
};

const secret = "testing_secret";
export const exampleJwtToken = jwt.sign(jwtPayload, secret, {
  header: {
    kid: "344bbf0a-3e22-40b0-9563-4c6513b747dd",
  },
});
