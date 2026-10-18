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
# Public origin of the deployment. `next build` reads it (HSTS header,
# robots.txt and sitemap.xml are baked at build time), and Render passes
# service environment variables to the build as Docker build arguments only
# if they are declared here. Build stage only: it is a public value, and no
# secret (DATABASE_URL, SESSION_SECRET, ...) may ever be declared as an ARG.
# The default matches the application's own localhost fallback, so a build
# without the argument (`docker build -t oiw-web .`) behaves as it did before
# the ARG existed. An empty value (`--build-arg NEXT_PUBLIC_SITE_URL=`) is
# unset again below, because the app falls back only on an unset variable.
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
COPY . .
RUN if [ -z "$NEXT_PUBLIC_SITE_URL" ]; then unset NEXT_PUBLIC_SITE_URL; fi \
  && pnpm install --frozen-lockfile \
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
