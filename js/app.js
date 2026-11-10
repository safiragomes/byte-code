/* ============================================================================
   Byte Code — aplicação (rotas, armazenamento, blocos de lição, desafios).
   ============================================================================ */
(function () {
  "use strict";
  var h = U.h, mdEl = U.mdEl, esc = U.esc;
  var CFG = window.BYTE_CONFIG, LICOES = window.BYTE_LICOES, DES = window.BYTE_DESAFIOS;
  var HIST_MAX = 300;
  var licBy = {}, desBy = {};
  LICOES.forEach(function (l) { licBy[l.id] = l; });
  DES.forEach(function (d) { desBy[d.id] = d; });

  /* ---------------------------------------------------------------- Store */
  var Store = (function () {
    var pre = CFG.storagePrefix + ":", mem = {}, falhou = false;
    return {
      get: function (k, def) {
        try { var v = localStorage.getItem(pre + k); if (v !== null) return JSON.parse(v); } catch (e) { falhou = true; }
        return k in mem ? JSON.parse(JSON.stringify(mem[k])) : def;
      },
      set: function (k, v) {
        mem[k] = v;
        try { localStorage.setItem(pre + k, JSON.stringify(v)); return true; } catch (e) { falhou = true; return false; }
      },
      falhou: function () { return falhou; },
      limpar: function () { mem = {}; try { ["progress", "drafts", "history"].forEach(function (k) { localStorage.removeItem(pre + k); }); } catch (e) {} },
      todos: function () { return { progress: P, drafts: D, history: HIST }; }
    };
  })();
  var P = Store.get("progress", null) || { nome: "", licoes: {}, desafios: {}, projeto: {}, ultima: "", widgets: {} };
  var D = Store.get("drafts", {});
  var HIST = Store.get("history", []);
  function saveP() { Store.set("progress", P); }
  var draftTimer = null;
  function saveD() { clearTimeout(draftTimer); draftTimer = setTimeout(function () { Store.set("drafts", D); }, 350); }
  function saveH() {
    if (HIST.length > HIST_MAX) HIST.length = HIST_MAX;
    if (!Store.set("history", HIST)) {
      HIST.length = Math.floor(HIST.length / 2);
      Store.set("history", HIST);
    }
  }
  function logEv(ev) { ev.t = Date.now(); HIST.unshift(ev); saveH(); }
  function licSt(id) { return P.licoes[id] || (P.licoes[id] = { quiz: {}, done: false }); }
  function desSt(id) { return P.desafios[id] || (P.desafios[id] = { tentativas: 0, falhas: 0, dicas: 0, passou: false, solucao: false, repete: 0, ultimaFalha: "", xp: 0 }); }

  /* ---------------------------------------------------------- XP e ranking */
  var RANKS = [[0, "Filhote"], [120, "Farejador"], [300, "Cão de guarda de código"], [550, "Guardião da mochila"], [800, "Lenda do CIn"]];
  function calcXP() {
    var xp = 0;
    LICOES.forEach(function (l) {
      var s = P.licoes[l.id]; if (!s) return;
      if (s.done) xp += 25;
      Object.keys(s.quiz || {}).forEach(function (q) { if (s.quiz[q].ok) xp += 5; });
    });
    DES.forEach(function (d) { var s = P.desafios[d.id]; if (s && s.passou) xp += s.xp || d.xp; });
    return xp;
  }
  function rank(xp) { var r = RANKS[0][1]; RANKS.forEach(function (x) { if (xp >= x[0]) r = x[1]; }); return r; }
  function pctGeral() {
    var n = 0;
    LICOES.forEach(function (l) { if (P.licoes[l.id] && P.licoes[l.id].done) n++; });
    DES.forEach(function (d) { if (P.desafios[d.id] && P.desafios[d.id].passou) n++; });
    return Math.round(n / (LICOES.length + DES.length) * 100);
  }

  /* ----------------------------------------------------- toasts e modais */
  function toast(txt, cls) {
    var t = h("div", { class: "toast " + (cls || ""), role: "status" }, txt);
    document.getElementById("toasts").appendChild(t);
    setTimeout(function () { t.remove(); }, 4200);
  }
  function modal(titulo, corpo) {
    var root = document.getElementById("modal-root");
    var fechar = function () { root.innerHTML = ""; document.removeEventListener("keydown", esc_); };
    var esc_ = function (e) { if (e.key === "Escape") fechar(); };
    document.addEventListener("keydown", esc_);
    var bg = h("div", { class: "modal-bg", onclick: function (e) { if (e.target === bg) fechar(); } },
      h("div", { class: "modal", role: "dialog", "aria-modal": "true", "aria-label": titulo },
        h("div", { class: "row", style: "justify-content:space-between;margin-bottom:8px" }, h("h3", { style: "margin:0" }, titulo), h("button", { class: "btn btn-sm", onclick: fechar }, "Fechar")),
        corpo));
    root.innerHTML = ""; root.appendChild(bg);
    return fechar;
  }

  /* ------------------------------------------------------------- Byte */
  function av(mood) { return "assets/byte-" + (mood === "feliz" ? "feliz" : mood === "curioso" ? "curioso" : "neutro") + ".jpg"; }
  function byteSay(md, mood, extra) {
    var cls = mood === "ok" ? "mood-ok" : mood === "erro" ? "mood-erro" : "";
    var img = mood === "ok" ? "feliz" : mood === "erro" ? "curioso" : mood;
    return h("div", { class: "byte " + cls }, h("img", { class: "av", src: av(img), alt: "Byte", width: 54, height: 54 }),
      h("div", { class: "bubble" }, h("div", { class: "who" }, "Byte"), md ? mdEl(md) : null, extra || null));
  }

  /* ---------------------------------------------------------- Editor */
  var EDITORS = [];
  function makeEditor(parent, o) {
    o = o || {};
    var onRun = o.onRun, marks = [], api;
    if (window.CodeMirror) {
      var cm = CodeMirror(parent, {
        value: o.value || "", mode: "python", lineNumbers: true, indentUnit: 4, tabSize: 4, indentWithTabs: false,
        readOnly: !!o.readOnly, viewportMargin: Infinity, lineWrapping: false, autoCloseBrackets: !o.readOnly,
        gutters: ["CodeMirror-linenumbers", "erro-gutter"],
        extraKeys: {
          Tab: function (c) { if (c.somethingSelected()) c.indentSelection("add"); else c.replaceSelection("    ", "end"); },
          "Shift-Tab": function (c) { c.indentSelection("subtract"); },
          "Ctrl-Enter": function () { if (onRun) onRun(); }, "Cmd-Enter": function () { if (onRun) onRun(); }
        }
      });
      if (o.onChange) cm.on("change", function () { o.onChange(cm.getValue()); });
      api = {
        get: function () { return cm.getValue(); },
        set: function (v) { cm.setValue(v); },
        refresh: function () { cm.refresh(); },
        clear: function () { marks.forEach(function (ln) { cm.removeLineClass(ln, "background"); cm.setGutterMarker(ln, "erro-gutter", null); }); marks = []; },
        mark: function (items) {
          api.clear();
          items.forEach(function (it) {
            var ln = it.line - 1; if (ln < 0 || ln >= cm.lineCount()) return;
            cm.addLineClass(ln, "background", it.nivel === "error" ? "linha-erro" : "linha-warn");
            cm.setGutterMarker(ln, "erro-gutter", h("span", { class: it.nivel === "error" ? "erro-marca" : "warn-marca" }, "●"));
            marks.push(ln);
          });
        },
        focus: function () { cm.focus(); }
      };
    } else {
      var ta = h("textarea", { class: "fallback-ed", spellcheck: "false", readonly: !!o.readOnly });
      ta.value = o.value || "";
      ta.addEventListener("input", function () { if (o.onChange) o.onChange(ta.value); });
      ta.addEventListener("keydown", function (e) {
        if (e.key === "Tab") { e.preventDefault(); var s = ta.selectionStart; ta.value = ta.value.slice(0, s) + "    " + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = s + 4; if (o.onChange) o.onChange(ta.value); }
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && onRun) onRun();
      });
      parent.appendChild(ta);
      api = { get: function () { return ta.value; }, set: function (v) { ta.value = v; }, refresh: function () {}, clear: function () {}, mark: function () {}, focus: function () { ta.focus(); } };
    }
    EDITORS.push(api);
    return api;
  }
  function codeView(codigo) { var box = h("div", { class: "cb" }); makeEditor(box, { value: codigo, readOnly: true }); return box; }
  function refreshEditors() { setTimeout(function () { EDITORS.forEach(function (e) { e.refresh(); }); }, 40); }

  /* --------------------------------------------- feedback do Byte (render) */
  function snip(lines) {
    return h("div", { class: "snip" }, lines.map(function (l) { return h("div", { class: l.hl ? "hl" : "" }, h("span", { class: "n" }, l.n), h("span", null, l.t || " ")); }));
  }
  function renderDiag(d) {
    var el = h("div", { class: "diag l-" + d.level });
    el.appendChild(h("h4", { html: U.inline(d.title) }));
    if (d.teste) el.appendChild(h("div", { class: "lbl" }, "Teste: " + d.teste));
    if (d.body) el.appendChild(h("div", { class: "body", html: U.md(d.body) }));
    if (d.expected != null || d.got != null) {
      el.appendChild(h("div", { class: "exp-got" }, h("div", { class: "e" }, h("span", { class: "lbl" }, "Esperado"), String(d.expected)), h("div", { class: "g" }, h("span", { class: "lbl" }, "Veio"), String(d.got))));
    }
    if (d.onde) el.appendChild(h("div", { class: "onde", html: U.inline(d.onde) }));
    if (d.snippet) el.appendChild(snip(d.snippet));
    if (d.hint) el.appendChild(h("div", { class: "hint" }, h("b", null, "Dica: "), h("span", { html: U.inline(d.hint) })));
    if (d.tecnico || (d.trace && d.trace.length)) {
      var det = h("details", null, h("summary", null, "Detalhe técnico (como o Python fala)"));
      if (d.tecnico) det.appendChild(h("pre", { style: "margin:6px 0;white-space:pre-wrap" }, d.tecnico));
      if (d.trace && d.trace.length) det.appendChild(h("div", null, d.trace.map(function (f) { return h("div", null, (f.file === "<exemplo>" ? "exemplo" : f.file) + ":" + f.line + "  em " + f.func + "  →  " + f.code); })));
      el.appendChild(det);
    }
    return el;
  }
  function destaque(ds) {
    return ds.filter(function (d) { return d.level === "error"; })[0] || ds.filter(function (d) { return d.level === "warn"; })[0] || ds[0];
  }
  // lista de diagnósticos em volta de um "balão" do Byte
  function renderFeedback(ds, opts) {
    opts = opts || {};
    var wrap = h("div");
    if (!ds || !ds.length) return wrap;
    var main = destaque(ds);
    var outros = ds.filter(function (d) { return d !== main; }).slice(0, 8);
    var intro = main.level === "error" ? "Achei uma coisa para olharmos juntos:" : main.level === "warn" ? "Rodou, mas repare nisto:" : "Uma dica de estilo:";
    var bubble = byteSay(null, main.level === "error" ? "erro" : "curioso");
    var bb = bubble.querySelector(".bubble");
    bb.appendChild(h("p", { style: "margin:0 0 6px" }, intro));
    bb.appendChild(renderDiag(main));
    if (outros.length) {
      var det = h("details", { style: "margin-top:8px" }, h("summary", { style: "cursor:pointer;color:var(--muted)" }, "Mais " + outros.length + " observaç" + (outros.length > 1 ? "ões" : "ão")));
      outros.forEach(function (d) { det.appendChild(renderDiag(d)); });
      bb.appendChild(det);
    }
    wrap.appendChild(bubble);
    return wrap;
  }
  function marcasDe(ds, arquivo) {
    return ds.filter(function (d) { return d.line && d.level !== "tip" && (!d.file || d.file === arquivo); })
      .map(function (d) { return { line: d.line, nivel: d.level === "error" ? "error" : "warn" }; });
  }
  function falhaRunner(e) {
    if (e && e.timeout) {
      return [{ level: "error", kind: "travou", title: "O código demorou demais e foi interrompido", body: "Provavelmente existe um laço infinito (um `while` cuja condição nunca muda) ou uma recursão sem caso base.", hint: "Confira a condição do `while` e se algo dentro do laço a altera." }];
    }
    return [{ level: "error", kind: "interno", title: "Não consegui rodar o Python agora", body: String((e && e.message) || e) + "\n\nA primeira vez precisa baixar o Python (cerca de 10 MB) e depende de internet. Você pode continuar lendo e editando; tente executar de novo em alguns segundos.", hint: "Se estiver abrindo o arquivo direto do disco, use uma conexão com a internet." }];
  }

  /* ------------------------------------------------ Memória do Byte (objetos) */
  function objCard(o, nome) {
    var card = h("div", { class: "obj" }, h("div", { class: "obj-h" }, h("b", null, nome), ":", h("span", null, o.cls), o.bases && o.bases.length ? h("i", null, "← " + o.bases.join(" ← ")) : null));
    if (!o.attrs.length) card.appendChild(h("div", { class: "at" }, h("span", { style: "color:var(--muted)" }, "(sem atributos)"), h("span")));
    o.attrs.forEach(function (a) { card.appendChild(h("div", { class: "at" + (a.priv ? " priv" : "") }, h("span", null, (a.priv ? "🔒 " : "") + a.k), h("span", null, a.v))); });
    return card;
  }
  function memPanel(objs) {
    var root = h("div", { class: "mem" }, h("span", { class: "lbl" }, "Memória do Byte · o que existe depois de rodar"));
    var vars = objs.filter(function (o) { return o.simple !== undefined; });
    if (vars.length) root.appendChild(h("div", { class: "vars" }, vars.map(function (v) { return h("span", { class: "var" }, h("b", null, v.name + " = "), h("span", null, v.simple)); })));
    var grade = h("div", { class: "mem-grid" });
    objs.filter(function (o) { return o.simple === undefined; }).forEach(function (o) {
      if (o.items) {
        var l = h("div", { class: "lista-obj" }, h("span", { class: "lbl" }, o.name + " = lista com " + o.n + " objetos"), h("div", { class: "mem-grid" }, o.items.map(function (x, i) { return objCard(x, o.name + "[" + i + "]"); })));
        grade.appendChild(l);
      } else grade.appendChild(objCard(o, o.name));
    });
    root.appendChild(grade);
    return (vars.length || grade.children.length) ? root : null;
  }

  /* -------------------------------------------------- status do Python */
  function pyStatus() {
    var el = h("span", { class: "py-status" }, h("i"), h("span", null, "Python"));
    Runner.aoMudar(function (e) {
      el.className = "py-status " + e.fase;
      el.lastChild.textContent = e.fase === "pronto" ? "Python pronto" : e.fase === "carregando" ? "Carregando Python…" : e.fase === "erro" ? "Python indisponível" : "Python em espera";
      el.title = e.msg || "";
      var ban = document.getElementById("py-banner");
      if (e.fase === "erro" && !ban && view) {
        view.insertBefore(h("div", { id: "py-banner", class: "callout atencao" }, mdEl("**Não consegui carregar o Python neste ambiente.** Você ainda pode ler as lições e os desafios, mas executar e verificar código precisa do Python (Pyodide). Se estiver vendo esta página dentro de um visualizador com restrições, abra a versão publicada no GitHub Pages. Detalhe: " + (e.msg || "sem detalhes"))), view.firstChild);
      } else if (e.fase !== "erro" && ban) ban.remove();
    });
    return el;
  }

  /* ---------------------------------------------------- bloco de código */
  function codeBlock(b) {
    var multi = b.t === "multi";
    var files = multi ? b.arquivos.map(function (a) { return { nome: a.nome, base: a.codigo }; }) : [{ nome: "main.py", base: b.codigo }];
    var saved = (D[b.id] && D[b.id].f) || {};
    var eds = {}, wraps = {}, atual = files[files.length - 1].nome;
    if (multi) atual = b.entry;
    var root = h("div", { class: "cb" });
    var btnRun = h("button", { class: "btn btn-run btn-sm", title: "Ctrl+Enter" }, "Executar");
    var btnReset = h("button", { class: "btn btn-sm btn-ghost", title: "Voltar ao código original" }, "↺ Original");
    root.appendChild(h("div", { class: "cb-head" }, h("span", { class: "cb-title" }, b.titulo || "Código"), btnReset, btnRun));
    var tabs = null;
    if (multi) { tabs = h("div", { class: "cb-tabs", role: "tablist" }); root.appendChild(tabs); }
    var edBox = h("div", { class: "cb-ed" });
    root.appendChild(edBox);
    function salva() {
      var f = {}, mudou = false;
      files.forEach(function (x) { var v = eds[x.nome].get(); f[x.nome] = v; if (v !== x.base) mudou = true; });
      if (mudou) D[b.id] = { f: f, t: Date.now() }; else delete D[b.id];
      saveD();
    }
    files.forEach(function (x) {
      var w = h("div", { style: multi && x.nome !== atual ? "display:none" : "" });
      edBox.appendChild(w); wraps[x.nome] = w;
      eds[x.nome] = makeEditor(w, { value: typeof saved[x.nome] === "string" ? saved[x.nome] : x.base, onChange: salva, onRun: roda });
    });
    if (multi) {
      files.forEach(function (x) {
        var tb = h("button", { class: "cb-tab" + (x.nome === atual ? " on" : ""), role: "tab", onclick: function () {
          atual = x.nome; files.forEach(function (y) { wraps[y.nome].style.display = y.nome === atual ? "" : "none"; });
          Array.prototype.forEach.call(tabs.children, function (c) { c.classList.toggle("on", c.textContent === atual); });
          eds[atual].refresh();
        } }, x.nome);
        tabs.appendChild(tb);
      });
    }
    var outEl = h("div"), diagEl = h("div"), memEl = h("div");
    root.appendChild(outEl); root.appendChild(diagEl); root.appendChild(memEl);
    btnReset.addEventListener("click", function () { files.forEach(function (x) { eds[x.nome].set(x.base); eds[x.nome].clear(); }); delete D[b.id]; saveD(); outEl.innerHTML = ""; diagEl.innerHTML = ""; memEl.innerHTML = ""; });
    var rodando = false;
    function roda() {
      if (rodando) return; rodando = true; btnRun.disabled = true; btnRun.textContent = "Rodando…";
      files.forEach(function (x) { eds[x.nome].clear(); });
      var obj = {}; files.forEach(function (x) { obj[x.nome] = eds[x.nome].get(); });
      var entry = multi ? b.entry : files[0].nome;
      Runner.pedir({ mode: "run", files: obj, entry: entry, extra: b.extra }).then(function (res) { mostra(res); }, function (e) { mostra({ diagnostics: falhaRunner(e), stdout: "", objects: [], ok: false }); })
        .then(function () { rodando = false; btnRun.disabled = false; btnRun.textContent = "Executar"; });
    }
    function mostra(res) {
      outEl.innerHTML = ""; diagEl.innerHTML = ""; memEl.innerHTML = "";
      var ds = (res.diagnostics || []).filter(function (d) { return d.level !== "tip" || !res.ok; });
      var texto = res.stdout || "";
      if (texto || res.ok) outEl.appendChild(h("pre", { class: "cb-out" }, h("span", { class: "lbl" }, "Saída"), texto || "(o programa não imprimiu nada)"));
      if (ds.length) diagEl.appendChild(h("div", { class: "cb-diag", style: "padding-top:10px" }, renderFeedback(ds)));
      files.forEach(function (x) { eds[x.nome].mark(marcasDe(ds, x.nome)); });
      if (res.ok && b.mem !== false && res.objects) { var m = memPanel(res.objects); if (m) memEl.appendChild(m); }
    }
    btnRun.addEventListener("click", roda);
    return root;
  }

  /* ------------------------------------------------------------- quiz */
  function quizBlock(b, lic, onChange) {
    var st = licSt(lic.id).quiz;
    var root = h("div", { class: "quiz" });
    root.appendChild(h("div", { class: "q", html: U.inline(b.pergunta) }));
    var fb = h("div", { class: "quiz-fb" });
    var opts = h("div", { class: "quiz-opts" });
    var btns = b.opcoes.map(function (o, i) {
      var bt = h("button", { class: "quiz-opt", html: U.inline(o), onclick: function () {
        var s = st[b.id] || (st[b.id] = { ok: false, tries: 0 });
        if (s.ok) return;
        s.tries++;
        if (i === b.certa) {
          s.ok = true; bt.classList.add("ok"); fb.innerHTML = "<strong>Isso!</strong> " + U.inline(b.explicacao);
          btns.forEach(function (x) { x.disabled = true; });
          saveP(); logEv({ tipo: "quiz", ref: lic.id + "/" + b.id, ok: true, resumo: "Acertou" + (s.tries > 1 ? " depois de " + s.tries + " tentativas" : " de primeira") });
          if (onChange) onChange();
        } else {
          bt.classList.add("bad"); fb.textContent = "Quase. Releia a explicação da lição e tente outra opção.";
          saveP();
        }
      } });
      return bt;
    });
    btns.forEach(function (x) { opts.appendChild(x); });
    root.appendChild(opts); root.appendChild(fb);
    if (st[b.id] && st[b.id].ok) { btns[b.certa].classList.add("ok"); btns.forEach(function (x) { x.disabled = true; }); fb.innerHTML = "<strong>Respondida.</strong> " + U.inline(b.explicacao); }
    return root;
  }

  function linksBlock(b) {
    return h("div", null, b.titulo ? h("div", { class: "lbl", style: "margin-top:16px" }, b.titulo) : null,
      h("div", { class: "links" }, b.itens.map(function (i) {
        return h("a", { class: "link", href: i.url, target: "_blank", rel: "noopener noreferrer" }, h("span", { class: "ic" }, "↗"), h("span", null, i.titulo, i.desc ? h("small", null, i.desc) : null));
      })));
  }

  /* ------------------------------------------------------------ rotas */
  var view = null, current = "";
  function go(name) {
    if (location.hash.replace("#", "") !== name) { try { location.hash = name; } catch (e) {} }
    route(name);
  }
  window.addEventListener("hashchange", function () { route(location.hash.replace("#", "")); });

  function route(name) {
    name = name || "inicio";
    if (name === current && view && view.children.length) return;
    current = name;
    EDITORS.length = 0;
    view.innerHTML = ""; view.className = "view";
    var m;
    if (name === "inicio") renderHome();
    else if ((m = /^licao-(.+)$/.exec(name)) && licBy[m[1]]) renderLicao(licBy[m[1]]);
    else if ((m = /^desafio-(.+)$/.exec(name)) && desBy[m[1]]) renderDesafio(desBy[m[1]]);
    else if (name === "projeto") renderProjeto();
    else if (name === "recursos") renderRecursos();
    else if (name === "historico") renderHistorico();
    else { current = "inicio"; renderHome(); }
    if (/^(licao|desafio)-|^projeto$/.test(current)) { P.ultima = current; saveP(); }
    renderSide(); renderTop();
    document.getElementById("main").scrollTop = 0;
    document.getElementById("side").classList.remove("open");
    refreshEditors();
  }

  /* --------------------------------------------------- barra lateral/topo */
  function dot(done, parcial) { return h("span", { class: "dot " + (done ? "on" : parcial ? "half" : "") }); }
  function navA(nome, titulo, sub, n, d, p) {
    return h("a", { class: "nav-a" + (current === nome ? " on" : ""), href: "#" + nome, onclick: function (e) { e.preventDefault(); go(nome); } },
      n != null ? h("span", { class: "n" }, n) : null, h("span", null, titulo, sub ? h("small", null, sub) : null), d != null ? dot(d, p) : null);
  }
  function renderSide() {
    var s = document.getElementById("side"); s.innerHTML = "";
    s.appendChild(navA("inicio", "Início", "A mochila e a história", "•"));
    s.appendChild(h("div", { class: "nav-sec" }, "Fase 1 · Aprendendo"));
    LICOES.forEach(function (l) { var st = P.licoes[l.id]; s.appendChild(navA("licao-" + l.id, l.titulo, l.local, l.num, st && st.done, st && Object.keys(st.quiz || {}).length > 0)); });
    s.appendChild(h("div", { class: "nav-sec" }, "Fase 2 · Praticando"));
    DES.forEach(function (d) { var st = P.desafios[d.id]; s.appendChild(navA("desafio-" + d.id, d.titulo, d.conceito, d.num, st && st.passou, st && st.tentativas > 0)); });
    s.appendChild(h("div", { class: "nav-sec" }, "Fase 3 · Fase Secreta"));
    s.appendChild(navA("projeto", "Projeto final", "Do template ao seu jogo", "◆"));
    s.appendChild(h("div", { class: "nav-sec" }, "Mais"));
    s.appendChild(navA("recursos", "Recursos", "Vídeos, Dikastis, ferramentas", "+"));
    s.appendChild(navA("historico", "Meu histórico", "Tentativas e conquistas", "≡"));
  }
  function renderTop() {
    var t = document.getElementById("top"); t.innerHTML = "";
    var xp = calcXP(), pc = pctGeral();
    t.appendChild(h("button", { class: "btn btn-sm menu-btn", "aria-label": "Mostrar ou esconder a trilha", title: "Mostrar ou esconder a trilha", onclick: function () { var mobile = window.matchMedia("(max-width: 860px)").matches; if (mobile) document.getElementById("side").classList.toggle("open"); else { var sh = document.querySelector(".shell"); sh.classList.toggle("side-off"); try { localStorage.setItem(CFG.storagePrefix + ":side-off", sh.classList.contains("side-off") ? "1" : ""); } catch (e) {} setTimeout(refreshEditors, 250); } } }, "☰"));
    t.appendChild(h("a", { class: "brand", href: "#inicio", onclick: function (e) { e.preventDefault(); go("inicio"); } }, h("img", { src: av("neutro"), alt: "" }), h("span", null, h("b", null, CFG.titulo), h("small", null, CFG.capitulo + " · " + CFG.periodo))));
    t.appendChild(h("span", { class: "top-spacer" }));
    t.appendChild(pyStatus());
    t.appendChild(h("div", { class: "stat prog" }, h("span", null, "Mochila " + pc + "%"), h("div", { class: "bar" }, h("i", { style: "width:" + pc + "%" }))));
    t.appendChild(h("div", { class: "stat xp" }, h("b", null, xp + " petiscos"), h("small", null, rank(xp))));
    t.appendChild(h("button", { class: "btn btn-sm", onclick: dadosModal, title: "Exportar, importar ou zerar seu progresso" }, "Dados"));
  }

  /* -------------------------------------------------------------- Home */
  function mochila() {
    var g = h("div", { class: "mochila" });
    LICOES.forEach(function (l) {
      var on = P.licoes[l.id] && P.licoes[l.id].done;
      var emoji = h("span", { class: "em" }, l.adesivo.emoji);
      if (CFG.imagens && CFG.imagens.adesivosPasta) {
        var img = h("img", { src: CFG.imagens.adesivosPasta + "/" + l.num + ".png", alt: "", onerror: function () { img.replaceWith(l.adesivo.emoji); } });
        emoji = h("span", { class: "em" }, img);
      }
      g.appendChild(h("a", { class: "slot" + (on ? " on" : ""), href: "#licao-" + l.id, onclick: function (e) { e.preventDefault(); go("licao-" + l.id); }, title: on ? "Adesivo colado" : "Conclua a lição " + l.num + " para colar" }, emoji, h("b", null, l.adesivo.nome), h("small", null, "Lição " + l.num)));
    });
    return g;
  }
  function renderHome() {
    var H = BYTE_HISTORIA, xp = calcXP();
    var proxima = P.ultima && P.ultima !== "inicio" ? P.ultima : "licao-" + LICOES[0].id;
    var temProgresso = !!P.ultima;
    var temBanner = !!(CFG.imagens && CFG.imagens.banner);
    if (temBanner) view.appendChild(h("div", { class: "hero-banner", style: "background-image:url('" + CFG.imagens.banner + "')", role: "img", "aria-label": "Mundo Pixel" },
      h("div", { class: "hb-text" }, h("div", { class: "kicker" }, CFG.capitulo + " · " + CFG.disciplina.split(" · ")[0]), h("h1", null, h("em", null, CFG.subtitulo)))));
    var nomeForm = h("form", { class: "nome-form", onsubmit: function (e) { e.preventDefault(); P.nome = inp.value.trim(); saveP(); route_force(); } });
    var inp = h("input", { class: "inp", id: "nome", placeholder: "Seu nome", value: P.nome || "", maxlength: 30, "aria-label": "Como o Byte deve te chamar?" });
    nomeForm.appendChild(inp); nomeForm.appendChild(h("button", { class: "btn btn-sm", type: "submit" }, P.nome ? "Trocar nome" : "Salvar nome"));
    view.appendChild(h("section", { class: "hero" },
      h("div", null,
        temBanner ? null : h("div", { class: "kicker" }, CFG.capitulo + " · " + CFG.disciplina),
        temBanner ? null : h("h1", null, h("em", null, CFG.subtitulo)),
        h("p", { class: "lead" }, P.nome ? "Oi, " + P.nome + "! " + H.chamada : H.chamada),
        h("div", { class: "story" }, H.paragrafos.map(function (p) { return mdEl(p); })),
        h("div", { class: "row", style: "margin-top:14px" },
          h("button", { class: "btn btn-primary", onclick: function () { go(proxima); } }, temProgresso ? "Continuar de onde parou" : "Começar a aventura"),
          h("button", { class: "btn", onclick: function () { go("recursos"); } }, "Recursos")),
        nomeForm),
      h("div", { class: "hero-img" }, h("img", { src: "assets/byte-volta.jpg", alt: "Byte correndo de volta pela porta do CIn" }))));
    view.appendChild(h("div", { class: "sec-title" }, h("h2", null, "A mochila do Byte"), h("span", null, "Cada lição concluída cola um adesivo. " + xp + " petiscos · " + rank(xp))));
    view.appendChild(mochila());
    view.appendChild(h("div", { class: "sec-title" }, h("h2", null, "As três fases")));
    var licOk = LICOES.filter(function (l) { return P.licoes[l.id] && P.licoes[l.id].done; }).length;
    var desOk = DES.filter(function (d) { return P.desafios[d.id] && P.desafios[d.id].passou; }).length;
    function fase(i, alvo, n, tot) { var f = BYTE_FASES[i]; var temProg = tot != null; return h("a", { class: "fase", href: "#" + alvo, onclick: function (e) { e.preventDefault(); go(alvo); } }, h("span", { class: "tag" }, "Fase " + (i + 1)), h("span", { class: "big" }, f.nome), h("span", { style: "color:var(--muted);font-size:.9rem" }, f.resumo), temProg ? h("span", { style: "font-size:.85rem" }, n + " de " + tot) : null, temProg ? h("div", { class: "bar" }, h("i", { style: "width:" + Math.round(n / tot * 100) + "%" })) : null); }
    view.appendChild(h("div", { class: "fases" }, fase(0, "licao-" + LICOES[0].id, licOk, LICOES.length), fase(1, "desafio-" + DES[0].id, desOk, DES.length), fase(2, "projeto")));
    view.appendChild(h("div", { class: "sec-title" }, h("h2", null, "Como funciona")));
    view.appendChild(h("div", { class: "how" },
      h("div", { class: "card" }, h("b", null, "Rode o código"), h("p", null, "Todo exemplo roda aqui mesmo, no navegador. Edite, quebre e rode de novo.")),
      h("div", { class: "card" }, h("b", null, "O Byte explica seus erros"), h("p", { html: U.inline("Sintaxe, `self` esquecido, `print` no lugar de `return`: ele aponta a linha e sugere o conserto.") })),
      h("div", { class: "card" }, h("b", null, "Seu histórico fica salvo"), h("p", null, "Código, tentativas e progresso ficam guardados neste navegador. Use “Dados” para fazer uma cópia."))));
    view.appendChild(h("div", { class: "foot" }, CFG.disciplina + " · " + CFG.periodo + (Store.falhou() ? " · Atenção: este navegador bloqueou o armazenamento; seu progresso vale só até fechar a página." : "")));
  }
  function route_force() { var c = current; current = ""; route(c); }

  /* ------------------------------------------------------------ Lição */
  function renderLicao(l) {
    var idx = LICOES.indexOf(l), st = licSt(l.id);
    view.appendChild(h("div", { class: "lic-head" }, h("div", { class: "kicker" }, "Fase 1 · Lição " + l.num + " · " + l.local), h("h1", null, l.titulo), h("p", { class: "lead" }, l.resumo)));
    view.appendChild(h("div", { class: "diario" }, h("b", null, "Diário do Byte"), l.diario));
    var fim = h("div", { class: "lic-end" });
    function atualizaFim() {
      fim.innerHTML = "";
      var quizzes = l.blocos.filter(function (b) { return b.t === "quiz"; });
      var todos = quizzes.every(function (q) { return st.quiz[q.id] && st.quiz[q.id].ok; });
      var ant = LICOES[idx - 1], prox = LICOES[idx + 1];
      fim.appendChild(ant ? h("button", { class: "btn", onclick: function () { go("licao-" + ant.id); } }, "← " + ant.titulo) : h("span"));
      var meio;
      if (st.done) meio = h("span", { class: "tag g sticker-pop" }, "Adesivo " + l.adesivo.nome + " colado");
      else meio = h("button", { class: "btn btn-primary", disabled: !todos, title: todos ? "" : "Acerte todas as perguntas desta lição", onclick: function () {
        st.done = true; saveP(); logEv({ tipo: "licao", ref: l.id, ok: true, resumo: "Concluiu a lição " + l.num + " (" + l.titulo + ")" });
        toast("Adesivo " + l.adesivo.nome + " colado na mochila! +25 petiscos", "ok"); atualizaFim(); renderSide(); renderTop();
      } }, todos ? "Colar adesivo na mochila" : "Responda as perguntas para concluir");
      fim.appendChild(meio);
      fim.appendChild(prox ? h("button", { class: "btn", onclick: function () { go("licao-" + prox.id); } }, prox.titulo + " →") : h("button", { class: "btn", onclick: function () { go("projeto"); } }, "Fase Secreta →"));
    }
    l.blocos.forEach(function (b) {
      switch (b.t) {
        case "md": view.appendChild(mdEl(b.md)); break;
        case "byte": view.appendChild(byteSay(b.md, b.mood || "neutro")); break;
        case "callout": view.appendChild(h("div", { class: "callout " + (b.tipo || "dica") }, mdEl(b.md))); break;
        case "code": case "multi": view.appendChild(codeBlock(b)); break;
        case "codigo": view.appendChild(h("div", null, b.titulo ? h("div", { class: "lbl", style: "margin-top:14px" }, b.titulo) : null, codeView(b.codigo))); break;
        case "quiz": view.appendChild(quizBlock(b, l, atualizaFim)); break;
        case "widget": view.appendChild(Widgets[b.nome](b.nome === "git" ? function () { P.widgets.git = true; saveP(); logEv({ tipo: "licao", ref: l.id, ok: true, resumo: "Cumpriu a missão do terminal de Git" }); toast("Missão do Git cumprida!", "ok"); } : undefined)); break;
        case "links": view.appendChild(linksBlock(b)); break;
        case "desafio":
          var d = desBy[b.id], ds = P.desafios[d.id];
          view.appendChild(h("div", { class: "desafio-link" }, h("div", { class: "t" }, h("div", { class: "kicker", style: "margin:0" }, "Desafio " + d.num + " · " + d.dificuldade), h("b", null, d.titulo), h("div", { style: "color:var(--muted);font-size:.92rem" }, d.conceito + (ds && ds.passou ? " · resolvido" : ""))), h("button", { class: "btn btn-primary", onclick: function () { go("desafio-" + d.id); } }, ds && ds.passou ? "Rever desafio" : "Ir para o desafio")));
          break;
      }
    });
    atualizaFim(); view.appendChild(fim);
  }

  /* ---------------------------------------------------------- Desafio */
  // lição em que o desafio aparece; depois do desafio o aluno segue para o conteúdo seguinte
  function troiaImg(alt) {
    if (!(CFG.imagens && CFG.imagens.troia)) return null;
    var img = h("img", { class: "troia-img", src: CFG.imagens.troia, alt: alt || "Troia", onerror: function () { img.remove(); } });
    return img;
  }
  function troiaCard(d) {
    if (d.id !== "d4" && d.id !== "d5") return null;
    var img = troiaImg("Troia, o cavalo corrompido do Mundo Pixel");
    return img ? h("div", { class: "troia-card" }, img, h("span", null, "Troia, escondido no Mundo Pixel")) : null;
  }
  function licaoDoDesafio(id) {
    for (var i = 0; i < LICOES.length; i++) {
      if (LICOES[i].blocos.some(function (b) { return b.t === "desafio" && b.id === id; })) return LICOES[i];
    }
    return null;
  }
  function proximoPasso(d) {
    var l = licaoDoDesafio(d.id), idx = l ? LICOES.indexOf(l) : -1;
    var prox = idx >= 0 ? LICOES[idx + 1] : null;
    if (prox) return { nome: "licao-" + prox.id, rotulo: "Próxima lição: " + prox.titulo + " →" };
    return { nome: "projeto", rotulo: "Ir para a Fase Secreta →" };
  }
  function renderDesafio(d) {
    view.className = "view wide";
    var S = desSt(d.id), idx = DES.indexOf(d);
    var draftKey = "chal-" + d.id;
    var inicial = (D[draftKey] && typeof D[draftKey].code === "string") ? D[draftKey].code : d.inicial;
    var lastChecked = null;

    /* ----- esquerda ----- */
    var hintsEl = h("div", { class: "hints" });
    var left = h("div", { class: "chal-left" },
      h("div", { class: "kicker" }, "Fase 2 · Desafio " + d.num + " · " + d.conceito),
      h("h1", null, d.titulo),
      h("div", { class: "row", style: "margin-bottom:6px" }, h("span", { class: "tag" }, d.dificuldade), h("span", { class: "tag m" }, d.xp + " petiscos"), S.passou ? h("span", { class: "tag g" }, "Resolvido") : null),
      byteSay(d.historia, "neutro"),
      troiaCard(d),
      h("h3", { style: "font-size:1.05rem;margin:14px 0 4px" }, "Sua missão"),
      h("ol", { class: "tarefa" }, d.tarefa.map(function (t) { return h("li", { html: U.inline(t) }); })),
      hintsEl,
      h("a", { class: "link", href: d.dikastis.url, target: "_blank", rel: "noopener noreferrer", style: "margin-top:10px" }, h("span", { class: "ic" }, "↗"), h("span", null, d.dikastis.titulo, h("small", null, "Quando terminar aqui, pratique a versão oficial no Dikastis"))),
      h("div", { class: "row", style: "margin-top:14px" },
        licaoDoDesafio(d.id) ? h("button", { class: "btn btn-sm", onclick: function () { go("licao-" + licaoDoDesafio(d.id).id); } }, "← Voltar à lição") : null,
        h("button", { class: "btn btn-sm", onclick: function () { go(proximoPasso(d).nome); } }, proximoPasso(d).rotulo)));

    /* ----- direita ----- */
    var edBox = h("div", { class: "cb-ed" });
    var btnRun = h("button", { class: "btn btn-run" }, "Executar");
    var btnCheck = h("button", { class: "btn btn-primary" }, "Verificar");
    var btnHint = h("button", { class: "btn" }, "Dica");
    var btnSol = h("button", { class: "btn btn-ghost btn-sm" }, "Ver solução");
    var btnReset = h("button", { class: "btn btn-ghost btn-sm" }, "↺ Recomeçar");
    var outEl = h("div"), resEl = h("div", { class: "res" }), memEl = h("div"), histEl = h("div", { class: "hist-mini" });
    var editorCard = h("div", { class: "cb", style: "margin-top:0" },
      h("div", { class: "cb-head" }, h("span", { class: "cb-title" }, d.arquivo), h("span", { class: "cb-status" }, "Ctrl+Enter executa")),
      edBox, h("div", { class: "actions" }, btnRun, btnCheck, btnHint, h("span", { class: "sp" }), btnSol, btnReset), outEl, resEl, memEl);
    var right = h("div", null, editorCard, histEl);
    view.appendChild(h("div", { class: "chal" }, left, right));

    var ed = makeEditor(edBox, { value: inicial, onChange: function (v) { if (v !== d.inicial) D[draftKey] = { code: v, t: Date.now() }; else delete D[draftKey]; saveD(); }, onRun: roda });
    resEl.appendChild(byteSay("Escreva o código e clique em **Verificar**. Eu rodo os testes e, se algo falhar, explico onde e por quê. Use **Executar** para ver a saída do exemplo.", "neutro"));

    /* hints */
    function pintaDicas() {
      hintsEl.innerHTML = "";
      for (var i = 0; i < S.dicas && i < d.dicas.length; i++) hintsEl.appendChild(h("div", { class: "hint-card" }, h("span", { class: "lbl" }, "Dica " + (i + 1) + " de " + d.dicas.length), mdEl(d.dicas[i])));
      btnHint.textContent = S.dicas >= d.dicas.length ? "Dicas esgotadas" : "Dica (" + S.dicas + "/" + d.dicas.length + ")";
      btnHint.disabled = S.dicas >= d.dicas.length;
    }
    function novaDica(auto) {
      if (S.dicas >= d.dicas.length) return;
      S.dicas++; saveP(); pintaDicas();
      logEv({ tipo: "dica", ref: d.id, resumo: "Dica " + S.dicas + " de " + d.dicas.length + (auto ? " (automática)" : "") });
      if (!auto) { var last = hintsEl.lastChild; if (last) last.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
    }
    btnHint.addEventListener("click", function () { novaDica(false); });
    pintaDicas();

    /* solução */
    function pintaSol() {
      var libera = S.passou || S.falhas >= CFG.tentativasParaSolucao;
      btnSol.disabled = !libera;
      btnSol.textContent = libera ? "Ver solução" : "Solução (após " + Math.max(0, CFG.tentativasParaSolucao - S.falhas) + " verificações)";
    }
    btnSol.addEventListener("click", function () {
      var corpo = h("div", null, h("p", { style: "color:var(--muted)" }, "Tente entender cada linha antes de copiar: na prova você não vai ter esta página."), codeView(d.solucao),
        h("div", { class: "row", style: "margin-top:12px" }, h("button", { class: "btn btn-primary", onclick: function () { ed.set(d.solucao); fecha(); toast("Solução colada no editor."); } }, "Colar no meu editor"), h("button", { class: "btn", onclick: function () { fecha(); } }, "Voltar")));
      var fecha = modal("Solução de referência · " + d.titulo, corpo);
      refreshEditors();
      if (!S.solucao) { S.solucao = true; saveP(); logEv({ tipo: "solucao", ref: d.id, resumo: "Viu a solução de referência" }); }
    });
    pintaSol();

    /* reset */
    var resetTimer = null;
    btnReset.addEventListener("click", function () {
      if (!resetTimer) { btnReset.textContent = "Confirmar?"; resetTimer = setTimeout(function () { resetTimer = null; btnReset.textContent = "↺ Recomeçar"; }, 3000); return; }
      clearTimeout(resetTimer); resetTimer = null; btnReset.textContent = "↺ Recomeçar";
      ed.set(d.inicial); ed.clear(); delete D[draftKey]; saveD(); outEl.innerHTML = ""; memEl.innerHTML = "";
    });

    /* executar */
    var busy = false;
    function trava(v, qual) { busy = v; btnRun.disabled = v; btnCheck.disabled = v; if (qual === "run") btnRun.textContent = v ? "Rodando…" : "Executar"; if (qual === "check") btnCheck.textContent = v ? "Verificando…" : "Verificar"; }
    function roda() {
      if (busy) return; trava(true, "run"); ed.clear();
      Runner.pedir({ mode: "run", files: (function () { var o = {}; o[d.arquivo] = ed.get(); return o; })(), extra: d.exemplo }).then(function (res) {
        outEl.innerHTML = ""; memEl.innerHTML = ""; resEl.innerHTML = "";
        outEl.appendChild(h("pre", { class: "cb-out" }, h("span", { class: "lbl" }, "Saída do exemplo de uso"), res.stdout || "(o programa não imprimiu nada)"));
        var ds = (res.diagnostics || []).filter(function (x) { return x.level !== "tip"; });
        if (ds.length) resEl.appendChild(renderFeedback(ds)); else resEl.appendChild(byteSay("Rodou sem erros. Quando achar que está pronto, clique em **Verificar** para rodar os testes.", "ok"));
        ed.mark(marcasDe(ds, d.arquivo));
        if (res.objects) { var m = memPanel(res.objects); if (m) memEl.appendChild(m); }
        logEv({ tipo: "run", ref: d.id, ok: res.ok, resumo: res.ok ? "Executou sem erro" : "Executou com erro: " + ((res.diagnostics[0] || {}).title || "") });
      }, function (e) { resEl.innerHTML = ""; resEl.appendChild(renderFeedback(falhaRunner(e))); }).then(function () { trava(false, "run"); });
    }
    btnRun.addEventListener("click", roda);

    /* verificar */
    function verifica() {
      if (busy) return;
      var code = ed.get();
      if (lastChecked === code && !S.passou) { resEl.innerHTML = ""; resEl.appendChild(byteSay("Seu código não mudou desde a última verificação. Mude alguma coisa (siga a dica acima) e verifique de novo.", "curioso")); return; }
      lastChecked = code; trava(true, "check"); ed.clear(); outEl.innerHTML = ""; memEl.innerHTML = "";
      resEl.innerHTML = ""; resEl.appendChild(byteSay("Rodando os testes…", "neutro"));
      var spec = { requires: d.requires, tests: d.tests };
      Runner.pedir({ mode: "check", files: (function () { var o = {}; o[d.arquivo] = code; return o; })(), spec: spec }, { timeoutMs: 20000 }).then(function (res) { resultado(res, code); }, function (e) {
        S.tentativas++; S.falhas++; saveP(); resEl.innerHTML = ""; resEl.appendChild(renderFeedback(falhaRunner(e)));
        logEv({ tipo: "check", ref: d.id, ok: false, resumo: "Código travou (laço infinito?)", code: code.slice(0, 12000) });
        pintaSol(); pintaHist();
      }).then(function () { trava(false, "check"); });
    }
    btnCheck.addEventListener("click", verifica);

    function resultado(res, code) {
      var tests = res.tests || [], okN = tests.filter(function (t) { return t.ok; }).length;
      var ds = res.diagnostics || [];
      var principal = destaque(ds.filter(function (x) { return x.level !== "tip"; }));
      var assinatura = res.passed ? "ok" : (principal ? principal.kind + "|" + principal.title : "?");
      S.tentativas++;
      var primeira = !S.passou;
      if (res.passed) {
        if (primeira) {
          var bonus = (S.tentativas === 1 ? 20 : 0) + (S.dicas === 0 && !S.solucao ? 10 : 0);
          S.passou = true; S.xp = d.xp + bonus; S.tempo = Date.now(); S.bonus = bonus;
        }
        S.repete = 0;
      } else {
        S.falhas++;
        S.repete = (S.ultimaFalha === assinatura) ? S.repete + 1 : 0;
      }
      S.ultimaFalha = res.passed ? "" : assinatura;
      saveP();
      logEv({ tipo: "check", ref: d.id, ok: !!res.passed, resumo: res.passed ? "Passou em todos os testes (" + okN + "/" + tests.length + ")" : (tests.length ? okN + "/" + tests.length + " testes · " : "") + (principal ? principal.title : "falhou"), code: code.slice(0, 12000) });
      /* marca no editor */
      ed.mark(marcasDe(ds, d.arquivo));
      /* pinta resultado */
      resEl.innerHTML = "";
      if (res.passed) {
        resEl.appendChild(h("div", { class: "celebra" }, h("h3", null, "Todos os testes passaram!"),
          h("p", { style: "margin:0 0 8px" }, S.tentativas === 1 && primeira ? "De primeira! " : "", primeira ? "+" + S.xp + " petiscos" + (S.bonus ? " (inclui bônus de " + S.bonus + ")" : "") + ". " : "Você já tinha resolvido este desafio. ", "Agora treine a versão oficial no Dikastis."),
          h("div", { class: "row" }, h("button", { class: "btn btn-primary", onclick: function () { go(proximoPasso(d).nome); } }, proximoPasso(d).rotulo), h("a", { class: "btn", href: d.dikastis.url, target: "_blank", rel: "noopener noreferrer" }, "Dikastis ↗"))));
        resEl.appendChild(byteSay("Au au! Esse bug do Mundo Pixel está consertado. " + (ds.length ? "Ainda tenho uma observação de estilo logo abaixo, se quiser capricho." : ""), "ok"));
        if (primeira) { toast("Desafio resolvido! +" + S.xp + " petiscos", "ok"); renderTop(); renderSide(); }
        var extras = ds.filter(function (x) { return x.level !== "error"; });
        if (extras.length) resEl.appendChild(renderFeedback(extras));
      } else {
        var aviso = null;
        if (S.repete >= 2 && S.dicas < d.dicas.length) { novaDica(true); aviso = "Notei que você está no mesmo ponto há " + (S.repete + 1) + " verificações seguidas, então liberei a próxima dica na coluna da esquerda."; }
        else if (S.repete >= 2) aviso = "Você está no mesmo ponto há " + (S.repete + 1) + " verificações. Releia a missão e compare com o exemplo de uso; se quiser, peça ajuda à monitoria mostrando este histórico.";
        resEl.appendChild(h("div", { class: "row", style: "margin-bottom:6px" }, h("span", { class: "tag " + (okN ? "a" : "m") }, okN + " de " + tests.length + " testes passando"), h("span", { style: "color:var(--muted);font-size:.85rem" }, "Tentativa " + S.tentativas)));
        resEl.appendChild(renderFeedback(ds));
        if (aviso) resEl.appendChild(byteSay(aviso, "curioso"));
      }
      if (tests.length) {
        var lista = h("ul", { class: "tests" });
        tests.forEach(function (t) {
          lista.appendChild(h("li", { class: "test " + (t.skipped ? "skip" : t.ok ? "ok" : "fail") }, h("span", { class: "ic" }, t.skipped ? "–" : t.ok ? "✓" : "✕"), h("span", null, h("span", { html: U.inline(t.nome) }), !t.ok && !t.skipped && t.msg ? h("small", { html: U.inline(t.msg) }) : null)));
        });
        resEl.appendChild(h("div", { class: "lbl", style: "margin-top:14px" }, "O que o Byte conferiu"));
        resEl.appendChild(lista);
      }
      pintaSol(); pintaHist(); pintaDicas();
    }

    /* histórico do desafio */
    function pintaHist() {
      histEl.innerHTML = "";
      var tent = HIST.filter(function (e) { return e.ref === d.id && e.tipo === "check"; }).slice(0, 6);
      if (!tent.length) return;
      histEl.appendChild(h("h3", null, "Suas tentativas neste desafio"));
      tent.forEach(function (e) {
        histEl.appendChild(h("div", { class: "hist-item" }, h("span", { class: "chip " + (e.ok ? "ok" : "no") }, e.ok ? "passou" : "falhou"), h("span", { class: "when" }, U.quando(e.t) + " · " + e.resumo),
          e.code ? h("button", { class: "btn btn-sm btn-ghost", onclick: function () { ed.set(e.code); toast("Código dessa tentativa restaurado."); } }, "Restaurar código") : null));
      });
    }
    pintaHist();
  }

  /* ----------------------------------------------------------- Projeto */
  function renderProjeto() {
    var PJ = BYTE_PROJETO, H = BYTE_HISTORIA;
    view.className = "view wide";
    var tImg = troiaImg("Troia");
    view.appendChild(h("div", { class: "lic-head proj-head" }, h("div", null, h("div", { class: "kicker" }, "Fase 3 · Fase Secreta"), h("h1", null, "O Mundo Pixel é seu"), h("p", { class: "lead" }, H.fase)), tImg));
    view.appendChild(mdEl(PJ.intro));
    view.appendChild(h("div", { class: "row", style: "margin:8px 0 6px" },
      h("a", { class: "btn btn-primary", href: CFG.templateRepo, target: "_blank", rel: "noopener noreferrer" }, "Abrir o template no GitHub ↗"),
      h("a", { class: "btn", href: BYTE_RECURSOS[3].itens[1].url, target: "_blank", rel: "noopener noreferrer" }, "Galeria de projetos ↗")));
    view.appendChild(h("div", { class: "sec-title" }, h("h2", null, "Anatomia do template"), h("span", null, "Clique nos arquivos para ver o código e o conceito de POO que cada um usa")));
    view.appendChild(Widgets.arvore(PJ.arvore, codeView));
    view.appendChild(h("div", { class: "sec-title" }, h("h2", null, "Arte e mapas do seu jogo")));
    view.appendChild(h("div", { class: "link-grid" }, PJ.ferramentas.map(function (f) {
      return h("a", { class: "link", href: f.url, target: "_blank", rel: "noopener noreferrer" }, h("span", { class: "ic" }, "↗"), h("span", null, f.titulo, h("small", { html: U.inline(f.desc) })));
    })));
    view.appendChild(h("div", { class: "lbl", style: "margin-top:18px" }, "Como usar um sprite no lugar do retângulo (rode no seu computador)"));
    view.appendChild(codeView(PJ.spriteCodigo));
  }

  /* ---------------------------------------------------------- Recursos */
  function renderRecursos() {
    view.appendChild(h("div", { class: "lic-head" }, h("div", { class: "kicker" }, "Mais"), h("h1", null, "Recursos"), h("p", { class: "lead" }, "Tudo o que a disciplina indicou, num lugar só.")));
    BYTE_RECURSOS.forEach(function (g) {
      view.appendChild(h("div", { class: "sec-title" }, h("h2", null, g.grupo)));
      view.appendChild(h("div", { class: "link-grid" }, g.itens.map(function (i) {
        return h("a", { class: "link", href: i.url, target: "_blank", rel: "noopener noreferrer" }, h("span", { class: "ic" }, "↗"), h("span", null, i.titulo, i.desc ? h("small", null, i.desc) : null));
      })));
    });
  }

  /* --------------------------------------------------------- Histórico */
  var hFiltro = "tudo";
  function renderHistorico() {
    var checks = HIST.filter(function (e) { return e.tipo === "check"; }), oks = DES.filter(function (d) { return P.desafios[d.id] && P.desafios[d.id].passou; }).length;
    var licOk = LICOES.filter(function (l) { return P.licoes[l.id] && P.licoes[l.id].done; }).length;
    view.appendChild(h("div", { class: "lic-head" }, h("div", { class: "kicker" }, "Mais"), h("h1", null, "Meu histórico"), h("p", { class: "lead" }, "Tudo o que você fez aqui, salvo neste navegador. Dá para mostrar à monitoria quando pedir ajuda.")));
    view.appendChild(h("div", { class: "stats" },
      h("div", { class: "card" }, h("b", null, licOk + "/" + LICOES.length), h("span", null, "lições concluídas")),
      h("div", { class: "card" }, h("b", null, oks + "/" + DES.length), h("span", null, "desafios resolvidos")),
      h("div", { class: "card" }, h("b", null, checks.length), h("span", null, "verificações feitas")),
      h("div", { class: "card" }, h("b", null, calcXP() + " petiscos"), h("span", null, rank(calcXP())))));
    var lista = h("div"), filtros = h("div", { class: "h-filters" });
    [["tudo", "Tudo"], ["check", "Verificações"], ["licao", "Lições e perguntas"], ["dica", "Dicas e soluções"]].forEach(function (f) {
      filtros.appendChild(h("button", { class: "btn btn-sm" + (hFiltro === f[0] ? " on" : ""), onclick: function () { hFiltro = f[0]; route_force(); } }, f[1]));
    });
    view.appendChild(filtros); view.appendChild(lista);
    var itens = HIST.filter(function (e) {
      if (hFiltro === "tudo") return true;
      if (hFiltro === "check") return e.tipo === "check" || e.tipo === "run";
      if (hFiltro === "licao") return e.tipo === "licao" || e.tipo === "quiz" || e.tipo === "projeto";
      return e.tipo === "dica" || e.tipo === "solucao";
    }).slice(0, 80);
    if (!itens.length) lista.appendChild(byteSay("Ainda não há nada por aqui. Faça uma lição ou verifique um desafio e eu anoto tudo.", "curioso"));
    var nomes = { check: "Verificação", run: "Execução", dica: "Dica", solucao: "Solução", quiz: "Pergunta", licao: "Lição", projeto: "Projeto" };
    itens.forEach(function (e) {
      var alvo = e.ref && desBy[e.ref] ? desBy[e.ref] : null;
      var row = h("div", { class: "hrow" }, h("div", { class: "top" }, h("span", { class: "chip " + (e.ok === true ? "ok" : e.ok === false ? "no" : "neu") }, nomes[e.tipo] || e.tipo),
        alvo ? h("b", null, alvo.titulo) : null, h("span", { style: "color:var(--muted)" }, e.resumo || ""), h("span", { class: "when" }, U.quando(e.t))));
      if (e.code) {
        var det = h("details", { class: "det" }, h("summary", { style: "cursor:pointer;color:var(--muted)" }, "Ver código desta tentativa"), h("pre", { class: "md-code", style: "margin-top:8px" }, h("code", null, e.code)),
          alvo ? h("button", { class: "btn btn-sm", onclick: function () { D["chal-" + alvo.id] = { code: e.code, t: Date.now() }; Store.set("drafts", D); go("desafio-" + alvo.id); toast("Código restaurado no editor do desafio."); } }, "Restaurar no editor do desafio") : null);
        row.appendChild(det);
      }
      lista.appendChild(row);
    });
  }

  /* ------------------------------------------------------------- Dados */
  function dadosModal() {
    var json = JSON.stringify({ app: "byte-code", prefixo: CFG.storagePrefix, exportado: new Date().toISOString(), dados: Store.todos() });
    var ta = h("textarea", { class: "inp", readonly: true }); ta.value = json;
    var imp = h("textarea", { class: "inp", placeholder: "Cole aqui o texto exportado para importar", "aria-label": "Importar progresso" });
    var msg = h("div", { style: "min-height:1.4em;color:var(--muted);margin-top:6px" });
    var zera = null;
    var corpo = h("div", null,
      h("p", { style: "color:var(--muted)" }, "Seu progresso fica só neste navegador. Para levar para outro computador, copie o texto abaixo e importe lá."),
      h("div", { class: "lbl" }, "Exportar"), ta,
      h("div", { class: "row", style: "margin:8px 0 16px" },
        h("button", { class: "btn btn-sm", onclick: function () { ta.select(); try { navigator.clipboard.writeText(json).then(function () { msg.textContent = "Copiado!"; }, function () { document.execCommand("copy"); msg.textContent = "Copiado!"; }); } catch (e) { try { document.execCommand("copy"); msg.textContent = "Copiado!"; } catch (e2) { msg.textContent = "Selecione o texto e copie com Ctrl+C."; } } } }, "Copiar"),
        h("button", { class: "btn btn-sm", onclick: function () {
          try { var a = h("a", { href: URL.createObjectURL(new Blob([json], { type: "application/json" })), download: "byte-code-progresso.json" }); document.body.appendChild(a); a.click(); a.remove(); msg.textContent = "Se o download não começou, use Copiar."; } catch (e) { msg.textContent = "Use o botão Copiar."; }
        } }, "Baixar arquivo")),
      h("div", { class: "lbl" }, "Importar (substitui o que existe aqui)"), imp,
      h("div", { class: "row", style: "margin-top:8px" },
        h("button", { class: "btn btn-sm btn-primary", onclick: function () {
          try {
            var o = JSON.parse(imp.value); if (!o || o.app !== "byte-code" || !o.dados || !o.dados.progress) throw new Error("formato");
            P = o.dados.progress; D = o.dados.drafts || {}; HIST = o.dados.history || [];
            saveP(); Store.set("drafts", D); saveH(); msg.textContent = "Importado!"; setTimeout(function () { location.reload(); }, 500);
          } catch (e) { msg.textContent = "Não reconheci esse texto. Cole exatamente o que foi exportado."; }
        } }, "Importar"),
        h("button", { class: "btn btn-sm", style: "margin-left:auto;border-color:var(--red);color:var(--red)", onclick: function (ev) {
          if (!zera) { ev.target.textContent = "Clique de novo para apagar tudo"; zera = setTimeout(function () { zera = null; ev.target.textContent = "Zerar tudo"; }, 3500); return; }
          Store.limpar(); location.reload();
        } }, "Zerar tudo")),
      msg);
    modal("Seus dados", corpo);
  }

  /* -------------------------------------------------------------- boot */
  function boot() {
    document.title = CFG.titulo + " · " + CFG.subtitulo;
    view = document.getElementById("view");
    try { if (localStorage.getItem(CFG.storagePrefix + ":side-off")) document.querySelector(".shell").classList.add("side-off"); } catch (e) {}
    var hashInicial = location.hash.replace("#", "");
    route(hashInicial || "inicio");
    setTimeout(function () { Runner.iniciar(); }, 1200);
  }
  window.ByteApp = { go: go };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
