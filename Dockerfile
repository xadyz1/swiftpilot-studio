# ---- Build stage ----
FROM node:22-slim AS build
WORKDIR /app
ENV PNPM_HOME=/pnpm PATH=$PNPM_HOME:$PATH
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# ---- Runtime stage ----
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PNPM_HOME=/pnpm PATH=$PNPM_HOME:$PATH
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/dist ./dist
RUN mkdir -p /app/data
EXPOSE 3000
CMD ["node", "dist/index.js"]
