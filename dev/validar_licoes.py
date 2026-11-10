# -*- coding: utf-8 -*-
"""Roda todos os blocos de código das lições (js/conteudo.js). Uso: python3 dev/validar_licoes.py"""
import json, os, subprocess, sys
raiz = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
sys.path.insert(0, os.path.join(raiz, "py"))
import tutor
r = raiz.replace("\\", "/")
dump = subprocess.run(["node", "-e", "global.window={};require('%s/js/conteudo.js');console.log(JSON.stringify(window.BYTE_LICOES))" % r],
                      capture_output=True, text=True, check=True).stdout
licoes = json.loads(dump)
DE_PROPOSITO = {"l2-b": "self-ausente", "l3-b": "runtime"}
falhas = []
n = 0
for l in licoes:
    ids = set()
    for b in l["blocos"]:
        if b["t"] in ("code", "multi"):
            n += 1
            if b["t"] == "code":
                payload = {"mode": "run", "files": {"main.py": b["codigo"]}}
            else:
                payload = {"mode": "run", "entry": b["entry"], "files": {a["nome"]: a["codigo"] for a in b["arquivos"]}}
            res = json.loads(tutor.main(json.dumps(payload)))
            esperado_erro = DE_PROPOSITO.get(b["id"])
            top = res["diagnostics"][0] if res["diagnostics"] else None
            if esperado_erro:
                ok = top and top["kind"] == esperado_erro
                msg = "erro esperado -> %s: %s" % (top["kind"], top["title"]) if top else "SEM ERRO"
            else:
                ok = res["ok"] and not (top and top["level"] == "error")
                msg = (res["stdout"].strip().replace("\n", " | ")[:70] or "(sem saída)")
                if top: msg += "   [%s: %s]" % (top["kind"], top["title"])
            print(("OK   " if ok else "FALHA"), l["id"], b["id"], "->", msg)
            if not ok: falhas.append(b["id"])
            if b["id"] in ids: falhas.append("id duplicado " + b["id"])
            ids.add(b["id"])
print("\nblocos:", n, "| FALHAS:", falhas or "nenhuma")
sys.exit(1 if falhas else 0)
