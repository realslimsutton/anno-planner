# Includes all system dependencies needed for Playwright + Chromium
FROM mcr.microsoft.com/playwright:jammy

# Install Node 22 (Playwright image may not ship with Node 22)
RUN apt-get update && apt-get install -y curl ca-certificates \
  && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
  && apt-get install -y nodejs \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# pnpm via Corepack (bundled with Node 22)
RUN corepack enable

# Install deps with cache-friendly layering
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy app source
COPY . .

# Build TanStack Start if your project has a build step
RUN pnpm run build

# Install Playwright browsers (Chromium) into the image
RUN pnpm exec playwright install chromium --with-deps

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["pnpm", "start"]