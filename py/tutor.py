# -*- coding: utf-8 -*-
"""
tutor.py — motor de feedback do Byte Code.

Roda dentro do Pyodide (no navegador, num Web Worker) e também em CPython
normal, o que permite testar tudo com `python dev/test_tutor.py`.

Entrada (payload JSON):
    mode    "run" | "check"
    files   {"main.py": "codigo", ...}     (ordem importa; 1 arquivo na maioria dos casos)
    entry   arquivo que é executado (padrão: o primeiro)
    extra   código de exemplo executado depois do código do aluno (só no "run")
    stdin   texto com linhas para input()
    spec    (só no "check") {"requires": {...}, "tests": [{id, nome, py, dica}]}

Saída (JSON):
    ok, stdout, diagnostics[], tests[], objects[], passed, travou_em, elapsed_ms

O "feedback inteligente" vem de três camadas:
    1. tradução de SyntaxError / exceções para português, com sugestões
       ("você quis dizer ...?", "faltou self", "use return em vez de print");
    2. análise estática (AST) de erros típicos de POO, ANTES de rodar;
    3. testes com diferença explicada (maiúscula/minúscula, pontuação, None...).
"""
import ast
import builtins
import contextlib
import difflib
import io
import json
import os
import re
import shutil
import sys
import tempfile
import time
import traceback

LIMITE_SEGUNDOS = 3.0      # tempo máximo por execução / por teste
LIMITE_SAIDA = 20000       # caracteres de stdout devolvidos
_PROGRESS = None           # callback opcional (worker -> página)


def set_progress(fn):
    global _PROGRESS
    _PROGRESS = fn


def _progress(msg):
    if _PROGRESS:
        try:
            _PROGRESS(msg)
        except Exception:
            pass


# ----------------------------------------------------------------------------
# utilidades
# ----------------------------------------------------------------------------
def _close(word, options, n=1, cutoff=0.6):
    options = [o for o in options if isinstance(o, str)]
    return difflib.get_close_matches(word, options, n=n, cutoff=cutoff)


def _q(s):
    return "`%s`" % s


def _lista(itens, vazio="nenhum"):
    itens = [_q(i) for i in itens]
    return ", ".join(itens) if itens else vazio


def diag(level, kind, title, body="", hint="", file=None, line=None, col=None,
         snippet=None, tecnico=None, trace=None):
    return {
        "level": level, "kind": kind, "title": title, "body": body, "hint": hint,
        "file": file, "line": line, "col": col, "snippet": snippet,
        "tecnico": tecnico, "trace": trace,
    }


def make_snippet(src, line, ctx=1):
    if not line:
        return None
    lines = src.splitlines()
    if not lines:
        return None
    a = max(1, line - ctx)
    b = min(len(lines), line + ctx)
    return [{"n": i, "t": lines[i - 1], "hl": i == line} for i in range(a, b + 1)]


def _line_text(src, line):
    lines = src.splitlines()
    if line and 1 <= line <= len(lines):
        return lines[line - 1]
    return ""


# ----------------------------------------------------------------------------
# 1) ERROS DE SINTAXE
# ----------------------------------------------------------------------------
_HABITOS = [
    (r"\bthis\.", "Em Python o objeto se chama `self` (não `this`).",
     "Troque `this.` por `self.`."),
    (r"\bnew\s+[A-Za-z_]\w*\s*\(", "Python não usa a palavra `new` para criar objetos.",
     "Escreva só `Cachorro(\"Byte\")`, sem o `new`."),
    (r"&&|\|\|", "Python usa `and` e `or` (palavras) em vez de `&&` e `||`.",
     "Troque `&&` por `and` e `||` por `or`."),
    (r"\b\w+\s*(\+\+|--)\s*$", "Python não tem `++` nem `--`.",
     "Use `x += 1` (ou `x -= 1`)."),
    (r"^\s*(public|private|protected|static)\b",
     "Python não tem `public`/`private` como palavras-chave.",
     "Para um atributo privado, use dois underscores no nome: `self.__senha`."),
    (r"^\s*(function|func|fun)\s+\w+", "Em Python, funções e métodos começam com `def`.",
     "Escreva `def nome(parametros):`."),
    (r"^\s*else\s+if\b", "Em Python é `elif`, tudo junto.",
     "Troque `else if` por `elif`."),
    (r"^\s*(int|float|double|string|boolean|bool|void|var|let|const)\s+\w+",
     "Em Python não declaramos o tipo da variável.",
     "Escreva só `nome = valor`."),
    (r"\{\s*$", "Python não usa `{ }` para blocos: usa `:` e indentação.",
     "Termine a linha com `:` e indente o corpo com 4 espaços."),
    (r"\bthen\b\s*$", "Python não usa `then`.", "Termine a linha do `if` com `:`."),
]


def friendly_syntax(e, name, src):
    msg = e.msg or ""
    low = msg.lower()
    lineno = e.lineno or 1
    line_text = (e.text or "").rstrip("\n\r") or _line_text(src, lineno)
    col = e.offset
    stripped = line_text.strip()
    title = "Erro de sintaxe na linha %d" % lineno
    body = ""
    hint = ""
    m = None

    if "invalid non-printable character" in low:
        title = "Caractere invisível na linha %d" % lineno
        body = ("Tem um caractere invisível (muito comum ao copiar e colar de PDF, site ou chat) "
                "que o Python não aceita.")
        hint = "Apague o espaço/trecho suspeito dessa linha e digite de novo."
    elif "invalid character" in low:
        ch = re.search(r"invalid character '(.+?)'", msg)
        ch = ch.group(1) if ch else ""
        if ch in "“”‘’":
            title = "Aspas curvas na linha %d" % lineno
            body = ("Você usou aspas curvas (%s), geralmente vindas de um texto copiado. "
                    "O Python só entende aspas retas." % ch)
            hint = "Troque por aspas retas: `\"` ou `'`."
        else:
            body = "O caractere `%s` não é aceito pelo Python nesse lugar." % ch
            hint = "Provavelmente veio de um texto copiado. Apague e digite de novo."
    elif "unterminated triple-quoted" in low:
        title = "Aspas triplas sem fechar"
        body = "Você abriu um texto com aspas triplas (`\"\"\"`) e não fechou."
        hint = "Feche com `\"\"\"` no final do texto."
    elif "unterminated string literal" in low:
        title = "Faltou fechar aspas na linha %d" % lineno
        body = "Você abriu um texto com aspas, mas a linha acabou sem fechar."
        hint = "Confira se o texto começa e termina com o mesmo tipo de aspas."
    elif "was never closed" in low:
        ch = msg[1] if len(msg) > 1 else "("
        par = {"(": ")", "[": "]", "{": "}"}.get(ch, ")")
        title = "`%s` aberto na linha %d nunca foi fechado" % (ch, lineno)
        body = "Todo `%s` precisa de um `%s` correspondente." % (ch, par)
        hint = "Procure o `%s` que falta (às vezes está algumas linhas abaixo)." % par
    elif low.startswith("unmatched"):
        ch = re.search(r"unmatched '(.)'", msg)
        ch = ch.group(1) if ch else ")"
        body = "Tem um `%s` sobrando, sem o par que abre." % ch
        hint = "Conte os parênteses/colchetes dessa linha: cada abertura precisa de um fechamento."
    elif "does not match opening" in low:
        body = "Um parêntese/colchete foi fechado com o tipo errado. (%s)" % msg
        hint = "Confira se cada `(` fecha com `)`, cada `[` com `]` e cada `{` com `}`."
    elif re.match(r"\s*else\s+if\b", line_text):
        title = "`else if` não existe em Python (linha %d)" % lineno
        body = "Em Python, \"senão se\" é uma palavra só: `elif`."
        hint = "Troque `else if` por `elif`."
    elif "expected ':'" in low:
        kw = re.match(r"\s*(def|class|if|elif|else|for|while|try|except|finally|with)\b", line_text)
        kw = kw.group(1) if kw else "essa instrução"
        title = "Faltou `:` no fim da linha %d" % lineno
        body = "Linhas com `%s` terminam com dois-pontos, que abrem o bloco indentado." % kw
        hint = "Acrescente `:` no final da linha."
    elif "expected an indented block" in low:
        m = re.search(r"after (.+?) on line (\d+)", msg)
        quem = m.group(1) if m else "essa linha"
        quem = {"function definition": "a definição da função/método",
                "class definition": "a definição da classe"}.get(quem, quem)
        title = "Faltou indentação na linha %d" % lineno
        body = "Depois de %s, o corpo precisa vir indentado (4 espaços)." % quem
        hint = "Se ainda não sabe o que escrever, use `pass` como marcador temporário."
    elif "unexpected indent" in low:
        title = "Indentação inesperada na linha %d" % lineno
        body = "Essa linha está mais para a direita do que deveria."
        hint = "Alinhe com a linha de cima (ou apague os espaços extras do começo)."
    elif "unindent does not match" in low or "inconsistent use of tabs" in low:
        title = "Indentação inconsistente na linha %d" % lineno
        body = "A indentação dessa linha não bate com nenhum bloco acima (ou mistura TAB com espaços)."
        hint = "Use sempre 4 espaços por nível, sem misturar TAB."
    elif "maybe you meant '=='" in low or "perhaps you meant '=='" in low:
        title = "`=` no lugar de `==` na linha %d" % lineno
        body = "`=` **guarda** um valor numa variável; `==` **compara** dois valores."
        hint = "Dentro de `if`/`while` use `==` para comparar."
    elif re.match(r"^(return|elif|assert)\b[^=\n]*[^=!<>=]=(?!=)", stripped):
        title = "`=` no lugar de `==` na linha %d" % lineno
        body = "`=` **guarda** um valor numa variável; `==` **compara** dois valores. Depois de `return`/`elif` espera-se uma expressão, e não uma atribuição."
        hint = "Para comparar escreva `==` (ex.: `return a == 3`). Para guardar, atribua numa linha própria antes."
    elif low.startswith("cannot assign to"):
        body = "O lado esquerdo do `=` precisa ser um nome (como `energia` ou `self.energia`). (%s)" % msg
        hint = "Se queria comparar, use `==`. Se queria guardar um valor, escreva `self.atributo = valor`."
    elif "missing parentheses in call to 'print'" in low:
        body = "No Python 3, `print` é uma função e precisa de parênteses."
        hint = "Escreva `print(\"texto\")`."
    elif "forgot a comma" in low:
        body = ("Faltou algo entre dois valores: uma vírgula (em listas e chamadas) "
                "ou um `+` (para juntar textos).")
        hint = "Olhe com calma o que vem antes e depois do ponto marcado."
    elif "invalid decimal literal" in low:
        body = "Um nome de variável não pode começar com número, e número não pode ter letras coladas."
        hint = "Renomeie (ex.: `jogador1`, não `1jogador`) ou separe com um operador."
    elif "positional argument follows keyword argument" in low:
        body = "Numa chamada, os argumentos sem nome vêm antes dos com nome (`x=1`)."
        hint = "Coloque `nome=valor` por último."
    elif "non-default argument follows default" in low or "without a default follows" in low:
        body = "Parâmetros com valor padrão (`x=5`) ficam depois dos sem valor padrão."
        hint = "Reordene os parâmetros do `def`."
    elif "'return' outside function" in low:
        body = "`return` só pode ser usado dentro de uma função/método."
        hint = "Confira a indentação: essa linha deveria estar dentro do `def`."
    elif "outside loop" in low or "not properly in loop" in low:
        body = "`break`/`continue` só funcionam dentro de `for` ou `while`."
        hint = "Confira a indentação dessa linha."
    elif "f-string" in low:
        body = "Algo está errado dentro do f-string: %s." % msg
        hint = "Cada `{` do f-string precisa de um `}` e a expressão dentro precisa ser válida."
    elif "expected 'except' or 'finally'" in low:
        body = "Um `try:` precisa de pelo menos um `except` ou `finally`."
        hint = "Adicione `except Exception:` abaixo do bloco."
    elif "unexpected character after line continuation" in low:
        body = "Depois de uma `\\` no fim de linha não pode vir nada."
        hint = "Remova o caractere extra."
    else:
        # "invalid syntax" genérico: procurar vícios de outras linguagens
        for pat, b, h in _HABITOS:
            if re.search(pat, line_text):
                body, hint = b, h
                break
        if not body:
            body = "O Python não conseguiu entender essa linha."
            hint = ("Confira: parênteses fechados, `:` no fim de `def`/`class`/`if`, "
                    "aspas dos textos e se não falta algo na linha anterior.")

    # hábito de outra linguagem também ajuda em mensagens genéricas
    if not hint and stripped:
        hint = "Releia a linha com calma."
    return diag("error", "syntax", title, body, hint, file=name, line=lineno,
                col=col, snippet=make_snippet(src, lineno, 1), tecnico="SyntaxError: " + msg)


