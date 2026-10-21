# Isolated low-memory embedding experiment

This benchmark does not change the application runtime, read .env, connect to Neon,
or write document vectors. The application still uses its working PyTorch runner.

It compares quantized ONNX BGE-small-en-v1.5 against SentenceTransformers, using
CLS pooling, a 512-token limit, the application's query prefix and unit normalization.
ONNX files are pinned to a model repository revision. One sequence is processed at
a time, with one ONNX CPU thread and the CPU memory arena disabled.

The fixture has eight short passages/questions and sixteen long-chunk requests.
This is a smoke test, not a representative quality evaluation of student PDFs.
Memory covers the Python process only, not Node, PDF parsing, concurrent users,
OS overhead, or hosting accounting. A passing run is not a deployment approval.

## Windows PowerShell

From the repository root, create a separate environment (keep the working .venv):

```powershell
py -3.13 -m venv .venv-onnx
.\.venv-onnx\Scripts\python.exe -m pip install -r scripts/embedding-benchmark/requirements-onnx.txt
.\.venv\Scripts\python.exe -m pip install psutil
.\.venv\Scripts\python.exe scripts/embedding-benchmark/benchmark.py --backend torch --output baseline-benchmark.json
.\.venv-onnx\Scripts\python.exe scripts/embedding-benchmark/benchmark.py --backend onnx --reference baseline-benchmark.json --output onnx-benchmark.json
```

The first run downloads public model weights. Benchmark JSON includes synthetic
fixture vectors, not user documents or credentials. Subsequent runs use the cache.
Compare peak RSS, correct top-1 retrieval, and cross-runtime cosine similarity.
The two runtimes can differ numerically; do not mix real stored vectors without
representative validation. A runtime switch should re-index documents consistently.

Before a Render Free deployment, measure the combined application under a 512 MiB
memory limit through login, upload, extraction, indexing, concurrent query and restart.
Persistent PDF storage is a separate requirement and has not been implemented here.

## Measured result (Linux, Python 3.12, 21 October 2026)

| Runtime | Peak process RSS | Correct top-1 answers |
| --- | ---: | ---: |
| SentenceTransformers 5.1.2 / CPU PyTorch 2.14.1 | 590.77 MiB | 8/8 |
| Quantized ONNX Runtime 1.31.0 | 170.41 MiB | 8/8 |

The ONNX process used about 71% less peak resident memory in this fixture.
Minimum paired vector cosine similarity was 0.99447. ONNX queries against original
PyTorch document vectors also returned the expected passage in all eight cases.
These results are encouraging, but do not prove general equivalence or that the
complete application fits a 512 MiB host. No application runtime switch was made.

The environment does not expose the process through /proc, so the measurement used
Linux resource.getrusage peak RSS. PyTorch inference used batch size 1 here; the
application can use larger batches. ONNX used one thread; CPU timing comparisons
are not controlled. Download/cache effects also differ between load measurements.

ONNX and Hugging Face telemetry are disabled before initialization. An initial
run was blocked by automatic approval review due to default ONNX telemetry; all
reported completed runs use the explicit telemetry opt-out.

Sources:
- https://huggingface.co/Xenova/bge-small-en-v1.5
- https://github.com/microsoft/onnxruntime/blob/main/docs/Privacy.md
- https://onnxruntime.ai/docs/api/python/api_summary.html
