# syntax=docker/dockerfile:1.3

ARG NODE_VERSION=20.17.0

FROM node:${NODE_VERSION}-alpine

# Use production node environment by default.
ENV NODE_ENV production
# ENV AWS_SDK_LOAD_CONFIG 1

WORKDIR /usr/src/app

# Copy package.json and package-lock.json separately to leverage Docker's caching.
COPY package*.json ./

# Download dependencies as a separate step to take advantage of Docker's caching.
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# Copy the rest of the source files into the image.
COPY . .

# Build the application.
RUN npm run build

# Run the application as a non-root user.
USER node

# Expose the port that the application listens on.
EXPOSE 3000

# Run the application.
CMD npm run start