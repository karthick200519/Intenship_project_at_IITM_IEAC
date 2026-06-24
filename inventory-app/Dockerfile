FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production
COPY . ./
# Seed DB during build
RUN node seed.js || true
EXPOSE 3000
CMD ["node","server.js"]
