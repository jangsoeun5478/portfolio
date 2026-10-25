(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
  const printing = () => matchMedia("print").matches;

  /* 스크롤 진행 표시 */
  const bar = $("#progressBar");
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.width = (max > 0 ? (scrollY / max) * 100 : 0) + "%";
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* 알림 · 이메일 복사 */
  const toastEl = $("#toast");
  let toastTimer;
  const toast = (msg) => {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-on"), 2200);
  };
  $$("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); toast("이메일 주소를 복사했습니다"); }
    catch { toast(b.dataset.copy); }
  }));

  /* 숫자: HTML에 최종값이 있고, 화면에 들어올 때 최종값의 70%부터 올라가는 효과만 더함 */
  const countUp = (el) => {
    const end = Number(el.dataset.count);
    if (reduced || printing() || !end) return;
    const start = end * 0.7, t0 = performance.now();
    const step = (t) => {
      const p = printing() ? 1 : Math.min(1, (t - t0) / 1000);
      el.textContent = Math.round(start + (end - start) * (1 - Math.pow(1 - p, 3))).toLocaleString("ko-KR");
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const onView = (el, fn) => {
    if (!el) return;
    new IntersectionObserver((en, ob) => { if (en[0].isIntersecting) { fn(); ob.disconnect(); } }, { threshold: 0.35 }).observe(el);
  };
  $$("[data-count]").forEach((el) => onView(el, () => countUp(el)));

  /* 운영 로그: 한 줄씩 강조 */
  const log = $("#log");
  if (log && !reduced) {
    const rows = $$("li", log);
    let k = 0;
    setInterval(() => { rows.forEach((r, i) => r.classList.toggle("is-on", i === k)); k = (k + 1) % rows.length; }, 1800);
  }

  /* 탭형 목록 공통 (운영 업무, 원인 추적, 해외 연동) */
  const tabset = (root, btnSel, paneSel, key) => {
    if (!root) return;
    const btns = $$(btnSel, root), panes = $$(paneSel, root);
    const show = (b) => {
      btns.forEach((x) => x.setAttribute("aria-selected", x === b));
      panes.forEach((p) => {
        const on = p.dataset[key] === b.dataset[key];
        p.hidden = !on;
        if (on) { p.classList.remove("pane-in"); void p.offsetWidth; p.classList.add("pane-in"); }
      });
    };
    btns.forEach((b, i) => {
      b.addEventListener("click", () => show(b));
      b.addEventListener("keydown", (e) => {
        if (!["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(e.key)) return;
        e.preventDefault();
        const n = btns[(i + (e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : btns.length - 1)) % btns.length];
        n.focus(); show(n);
      });
    });
  };
  tabset($("#duties"), ".duty", ".duties__pane", "d");
  tabset($("#traceBox"), ".trace__item", ".trace__pane", "t");
  tabset($("#gtabs"), ".tabs__btns button", ".tabs__pane", "g");

  /* 차지백 처리 흐름 */
  const cb = $("#cbFlow");
  if (cb) {
    const steps = $$("li", cb);
    const out = $("#cbOut");
    const OUT = {
      win: ["소명 인정", "매출 유지. 결과를 현황표에 기록하고 종결합니다."],
      again: ["재접수", "추가 증빙을 받아 기한 안에 n차 소명을 회신합니다."],
      lose: ["패소", "부담 주체를 확인하고 매입대금 차감 예정일을 내부에 안내합니다."],
    };
    const setOut = (res) => { out.dataset.res = res; out.innerHTML = `<b>${OUT[res][0]}</b>${OUT[res][1]}`; };
    let run = 0;
    const play = async (res) => {
      const id = ++run;
      steps.forEach((s) => s.classList.remove("is-on", "is-done"));
      for (const s of steps) {
        s.classList.add("is-on"); await sleep(420); if (id !== run) return;
        s.classList.remove("is-on"); s.classList.add("is-done");
      }
      setOut(res);
    };
    $$("[data-cb]", cb).forEach((b) => b.addEventListener("click", () => {
      $$("[data-cb]", cb).forEach((x) => x.setAttribute("aria-pressed", x === b));
      play(b.dataset.cb);
    }));
    steps.forEach((s) => s.classList.add("is-done"));
    setOut("win");
    onView(cb, () => play("win"));
    addEventListener("beforeprint", () => { run++; steps.forEach((s) => { s.classList.remove("is-on"); s.classList.add("is-done"); }); });
  }

  /* 체크리스트 진행률 */
  const check = $("#check");
  if (check) {
    const boxes = $$("input[type=checkbox]", check);
    const fill = $("#checkFill"), num = $("#checkNum");
    const upd = () => {
      const n = boxes.filter((b) => b.checked).length;
      fill.style.width = (n / boxes.length) * 100 + "%";
      num.textContent = `${n} / ${boxes.length}`;
      if (n === boxes.length) toast("체크리스트를 모두 확인했습니다 (예시)");
    };
    boxes.forEach((b) => b.addEventListener("change", upd));
    upd();
  }

  /* QA 케이스 필터 */
  const qaSeg = $("#qaSeg");
  if (qaSeg) {
    const btns = $$("button", qaSeg);
    btns.forEach((b) => b.addEventListener("click", () => {
      btns.forEach((x) => x.setAttribute("aria-pressed", x === b));
      $$("#qaTbl tbody tr").forEach((tr) => (tr.hidden = b.dataset.f !== "all" && tr.dataset.k !== b.dataset.f));
    }));
  }

  /* 개설 서류 자동 작성 데모 */
  const DOCS = [
    { org: "결제사 A", title: "가맹점 신규 등록 신청서", rows: [["신청일", "date"], ["간판명", "sign"], ["입금계좌", "acct"], ["담당자", "req"]] },
    { org: "결제사 B", title: "하위가맹점 등록 요청서", rows: [["가맹점명", "sign"], ["요청자", "req"], ["접수일자", "date"], ["대금계좌", "acct"]] },
    { org: "결제사 C", title: "가맹점 개설 의뢰서", rows: [["대금 입금계좌", "acct"], ["작성일", "date"], ["상호(간판)", "sign"], ["의뢰자", "req"]] },
  ];
  const form = $("#demoForm"), docsEl = $("#docs");
  if (form && docsEl) {
    const data = () => Object.fromEntries(new FormData(form));
    const render = (filled) => {
      const d = data();
      docsEl.innerHTML = DOCS.map((doc) => `
        <div class="doc${filled ? " is-done" : ""}">
          <div class="doc__top"><b>${doc.org}</b><span class="chip${filled ? " chip--ok" : ""}">${filled ? "작성 완료" : "대기"}</span></div>
          <div class="doc__name">${doc.title}</div>
          ${doc.rows.map(([l, k]) => `<div class="doc__row"><span>${l}</span><output data-key="${k}">${filled ? (d[k] || "-") : ""}</output></div>`).join("")}
        </div>`).join("");
    };
    render(true);
    let busy = false;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (busy) return;
      busy = true;
      render(false);
      const d = data();
      for (const card of $$(".doc", docsEl)) {
        for (const o of $$("output", card)) {
          const t = (d[o.dataset.key] || "-").trim() || "-";
          if (reduced) o.textContent = t;
          else for (let i = 1; i <= t.length; i += Math.max(1, Math.ceil(t.length / 8))) { o.textContent = t.slice(0, i); await sleep(16); }
          o.textContent = t;
        }
        card.classList.add("is-done");
        const c = $(".chip", card); c.textContent = "작성 완료"; c.classList.add("chip--ok");
      }
      toast(`한 번 입력으로 서류 ${DOCS.length}종을 만들었습니다 (예시)`);
      busy = false;
    });
  }

  /* PDF 저장 */
  $("#printBtn")?.addEventListener("click", () => print());
})();
