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
    // 인쇄 · PDF 저장 때는 모두 확인한 상태로 보여 주고, 끝나면 되돌림
    let saved = null;
    addEventListener("beforeprint", () => { saved = boxes.map((b) => b.checked); boxes.forEach((b) => (b.checked = true)); fill.style.width = "100%"; num.textContent = `${boxes.length} / ${boxes.length}`; });
    addEventListener("afterprint", () => { if (saved) boxes.forEach((b, k) => (b.checked = saved[k])); saved = null; fill.style.width = (boxes.filter((b) => b.checked).length / boxes.length) * 100 + "%"; num.textContent = `${boxes.filter((b) => b.checked).length} / ${boxes.length}`; });
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
    { org: "카드사 A", title: "가맹점 신규 등록 신청서", rows: [["신청일", "date"], ["간판명", "sign"], ["입금계좌", "acct"], ["담당자", "req"]] },
    { org: "카드사 B", title: "하위가맹점 등록 요청서", rows: [["가맹점명", "sign"], ["요청자", "req"], ["접수일자", "date"], ["대금계좌", "acct"]] },
    { org: "카드사 C", title: "가맹점 개설 의뢰서", rows: [["대금 입금계좌", "acct"], ["작성일", "date"], ["상호(간판)", "sign"], ["의뢰자", "req"]] },
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

  /* 홈: 단계 지도 (고객 · 가맹점 · PG · VAN · 카드사) */
  // links: 고객-가맹점, 가맹점-PG, PG-VAN, VAN-카드사 / fwd 요청 · rev 대금 · both 양방향 · opt 경유 가능 · off 없음
  const STAGES = [
    {
      label: "개설", sub: "가맹점번호 · 특약",
      on: [1, 2, 3, 4], links: ["off", "fwd", "fwd", "fwd"],
      title: "가맹점번호 하나로 결제가 열리기까지",
      ctx: ["국내 · 해외 사업자 가맹점이 입점할 수 있도록 전 과정을 맡았습니다.", "애플 · 해외 PSP의 국내 카드 결제도 이 과정으로 열었습니다."],
      steps: ["가맹점번호 채번", "특약 반영", "단말기ID 채번", "하위몰 심사", "QA", "실제 연동"],
    },
    {
      label: "심사", sub: "하위몰 심사",
      on: [1, 2, 4], links: ["off", "fwd", "opt", "both"],
      title: "카드사 심사를 넘어 입점하기까지",
      ctx: ["결제대행 가맹점은 카드사의 하위몰 심사를 거쳐야 입점합니다.", "반송되면 사유를 직접 확인하고 카드사와 협의했습니다."],
      mine: ["심사 부서에 카드사 기준 가이드 제공", "반송 사유 확인과 카드사 협의", "카드사 정기 점검 회신"],
    },
    {
      label: "승인", sub: "인증 · 한도",
      on: [0, 1, 2, 3, 4], links: ["fwd", "fwd", "opt", "both"],
      title: "결제가 막히지 않도록",
      ctx: ["카드사마다 인증 기준과 한도가 다릅니다.", "오픈 전에 차이를 맞추고, 실패하면 원인부터 찾습니다."],
      mine: ["카드사별 인증 · 한도 정책 관리", "게임 결제 일 한도 예외 승인 협의", "승인 실패 원인 규명과 카드사 협의"],
    },
    {
      label: "매입", sub: "VAN · 정산",
      on: [2, 3, 4], links: ["off", "off", "both", "both"],
      title: "승인된 거래가 대금이 되기까지",
      ctx: ["매입 VAN 다중화를 PM으로 맡아 무중단으로 전환했습니다.", "쌓여 있던 정산 반송은 원인을 찾아 정리했습니다."],
      mine: ["매입 VAN 다중화 PM", "QA 시나리오 설계와 오픈 전 검증", "차액정산 반송 재매입과 재발 방지"],
    },
    {
      label: "분쟁", sub: "차지백",
      on: [0, 1, 2, 3, 4], links: ["both", "both", "both", "both"],
      actors: [
        { icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>', label: "해외카드" },
        { icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10l9-6 9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8"/><path d="M3 21h18"/></svg>', label: "발급사" },
        { icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18"/></svg>', label: "브랜드사" },
        { icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h9l3 3v15H6z"/><path d="M9 10h6M9 14h6M9 18h4"/></svg>', label: "매입사" },
        { icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/></svg>', label: "가맹점", me: true },
      ],
      legend: ["차지백 접수 (해외카드 → 가맹점)", "소명자료 제출 (가맹점 → 해외카드)"],
      title: "결제 이후의 분쟁까지",
      ctx: ["해외카드 차지백은 기한 안에 소명하지 못하면 매입대금이 차감됩니다.", "접수부터 결과까지 맡고, 처리 순서를 SOP로 남겼습니다."],
      mine: ["차지백 접수 · 분석 · 소명 · 결과 관리", "소명 처리 순서 SOP 작성"],
    },
  ];
  const lifeEl = $("#life");
  if (lifeEl) {
    const tabs = $(".life__tabs", lifeEl);
    const pane = $("#lifePane");
    const actors = $$(".actor", lifeEl);
    const links = $$(".link", lifeEl);
    const life = $$("#lifeline span");
    const legendEl = $("#lifeLegend");
    const defLegend = legendEl ? legendEl.innerHTML : "";
    const defActors = actors.map((a) => ({ html: a.innerHTML, me: a.classList.contains("actor--me") }));
    tabs.innerHTML = STAGES.map((s, i) => `<button class="life__tab" role="tab" type="button" aria-selected="${i === 0}" data-i="${i}">${s.label}<small>${s.sub}</small><span class="bar"></span></button>`).join("");
    const paneHTML = (s) => `
      <h3>${s.title}</h3>
      <p class="life__ctx">${s.ctx.join("<br />")}</p>
      ${s.steps ? `<ol class="life__steps">${s.steps.map((t) => `<li>${t}</li>`).join("")}</ol>` : ""}
      ${s.mine ? `<ul class="life__list">${s.mine.map((m) => `<li>${m}</li>`).join("")}</ul>` : ""}`;
    let cur = 0, timer = null, auto = !reduced;
    const render = (i) => {
      cur = i;
      const s = STAGES[i];
      $$(".life__tab", tabs).forEach((t, k) => t.setAttribute("aria-selected", k === i));
      life.forEach((l, k) => l.classList.toggle("is-on", k === i));
      actors.forEach((a, k) => {
        const alt = s.actors && s.actors[k];
        if (alt) { a.innerHTML = `<b>${alt.icon}</b><span>${alt.label}</span>`; a.classList.toggle("actor--me", !!alt.me); }
        else { a.innerHTML = defActors[k].html; a.classList.toggle("actor--me", defActors[k].me); }
        a.classList.toggle("is-on", s.on.includes(k)); a.classList.toggle("is-dim", !s.on.includes(k));
      });
      if (legendEl) legendEl.innerHTML = s.legend ? `<span>${s.legend[0]}</span><span class="m">${s.legend[1]}</span>` : defLegend;
      links.forEach((l, k) => { const st = s.links[k]; l.className = "link" + (st === "off" ? "" : st === "opt" ? " is-opt" : " " + st); });
      pane.innerHTML = paneHTML(s);
      pane.classList.remove("pane-in"); void pane.offsetWidth; pane.classList.add("pane-in");
    };
    const progress = () => {
      clearInterval(timer);
      if (!auto) return;
      const b = $$(".life__tab .bar", tabs)[cur];
      let p = 0;
      timer = setInterval(() => {
        p += 1;
        if (b) b.style.width = p + "%";
        if (p >= 100) { if (b) b.style.width = "0"; render((cur + 1) % STAGES.length); progress(); }
      }, 80);
    };
    tabs.addEventListener("click", (e) => {
      const btn = e.target.closest(".life__tab");
      if (!btn) return;
      auto = false; clearInterval(timer);
      $$(".life__tab .bar", tabs).forEach((b) => (b.style.width = "0"));
      render(Number(btn.dataset.i));
    });
    render(0);
    onView(lifeEl, progress);
    // 인쇄할 때는 다섯 단계를 모두 펼쳐 보여 줌
    addEventListener("beforeprint", () => { clearInterval(timer); pane.innerHTML = STAGES.map(paneHTML).join('<hr style="border:0;border-top:1px solid var(--line);margin:8px 0" />'); });
    addEventListener("afterprint", () => render(cur));
  }

  /* PDF 저장 */
  $("#printBtn")?.addEventListener("click", () => print());
})();
