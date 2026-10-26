// 공통 동작: 스크롤 연출, 옆 진행 점, 가맹점 개설 재생, 탭, 이메일 복사, PDF 저장, 체크리스트, 서류 자동 작성 데모.
// 내용은 모두 HTML에 들어 있고, 스크립트가 없어도 그대로 읽힌다.
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 스크롤 연출: 화면에 들어오면 .in 을 붙인다
  if ("IntersectionObserver" in window && !reduce) {
    root.classList.add("js");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll(".rv").forEach(function (el) { io.observe(el); });
    window.addEventListener("beforeprint", function () { document.querySelectorAll(".rv").forEach(function (el) { el.classList.add("in"); }); });
  }

  // 옆 진행 점: [data-dot] 섹션마다 점 하나
  var secs = document.querySelectorAll("[data-dot]");
  if (secs.length > 1 && "IntersectionObserver" in window) {
    var nav = document.createElement("nav");
    nav.className = "dots"; nav.setAttribute("aria-label", "섹션 이동");
    var links = [];
    secs.forEach(function (s) {
      var a = document.createElement("a");
      a.href = "#" + s.id; a.setAttribute("aria-label", s.dataset.dot); a.title = s.dataset.dot;
      nav.appendChild(a); links.push(a);
    });
    document.body.appendChild(nav);
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var i = Array.prototype.indexOf.call(secs, e.target);
        links.forEach(function (a, j) { a.classList.toggle("on", j === i); });
      });
    }, { rootMargin: "-45% 0px -45% 0px" });
    secs.forEach(function (s) { spy.observe(s); });
  }

  // 가맹점 개설 재생: 단계마다 관여하는 곳을 켜고 설명을 바꾼다
  var player = document.querySelector("[data-player]");
  if (player) {
    var steps = player.querySelectorAll(".steps button");
    var nodes = player.querySelectorAll("[data-node]");
    var caps = player.querySelectorAll("[data-cap]");
    var toggle = player.querySelector("[data-toggle]");
    var cur = 0, timer = null, playing = !reduce, DUR = 4200;
    player.style.setProperty("--dur", DUR + "ms");
    var show = function (i) {
      cur = i;
      var on = (steps[i].dataset.on || "").split(" ");
      steps.forEach(function (b, j) {
        b.setAttribute("aria-selected", j === i ? "true" : "false");
        var bar = b.querySelector(".bar");
        if (bar) { bar.classList.remove("run"); if (j === i && playing) { void bar.offsetWidth; bar.classList.add("run"); } }
      });
      nodes.forEach(function (n) { n.classList.toggle("on", on.indexOf(n.dataset.node) > -1); });
      caps.forEach(function (c, j) { c.hidden = j !== i; });
    };
    var tick = function () { clearTimeout(timer); if (playing) timer = setTimeout(function () { show((cur + 1) % steps.length); tick(); }, DUR); };
    var setPlay = function (p) { playing = p; if (toggle) toggle.textContent = p ? "일시정지" : "자동 재생"; show(cur); tick(); };
    steps.forEach(function (b, j) { b.addEventListener("click", function () { setPlay(false); show(j); }); });
    if (toggle) toggle.addEventListener("click", function () { setPlay(!playing); });
    // 화면에 보일 때만 재생
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { if (!e.isIntersecting) clearTimeout(timer); else tick(); }); }).observe(player);
    }
    setPlay(playing);
  }

  // 탭: [data-tabs] 안의 button[data-target] 이 같은 범위의 [data-panel] 을 연다
  document.querySelectorAll("[data-tabs]").forEach(function (group) {
    var buttons = group.querySelectorAll("button[data-target]");
    var scope = group.closest("[data-tab-scope]") || document;
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        buttons.forEach(function (b) {
          var on = b === btn;
          b.setAttribute("aria-selected", on ? "true" : "false");
          var panel = scope.querySelector('[data-panel="' + b.dataset.target + '"]');
          if (panel) panel.hidden = !on;
        });
      });
    });
  });

  // 이메일 복사
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.dataset.copy;
      var done = function () { var t = btn.textContent; btn.textContent = "복사됨"; setTimeout(function () { btn.textContent = t; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
    });
  });

  // PDF 저장
  document.querySelectorAll("[data-print]").forEach(function (btn) {
    btn.addEventListener("click", function () { window.print(); });
  });

  // 체크리스트 진행 표시
  var check = document.querySelector("[data-check]");
  if (check) {
    var boxes = check.querySelectorAll("input[type=checkbox]");
    var out = document.querySelector("[data-check-count]");
    var update = function () {
      var n = 0; boxes.forEach(function (b) { if (b.checked) n++; });
      if (out) out.textContent = n + " / " + boxes.length + " 확인";
    };
    boxes.forEach(function (b) { b.addEventListener("change", update); });
    update();
  }

  // 서류 자동 작성 데모
  var demo = document.querySelector("[data-demo]");
  if (demo) {
    demo.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = {};
      demo.querySelectorAll("input[name]").forEach(function (i) { data[i.name] = i.value.trim() || i.placeholder; });
      document.querySelectorAll("[data-form]").forEach(function (card, idx) {
        setTimeout(function () {
          card.querySelectorAll("[data-field]").forEach(function (f) { f.textContent = data[f.dataset.field]; });
          card.classList.add("done");
          var st = card.querySelector("em"); if (st) st.textContent = "작성 완료";
        }, 180 * idx);
      });
    });
  }
})();