# ----------------------------------------------------------------------------
# 2) INFORMAÇÃO ESTRUTURAL (AST)
# ----------------------------------------------------------------------------
class ClassInfo:
    def __init__(self, node, file):
        self.node = node
        self.file = file
        self.name = node.name
        self.bases = [_name_of(b) for b in node.bases]
        self.methods = {}
        self.attrs_set = set()
        self.attrs_get = set()
        for item in node.body:
            if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                self.methods[item.name] = item
        for fn in self.methods.values():
            first = _first_param(fn)
            if not first:
                continue
            for n in ast.walk(fn):
                if (isinstance(n, ast.Attribute) and isinstance(n.value, ast.Name)
                        and n.value.id == first):
                    if isinstance(n.ctx, ast.Store):
                        self.attrs_set.add(n.attr)
                    else:
                        self.attrs_get.add(n.attr)


def _name_of(n):
    if isinstance(n, ast.Name):
        return n.id
    if isinstance(n, ast.Attribute):
        return n.attr
    return ""


def _first_param(fn):
    args = fn.args.posonlyargs + fn.args.args
    return args[0].arg if args else None


def _params(fn):
    a = fn.args
    return [x.arg for x in a.posonlyargs + a.args + a.kwonlyargs] + \
           ([a.vararg.arg] if a.vararg else []) + ([a.kwarg.arg] if a.kwarg else [])


class Info:
    def __init__(self, trees):
        self.classes = {}
        self.funcs = {}
        self.module_names = set()
        for file, tree in trees.items():
            for node in tree.body:
                if isinstance(node, ast.ClassDef):
                    self.classes[node.name] = ClassInfo(node, file)
                    self.module_names.add(node.name)
                elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    self.funcs[node.name] = node
                    self.module_names.add(node.name)
                elif isinstance(node, (ast.Import, ast.ImportFrom)):
                    for a in node.names:
                        self.module_names.add((a.asname or a.name).split(".")[0])
                else:
                    for n in ast.walk(node):
                        if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Store):
                            self.module_names.add(n.id)

    def all_attrs(self, cname, seen=None):
        seen = seen or set()
        if cname in seen or cname not in self.classes:
            return set()
        seen.add(cname)
        ci = self.classes[cname]
        out = set(ci.attrs_set)
        for b in ci.bases:
            out |= self.all_attrs(b, seen)
        return out

    def all_methods(self, cname, seen=None):
        seen = seen or set()
        if cname in seen or cname not in self.classes:
            return set()
        seen.add(cname)
        ci = self.classes[cname]
        out = set(ci.methods)
        for b in ci.bases:
            out |= self.all_methods(b, seen)
        return out

    def find_method(self, qual):
        """'Cachorro.latir' -> (ClassInfo, FunctionDef) ou (None, None)."""
        if "." in qual:
            c, m = qual.split(".", 1)
            c = c.split(".")[-1]
            ci = self.classes.get(c)
            if ci and m in ci.methods:
                return ci, ci.methods[m]
        return None, None


# ----------------------------------------------------------------------------
# 3) LINT (análise estática antes de rodar)
# ----------------------------------------------------------------------------
_DUNDERS = ["init", "str", "repr"]


def _has_super_init(fn, base_names=()):
    for n in ast.walk(fn):
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr == "__init__":
            v = n.func.value
            if isinstance(v, ast.Call) and isinstance(v.func, ast.Name) and v.func.id == "super":
                return True
            if isinstance(v, ast.Name) and v.id in base_names:
                return True
    return False


def _has_super_call(fn):
    for n in ast.walk(fn):
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == "super":
            return True
    return False


def _bound_names(fn):
    names = set(_params(fn))
    for n in ast.walk(fn):
        if isinstance(n, ast.Name) and isinstance(n.ctx, (ast.Store, ast.Del)):
            names.add(n.id)
        elif isinstance(n, (ast.Global, ast.Nonlocal)):
            names.update(n.names)
        elif isinstance(n, ast.ExceptHandler) and n.name:
            names.add(n.name)
        elif isinstance(n, (ast.Import, ast.ImportFrom)):
            for a in n.names:
                names.add((a.asname or a.name).split(".")[0])
        elif isinstance(n, (ast.FunctionDef, ast.ClassDef)) and n is not fn:
            names.add(n.name)
    return names


