// ─────────────────────────  UI / VIEW · DIARY  ─────────────────────────

import { el } from "../../core/dom.js";
import { addDiary, removeDiary, addWish, toggleWish, removeWish } from "../../storage/store.js";
import { WISHES } from "../../data/content.js";
import { toast } from "../../core/toast.js";
import { formatDate } from "../../core/dom.js";

export function renderDiary(state) {
  const root = el("div");
  root.append(el("div", { class: "section-header" },
    el("div", {}, el("h2", { class: "display" }, "Дневник"),
                  el("p", {}, "Личные записи и общий список желаний.")),
  ));
  const grid = el("div", { class: "diary-grid" });

  const refresh = () => { const evt = new Event("hashchange"); window.dispatchEvent(evt); };

  // notes
  const ta = el("textarea", { placeholder: "Что чувствуешь? О чём думаешь? Что хочешь сказать партнёру..." });
  const addBtn = el("button", { class: "cta-btn", onclick: () => {
    const t = ta.value.trim(); if (!t) return;
    addDiary(state, state.profile, t);
    toast("Запись сохранена");
    refresh();
  } }, "Добавить запись");

  const list = el("div", {});
  (state.diary[state.profile] || []).forEach(entry => {
    list.append(el("div", { class: "diary-entry" },
      el("header", {},
        el("span", {}, formatDate(entry.ts)),
        el("button", { onclick: () => { removeDiary(state, state.profile, entry.ts); refresh(); } }, "Удалить"),
      ),
      el("p", {}, entry.text),
    ));
  });
  if (!(state.diary[state.profile] || []).length) {
    list.append(el("p", { class: "muted" }, "Записей пока нет. Напиши что-нибудь — даже одно слово."));
  }

  const notes = el("div", { class: "card" },
    el("div", { class: "card-head" },
      el("div", {},
        el("h2", {}, `${state.profile}: записи`),
        el("p", {}, "Только ты их видишь на этом устройстве."),
      ),
    ),
    el("div", { class: "diary-form" }, ta, addBtn),
    el("hr", { style: "border:0;border-top:1px solid var(--line);margin:18px 0" }),
    list,
  );

  // wishes
  const newWish = el("input", { type: "text", class: "text-input", placeholder: "Хочу вместе с тобой..." });
  const wishBtn = el("button", { class: "cta-btn", onclick: () => {
    const t = newWish.value.trim(); if (!t) return;
    addWish(state, t, state.profile);
    newWish.value = ""; refresh();
  } }, "Добавить");

  const wishList = el("div", {});
  state.wishes.forEach(w => {
    wishList.append(el("div", { class: "wish-row" + (w.done ? " done" : "") },
      el("input", { type: "checkbox", checked: w.done, onchange: () => { toggleWish(state, w.id); refresh(); } }),
      el("span", { class: "wish-text" }, w.text),
      el("span", { class: "wish-by" }, "— " + w.by),
      el("button", { onclick: () => { removeWish(state, w.id); refresh(); },
                     style: "background:transparent;color:var(--text-3);font-size:18px" }, "×"),
    ));
  });
  if (!state.wishes.length) {
    wishList.append(el("p", { class: "muted" }, "Пока пусто. Добавь идеи — мы потом по ним пройдёмся вместе."));
  }

  const suggest = el("div", { style: "margin-top:16px" },
    el("p", { class: "muted", style: "margin-bottom:8px" }, "Несколько идей, можно тапнуть:"),
    el("div", { class: "filter-row" },
      ...WISHES.slice(0, 6).map(w => el("button", { class: "filter-chip",
        onclick: () => { addWish(state, w, state.profile); refresh(); } }, w)),
    ),
  );

  const wishes = el("div", { class: "card" },
    el("div", { class: "card-head" },
      el("div", {}, el("h2", {}, "Наши желания"),
                    el("p", {}, "Общий список — видят оба.")),
    ),
    el("div", { style: "display:flex;gap:10px;margin-bottom:14px" }, newWish, wishBtn),
    wishList, suggest,
  );

  grid.append(notes, wishes);
  root.append(grid);
  return root;
}
