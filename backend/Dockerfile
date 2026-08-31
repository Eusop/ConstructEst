# Node + Python in one image — the backend spawns engine/engine.py as a
# subprocess per DXF upload (see src/services/engine.service.js), which a
# plain auto-detected Node buildpack (Railway's Railpack, Nixpacks, etc.)
# has no way to provision on its own. Hence a Dockerfile instead of relying
# on auto-detection.
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Node deps first (layer-cache friendly — only reinstalls when
# package*.json actually changes, not on every source edit).
COPY package*.json ./
RUN npm ci --omit=dev

# Same for the Python side.
COPY engine/requirements.txt ./engine/requirements.txt
RUN pip3 install --no-cache-dir --break-system-packages -r engine/requirements.txt

COPY . .

# Railway injects PORT at runtime; src/server.js already reads
# process.env.PORT, so nothing else to configure for that.
ENV PYTHON_BIN=python3

CMD ["node", "src/server.js"]