def lint_tree(file, tree, src, info):
    out = []
    builtin_names = set(dir(builtins))

    def add(level, kind, title, body, hint, node, **kw):
        ln = getattr(node, "lineno", None)
        out.append(diag(level, kind, title, body, hint, file=file, line=ln,
                        snippet=make_snippet(src, ln, 1), **kw))

    classes_here = [c for c in info.classes.values() if c.file == file]
    method_names_all = set()
    for ci in info.classes.values():
        method_names_all |= set(ci.methods)

    for ci in classes_here:
        node = ci.node
        # estilo do nome
        if node.name[:1].islower():
            add("tip", "estilo", "Nome de classe em minúscula: `%s`" % node.name,
                "Por convenção, nomes de classe começam com letra maiúscula (CamelCase), "
                "assim todo mundo reconhece que é uma classe.",
                "Experimente `%s`." % (node.name[:1].upper() + node.name[1:]), node)
        # atributos mutáveis de classe
        for item in node.body:
            if isinstance(item, ast.Assign) and isinstance(item.value, (ast.List, ast.Dict, ast.Set)):
                nm = ", ".join(t.id for t in item.targets if isinstance(t, ast.Name))
                add("warn", "atributo-de-classe",
                    "`%s` é um atributo de **classe** mutável" % nm,
                    "Declarado direto no corpo da classe, esse valor é **compartilhado por todos os objetos**: "
                    "mexer na lista de um objeto muda a de todos.",
                    "Crie a lista dentro do `__init__`: `self.%s = []`." % nm, item)

        # método com mesmo nome de atributo
        for m in ci.methods:
            if m in ci.attrs_set and not m.startswith("__"):
                add("warn", "metodo-atributo", "`%s` é método **e** atributo" % m,
                    "Na classe `%s` existe `def %s` e também `self.%s = ...`. O atributo esconde o método "
                    "(depois você vai ver `'int' object is not callable`)." % (ci.name, m, m),
                    "Dê nomes diferentes: por exemplo, atributo `%s` e método `get_%s()`." % (m, m),
                    ci.methods[m])

        for mname, fn in ci.methods.items():
            decos = {_name_of(d) if not isinstance(d, ast.Call) else _name_of(d.func)
                     for d in fn.decorator_list}
            static = bool(decos & {"staticmethod"})
            clsm = bool(decos & {"classmethod"})

            # nome parecido com dunder
            stripped = mname.strip("_")
            if mname not in ("__init__", "__str__", "__repr__"):
                cand = _close(stripped, _DUNDERS, cutoff=0.75)
                if cand and (mname.startswith("_") or mname == stripped) and len(stripped) <= 6 \
                        and not (mname.startswith("__") and mname.endswith("__") and len(mname) > 4 and stripped in ("len", "eq", "add")):
                    alvo = "__%s__" % cand[0]
                    add("error", "init-typo", "Será que `%s` deveria ser `%s`?" % (mname, alvo),
                        "Os métodos especiais do Python têm **dois underscores de cada lado**: `%s`. "
                        "Com `%s` o Python trata como um método comum e nunca o chama sozinho." % (alvo, mname),
                        "Renomeie `def %s(...)` para `def %s(...)`." % (mname, alvo), fn)

            # self faltando
            if not static and not clsm:
                args = fn.args.posonlyargs + fn.args.args
                if not args and not fn.args.vararg:
                    add("error", "self-ausente",
                        "O método `%s` está sem `self`" % mname,
                        "Quando você chama `objeto.%s()`, o Python passa o próprio objeto como primeiro "
                        "argumento automaticamente — por isso todo método precisa de `self` entre os parênteses." % mname,
                        "Escreva `def %s(self):`." % mname, fn)
                elif args and args[0].arg != "self":
                    a0 = args[0].arg
                    if _close(a0, ["self"], cutoff=0.5) or a0 in ("this", "me", "obj"):
                        add("error", "self-ausente",
                            "`%s` parece um erro de digitação de `self`" % a0,
                            "O primeiro parâmetro de todo método recebe o próprio objeto e por convenção "
                            "se chama `self`.",
                            "Troque `%s` por `self` na assinatura de `%s` (e no corpo do método)." % (a0, mname), fn)
                    else:
                        add("error", "self-ausente",
                            "O método `%s` não tem `self` como primeiro parâmetro" % mname,
                            "O primeiro parâmetro (`%s`) vai receber o **próprio objeto**, e não o valor que "
                            "você pensa estar passando." % a0,
                            "Escreva `def %s(self, %s):` — o `self` sempre vem primeiro." % (mname, a0), fn)

            first = _first_param(fn)
            bound = _bound_names(fn)
            params = set(_params(fn))

            # nome = nome  (sem self.)   /  variável local no __init__
            if mname == "__init__":
                loads = {n.id for n in ast.walk(fn) if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Load)}
                for st in ast.walk(fn):
                    if isinstance(st, ast.Assign):
                        for t in st.targets:
                            if isinstance(t, ast.Name):
                                v_names = {n.id for n in ast.walk(st.value) if isinstance(n, ast.Name)}
                                if t.id in params and t.id in v_names:
                                    add("error", "faltou-self-attr",
                                        "`%s = %s` não cria atributo" % (t.id, t.id),
                                        "Sem o `self.`, o Python cria só uma **variável local** que desaparece "
                                        "quando o `__init__` termina. O objeto fica sem esse dado.",
                                        "Escreva `self.%s = %s`." % (t.id, t.id), st)
                                elif t.id not in loads:
                                    add("warn", "faltou-self-attr",
                                        "`%s` virou variável local" % t.id,
                                        "No `__init__`, `%s = ...` cria uma variável que some quando o método "
                                        "termina. Se a ideia era um atributo do objeto, precisa do `self.`." % t.id,
                                        "Use `self.%s = ...`." % t.id, st)
                    elif isinstance(st, ast.Return) and st.value is not None and \
                            not (isinstance(st.value, ast.Constant) and st.value.value is None):
                        add("error", "return-init", "`__init__` não deve usar `return` com valor",
                            "O `__init__` só **prepara** o objeto; o Python devolve o objeto sozinho. "
                            "Retornar outro valor causa `TypeError`.",
                            "Apague o `return` (ou use só `return` sem valor).", st)

            # chamar método/atributo sem self.
            if first:
                all_m = info.all_methods(ci.name)
                all_a = info.all_attrs(ci.name)
                seen_lines = set()
                for n in ast.walk(fn):
                    if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Load):
                        nm = n.id
                        if nm in bound or nm in info.module_names or nm in builtin_names:
                            continue
                        if n.lineno in seen_lines:
                            continue
                        if nm in all_m:
                            seen_lines.add(n.lineno)
                            add("error", "faltou-self-call", "Falta `self.` antes de `%s`" % nm,
                                "`%s` é um método da própria classe `%s`. Dentro da classe, métodos e "
                                "atributos são acessados pelo objeto: `self.`." % (nm, ci.name),
                                "Escreva `self.%s(...)`." % nm, n)
                        elif nm in all_a:
                            seen_lines.add(n.lineno)
                            add("error", "faltou-self-attr", "Falta `self.` antes de `%s`" % nm,
                                "`%s` é um atributo do objeto (foi criado com `self.%s = ...`). Dentro dos "
                                "métodos, para usá-lo precisa escrever `self.%s`." % (nm, nm, nm),
                                "Troque `%s` por `self.%s`." % (nm, nm), n)

            # super().__init__(self, ...)
            for n in ast.walk(fn):
                if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute):
                    v = n.func.value
                    if isinstance(v, ast.Call) and isinstance(v.func, ast.Name) and v.func.id == "super":
                        if n.args and isinstance(n.args[0], ast.Name) and n.args[0].id == "self":
                            add("error", "super-self",
                                "Não passe `self` dentro de `super().%s(...)`" % n.func.attr,
                                "Com `super()` o `self` já vai automaticamente. Passar de novo faz o Python "
                                "reclamar de argumentos a mais.",
                                "Remova o `self`: `super().%s(...)`." % n.func.attr, n)

        # filha sobrescreve __init__ sem chamar o da mãe
        init = ci.methods.get("__init__")
        user_bases = [b for b in ci.bases if b in info.classes]
        if init and user_bases and not _has_super_init(init, user_bases):
            add("warn", "sem-super-init",
                "`%s` sobrescreve `__init__` mas não chama o da classe mãe" % ci.name,
                "Quando a filha define o próprio `__init__`, o da mãe **não roda sozinho**: "
                "os atributos da `%s` não serão criados." % user_bases[0],
                "Na primeira linha do `__init__`, escreva `super().__init__(...)` com os dados da mãe.", init)

    # --- regras que valem em qualquer lugar do arquivo ---
    for n in ast.walk(tree):
        # obj.metodo sem parênteses
        if isinstance(n, ast.Expr):
            v = n.value
            if isinstance(v, ast.Attribute) and v.attr in method_names_all:
                add("warn", "sem-parenteses", "Faltaram `()` em `%s`" % v.attr,
                    "Sem parênteses você só **cita** o método — ele não é executado.",
                    "Escreva `...%s()`." % v.attr, n)
            elif isinstance(v, ast.Name) and (v.id in info.funcs or v.id in info.classes):
                add("warn", "sem-parenteses", "Faltaram `()` em `%s`" % v.id,
                    "Sem parênteses a função não é chamada.", "Escreva `%s()`." % v.id, n)
            elif isinstance(v, ast.Compare) and all(isinstance(o, ast.Eq) for o in v.ops):
                _self_attr = isinstance(v.left, ast.Attribute) and isinstance(v.left.value, ast.Name) and v.left.value.id == "self"
                add("error" if _self_attr else "warn", "comparacao-solta", "Essa linha só **compara**, não guarda nada",
                    "`==` compara e descarta o resultado. Para guardar um valor use `=`.",
                    "Troque `==` por `=` se queria atribuir.", n)
        # print(obj.metodo) sem parênteses
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == "print":
            for a in n.args:
                if isinstance(a, ast.Attribute) and a.attr in method_names_all:
                    add("warn", "sem-parenteses", "`print(...%s)` vai imprimir `<bound method ...>`" % a.attr,
                        "`%s` é um método. Sem `()` você imprime o método em si, não o resultado." % a.attr,
                        "Escreva `print(...%s())`." % a.attr, n)
        # atributo privado acessado de fora
        if isinstance(n, ast.Attribute) and n.attr.startswith("__") and not n.attr.endswith("__"):
            if not (isinstance(n.value, ast.Name) and n.value.id in ("self", "cls")):
                dentro = False
                for ci in classes_here:
                    if any(n is m for m in ast.walk(ci.node)):
                        dentro = True
                        break
                add("warn", "privado-fora",
                    "`%s` é privado%s" % (n.attr, " (acesso por outro objeto)" if dentro else ""),
                    "Atributos com `__` são **privados**: de fora da classe o Python não encontra o nome "
                    "(`AttributeError`). A classe deve oferecer um método público para ler/alterar.",
                    "Use um método da classe (ex.: `obj.verificar()`), em vez de `obj.%s`." % n.attr, n)
        # laços suspeitos
        if isinstance(n, ast.While):
            _lint_while(n, add)
        if isinstance(n, ast.For):
            _lint_for_remove(n, add)
    return out


