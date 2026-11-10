# -*- coding: utf-8 -*-
"""Embute py/tutor.py em js/tutor-embed.js (a página precisa dele como JS).
Rode de novo sempre que editar py/tutor.py:   python3 dev/build.py"""
import json, os
raiz = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
src = open(os.path.join(raiz, "py", "tutor.py"), encoding="utf-8").read()
out = "/* GERADO por dev/build.py a partir de py/tutor.py — não edite aqui */\nwindow.BYTE_TUTOR_PY = %s;\n" % json.dumps(src, ensure_ascii=False)
open(os.path.join(raiz, "js", "tutor-embed.js"), "w", encoding="utf-8").write(out)
print("js/tutor-embed.js:", len(out), "bytes")
