FROM node:8.11-alpine

# Install canvas dependencies
RUN apk add --no-cache \
  build-base \
  g++ \
  cairo-dev \
  libjpeg-turbo-dev \
  libpng-dev \
  pango-dev \
  giflib-dev

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/
RUN npm install

# Bundle app source
COPY . /usr/src/app/
CMD ["node", "server.js"]
