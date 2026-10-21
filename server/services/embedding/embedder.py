#!/usr/bin/env python3
"""
AVEN Phase 7 - Standalone SentenceTransformers / BAAI/bge-small-en-v1.5 Embedder
Self-hosted embedding generator with CUDA acceleration and graceful CPU fallback.
"""

import sys
import json
import os

def get_device():
    try:
        import torch
        if torch.cuda.is_available():
            return "cuda"
    except Exception:
        pass
    return "cpu"

def main():
    backend = os.environ.get('EMBEDDING_BACKEND', 'torch').strip().lower()
    if backend not in ('torch', 'onnx'):
        sys.stderr.write('EMBEDDING_BACKEND must be torch or onnx\n')
        sys.exit(1)
    device = 'cpu' if backend == 'onnx' else get_device()
    try:
        if backend == 'onnx':
            from onnx_encoder import OnnxBgeEncoder
            if len(sys.argv) > 1 and sys.argv[1] == '--device':
                print(json.dumps({'device': device, 'model': 'BAAI/bge-small-en-v1.5', 'dimension': 384}))
                return
            model = OnnxBgeEncoder()
        else:
            from sentence_transformers import SentenceTransformer
            if len(sys.argv) > 1 and sys.argv[1] == '--device':
                print(json.dumps({'device': device, 'model': 'BAAI/bge-small-en-v1.5', 'dimension': 384}))
                return
            model = SentenceTransformer('BAAI/bge-small-en-v1.5', device=device)
    except Exception as e:
        sys.stderr.write(f'Embedding engine load error: {e}\n')
        sys.exit(1)
    if len(sys.argv) > 1 and sys.argv[1] == '--device':
        print(json.dumps({'device': device, 'model': 'BAAI/bge-small-en-v1.5', 'dimension': 384}))
        return

    # Dedicated readiness message emitted to stdout after model is fully loaded into memory/device
    print(json.dumps({
        "ready": True,
        "backend": backend,
        "device": device,
        "model": "BAAI/bge-small-en-v1.5",
        "dimension": 384
    }))
    sys.stdout.flush()

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            texts = req.get("texts", [])
            is_query = req.get("is_query", False)
            if is_query:
                texts = [f"Represent this sentence for searching relevant passages: {t}" for t in texts]
            embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
            print(json.dumps({"embeddings": embeddings.tolist()}))
            sys.stdout.flush()
        except Exception as err:
            print(json.dumps({"error": str(err)}))
            sys.stdout.flush()

if __name__ == "__main__":
    main()
