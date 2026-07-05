# Build stage
FROM node:20-alpine as builder

WORKDIR /app/skillHub_frontend

# Copy package files from the nested directory
COPY skillHub_frontend/package.json skillHub_frontend/package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY skillHub_frontend/ .

# Build the React app with Vite
RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine

# Copy nginx config
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Copy built app from builder stage
COPY --from=builder /app/skillHub_frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
