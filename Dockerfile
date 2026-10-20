FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN python3 -m venv /opt/embedding
ENV PATH="/opt/embedding/bin:$PATH" HF_HOME=/opt/model-cache
COPY requirements-embedding.txt ./
RUN pip install --no-cache-dir torch==2.6.0 --index-url https://download.pytorch.org/whl/cpu && pip install --no-cache-dir -r requirements-embedding.txt
RUN python3 -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-small-en-v1.5', device='cpu')"
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && mkdir -p /app/uploads/materials && chown -R node:node /app/uploads /opt/model-cache
ENV NODE_ENV=production EMBEDDING_PYTHON_PATH=/opt/embedding/bin/python3 HF_HUB_OFFLINE=1
USER node
EXPOSE 3000
CMD ["npm", "start"]
