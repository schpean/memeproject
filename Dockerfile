# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the React app
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built assets from build stage
COPY --from=build /app/build ./build
COPY --from=build /app/server ./server
COPY --from=build /app/package*.json ./

# Install production dependencies only
RUN npm install --production

# Expose the port your app runs on
EXPOSE 1337

# Start the application
CMD ["node", "server/server.js"] 