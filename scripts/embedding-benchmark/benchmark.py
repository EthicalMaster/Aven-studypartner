"""Isolated BGE runtime benchmark. Does not connect to or modify a database."""
import os

# Disable telemetry before native runtime initialization.
os.environ["ORT_DISABLE_TELEMETRY"] = "1"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"

import argparse
import json
import threading
import time
from pathlib import Path

import numpy as np
import psutil

MODEL = 'BAAI/bge-small-en-v1.5'
ONNX_REPO = 'Xenova/bge-small-en-v1.5'
ONNX_REVISION = 'ea104dacec62c0de699686887e3f920caeb4f3e3'
PREFIX = 'Represent this sentence for searching relevant passages: '
PASSAGES = [
    'Hackathon registration closes on 25 November. Teams must have two to four members.',
    'The hackathon final presentation lasts ten minutes, followed by five minutes of questions.',
    'Participants must bring a laptop and a college identity card to the venue.',
    'Photosynthesis converts light energy into chemical energy in green plants.',
    'A primary key uniquely identifies each row in a relational database table.',
    'Binary search repeatedly halves a sorted list to find a target in logarithmic time.',
    'Students may borrow three library books for fourteen days. Late returns incur a fine.',
    'Annual leave requests must be submitted at least three calendar days in advance.',
]
QUERIES = [
    'How many people can join a team?',
    'How long do we have to present our project?',
    'What should participants carry with them?',
    'How do plants turn sunlight into stored energy?',
    'What uniquely identifies a database record?',
    'Which search method divides a sorted collection in half?',
    'How many books can I borrow and when must I return them?',
    'How far ahead should I request a day off?',
]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--backend', choices=['onnx', 'torch'], required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--reference', help='Optional JSON produced by the torch run')
    args = parser.parse_args()
    try:
        process = psutil.Process()
        def rss():
            return process.memory_info().rss
        memory_source = 'psutil sampled RSS'
    except psutil.Error:
        import resource
        def rss():
            return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss * 1024
        memory_source = 'resource peak RSS (Linux); final is also peak'
    peak = [rss()]
    stop = threading.Event()

    def sample():
        while not stop.wait(0.01):
            peak[0] = max(peak[0], rss())

    threading.Thread(target=sample, daemon=True).start()
    started = time.perf_counter()
    if args.backend == 'onnx':
        import sys
        sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'server/services/embedding'))
        from onnx_encoder import OnnxBgeEncoder
        model = OnnxBgeEncoder()
        encode = model.encode
    else:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(MODEL, device='cpu')

        def encode(texts):
            return model.encode(texts, batch_size=1, normalize_embeddings=True,
                                show_progress_bar=False)

    load_seconds = time.perf_counter() - started
    started = time.perf_counter()
    docs = encode(PASSAGES)
    queries = encode([PREFIX + text for text in QUERIES])
    scores = queries @ docs.T
    top = scores.argmax(axis=1).tolist()
    # Exercise full-length chunks and repeated requests, not just short sentences.
    stress_started = time.perf_counter()
    stress = encode([' '.join(PASSAGES) * 6] * 16)
    elapsed = time.perf_counter() - started
    stress_seconds = time.perf_counter() - stress_started
    assert docs.shape == (8, 384) and queries.shape == (8, 384)
    assert np.isfinite(stress).all() and np.isfinite(docs).all()
    assert np.allclose(np.linalg.norm(docs, axis=1), 1, atol=1e-5)
    peak[0] = max(peak[0], rss())
    result = dict(backend=args.backend, memory_source=memory_source, model=MODEL, onnx_revision=ONNX_REVISION,
                  peak_rss_mib=round(peak[0] / 1024**2, 2),
                  final_rss_mib=round(rss() / 1024**2, 2),
                  load_seconds=round(load_seconds, 2), inference_seconds=round(elapsed, 2),
                  stress_seconds=round(stress_seconds, 2),
                  top1_correct=sum(i == n for i, n in enumerate(top)), cases=len(QUERIES),
                  top1_indices=top, document_vectors=docs.tolist(), query_vectors=queries.tolist())
    if args.reference:
        reference = json.loads(Path(args.reference).read_text())
        baseline_docs = np.array(reference['document_vectors'])
        baseline_queries = np.array(reference['query_vectors'])
        result['minimum_vector_cosine_to_reference'] = float(min(
            (baseline_docs * docs).sum(axis=1).min(),
            (baseline_queries * queries).sum(axis=1).min()))
        mixed_top = (queries @ baseline_docs.T).argmax(axis=1)
        result['mixed_runtime_top1_correct'] = int(sum(i == n for i, n in enumerate(mixed_top)))
    stop.set()
    Path(args.output).write_text(json.dumps(result, indent=2))
    print(json.dumps({k: v for k, v in result.items() if not k.endswith('_vectors')}, indent=2))
    if result['top1_correct'] != len(QUERIES):
        raise SystemExit('Retrieval smoke test failed; do not switch runtime.')


if __name__ == '__main__':
    main()
