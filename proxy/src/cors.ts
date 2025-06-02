import express from "express";
import cors from "cors";

// Define the CORS options dynamically based on the incoming request
export const corsOptionsDelegate = (
  req: express.Request,
  callback: (err: Error | null, options?: cors.CorsOptions) => void
): void => {
  const corsOptions: cors.CorsOptions = {
    origin: true, // Reflect the request origin in the response (dynamic origin)
    methods: ["GET", "POST", "OPTIONS"], // Allow only necessary methods
    allowedHeaders: [
      "Authorization",
      "Content-Type",
      "x-forward-authorization",
      "Accept",
    ], // Only allow necessary headers
    exposedHeaders: [], // No headers exposed to the client except the standard ones
    credentials: true, // Allow credentials to be sent (if needed)
    optionsSuccessStatus: 204, // To ensure OPTIONS requests return quickly
  };

  callback(null, corsOptions);
};
