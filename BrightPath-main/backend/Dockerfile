FROM node:20-alpine

RUN apk add --no-cache openssl wget

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci

COPY src ./src
COPY scripts ./scripts
COPY .eslintrc.json .prettierrc jest.config.cjs ./

ENV NODE_ENV=production

EXPOSE 8080

HEALTHCHECK CMD wget --no-verbose --tries=1 --spider [http://localhost:${PORT}/health](http://localhost:${PORT}/health) || exit 1

CMD ["npm", "start"]