def _lint_while(n, add):
    body_nodes = [x for st in n.body for x in ast.walk(st)]
    if any(isinstance(x, (ast.Break, ast.Return, ast.Raise, ast.Yield)) for x in body_nodes):
        return
    for x in body_nodes:
        if isinstance(x, ast.Call) and isinstance(x.func, ast.Name) and x.func.id in ("exit", "quit", "input", "next"):
            return
        if isinstance(x, ast.Call) and isinstance(x.func, ast.Attribute) and x.func.attr in ("exit", "get", "pop", "event"):
            return
    test = n.test
    if isinstance(test, ast.Constant) and test.value:
        add("warn", "laco-infinito", "`while True` sem `break`",
            "Esse laço nunca termina: não há `break` nem `return` dentro dele.",
            "Adicione uma condição de saída (`break`) ou troque `True` por uma condição que mude.", n)
        return
    names = {x.id for x in ast.walk(test) if isinstance(x, ast.Name)}
    attrs = {x.attr for x in ast.walk(test) if isinstance(x, ast.Attribute)}
    if not names and not attrs:
        return
    changed = set()
    for x in body_nodes:
        if isinstance(x, ast.Name) and isinstance(x.ctx, ast.Store):
            changed.add(x.id)
        elif isinstance(x, ast.Attribute) and isinstance(x.ctx, ast.Store):
            changed.add(x.attr)
        elif isinstance(x, ast.Call) and isinstance(x.func, ast.Attribute):
            return  # chamou método: pode alterar o estado, não arrisca
    if not (names | attrs) & changed:
        alvo = ", ".join(_q(a) for a in sorted((names | attrs) - set(dir(builtins))))
        add("warn", "laco-infinito", "O `while` pode nunca terminar",
            "A condição usa %s, mas nada dentro do laço altera isso." % (alvo or "valores fixos"),
            "Dentro do laço, atualize a variável da condição (ex.: `contador += 1`).", n)


def _lint_for_remove(n, add):
    if isinstance(n.iter, ast.Name):
        nome = n.iter.id
        for st in n.body:
            for x in ast.walk(st):
                if isinstance(x, ast.Call) and isinstance(x.func, ast.Attribute) and \
                        isinstance(x.func.value, ast.Name) and x.func.value.id == nome and \
                        x.func.attr in ("remove", "pop", "insert", "append"):
                    if x.func.attr in ("remove", "pop"):
                        add("warn", "remover-no-for",
                            "Alterando `%s` enquanto percorre" % nome,
                            "Remover itens de uma lista **durante** o `for` faz o Python pular elementos.",
                            "Percorra uma cópia: `for x in %s[:]:` (o template do jogo faz isso com as moedas)." % nome, x)
                        return


def lint(trees, srcs, info):
    out = []
    for file, tree in trees.items():
        out.extend(lint_tree(file, tree, srcs[file], info))
    return out


# ----------------------------------------------------------------------------
# 4) REQUISITOS ESTRUTURAIS DO DESAFIO
# ----------------------------------------------------------------------------
def check_requires(info, requires, srcs):
    out = []
    for rc in requires.get("classes", []):
        nome = rc["nome"]
        ci = info.classes.get(nome)
        if not ci:
            definidas = list(info.classes)
            parecida = _close(nome.lower(), [d.lower() for d in definidas], cutoff=0.7)
            body = "Ainda não encontrei a classe `%s` no seu código." % nome
            if definidas:
                body += " Classes que você definiu: %s." % _lista(definidas)
            hint = "Comece com `class %s:` (com esse nome exato)." % nome
            if parecida:
                real = definidas[[d.lower() for d in definidas].index(parecida[0])]
                hint = "Você escreveu `%s`, mas o enunciado pede `%s` — o Python diferencia maiúsculas de minúsculas e acentos." % (real, nome)
            out.append(diag("error", "requisito", "Falta a classe `%s`" % nome, body, hint))
            continue
        file = ci.file
        line = ci.node.lineno
        sn = make_snippet(srcs[file], line, 0)
        if rc.get("herda") and rc["herda"] not in ci.bases:
            out.append(diag("error", "requisito", "`%s` precisa herdar de `%s`" % (nome, rc["herda"]),
                            "Herança é declarada entre parênteses na primeira linha da classe.",
                            "Escreva `class %s(%s):`." % (nome, rc["herda"]), file=file, line=line, snippet=sn))
        for m in rc.get("metodos", []):
            if m not in ci.methods:
                ex = sorted(ci.methods)
                near = _close(m, ex, cutoff=0.6)
                hint = "Dentro da classe, escreva `def %s(self, ...):`." % m
                if near:
                    hint = "Você tem `%s` — o enunciado pede `%s`. Confira o nome (e se não sobrou/faltou letra)." % (near[0], m)
                out.append(diag("error", "requisito", "Falta o método `%s` em `%s`" % (m, nome),
                                "Métodos que `%s` tem agora: %s." % (nome, _lista(ex)), hint,
                                file=file, line=line, snippet=sn))
        ip = rc.get("init_params")
        if ip is not None and "__init__" in ci.methods:
            real = _params(ci.methods["__init__"])[1:]
            if real[:len(ip)] != ip:
                out.append(diag("error", "requisito", "Parâmetros do `__init__` de `%s`" % nome,
                                "O enunciado pede `__init__(self, %s)` e o seu recebe `(self%s)`." % (
                                    ", ".join(ip), "".join(", " + r for r in real)),
                                "Use exatamente esses nomes, na mesma ordem.",
                                file=file, line=ci.methods["__init__"].lineno,
                                snippet=make_snippet(srcs[file], ci.methods["__init__"].lineno, 0)))
        for m in rc.get("usa_super", []):
            fn = ci.methods.get(m)
            if fn and not _has_super_call(fn):
                out.append(diag("error", "requisito", "`%s.%s` deve usar `super()`" % (nome, m),
                                "O enunciado pede para **reaproveitar** o método da classe mãe e acrescentar algo.",
                                "Chame `super().%s(...)` e use o que ele devolve." % m,
                                file=file, line=fn.lineno, snippet=make_snippet(srcs[file], fn.lineno, 0)))
        for m in rc.get("sem_super", []):
            fn = ci.methods.get(m)
            if fn and _has_super_call(fn):
                out.append(diag("error", "requisito", "`%s.%s` NÃO deve usar `super()`" % (nome, m),
                                "Aqui o enunciado pede para **substituir por completo** o comportamento da mãe.",
                                "Apague a chamada a `super()` e retorne o texto pedido direto.",
                                file=file, line=fn.lineno, snippet=make_snippet(srcs[file], fn.lineno, 0)))
        for a in rc.get("atributos_privados", []):
            achou = False
            for fn in ci.methods.values():
                for n in ast.walk(fn):
                    if isinstance(n, ast.Attribute) and n.attr == a and isinstance(n.ctx, ast.Store):
                        achou = True
            if not achou:
                pub = a.lstrip("_")
                out.append(diag("error", "requisito", "`%s` precisa ser um atributo privado" % a,
                                "O enunciado pede encapsulamento: o dado fica escondido e só é mexido por métodos da classe.",
                                "No `__init__`, escreva `self.%s = ...` (dois underscores) em vez de `self.%s`." % (a, pub),
                                file=file, line=line, snippet=sn))
    for f in requires.get("funcoes", []):
        if f not in info.funcs:
            out.append(diag("error", "requisito", "Falta a função `%s`" % f,
                            "Não encontrei `def %s(...)` no seu código." % f,
                            "Escreva `def %s(...):` no nível de fora das classes." % f))
    return out


# ----------------------------------------------------------------------------
# 5) EXECUÇÃO
# ----------------------------------------------------------------------------
class ExecucaoPresa(BaseException):
    """Levantada pelo tracer quando o código passa do tempo limite."""


_ESTADO = {"file": None, "line": None}


def _make_tracer(valid, deadline):
    contador = [0]

    def local(frame, event, arg):
        if event == "line":
            contador[0] += 1
            if (contador[0] & 0x3FF) == 0 and time.monotonic() > deadline[0]:
                _ESTADO["file"] = valid.get(frame.f_code.co_filename)
                _ESTADO["line"] = frame.f_lineno
                raise ExecucaoPresa()
        return local

    def glob(frame, event, arg):
        if frame.f_code.co_filename in valid:
            return local
        return None

    return glob


def _make_input(stdin_text, buf):
    linhas = (stdin_text or "").split("\n") if stdin_text else []
    it = iter(linhas)

    def _input(prompt=""):
        buf.write(str(prompt))
        try:
            v = next(it)
        except StopIteration:
            raise EOFError("input() sem dados")
        buf.write(v + "\n")
        return v

    return _input


class Sessao:
    """Uma execução do código do aluno: arquivos, namespace, saída, erro."""

    def __init__(self, files, entry, run_name, extra=None, stdin=None, limite=LIMITE_SEGUNDOS):
        self.files = files
        self.entry = entry
        self.extra = extra
        self.limite = limite
        self.workdir = tempfile.mkdtemp(prefix="byte_")
        self.valid = {}
        for name, src in files.items():
            p = os.path.join(self.workdir, name)
            with open(p, "w", encoding="utf-8") as f:
                f.write(src)
            self.valid[p] = name
        self.valid["<exemplo>"] = "<exemplo>"
        self.entry_path = os.path.join(self.workdir, entry)
        sys.path.insert(0, self.workdir)
        self.mods = [n[:-3] for n in files if n.endswith(".py")]
        for m in self.mods:
            sys.modules.pop(m, None)
        self.ns = {"__name__": run_name, "__file__": self.entry_path, "__builtins__": builtins}
        self.buf = io.StringIO()
        self.err = None
        self.stdin = stdin
        self.deadline = [0]
        self.tracer = _make_tracer(self.valid, self.deadline)

    # roda `fn` com stdout capturado, rastreio de tempo e input() controlado
    def guard(self, fn, limite=None):
        self.deadline[0] = time.monotonic() + (limite or self.limite)
        old_input = builtins.input
        builtins.input = _make_input(self.stdin, self.buf)
        try:
            with contextlib.redirect_stdout(self.buf), contextlib.redirect_stderr(self.buf):
                sys.settrace(self.tracer)
                try:
                    return fn()
                finally:
                    sys.settrace(None)
        finally:
            builtins.input = old_input

    def exec_main(self):
        try:
            def go():
                code = compile(self.files[self.entry], self.entry_path, "exec")
                exec(code, self.ns)
                if self.extra:
                    exec(compile(self.extra, "<exemplo>", "exec"), self.ns)
            self.guard(go)
        except SystemExit:
            pass
        except BaseException as e:   # inclui ExecucaoPresa
            self.err = e

    def stdout(self):
        s = self.buf.getvalue()
        if len(s) > LIMITE_SAIDA:
            s = s[:LIMITE_SAIDA] + "\n… (saída cortada)"
        return s

    def close(self):
        try:
            sys.path.remove(self.workdir)
        except ValueError:
            pass
        for m in self.mods:
            sys.modules.pop(m, None)
        shutil.rmtree(self.workdir, ignore_errors=True)


