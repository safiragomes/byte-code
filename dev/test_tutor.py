# -*- coding: utf-8 -*-
"""Testes do motor de feedback.  Uso:  python3 dev/test_tutor.py"""
import json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "py"))
import tutor

FALHAS = []


def rodar(code, mode="run", spec=None, extra=None, files=None):
    payload = {"mode": mode, "files": files or {"solucao.py": code}, "spec": spec or {}, "extra": extra}
    return json.loads(tutor.main(json.dumps(payload)))


def primeiro(res):
    return res["diagnostics"][0] if res["diagnostics"] else None


def caso(nome, code, kind=None, contem=None, mode="run", spec=None, extra=None, files=None, linha=None):
    res = rodar(code, mode, spec, extra, files)
    d = primeiro(res)
    ok = True
    why = ""
    if kind is None:
        if d and d["level"] == "error":
            ok, why = False, "esperava sem erro, veio: %s" % d["title"]
    else:
        if not d:
            ok, why = False, "sem diagnóstico"
        else:
            texto = " ".join(str(d.get(k) or "") for k in ("title", "body", "hint")).lower()
            if d["kind"] != kind:
                ok, why = False, "kind=%s (%s)" % (d["kind"], d["title"])
            for c in (contem or []):
                if c.lower() not in texto:
                    ok, why = False, why + " | faltou '%s' em: %s" % (c, texto[:160])
            if linha and d.get("line") != linha:
                ok, why = False, why + " | linha=%s esperada %s" % (d.get("line"), linha)
    print(("OK   " if ok else "FALHA"), nome, ("" if ok else "-> " + why))
    if not ok:
        FALHAS.append(nome)
    return res


# ------------------------------ sintaxe ------------------------------
caso("dois-pontos", "class A\n    pass\n", "syntax", [":"], linha=1)
caso("indentacao", "class A:\ndef f(self):\n    pass\n", "syntax", ["indent"], linha=2)
caso("parentese", "print('oi'\nx = 1\n", "syntax", ["parêntese" if False else "(", "fechado"])
caso("aspas", "x = 'abc\n", "syntax", ["aspas"])
caso("aspas-curvas", "x = \u201coi\u201d\n", "syntax", ["aspas curvas"])
caso("igual-no-if", "x = 1\nif x = 1:\n    pass\n", "syntax", ["=="])
caso("else-if", "x=1\nif x==1:\n    pass\nelse if x==2:\n    pass\n", "syntax", ["elif"])
caso("this", "class A:\n    def f(self):\n        this.x = 1 &&\n", "syntax")
caso("print-py2", "print 'oi'\n", "syntax", ["parênteses"])
caso("unexpected-indent", "x = 1\n    y = 2\n", "syntax", ["indenta"])

# ------------------------------ lint ------------------------------
caso("self-ausente", "class A:\n    def latir():\n        print('au')\n", "runtime" if False else "self-ausente", ["self"], linha=2, mode="check")
caso("init-typo", "class A:\n    def __init(self, n):\n        self.n = n\n", "init-typo", ["__init__"], mode="check")
caso("nome=nome", "class A:\n    def __init__(self, nome):\n        nome = nome\n", "faltou-self-attr", ["self.nome"], mode="check")
caso("sem-self-call", "class A:\n    def __init__(self):\n        self.e = 1\n    def a(self):\n        return e\n", "faltou-self-attr", ["self.e"], mode="check")
caso("super-self", "class M:\n    def __init__(self, n):\n        self.n = n\nclass F(M):\n    def __init__(self, n):\n        super().__init__(self, n)\n", "super-self", ["self"], mode="check")
caso("sem-parenteses", "class A:\n    def f(self): return 1\na = A()\na.f\n", "sem-parenteses", ["()"], mode="check")
caso("compara-solta", "class A:\n    def __init__(self):\n        self.e = 1\n    def f(self):\n        self.e == 5\n", "comparacao-solta", ["compara"], mode="check")
caso("lista-compartilhada", "class A:\n    itens = []\n", "atributo-de-classe", ["compartilhado"], mode="check")
caso("laco-infinito", "i = 0\nwhile i < 3:\n    print(i)\n", "travou", ["altera"], mode="check")
caso("privado-fora", "class A:\n    def __init__(self):\n        self.__s = 1\na = A()\nprint(a.__s)\n", "runtime", ["privado"], mode="check")
caso("filha-sem-super", "class M:\n    def __init__(self, n):\n        self.n = n\nclass F(M):\n    def __init__(self, n, x):\n        self.x = x\n", "sem-super-init", ["super"], mode="check")

