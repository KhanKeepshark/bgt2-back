# Build stage
FROM node:20 AS builder

WORKDIR /app

# Enable corepack and set up Yarn 4
RUN corepack enable
RUN corepack prepare yarn@4.8.1 --activate

# Copy package files
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

# Install dependencies
ENV YARN_SUPPORTED_ARCHITECTURES='{"os":["linux"],"cpu":["x64","arm64"],"libc":["glibc","musl"]}'
RUN yarn install

# Copy source code
COPY . .

# Build the application
RUN yarn build

# One-off: ensure-admin / prisma scripts (full dev deps + ts-node)
FROM builder AS ensure-admin
RUN yarn prisma generate
CMD ["yarn", "db:ensure-admin"]

# Production stage
FROM node:20

WORKDIR /app

# Enable corepack and set up Yarn 4
RUN corepack enable
RUN corepack prepare yarn@4.8.1 --activate

# Copy package files
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

# Install production dependencies only
ENV YARN_SUPPORTED_ARCHITECTURES='{"os":["linux"],"cpu":["x64","arm64"],"libc":["glibc","musl"]}'
RUN yarn install --production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Generate Prisma client
RUN yarn prisma generate

# Install PostgreSQL client for backups
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

# Writable dirs for bind mounts (uploads, backups)
RUN mkdir -p uploads backups \
    && chown -R node:node /app

USER node

# Expose the port your app runs on
EXPOSE 8080

# Sync DB schema from prisma/schema.prisma, then start
CMD ["sh", "-c", "yarn prisma generate && yarn prisma migrate deploy && yarn start:prod"]