# ----------------------------------------------------------------------------
# 6) TRADUÇÃO DE EXCEÇÕES
# ----------------------------------------------------------------------------
_OUTRAS_LINGUAGENS_ATTR = {
    "push": "append", "length": "len(...)", "size": "len(...)", "add": "append",
    "toString": "str(...)", "println": "print(...)", "equals": "==", "charAt": "[indice]",
}
_MODULOS_COMUNS = ("random", "math", "datetime", "os", "sys", "time", "json", "re", "collections", "itertools")


def _frames(e, sess):
    out = []
    tb = e.__traceback__
    while tb:
        fn = tb.tb_frame.f_code.co_filename
        if fn in sess.valid:
            nome = sess.valid[fn]
            src = sess.files.get(nome) if nome in sess.files else (sess.extra or "")
            out.append({"file": nome, "line": tb.tb_lineno,
                        "func": getattr(tb.tb_frame.f_code, "co_qualname", tb.tb_frame.f_code.co_name),
                        "code": _line_text(src, tb.tb_lineno).strip(),
                        "frame": tb.tb_frame})
        tb = tb.tb_next
    return out


def _regex_first(pat, s):
    m = re.search(pat, s)
    return m.groups() if m else None


def explain_exception(e, sess, info):
    frames = _frames(e, sess)
    last = frames[-1] if frames else None
    nome_arq = last["file"] if last else None
    line = last["line"] if last else None
    src = ""
    if last:
        src = sess.files.get(nome_arq, sess.extra or "")
    code_line = last["code"] if last else ""
    tname = type(e).__name__
    msg = str(e)
    in_example = nome_arq == "<exemplo>"
    where = ""
    if last:
        where = ("no código de exemplo" if in_example else "no seu código") + ", linha %d" % line
    fix_file, fix_line = (None if in_example else nome_arq), (None if in_example else line)

    title, body, hint = "%s: %s" % (tname, msg), "", ""

    # ---------------- travou ----------------
    if isinstance(e, ExecucaoPresa):
        nm = _ESTADO.get("file")
        ln = _ESTADO.get("line")
        s2 = sess.files.get(nm, sess.extra or "") if nm else ""
        d = diag("error", "travou", "Seu código ficou preso (laço infinito?)",
                 "Passou de %.0f segundos executando e eu parei para não travar a página. "
                 "A última linha em que ele estava foi a %s." % (sess.limite, ln),
                 "Num `while`, confirme que algo dentro do laço **muda** a condição. "
                 "Numa recursão, confirme que existe um **caso base**.",
                 file=None if nm == "<exemplo>" else nm, line=ln, snippet=make_snippet(s2, ln, 1))
        d["trace"] = _trace_public(frames)
        return d

    # ---------------- NameError ----------------
    if isinstance(e, NameError):
        nm = getattr(e, "name", None) or (_regex_first(r"name '(.+?)'", msg) or ("",))[0]
        local_msg = isinstance(e, UnboundLocalError)
        title = "O nome `%s` não existe aqui" % nm
        body = "O Python não conhece `%s` nesse ponto do código." % nm
        cls_ctx = _enclosing_class(last, info) if last else None
        mapa = {"true": "True", "false": "False", "null": "None", "none": "None", "nil": "None"}
        todos = set(info.classes) | set(info.funcs) | info.module_names | set(dir(builtins))
        if last:
            todos |= set(last["frame"].f_locals) | set(last["frame"].f_globals)
        if nm in mapa or nm.lower() in mapa and nm not in todos:
            alvo = mapa.get(nm) or mapa.get(nm.lower())
            hint = "Em Python é `%s` (com a primeira letra maiúscula)." % alvo
        elif cls_ctx and (nm in info.all_attrs(cls_ctx.name) or nm in info.all_methods(cls_ctx.name)):
            eh_m = nm in info.all_methods(cls_ctx.name)
            title = "Falta `self.` antes de `%s`" % nm
            body = ("`%s` é %s da classe `%s`, mas dentro dos métodos precisa ser acessado pelo objeto."
                    % (nm, "um método" if eh_m else "um atributo", cls_ctx.name))
            hint = "Escreva `self.%s%s`." % (nm, "(...)" if eh_m else "")
        elif nm in _MODULOS_COMUNS:
            title = "Faltou `import %s`" % nm
            body = "Para usar a biblioteca `%s` você precisa importá-la antes." % nm
            hint = "No topo do arquivo: `import %s`." % nm
        elif local_msg:
            title = "`%s` usada antes de receber valor" % nm
            body = ("Dentro de uma função, se você atribui a `%s` em algum ponto, o Python a trata como "
                    "variável **local** — e aqui você a usou antes de dar um valor." % nm)
            hint = "Dê um valor inicial antes de usar, ou (se for atributo do objeto) use `self.%s`." % nm
        else:
            near = _close(nm, todos, n=2, cutoff=0.6)
            posterior = None
            if nm in info.classes:
                posterior = info.classes[nm].node.lineno
            elif nm in info.funcs:
                posterior = info.funcs[nm].lineno
            como_valor = bool(re.search(r"[(,=]\s*" + re.escape(nm) + r"\s*[,)]", code_line or "")) if nm else False
            if como_valor and nm not in info.classes and nm not in info.funcs:
                title = "O nome `%s` não existe: faltaram as aspas?" % nm
                body = ("O Python leu `%s` sem aspas e procurou uma **variável** com esse nome, que não existe. "
                        "Texto (string) sempre vai entre aspas." % nm)
                hint = 'Se `%s` é um texto, escreva `"%s"`.' % (nm, nm)
                if near:
                    hint += " Se você queria usar a variável %s, confira a grafia (maiúsculas contam)." % " ou ".join(_q(x) for x in near)
            elif near:
                hint = "Você quis dizer %s? O Python diferencia maiúsculas de minúsculas." % " ou ".join(_q(x) for x in near)
            elif posterior and line and posterior > line:
                hint = "`%s` só é definido na linha %d, depois do ponto onde você a usa. Defina antes de usar." % (nm, posterior)
            else:
                hint = ("Confira a grafia, se a variável foi criada antes desta linha e se não ficou "
                        "dentro de outra função/método.")
        return _final(e, title, body, hint, fix_file, fix_line, src, where, frames, code_line, tname, msg, sess)

    # ---------------- AttributeError ----------------
    if isinstance(e, AttributeError):
        nm = getattr(e, "name", None) or (_regex_first(r"attribute '(.+?)'", msg) or ("",))[0]
        obj = getattr(e, "obj", None)
        tipo = type(obj).__name__ if obj is not None or "NoneType" in msg else ""
        title = "`%s` não existe nesse objeto" % nm
        body = msg
        if obj is None and "NoneType" in msg:
            title = "O valor é `None` — não tem `.%s`" % nm
            body = ("Você tentou usar `.%s` em algo que vale `None` (nada). Isso costuma acontecer quando:\n"
                    "• uma função/método **não tem `return`** (devolve `None` sozinho);\n"
                    "• um atributo nunca recebeu valor no `__init__`;\n"
                    "• você guardou o resultado de algo que só modifica, como `lista = lista.sort()`." % nm)
            hint = "Veja o que está antes do `.%s` nessa linha e confirme que ele realmente retorna um valor." % nm
        elif isinstance(obj, type) and obj.__name__ in info.classes:
            title = "`%s` é a **classe**, não um objeto" % obj.__name__
            body = ("Você pediu `%s.%s`, mas atributos de instância moram nos **objetos** criados a partir da classe, "
                    "não na classe." % (obj.__name__, nm))
            hint = "Crie um objeto primeiro: `meu_obj = %s(...)` e use `meu_obj.%s`." % (obj.__name__, nm)
        elif tipo in info.classes:
            ci = info.classes[tipo]
            existentes = sorted((info.all_attrs(tipo) | info.all_methods(tipo)) - {"__init__"})
            priv = [a for a in dir(obj) if a == "_%s%s" % (tipo, nm)] if nm.startswith("__") else []
            if priv or (nm.startswith("__") and not nm.endswith("__")):
                title = "`%s` é privado — não dá para acessar de fora" % nm
                body = ("Atributos com `__` no começo são **privados**: o Python esconde esse nome fora da classe. "
                        "Essa é a ideia do encapsulamento!")
                hint = "Crie (ou use) um método **público** na classe `%s` para ler/alterar esse valor." % tipo
            else:
                near = _close(nm, existentes, n=2, cutoff=0.6)
                title = "`%s` não tem `%s`" % (tipo, nm)
                body = "Objetos da classe `%s` têm: %s." % (tipo, _lista(existentes))
                if nm in info.classes[tipo].attrs_get and nm not in info.all_attrs(tipo) and nm not in info.all_methods(tipo):
                    hint = "Você lê `self.%s` mas nenhum método cria esse atributo. Crie-o no `__init__`: `self.%s = ...`." % (nm, nm)
                elif near:
                    hint = "Você quis dizer %s? Confira maiúsculas, minúsculas e underscores." % " ou ".join(_q(x) for x in near)
                else:
                    hint = "Se `%s` deveria existir, crie-o no `__init__` (`self.%s = ...`) ou como método." % (nm, nm)
        elif type(obj).__name__ == "module":
            near = _close(nm, [x for x in dir(obj) if not x.startswith("_")], n=2, cutoff=0.6)
            title = "O módulo `%s` não tem `%s`" % (obj.__name__, nm)
            hint = ("Você quis dizer %s?" % " ou ".join(_q(x) for x in near)) if near else \
                "Confira a grafia na documentação da biblioteca."
        else:
            opts = [x for x in dir(obj) if not x.startswith("_")]
            near = _close(nm, opts, n=2, cutoff=0.6)
            title = "Objetos do tipo `%s` não têm `.%s`" % (tipo, nm)
            if nm in _OUTRAS_LINGUAGENS_ATTR:
                hint = "Em Python o equivalente é `%s`." % _OUTRAS_LINGUAGENS_ATTR[nm]
            elif near:
                hint = "Você quis dizer %s?" % " ou ".join(_q(x) for x in near)
            else:
                hint = "Confira se `%s` é mesmo desse tipo (use `print(type(...))` para investigar)." % (tipo or "objeto")
        return _final(e, title, body, hint, fix_file, fix_line, src, where, frames, code_line, tname, msg, sess)

    # ---------------- TypeError ----------------
    if isinstance(e, TypeError):
        r = _explain_typeerror(e, msg, last, info, sess)
        if r:
            title, body, hint, fix_file, fix_line = r[0], r[1], r[2], r[3] or fix_file, r[4] or fix_line
            if r[3]:
                src = sess.files.get(r[3], src)
        return _final(e, title, body, hint, fix_file, fix_line, src, where, frames, code_line, tname, msg, sess)

    # ---------------- outros ----------------
    if isinstance(e, ZeroDivisionError):
        title = "Divisão por zero"
        body = "O divisor dessa conta valia `0` no momento do erro."
        hint = "Antes de dividir, verifique: `if divisor != 0:`."
    elif isinstance(e, RecursionError):
        title = "Troia apareceu: recursão sem fim!"
        body = ("Uma função/método chamou a si mesmo sem parar, até estourar a pilha (_stack overflow_). "
                "Em recursão de propósito, falta o **caso base**; sem querer, isso acontece quando um método "
                "chama a si próprio pelo nome.")
        hint = ("Procure uma chamada a si mesmo nessa linha. Em classes, é comum um atributo e um método com "
                "o mesmo nome, ou um `__init__`/`super()` que se chama de novo.")
    elif isinstance(e, IndexError):
        title = "Posição que não existe na lista"
        body = "Você pediu um índice maior que o último da sequência. Índices começam em `0` e vão até `tamanho - 1`."
        hint = "Imprima `len(lista)` antes dessa linha ou use um `for item in lista:`."
    elif isinstance(e, KeyError):
        title = "Chave não encontrada no dicionário: %s" % msg
        body = "Esse dicionário não tem essa chave."
        hint = "Confira a grafia da chave ou use `dic.get(chave)` para evitar o erro."
    elif isinstance(e, ModuleNotFoundError) or isinstance(e, ImportError):
        r = _explain_import(e, msg, sess, info)
        title, body, hint = r
    elif isinstance(e, ValueError):
        title = "Valor inválido"
        body = msg
        if "invalid literal for int()" in msg:
            body = "Você tentou converter um texto que não é número inteiro com `int()`. (%s)" % msg
            hint = "Confira o texto que está sendo convertido (espaços, vírgula em vez de ponto, letras)."
        else:
            hint = "Veja se o valor passado para a função faz sentido (tipo e intervalo)."
    elif isinstance(e, EOFError):
        title = "O programa pediu `input()`"
        body = "Aqui no navegador não tem teclado para `input()` neste exercício."
        hint = "Troque o `input()` por um valor fixo (ex.: `nome = \"Byte\"`) para testar."
    elif isinstance(e, AssertionError):
        title = "Um `assert` falhou"
        body = msg or "A condição do `assert` era falsa."
        hint = "Compare o valor real com o esperado."
    elif isinstance(e, IndentationError):
        title = "Problema de indentação"
        hint = "Use sempre 4 espaços por nível."
    else:
        hint = "Leia a mensagem técnica abaixo e veja em qual linha o erro aconteceu."
        body = msg
    return _final(e, title, body, hint, fix_file, fix_line, src, where, frames, code_line, tname, msg, sess)


