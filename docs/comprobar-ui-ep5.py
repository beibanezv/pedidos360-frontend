"""Verifica UI en un servidor `ng serve` local; los endpoints se simulan."""
import base64
import json
import os
import time
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

BASE = "http://localhost:4200"
DEMO = {
    "id": "11111111-1111-4111-8111-111111111111", "nombre": "Disco de prueba",
    "artistaOMarca": "Cuarteto de prueba", "categoria": "vinilo", "precioClp": 18990,
    "stock": 8, "descripcion": "Edición de prueba para revisar el detalle.",
}
ORDEN = {
    "ordenId": "22222222-2222-4222-8222-222222222222", "usuarioId": "ui-demo",
    "totalClp": 18990, "estado": "REGISTRADA", "itemsJson": "[{}]", "createdAt": "2026-11-22",
}


def comprobar(browser, ancho, destino):
    page = browser.new_page(viewport={"width": ancho, "height": 800})
    errores = []
    page.on("pageerror", lambda err: errores.append(str(err)))
    payload = base64.urlsafe_b64encode(
        json.dumps({"sub": "ui-demo", "exp": int(time.time()) + 300}).encode()
    ).decode().rstrip("=")
    page.add_init_script(f"sessionStorage.setItem('p360-cognito-id', 'demo.{payload}.firma-demo')")
    rechazos = 0

    def api(route):
        nonlocal rechazos
        url = route.request.url
        assert "bearer" in route.request.headers.get("authorization", "").lower() or url.endswith("/productos")
        if url.endswith("/productos"):
            route.fulfill(json=[DEMO])
        elif "/productos/" in url:
            route.fulfill(json=DEMO)
        elif url.endswith("/recomendaciones"):
            route.fulfill(json=[{**DEMO, "id": "recomendado", "nombre": "Otro vinilo"}])
        elif url.endswith("/ordenes"):
            route.fulfill(json=[ORDEN])
        elif url.endswith("/pagos") and route.request.method == "POST":
            assert route.request.post_data_json == {"ordenId": ORDEN["ordenId"], "tarjetaDemo": "RECHAZO"}
            rechazos += 1
            route.fulfill(json={
                "pagoId": str(rechazos), "ordenId": ORDEN["ordenId"], "totalClp": 18990,
                "resultado": "BLOQUEADO" if rechazos == 4 else "RECHAZADO", "ocurrioEn": "2026-11-22",
            })
        else:
            route.fulfill(status=404, json={})

    for port in (8081, 8084, 8089, 8090):
        page.route(f"http://localhost:{port}/**", api)
    page.route("http://localhost:8082/**", lambda route: route.fulfill(json=[]))
    page.goto(BASE + "/catalogo")
    ficha = page.get_by_role("button", name="Disco de prueba")
    expect(ficha).to_be_visible()
    ficha.focus()
    page.keyboard.press("Enter")
    dialogo = page.get_by_role("dialog", name="Disco de prueba")
    expect(dialogo.get_by_text(DEMO["descripcion"])).to_be_visible()
    destino.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(destino / f"catalogo-{ancho}.png"))
    page.keyboard.press("Escape")
    expect(dialogo).not_to_be_visible()
    expect(ficha).to_be_focused()
    expect(page.get_by_role("button", name="Otro vinilo")).to_be_visible()
    page.goto(BASE + "/ordenes")
    page.get_by_text("Pago de prueba", exact=True).click()
    page.get_by_label("Tarjeta de prueba").select_option("RECHAZO")
    for _ in range(4):
        page.get_by_role("button", name="Simular pago").click()
    expect(page.get_by_text("Bloqueado por varios intentos seguidos.", exact=False)).to_be_visible()
    assert rechazos == 4, rechazos
    page.screenshot(path=str(destino / f"ordenes-{ancho}.png"))
    desborde = page.evaluate("""() => [...document.querySelectorAll('body *')]
        .filter(e => e.getBoundingClientRect().right > innerWidth + 1)
        .slice(0, 12).map(e => [e.tagName, e.className, Math.round(e.getBoundingClientRect().right)])""")
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), desborde
    assert not errores, errores
    page.close()
    print(f"UI {ancho}px: ficha, teclado, recomendación, cuatro intentos, sin desborde ni errores JS")


if __name__ == "__main__":
    out = Path(os.environ.get("P360_CAPTURAS", "test-results/ep5"))
    with sync_playwright() as pw:
        chromium = pw.chromium.launch()
        for width in (390, 1280):
            comprobar(chromium, width, out)
        chromium.close()
