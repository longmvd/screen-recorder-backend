# Stage 1: Build the application
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Stage 2: Create the production image
FROM node:22-alpine

WORKDIR /usr/src/app

# Copy the built application and node_modules from the builder stage
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./

# Expose the application and websocket ports
EXPOSE 3000
EXPOSE 8000

# Command to run the application
CMD ["node", "dist/main"]
