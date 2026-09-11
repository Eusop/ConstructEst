FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY engine/requirements.txt ./engine/requirements.txt
RUN pip3 install --no-cache-dir --break-system-packages -r engine/requirements.txt

COPY . .

ENV PYTHON_BIN=python3

CMD ["node", "src/server.js"]
