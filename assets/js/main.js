// 공통 동작: 탭, 이메일 복사, PDF 저장, 체크리스트, 서류 자동 작성 데모.
// 숫자는 HTML에 최종값으로 들어 있고, 스크립트가 없어도 내용은 모두 읽힌다.
(function () {
  // 탭: [data-tabs] 안의 button[data-target] 이 같은 그룹의 [data-panel] 을 연다
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
