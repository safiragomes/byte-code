/* ============================================================================
   Executor de Python (Pyodide num Web Worker).
   - O Python roda em segundo plano: um laço infinito nunca trava a página.
   - O worker nasce de um Blob, então funciona também abrindo o index.html direto
     do disco (file://) e dentro do artefato do Claude.
   ============================================================================ */
window.Runner = (function () {
  var worker = null, ready = null, seq = 0, pend = {}, listeners = [], estado = { fase: "parado", msg: "" };

  function setEstado(fase, msg) {
    estado = { fase: fase, msg: msg || "" };
    listeners.forEach(function (f) { try { f(estado); } catch (e) {} });
  }

  // ---- código que roda DENTRO do worker (convertido em texto) ----
  function workerMain() {
    var pyodide = null, tutor = null, atual = 0;
    self.onmessage = async function (e) {
      var m = e.data;
      if (m.type === "init") {
        try {
          var erros = [];
          for (var i = 0; i < m.bases.length && !pyodide; i++) {
            try {
              importScripts(m.bases[i] + "pyodide.js");
              var o = { indexURL: m.bases[i] };
              // a biblioteca padrão vai com extensão .wasm porque alguns hospedeiros (como artefatos) não servem .zip
              if (!/cdn\.jsdelivr\.net/.test(m.bases[i])) o.stdLibURL = m.bases[i] + "python_stdlib.wasm";
              pyodide = await loadPyodide(o);
            } catch (e1) { pyodide = null; erros.push(m.bases[i] + " → " + String((e1 && e1.message) || e1)); }
          }
          if (!pyodide) throw new Error(erros.join(" | "));
          pyodide.globals.set("_tutor_src", m.src);
          pyodide.runPython(
            "import sys, types\n" +
            "_m = types.ModuleType('tutor')\n" +
            "exec(_tutor_src, _m.__dict__)\n" +
            "sys.modules['tutor'] = _m\n"
          );
          tutor = pyodide.pyimport("tutor");
          tutor.set_progress(function (s) { self.postMessage({ type: "progress", id: atual, msg: String(s) }); });
          self.postMessage({ type: "ready", versao: pyodide.version });
        } catch (err) {
          self.postMessage({ type: "initerror", msg: String((err && err.message) || err) });
        }
      } else if (m.type === "run") {
        atual = m.id;
        try {
          var out = tutor.main(JSON.stringify(m.payload));
          self.postMessage({ type: "result", id: m.id, data: out });
        } catch (err) {
          self.postMessage({ type: "error", id: m.id, msg: String((err && err.message) || err) });
        }
      }
    };
  }

  function bases() {
    var q = null, lista = [];
    try { q = new URLSearchParams(location.search).get("pyodide"); } catch (e) {}
    var c = (window.BYTE_CONFIG && window.BYTE_CONFIG.pyodide) || [];
    [q].concat(c).forEach(function (b) {
      if (!b) return;
      if (b.slice(-1) !== "/") b += "/";
      var u = new URL(b, location.href).href;
      if (lista.indexOf(u) < 0) lista.push(u);
    });
    return lista;
  }

  function criar() {
    setEstado("carregando", "Acordando o Python...");
    var url = URL.createObjectURL(new Blob(["(", workerMain.toString(), ")()"], { type: "text/javascript" }));
    var w = new Worker(url);
    worker = w;
    ready = new Promise(function (resolve, reject) {
      var limite = setTimeout(function () {
        reject(new Error("O Python demorou demais para carregar."));
      }, 90000);
      w.onmessage = function (e) {
        var m = e.data;
        if (m.type === "ready") { clearTimeout(limite); setEstado("pronto", "Python " + m.versao); resolve(); }
        else if (m.type === "initerror") { clearTimeout(limite); reject(new Error(m.msg)); }
        else if (m.type === "progress") { var p = pend[m.id]; if (p && p.onProgress) p.onProgress(m.msg); }
        else if (m.type === "result" || m.type === "error") {
          var p2 = pend[m.id]; if (!p2) return;
          clearTimeout(p2.timer); delete pend[m.id];
          if (m.type === "result") { try { p2.resolve(JSON.parse(m.data)); } catch (er) { p2.reject(er); } }
          else p2.reject(new Error(m.msg));
        }
      };
      w.onerror = function (ev) { clearTimeout(limite); reject(new Error(ev.message || "Falha ao iniciar o worker.")); };
      w.postMessage({ type: "init", bases: bases(), src: window.BYTE_TUTOR_PY });
    });
    ready.catch(function (err) { setEstado("erro", err.message); });
    return ready;
  }

  function garantir() {
    if (!worker || estado.fase === "erro") { return criar(); }
    return ready;
  }

  function reiniciar() {
    if (worker) { try { worker.terminate(); } catch (e) {} }
    worker = null; ready = null;
  }

  // payload: {mode, files, entry, extra, stdin, spec}
  function pedir(payload, opts) {
    opts = opts || {};
    return garantir().then(function () {
      return new Promise(function (resolve, reject) {
        var id = ++seq;
        var timer = setTimeout(function () {
          delete pend[id];
          var ultimo = pend[id] && pend[id].ultimo;
          reiniciar();
          setEstado("parado", "Reiniciado após travar");
          reject({ timeout: true });
        }, opts.timeoutMs || 14000);
        pend[id] = { resolve: resolve, reject: reject, timer: timer, onProgress: opts.onProgress };
        worker.postMessage({ type: "run", id: id, payload: payload });
      });
    });
  }

  return {
    pedir: pedir,
    iniciar: function () { return garantir().catch(function () {}); },
    estado: function () { return estado; },
    aoMudar: function (f) { listeners.push(f); f(estado); }
  };
})();
