/* ============================================================================
   Widgets interativos das lições: self, herança, laço do jogo, terminal Git,
   explorador do template. Cada função devolve um elemento DOM.
   ============================================================================ */
window.Widgets = (function () {
  var h = U.h;

  function caixa(titulo, corpo, extra) {
    return h("div", { class: "w" }, h("div", { class: "w-h" }, titulo, extra || null), h("div", { class: "w-b" }, corpo));
  }

  /* ---------------------------------------------------------------- self */
  function selfW() {
    var pets = { byte: { nome: "Byte", en: 10 }, rex: { nome: "Rex", en: 6 } };
    var els = {};
    var grade = h("div", { class: "self-pets" });
    Object.keys(pets).forEach(function (k) {
      var barra = h("i"), txt = h("span");
      els[k] = { card: h("div", { class: "pet" }, h("div", null, h("b", null, k), " = Cachorro(\"" + pets[k].nome + "\", " + pets[k].en + ")"), h("div", null, "energia: ", txt), h("div", { class: "en" }, barra)), barra: barra, txt: txt };
      grade.appendChild(els[k].card);
    });
    var call = h("div", { class: "w-call" }, h("span", { class: "arrow" }, "Clique em uma chamada para ver quem é o "), h("span", { class: "self" }, "self"), h("span", { class: "arrow" }, "."));
    function pinta() {
      Object.keys(pets).forEach(function (k) {
        els[k].txt.textContent = pets[k].en;
        els[k].barra.style.width = Math.max(0, pets[k].en) * 10 + "%";
      });
    }
    function chama(k, m) {
      var p = pets[k];
      Object.keys(els).forEach(function (o) { els[o].card.classList.toggle("on", o === k); });
      var linhas;
      if (m === "brincar") { p.en = Math.max(0, p.en - 2); linhas = "self.energia -= 2   →   energia de " + p.nome + " agora é " + p.en; }
      else { linhas = "print(f\"{self.nome}: Au au!\")   →   " + p.nome + ": Au au!"; }
      pinta();
      call.innerHTML = "";
      call.appendChild(h("div", null, h("b", null, k + "." + m + "()"), "  ", h("span", { class: "arrow" }, "o Python executa"), "  Cachorro." + m + "(", h("span", { class: "self" }, "self"), "=" + k + ")"));
      call.appendChild(h("div", { class: "arrow" }, "Dentro do método, "), 0);
      call.lastChild.appendChild(h("span", { class: "self" }, "self"));
      call.lastChild.appendChild(document.createTextNode(" é o " + k + " (nome \"" + p.nome + "\"). " + linhas));
    }
    var botoes = h("div", { class: "row", style: "margin-top:12px" });
    [["byte", "brincar"], ["rex", "brincar"], ["byte", "latir"], ["rex", "latir"]].forEach(function (a) {
      botoes.appendChild(h("button", { class: "btn btn-sm", onclick: function () { chama(a[0], a[1]); } }, a[0] + "." + a[1] + "()"));
    });
    pinta();
    return caixa("Quem é o self?", h("div", null, grade, botoes, call));
  }

  /* ------------------------------------------------------------- herança */
  var CLASSES = {
    Criatura: { pai: null, attrs: ["nome", "vida"], membros: [
      { n: "atacar", out: "Bug ataca!", c: "def atacar(self):\n    return f\"{self.nome} ataca!\"" },
      { n: "receber_dano", c: "def receber_dano(self, d):\n    self.vida -= d" }],
      codigo: "class Criatura:\n    def __init__(self, nome, vida):\n        self.nome = nome\n        self.vida = vida\n\n    def atacar(self):\n        return f\"{self.nome} ataca!\"\n\n    def receber_dano(self, d):\n        self.vida -= d" },
    Byte: { pai: "Criatura", attrs: [], membros: [
      { n: "atacar", out: "Byte late alto: AU AU!", c: "def atacar(self):\n    return f\"{self.nome} late alto: AU AU!\"" },
      { n: "farejar", out: "Byte farejou um bug!", c: "def farejar(self):\n    return f\"{self.nome} farejou um bug!\"" }],
      codigo: "class Byte(Criatura):\n    def atacar(self):                 # sobrescreve\n        return f\"{self.nome} late alto: AU AU!\"\n\n    def farejar(self):                # novo, só do Byte\n        return f\"{self.nome} farejou um bug!\"" },
    BugSelvagem: { pai: "Criatura", attrs: ["mordida"], membros: [
      { n: "__init__", c: "def __init__(self, nome):\n    super().__init__(nome, 30)\n    self.mordida = 5" },
      { n: "atacar", out: "Bugzinho ataca! Mordida de bug!", c: "def atacar(self):\n    return super().atacar() + \" Mordida de bug!\"", ssuper: true }],
      codigo: "class BugSelvagem(Criatura):\n    def __init__(self, nome):\n        super().__init__(nome, 30)   # reaproveita a mãe\n        self.mordida = 5             # atributo novo\n\n    def atacar(self):                # sobrescreve + reaproveita\n        return super().atacar() + \" Mordida de bug!\"" },
    Troia: { pai: "Criatura", attrs: [], membros: [
      { n: "atacar", out: "Caso base não encontrado... Stack overflow!", c: "def atacar(self):\n    return \"Caso base não encontrado... Stack overflow!\"" },
      { n: "invocar_bugs", out: "Troia invocou 3 bugs!", c: "def invocar_bugs(self):\n    return \"Troia invocou 3 bugs!\"" }],
      codigo: "class Troia(Criatura):\n    def atacar(self):                 # sobrescreve por completo (sem super)\n        return \"Caso base não encontrado... Stack overflow!\"\n\n    def invocar_bugs(self):           # novo, só do Troia\n        return \"Troia invocou 3 bugs!\"" }
  };

  function membrosDe(nome) {
    var c = CLASSES[nome], lista = [], pai = c.pai ? CLASSES[c.pai] : null;
    if (pai) {
      pai.attrs.forEach(function (a) { lista.push({ n: a, tipo: "atributo", st: "her" }); });
      pai.membros.forEach(function (m) {
        var sobre = c.membros.filter(function (x) { return x.n === m.n; })[0];
        if (!sobre) lista.push({ n: m.n + "()", tipo: "método", st: "her", out: m.out });
      });
    }
    c.attrs.forEach(function (a) { lista.push({ n: a, tipo: "atributo", st: "pro" }); });
    c.membros.forEach(function (m) {
      var herdaNome = pai && pai.membros.filter(function (x) { return x.n === m.n; })[0];
      lista.push({ n: m.n + "()", tipo: "método", st: herdaNome ? "sob" : "pro", out: m.out, ssuper: m.ssuper });
    });
    if (!pai) c.attrs.forEach(function () {});
    return lista;
  }

  function herancaW() {
    var detalhe = h("div");
    var nodes = h("div", { class: "tree-nodes" });
    var botoes = {};
    function mostra(nome) {
      Object.keys(botoes).forEach(function (k) { botoes[k].classList.toggle("on", k === nome); });
      detalhe.innerHTML = "";
      var c = CLASSES[nome];
      detalhe.appendChild(h("div", { class: "lbl" }, c.pai ? "class " + nome + "(" + c.pai + ")" : "class " + nome + " (a mãe de todas)"));
      var tags = { her: ["herdado", "her"], pro: ["próprio", "pro"], sob: ["sobrescrito", "sob"] };
      membrosDe(nome).forEach(function (m) {
        var t = tags[m.st];
        var linha = h("div", { class: "mem-row" }, h("span", { class: "badge " + t[1] }, t[0]), h("span", null, m.n), h("span", { style: "color:var(--muted)" }, m.tipo === "atributo" ? "(atributo)" : ""));
        if (m.out) {
          linha.appendChild(h("button", { class: "btn btn-sm", style: "margin-left:auto", onclick: function (ev) {
            var o = ev.target.nextSibling; if (o) { o.remove(); return; }
            ev.target.parentNode.appendChild(h("code", { style: "width:100%;color:#9af2c2" }, "→ " + m.out));
          } }, "chamar"));
        }
        detalhe.appendChild(linha);
      });
      detalhe.appendChild(h("pre", { class: "md-code", style: "margin-top:12px" }, h("code", null, c.codigo)));
    }
    Object.keys(CLASSES).forEach(function (n) {
      var b = h("button", { class: "tree-node" + (CLASSES[n].pai ? " child" : ""), onclick: function () { mostra(n); } }, n);
      botoes[n] = b; nodes.appendChild(b);
    });
    mostra("BugSelvagem");
    return caixa("Árvore do Troia: escolha uma classe", h("div", { class: "tree" }, nodes, detalhe));
  }

  /* ---------------------------------------------------------- laço do jogo */
  function loopW() {
    var W = 480, H = 270;
    var canvas = h("canvas", { width: W, height: H, tabindex: "0", "aria-label": "Mini jogo: use as setas para mover o quadrado azul" });
    var ctx = canvas.getContext("2d");
    var keys = {}, estagio = 0, lento = false, timer = null, raf = null, flash = 0, msg = "";
    var p, en, coins, placar;
    function reset() {
      p = { x: 40, y: 120, w: 28, h: 28, v: 1.6 }; en = { x: 160, y: 200, w: 28, h: 28, v: 1.2 };
      coins = [{ x: 300, y: 50 }, { x: 300, y: 130 }, { x: 390, y: 200 }, { x: 220, y: 60 }]; placar = 0;
    }
    reset();
    function bate(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
    function atualizar(m) {
      m = m || 1; var dx = 0, dy = 0;
      if (keys.ArrowLeft || keys.a) dx -= p.v * m; if (keys.ArrowRight || keys.d) dx += p.v * m;
      if (keys.ArrowUp || keys.w) dy -= p.v * m; if (keys.ArrowDown || keys.s) dy += p.v * m;
      if (alvo) {
        var tx = alvo.x - (p.x + p.w / 2), ty = alvo.y - (p.y + p.h / 2);
        if (Math.abs(tx) > 4) dx += (tx > 0 ? 1 : -1) * p.v * m; if (Math.abs(ty) > 4) dy += (ty > 0 ? 1 : -1) * p.v * m;
      }
      p.x = Math.max(0, Math.min(W - p.w, p.x + dx)); p.y = Math.max(0, Math.min(H - p.h, p.y + dy));
      en.x += en.v * m; if (en.x > W) en.x = -en.w;
      coins = coins.filter(function (c) { if (bate(p, { x: c.x, y: c.y, w: 20, h: 20 })) { placar++; return false; } return true; });
      if (bate(p, en)) { flash = 12; msg = "Collision detected!"; }
      if (!coins.length) setTimeout(function () { reset(); }, 700);
    }
    function desenhar() {
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      coins.forEach(function (c) { ctx.fillStyle = "#ffff00"; ctx.fillRect(c.x, c.y, 20, 20); });
      ctx.fillStyle = "#dc3232"; ctx.fillRect(en.x, en.y, en.w, en.h);
      ctx.fillStyle = flash > 0 ? "#ffffff" : "#3278ff"; ctx.fillRect(p.x, p.y, p.w, p.h);
      if (flash > 0) flash--;
      ctx.fillStyle = "#fff"; ctx.font = "16px Arial"; ctx.fillText("Moedas: " + placar, 14, 24);
      if (flash > 0) { ctx.fillStyle = "#ff6482"; ctx.fillText(msg, 14, 46); }
    }
    var linhas = [
      ["while running:", 0], ["    clock.tick(FPS)", 0],
      ["    for event in pygame.event.get():", 1], ["        ...  # teclado, fechar janela", 1],
      ["    enemy.update()", 2], ["    if check_collision(player, enemy):", 2], ["    player.update(screen, coins, counter)", 2],
      ["    screen.fill(BLACK)", 3], ["    coin.update(screen); enemy.draw(screen)", 3], ["    pygame.display.update()", 3]
    ];
    var codeEl = h("div", { class: "loop-code" });
    var nodesL = linhas.map(function (l) { var d = h("div", { class: l[1] ? "st" + l[1] : "" }, l[0]); codeEl.appendChild(d); return d; });
    var etapaTxt = h("div", { class: "lbl", style: "margin-top:10px;color:var(--cyan)" }, "Ao vivo: 60 quadros por segundo");
    function destaca(n) {
      nodesL.forEach(function (d, i) { d.classList.toggle("on", linhas[i][1] === n && n > 0); });
      etapaTxt.textContent = n === 1 ? "Etapa 1 · Eventos: lê o teclado" : n === 2 ? "Etapa 2 · Atualizar: move, colide, coleta" : n === 3 ? "Etapa 3 · Desenhar: pinta o quadro novo" : "Ao vivo: 60 quadros por segundo";
    }
    function parar() { if (timer) clearInterval(timer); timer = null; if (raf) cancelAnimationFrame(raf); raf = null; }
    function iniciar() {
      parar(); destaca(0);
      if (lento) {
        estagio = 0;
        timer = setInterval(function () {
          if (!canvas.isConnected) return parar();
          estagio = estagio % 3 + 1; destaca(estagio);
          if (estagio === 2) atualizar(10); if (estagio === 3) desenhar();
        }, 750);
      } else {
        // passo fixo de 60 quadros por segundo: a velocidade é a mesma em telas de 60, 120 ou 144 Hz
        var ultimo = 0, acum = 0;
        (function quadro(t) {
          if (!canvas.isConnected) return;
          if (!ultimo) ultimo = t || 0;
          acum += Math.min(100, (t || 0) - ultimo); ultimo = t || 0;
          while (acum >= 1000 / 60) { atualizar(); acum -= 1000 / 60; }
          desenhar(); raf = requestAnimationFrame(quadro);
        })(0);
      }
    }
    var CODIGOS = { KeyW: "w", KeyA: "a", KeyS: "s", KeyD: "d", ArrowUp: "ArrowUp", ArrowDown: "ArrowDown", ArrowLeft: "ArrowLeft", ArrowRight: "ArrowRight" };
    function tecla(ev, v) {
      // ev.code vale para qualquer layout de teclado; ev.key cobre o resto
      var k = CODIGOS[ev.code];
      if (!k) { var kk = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key; if (/^Arrow/.test(kk) || "wasd".indexOf(kk) >= 0 && kk.length === 1) k = kk; }
      if (k) { keys[k] = v; ev.preventDefault(); }
    }
    canvas.addEventListener("mouseenter", function () { canvas.focus({ preventScroll: true }); });
    canvas.addEventListener("keydown", function (e) { tecla(e, true); });
    canvas.addEventListener("keyup", function (e) { tecla(e, false); });
    canvas.addEventListener("blur", function () { keys = {}; });
    var alvo = null;
    function alvoDe(e) { var r = canvas.getBoundingClientRect(); alvo = { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
    canvas.addEventListener("pointerdown", function (e) { canvas.focus({ preventScroll: true }); if (e.pointerType !== "mouse") { alvoDe(e); try { canvas.setPointerCapture(e.pointerId); } catch (x) {} } });
    canvas.addEventListener("pointermove", function (e) { if (alvo && e.pointerType !== "mouse") alvoDe(e); });
    ["pointerup", "pointercancel"].forEach(function (n) { canvas.addEventListener(n, function () { alvo = null; }); });
    function dbtn(txt, key, cls) {
      var b = h("button", { class: cls || "", "aria-label": key, type: "button" }, txt), desde = 0, solta = null;
      function liga(e) { if (e.cancelable) e.preventDefault(); clearTimeout(solta); keys[key] = true; desde = Date.now(); }
      // um toque rápido ainda anda um pouquinho: a tecla fica "apertada" por pelo menos 140 ms
      function desliga() { clearTimeout(solta); solta = setTimeout(function () { keys[key] = false; }, Math.max(0, 140 - (Date.now() - desde))); }
      if (window.PointerEvent) {
        b.addEventListener("pointerdown", function (e) { liga(e); try { b.setPointerCapture(e.pointerId); } catch (x) {} });
        ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (n) { b.addEventListener(n, desliga); });
      } else {
        b.addEventListener("touchstart", liga, { passive: false });
        ["touchend", "touchcancel"].forEach(function (n) { b.addEventListener(n, desliga); });
        b.addEventListener("mousedown", liga); b.addEventListener("mouseup", desliga); b.addEventListener("mouseleave", desliga);
      }
      b.addEventListener("contextmenu", function (e) { e.preventDefault(); });
      return b;
    }
    var dpad = h("div", { class: "dpad" }, dbtn("▲", "ArrowUp", "up"), dbtn("◀", "ArrowLeft", "left"), dbtn("▼", "ArrowDown", "down"), dbtn("▶", "ArrowRight", "right"));
    var chk = h("input", { type: "checkbox", id: "lento", onchange: function (e) { lento = e.target.checked; iniciar(); } });
    var corpo = h("div", { class: "canvas-wrap" },
      h("div", null, canvas, h("div", { class: "row", style: "margin-top:8px" }, h("label", { for: "lento", style: "display:flex;gap:6px;align-items:center;font-size:.9rem" }, chk, "Câmera lenta (etapa por etapa)"), h("button", { class: "btn btn-sm", onclick: reset }, "Reiniciar moedas")), dpad),
      h("div", null, h("div", { class: "lbl" }, "main.py do template, simplificado"), codeEl, etapaTxt,
        h("p", { style: "color:var(--muted);font-size:.88rem;margin:8px 0 0" }, "No computador use as setas ou WASD; no celular use os botões ou arraste o dedo sobre o jogo. Colete as moedas amarelas; encostar no inimigo vermelho acende o quadrado (é o ", h("code", null, "check_collision"), " do template).")));
    var w = caixa("Mini jogo: o laço do Pygame", corpo);
    var obs = new MutationObserver(function () { if (!w.isConnected) { parar(); obs.disconnect(); } });
    setTimeout(function () { if (w.isConnected) { obs.observe(document.body, { childList: true, subtree: true }); iniciar(); } else iniciar(); }, 0);
    desenhar();
    return w;
  }

  /* ----------------------------------------------------------- terminal Git */
  function gitW(onGoal) {
    var S = { init: false, files: { "main.py": "novo", "README.md": "novo" }, commits: [], remote: null, pushed: 0, goals: { init: 0, add: 0, commit: 0, remote: 0, push: 0 } };
    var out = h("div", { class: "term-out", "aria-live": "polite" });
    var inp = h("input", { type: "text", "aria-label": "Comando", autocomplete: "off", spellcheck: "false", placeholder: "digite um comando e tecle Enter" });
    var goalsEl = h("div", { class: "goals" });
    var ordem = [["init", "git init"], ["add", "git add"], ["commit", "git commit"], ["remote", "git remote add"], ["push", "git push"]];
    var hist = [], hi = 0;
    function metas() {
      goalsEl.innerHTML = "";
      ordem.forEach(function (o) { goalsEl.appendChild(h("span", { class: "goal" + (S.goals[o[0]] ? " on" : "") }, (S.goals[o[0]] ? "✓ " : "") + o[1])); });
    }
    function meta(k) {
      if (S.goals[k]) return; S.goals[k] = 1; metas();
      if (Object.keys(S.goals).every(function (g) { return S.goals[g]; })) {
        say("Missão cumprida! Seu projeto está no GitHub. No dia a dia você repete add → commit → push.", "okk");
        if (onGoal) onGoal();
      }
    }
    function say(t, cls) { out.appendChild(h("div", { class: cls || "" }, t)); out.scrollTop = out.scrollHeight; }
    function tip(t) { say("Dica do Byte: " + t, "byte-tip"); }
    function tokens(s) { var r = [], m, re = /"([^"]*)"|'([^']*)'|(\S+)/g; while ((m = re.exec(s))) r.push(m[1] !== undefined ? m[1] : m[2] !== undefined ? m[2] : m[3]); return r; }
    function hash() { return Math.random().toString(16).slice(2, 9); }
    function exec(linha) {
      say("$ " + linha, "cmd");
      var t = tokens(linha); if (!t.length) return;
      if (t[0] === "clear") { out.innerHTML = ""; return; }
      if (t[0] === "ls") { say(Object.keys(S.files).join("  ")); return; }
      if (t[0] === "touch" && t[1]) { S.files[t[1]] = "novo"; say("(criou " + t[1] + ")"); return; }
      if (t[0] === "edit" && t[1]) {
        if (!S.files[t[1]]) { say("edit: " + t[1] + ": arquivo não existe", "err"); return; }
        if (S.files[t[1]] === "ok") S.files[t[1]] = "mod";
        say("(simulando: você editou " + t[1] + ")"); return;
      }
      if (t[0] === "help") { say("Comandos: git init | status | add <arquivo|.> | commit -m \"msg\" | log --oneline | remote add origin <url> | push -u origin main | pull | clone <url>\nExtras do treino: ls, touch <arq>, edit <arq>, clear"); return; }
      if (t[0] !== "git") { say(t[0] + ": comando não encontrado. Aqui só funcionam comandos git (digite help).", "err"); return; }
      var c = t[1];
      if (!c) { say("usage: git <comando>", "err"); return; }
      if (c === "config") { say("(configurado)"); return; }
      if (c === "clone") { say("Cloning into '" + ((t[2] || "repo").split("/").pop().replace(".git", "")) + "'...\nremote: Enumerating objects... done."); tip("No seu computador isso baixa o projeto inteiro (ex.: o template do jogo). Aqui a missão é começar do zero: use git init."); return; }
      if (c === "init") {
        if (S.init) { say("Reinitialized existing Git repository in .git/"); return; }
        S.init = true; say("Initialized empty Git repository in .git/", "okk"); meta("init"); return;
      }
      if (!S.init) { say("fatal: not a git repository (or any of the parent directories): .git", "err"); tip("Todo projeto começa com git init."); return; }
      var nomes = Object.keys(S.files);
      if (c === "status") {
        var st = nomes.filter(function (n) { return S.files[n] === "staged"; }), md = nomes.filter(function (n) { return S.files[n] === "mod"; }), nv = nomes.filter(function (n) { return S.files[n] === "novo"; });
        var s = "On branch main\n";
        if (!S.commits.length) s += "\nNo commits yet\n";
        if (st.length) s += "\nChanges to be committed:\n" + st.map(function (n) { return "        new/modified:   " + n; }).join("\n") + "\n";
        if (md.length) s += "\nChanges not staged for commit:\n" + md.map(function (n) { return "        modified:   " + n; }).join("\n") + "\n";
        if (nv.length) s += "\nUntracked files:\n" + nv.map(function (n) { return "        " + n; }).join("\n") + "\n";
        if (!st.length && !md.length && !nv.length) s += "nothing to commit, working tree clean";
        say(s.trim()); if (nv.length) tip("Arquivos em 'Untracked' ainda não estão no Git. Use git add."); return;
      }
      if (c === "add") {
        var alvo = t[2];
        if (!alvo) { say("Nothing specified, nothing added.", "err"); tip("Diga o que adicionar: git add main.py ou git add ."); return; }
        var lista = alvo === "." ? nomes : [alvo];
        if (alvo !== "." && !S.files[alvo]) { say("fatal: pathspec '" + alvo + "' did not match any files", "err"); tip("Confira o nome com ls."); return; }
        var n = 0; lista.forEach(function (f) { if (S.files[f] === "novo" || S.files[f] === "mod") { S.files[f] = "staged"; n++; } });
        say(n ? "(" + n + " arquivo(s) preparado(s) para o commit)" : "(nada novo para adicionar)"); if (n) meta("add"); return;
      }
      if (c === "commit") {
        var i = t.indexOf("-m");
        if (i < 0 || !t[i + 1]) { say("Aborting commit due to empty commit message.", "err"); tip("Use git commit -m \"o que você fez\"."); return; }
        var prep = nomes.filter(function (n) { return S.files[n] === "staged"; });
        if (!prep.length) {
          say(nomes.some(function (n) { return S.files[n] === "novo" || S.files[n] === "mod"; }) ? "nothing added to commit but untracked/modified files present" : "nothing to commit, working tree clean", "err");
          tip("O commit só leva o que passou pelo git add antes."); return;
        }
        prep.forEach(function (n) { S.files[n] = "ok"; });
        var id = hash(); S.commits.unshift({ id: id, msg: t[i + 1] });
        say("[main " + id + "] " + t[i + 1] + "\n " + prep.length + " file(s) changed", "okk"); meta("commit"); return;
      }
      if (c === "log") {
        if (!S.commits.length) { say("fatal: your current branch 'main' does not have any commits yet", "err"); tip("Faça um commit primeiro."); return; }
        say(S.commits.map(function (x) { return x.id + " " + x.msg; }).join("\n")); return;
      }
      if (c === "remote") {
        if (t[2] === "add" && t[3] && t[4]) {
          if (S.remote) { say("error: remote " + t[3] + " already exists.", "err"); return; }
          if (!/^(https:\/\/github\.com\/|git@github\.com:)/.test(t[4])) { say("(a URL deveria ser do GitHub: https://github.com/usuario/repositorio.git)", "err"); tip("Copie a URL do repositório no GitHub."); return; }
          S.remote = t[4]; say("(remoto " + t[3] + " configurado)"); meta("remote"); return;
        }
        if (t[2] === "-v") { say(S.remote ? "origin  " + S.remote + " (push)" : "(nenhum remoto)"); return; }
        say("uso: git remote add origin https://github.com/usuario/repositorio.git", "err"); return;
      }
      if (c === "push") {
        if (!S.remote) { say("fatal: No configured push destination.", "err"); tip("Conecte ao GitHub antes: git remote add origin <url>."); return; }
        if (!S.commits.length) { say("error: src refspec main does not match any", "err"); tip("Não há nada para enviar: faça um commit primeiro."); return; }
        if (S.pushed === S.commits.length) { say("Everything up-to-date"); return; }
        S.pushed = S.commits.length;
        say("Enumerating objects... done.\nTo " + S.remote + "\n * [new branch]      main -> main", "okk"); meta("push"); return;
      }
      if (c === "pull") { say(S.remote ? "Already up to date." : "There is no tracking information for the current branch.", S.remote ? "" : "err"); if (!S.remote) tip("Conecte ao GitHub antes (git remote add origin <url>)."); return; }
      say("git: '" + c + "' não faz parte deste treino (digite help).", "err");
    }
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { var v = inp.value.trim(); if (v) { hist.push(v); hi = hist.length; exec(v); } inp.value = ""; }
      else if (e.key === "ArrowUp" && hist.length) { hi = Math.max(0, hi - 1); inp.value = hist[hi]; e.preventDefault(); }
      else if (e.key === "ArrowDown" && hist.length) { hi = Math.min(hist.length, hi + 1); inp.value = hist[hi] || ""; e.preventDefault(); }
    });
    var sug = h("div", { class: "sugs" });
    ["git init", "git status", "git add .", "git commit -m \"primeiro commit\"", "git remote add origin https://github.com/voce/meu-jogo.git", "git push -u origin main", "git log --oneline", "edit main.py"].forEach(function (s) {
      sug.appendChild(h("button", { class: "btn btn-sm btn-ghost", onclick: function () { inp.value = s; inp.focus(); } }, s.length > 34 ? s.slice(0, 31) + "..." : s));
    });
    metas();
    say("Missão: publicar o projeto. Você tem main.py e README.md. Comece pelo começo; digite help se travar.");
    var term = h("div", { class: "term" }, out, h("div", { class: "term-in" }, h("span", null, "$"), inp));
    return caixa("Terminal de Git do Byte (de mentirinha)", h("div", null, goalsEl, term, h("div", { class: "lbl", style: "margin-top:10px" }, "Atalhos (clique para preencher)"), sug));
  }

  /* ------------------------------------------------- explorador do template */
  function arvoreW(nodes, mkCode) {
    var painel = h("div");
    var lista = h("div", { class: "ftree" });
    var botoes = [];
    function mostra(n, btn) {
      botoes.forEach(function (b) { b.classList.remove("on"); }); btn.classList.add("on");
      painel.innerHTML = "";
      painel.appendChild(h("div", { class: "row", style: "margin-bottom:6px" }, h("h4", { style: "margin:0" }, n.nome), h("span", { class: "tag m" }, n.papel), h("span", { class: "tag" }, n.conceito)));
      painel.appendChild(U.mdEl(n.desc));
      if (n.codigo) painel.appendChild(mkCode(n.codigo));
      else if (n.filhos && n.filhos.length) painel.appendChild(h("p", { style: "color:var(--muted)" }, "Escolha um arquivo desta pasta na árvore ao lado."));
    }
    function add(n, lvl) {
      var b = h("button", { class: "lvl" + lvl, onclick: function () { mostra(n, b); } }, h("span", { class: n.tipo === "pasta" ? "dir" : "" }, (n.tipo === "pasta" ? "▸ " : "· ") + n.nome));
      botoes.push(b); lista.appendChild(b);
      (n.filhos || []).forEach(function (f) { add(f, 1); });
    }
    nodes.forEach(function (n) { add(n, 0); });
    mostra(nodes[0], botoes[0]);
    return h("div", { class: "w" }, h("div", { class: "w-h" }, "Anatomia do template do jogo"), h("div", { class: "w-b" }, h("div", { class: "proj" }, lista, painel)));
  }

  return { self: selfW, heranca: herancaW, loop: loopW, git: gitW, arvore: arvoreW };
})();
