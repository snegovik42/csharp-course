/* ===========================================================
   Курс C# — общая логика для всех страниц
   Темы, подсветка кода, квизы, прогресс, навигация по урокам
   =========================================================== */

(function () {
  "use strict";

  /* ---------- Данные курса: единственный источник правды ---------- */
  var LESSONS = [
    {
      n: 1,
      file: "lesson-01.html",
      title: "C# и .NET: первая программа",
      short: "Как код превращается в работающую программу и как запустить первую строку на C#.",
      minutes: 15,
      tag: "Старт"
    },
    {
      n: 2,
      file: "lesson-02.html",
      title: "Переменные и типы данных",
      short: "Коробки с именами: int, double, decimal, string, bool и зачем нужен var.",
      minutes: 20,
      tag: "Основы"
    },
    {
      n: 3,
      file: "lesson-03.html",
      title: "Условия и циклы",
      short: "Программа учится выбирать и повторять: if, switch, for, while, foreach.",
      minutes: 22,
      tag: "Основы"
    },
    {
      n: 4,
      file: "lesson-04.html",
      title: "Массивы и списки",
      short: "Как хранить сто значений в одной переменной и не сойти с ума от индексов.",
      minutes: 20,
      tag: "Данные"
    },
    {
      n: 5,
      file: "lesson-05.html",
      title: "Методы",
      short: "Разбиваем программу на куски, которые можно вызывать по имени и не повторяться.",
      minutes: 18,
      tag: "Структура"
    },
    {
      n: 6,
      file: "lesson-06.html",
      title: "Классы и ООП",
      short: "Чертёж и детали: поля, свойства, конструкторы, наследование и полиморфизм.",
      minutes: 25,
      tag: "ООП"
    }
  ];

  var THEME_KEY = "cs-course-theme";
  var DONE_KEY = "cs-course-done";

  /* ---------- Утилиты ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function readDone() {
    try {
      var raw = localStorage.getItem(DONE_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.filter(function (x) { return typeof x === "number"; }) : [];
    } catch (e) {
      return [];
    }
  }

  function writeDone(list) {
    try {
      localStorage.setItem(DONE_KEY, JSON.stringify(list));
    } catch (e) { /* приватный режим — обойдёмся без сохранения */ }
  }

  function isDone(n) { return readDone().indexOf(n) !== -1; }

  function toggleDone(n) {
    var list = readDone();
    var i = list.indexOf(n);
    if (i === -1) { list.push(n); } else { list.splice(i, 1); }
    writeDone(list);
    return i === -1;
  }

  /* ---------- Тема ---------- */
  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    $$("[data-theme-toggle]").forEach(function (btn) {
      btn.textContent = theme === "dark" ? "☀" : "☾";
      btn.setAttribute("aria-label", theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему");
      btn.setAttribute("title", theme === "dark" ? "Светлая тема" : "Тёмная тема");
    });
  }

  function initTheme() {
    setTheme(currentTheme());
    $$("[data-theme-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setTheme(currentTheme() === "dark" ? "light" : "dark");
      });
    });
  }

  /* ---------- Подсветка кода C# ---------- */
  var KEYWORDS = new Set(
    ("using namespace class public private protected internal static void int uint long short byte " +
      "float double decimal bool char string object var new if else for foreach while do switch case " +
      "default break continue return true false null const readonly out ref params this base override " +
      "virtual abstract sealed struct interface enum try catch finally throw get set value in is as " +
      "lock nameof typeof sizeof where yield async await").split(" ")
  );

  var TOKEN_RE = new RegExp(
    "(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)" +            // 1 — комментарии
      "|(@\"(?:[^\"]|\"\")*\"|\"(?:\\\\.|[^\"\\\\])*\"|'(?:\\\\.|[^'\\\\])*')" + // 2 — строки и символы
      "|(\\b\\d[\\d_]*(?:[.,]\\d+)?[dDfFmMlL]?\\b)" +      // 3 — числа
      "|([A-Za-z_]\\w*)",                                   // 4 — слова
    "g"
  );

  function esc(s) {
    return s.replace(/[&<>]/g, function (c) {
      return c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;";
    });
  }

  function highlight(src) {
    var out = "";
    var last = 0;
    var m;
    TOKEN_RE.lastIndex = 0;

    while ((m = TOKEN_RE.exec(src)) !== null) {
      out += esc(src.slice(last, m.index));

      if (m[1]) {
        out += '<span class="tok-com">' + esc(m[1]) + "</span>";
      } else if (m[2]) {
        out += '<span class="tok-str">' + esc(m[2]) + "</span>";
      } else if (m[3]) {
        out += '<span class="tok-num">' + esc(m[3]) + "</span>";
      } else if (m[4]) {
        var w = m[4];
        if (KEYWORDS.has(w)) {
          out += '<span class="tok-kw">' + esc(w) + "</span>";
        } else if (/^[A-Z]/.test(w)) {
          out += '<span class="tok-type">' + esc(w) + "</span>";
        } else {
          out += esc(w);
        }
      }

      last = m.index + m[0].length;
    }

    out += esc(src.slice(last));
    return out;
  }

  function initHighlighting() {
    $$("pre > code").forEach(function (code) {
      if (code.dataset.highlighted === "yes") { return; }
      var src = code.textContent;
      if (!src.trim()) { return; }
      code.innerHTML = highlight(src);
      code.dataset.highlighted = "yes";
    });
  }

  /* ---------- Кнопки «Копировать» ---------- */
  function legacyCopy(text) {
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        ok ? resolve() : reject(new Error("copy failed"));
      } catch (err) {
        reject(err);
      }
    });
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      // при отказе в правах падаем на старый способ, а не сдаёмся
      return navigator.clipboard.writeText(text).catch(function () {
        return legacyCopy(text);
      });
    }
    return legacyCopy(text);
  }

  function initCopyButtons() {
    $$("[data-copy]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var box = btn.closest(".code");
        var code = box ? box.querySelector("code") : null;
        if (!code) { return; }

        copyText(code.textContent).then(function () {
          btn.textContent = "Скопировано";
          btn.classList.add("is-copied");
          setTimeout(function () {
            btn.textContent = "Копировать";
            btn.classList.remove("is-copied");
          }, 1600);
        }).catch(function () {
          btn.textContent = "Не вышло :(";
          setTimeout(function () { btn.textContent = "Копировать"; }, 1600);
        });
      });
    });
  }

  /* ---------- Квизы ---------- */
  function initQuizzes() {
    $$(".quiz").forEach(function (quiz) {
      var correct = parseInt(quiz.getAttribute("data-correct"), 10);
      var result = quiz.querySelector(".quiz__result");
      var explain = result ? result.getAttribute("data-explain") || "" : "";
      var opts = $$(".quiz__opt", quiz);

      opts.forEach(function (opt, idx) {
        opt.addEventListener("click", function () {
          var isRight = idx === correct;

          opts.forEach(function (other, i) {
            other.disabled = true;
            if (i === correct) { other.classList.add("is-correct"); }
          });

          if (!isRight) { opt.classList.add("is-wrong"); }

          if (result) {
            result.textContent = isRight
              ? "Верно. " + explain
              : "Не то. Правильный ответ подсвечен зелёным. " + explain;
            result.classList.add(isRight ? "is-correct" : "is-wrong");
          }
        });
      });
    });
  }

  /* ---------- Кнопка «урок пройден» ---------- */
  function initDoneButton() {
    var btn = $("[data-done]");
    if (!btn) { return; }

    var n = parseInt(btn.getAttribute("data-done"), 10);

    function paint(done) {
      btn.textContent = done ? "✓ Урок пройден" : "Отметить урок пройденным";
      btn.classList.toggle("is-done", done);
      btn.setAttribute("aria-pressed", done ? "true" : "false");
    }

    paint(isDone(n));
    btn.addEventListener("click", function () {
      paint(toggleDone(n));
    });
  }

  /* ---------- Боковое меню урока ---------- */
  function initSidebar() {
    var list = $("#sidebar-list");
    if (!list) { return; }

    var here = location.pathname.split("/").pop() || "index.html";
    var done = readDone();

    list.innerHTML = LESSONS.map(function (l) {
      var cls = [];
      if (l.file === here) { cls.push("is-active"); }
      if (done.indexOf(l.n) !== -1) { cls.push("is-done"); }
      return (
        '<li><a class="' + cls.join(" ") + '" href="' + l.file + '">' +
        '<span class="n">' + String(l.n).padStart(2, "0") + "</span>" +
        "<span>" + esc(l.title) + "</span></a></li>"
      );
    }).join("");
  }

  /* ---------- Переходы между уроками ---------- */
  function initLessonNav() {
    var nav = $("#lesson-nav");
    if (!nav) { return; }

    var here = location.pathname.split("/").pop() || "";
    var idx = LESSONS.findIndex(function (l) { return l.file === here; });
    if (idx === -1) { return; }

    var prev = LESSONS[idx - 1];
    var next = LESSONS[idx + 1];
    var html = "";

    if (prev) {
      html += '<a href="' + prev.file + '"><span>← Предыдущий</span>' + esc(prev.title) + "</a>";
    }
    if (next) {
      html += '<a class="next" href="' + next.file + '"><span>Следующий →</span>' + esc(next.title) + "</a>";
    }
    if (!next) {
      html += '<a class="next" href="index.html"><span>Курс →</span>Вернуться к списку уроков</a>';
    }

    nav.innerHTML = html;
  }

  /* ---------- Главная: карточки и прогресс ---------- */
  function initCourseGrid() {
    var grid = $("#cards");
    if (!grid) { return; }

    var done = readDone();
    var fill = $("#progress-fill");
    var label = $("#progress-text");

    grid.innerHTML = LESSONS.map(function (l) {
      var isDoneLesson = done.indexOf(l.n) !== -1;
      return (
        '<a class="card' + (isDoneLesson ? " is-done" : "") + '" href="' + l.file + '">' +
        '<div class="card__top">' +
        '<span class="card__num">УРОК ' + String(l.n).padStart(2, "0") + "</span>" +
        '<span class="chip">' + esc(l.tag) + "</span>" +
        "</div>" +
        "<h3>" + esc(l.title) + "</h3>" +
        "<p>" + esc(l.short) + "</p>" +
        '<div class="card__meta"><span>' + l.minutes + " мин</span><span>·</span><span>консоль</span></div>" +
        "</a>"
      );
    }).join("");

    if (fill && label) {
      var pct = Math.round((done.length / LESSONS.length) * 100);
      fill.style.width = pct + "%";
      label.textContent = done.length + " из " + LESSONS.length;
    }
  }

  /* ---------- Полоса прогресса чтения ---------- */
  function initReadBar() {
    var bar = $("#readbar");
    if (!bar) { return; }

    var ticking = false;

    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.width = Math.min(100, Math.max(0, pct)) + "%";
      ticking = false;
    }

    window.addEventListener("scroll", function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });

    window.addEventListener("resize", update);
    update();
  }

  /* ---------- Старт ---------- */
  function init() {
    initTheme();
    initHighlighting();
    initCopyButtons();
    initQuizzes();
    initDoneButton();
    initSidebar();
    initLessonNav();
    initCourseGrid();
    initReadBar();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
