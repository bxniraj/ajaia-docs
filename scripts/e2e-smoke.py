# Browser smoke test (optional): pip install playwright && playwright install chromium
# Run against a fresh DB: BASE_URL=http://localhost:3000 python3 scripts/e2e-smoke.py
import os
from playwright.sync_api import sync_playwright
B=os.environ.get("BASE_URL","http://localhost:3000"); S=os.environ.get("SHOTS_DIR","docs/screenshots")
with sync_playwright() as p:
    br = p.chromium.launch(executable_path=os.environ.get("CHROME_PATH") or None)
    errs=[]
    ctx = br.new_context(viewport={"width":1280,"height":860})
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: m.type=="error" and errs.append(m.text))
    pg.goto(B+"/login"); pg.screenshot(path=f"{S}/1-login.png")
    pg.click("text=Alice Chen"); pg.wait_for_url("**/docs"); pg.screenshot(path=f"{S}/2-dashboard.png")
    pg.click("text=+ New document"); pg.wait_for_url("**/docs/*"); pg.wait_for_selector(".doc-body")
    pg.fill(".title-input", "Launch checklist")
    pg.click(".doc-body")
    pg.select_option(".block-select", "h1"); pg.keyboard.type("Launch checklist"); pg.keyboard.press("Enter")
    pg.keyboard.press("Control+b"); pg.keyboard.type("Bold"); pg.keyboard.press("Control+b")
    pg.keyboard.type(" then "); pg.keyboard.press("Control+u"); pg.keyboard.type("underlined"); pg.keyboard.press("Control+u")
    pg.keyboard.press("Enter"); pg.click("button[title='Bulleted list']"); pg.keyboard.type("First item"); pg.keyboard.press("Enter"); pg.keyboard.type("Second item")
    pg.wait_for_timeout(1500); pg.wait_for_selector(".status.saved", timeout=5000)
    pg.screenshot(path=f"{S}/3-editor.png")
    url = pg.url
    pg.reload(); pg.wait_for_selector(".doc-body h1")
    html = pg.inner_html(".doc-body"); print("after reload:", html[:300]); print("title:", pg.input_value(".title-input"))
    pg.click("text=Share"); pg.fill("input[type=email]", "carol@ajaia.test"); pg.select_option(".share-form select","viewer"); pg.click(".share-form button")
    pg.wait_for_selector(".share-list >> text=Carol Diaz"); pg.screenshot(path=f"{S}/4-share.png")
    # Carol in separate context
    c2 = br.new_context(viewport={"width":1280,"height":860}); q = c2.new_page(); q.on("pageerror", lambda e: errs.append(str(e)))
    q.goto(B+"/login"); q.click("text=Carol Diaz"); q.wait_for_url("**/docs"); q.screenshot(path=f"{S}/5-carol-dashboard.png")
    q.click("text=Launch checklist"); q.wait_for_selector(".doc-body h1"); q.screenshot(path=f"{S}/6-carol-viewonly.png")
    print("carol toolbar present:", q.locator(".toolbar").count(), "editable:", q.get_attribute(".doc-body","contenteditable"))
    # fast-reload path: type then reload immediately (keepalive flush)
    pg.keyboard.press("Escape"); pg.click(".doc-body"); pg.keyboard.press("Control+End"); pg.keyboard.press("Enter"); pg.keyboard.press("Enter"); pg.keyboard.type("typed right before reload")
    pg.reload(); pg.wait_for_selector(".doc-body h1"); pg.wait_for_timeout(500); pg.reload(); pg.wait_for_selector(".doc-body h1")
    print("fast reload kept:", "typed right before reload" in pg.inner_html(".doc-body"))
    print("errors:", errs)
    br.close()
