# -*- coding: utf-8 -*-
"""Valida os desafios de js/desafios.js: a solução de referência deve passar, o código inicial não.
Uso:  python3 dev/validar_desafios.py   (precisa do node instalado)"""
import json, os, subprocess, sys
raiz = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
sys.path.insert(0, os.path.join(raiz, "py"))
import tutor

dump = subprocess.run(["node", "-e", "global.window={};require('%s/js/desafios.js');console.log(JSON.stringify(window.BYTE_DESAFIOS))" % raiz.replace("\\", "/")],
                      capture_output=True, text=True, check=True).stdout
desafios = json.loads(dump)
falhas = []

def check(d, code):
    payload = {"mode": "check", "files": {d["arquivo"]: code}, "spec": {"requires": d["requires"], "tests": d["tests"]}}
    return json.loads(tutor.main(json.dumps(payload)))

def run(d, code):
    payload = {"mode": "run", "files": {d["arquivo"]: code}, "extra": d["exemplo"]}
    return json.loads(tutor.main(json.dumps(payload)))

for d in desafios:
    r = check(d, d["solucao"])
    ok = r["passed"]
    print(("OK   " if ok else "FALHA"), d["id"], "solução passa", "" if ok else [(t["nome"], t["msg"]) for t in r["tests"] if not t["ok"]] + [x["title"] for x in r["diagnostics"][:3]])
    if not ok: falhas.append(d["id"] + ":solucao")
    r = check(d, d["inicial"])
    ok = not r["passed"]
    print(("OK   " if ok else "FALHA"), d["id"], "inicial NÃO passa ->", r["diagnostics"][0]["title"] if r["diagnostics"] else "?")
    if not ok: falhas.append(d["id"] + ":inicial")
    r = run(d, d["solucao"])
    ok = r["ok"] and r["stdout"].strip()
    print(("OK   " if ok else "FALHA"), d["id"], "exemplo roda ->", repr(r["stdout"][:90]), [x["title"] for x in r["diagnostics"][:2]])
    if not ok: falhas.append(d["id"] + ":exemplo")

# mutantes
def mut(did, nome, old, new, esperado):
    d = next(x for x in desafios if x["id"] == did)
    code = d["solucao"].replace(old, new, 1)
    assert code != d["solucao"], (did, nome, "mutação não aplicada")
    r = check(d, code)
    top = r["diagnostics"][0] if r["diagnostics"] else None
    txt = json.dumps(top, ensure_ascii=False).lower() if top else ""
    ok = (not r["passed"]) and esperado.lower() in txt
    print(("OK   " if ok else "FALHA"), "mutante", did, nome, "->", (top["kind"], top["title"]) if top else None)
    if not ok: falhas.append("mut:%s:%s" % (did, nome))

mut("d1", "sem self", "self.nome = nome", "nome = nome", "self.nome")
mut("d1", "init sem params", "def __init__(self, nome, idade):", "def __init__(self):", "")  # qualquer falha
mut("d2", "sem limite", "        if self.energia < 0:\n            self.energia = 0\n", "", "0")
mut("d2", "print no status", 'return f"Energia: {self.energia}/10"', 'print(f"Energia: {self.energia}/10")', "return")
mut("d2", "gasta 2", "self.energia -= 3", "self.energia -= 2", "7")
mut("d3", "senha publica", "self.__senha = senha", "self.senha = senha", "senha")
mut("d3", "abre sempre", "if senha == self.__senha:", "if True:", "")
mut("d4", "troia com super", 'return "Caso base não encontrado... Stack overflow!"', 'return super().atacar() + "x"', "super")
mut("d4", "bug sem super", 'return super().atacar() + " Mordida de bug!"', 'return "Ataque genérico! Mordida de bug!"', "super")
mut("d4", "sem espaco", '" Mordida de bug!"', '"Mordida de bug!"', "faltou")
mut("d5", "> em vez de >=", "if soma >= self.__defesa:", "if soma > self.__defesa:", "")
mut("d5", "sem super init", 'super().__init__("Troia")', 'self.nome = "Troia"', "super")
mut("d5", "defesa publica", "self.__defesa = defesa", "self.defesa = defesa", "defesa")
print("\nFALHAS:", falhas or "nenhuma")
sys.exit(1 if falhas else 0)
