"""
FastAPI proxy: forwards all /api/* requests from supervisor-managed port 8001
to Next.js running on port 3000. Dev-environment only (Vercel handles production).
"""
import os
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import Response, JSONResponse
from contextlib import asynccontextmanager

NEXT_TARGET = os.environ.get("NEXT_TARGET", "http://127.0.0.1:3001")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 60s timeout for long server actions / cron triggers
    app.state.client = httpx.AsyncClient(timeout=60.0, follow_redirects=False)
    yield
    await app.state.client.aclose()

app = FastAPI(title="TFF Dev Proxy", lifespan=lifespan)

@app.get("/api/health")
async def health():
    return {"ok": True, "role": "proxy", "target": NEXT_TARGET}

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])
async def proxy(path: str, request: Request):
    url = f"{NEXT_TARGET}/{path}"
    if request.url.query:
        url = f"{url}?{request.url.query}"
    headers = dict(request.headers)
    # K8s ingress sets x-forwarded-host to a different internal domain than the
    # browser-visible Origin, which trips Next.js Server Actions CSRF check
    # ("x-forwarded-host does not match origin"). Strip both forwarded-host
    # headers; Next.js will fall back to comparing against its internal host
    # (which we control via allowedOrigins/allowedForwardedHosts). The original
    # forwarded info is preserved for downstream code in standard ways.
    origin = headers.get("origin", "")
    headers.pop("x-forwarded-host", None)
    headers.pop("x-forwarded-server", None)
    # Ensure x-forwarded-proto sticks (used elsewhere)
    if "x-forwarded-proto" not in headers and origin.startswith("https"):
        headers["x-forwarded-proto"] = "https"
    headers.pop("host", None)
    body = await request.body()
    try:
        upstream = await app.state.client.request(
            request.method, url, content=body, headers=headers
        )
    except httpx.ConnectError:
        return JSONResponse(
            {"error": "upstream_unavailable", "target": NEXT_TARGET},
            status_code=502,
        )
    except httpx.TimeoutException:
        return JSONResponse({"error": "upstream_timeout"}, status_code=504)

    # Strip hop-by-hop headers
    excluded = {
        "content-encoding", "transfer-encoding", "connection",
        "keep-alive", "proxy-authenticate", "proxy-authorization",
        "te", "trailers", "upgrade",
    }
    out_headers = [(k, v) for k, v in upstream.headers.items() if k.lower() not in excluded]
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=dict(out_headers),
        media_type=upstream.headers.get("content-type"),
    )
