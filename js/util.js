/* Utilidades: criador de elementos, markdown simples, formatação. */
window.U = (function () {
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }

  function h(tag, attrs) {
    var el = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === false || v == null) return;
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k.indexOf("on") === 0 && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, "");
      else el.setAttribute(k, v);
    });
    var kids = Array.prototype.slice.call(arguments, 2);
    (function add(list) {
      list.forEach(function (c) {
        if (c == null || c === false) return;
        if (Array.isArray(c)) return add(c);
        el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
      });
    })(kids);
    return el;
  }

  // inline: `código`, **negrito**, *itálico*, [texto](url)
  function inline(s) {
    var codes = [];
    s = String(s).replace(/`([^`]+)`/g, function (_, c) { codes.push(c); return "\u0000" + (codes.length - 1) + "\u0000"; });
    s = esc(s);
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?![*\w])/g, "$1<em>$2</em>");
    s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    s = s.replace(/\u0000(\d+)\u0000/g, function (_, i) { return "<code>" + esc(codes[+i]) + "</code>"; });
    return s;
  }

  function md(src) {
    var lines = String(src).split("\n"), out = [], i = 0;
    while (i < lines.length) {
      var ln = lines[i];
      if (/^```/.test(ln)) {
        var code = []; i++;
        while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
        i++;
        out.push('<pre class="md-code"><code>' + esc(code.join("\n")) + "</code></pre>");
        continue;
      }
      var hm = /^(#{2,3})\s+(.*)$/.exec(ln);
      if (hm) { var lv = hm[1].length === 2 ? 3 : 4; out.push("<h" + lv + ">" + inline(hm[2]) + "</h" + lv + ">"); i++; continue; }
      if (/^- /.test(ln)) {
        var items = [];
        while (i < lines.length && /^- /.test(lines[i])) items.push(lines[i++].slice(2));
        out.push("<ul>" + items.map(function (t) { return "<li>" + inline(t) + "</li>"; }).join("") + "</ul>");
        continue;
      }
      if (ln.trim() === "") { i++; continue; }
      var para = [];
      while (i < lines.length && lines[i].trim() !== "" && !/^(```|#{2,3}\s|- )/.test(lines[i])) para.push(lines[i++]);
      out.push("<p>" + para.map(inline).join("<br>") + "</p>");
    }
    return out.join("");
  }

  function mdEl(src, cls) { return h("div", { class: "md " + (cls || ""), html: md(src) }); }

  function quando(t) {
    try { return new Date(t).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }); }
    catch (e) { return new Date(t).toISOString(); }
  }

  return { esc: esc, h: h, md: md, mdEl: mdEl, inline: inline, quando: quando };
})();