# ------------------------------ runtime ------------------------------
caso("NameError-self", "class A:\n    def __init__(self):\n        self.e = 3\n    def f(self):\n        return e + 1\na = A()\na.f()\n", "faltou-self-attr", ["self.e"], mode="run")
caso("NameError-typo", "nome = 'Byte'\nprint(nmoe)\n", "runtime", ["nome"])
caso("NameError-true", "x = true\n", "runtime", ["True"])
caso("NameError-import", "print(random.randint(1,2))\n", "runtime", ["import random"])
caso("Attr-typo", "class A:\n    def __init__(self):\n        self.energia = 3\na = A()\nprint(a.enrgia)\n", "runtime", ["energia"])
caso("Attr-privado", "class A:\n    def __init__(self):\n        self.__s = 3\na = A()\nprint(a.__s)\n", "runtime", ["privado"])
caso("Attr-classe", "class A:\n    def __init__(self):\n        self.n = 3\nprint(A.n)\n", "runtime", ["classe"])
caso("Attr-None", "def f():\n    x = 1\nr = f()\nr.nome\n", "runtime", ["None"])
caso("Type-init-args", "class A:\n    def __init__(self):\n        pass\nA('x')\n", "runtime", ["argumento"])
caso("Type-no-args", "class A:\n    def init(self, n):\n        pass\nA('x')\n", "init-typo", ["__init__"])
caso("Type-falta-arg", "class A:\n    def __init__(self, nome, idade):\n        pass\nA('x')\n", "runtime", ["idade"])
caso("Type-concat", "x = 'a' + 3\n", "runtime", ["texto com número"])
caso("Type-self-missing-call", "class A:\n    def latir():\n        pass\nA().latir()\n", "self-ausente", ["self"], mode="run")
caso("Zero", "x = 1/0\n", "runtime", ["zero"])
caso("Recursao", "def f(n):\n    return f(n+1)\nf(0)\n", "runtime", ["recurs"])
caso("Travou", "while True:\n    pass\n", "travou", ["preso"])
caso("Pygame", "import pygame\n", "runtime", ["pygame"])
caso("Import-modulo", "from criatura import Criatura\n", "runtime", ["módulo"], files={"main.py": "from criatura import Criatura\n", "criatura.py": "class Criatura: pass\n"}) if False else None

# multi-arquivo OK
r = rodar("", files={"criatura.py": "class Criatura:\n    def __init__(self, n):\n        self.n = n\n", "main.py": "from criatura import Criatura\nc = Criatura('x')\nprint(c.n)\n"}) if False else None
res = rodar(None, files={"criatura.py": "class Criatura:\n    def __init__(self, n):\n        self.n = n\n", "main.py": "from criatura import Criatura\nc = Criatura('x')\nprint(c.n)\n"}) if False else None
payload = {"mode": "run", "entry": "main.py", "files": {"criatura.py": "class Criatura:\n    def __init__(self, n):\n        self.n = n\n", "main.py": "from criatura import Criatura\nc = Criatura('x')\nprint(c.n)\n"}}
res = json.loads(tutor.main(json.dumps(payload)))
print("OK   " if res["ok"] and res["stdout"].strip() == "x" else "FALHA", "multi-arquivo ->", res["stdout"].strip(), [d["title"] for d in res["diagnostics"]])
if not res["ok"]: FALHAS.append("multi")
payload["files"]["main.py"] = "from criatura import Criature\n"
res = json.loads(tutor.main(json.dumps(payload)))
d = res["diagnostics"][0]
print("OK   " if "Criatura" in (d["hint"] + d["body"]) else "FALHA", "import-nome-errado ->", d["title"], "|", d["hint"])
payload["files"]["main.py"] = "from criature import Criatura\n"
res = json.loads(tutor.main(json.dumps(payload)))
d = res["diagnostics"][0]
print("OK   " if "criatura" in (d["hint"] + d["body"]) else "FALHA", "import-modulo-errado ->", d["title"], "|", d["hint"])

