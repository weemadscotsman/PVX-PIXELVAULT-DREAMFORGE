# Dockerfile for PixelVaultWallet CRT Dashboard

FROM node:20

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Expose frontend port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]
