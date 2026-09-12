# Multi-stage build for the public demonstration app (`apps/web`).
# The final image is the Next.js standalone output plus the scenario-packs
# directory the app reads at runtime (SCENARIO_PACKS_DIR points at the copy
# baked into the image). Build from the repository root:
#   docker build -t oiw-web .
#   docker run -p 3000:3000 -e DATABASE_URL=... oiw-web

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
ENV NEXT_OUTPUT=standalone
COPY . .
RUN pnpm install --frozen-lockfile \
  && pnpm --filter '!@oiw/web' --recursive --if-present run build \
  && pnpm --filter @oiw/web run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    SCENARIO_PACKS_DIR=/app/scenario-packs
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
COPY --from=build /app/scenario-packs ./scenario-packs
RUN addgroup -S oiw && adduser -S oiw -G oiw && chown -R oiw:oiw /app
USER oiw
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
