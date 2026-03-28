# Build stage
FROM node:18.19 AS builder

WORKDIR /app

# Enable corepack and set up Yarn 4
RUN corepack enable
RUN corepack prepare yarn@4.8.1 --activate

# Copy package files
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

# Install dependencies
RUN yarn config set supportedArchitectures.os "linux" && \
    yarn config set supportedArchitectures.cpu "x64" && \
    yarn config set supportedArchitectures.libc "glibc" && \
    yarn install

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Production stage
FROM node:18.19

WORKDIR /app

# Enable corepack and set up Yarn 4
RUN corepack enable
RUN corepack prepare yarn@4.8.1 --activate

# Copy package files
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

# Install production dependencies only
RUN yarn config set supportedArchitectures.os "linux" && \
    yarn config set supportedArchitectures.cpu "x64" && \
    yarn config set supportedArchitectures.libc "glibc" && \
    yarn install --production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Generate Prisma client
RUN yarn prisma generate

# Create uploads directory
RUN mkdir -p uploads

# Expose the port your app runs on
EXPOSE 8080

# Start the application
CMD ["yarn", "start:prod"]