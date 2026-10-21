(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));

  /* ---------- progress bar ---------- */
  const bar = $("#progressBar");
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.width = (max > 0 ? (scrollY / max) * 100 : 0) + "%";
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- count-up ---------- */
  const countUp = (el) => {
    // HTML에 최종값이 들어 있고, 애니메이션은 최종값의 70%부터 올라가는 선택 효과
    const end = Number(el.dataset.count);
    const fin = end.toLocaleString("ko-KR");
    if (reduced || end === 0 || matchMedia("print").matches) { el.textContent = fin; return; }
    const start = end * 0.7, t0 = performance.now();
    const step = (t) => {
      const p = matchMedia("print").matches ? 1 : Math.min(1, (t - t0) / 1100);
      el.textContent = Math.round(start + (end - start) * (1 - Math.pow(1 - p, 3))).toLocaleString("ko-KR");
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* ---------- hero lifeline ---------- */
  const life = $$(".lifeline span");
  if (life.length && !reduced) {
    let k = 0;
    setInterval(() => { life.forEach((s, i) => s.classList.toggle("is-on", i <= k)); k = (k + 1) % (life.length + 1); }, 900);
  } else life.forEach((s) => s.classList.add("is-on"));

  /* ---------- 승인·매입·정산 전 과정 지도 ---------- */
  // links: 고객-하위몰, 하위몰-PG, PG-VAN, VAN-매입사 / fwd: 오른쪽, rev: 왼쪽(대금), both: 요청·응답, opt: 경유 가능
  // 단계별: 제목 / 업무 맥락(줄 단위) / 근거 / 담당 업무 / 입사 후 기여
  const STAGES = [
    {
      label: "가맹점 개설", sub: "세팅·심사",
      on: [1, 2, 3, 4], links: ["off", "fwd", "fwd", "fwd"],
      title: "가맹점이 결제를 시작할 수 있도록 매입사 등록부터 심사까지",
      ctx: ["신규 가맹점이 들어오면 매입사 가맹점번호와 VAN ID를 채번하고 내부 시스템에 세팅합니다.", "하위몰 심사가 반송되면 사유를 확인하고 예외 심사를 협의해 연동 일정을 지킵니다."],
      proof: ["개설 가이드 · 체크리스트 작성", "해외법인 공용 가맹점번호"],
      mine: ["가맹점번호·VAN ID·단말기 ID 채번과 내부 세팅", "개설 요청을 Jira 템플릿으로 일원화, 9단계 소요일 정의", "하위몰 심사 반송 사유 확인과 예외 심사 협의", "해외 PSP · 글로벌 앱마켓 가맹점 연동"],
      value: "가맹점 온보딩과 매입사 세팅을 첫 주부터 맡을 수 있습니다.",
    },
    {
      label: "승인", sub: "인증·한도",
      on: [0, 1, 2, 3, 4], links: ["fwd", "fwd", "opt", "both"],
      title: "결제가 막히지 않도록 매입사 인증·한도 정책까지",
      ctx: ["매입사는 업종과 가맹점번호마다 인증 기준과 승인한도를 따로 둡니다.", "오픈 전에 차이를 찾아 맞추고, 한도가 차기 전에 증액을 협의합니다."],
      proof: ["게임 결제 한도 예외 승인", "인증 정책 정리"],
      mine: ["매입사별 인증·한도 정책 취합과 유관부서 안내", "오픈 전 베타 테스트로 2차 인증 차이 발견·해소", "승인한도 소진율 모니터링, 초과 전 증액 협의", "승인 실패 응답코드 원인 분석과 재발 방지"],
      value: "신규 가맹점의 결제 조건을 데이터로 제안하고 협의할 수 있습니다.",
    },
    {
      label: "매입", sub: "VAN·대사",
      on: [2, 3, 4], links: ["off", "off", "fwd", "fwd"],
      title: "승인된 거래가 대금으로 확정되도록 매입 경로와 대사까지",
      ctx: ["승인된 거래는 매입 VAN을 거쳐 매입사에 청구돼야 대금이 확정됩니다.", "매입 VAN 다중화를 PM으로 맡아 QA 시나리오부터 운영 전환까지 이끌었습니다."],
      proof: ["매입 VAN 다중화 PM", "QA 시나리오 설계"],
      mine: ["매입사 연동 QA 시나리오 설계 (기본·엣지·호환)", "전 VAN사 수수료 항목 추가, 반영일 하루로 통일", "승인 VAN ↔ 매입 VAN 파일 대사 불일치 조치표 작성", "취소 실패 원인 파악과 VAN사·매입사 재처리 협의"],
      value: "매입사·VAN 연동과 매입 대사 이슈를 바로 맡을 수 있습니다.",
    },
    {
      label: "정산", sub: "차액·반송",
      on: [1, 2, 4], dim: [3], links: ["off", "rev", "rev", "rev"],
      title: "대금이 정확히 지급되도록 정산 반송까지",
      ctx: ["영세·중소 가맹점의 우대 수수료는 차액정산으로 돌려받습니다.", "쌓여 있던 반송 건을 데이터로 추출해 매입사와 일괄 재처리했습니다."],
      proof: ["반송 원인 데이터 분석", "누적 반송분 취합"],
      mine: ["차액정산 반송 사유 분석과 매입사 협의", "반송 대상 대량 추출 후 일괄 재매입", "반송률 과다 원인 파악 → 전용 가맹점번호로 해결", "매입결과 건별 수수료 수신으로 대사 리소스 절감"],
      value: "정산 오류를 데이터로 찾고 매입사와 정리할 수 있습니다.",
    },
    {
      label: "분쟁", sub: "차지백·VOC",
      on: [0, 1, 2, 4], dim: [3], links: ["both", "both", "off", "both"],
      title: "결제 이후 생기는 이의신청과 민원까지",
      ctx: ["해외카드 차지백은 정해진 기한 안에 소명하지 못하면 대금이 차감됩니다.", "접수부터 소명·결과 기록까지 흐름을 SOP로 만들고 주담당으로 처리했습니다."],
      proof: ["이의신청 SOP 작성", "VOC 기반 개선"],
      mine: ["매입사 차지백 공문 접수 → 증빙 기한 안내 → 소명 회신", "패소 사유 분석과 차감 일정 내부 공유", "혜택 미적용 민원을 전용 가맹점번호 분리로 해결", "매입사 정기 점검·사고 가맹점 모니터링 회신"],
      value: "차지백·분쟁 프로세스를 바로 운영하고 개선할 수 있습니다.",
    },
  ];

  /* ---------- 해외 연동 탭 (포트폴리오) ---------- */
  const gt = $("#gtabs");
  if (gt) {
    const btns = $$(".gtabs__btns button", gt), panes = $$(".gtabs__pane", gt);
    btns.forEach((b) => b.addEventListener("click", () => {
      btns.forEach((x) => x.setAttribute("aria-selected", x === b));
      panes.forEach((p) => (p.hidden = p.dataset.g !== b.dataset.g));
    }));
  }

  /* ---------- 차지백 흐름 (포트폴리오) ---------- */
  const cb = $("#cbFlow");
  if (cb) {
    const steps = $$(".cb__step", cb);
    const out = $("#cbOut");
    const OUT = {
      win: "<b>승소 · 소명 인정</b> 매출 유지, 결과를 현황표에 기록하고 종결",
      lose: "<b>패소 · 매입대금 차감</b> 부담 주체 확인 → 차감 예정일과 입금 보류 내부 안내",
      again: "<b>재접수 · n차 소명</b> 추가 증빙을 받아 기한 내 다시 회신",
    };
    let run = 0;
    const play = async (res = "win") => {
      const id = ++run, alive = () => id === run;
      steps.forEach((s) => s.classList.remove("is-on", "is-done"));
      out.classList.remove("is-show");
      for (const s of steps) {
        s.classList.add("is-on"); await sleep(520); if (!alive()) return;
        s.classList.remove("is-on"); s.classList.add("is-done");
      }
      out.innerHTML = OUT[res]; out.dataset.res = res; out.classList.add("is-show");
    };
    $$("[data-cb]", cb).forEach((b) => b.addEventListener("click", () => {
      $$("[data-cb]", cb).forEach((x) => x.setAttribute("aria-pressed", x === b));
      play(b.dataset.cb);
    }));
    new IntersectionObserver((en, ob) => { if (en[0].isIntersecting) { play("win"); ob.disconnect(); } }, { threshold: 0.3 }).observe(cb);
    var cbFinal = () => { run++; steps.forEach((s) => { s.classList.remove("is-on"); s.classList.add("is-done"); }); out.innerHTML = OUT.lose; out.classList.add("is-show"); };
    addEventListener("beforeprint", cbFinal);
  }

  const lifeEl = $("#life");
  if (lifeEl) {
    const tabs = $(".life__tabs", lifeEl);
    tabs.innerHTML = STAGES.map((s, i) => `<button class="life__tab" role="tab" type="button" aria-selected="${i === 0}" data-i="${i}">${s.label}<small>${s.sub}</small><span class="bar"></span></button>`).join("");
    const actors = $$(".actor", lifeEl);
    const links = $$(".link", lifeEl);
    const pane = $(".life__pane", lifeEl);
    let cur = 0, timer = null, auto = !reduced;
    const render = (i) => {
      cur = i;
      const s = STAGES[i];
      $$(".life__tab", tabs).forEach((t, k) => t.setAttribute("aria-selected", k === i));
      actors.forEach((a, k) => {
        a.classList.toggle("is-on", s.on.includes(k));
        a.classList.toggle("is-dim", !s.on.includes(k) || (s.dim || []).includes(k));
      });
      links.forEach((l, k) => {
        const st = s.links[k];
        l.className = "link" + (st === "opt" ? " is-opt fwd" : st === "off" ? "" : " " + st);
      });
      pane.innerHTML = `
        <div class="life__pane">
          <h3 class="life__title">${s.title}</h3>
          <p class="life__ctx">${s.ctx.join("<br />")}</p>
          <div class="life__grid2">
            <div class="life__mine">
              <h4>담당 업무</h4>
              <ul>${s.mine.map((m) => `<li>${m}</li>`).join("")}</ul>
            </div>
            <div class="life__side">
              <div class="life__proof">${s.proof.map((p) => `<span>${p}</span>`).join("")}</div>
              <p class="life__value"><b>입사 후 기여</b>${s.value}</p>
            </div>
          </div>
        </div>`;
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
      }, 90);
    };
    tabs.addEventListener("click", (e) => {
      const btn = e.target.closest(".life__tab");
      if (!btn) return;
      auto = false; clearInterval(timer);
      $$(".life__tab .bar", tabs).forEach((b) => (b.style.width = "0"));
      render(Number(btn.dataset.i));
    });
    render(0);
    new IntersectionObserver((en, ob) => { if (en[0].isIntersecting) { progress(); ob.disconnect(); } }, { threshold: 0.3 }).observe(lifeEl);
  }

  // 인쇄(PDF 저장) 직전에 모든 시각화를 최종 상태로 맞추는 함수 목록
  const finals = [];

  /* ---------- 매입 VAN 전환 (포트폴리오) ---------- */
  const sw = $("#vanSwitch");
  let runSwitch = null;
  if (sw) {
    const swCount = $("#swCount");
    const oldLane = $('.lane[data-lane="old"]', sw);
    const newLane = $('.lane[data-lane="new"]', sw);
    const results = $$(".results li", sw);
    let processed = 0, counterOn = false, swRun = 0;
    const tick = () => {
      if (!counterOn || !swCount) return;
      processed += 7 + Math.floor(Math.random() * 9);
      swCount.textContent = processed.toLocaleString("ko-KR");
      setTimeout(tick, reduced ? 1000 : 120);
    };
    runSwitch = async () => {
      const id = ++swRun, alive = () => id === swRun;
      sw.classList.remove("is-switched");
      oldLane.classList.add("is-active"); newLane.classList.remove("is-active");
      $("#oldState").textContent = "운영 중"; $("#newState").textContent = "대기";
      $("#swStatus").textContent = "기존 VAN 경유 매입 중";
      results.forEach((r) => r.classList.remove("is-on"));
      await sleep(2200); if (!alive()) return;
      sw.classList.add("is-switched"); newLane.classList.add("is-active");
      $("#newState").textContent = "연결"; $("#swStatus").textContent = "신규 VAN으로 전환 중 · 매입 정상";
      await sleep(900); if (!alive()) return;
      oldLane.classList.remove("is-active");
      $("#oldState").textContent = "전환 완료"; $("#newState").textContent = "운영 중";
      $("#swStatus").textContent = "신규 VAN 경유 매입 중";
      for (const r of results) { await sleep(350); if (!alive()) return; r.classList.add("is-on"); }
    };
    $("#swReplay")?.addEventListener("click", () => runSwitch());
    finals.push(() => {
      swRun++;
      sw.classList.add("is-switched"); newLane.classList.add("is-active"); oldLane.classList.remove("is-active");
      $("#oldState").textContent = "전환 완료"; $("#newState").textContent = "운영 중";
      $("#swStatus").textContent = "신규 VAN 경유 매입 중";
      results.forEach((r) => r.classList.add("is-on"));
    });
  }
  const runTimeline = async (el) => {
    for (const li of $$("li", el)) { li.classList.add("is-done"); await sleep(260); }
  };

  /* ---------- 매입전문 포맷 동시 전환 ---------- */
  const sync = $("#sync");
  let runSync = null;
  if (sync) {
    const rows = $$(".sync__row", sync);
    const day = $("#syncDay");
    const state = $(".sync__internal span", sync);
    let syncRun = 0;
    runSync = async () => {
      const id = ++syncRun, alive = () => id === syncRun;
      sync.classList.remove("is-live");
      rows.forEach((r) => { r.classList.remove("is-agreed", "is-new"); $(".sync__state", r).textContent = "협의 전"; });
      state.textContent = "내부 매입 로직 · 기존 포맷 기준";
      for (let d = 3; d >= 1; d--) {
        day.textContent = "D-" + d;
        await sleep(450); if (!alive()) return;
        const r = rows[3 - d] ;
        if (r) { r.classList.add("is-agreed"); $(".sync__state", r).textContent = "스펙 합의 완료"; }
      }
      rows.forEach((r) => { r.classList.add("is-agreed"); $(".sync__state", r).textContent = "스펙 합의 완료"; });
      await sleep(600); if (!alive()) return;
      day.textContent = "D-Day";
      rows.forEach((r) => { r.classList.add("is-new"); $(".sync__state", r).textContent = "신규 포맷 적용"; });
      await sleep(400); if (!alive()) return;
      sync.classList.add("is-live");
      state.textContent = "전 VAN사 동일 포맷 수신 · 정상 처리";
    };
    $("#syncReplay")?.addEventListener("click", () => runSync());
    finals.push(() => {
      syncRun++;
      day.textContent = "D-Day";
      rows.forEach((r) => { r.classList.add("is-agreed", "is-new"); $(".sync__state", r).textContent = "신규 포맷 적용"; });
      sync.classList.add("is-live");
      state.textContent = "전 VAN사 동일 포맷 수신 · 정상 처리";
    });
  }

  /* ---------- reveal observer ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.classList.add("is-in");
      $$("[data-count]", el).forEach(countUp);
      if (el.matches(".tl")) runTimeline(el);
      if (el.contains(sw) && runSwitch) runSwitch();
      if (el.contains(sync) && runSync) runSync();
      io.unobserve(el);
    });
  }, { threshold: 0.15 });
  $$(".reveal").forEach((el) => io.observe(el));

  /* ---------- AI 구비서류 자동화 데모 ---------- */
  const DOCS = [
    { org: "A매입사", title: "가맹점 신규 등록 신청서", rows: [["신청일", "date"], ["간판명", "sign"], ["입금계좌", "acct"], ["담당자", "req"]] },
    { org: "B매입사", title: "PG 하위가맹점 등록 요청서", rows: [["가맹점명", "sign"], ["요청자", "req"], ["접수일자", "date"], ["대금계좌", "acct"]] },
    { org: "C매입사", title: "가맹점 개설 의뢰서", rows: [["결제대금 입금계좌", "acct"], ["작성일", "date"], ["상호(간판)", "sign"], ["의뢰자 정보", "req"]] },
  ];
  const docsEl = $("#docs");
  const form = $("#demoForm");
  if (form && docsEl) {
    const total = DOCS.reduce((s, d) => s + d.rows.length, 0);
    $("#manualCount").textContent = total;
    const renderDocs = () => {
      docsEl.innerHTML = DOCS.map((d) => `
        <div class="doc"><div class="doc__scan"></div>
          <div class="doc__top"><b>${d.org}</b><span class="doc__state">대기</span></div>
          <div class="doc__name">${d.title}</div>
          ${d.rows.map(([l, k]) => `<div class="doc__row"><span>${l}</span><output data-key="${k}"></output></div>`).join("")}
        </div>`).join("");
    };
    const typeInto = async (el, text) => {
      el.classList.add("typing");
      if (reduced) el.textContent = text;
      else {
        const c = Math.max(1, Math.ceil(text.length / 10));
        for (let i = 0; i <= text.length; i += c) { el.textContent = text.slice(0, i); await sleep(18); }
        el.textContent = text;
      }
      el.classList.remove("typing");
    };
    renderDocs();
    finals.push(() => {
      const data = Object.fromEntries(new FormData(form));
      $$(".doc", docsEl).forEach((d) => {
        $$("output", d).forEach((o) => (o.textContent = data[o.dataset.key] || "-"));
        d.classList.add("is-done"); $(".doc__state", d).textContent = "작성 완료";
      });
    });
    let running = false;
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (running) return;
      running = true;
      const btn = $("button", form);
      btn.classList.add("is-running");
      const data = Object.fromEntries(new FormData(form));
      renderDocs();
      const els = $$(".doc", docsEl);
      els.forEach((d) => { d.classList.add("is-scanning"); $(".doc__state", d).textContent = "작성 중"; });
      await sleep(450);
      await Promise.all(els.map(async (d, i) => {
        await sleep(i * 160);
        for (const o of $$("output", d)) await typeInto(o, (data[o.dataset.key] || "-").trim() || "-");
        d.classList.remove("is-scanning"); d.classList.add("is-done");
        $(".doc__state", d).textContent = "작성 완료";
      }));
      btn.classList.remove("is-running");
      toast(`1회 입력으로 매입사 서류 ${DOCS.length}종 · ${total}개 항목 작성 완료`);
      running = false;
    });
  }

  /* ---------- utilities ---------- */
  const toastEl = $("#toast");
  let toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-show"), 2600);
  }
  $$("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); toast("이메일 주소를 복사했습니다"); }
    catch { toast(b.dataset.copy); }
  }));
  const finalize = () => {
    $$(".reveal").forEach((el) => el.classList.add("is-in"));
    $$("[data-count]").forEach((el) => (el.textContent = Number(el.dataset.count).toLocaleString("ko-KR")));
    $$(".tl li").forEach((li) => li.classList.add("is-done"));
    finals.forEach((f) => f());
  };
  addEventListener("beforeprint", finalize);
  $("#printBtn")?.addEventListener("click", () => { finalize(); window.print(); });
})();
