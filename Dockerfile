FROM node:7.2.0-alpine

EXPOSE 8080

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies ?
# COPY package.json /usr/src/app/
# RUN npm install

# Bundle app source
COPY . /usr/src/app/
CMD ["node", "server.js"]
