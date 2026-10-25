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

  /* 홈: 단계 지도 (고객 · 가맹점 · PG · VAN · 결제사) */
  // links: 고객-가맹점, 가맹점-PG, PG-VAN, VAN-결제사 / fwd 요청 · rev 대금 · both 양방향 · opt 경유 가능 · off 없음
  const STAGES = [
    {
      label: "개설", sub: "청약 · 세팅", duty: "결제서비스 청약 및 운영",
      on: [1, 2, 3, 4], links: ["off", "fwd", "fwd", "fwd"],
      title: "해외 가맹점을 포함한 가맹점이 결제를 시작하기까지",
      ctx: ["애플 · 해외 PSP 같은 해외 가맹점이 국내 카드로 결제를 받을 수 있도록 결제사 입점을 협의했습니다.", "신규 가맹점은 가맹점번호와 VAN ID를 채번해 세팅하고 실매출까지 확인합니다."],
      mine: ["해외 가맹점 국내 카드 결제 연동, 연동 후 매출 발생 중", "해외법인사업자 공용 가맹점번호를 용도별로 개설", "가맹점번호 · VAN ID · 단말기 ID 채번과 내부 세팅", "신규 가맹점번호의 부분취소 특약 반영"],
      proof: ["애플 · 해외 PSP 연동", "VAN ID 채번 167건"],
      value: "가맹점 온보딩과 결제사 세팅을 첫 주부터 맡을 수 있습니다.",
    },
    {
      label: "심사", sub: "반송 · 점검", duty: "가맹점 심사",
      on: [1, 2, 4], links: ["off", "fwd", "opt", "both"],
      title: "하위몰 심사가 막히지 않도록 반송 사유와 업종 기준까지",
      ctx: ["심사가 반송되면 사유를 확인하고, 필요하면 예외 심사를 협의합니다.", "결제사의 정기 점검과 사고 하위몰 모니터링에도 회신합니다."],
      mine: ["반송 사유 확인 후 예외 심사 공문으로 재진행", "업종 기준을 보고 전용 가맹점번호 필요 여부 판단", "하위몰 자체점검 · 환금성 서브몰 점검 · 전수조사 회신", "법 개정에 따른 입점 기준 회신"],
      proof: ["정기 점검 연 10회 이상", "예외 심사 협의"],
      value: "가맹점 심사 기준을 결제사 정책과 맞춰 운영할 수 있습니다.",
    },
    {
      label: "승인", sub: "인증 · 한도", duty: "결제사 정책 관리 · 운영 이슈 대응",
      on: [0, 1, 2, 3, 4], links: ["fwd", "fwd", "opt", "both"],
      title: "결제가 막히지 않도록 결제사 인증 · 한도 정책까지",
      ctx: ["결제사는 업종과 가맹점번호마다 인증 기준과 한도를 따로 둡니다.", "오픈 전에 차이를 찾아 맞추고, 실패가 생기면 응답코드로 원인을 찾습니다."],
      mine: ["결제사별 인증 · 한도 · 노출 정책 정리와 유관부서 안내", "오픈 7일 전 베타 테스트로 2차 인증 차이 발견 · 해소", "승인 · 매입한도 소진율 확인, 초과 전 증액 협의", "승인 · 취소 실패 원인 규명 약 16건"],
      proof: ["게임 결제 한도 예외 승인", "인증 차이 사전 해소"],
      value: "신규 가맹점의 결제 조건을 결제사 기준에 맞춰 제안할 수 있습니다.",
    },
    {
      label: "매입", sub: "VAN · 정산", duty: "결제사 운영 및 커뮤니케이션 · 운영 이슈 대응",
      on: [2, 3, 4], links: ["off", "off", "both", "both"],
      title: "승인된 거래가 대금으로 확정되도록 매입과 정산 반송까지",
      ctx: ["매입 VAN 다중화를 PM으로 맡아 결제사 · VAN사 · 사내 개발 일정을 맞췄습니다.", "정산 반송이 쌓이면 데이터로 원인을 찾아 일괄 재처리합니다."],
      mine: ["매입 VAN 다중화 PM, QA 시나리오 설계", "전 VAN사 수수료 항목 추가, 반영일을 하루로 통일", "차액정산 반송 721건 강제접수 재매입", "승인 VAN ↔ 매입 VAN 파일 대사 조치표 작성"],
      proof: ["월 약 8,000억 원 중단 없이 전환", "PM · 기여도 80%"],
      value: "결제사 · VAN 연동과 매입 대사 이슈를 바로 맡을 수 있습니다.",
    },
    {
      label: "분쟁", sub: "차지백 · 개선", duty: "Chargeback 및 결제 분쟁 관리 · 운영 개선 및 효율화",
      on: [0, 1, 2, 4], links: ["both", "both", "off", "both"],
      title: "결제 이후의 차지백과 민원, 그리고 재발 방지까지",
      ctx: ["해외카드 차지백은 기한 안에 소명하지 못하면 매입대금이 차감됩니다.", "처리 흐름을 SOP로 남기고, 반복되는 민원은 원인이 된 구조를 바꿉니다."],
      mine: ["해외카드 차지백 접수 · 분석 · 소명 · 결과 관리 주담당 (16차수 · 약 30건)", "처리 순서를 SOP로 작성해 인계", "혜택 미적용 민원을 전용 가맹점번호 매출 분기로 해결", "개설 · 테스트카드 요청 Jira 일원화, 서류 생성 도구 공동 개발"],
      proof: ["이의신청 SOP", "서류 작성 건당 약 30분 → 10초 내외"],
      value: "차지백 · 분쟁 프로세스를 바로 운영하고 개선할 수 있습니다.",
    },
  ];
  const lifeEl = $("#life");
  if (lifeEl) {
    const tabs = $(".life__tabs", lifeEl);
    const pane = $("#lifePane");
    const actors = $$(".actor", lifeEl);
    const links = $$(".link", lifeEl);
    const life = $$("#lifeline span");
    tabs.innerHTML = STAGES.map((s, i) => `<button class="life__tab" role="tab" type="button" aria-selected="${i === 0}" data-i="${i}">${s.label}<small>${s.sub}</small><span class="bar"></span></button>`).join("");
    const paneHTML = (s) => `
      <h3>${s.title}</h3>
      <p class="life__ctx">${s.ctx.join(" ")}</p>
      <div class="life__grid">
        <div class="life__mine"><h4>담당 업무</h4><ul>${s.mine.map((m) => `<li>${m}</li>`).join("")}</ul></div>
        <div class="life__side">
          <div class="life__proof">${s.proof.map((p) => `<span class="chip">${p}</span>`).join("")}</div>
          <p class="life__duty">공고 업무 · <b>${s.duty}</b></p>
          <p class="life__value"><b>입사 후 바로 할 수 있는 일</b>${s.value}</p>
        </div>
      </div>`;
    let cur = 0, timer = null, auto = !reduced;
    const render = (i) => {
      cur = i;
      const s = STAGES[i];
      $$(".life__tab", tabs).forEach((t, k) => t.setAttribute("aria-selected", k === i));
      life.forEach((l, k) => l.classList.toggle("is-on", k === i));
      actors.forEach((a, k) => { a.classList.toggle("is-on", s.on.includes(k)); a.classList.toggle("is-dim", !s.on.includes(k)); });
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
