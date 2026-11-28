"""
services/relevance/relevance_server.py
Shared cluster FastEmbed (ONNX CPU) semantic relevance microservice (:5004).
Scores unregistered custom subcategories against (Category + Business Name) with threshold >= 0.55.
"""

import json
import os
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn

try:
    from fastembed import TextEmbedding
    import numpy as np
except ImportError:
    TextEmbedding = None
    np = None

_MODEL = None


def _get_model():
    global _MODEL
    if _MODEL is None and TextEmbedding is not None:
        model_name = os.environ.get("FASTEMBED_MODEL", "BAAI/bge-small-en-v1.5")
        _MODEL = TextEmbedding(model_name=model_name)
    return _MODEL


def score_pairs(subcategory, texts):
    model = _get_model()
    if model is not None and np is not None:
        embs = list(model.embed([subcategory, *texts]))
        q_vec = embs[0]
        q_norm = float(np.linalg.norm(q_vec)) or 1.0
        scores = []
        for vec in embs[1:]:
            denom = q_norm * (float(np.linalg.norm(vec)) or 1.0)
            scores.append(round(float(np.dot(q_vec, vec) / denom), 4))
        return scores

    # Lightweight lexical Jaccard fallback if fastembed is absent
    q_toks = set(str(subcategory).lower().split())
    return [
        round(len(q_toks & set(str(t).lower().split())) / max(1, len(q_toks)), 4)
        for t in texts
    ]


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        return

    def _send(self, code, data):
        raw = json.dumps(data).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        if self.path == "/health":
            self._send(200, {"status": "ok", "fastembed": TextEmbedding is not None})
        else:
            self._send(404, {"error": "not_found"})

    def do_POST(self):
        if self.path.rstrip("/") != "/score":
            self._send(404, {"error": "not_found"})
            return
        n = int(self.headers.get("Content-Length", 0) or 0)
        body = json.loads(self.rfile.read(n).decode("utf-8") if n else "{}")
        subcat = str(body.get("subcategory", "")).strip()
        texts = [str(t or "") for t in (body.get("texts") or [])]
        scores = score_pairs(subcat, texts) if subcat and texts else []
        self._send(200, {"ok": True, "scores": scores})


class Server(ThreadingMixIn, HTTPServer):
    daemon_threads = True


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 5004
    print(f"[*] Shared Relevance Sidecar listening on http://0.0.0.0:{port}")
    Server(("0.0.0.0", port), Handler).serve_forever()