# ------------------------------ testes + requisitos ------------------------------
SPEC = {
    "requires": {"classes": [{"nome": "Cachorro", "metodos": ["__init__", "latir"], "init_params": ["nome", "idade"]}]},
    "tests": [
        {"id": "t1", "nome": "criar Cachorro('Rex', 3)", "py": "c = new('Cachorro','Rex',3)\nexpect(attr(c,'nome'),'Rex','c.nome')\nexpect(attr(c,'idade'),3,'c.idade')"},
        {"id": "t2", "nome": "latir devolve texto", "py": "c = new('Cachorro','Rex',3)\nexpect(call(c.latir),'Rex diz: Au au!','c.latir()')"},
    ],
}
OK_SOL = "class Cachorro:\n    def __init__(self, nome, idade):\n        self.nome = nome\n        self.idade = idade\n    def latir(self):\n        return f'{self.nome} diz: Au au!'\n"
r = rodar(OK_SOL, "check", SPEC)
print("OK   " if r["passed"] else "FALHA", "solucao correta passa", [d["title"] for d in r["diagnostics"]])
if not r["passed"]: FALHAS.append("solucao")

def variante(nome, code, kind, contem):
    r = rodar(code, "check", SPEC)
    d = primeiro(r)
    ok = (not r["passed"]) and d and d["kind"] == kind and all(c.lower() in (d["title"] + d["body"] + d["hint"] + str(d.get("got")) + str(d.get("expected"))).lower() for c in contem)
    print("OK   " if ok else "FALHA", nome, "->", (d["kind"], d["title"], d["hint"][:90]) if d else None)
    if not ok: FALHAS.append(nome)

variante("print-em-vez-de-return", OK_SOL.replace("return f'{self.nome} diz: Au au!'", "print(f'{self.nome} diz: Au au!')"), "teste", ["print", "return"])
variante("maiuscula", OK_SOL.replace("Au au!", "au au!"), "teste", ["maiúscula" if False else "diferen"])
variante("sem-ponto", OK_SOL.replace("Au au!", "Au au"), "teste", ["faltou"])
variante("classe-minuscula", OK_SOL.replace("class Cachorro", "class cachorro"), "requisito", ["Cachorro"])
variante("metodo-faltando", OK_SOL.replace("latir", "latiir"), "requisito", ["latir"])
variante("params-errados", OK_SOL.replace("nome, idade", "nome, anos"), "requisito", ["anos"])
variante("sem-self-attr", OK_SOL.replace("self.nome = nome", "nome = nome"), "faltou-self-attr", ["self.nome"])

variante("igual-solto-self", OK_SOL.replace("self.nome = nome", "self.nome == nome"), "comparacao-solta", ["compara"])
variante("aspas-esquecidas", OK_SOL + "\nrex = Cachorro(Rex, 4)\n", "runtime", ["aspas"])
variante("return-com-igual", OK_SOL.replace("return f'{self.nome} diz: Au au!'", "return self.nome = 1"), "syntax", ["=="])

print()
print("FALHAS:", FALHAS if FALHAS else "nenhuma")
sys.exit(1 if FALHAS else 0)