def _final(e, title, body, hint, fix_file, fix_line, src, where, frames, code_line, tname, msg, sess):
    d = diag("error", "runtime", title, body, hint, file=fix_file, line=fix_line,
             snippet=make_snippet(src, fix_line, 1) if fix_line else None,
             tecnico="%s: %s" % (tname, msg))
    if where:
        d["onde"] = where + (": `%s`" % code_line if code_line else "")
    d["trace"] = _trace_public(frames)
    return d


def _trace_public(frames):
    return [{"file": f["file"], "line": f["line"], "func": f["func"], "code": f["code"]} for f in frames][-5:]


def _enclosing_class(last, info):
    if not last:
        return None
    q = last["func"]
    if "." in q:
        c = q.split(".")[0]
        return info.classes.get(c)
    return None


def _explain_typeerror(e, msg, last, info, sess):
    """retorna (title, body, hint, fix_file, fix_line) ou None"""
    # takes N positional arguments but M were given
    m = re.match(r"(.+?)\(\) takes (?:from (\d+) to )?(\d+|no) positional arguments? but (\d+) (?:was|were) given", msg)
    if m:
        qual, _, n, dados = m.group(1), m.group(2), m.group(3), int(m.group(4))
        n = 0 if n == "no" else int(n)
        ci, fn = info.find_method(qual)
        nome = qual.split(".")[-1]
        if fn is not None:
            if n == 0 or not (fn.args.posonlyargs + fn.args.args):
                return ("O método `%s` está sem `self`" % nome,
                        "Ao chamar `objeto.%s(...)`, o Python passa o próprio objeto como primeiro argumento. "
                        "Como `def %s` não tem nenhum parâmetro, sobrou argumento." % (nome, nome),
                        "Escreva `def %s(self%s):`." % (nome, ", ..." if dados > 1 else ""),
                        ci.file, fn.lineno)
            esperado, recebido = n - 1, dados - 1
            if nome == "__init__":
                return ("Quantidade errada de argumentos ao criar `%s`" % ci.name,
                        "O `__init__` de `%s` recebe %d argumento(s) (além do `self`), mas você passou %d."
                        % (ci.name, esperado, recebido),
                        "Ou adicione os parâmetros que faltam no `__init__`, ou passe menos valores em `%s(...)`." % ci.name,
                        ci.file, fn.lineno)
            return ("`%s` recebeu argumentos demais" % nome,
                    "`%s` espera %d argumento(s) (além do `self`), mas recebeu %d." % (nome, esperado, recebido),
                    "Ajuste os parâmetros do `def %s` ou a chamada." % nome, ci.file, fn.lineno)
        return ("Argumentos demais em `%s()`" % qual,
                "`%s` aceita %d argumento(s), mas recebeu %d." % (qual, n, dados),
                "Confira a definição da função e a chamada.", None, None)

    m = re.match(r"(.+?)\(\) takes no arguments", msg)
    if m:
        nome = m.group(1)
        ci = info.classes.get(nome)
        body = "A classe `%s` não tem um `__init__` que receba parâmetros, mas você passou valores ao criar o objeto." % nome
        hint = "Defina `def __init__(self, ...):` na classe — com **dois** underscores antes e depois."
        if ci:
            parecidos = [n for n in ci.methods if "init" in n.lower()]
            if parecidos:
                hint = "Achei `%s`, que parece ser um `__init__` com o nome errado. O correto é `__init__` (dois `_` de cada lado)." % parecidos[0]
            return ("`%s` não aceita argumentos" % nome, body, hint, ci.file, ci.node.lineno)
        return ("`%s` não aceita argumentos" % nome, body, hint, None, None)

    m = re.match(r"(.+?)\(\) missing (\d+) required positional arguments?: (.+)", msg)
    if m:
        qual, falta = m.group(1), m.group(3).replace("'", "`")
        ci, fn = info.find_method(qual)
        nome = qual.split(".")[-1]
        if nome == "__init__" and ci:
            return ("Faltou passar %s ao criar `%s`" % (falta, ci.name),
                    "O `__init__` de `%s` exige esse(s) valor(es), mas a chamada `%s(...)` não os passou." % (ci.name, ci.name),
                    "Passe todos os valores na ordem: `%s(%s)`." % (ci.name, ", ".join(_params(fn)[1:])), None, None)
        return ("Faltou passar %s em `%s()`" % (falta, nome),
                "A função/método `%s` exige esse(s) argumento(s)." % nome,
                "Passe o(s) valor(es) que falta(m) na chamada.", None, None)

    m = re.match(r"(.+?)\(\) got an unexpected keyword argument '(.+?)'", msg)
    if m:
        qual, kw = m.groups()
        ci, fn = info.find_method(qual)
        if fn:
            ps = _params(fn)[1:]
            near = _close(kw, ps, cutoff=0.5)
            return ("Argumento com nome errado: `%s`" % kw,
                    "`%s` só aceita: %s." % (qual, _lista(ps)),
                    ("Você quis dizer `%s`?" % near[0]) if near else "Use exatamente os nomes dos parâmetros.",
                    ci.file, fn.lineno)
        return ("Argumento desconhecido: `%s`" % kw, msg, "Confira os nomes dos parâmetros.", None, None)

    if "object.__init__() takes exactly one argument" in msg:
        return ("`super().__init__(...)` com argumentos, mas a mãe é `object`",
                "A classe não herda de nenhuma classe sua, então o `super()` aponta para `object`, "
                "que não aceita argumentos.",
                "Declare a herança: `class Filha(Mae):` — ou remova os argumentos do `super().__init__()`.", None, None)

    if "can only concatenate str" in msg or ("unsupported operand type(s) for +" in msg and "'str'" in msg):
        return ("Não dá para somar texto com número",
                "O operador `+` junta textos com textos (ou soma números com números), mas não mistura os dois.",
                "Use f-string: `f\"Energia: {self.energia}\"` ou converta com `str(...)`.", None, None)
    if "unsupported operand type" in msg or "not supported between instances" in msg:
        return ("Operação entre tipos incompatíveis",
                "%s" % msg + ".",
                "Se um dos lados é um **objeto**, use o atributo dele (ex.: `obj.energia`), não o objeto inteiro.", None, None)
    if "is not callable" in msg:
        tipo = re.match(r"'(.+?)' object is not callable", msg)
        tipo = tipo.group(1) if tipo else ""
        return ("Você usou `()` em algo que não é função (`%s`)" % tipo,
                "Isso acontece quando um atributo tem o **mesmo nome** de um método (o atributo esconde o método), "
                "ou quando você escreve `variavel(...)` em vez de `variavel[...]`/`variavel * x`.",
                "Renomeie o atributo ou o método, ou apague os `()` se era só para ler o valor.", None, None)
    if "is not subscriptable" in msg:
        tipo = re.match(r"'(.+?)' object is not subscriptable", msg)
        tipo = tipo.group(1) if tipo else ""
        if tipo == "NoneType":
            return ("Usou `[ ]` em algo que é `None`",
                    "O valor antes dos colchetes vale `None`: provavelmente faltou um `return` numa função.",
                    "Veja de onde vem esse valor e confirme que ele é devolvido.", None, None)
        return ("Objetos `%s` não aceitam `[ ]`" % tipo,
                "Colchetes servem para listas, tuplas, dicionários e textos — não para objetos criados por classes.",
                "Para ler algo de um objeto use `objeto.atributo`.", None, None)
    if "is not iterable" in msg:
        tipo = re.match(r"'(.+?)' object is not iterable", msg)
        tipo = tipo.group(1) if tipo else ""
        h = "Para repetir `n` vezes use `for i in range(n):`." if tipo == "int" else \
            "Só dá para percorrer com `for` listas, textos, dicionários... Se é um objeto seu, percorra uma **lista** de objetos."
        if tipo == "NoneType":
            h = "O valor vale `None` — provavelmente faltou `return` numa função, ou o atributo não foi criado como lista."
        return ("Não dá para percorrer um `%s` com `for`" % tipo, msg + ".", h, None, None)
    if "should return None" in msg:
        return ("`__init__` não pode retornar valor", msg + ".", "Apague o `return` do `__init__`.", None, None)
    if "indices must be integers" in msg:
        return ("Índice do tipo errado", msg + ".", "Índices de lista são números inteiros (`lista[0]`).", None, None)
    if "has no len()" in msg:
        return ("`len()` num objeto sem tamanho", msg + ".", "`len` funciona em listas, textos, dicionários...", None, None)
    return None


