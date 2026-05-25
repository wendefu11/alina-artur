// ─────────────────────────  CORE / DOM  ─────────────────────────
// Tiny DOM helpers used by every UI module. Zero dependencies.
//
// el(tag, props, ...children)  — element factory
// $(selector, root?)           — querySelector
// $$(selector, root?)          — querySelectorAll → real Array
// pickRandom(arr)              — random element
// plural(n, one, few, many)    — ru-RU plural form
// debounce(fn, ms)             — trailing debouncer
// formatDate(ms, opts?)        — locale-aware date formatting

export const $  = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
    else if (k === "style") node.style.cssText = v;
    else if (k === "html") node.innerHTML = v;
    else if ((k === "data" || k === "dataset") && typeof v === "object") {
      for (const [dk, dv] of Object.entries(v)) node.dataset[dk] = dv;
    } else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k.startsWith("on") && typeof v !== "function") {
      node[k] = v;
    } else if (v === true) {
      node.setAttribute(k, "");
    } else {
      node.setAttribute(k, v);
    }
  }
  for (const c of children.flat()) {
    if (c === undefined || c === null || c === false) continue;
    if (c instanceof Node) node.appendChild(c);
    else node.appendChild(document.createTextNode(String(c)));
  }
  return node;
}

export function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function plural(n, one, few, many) {
  n = Math.abs(n) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return many;
  if (n1 > 1 && n1 < 5) return few;
  if (n1 === 1) return one;
  return many;
}

export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function formatDate(ms, opts = { dateStyle: "short", timeStyle: "short" }) {
  return new Intl.DateTimeFormat("ru-RU", opts).format(new Date(ms));
}

export function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const ta = el("textarea", { style: "position:fixed;left:-9999px" });
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); } finally { ta.remove(); }
  return Promise.resolve();
}
