/* ===========================================================
   Интерактивный «видеоурок»: движок таймлайна
   Всё состояние — функция от времени t, поэтому перемотка
   работает честно, без «догоняющих» анимаций.
   =========================================================== */

(function () {
  "use strict";

  /* ---------------- Сценарий по умолчанию ---------------- */
  /* Остальные сценарии лежат в assets/js/scripts.js.
     Страница выбирает свой через <div class="player" data-script="v3">. */
  var DEFAULT_SCRIPT = {
    duration: 49,
    cps: 34, // символов в секунду при наборе текста

    lines: [
      {
        at: 2.5,
        segs: [
          { t: "Console", c: "type" },
          { t: "." },
          { t: "WriteLine", c: "type" },
          { t: "(" },
          { t: '"Привет, мир!"', c: "str" },
          { t: ");" }
        ]
      },
      {
        at: 26.5,
        segs: [
          { t: "Console", c: "type" },
          { t: "." },
          { t: "WriteLine", c: "type" },
          { t: "(" },
          { t: "2 + 2", c: "num" },
          { t: ");" }
        ]
      }
    ],

    out: [
      { at: 21.2, text: "C:\\dev\\csharp\\Hello> dotnet run", cls: "dim" },
      { at: 22.4, text: "Привет, мир!", cls: "ok" },
      { at: 31.0, text: "C:\\dev\\csharp\\Hello> dotnet run", cls: "dim" },
      { at: 32.3, text: "4", cls: "ok" }
    ],

    captions: [
      { at: 0, text: "Программа на C# — это просто текст в файле. Сейчас напишем первую инструкцию." },
      { at: 2.5, text: "Пишем строку, которая выведет текст в консоль." },
      { at: 9, text: "Console — класс, который управляет консолью. С большой буквы, потому что это имя класса." },
      { at: 12.5, text: "WriteLine — метод: печатает текст и переводит курсор на новую строку." },
      { at: 15.8, text: "В скобках — аргумент, то есть что именно печатать. Строка всегда в двойных кавычках." },
      { at: 18.8, text: "Точка с запятой закрывает инструкцию. Без неё код даже не соберётся." },
      { at: 21, text: "Запускаем командой dotnet run." },
      { at: 22.6, text: "Работает: текст появился в консоли. Это уже настоящая программа." },
      { at: 26.5, text: "Добавим вторую строку — C# умеет считать прямо в аргументе." },
      { at: 30, text: "Запускаем ещё раз." },
      { at: 33.5, text: "Сумма посчиталась до вывода: 2 + 2 превратилось в 4 ещё на этапе компиляции." },
      { at: 37, text: "Вот и всё: две инструкции, каждая заканчивается точкой с запятой." },
      { at: 41, text: "Дальше — переменные и типы данных. Но сначала короткая проверка." },
      { at: 44, text: "Теперь повтори сам: открой папку Hello, поменяй текст и снова выполни dotnet run." }
    ],

    marks: [
      { from: 9, to: 12.5, line: 0, seg: 0 },
      { from: 12.5, to: 15.8, line: 0, seg: 2 },
      { from: 15.8, to: 18.8, line: 0, seg: 4 },
      { from: 18.8, to: 21, line: 0, seg: 5 }
    ],

    chapters: [
      { t: 0, title: "Вступление" },
      { t: 2.5, title: "Пишем код" },
      { t: 9, title: "Разбор строки" },
      { t: 21, title: "Запуск" },
      { t: 26.5, title: "Вторая строка" },
      { t: 37, title: "Итог" }
    ],

    checkpoint: {
      at: 43.5,
      q: "Зачем в конце строки нужна точка с запятой?",
      options: [
        "Чтобы напечатать текст в консоль",
        "Чтобы закрыть инструкцию — без неё код не соберётся",
        "Так начинается комментарий"
      ],
      correct: 1,
      explain: "Точка с запятой — признак конца оператора. Забудешь — компилятор остановит сборку и покажет строку с ошибкой."
    }
  };

  var stageEl = document.querySelector(".player");
  var scriptId = stageEl ? stageEl.getAttribute("data-script") : "";
  var SCRIPT = (window.LESSON_SCRIPTS && window.LESSON_SCRIPTS[scriptId]) || DEFAULT_SCRIPT;

  /* ---------------- Элементы ---------------- */
  var dom = {
    code: document.getElementById("code-body"),
    out: document.getElementById("out-body"),
    cc: document.getElementById("cc-text"),
    badge: document.getElementById("badge"),
    play: document.getElementById("btn-play"),
    bigPlay: document.getElementById("big-play"),
    restart: document.getElementById("btn-restart"),
    track: document.getElementById("track"),
    fill: document.getElementById("fill"),
    knob: document.getElementById("knob"),
    marks: document.getElementById("marks"),
    tCur: document.getElementById("t-cur"),
    tDur: document.getElementById("t-dur"),
    speed: document.getElementById("speed"),
    chapters: document.getElementById("chapters"),
    cp: document.getElementById("checkpoint"),
    cpQ: document.getElementById("cp-q"),
    cpOpts: document.getElementById("cp-opts"),
    cpRes: document.getElementById("cp-res")
  };

  if (!dom.code || !dom.track) { return; }

  /* ---------------- Состояние ---------------- */
  var t = 0;
  var playing = false;
  var speed = 1;
  var raf = 0;
  var lastTs = 0;
  var cpDone = false;
  var dragging = false;

  var lastCode = null;
  var lastOut = null;
  var lastCap = null;
  var lastBadge = null;

  /* ---------------- Утилиты ---------------- */
  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function fmt(sec) {
    var total = Math.max(0, Math.floor(sec));
    var m = Math.floor(total / 60);
    var s = total % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function lineLength(line) {
    return line.segs.reduce(function (n, seg) { return n + seg.t.length; }, 0);
  }

  function isMarked(lineIdx, segIdx, time) {
    for (var i = 0; i < SCRIPT.marks.length; i++) {
      var mk = SCRIPT.marks[i];
      if (mk.line === lineIdx && mk.seg === segIdx && time >= mk.from && time < mk.to) {
        return true;
      }
    }
    return false;
  }

  /* ---------------- Рендер сцены ---------------- */
  function buildCode(time) {
    var html = "";

    for (var i = 0; i < SCRIPT.lines.length; i++) {
      var line = SCRIPT.lines[i];
      if (time < line.at) { continue; }

      var total = lineLength(line);
      var typed = Math.min(total, Math.floor((time - line.at) * SCRIPT.cps));
      var left = typed;
      var inner = "";

      for (var j = 0; j < line.segs.length; j++) {
        if (left <= 0) { break; }

        var seg = line.segs[j];
        var part = seg.t.slice(0, left);
        left -= part.length;

        var cls = [];
        if (seg.c) { cls.push("s-" + seg.c); }
        if (isMarked(i, j, time)) { cls.push("hl"); }

        inner += cls.length
          ? '<span class="' + cls.join(" ") + '">' + esc(part) + "</span>"
          : esc(part);
      }

      if (typed < total) {
        inner += '<span class="caret"></span>';
      }

      html += '<span class="code-line">' + inner + "</span>";
    }

    if (!html) {
      // пустой редактор ждёт первую строку — показываем только курсор
      html = '<span class="code-line"><span class="caret"></span></span>';
    }

    return html;
  }

  function buildOut(time) {
    var html = "";

    for (var i = 0; i < SCRIPT.out.length; i++) {
      var row = SCRIPT.out[i];
      if (time < row.at) { continue; }
      html += '<span class="out-line out-line--' + (row.cls || "dim") + '">' + esc(row.text) + "</span>";
    }

    return html;
  }

  function captionAt(time) {
    var text = "";
    for (var i = 0; i < SCRIPT.captions.length; i++) {
      if (time >= SCRIPT.captions[i].at) { text = SCRIPT.captions[i].text; }
    }
    return text;
  }

  function chapterAt(time) {
    var title = SCRIPT.chapters[0].title;
    for (var i = 0; i < SCRIPT.chapters.length; i++) {
      if (time >= SCRIPT.chapters[i].t) { title = SCRIPT.chapters[i].title; }
    }
    return title;
  }

  function render() {
    var code = buildCode(t);
    if (code !== lastCode) {
      dom.code.innerHTML = code;
      lastCode = code;
    }

    var out = buildOut(t);
    if (out !== lastOut) {
      dom.out.innerHTML = out;
      lastOut = out;
    }

    var cap = captionAt(t);
    if (cap !== lastCap) {
      dom.cc.textContent = cap;
      lastCap = cap;
    }

    var badge = chapterAt(t);
    if (badge !== lastBadge) {
      dom.badge.textContent = badge;
      lastBadge = badge;
      var btns = dom.chapters.querySelectorAll("button");
      for (var i = 0; i < btns.length; i++) {
        btns[i].classList.toggle("is-active", btns[i].getAttribute("data-title") === badge);
      }
    }

    var pct = SCRIPT.duration ? (t / SCRIPT.duration) * 100 : 0;
    dom.fill.style.width = pct + "%";
    dom.knob.style.left = pct + "%";
    dom.tCur.textContent = fmt(t);
    dom.play.textContent = playing ? "❚❚" : "▶";
    dom.play.setAttribute("aria-label", playing ? "Пауза" : "Играть");
  }

  /* ---------------- Воспроизведение ---------------- */
  function setPlaying(on) {
    if (on && t >= SCRIPT.duration) {
      t = 0;
      cpDone = false;
    }

    playing = on;
    dom.play.textContent = on ? "❚❚" : "▶";
    dom.play.setAttribute("aria-label", on ? "Пауза" : "Играть");
    dom.bigPlay.hidden = !(!on && t < 0.05);

    if (on) {
      lastTs = performance.now();
      if (!raf) { raf = requestAnimationFrame(tick); }
    } else if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  function tick(now) {
    raf = 0;
    if (!playing) { return; }

    var dt = Math.min(0.06, (now - lastTs) / 1000);
    lastTs = now;
    t += dt * speed;

    var cp = SCRIPT.checkpoint;
    if (cp && !cpDone && t >= cp.at) {
      t = cp.at;
      render();
      openCheckpoint();
      return;
    }

    if (t >= SCRIPT.duration) {
      t = SCRIPT.duration;
      render();
      setPlaying(false);
      return;
    }

    render();
    raf = requestAnimationFrame(tick);
  }

  function seek(time) {
    t = Math.max(0, Math.min(SCRIPT.duration, time));

    // если открыта проверка, а пользователь полез по таймлайну — закрываем её
    if (!dom.cp.hidden) {
      dom.cp.hidden = true;
      cpAnswered = true;
    }

    var cp = SCRIPT.checkpoint;
    if (cp && !cpDone && t >= cp.at) {
      cpDone = true;
      dom.cp.hidden = true;
    }

    render();
    dom.bigPlay.hidden = !(!playing && t < 0.05);
  }

  /* ---------------- Проверка посередине ---------------- */
  var cpAnswered = false;

  function openCheckpoint() {
    setPlaying(false);
    if (cpAnswered) { return; }

    var cp = SCRIPT.checkpoint;
    dom.cpQ.textContent = cp.q;
    dom.cpOpts.innerHTML = "";

    cp.options.forEach(function (text, idx) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "checkpoint__opt";
      btn.textContent = text;
      btn.addEventListener("click", function () { answerCheckpoint(idx, btn); });
      dom.cpOpts.appendChild(btn);
    });

    dom.cpRes.textContent = "";
    dom.cpRes.classList.remove("is-ok");
    dom.cp.hidden = false;

    var first = dom.cpOpts.querySelector(".checkpoint__opt");
    if (first) { first.focus(); }
  }

  function answerCheckpoint(idx, btn) {
    var cp = SCRIPT.checkpoint;
    var isRight = idx === cp.correct;

    var all = dom.cpOpts.querySelectorAll(".checkpoint__opt");
    for (var i = 0; i < all.length; i++) {
      all[i].disabled = true;
      if (i === cp.correct) { all[i].classList.add("ok"); }
    }
    if (!isRight) { btn.classList.add("bad"); }

    dom.cpRes.textContent = (isRight ? "Верно. " : "Не то — правильный ответ зелёный. ") + cp.explain;
    dom.cpRes.classList.toggle("is-ok", isRight);

    cpAnswered = true;
    cpDone = true;

    setTimeout(function () {
      dom.cp.hidden = true;
      t = Math.min(SCRIPT.duration - 0.1, t + 0.6);
      render();
      setPlaying(true);
    }, 1500);
  }

  /* ---------------- Интерфейс ---------------- */
  function buildChrome() {
    dom.tDur.textContent = fmt(SCRIPT.duration);

    dom.marks.innerHTML = SCRIPT.chapters
      .filter(function (ch) { return ch.t > 0; })
      .map(function (ch) {
        return '<span class="track__mark" style="left:' + (ch.t / SCRIPT.duration) * 100 + '%"></span>';
      })
      .join("");

    dom.chapters.innerHTML = SCRIPT.chapters
      .map(function (ch, i) {
        return (
          '<li><button type="button" data-t="' + ch.t + '" data-title="' + esc(ch.title) + '">' +
          '<span class="t">' + fmt(ch.t) + "</span>" + esc(ch.title) +
          "</button></li>"
        );
      })
      .join("");

    dom.chapters.addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (!btn) { return; }
      seek(parseFloat(btn.getAttribute("data-t")));
    });
  }

  function trackPos(e) {
    var rect = dom.track.getBoundingClientRect();
    if (!rect.width) { return 0; }
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  }

  function bind() {
    dom.play.addEventListener("click", function () { setPlaying(!playing); });
    dom.bigPlay.addEventListener("click", function () { t = 0; render(); setPlaying(true); });

    dom.restart.addEventListener("click", function () {
      setPlaying(false);
      cpDone = false;
      cpAnswered = false;
      dom.cp.hidden = true;
      t = 0;
      render();
      dom.bigPlay.hidden = false;
    });

    dom.speed.addEventListener("change", function () {
      speed = parseFloat(dom.speed.value) || 1;
    });

    dom.track.addEventListener("pointerdown", function (e) {
      dragging = true;
      if (dom.track.setPointerCapture) {
        try { dom.track.setPointerCapture(e.pointerId); } catch (err) {}
      }
      seek(trackPos(e) * SCRIPT.duration);
    });

    dom.track.addEventListener("pointermove", function (e) {
      if (dragging) { seek(trackPos(e) * SCRIPT.duration); }
    });

    dom.track.addEventListener("pointerup", function () { dragging = false; });
    dom.track.addEventListener("pointercancel", function () { dragging = false; });

    dom.track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); seek(t - 2); }
      if (e.key === "ArrowRight") { e.preventDefault(); seek(t + 2); }
    });

    document.addEventListener("keydown", function (e) {
      var tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "select" || tag === "textarea" || tag === "button") { return; }
      if (!dom.cp.hidden) { return; }

      if (e.code === "Space") {
        e.preventDefault();
        setPlaying(!playing);
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        seek(t - 2);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        seek(t + 2);
      }
    });
  }

  buildChrome();
  bind();
  render();
  dom.bigPlay.hidden = false;
})();