def _explain_import(e, msg, sess, info):
    nome = getattr(e, "name", None) or ""
    arquivos = [n[:-3] for n in sess.files if n.endswith(".py")]
    if isinstance(e, ModuleNotFoundError):
        if nome.split(".")[0] in ("pygame", "pygame_ce"):
            return ("O Pygame não roda aqui no navegador",
                    "Esta página roda só o Python \"puro\". O Pygame abre uma janela de verdade, "
                    "então precisa do seu computador.",
                    "Teste jogos no VS Code: `pip install pygame` e `python main.py`.")
        near = _close(nome, arquivos, cutoff=0.6)
        if near:
            return ("Não achei o módulo `%s`" % nome,
                    "Arquivos disponíveis para importar: %s." % _lista(arquivos),
                    "Você quis dizer `import %s`? O nome é o do arquivo, sem `.py`." % near[0])
        return ("Não achei o módulo `%s`" % nome,
                "Ele não é um arquivo do seu projeto nem uma biblioteca disponível aqui.",
                "Confira o nome do arquivo (igual, minúsculo, sem espaços/acentos) e se ele está na mesma pasta.")
    r = _regex_first(r"cannot import name '(.+?)' from '(.+?)'", msg)
    if r:
        nm, mod = r
        mod_obj = sys.modules.get(mod)
        publicos = [x for x in dir(mod_obj) if not x.startswith("_")] if mod_obj else []
        near = _close(nm, publicos, cutoff=0.6)
        return ("`%s` não existe em `%s`" % (nm, mod),
                "O que `%s` define: %s." % (mod, _lista(publicos)),
                ("Você quis dizer `%s`?" % near[0]) if near else "Confira o nome da classe/função (maiúsculas contam!).")
    return ("Falha ao importar", msg, "Confira o nome do módulo e do que está sendo importado.")


# ----------------------------------------------------------------------------
# 7) INSPEÇÃO DE OBJETOS (painel "Memória do Byte")
# ----------------------------------------------------------------------------
def _short(v, n=44):
    try:
        s = repr(v)
    except Exception:
        s = "<?>"
    return s if len(s) <= n else s[: n - 1] + "…"


def _obj_card(v, classes):
    cls = type(v)
    attrs = []
    for k, val in list(getattr(v, "__dict__", {}).items())[:10]:
        priv = k.startswith("_%s__" % cls.__name__)
        shown = ("__" + k[len(cls.__name__) + 3:]) if priv else k
        if type(val).__name__ in classes:
            sv = "<%s>" % type(val).__name__
        elif isinstance(val, (list, tuple)) and val and all(type(x).__name__ in classes for x in val):
            sv = "[%s]" % ", ".join("<%s>" % type(x).__name__ for x in val[:4]) + ("…" if len(val) > 4 else "")
        else:
            sv = _short(val)
        attrs.append({"k": shown, "v": sv, "priv": priv})
    bases = [b.__name__ for b in cls.__mro__[1:-1]]
    return {"cls": cls.__name__, "bases": bases, "attrs": attrs}


def inspect_objects(ns):
    classes = {k for k, v in ns.items() if isinstance(v, type) and getattr(v, "__module__", None) == ns.get("__name__")}
    out = []
    for k, v in list(ns.items()):
        if k.startswith("__") or isinstance(v, (type, type(sys), type(lambda: 0))):
            continue
        if type(v).__name__ in classes:
            c = _obj_card(v, classes)
            c["name"] = k
            out.append(c)
        elif isinstance(v, (list, tuple)) and v and all(type(x).__name__ in classes for x in v):
            out.append({"name": k, "cls": "list", "bases": [], "attrs": [], "items": [_obj_card(x, classes) for x in v[:6]], "n": len(v)})
        elif isinstance(v, (int, float, str, bool)) or v is None:
            out.append({"name": k, "cls": type(v).__name__, "simple": _short(v), "attrs": [], "bases": []})
        if len(out) >= 14:
            break
    return out


# ----------------------------------------------------------------------------
# 8) TESTES DO DESAFIO
# ----------------------------------------------------------------------------
_NADA = object()


class TestFail(Exception):
    def __init__(self, msg, expected=_NADA, got=_NADA, dica=None):
        Exception.__init__(self, msg)
        self.msg = msg
        self.expected = expected
        self.got = got
        self.dica = dica


def _norm(s):
    return re.sub(r"[\W_]+", "", str(s), flags=re.UNICODE).casefold()


def _same(a, b):
    if isinstance(a, bool) or isinstance(b, bool):
        return type(a) is type(b) and a == b
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return abs(a - b) < 1e-9
    return a == b


def _diff_str(got, want):
    sm = difflib.SequenceMatcher(None, got, want)
    partes = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            continue
        if tag == "delete":
            partes.append("sobrou `%s`" % got[i1:i2])
        elif tag == "insert":
            partes.append("faltou `%s`" % want[j1:j2])
        else:
            partes.append("`%s` deveria ser `%s`" % (got[i1:i2], want[j1:j2]))
        if len(partes) >= 3:
            break
    return "; ".join(partes)


