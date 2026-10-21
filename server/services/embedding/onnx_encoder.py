"""Bounded CPU BGE encoder. No PyTorch dependency; model revision is pinned."""
import os
os.environ['ORT_DISABLE_TELEMETRY'] = '1'
os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'

import numpy as np
import onnxruntime as ort
from huggingface_hub import hf_hub_download
from tokenizers import Tokenizer

ort.disable_telemetry_events()
MODEL_REPO = 'Xenova/bge-small-en-v1.5'
MODEL_REVISION = 'ea104dacec62c0de699686887e3f920caeb4f3e3'

class OnnxBgeEncoder:
    def __init__(self):
        self.tokenizer = Tokenizer.from_file(hf_hub_download(
            MODEL_REPO, 'tokenizer.json', revision=MODEL_REVISION))
        self.tokenizer.enable_truncation(max_length=512)
        options = ort.SessionOptions()
        options.intra_op_num_threads = 1
        options.inter_op_num_threads = 1
        options.enable_cpu_mem_arena = False
        options.enable_mem_pattern = False
        self.session = ort.InferenceSession(hf_hub_download(
            MODEL_REPO, 'onnx/model_quantized.onnx', revision=MODEL_REVISION),
            sess_options=options, providers=['CPUExecutionProvider'])
        self.names = {item.name for item in self.session.get_inputs()}

    def encode(self, texts, **_kwargs):
        vectors = []
        for text in texts:
            tokens = self.tokenizer.encode(text)
            feeds = {'input_ids': np.array([tokens.ids], dtype=np.int64),
                     'attention_mask': np.array([tokens.attention_mask], dtype=np.int64),
                     'token_type_ids': np.array([tokens.type_ids], dtype=np.int64)}
            hidden = self.session.run(None, {k: v for k, v in feeds.items() if k in self.names})[0]
            vector = hidden[0, 0, :].astype(np.float32)
            norm = np.linalg.norm(vector)
            if vector.shape != (384,) or not np.isfinite(vector).all() or norm <= 0:
                raise ValueError('Invalid ONNX embedding output')
            vectors.append(vector / norm)
        return np.array(vectors, dtype=np.float32).reshape((-1, 384))
