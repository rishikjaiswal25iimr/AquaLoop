"""
Renders studio images of the conceptual GLB models with headless Chrome + <model-viewer>.
Outputs: public/images/render_hero.png, render_angle.png, exploded_render.png
Run after generate_cad.py and `npm install`:   python engineering/render_views.py
Requires: playwright (Python) with a Chrome/Chromium available.
"""
from pathlib import Path
import http.server, socketserver, threading, functools, time

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
IMG = ROOT / "public" / "images"
IMG.mkdir(parents=True, exist_ok=True)

PAGE = """<!doctype html><html><head><meta charset="utf-8">
<script type="module" src="/node_modules/@google/model-viewer/dist/model-viewer.min.js"></script>
<style>html,body{margin:0;background:radial-gradient(circle at 50% 40%,#ffffff 0%,#eef4f8 60%,#dfe9f1 100%);}
model-viewer{width:{{w}}px;height:{{h}}px;--poster-color:transparent;}
.hs{background:#ffffff;border:2px solid #132a4f;border-radius:16px;padding:5px 11px;font:600 15px Inter,Segoe UI,Arial,sans-serif;color:#132a4f;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.18);transform:translate(0,-26px)}
.hs b{display:inline-block;background:#132a4f;color:#fff;border-radius:50%;width:20px;height:20px;line-height:20px;text-align:center;margin-right:6px;font-size:12px}</style></head><body>
<model-viewer id="mv" src="{{src}}" camera-orbit="{{orbit}}" field-of-view="{{fov}}" exposure="1.05"
 shadow-intensity="1.3" shadow-softness="0.8" environment-image="neutral" tone-mapping="neutral" interaction-prompt="none">{{hotspots}}</model-viewer>
</body></html>"""

SHOTS = [
    ("render_hero.png", "/public/models/aqualoop.glb", "-28deg 72deg auto", "26deg", 1400, 1100),
    ("render_angle.png", "/public/models/aqualoop.glb", "35deg 80deg auto", "26deg", 1100, 1000),
    ("render_front.png", "/public/models/aqualoop.glb", "0deg 88deg auto", "24deg", 1000, 1000),
    ("exploded_render.png", "/public/models/aqualoop_exploded.glb", "-48deg 72deg auto", "30deg", 1400, 1100),
    ("exploded_labelled.png", "/public/models/aqualoop_exploded.glb", "-48deg 72deg auto", "30deg", 1600, 1200),
]


def serve():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    handler.log_message = lambda *a: None
    httpd = socketserver.TCPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def main():
    httpd = serve()
    port = httpd.server_address[1]
    tmp = ROOT / "engineering" / "_render.html"
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        for name, src, orbit, fov, w, h in SHOTS:
            html = PAGE
            hotspots = ""
            if name == "exploded_labelled.png":
                import json
                mods = json.loads((ROOT / "public" / "data" / "cad_modules.json").read_text())["modules"]
                hotspots = "".join(f'<div class="hs" slot="hotspot-{m["key"]}" data-position="{m["hotspot"]["exploded"]}" '
                                   f'data-normal="0m 1m 0m"><b>{i}</b>{m["label"].split(" (")[0]}</div>' for i, m in enumerate(mods, 1))
            for k, v in dict(src=src, orbit=orbit, fov=fov, w=w, h=h, hotspots=hotspots).items():
                html = html.replace('{{%s}}' % k, str(v))
            tmp.write_text(html)
            page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
            page.goto(f"http://127.0.0.1:{port}/engineering/_render.html")
            page.wait_for_function("document.getElementById('mv') && document.getElementById('mv').loaded === true", timeout=60000)
            time.sleep(2.5)
            page.screenshot(path=str(IMG / name))
            page.close()
            print("rendered", name)
        browser.close()
    tmp.unlink(missing_ok=True)
    httpd.shutdown()


if __name__ == "__main__":
    main()