class Ctx:
    """Ajudantes disponíveis dentro do código dos testes."""

    def __init__(self, ns, sess):
        self.ns = ns
        self.sess = sess
        self.last_out = ""

    def cls(self, nome):
        c = self.ns.get(nome)
        if not isinstance(c, type):
            raise TestFail("A classe `%s` não existe (ou não é uma classe)." % nome)
        return c

    def new(self, nome, *a, **kw):
        c = self.cls(nome)
        try:
            return c(*a, **kw)
        except TypeError as e:
            msg = str(e)
            if "required positional" in msg or "positional argument" in msg or "no arguments" in msg or "unexpected keyword" in msg:
                import inspect
                try:
                    sig = str(inspect.signature(c))
                except Exception:
                    sig = "(?)"
                raise TestFail("Não consegui criar `%s(%s)`. A classe aceita `%s%s`." % (
                    nome, ", ".join(_short(x) for x in a) + ("" if not kw else ", " + ", ".join("%s=%s" % (k, _short(v)) for k, v in kw.items())),
                    nome, sig),
                    dica="Confira os parâmetros do `__init__` (nomes e ordem) conforme o enunciado.")
            raise

    def call(self, fn, *a, **kw):
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            r = fn(*a, **kw)
        self.last_out = buf.getvalue()
        return r

    def attr(self, obj, nome):
        if not hasattr(obj, nome):
            raise TestFail("O objeto da classe `%s` não tem o atributo/método `%s`." % (type(obj).__name__, nome),
                           dica="Crie `self.%s` no `__init__` (ou o método `%s`) exatamente com esse nome." % (nome, nome))
        return getattr(obj, nome)

    def expect(self, got, want, o_que="", dica=None):
        if _same(got, want):
            self.last_out = ""
            return
        pre = ("`%s`: " % o_que) if o_que else ""
        extra = ""
        if got is None and want is not None:
            printed = self.last_out.strip()
            if printed and _norm(printed) == _norm(want):
                raise TestFail(pre + "o texto certo foi **impresso**, mas não **retornado**.", want, got,
                               dica or "Troque `print(texto)` por `return texto`. `print` só mostra na tela; `return` devolve o valor para quem chamou.")
            if printed:
                raise TestFail(pre + "devolveu `None` — você usou `print`, mas o enunciado pede `return`.", want, got,
                               dica or "Use `return` com o texto pedido (e remova o `print`).")
            raise TestFail(pre + "devolveu `None` (nada). Provavelmente faltou um `return`.", want, got,
                           dica or "Todo caminho do método precisa terminar em `return valor`.")
        if isinstance(got, str) and isinstance(want, str):
            if got.casefold() == want.casefold():
                extra = "Diferença só de maiúsculas/minúsculas."
            elif got.strip() == want.strip():
                extra = "Sobrou/faltou espaço ou quebra de linha nas pontas."
            elif _norm(got) == _norm(want):
                extra = "Quase! Só pontuação/espaços diferem: %s." % _diff_str(got, want)
            else:
                parecido = difflib.SequenceMatcher(None, got, want).ratio() >= 0.75
                extra = ("Diferença: %s." % _diff_str(got, want)) if (parecido and len(want) < 140) else ""
            raise TestFail(pre + "o texto não é o esperado. " + extra, want, got,
                           dica or "O texto precisa ser **idêntico** ao do enunciado (incluindo `!`, `.` e espaços).")
        if type(got) is not type(want) and not (isinstance(got, (int, float)) and isinstance(want, (int, float)) and not isinstance(got, bool) and not isinstance(want, bool)):
            raise TestFail(pre + "tipo diferente: veio %s, esperado %s." % (type(got).__name__, type(want).__name__), want, got, dica)
        if isinstance(got, (int, float)) and isinstance(want, (int, float)):
            d = got - want
            raise TestFail(pre + "valor numérico diferente (%+g de diferença)." % d, want, got, dica)
        if isinstance(got, (list, tuple)) and isinstance(want, (list, tuple)):
            for i, (x, y) in enumerate(zip(got, want)):
                if not _same(x, y):
                    raise TestFail(pre + "a lista difere no item %d." % i, want, got, dica)
            raise TestFail(pre + "a lista tem %d item(ns); esperado %d." % (len(got), len(want)), want, got, dica)
        raise TestFail(pre + "valor diferente do esperado.", want, got, dica)

    def expect_true(self, cond, msg, dica=None):
        if not cond:
            raise TestFail(msg, dica=dica)

    def expect_false(self, cond, msg, dica=None):
        if cond:
            raise TestFail(msg, dica=dica)

    def raises(self, exc, fn, *a, **kw):
        try:
            fn(*a, **kw)
        except exc:
            return True
        except BaseException as e:   # tipo diferente
            raise TestFail("Esperava `%s`, mas veio `%s`." % (exc.__name__, type(e).__name__))
        raise TestFail("Esperava um erro `%s`, mas nada aconteceu." % exc.__name__)

    def env(self):
        return {
            "ns": self.ns, "cls": self.cls, "new": self.new, "call": self.call, "attr": self.attr,
            "expect": self.expect, "expect_true": self.expect_true, "expect_false": self.expect_false,
            "raises": self.raises, "TestFail": TestFail,
        }


def run_tests(tests, sess, info):
    ctx = Ctx(sess.ns, sess)
    results = []
    for t in tests:
        _progress("teste:" + t.get("nome", ""))
        env = ctx.env()
        ctx.last_out = ""
        r = {"id": t.get("id"), "nome": t.get("nome", ""), "ok": False, "skipped": False,
             "msg": "", "expected": None, "got": None, "dica": t.get("dica"), "diag": None}
        try:
            code = compile(t["py"], "<teste:%s>" % t.get("id", "?"), "exec")
            sess.guard(lambda: exec(code, env))
            r["ok"] = True
        except TestFail as tf:
            r["msg"] = tf.msg
            if tf.expected is not _NADA:
                r["expected"] = _short(tf.expected, 80)
            if tf.got is not _NADA:
                r["got"] = _short(tf.got, 80)
            if tf.dica:
                r["dica"] = tf.dica
        except BaseException as e:
            frames = _frames(e, sess)
            if frames or isinstance(e, ExecucaoPresa):
                d = explain_exception(e, sess, info)
                r["diag"] = d
                r["msg"] = d["title"]
            else:
                r["msg"] = "Erro interno no teste (avise a monitoria): %s: %s" % (type(e).__name__, e)
                r["interno"] = True
        results.append(r)
    return results


# ----------------------------------------------------------------------------
# 9) PONTO DE ENTRADA
# ----------------------------------------------------------------------------
_PRIO = {"syntax": 0, "requisito": 1, "travou": 2, "runtime": 2, "teste": 3, "lint-error": 4, "warn": 5, "tip": 6}


_RAIZ = ("comparacao-solta", "faltou-self-attr", "faltou-self-call", "self-ausente", "init-typo", "super-self", "return-init")


def _prio(d):
    if d["level"] == "error" and d["kind"] in _RAIZ:
        return 1.5
    if d["kind"] in ("syntax", "requisito", "travou", "runtime", "teste"):
        return _PRIO[d["kind"]]
    return _PRIO["lint-error"] if d["level"] == "error" else (_PRIO["warn"] if d["level"] == "warn" else _PRIO["tip"])


def handle(payload):
    t0 = time.monotonic()
    mode = payload.get("mode", "run")
    files = payload["files"]
    entry = payload.get("entry") or next(iter(files))
    spec = payload.get("spec") or {}
    res = {"mode": mode, "ok": False, "stdout": "", "diagnostics": [], "tests": [], "objects": [],
           "passed": False, "stage": "inicio"}

    trees = {}
    syn = []
    for name, src in files.items():
        try:
            trees[name] = ast.parse(src, filename=name)
        except SyntaxError as e:
            syn.append(friendly_syntax(e, name, src))
        except (ValueError, RecursionError) as e:
            syn.append(diag("error", "syntax", "Não consegui ler o código", str(e), "Remova caracteres estranhos.", file=name))
    if syn:
        res["diagnostics"] = syn
        res["stage"] = "sintaxe"
        res["elapsed_ms"] = int((time.monotonic() - t0) * 1000)
        return res

    info = Info(trees)
    diags = lint(trees, files, info)
    req = []
    if mode == "check":
        req = check_requires(info, spec.get("requires") or {}, files)
    res["classes"] = {n: {"bases": c.bases, "methods": list(c.methods)} for n, c in info.classes.items()}
    _progress("executando")
    sess = Sessao(files, entry, "__main__" if mode == "run" else "aluno",
                  extra=payload.get("extra") if mode == "run" else None, stdin=payload.get("stdin"))
    try:
        sess.exec_main()
        runtime = None
        if sess.err is not None:
            runtime = explain_exception(sess.err, sess, info)
            if mode == "check" and runtime["kind"] == "runtime" and False:
                pass
        res["stdout"] = sess.stdout()
        res["objects"] = inspect_objects(sess.ns)
        if runtime and runtime["kind"] == "travou":
            for d in diags:
                if d["kind"] == "laco-infinito":
                    runtime["body"] += "\n\n**Suspeito:** linha %s — %s %s" % (d.get("line"), d["title"] + ".", d["body"])
                    break

        tests = []
        if mode == "check":
            if runtime is None:
                tests = run_tests(spec.get("tests") or [], sess, info)
                res["stdout"] = sess.stdout()
            else:
                for t in spec.get("tests") or []:
                    tests.append({"id": t.get("id"), "nome": t.get("nome", ""), "ok": False, "skipped": True,
                                  "msg": "", "expected": None, "got": None, "dica": None, "diag": None})
        res["tests"] = tests

        out = []
        out.extend(req)
        if runtime:
            out.append(runtime)
        for t in tests:
            if not t["ok"] and not t["skipped"]:
                d = t["diag"] or diag("error", "teste", t["msg"], "", t.get("dica") or "")
                if t["diag"] is None:
                    d["body"] = ""
                    d["expected"] = t["expected"]
                    d["got"] = t["got"]
                d["teste"] = t["nome"]
                out.append(d)
        out.extend(diags)
        # dedupe pelo par (kind, line, title)
        seen, uniq = set(), []
        for d in out:
            k = (d["kind"], d.get("file"), d.get("line"), d["title"])
            if k in seen:
                continue
            seen.add(k)
            uniq.append(d)
        uniq.sort(key=_prio)
        res["diagnostics"] = uniq
        res["stage"] = "fim"
        if mode == "run":
            res["ok"] = runtime is None
        else:
            res["passed"] = (runtime is None and not req and tests and all(t["ok"] for t in tests)) \
                if spec.get("tests") else (runtime is None and not req)
            res["ok"] = res["passed"]
    finally:
        sess.close()
    res["elapsed_ms"] = int((time.monotonic() - t0) * 1000)
    return res


def main(payload_json):
    try:
        out = handle(json.loads(payload_json))
    except BaseException as e:   # nunca deixe a página sem resposta
        out = {"mode": "erro", "ok": False, "stdout": "", "tests": [], "objects": [], "passed": False,
               "diagnostics": [diag("error", "interno", "Erro interno do tutor",
                                    "%s: %s" % (type(e).__name__, e),
                                    "Avise a monitoria e copie esta mensagem.",
                                    tecnico=traceback.format_exc())]}
    return json.dumps(out, ensure_ascii=False, default=str)
