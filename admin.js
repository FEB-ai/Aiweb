/* =========================================================
   관리자 화면 — 오른쪽 위 자물쇠(🔒)를 눌러 엽니다.
   · 비밀번호는 지문(SHA-256)으로만 config.js 에 저장됩니다.
   · '저장하고 적용'은 이 브라우저에만 반영됩니다.
     모든 방문자에게 반영하려면 '설정 파일·보안' 탭에서 config.js 를 내려받아
     사이트 폴더의 config.js 를 바꾼 뒤 다시 올리세요.
   ========================================================= */
(function () {
  "use strict";

  var A = window.AIWEB;
  var lockBtn = document.querySelector(".lock-btn");
  if (!A || !lockBtn) return;

  var store = A.store, esc = A.esc, toast = A.toast, sha256 = A.sha256;
  var SALT = "aiweb-admin:"; // 비밀번호 지문에 섞는 고정 문자열
  var base = A.config;       // 지금 사이트에 적용된 설정
  var draft = clone(base);   // 관리자 화면에서 고치는 중인 설정
  var hasOverride = A.hasOverride; // 이 브라우저에 저장된 수정본이 있는지

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function ss(k, v) { // sessionStorage (브라우저를 닫으면 사라짐)
    try {
      if (v === undefined) return sessionStorage.getItem("aiweb." + k);
      if (v === null) sessionStorage.removeItem("aiweb." + k); else sessionStorage.setItem("aiweb." + k, v);
    } catch (e) { return null; }
  }
  function isAdmin() { return ss("admin") === "1"; }
  function updateLock() {
    var on = isAdmin();
    lockBtn.textContent = on ? "🔓" : "🔒";
    lockBtn.classList.toggle("on", on);
    lockBtn.setAttribute("aria-label", on ? "관리자 화면 열기" : "관리자 모드");
    lockBtn.title = on ? "관리자 화면 열기" : "관리자 모드";
  }
  function isDirty() { return JSON.stringify(draft) !== JSON.stringify(base); }

  /* ---------- 작은 대화상자 ---------- */
  function dialog(inner) {
    var lastFocus = document.activeElement;
    var wrapEl = document.createElement("div");
    wrapEl.className = "modal-backdrop";
    wrapEl.innerHTML = '<div class="modal admin-dialog" role="dialog" aria-modal="true">' +
      '<button class="modal-x" type="button" aria-label="닫기" data-close>×</button>' + inner + "</div>";
    document.body.appendChild(wrapEl);
    requestAnimationFrame(function () { wrapEl.classList.add("show"); });
    function close() {
      wrapEl.classList.remove("show");
      document.removeEventListener("keydown", onKey);
      setTimeout(function () { wrapEl.remove(); }, 250);
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }
    function onKey(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onKey);
    wrapEl.addEventListener("click", function (e) {
      if (e.target === wrapEl || e.target.closest("[data-close]")) close();
    });
    var first = wrapEl.querySelector("input");
    if (first) setTimeout(function () { first.focus(); }, 50);
    return { el: wrapEl, close: close };
  }

  /* ---------- 자물쇠: 비밀번호 만들기 / 입력 ---------- */
  function askPassword() {
    var hash = (base.admin || {}).passwordHash;
    if (!hash) {
      var d = dialog(
        '<div class="brand-mark modal-mark">🔐</div>' +
        '<h3>관리자 비밀번호 만들기</h3>' +
        '<p>아직 비밀번호가 없습니다. 6자 이상으로 만들어 주세요.<br>비밀번호 자체는 저장되지 않고 지문만 저장됩니다.</p>' +
        '<form class="form" novalidate>' +
          '<div class="form-summary" role="alert" hidden></div>' +
          '<div class="field"><label for="ad-new">새 비밀번호</label><input id="ad-new" type="password" autocomplete="new-password"></div>' +
          '<div class="field"><label for="ad-new2">비밀번호 확인</label><input id="ad-new2" type="password" autocomplete="new-password"></div>' +
          '<button class="btn btn-primary" type="submit">만들고 들어가기</button>' +
        "</form>"
      );
      d.el.querySelector("form").addEventListener("submit", function (e) {
        e.preventDefault();
        var p1 = d.el.querySelector("#ad-new").value, p2 = d.el.querySelector("#ad-new2").value;
        var sum = d.el.querySelector(".form-summary");
        if (p1.length < 6) { sum.hidden = false; sum.textContent = "비밀번호는 6자 이상이어야 합니다."; return; }
        if (p1 !== p2) { sum.hidden = false; sum.textContent = "두 비밀번호가 같지 않습니다."; return; }
        sha256(SALT + p1).then(function (h) {
          // 이 브라우저에 바로 저장해 두어야 다음에도 같은 비밀번호로 들어올 수 있음
          var next = clone(base);
          next.admin = next.admin || {};
          next.admin.passwordHash = h;
          store.set("configOverride", next);
          ss("admin", "1");
          // 새로고침해야 본문에 수정 버튼이 그려짐 → 관리자 화면은 다시 열림
          ss("adminReopen", "settings");
          ss("restore", JSON.stringify({ y: window.scrollY, msg: "비밀번호를 만들었습니다. 다른 기기에도 쓰려면 설정 파일을 내려받아 교체하세요." }));
          location.reload();
        }).catch(function () { sum.hidden = false; sum.textContent = "이 브라우저에서는 관리자 기능을 쓸 수 없습니다."; });
      });
      return;
    }

    var d2 = dialog(
      '<div class="brand-mark modal-mark">🔒</div>' +
      "<h3>관리자 모드</h3><p>관리자 비밀번호를 입력하세요.</p>" +
      '<form class="form" novalidate>' +
        '<div class="form-summary" role="alert" hidden></div>' +
        '<div class="field"><label for="ad-pw">비밀번호</label><input id="ad-pw" type="password" autocomplete="current-password"></div>' +
        '<button class="btn btn-primary" type="submit">들어가기</button>' +
      "</form>"
    );
    d2.el.querySelector("form").addEventListener("submit", function (e) {
      e.preventDefault();
      var sum = d2.el.querySelector(".form-summary");
      sha256(SALT + d2.el.querySelector("#ad-pw").value).then(function (h) {
        if (h !== hash) { sum.hidden = false; sum.textContent = "비밀번호가 맞지 않습니다."; return; }
        ss("admin", "1");
        ss("adminReopen", "content");
        ss("restore", JSON.stringify({ y: window.scrollY }));
        location.reload(); // 본문에 수정 버튼을 그리기 위해 새로고침 (관리자 화면은 다시 열림)
      }).catch(function () { sum.hidden = false; sum.textContent = "이 브라우저에서는 관리자 기능을 쓸 수 없습니다."; });
    });
  }

  lockBtn.addEventListener("click", function () { if (isAdmin()) openAdmin(); else askPassword(); });

  /* =========================================================
     관리자 화면
     ========================================================= */
  var TABS = [
    ["content", "내용 편집"], ["notices", "공지"], ["roster", "수강생 명단"],
    ["records", "내역 확인"], ["settings", "설정 파일·보안"]
  ];
  var current = "content";
  var panel = null, root = null;

  function openAdmin(tab) {
    if (tab) current = tab;
    if (!root) {
      root = document.createElement("div");
      root.className = "admin";
      root.setAttribute("role", "dialog");
      root.setAttribute("aria-label", "관리자 모드");
      root.innerHTML =
        '<div class="admin-bar"><div class="container">' +
          '<div class="admin-bar-in">' +
            '<strong class="admin-title">🛠 관리자 모드</strong>' +
            '<span class="dirty" hidden>저장하지 않은 변경이 있습니다</span>' +
            '<div class="admin-actions">' +
              '<button class="btn btn-primary btn-sm" type="button" data-a="save">저장하고 적용</button>' +
              '<button class="btn btn-ghost btn-sm" type="button" data-a="view">사이트 보기</button>' +
              '<button class="btn btn-ghost btn-sm" type="button" data-a="logout">로그아웃</button>' +
            "</div>" +
          "</div>" +
          '<div class="admin-tabs" role="tablist">' +
            TABS.map(function (t) { return '<button type="button" role="tab" data-tab="' + t[0] + '">' + t[1] + "</button>"; }).join("") +
          "</div>" +
        "</div></div>" +
        '<div class="container admin-main"></div>';
      document.body.appendChild(root);
      panel = root.querySelector(".admin-main");

      root.querySelector(".admin-actions").addEventListener("click", function (e) {
        var b = e.target.closest("[data-a]");
        if (!b) return;
        if (b.dataset.a === "save") save();
        if (b.dataset.a === "view") closeAdmin();
        if (b.dataset.a === "logout") logout();
      });
      root.querySelector(".admin-tabs").addEventListener("click", function (e) {
        var b = e.target.closest("[data-tab]");
        if (b) { current = b.dataset.tab; render(); root.scrollTop = 0; }
      });
      panel.addEventListener("input", onEdit);
      panel.addEventListener("change", onEdit);
      panel.addEventListener("click", onPanelClick);
      panel.addEventListener("toggle", onToggle, true);
    }
    document.documentElement.classList.add("admin-open");
    root.hidden = false;
    render();
  }

  function closeAdmin() {
    if (!root) return;
    root.hidden = true;
    document.documentElement.classList.remove("admin-open");
    if (isDirty()) toast("고친 내용은 '저장하고 적용'을 눌러야 사이트에 반영됩니다.");
  }

  function logout() {
    if (isDirty() && !confirm("저장하지 않은 변경이 있습니다. 버리고 로그아웃할까요?")) return;
    ss("admin", null);
    ss("restore", JSON.stringify({ y: window.scrollY, msg: "관리자 모드에서 로그아웃했습니다." }));
    location.reload(); // 본문의 수정 버튼을 없애기 위해 새로고침
  }

  function save() {
    if (!store.set("configOverride", draft)) { toast("저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요."); return; }
    ss("adminReopen", current);
    location.reload(); // 새 설정으로 사이트를 다시 그림 (관리자 화면은 다시 열림)
  }

  function markDirty() {
    if (root) root.querySelector(".dirty").hidden = !isDirty();
  }

  function render() {
    Array.prototype.forEach.call(root.querySelectorAll("[data-tab]"), function (b) {
      var on = b.dataset.tab === current;
      b.classList.toggle("on", on);
      b.setAttribute("aria-selected", on);
    });
    if (current === "content") renderContent();
    if (current === "notices") renderNoticesTab();
    if (current === "roster") renderRoster();
    if (current === "records") renderRecords();
    if (current === "settings") renderSettings();
    markDirty();
  }

  function info(text) { return '<p class="admin-info">ℹ️ ' + text + "</p>"; }

  /* =========================================================
     ① 내용 편집 — 설정의 모양을 읽어 입력 칸을 자동으로 만듦
     ========================================================= */
  var SECTIONS = [
    ["site", "기본 정보"], ["nav", "헤더 메뉴"], ["hero", "첫 화면"], ["stats", "통계 카드"],
    ["about", "프로그램 소개"], ["curriculum", "커리큘럼·일정"], ["portfolio", "우수 과제 포트폴리오"], ["guide", "수강 안내"],
    ["join", "참여하기"], ["classroom", "내 강의실"], ["sheets", "구글 시트 연동"], ["popup", "안내 팝업"], ["welcome", "첫 방문 효과"],
    ["faq", "FAQ"], ["instructor", "교수자"], ["footer", "푸터"]
  ];
  var section = "site";
  var HIDDEN = { "classroom.codeHash": 1, "classroom.roster": 1, "classroom.attendanceSecret": 1 }; // 다른 탭에서 다룸
  var LABELS = {
    university: "대학교", department: "학과", courseName: "과목명", tagline: "한 줄 소개", logo: "로고 이미지 경로",
    id: "섹션 id", label: "이름", badge: "배지", subtitle: "부제", description: "설명", buttons: "버튼",
    href: "연결 주소", primary: "강조 버튼", glance: "한눈에 보기", icon: "아이콘", value: "값",
    auto: "자동 계산 (period/time)", unit: "단위", count: "자동 개수 (tools)", eyebrow: "작은 제목(영문)",
    title: "제목", lead: "소개 문구", paragraphs: "본문 문단", featuresTitle: "특징 제목", features: "특징 슬라이드",
    text: "내용", schedule: "수업 일정", firstClass: "첫 수업일 (예: 2026-03-03)", time: "시간", place: "장소",
    holidays: "공휴일", date: "날짜 (예: 2026-05-05)", name: "이름", weeks: "주차", week: "주차 번호",
    topics: "학습 내용", videos: "참고 영상", url: "주소", assignment: "과제", due: "마감 (예: 2026-03-23T23:59)",
    submitUrl: "제출 주소 (비우면 내 강의실)", exam: "시험 주", items: "항목", toolsTitle: "도구 제목", tools: "실습 AI 도구",
    use: "쓰임", evaluationTitle: "평가 제목", evaluation: "평가 비율", percent: "비율(%)", materialsTitle: "준비물 제목",
    materials: "준비물", notice: "안내 문구", poll: "투표", question: "질문", hint: "도움말", options: "선택지",
    apply: "수강 신청서", endpoint: "받을 주소 (비우면 이 브라우저에만 저장)", submitLabel: "제출 버튼 글자",
    doneMessage: "접수 완료 문구", fields: "입력 항목", type: "종류", required: "필수", placeholder: "예시 글자",
    pattern: "형식 (정규식)", patternMessage: "형식 오류 문구", wide: "넓게", testMode: "테스트 모드 (수업일이 아니어도 출석 가능)",
    maxFileMB: "최대 파일 크기(MB)", enabled: "사용", delaySeconds: "띄우는 시간(초)", buttonLabel: "버튼 글자",
    buttonHref: "버튼 연결", confetti: "첫 방문 폭죽", q: "질문", a: "답변", affiliation: "소속", photo: "사진 경로",
    bio: "소개", contacts: "연락처", copyright: "저작권 문구",
    polls: "설문", author: "주체(작성자)", createdAt: "생성일시", status: "상태 (open=진행 중 / closed=마감)",
    events: "달력 일정", driveUrl: "구글 드라이브 주소", student: "학생 표시 이름", term: "학기·과제 구분",
    category: "분류", categories: "분류 목록", sample: "샘플 (열기 버튼 막기)",
    infographic: "인포그래픽", inputsTitle: "왼쪽 제목", inputs: "활용하는 것", outputsTitle: "오른쪽 제목", outputs: "만드는 것",
    stepsTitle: "과정 제목", steps: "학습 과정", flowTitle: "흐름 제목", phases: "학습 흐름 단계",
    from: "시작 주차", to: "끝 주차", evalTitle: "평가 제목",
    resources: "강의 자료", journalClub: "논문 발표 배정표", presenter: "발표자", paper: "논문", link: "논문 주소",
    sheets: "구글 시트 연동"
  };
  var LONG = { description: 1, text: 1, bio: 1, lead: 1, a: 1, notice: 1, doneMessage: 1, paragraphs: 1 };
  // 없을 때 '+ 추가'로 넣을 수 있는 항목 (예: 과제가 없는 주차에 과제 추가)
  var OPTIONAL = {
    weeks: {
      assignment: { title: "", text: "", due: "", submitUrl: "" },
      videos: [{ title: "", url: "" }],
      resources: [{ title: "", url: "" }],
      date: "", time: "", place: ""
    }
  };
  var TEMPLATES = {
    holidays: { date: "", name: "" }, videos: { title: "", url: "" }, notices: { date: "", title: "", text: "", pinned: false },
    events: { date: "", type: "휴강", title: "", text: "" }
  };
  var openSet = {};

  function label(key) { return LABELS[key] || key; }
  function getAt(obj, path) { return path.reduce(function (o, k) { return o == null ? o : o[k]; }, obj); }
  function setAt(obj, path, v) { getAt(obj, path.slice(0, -1))[path[path.length - 1]] = v; }
  function blank(v) {
    if (Array.isArray(v)) return [];
    if (v && typeof v === "object") { var o = {}; Object.keys(v).forEach(function (k) { o[k] = blank(v[k]); }); return o; }
    if (typeof v === "number") return 0;
    if (typeof v === "boolean") return false;
    return "";
  }
  function preview(it) {
    if (it.week !== undefined) return it.week + "주차 · " + (it.title || "");
    return it.title || it.label || it.name || it.q || it.question || it.date || "항목";
  }
  function pathAttr(path) { return esc(JSON.stringify(path)); }

  function leaf(v, path, key, inList) {
    var p = pathAttr(path), lab = inList ? "" : "<span>" + esc(label(key)) + "</span>";
    if (typeof v === "boolean") {
      return '<label class="ed-check"><input type="checkbox" data-path="' + p + '" data-type="bool"' + (v ? " checked" : "") + ">" + esc(label(key)) + "</label>";
    }
    if (typeof v === "number") {
      return '<label class="ed-field">' + lab + '<input type="number" data-path="' + p + '" data-type="num" value="' + esc(v) + '"></label>';
    }
    var s = v == null ? "" : String(v);
    var parentKey = typeof path[path.length - 1] === "number" ? path[path.length - 2] : key;
    if (LONG[key] || LONG[parentKey] || s.length > 70) {
      return '<label class="ed-field">' + lab + '<textarea rows="3" data-path="' + p + '">' + esc(s) + "</textarea></label>";
    }
    return '<label class="ed-field">' + lab + '<input type="text" data-path="' + p + '" value="' + esc(s) + '"></label>';
  }

  function moveBtns(arrPath, i, n) {
    var p = pathAttr(arrPath);
    return '<span class="ed-btns">' +
      '<button type="button" data-act="up" data-path="' + p + '" data-i="' + i + '" aria-label="위로"' + (i === 0 ? " disabled" : "") + ">↑</button>" +
      '<button type="button" data-act="down" data-path="' + p + '" data-i="' + i + '" aria-label="아래로"' + (i === n - 1 ? " disabled" : "") + ">↓</button>" +
      '<button type="button" data-act="del" data-path="' + p + '" data-i="' + i + '" class="del">삭제</button></span>';
  }

  function node(v, path, key) {
    if (Array.isArray(v)) {
      var items = v.map(function (it, i) {
        var ip = path.concat(i);
        if (it === null || typeof it !== "object") {
          return '<div class="ed-row">' + leaf(it, ip, key, true) + moveBtns(path, i, v.length) + "</div>";
        }
        var k = JSON.stringify(ip);
        return '<details class="ed-item" data-open-key="' + esc(k) + '"' + (openSet[k] ? " open" : "") + ">" +
          "<summary><span class=\"ed-sum\">" + (i + 1) + ". " + esc(preview(it)) + "</span>" + moveBtns(path, i, v.length) + "</summary>" +
          '<div class="ed-body">' + node(it, ip, key) + "</div></details>";
      }).join("");
      return '<div class="ed-array"><div class="ed-label">' + esc(label(key)) + " <small>(" + v.length + "개)</small></div>" +
        items + '<button type="button" class="ed-add" data-act="add" data-path="' + pathAttr(path) + '">+ 추가</button></div>';
    }
    if (v && typeof v === "object") {
      var inItem = typeof path[path.length - 1] === "number";
      var parentArr = inItem ? path[path.length - 2] : null;
      var opt = OPTIONAL[parentArr] || {};
      var body = Object.keys(v).filter(function (k) { return !HIDDEN[path.concat(k).join(".")]; }).map(function (k) {
        var child = node(v[k], path.concat(k), k);
        if (opt.hasOwnProperty(k)) {
          child = '<div class="ed-optional">' + child +
            '<button type="button" class="ed-remove" data-act="delkey" data-path="' + pathAttr(path) + '" data-key="' + esc(k) + '">× ' + esc(label(k)) + " 빼기</button></div>";
        }
        return child;
      }).join("");
      var adds = Object.keys(opt).filter(function (k) { return !v.hasOwnProperty(k); }).map(function (k) {
        return '<button type="button" class="ed-add small" data-act="addkey" data-path="' + pathAttr(path) + '" data-key="' + esc(k) + '">+ ' + esc(label(k)) + " 추가</button>";
      }).join("");
      var inner = body + (adds ? '<div class="ed-adds">' + adds + "</div>" : "");
      if (path.length > 1 && !inItem) return '<fieldset class="ed-group"><legend>' + esc(label(key)) + "</legend>" + inner + "</fieldset>";
      return '<div class="ed-obj">' + inner + "</div>";
    }
    return leaf(v, path, key, false);
  }

  function renderContent() {
    var lab = SECTIONS.filter(function (s) { return s[0] === section; })[0][1];
    panel.innerHTML =
      info("항목을 고친 뒤 위의 <b>저장하고 적용</b>을 누르면 사이트에 반영됩니다. (이 브라우저에만 — 모든 방문자에게는 '설정 파일·보안' 탭에서 config.js 를 내려받아 교체)") +
      info("💡 <b>주차별 학습 · 월간 수업 달력 · 우수 과제 포트폴리오 · 참여하기(설문) · 자주 묻는 질문</b>은 <b>사이트 보기</b>로 돌아가 본문에서 ✏️ 버튼으로 바로 고칠 수 있습니다.") +
      '<div class="ed-sections">' + SECTIONS.map(function (s) {
        return '<button type="button" data-sec="' + s[0] + '"' + (s[0] === section ? ' class="on"' : "") + ">" + s[1] + "</button>";
      }).join("") + "</div>" +
      '<div class="card ed-panel"><h3>' + esc(lab) + "</h3>" +
        (draft[section] === undefined ? '<p class="muted">이 항목이 설정에 없습니다.</p>' : node(draft[section], [section], section)) +
      "</div>";
  }

  function onEdit(e) {
    var t = e.target;
    if (!t.matches || !t.matches("[data-path]")) return;
    var path = JSON.parse(t.dataset.path), v;
    if (t.dataset.type === "bool") v = t.checked;
    else if (t.dataset.type === "num") v = t.value === "" ? 0 : Number(t.value);
    else v = t.value;
    setAt(draft, path, v);
    markDirty();
  }

  function onToggle(e) {
    var d = e.target;
    if (d.dataset && d.dataset.openKey) openSet[d.dataset.openKey] = d.open;
  }

  function rerenderKeepScroll() {
    var y = root.scrollTop;
    render();
    root.scrollTop = y;
  }

  function onPanelClick(e) {
    var sec = e.target.closest("[data-sec]");
    if (sec) { section = sec.dataset.sec; openSet = {}; render(); return; }

    var b = e.target.closest("[data-act]");
    if (!b || !b.dataset.path) return;
    e.preventDefault();
    var path = JSON.parse(b.dataset.path), target = getAt(draft, path), i = Number(b.dataset.i), act = b.dataset.act;
    var key = typeof path[path.length - 1] === "number" ? path[path.length - 2] : path[path.length - 1];

    if (act === "up" && i > 0) { target.splice(i - 1, 0, target.splice(i, 1)[0]); }
    if (act === "down" && i < target.length - 1) { target.splice(i + 1, 0, target.splice(i, 1)[0]); }
    if (act === "del") {
      if (!confirm((i + 1) + "번째 항목을 삭제할까요?")) return;
      target.splice(i, 1);
    }
    if (act === "add") {
      var tpl = target.length ? blank(target[target.length - 1]) : (TEMPLATES[key] !== undefined ? clone(TEMPLATES[key]) : "");
      if (tpl && tpl.week !== undefined) tpl.week = target.length + 1; // 새 주차 번호
      target.push(tpl);
      if (typeof tpl === "object") openSet[JSON.stringify(path.concat(target.length - 1))] = true;
    }
    if (act === "addkey") {
      var parentArr = path[path.length - 2];
      target[b.dataset.key] = clone(OPTIONAL[parentArr][b.dataset.key]);
    }
    if (act === "delkey") {
      if (!confirm("'" + label(b.dataset.key) + "' 항목을 뺄까요?")) return;
      delete target[b.dataset.key];
    }
    if (/^(up|down|del)$/.test(act)) openSet = {};
    markDirty();
    if (current === "content") rerenderKeepScroll(); else render();
  }

  /* =========================================================
     ② 공지
     ========================================================= */
  function today() { var d = new Date(); return A.keyOf(d); }

  function renderNoticesTab() {
    var list = draft.notices || (draft.notices = []);
    panel.innerHTML =
      info("공지는 첫 화면 바로 아래에 보입니다. '중요'로 표시한 공지가 맨 위에 옵니다. 올린 뒤 <b>저장하고 적용</b>을 누르세요.") +
      '<div class="admin-grid">' +
        '<div class="card admin-card"><h3>📢 공지 올리기</h3>' +
          '<form class="form notice-form" novalidate>' +
            '<div class="form-summary" role="alert" hidden></div>' +
            '<div class="field"><label for="nt-title">제목 <span class="req">*</span></label><input id="nt-title" name="title"></div>' +
            '<div class="field"><label for="nt-date">날짜</label><input id="nt-date" name="date" type="date" value="' + today() + '"></div>' +
            '<div class="field"><label for="nt-text">내용 <span class="req">*</span></label><textarea id="nt-text" name="text" rows="4"></textarea></div>' +
            '<label class="ed-check"><input type="checkbox" name="pinned"> 중요 공지 (맨 위에 고정)</label>' +
            '<button class="btn btn-primary" type="submit">공지 올리기</button>' +
          "</form>" +
        "</div>" +
        '<div class="card admin-card"><h3>올린 공지 (' + list.length + "건)</h3>" +
          (list.length
            ? '<ul class="admin-list">' + list.map(function (n, i) {
                return "<li><div><strong>" + (n.pinned ? "📌 " : "") + esc(n.title) + '</strong><span class="muted">' + esc(n.date) + "</span>" +
                  '<p class="muted">' + esc(n.text) + "</p></div>" + moveBtns(["notices"], i, list.length) + "</li>";
              }).join("") + "</ul>"
            : '<p class="muted">올린 공지가 없습니다.</p>') +
        "</div>" +
      "</div>";

    panel.querySelector(".notice-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var f = e.target, sum = f.querySelector(".form-summary");
      var title = f.elements.title.value.trim(), text = f.elements.text.value.trim();
      var miss = [];
      if (!title) miss.push("제목");
      if (!text) miss.push("내용");
      if (miss.length) { sum.hidden = false; sum.textContent = "빠진 항목: " + miss.join(", "); return; }
      draft.notices = draft.notices || [];
      draft.notices.unshift({ date: f.elements.date.value || today(), title: title, text: text, pinned: f.elements.pinned.checked });
      render();
      toast("공지를 추가했습니다. '저장하고 적용'을 눌러 반영하세요.");
    });
  }

  /* =========================================================
     ③ 수강생 명단 · 수강 코드
     ========================================================= */
  function renderRoster() {
    var cr = draft.classroom || (draft.classroom = {});
    cr.roster = cr.roster || [];
    panel.innerHTML =
      info("명단은 학번의 <b>지문</b>으로만 저장되어 이름·학번 원문은 설정 파일에 남지 않습니다. 명단이 비어 있으면 수강 코드를 아는 누구나 로그인할 수 있습니다.") +
      '<div class="admin-grid">' +
        '<div class="card admin-card"><h3>👥 수강생 명단 등록</h3>' +
          '<p class="admin-count">현재 <b>' + cr.roster.length + "명</b> 등록됨</p>" +
          '<div class="field"><label for="rs-list">학번 목록 (한 줄에 한 명, "학번, 이름"처럼 붙여 넣어도 됩니다)</label>' +
          '<textarea id="rs-list" rows="7" placeholder="2026000001, 홍길동&#10;2026000002, 김고대"></textarea></div>' +
          '<button class="btn btn-primary btn-sm" type="button" data-r="add">명단에 추가</button>' +
          '<p class="rs-result muted" aria-live="polite"></p>' +
        "</div>" +
        '<div class="card admin-card"><h3>🔎 명단 확인·삭제</h3>' +
          '<div class="field"><label for="rs-one">학번</label><input id="rs-one" inputmode="numeric" placeholder="숫자 10자리"></div>' +
          '<div class="btn-row"><button class="btn btn-ghost btn-sm" type="button" data-r="check">등록 여부 확인</button>' +
          '<button class="btn btn-ghost btn-sm" type="button" data-r="remove">명단에서 삭제</button></div>' +
          '<p class="rs-one-result muted" aria-live="polite"></p>' +
          '<button class="btn btn-ghost btn-sm danger" type="button" data-r="clear"' + (cr.roster.length ? "" : " disabled") + ">명단 모두 비우기</button>" +
        "</div>" +
        '<div class="card admin-card"><h3>🔑 수강 코드 바꾸기</h3>' +
          '<p class="muted">수강생이 로그인할 때 쓰는 코드입니다. 지금은 ' + (cr.codeHash ? "<b>설정되어 있습니다</b>" : "<b>없습니다</b> (코드 없이 로그인)") + ".</p>" +
          '<div class="field"><label for="cd-new">새 수강 코드 (4자 이상)</label><input id="cd-new" type="password" autocomplete="off"></div>' +
          '<div class="field"><label for="cd-new2">새 수강 코드 확인</label><input id="cd-new2" type="password" autocomplete="off"></div>' +
          '<button class="btn btn-primary btn-sm" type="button" data-r="code">수강 코드 바꾸기</button>' +
          '<p class="cd-result muted" aria-live="polite"></p>' +
        "</div>" +
        '<div class="card admin-card"><h3>📺 출석 코드</h3>' +
          '<p class="muted">비밀값이 있으면 수강생은 수업 중 화면에 띄운 <b>4자리 코드(1분마다 바뀜)</b>나 <b>QR</b>로만 출석할 수 있습니다. ' +
          "지금은 " + (cr.attendanceSecret ? "<b>사용 중</b>입니다." : "<b>사용하지 않음</b> (출석 버튼만 누르면 출석)입니다.") + "</p>" +
          '<div class="btn-row"><button class="btn btn-primary btn-sm" type="button" data-r="attnew">' + (cr.attendanceSecret ? "비밀값 새로 만들기" : "출석 코드 사용하기") + "</button>" +
          (cr.attendanceSecret ? '<button class="btn btn-ghost btn-sm danger" type="button" data-r="attoff">출석 코드 끄기</button>' : "") + "</div>" +
          '<p class="muted small">바꾼 뒤 <b>저장하고 적용</b> → 설정 파일을 내려받아 사이트에 올려야 학생 화면에도 적용됩니다. 수업 중에는 본문 편집 막대의 <b>📺 출석 코드</b>로 화면을 띄우세요.</p>' +
        "</div>" +
      "</div>";

    panel.querySelector(".admin-grid").addEventListener("click", function (e) {
      var b = e.target.closest("[data-r]");
      if (!b) return;
      var act = b.dataset.r;

      if (act === "add") {
        var lines = panel.querySelector("#rs-list").value.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
        var ids = [], skipped = [];
        lines.forEach(function (l) { var m = l.match(/\d{10}/); if (m) ids.push(m[0]); else skipped.push(l); });
        if (!ids.length) { panel.querySelector(".rs-result").textContent = "학번(숫자 10자리)을 찾지 못했습니다."; return; }
        Promise.all(ids.map(sha256)).then(function (hs) {
          var added = 0;
          hs.forEach(function (h) { if (cr.roster.indexOf(h) === -1) { cr.roster.push(h); added++; } });
          markDirty();
          renderRoster();
          panel.querySelector(".rs-result").textContent = added + "명 추가" + (ids.length - added ? ", " + (ids.length - added) + "명은 이미 있음" : "") +
            (skipped.length ? ", " + skipped.length + "줄은 학번이 없어 건너뜀" : "") + ". '저장하고 적용'을 눌러 반영하세요.";
        });
      }
      if (act === "check" || act === "remove") {
        var id = panel.querySelector("#rs-one").value.trim(), out = panel.querySelector(".rs-one-result");
        if (!/^\d{10}$/.test(id)) { out.textContent = "학번은 숫자 10자리로 입력해 주세요."; return; }
        sha256(id).then(function (h) {
          var at = cr.roster.indexOf(h);
          if (act === "check") { out.textContent = at === -1 ? "명단에 없는 학번입니다." : "명단에 등록된 학번입니다. ✔"; return; }
          if (at === -1) { out.textContent = "명단에 없는 학번입니다."; return; }
          cr.roster.splice(at, 1);
          markDirty();
          renderRoster();
          panel.querySelector(".rs-one-result").textContent = id + " 을(를) 명단에서 삭제했습니다.";
        });
      }
      if (act === "attnew") {
        if (cr.attendanceSecret && !confirm("비밀값을 새로 만들면 이전 출석 코드는 더 이상 맞지 않습니다. 계속할까요?")) return;
        cr.attendanceSecret = randomSecret();
        markDirty();
        renderRoster();
        toast("출석 코드 비밀값을 만들었습니다. '저장하고 적용'을 누르세요.");
      }
      if (act === "attoff") {
        if (!confirm("출석 코드를 끄면 출석 버튼만 눌러도 출석됩니다. 끌까요?")) return;
        cr.attendanceSecret = "";
        markDirty();
        renderRoster();
      }
      if (act === "clear") {
        if (!confirm("수강생 명단을 모두 비울까요? 비우면 수강 코드를 아는 누구나 로그인할 수 있습니다.")) return;
        cr.roster = [];
        markDirty();
        renderRoster();
      }
      if (act === "code") {
        var c1 = panel.querySelector("#cd-new").value.trim(), c2 = panel.querySelector("#cd-new2").value.trim();
        var res = panel.querySelector(".cd-result");
        if (c1.length < 4) { res.textContent = "수강 코드는 4자 이상이어야 합니다."; return; }
        if (c1 !== c2) { res.textContent = "두 코드가 같지 않습니다."; return; }
        sha256(c1).then(function (h) {
          cr.codeHash = h;
          markDirty();
          renderRoster();
          panel.querySelector(".cd-result").textContent = "수강 코드를 바꿨습니다. '저장하고 적용'을 누르고, 수강생에게 새 코드를 알려 주세요.";
        });
      }
    });
  }

  /* =========================================================
     ④ 내역 확인 · 엑셀용 파일(CSV) 내려받기
     ========================================================= */
  function csvCell(v) {
    var s = v == null ? "" : String(v);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function download(name, text, type) {
    var blob = new Blob([text], { type: type });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function downloadCsv(name, rows) {
    // 앞에 BOM(﻿)을 붙여야 엑셀에서 한글이 깨지지 않음
    download(name, "﻿" + rows.map(function (r) { return r.map(csvCell).join(","); }).join("\r\n"), "text/csv;charset=utf-8");
  }
  function fmtAt(iso) { var d = new Date(iso); return isNaN(d) ? "" : A.fmtDue(d); }
  function table(rows) {
    return '<div class="table-wrap"><table><thead><tr>' + rows[0].map(function (h) { return "<th>" + esc(h) + "</th>"; }).join("") +
      "</tr></thead><tbody>" + rows.slice(1).map(function (r) {
        return "<tr>" + r.map(function (c) { return "<td>" + esc(c) + "</td>"; }).join("") + "</tr>";
      }).join("") + "</tbody></table></div>";
  }

  function recordSets() {
    var weeks = A.weeks.map(function (w) { return w.week; });

    // 출석: 학번별로 주차를 한 줄에
    var att = store.get("attendance", []), byId = {}, order = [];
    att.forEach(function (r) {
      if (!byId[r.id]) { byId[r.id] = { name: r.name, weeks: {} }; order.push(r.id); }
      byId[r.id].weeks[r.week] = true;
    });
    var attRows = [["학번", "이름"].concat(weeks.map(function (w) { return w + "주"; }), ["출석 수"])];
    order.sort().forEach(function (id) {
      var p = byId[id], n = 0;
      attRows.push([id, p.name].concat(weeks.map(function (w) { if (p.weeks[w]) { n++; return "O"; } return ""; }), [n]));
    });

    var subs = store.get("submissions", []).slice().sort(function (a, b) { return a.week - b.week || String(a.id).localeCompare(b.id); });
    var subRows = [["학번", "이름", "주차", "과제", "파일", "크기(KB)", "제출 시각", "상태", "메모"]];
    subs.forEach(function (s) {
      subRows.push([s.id, s.name, s.week, s.title, s.file, Math.max(1, Math.round(s.size / 1024)), fmtAt(s.at), s.late ? "기한 후 제출" : "정상", s.memo || ""]);
    });

    var fields = ((draft.join || {}).apply || {}).fields || [];
    var apps = store.get("applications", []);
    var appRows = [fields.map(function (f) { return f.type === "checkbox" ? "개인정보 동의" : f.label; }).concat(["제출 시각"])];
    apps.forEach(function (a) {
      appRows.push(fields.map(function (f) { return f.type === "checkbox" ? (a[f.name] ? "동의" : "") : a[f.name] || ""; }).concat([fmtAt(a.submittedAt)]));
    });

    return [
      { key: "attendance", title: "출석", rows: attRows, count: att.length, file: "출석" },
      { key: "submissions", title: "과제 제출", rows: subRows, count: subs.length, file: "과제제출" },
      { key: "applications", title: "수강 신청", rows: appRows, count: apps.length, file: "수강신청" }
    ];
  }

  function renderRecords() {
    var sets = recordSets();
    panel.innerHTML =
      info("<b>이 브라우저에 저장된 기록만</b> 보입니다. 서버가 없어서 수강생이 각자 기기에서 남긴 기록은 여기로 모이지 않습니다.") +
      sets.map(function (s) {
        return '<div class="card admin-card rec-card"><div class="rec-head"><h3>' + s.title + " (" + s.count + "건)</h3>" +
          '<div class="btn-row"><button class="btn btn-ghost btn-sm" type="button" data-csv="' + s.key + '"' + (s.count ? "" : " disabled") + ">엑셀용 파일(CSV) 내려받기</button>" +
          '<button class="btn btn-ghost btn-sm danger" type="button" data-wipe="' + s.key + '"' + (s.count ? "" : " disabled") + ">기록 지우기</button></div></div>" +
          (s.count ? table(s.rows) : '<p class="muted">' + s.title + " 기록이 없습니다.</p>") + "</div>";
      }).join("");

    panel.querySelectorAll("[data-csv]").forEach(function (b) {
      b.addEventListener("click", function () {
        var s = recordSets().filter(function (x) { return x.key === b.dataset.csv; })[0];
        downloadCsv(s.file + "_" + today() + ".csv", s.rows);
        toast(s.title + " 파일을 내려받았습니다.");
      });
    });
    panel.querySelectorAll("[data-wipe]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!confirm("이 브라우저의 기록을 지울까요? 지우기 전에 CSV로 내려받아 두세요.")) return;
        store.remove(b.dataset.wipe);
        renderRecords();
      });
    });
  }

  /* =========================================================
     ⑤ 설정 파일 저장·불러오기 · 비밀번호
     ========================================================= */
  function configFileText(cfg) {
    return "/* =========================================================\n" +
      "   사이트 설정 파일 — 관리자 화면에서 내려받은 파일입니다. (" + today() + ")\n" +
      "   사이트 폴더의 config.js 를 이 파일로 바꾸면 모든 방문자에게 반영됩니다.\n" +
      "   ========================================================= */\n" +
      "window.SITE_CONFIG = " + JSON.stringify(cfg, null, 2) + ";\n";
  }
  function parseConfigText(text) {
    var a = text.indexOf("{"), b = text.lastIndexOf("}");
    try { return JSON.parse(text.slice(a, b + 1)); } catch (e) { /* 직접 쓴 config.js 는 JSON 이 아닐 수 있음 */ }
    if (!confirm("이 파일은 자바스크립트로 실행해서 읽어야 합니다. 직접 만든 config.js 파일이 맞나요?")) return null;
    try { return new Function("var window = {};\n" + text + "\n;return window.SITE_CONFIG;")(); } catch (e2) { return null; }
  }

  function renderSettings() {
    panel.innerHTML =
      '<div class="card admin-card"><h3>💾 설정 파일 저장·불러오기</h3>' +
        "<p>지금 편집 중인 내용을 <b>config.js</b> 파일로 내려받습니다. 사이트 폴더의 config.js 를 이 파일로 바꿔 다시 올리면 <b>모든 방문자에게</b> 반영됩니다.</p>" +
        '<div class="btn-row">' +
          '<button class="btn btn-primary btn-sm" type="button" data-s="download">설정 파일 내려받기 (config.js)</button>' +
          '<label class="btn btn-ghost btn-sm file-btn">설정 파일 불러오기<input type="file" accept=".js,.json" data-s="load" hidden></label>' +
        "</div>" +
        '<p class="muted small">※ 내려받은 파일에는 원래 config.js 의 설명(주석)이 들어가지 않습니다.</p>' +
      "</div>" +
      '<div class="card admin-card"><h3>🗂 이 브라우저의 수정본</h3>' +
        "<p>" + (hasOverride ? "지금은 <b>이 브라우저에 저장된 수정본</b>을 보여 주고 있습니다." : "지금은 <b>config.js 원본</b> 그대로 보여 주고 있습니다.") + "</p>" +
        '<button class="btn btn-ghost btn-sm" type="button" data-s="revert"' + (hasOverride ? "" : " disabled") + ">수정본 지우고 config.js 원본으로 되돌리기</button>" +
      "</div>" +
      '<div class="card admin-card"><h3>🔑 관리자 비밀번호 바꾸기</h3>' +
        '<p class="muted small">비밀번호 자체는 저장되지 않고 지문만 설정에 들어갑니다. 바꾼 뒤 <b>저장하고 적용</b> → 설정 파일을 내려받아 교체해야 다른 기기에도 적용됩니다.</p>' +
        '<div class="field"><label for="pw-new">새 비밀번호 <span class="req">*</span></label><input id="pw-new" type="password" autocomplete="new-password"></div>' +
        '<div class="field"><label for="pw-new2">비밀번호 확인 <span class="req">*</span></label><input id="pw-new2" type="password" autocomplete="new-password"></div>' +
        '<button class="btn btn-primary btn-sm" type="button" data-s="password">비밀번호 변경</button>' +
        '<p class="pw-result muted" aria-live="polite"></p>' +
      "</div>" +
      info("참고: 서버 없는 사이트의 관리자 잠금은 화면을 가려 주는 수준입니다. 설정 파일은 누구나 내려받을 수 있으니 비밀번호는 길고 다른 곳에서 쓰지 않는 것으로 정하고, 민감한 개인정보는 사이트에 넣지 마세요.");

    panel.querySelector('[data-s="download"]').addEventListener("click", function () {
      download("config.js", configFileText(draft), "text/javascript;charset=utf-8");
      toast("config.js 를 내려받았습니다. 사이트 폴더의 config.js 와 바꿔 주세요.");
    });
    panel.querySelector('[data-s="load"]').addEventListener("change", function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var cfg = parseConfigText(String(reader.result));
        if (!cfg || !cfg.site || !cfg.nav) { toast("설정 파일을 읽지 못했습니다. 이 사이트의 config.js 가 맞는지 확인해 주세요."); return; }
        draft = cfg;
        openSet = {};
        render();
        toast("설정 파일을 불러왔습니다. 확인한 뒤 '저장하고 적용'을 누르세요.");
      };
      reader.readAsText(file, "utf-8");
    });
    panel.querySelector('[data-s="revert"]').addEventListener("click", function () {
      if (!confirm("이 브라우저의 수정본을 지우고 config.js 원본으로 되돌릴까요? 필요하면 먼저 설정 파일을 내려받아 두세요.")) return;
      store.remove("configOverride");
      ss("adminReopen", "settings");
      location.reload();
    });
    panel.querySelector('[data-s="password"]').addEventListener("click", function () {
      var p1 = panel.querySelector("#pw-new").value, p2 = panel.querySelector("#pw-new2").value, res = panel.querySelector(".pw-result");
      if (p1.length < 6) { res.textContent = "비밀번호는 6자 이상이어야 합니다."; return; }
      if (p1 !== p2) { res.textContent = "두 비밀번호가 같지 않습니다."; return; }
      sha256(SALT + p1).then(function (h) {
        draft.admin = draft.admin || {};
        draft.admin.passwordHash = h;
        markDirty();
        panel.querySelector("#pw-new").value = panel.querySelector("#pw-new2").value = "";
        res.textContent = "비밀번호를 바꿨습니다. '저장하고 적용'을 눌러야 반영됩니다.";
      });
    });
  }

  /* =========================================================
     ⑥ 본문에서 바로 수정하기
     관리자로 로그인하면 본문(커리큘럼·달력·포트폴리오·참여하기·FAQ)에
     ✏️ 수정 · 🗑 삭제 · ↑↓ · + 추가 버튼이 보입니다.
     저장하면 이 브라우저의 수정본에 바로 반영되고, 보던 위치로 새로고침됩니다.
     ========================================================= */
  var EDIT_PATHS = {
    week: ["curriculum", "weeks"], faq: ["faq", "items"], pf: ["portfolio", "items"],
    poll: ["join", "polls"], event: ["curriculum", "events"], jc: ["curriculum", "journalClub"]
  };
  var KIND_NAME = { week: "주차", faq: "질문", pf: "과제물", poll: "설문", event: "일정", jc: "발표" };
  var KIND_OBJ = { week: "주차를", faq: "질문을", pf: "과제물을", poll: "설문을", event: "일정을", jc: "발표를" };

  function nowLocal() { // "2026-10-04T11:30"
    var d = new Date();
    return A.keyOf(d) + "T" + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  }
  function setOpt(o, k, v) { if (v) o[k] = v; else delete o[k]; }
  // 예전 설정(poll 한 개)을 설문 목록(polls)으로 바꿔 줌
  function ensurePolls(cfg) {
    cfg.join = cfg.join || {};
    if (!cfg.join.polls) {
      var old = cfg.join.poll;
      cfg.join.polls = old && old.options
        ? [{ id: "default", question: old.question, hint: old.hint, options: old.options, author: "관리자", createdAt: "", status: "open" }]
        : [];
    }
    delete cfg.join.poll;
    return cfg.join.polls;
  }

  /* 저장: 지금 적용된 설정을 복사해 고친 뒤 이 브라우저의 수정본으로 저장하고 새로고침
     · 새로고침 뒤에 고친 항목이 화면의 같은 높이에 오도록 기준 요소(id 가 있는 가장 가까운 상위 요소)를 기록 */
  var lastClicked = null;
  function commit(mutate, restore) {
    if (isDirty() && !confirm("관리자 화면에 저장하지 않은 변경이 있습니다. 그 변경을 버리고 계속할까요?")) return;
    var next = clone(base);
    if (mutate(next) === false) return;
    if (!store.set("configOverride", next)) { toast("저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요."); return; }
    restore = restore || {};
    restore.y = window.scrollY;
    var from = openEditor || lastClicked;
    var anchorEl = from && from.parentNode && from.parentNode.closest("[id]");
    if (restore.anchor) { // 양식에서 기준 요소를 직접 정한 경우
      var fixed = document.getElementById(restore.anchor);
      restore.offset = fixed ? Math.round(Math.min(Math.max(fixed.getBoundingClientRect().top, 90), window.innerHeight * 0.5)) : 120;
    } else if (anchorEl && anchorEl.tagName !== "SECTION") { // 섹션 전체가 기준이면 스크롤 위치(y)를 그대로 사용
      restore.anchor = anchorEl.id;
      // 고친 항목의 윗부분이 헤더 아래에 보이도록 범위를 제한
      restore.offset = Math.round(Math.min(Math.max(anchorEl.getBoundingClientRect().top, 90), window.innerHeight * 0.5));
    }
    restore.msg = restore.msg || "저장했습니다. (이 브라우저에 반영 · 모든 방문자에게는 config.js 교체 필요)";
    ss("restore", JSON.stringify(restore));
    location.reload();
  }

  /* ---------- 본문에 끼워 넣는 수정 양식 ---------- */
  var openEditor = null;
  function closeEditor() { if (openEditor) { openEditor.remove(); openEditor = null; } }

  function fieldHtml(f, v) {
    var id = "ie-" + f.name, help = f.help ? '<small class="ie-help">' + esc(f.help) + "</small>" : "";
    var req = f.required ? ' <span class="req">*</span>' : "";
    var group = f.group ? ' data-group="' + f.group + '"' : "";
    if (f.type === "checkbox") {
      return '<label class="ed-check ie-field"' + group + '><input type="checkbox" name="' + f.name + '"' + (v ? " checked" : "") + "> " + esc(f.label) + "</label>";
    }
    var input;
    if (f.type === "select") {
      input = '<select id="' + id + '" name="' + f.name + '">' + f.options.map(function (o) {
        var val = Array.isArray(o) ? o[0] : o, lab = Array.isArray(o) ? o[1] : o;
        return '<option value="' + esc(val) + '"' + (String(v) === String(val) ? " selected" : "") + ">" + esc(lab) + "</option>";
      }).join("") + "</select>";
    } else if (f.type === "textarea" || f.type === "lines" || f.type === "links") {
      var text = f.type === "lines" ? (v || []).join("\n")
        : f.type === "links" ? (v || []).map(function (x) { return (x.title || "") + " | " + (x.url || ""); }).join("\n")
        : v || "";
      input = '<textarea id="' + id + '" name="' + f.name + '" rows="' + (f.rows || 3) + '" placeholder="' + esc(f.placeholder || "") + '">' + esc(text) + "</textarea>";
    } else {
      input = '<input id="' + id + '" name="' + f.name + '" type="' + (f.type || "text") + '" value="' + esc(v == null ? "" : v) + '" placeholder="' + esc(f.placeholder || "") + '">';
    }
    return '<div class="field ie-field' + (f.wide ? " wide" : "") + '"' + group + '><label for="' + id + '">' + esc(f.label) + req + "</label>" + input + help + "</div>";
  }

  function readField(form, f) {
    var el = form.elements[f.name];
    if (f.type === "checkbox") return el.checked;
    var v = String(el.value || "").trim();
    if (f.type === "number") return v === "" ? "" : Number(v);
    if (f.type === "lines") return v.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (f.type === "links") {
      return v.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
        var p = s.split("|");
        return { title: (p[0] || "").trim(), url: p.slice(1).join("|").trim() };
      });
    }
    return v;
  }

  /* opts: { title, fields, values, place(el), onSave(values), validate(values), groupToggle } */
  function inlineForm(anchor, opts, position) {
    closeEditor();
    var box = document.createElement("div");
    box.className = "card inline-editor";
    box.innerHTML =
      '<h4 class="ie-title">' + esc(opts.title) + "</h4>" +
      '<form class="form ie-form" novalidate>' +
        '<div class="form-summary" role="alert" hidden></div>' +
        '<div class="ie-grid">' + opts.fields.map(function (f) { return fieldHtml(f, (opts.values || {})[f.name]); }).join("") + "</div>" +
        '<div class="ie-actions"><button class="btn btn-primary btn-sm" type="submit">저장</button>' +
        '<button class="btn btn-ghost btn-sm" type="button" data-ie-cancel>취소</button></div>' +
      "</form>";
    if (position === "before") anchor.parentNode.insertBefore(box, anchor);
    else anchor.parentNode.insertBefore(box, anchor.nextSibling);
    openEditor = box;
    var form = box.querySelector("form");

    // '과제 있음' 같은 체크에 따라 일부 칸만 보이기
    function syncGroups() {
      if (!opts.groupToggle) return;
      var on = form.elements[opts.groupToggle.by].checked;
      Array.prototype.forEach.call(box.querySelectorAll('[data-group="' + opts.groupToggle.group + '"]'), function (el) { el.hidden = !on; });
    }
    if (opts.groupToggle) form.elements[opts.groupToggle.by].addEventListener("change", syncGroups);
    syncGroups();

    box.querySelector("[data-ie-cancel]").addEventListener("click", closeEditor);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var values = {}, miss = [];
      opts.fields.forEach(function (f) {
        values[f.name] = readField(form, f);
        var hiddenByGroup = f.group && opts.groupToggle && !form.elements[opts.groupToggle.by].checked;
        var empty = Array.isArray(values[f.name]) ? !values[f.name].length : values[f.name] === "" || values[f.name] === false;
        if ((f.required || (f.requiredInGroup && !hiddenByGroup)) && empty) miss.push(f.label.replace(/\s*\(.*\)$/, ""));
      });
      var sum = form.querySelector(".form-summary");
      var err = miss.length ? "빠진 항목: " + miss.join(", ") : opts.validate ? opts.validate(values) : "";
      if (err) { sum.hidden = false; sum.textContent = err; return; }
      opts.onSave(values);
    });
    box.scrollIntoView({ behavior: "smooth", block: "center" });
    var first = form.querySelector("input:not([type=checkbox]), textarea, select");
    if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 300);
  }

  /* ---------- 항목별 수정 양식 ---------- */
  function weekForm(btn, i) {
    var list = (base.curriculum || {}).weeks || [];
    var sched = (base.curriculum || {}).schedule || {};
    var maxWeek = list.reduce(function (m, w) { return Math.max(m, Number(w.week) || 0); }, 0);
    var w = i == null ? { week: maxWeek + 1, title: "", text: "" } : clone(list[i]);
    var a = w.assignment || {};
    inlineForm(btn, {
      title: i == null ? "주차 추가" : w.week + "주차 수정",
      fields: [
        { name: "week", label: "주차 번호", type: "number", required: true },
        { name: "title", label: "제목", required: true },
        { name: "text", label: "한 줄 요약", wide: true },
        { name: "date", label: "날짜", type: "date", help: "비우면 첫 수업일에서 자동 계산" },
        { name: "time", label: "시간", help: "비우면 기본값 (" + (sched.time || "-") + ")" },
        { name: "place", label: "장소", help: "비우면 기본값 (" + (sched.place || "-") + ")" },
        { name: "exam", label: "시험 주", type: "checkbox" },
        { name: "topics", label: "학습 내용 (한 줄에 하나)", type: "lines", rows: 4, wide: true },
        { name: "videos", label: "참고 영상 (한 줄에 \"제목 | 주소\")", type: "links", rows: 3, wide: true, placeholder: "활동전위 강의 | https://www.youtube.com/watch?v=..." },
        { name: "resources", label: "강의 자료 (한 줄에 \"제목 | 주소\")", type: "links", rows: 3, wide: true,
          placeholder: "3주차 슬라이드 | https://drive.google.com/…", help: "주소를 비우면 '준비 중'으로 보입니다. 구글 드라이브·LMS 주소를 넣으세요." },
        { name: "hasHw", label: "이 주에 과제가 있음", type: "checkbox", wide: true },
        { name: "aTitle", label: "과제 제목", group: "hw", requiredInGroup: true },
        { name: "aDue", label: "마감 일시", type: "datetime-local", group: "hw" },
        { name: "aText", label: "과제 설명", type: "textarea", group: "hw", wide: true },
        { name: "aSubmit", label: "제출 주소", group: "hw", wide: true, help: "비우면 '내 강의실'에서 제출 (LMS·구글 폼 주소를 넣으면 그쪽으로 연결)" }
      ],
      values: {
        week: w.week, title: w.title, text: w.text, date: w.date, time: w.time, place: w.place, exam: !!w.exam,
        topics: w.topics, videos: w.videos, resources: w.resources, hasHw: !!w.assignment,
        aTitle: a.title, aDue: a.due, aText: a.text, aSubmit: a.submitUrl
      },
      groupToggle: { by: "hasHw", group: "hw" },
      validate: function (v) {
        var dup = list.some(function (x, k) { return k !== i && Number(x.week) === Number(v.week); });
        return dup ? v.week + "주차가 이미 있습니다. 주차 번호를 확인해 주세요." : "";
      },
      onSave: function (v) {
        commit(function (next) {
          var arr = next.curriculum.weeks = next.curriculum.weeks || [];
          var o = i == null ? {} : arr[i];
          o.week = Number(v.week); o.title = v.title; o.text = v.text;
          setOpt(o, "date", v.date); setOpt(o, "time", v.time); setOpt(o, "place", v.place);
          if (v.exam) o.exam = true; else delete o.exam;
          o.topics = v.topics;
          if (v.videos.length) o.videos = v.videos; else delete o.videos;
          if (v.resources.length) o.resources = v.resources; else delete o.resources;
          if (v.hasHw) o.assignment = { title: v.aTitle, text: v.aText, due: v.aDue, submitUrl: v.aSubmit };
          else delete o.assignment;
          if (i == null) arr.push(o);
        }, { openWeek: Number(v.week), msg: v.week + "주차를 저장했습니다." });
      }
    });
  }

  function scheduleForm(btn) {
    var s = (base.curriculum || {}).schedule || {};
    inlineForm(btn, {
      title: "수업 일정 기본값",
      fields: [
        { name: "firstClass", label: "첫 수업일", type: "date", required: true, help: "이 요일이 매주 수업 요일이 되고, 15주 날짜가 7일 간격으로 다시 계산됩니다." },
        { name: "time", label: "수업 시간", required: true, placeholder: "13:00 – 15:00" },
        { name: "place", label: "수업 장소", wide: true }
      ],
      values: s,
      onSave: function (v) {
        commit(function (next) {
          next.curriculum.schedule = { firstClass: v.firstClass, time: v.time, place: v.place };
        }, { calKey: v.firstClass, anchor: "calendar", msg: "수업 일정 기본값을 저장했습니다." });
      }
    });
  }

  function eventForm(btn, i) {
    var list = (base.curriculum || {}).events || [];
    var e = i == null ? { date: btn.dataset.date || today(), type: "휴강", title: "", text: "" } : clone(list[i]);
    inlineForm(btn, {
      title: i == null ? "달력 일정 추가" : "달력 일정 수정",
      fields: [
        { name: "date", label: "날짜", type: "date", required: true },
        { name: "type", label: "종류", type: "select", options: A.EVENT_TYPES, required: true, help: "'휴강'을 수업일에 넣으면 커리큘럼에도 휴강 표시" },
        { name: "title", label: "제목", required: true, wide: true, placeholder: "예: 어린이날 휴강" },
        { name: "text", label: "내용", type: "textarea", wide: true }
      ],
      values: e,
      onSave: function (v) {
        commit(function (next) {
          var arr = next.curriculum.events = next.curriculum.events || [];
          var o = { date: v.date, type: v.type, title: v.title, text: v.text };
          if (i == null) arr.push(o); else arr[i] = o;
          arr.sort(function (x, y) { return String(x.date).localeCompare(String(y.date)); });
        }, { calKey: v.date, anchor: "calendar", msg: "달력 일정을 저장했습니다." });
      }
    });
  }

  function pfForm(btn, i) {
    var p = base.portfolio || {};
    var cats = p.categories || [];
    var list = p.items || [];
    var it = i == null ? { driveUrl: "", title: "", student: "", term: "", category: cats[0] || "", description: "", sample: false } : clone(list[i]);
    var anchor = i == null ? btn : btn.closest(".pf-card");
    inlineForm(anchor, {
      title: i == null ? "과제물 등록" : "과제물 수정",
      fields: [
        { name: "driveUrl", label: "구글 드라이브 주소", required: true, wide: true, placeholder: "https://drive.google.com/file/d/…/view",
          help: "드라이브에서 파일 → 공유 → '링크가 있는 모든 사용자 – 뷰어' → 링크 복사. 파일·문서·슬라이드·폴더 주소 모두 됩니다." },
        { name: "title", label: "과제물 제목", required: true },
        { name: "student", label: "학생 표시 이름", required: true, placeholder: "예: 김○○ 또는 수강생 A" },
        { name: "term", label: "학기·과제 구분", placeholder: "예: 2026 상반기 · 기말 프로젝트" },
        cats.length
          ? { name: "category", label: "분류", type: "select", options: cats, required: true }
          : { name: "category", label: "분류", required: true },
        { name: "description", label: "소개", type: "textarea", wide: true },
        { name: "sample", label: "샘플 (열기 버튼 막기)", type: "checkbox", wide: true }
      ],
      values: it,
      validate: function (v) {
        return A.driveInfo(v.driveUrl) ? "" : "구글 드라이브 주소가 아닙니다. 드라이브에서 '링크 복사'로 얻은 주소를 붙여 넣어 주세요.";
      },
      onSave: function (v) {
        commit(function (next) {
          next.portfolio = next.portfolio || { title: "우수 과제 포트폴리오", items: [] };
          var arr = next.portfolio.items = next.portfolio.items || [];
          var o = { driveUrl: v.driveUrl, title: v.title, student: v.student, term: v.term, category: v.category, description: v.description, sample: v.sample };
          if (i == null) arr.unshift(o); else arr[i] = o;
        }, { msg: i == null ? "과제물을 등록했습니다." : "과제물을 수정했습니다." });
      }
    }, i == null ? "after" : "after");
  }

  function pollForm(btn, i) {
    var cfg = clone(base);
    var list = ensurePolls(cfg);
    var p = i == null
      ? { question: "", hint: "하나를 골라 주세요. 다시 눌러 바꿀 수 있습니다.", options: [], author: "관리자", status: "open" }
      : list[i];
    var anchor = i == null ? document.querySelector(".poll-head") : document.querySelector(".poll-history");
    inlineForm(anchor, {
      title: i == null ? "설문 추가" : "설문 수정",
      fields: [
        { name: "question", label: "설문 질문", required: true, wide: true },
        { name: "hint", label: "안내 문구", wide: true },
        { name: "options", label: "선택지 (한 줄에 하나, 2개 이상)", type: "lines", rows: 5, required: true, wide: true,
          help: i == null ? "" : "선택지를 바꾸면 이 브라우저에 쌓인 이 설문의 투표 결과가 초기화됩니다." },
        { name: "author", label: "주체(작성자)", required: true },
        { name: "status", label: "상태", type: "select", options: [["open", "진행 중"], ["closed", "마감 (결과만 보기)"], ["draft", "준비 중 (방문자에게 숨김)"]] }
      ],
      values: p,
      validate: function (v) { return v.options.length < 2 ? "선택지를 2개 이상 입력해 주세요." : ""; },
      onSave: function (v) {
        var id = i == null ? "p" + Date.now().toString(36) : p.id;
        commit(function (next) {
          var arr = ensurePolls(next);
          if (i == null) {
            arr.push({ id: id, question: v.question, hint: v.hint, options: v.options, author: v.author, createdAt: nowLocal(), status: v.status });
          } else {
            var o = arr[i];
            if (JSON.stringify(o.options) !== JSON.stringify(v.options)) store.remove("poll." + o.id);
            o.question = v.question; o.hint = v.hint; o.options = v.options; o.author = v.author; o.status = v.status;
          }
        }, { poll: id, anchor: i == null ? "poll-card" : "poll-history", msg: i == null ? "설문을 추가했습니다." : "설문을 수정했습니다." });
      }
    });
  }

  function faqForm(btn, i) {
    var list = (base.faq || {}).items || [];
    var it = i == null ? { q: "", a: "" } : list[i];
    inlineForm(btn, {
      title: i == null ? "질문 추가" : "질문 수정",
      fields: [
        { name: "q", label: "질문", required: true, wide: true },
        { name: "a", label: "답변", type: "textarea", required: true, wide: true, rows: 4 }
      ],
      values: it,
      onSave: function (v) {
        var idx = i == null ? list.length : i;
        commit(function (next) {
          var arr = next.faq.items = next.faq.items || [];
          if (i == null) arr.push({ q: v.q, a: v.a }); else arr[i] = { q: v.q, a: v.a };
        }, { openFaq: idx, msg: "질문을 저장했습니다." });
      }
    }, i == null ? "before" : "after");
  }

  function jcForm(btn, i) {
    var list = (base.curriculum || {}).journalClub || [];
    var weekNums = ((base.curriculum || {}).weeks || []).map(function (w) { return [String(w.week), w.week + "주차 · " + w.title]; });
    var j = i == null ? { week: weekNums.length ? weekNums[0][0] : "", presenter: "", paper: "", link: "" } : clone(list[i]);
    j.week = String(j.week);
    inlineForm(btn, {
      title: i == null ? "논문 발표 배정 추가" : "논문 발표 수정",
      fields: [
        { name: "week", label: "주차", type: "select", options: weekNums, required: true },
        { name: "presenter", label: "발표자", required: true, placeholder: "예: 김○○" },
        { name: "paper", label: "논문", required: true, wide: true, placeholder: "저자 (연도). 제목. 학술지" },
        { name: "link", label: "논문 주소", wide: true, placeholder: "https://doi.org/…", help: "DOI·PubMed·드라이브 주소 (선택)" }
      ],
      values: j,
      onSave: function (v) {
        commit(function (next) {
          var arr = next.curriculum.journalClub = next.curriculum.journalClub || [];
          var o = { week: Number(v.week), presenter: v.presenter, paper: v.paper, link: v.link };
          if (i == null) arr.push(o); else arr[i] = o;
          arr.sort(function (a, b) { return a.week - b.week; });
        }, { anchor: "journal-club", msg: "논문 발표 배정을 저장했습니다." });
      }
    });
  }

  /* ---------- 출석 코드 화면 (교실 화면·프로젝터에 띄우기) ----------
     1분마다 바뀌는 4자리 코드와, 찍으면 코드가 입력된 채로 '내 강의실'이 열리는 QR 을 보여 줌 */
  var QR_LIB = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
  function loadQr() {
    if (window.QRCode) return Promise.resolve(true);
    return new Promise(function (resolve) {
      var s = document.createElement("script");
      s.src = QR_LIB;
      s.onload = function () { resolve(!!window.QRCode); };
      s.onerror = function () { resolve(false); };
      document.head.appendChild(s);
    });
  }
  function openAttendanceScreen() {
    var secret = (base.classroom || {}).attendanceSecret;
    if (!secret) {
      if (confirm("아직 출석 코드 비밀값이 없습니다. 지금 만들까요?\n(만든 뒤 config.js 를 내려받아 교체해야 학생 화면에서도 코드가 확인됩니다)")) {
        commit(function (next) { next.classroom.attendanceSecret = randomSecret(); }, { anchor: "classroom", msg: "출석 코드 비밀값을 만들었습니다. 이제 '출석 코드 화면 띄우기'를 누르세요." });
      }
      return;
    }
    var published = ((A.original || {}).classroom || {}).attendanceSecret === secret;
    var today = A.keyOf(new Date());
    var w = A.weeks.filter(function (x) { return x.key === today; })[0];
    var scr = document.createElement("div");
    scr.className = "att-screen";
    scr.setAttribute("role", "dialog");
    scr.setAttribute("aria-label", "출석 코드");
    scr.innerHTML =
      '<button type="button" class="att-close" aria-label="닫기">× 닫기</button>' +
      '<p class="att-week">' + esc((base.site || {}).courseName ? "「" + base.site.courseName + "」 " : "") + (w ? w.week + "주차 · " + esc(w.src.title) : "오늘 수업 (" + today + ")") + "</p>" +
      '<p class="att-label">출석 코드</p>' +
      '<p class="att-big" aria-live="polite">----</p>' +
      '<div class="att-timer"><span></span></div>' +
      '<p class="att-hint">사이트 → 내 강의실 → 로그인 → 코드 입력, 또는 QR을 찍으세요. 코드는 1분마다 바뀝니다.</p>' +
      '<div class="att-qr"></div>' +
      (published ? "" : '<p class="att-warn">⚠ 이 비밀값은 아직 이 브라우저에만 있습니다. 관리자 화면에서 config.js 를 내려받아 사이트에 올려야 학생 화면에서 코드가 맞다고 확인됩니다.</p>');
    document.body.appendChild(scr);
    document.documentElement.classList.add("admin-open");

    var big = scr.querySelector(".att-big"), bar = scr.querySelector(".att-timer span"), qrBox = scr.querySelector(".att-qr");
    var lastCode = null, timer = null;
    var siteUrl = location.origin + location.pathname;
    var canQr = /^https?:/.test(location.protocol);
    function tick() {
      var slot = A.codeSlot();
      bar.style.width = (100 - ((Date.now() % 60000) / 600)) + "%";
      A.attendanceCode(secret, today, slot).then(function (code) {
        if (code === lastCode) return;
        lastCode = code;
        big.textContent = code;
        if (!canQr) { qrBox.innerHTML = '<p class="att-hint">QR 은 사이트를 인터넷에 올린 뒤(배포 후) 표시됩니다.</p>'; return; }
        loadQr().then(function (ok) {
          qrBox.innerHTML = "";
          if (!ok) { qrBox.innerHTML = '<p class="att-hint">QR 을 불러오지 못했습니다. 코드로 출석해 주세요.</p>'; return; }
          new window.QRCode(qrBox, { text: siteUrl + "?att=" + code, width: 220, height: 220, colorDark: "#6e0020", colorLight: "#ffffff", correctLevel: window.QRCode.CorrectLevel.M });
        });
      });
    }
    tick();
    timer = setInterval(tick, 1000);
    function close() {
      clearInterval(timer);
      scr.remove();
      document.documentElement.classList.remove("admin-open");
      document.removeEventListener("keydown", onKey);
    }
    function onKey(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onKey);
    scr.querySelector(".att-close").addEventListener("click", close);
  }
  function randomSecret() {
    var a = new Uint8Array(16);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  }

  function headForm(btn, sec) {
    var s = base[sec] || {};
    var fields = [
      { name: "eyebrow", label: "작은 제목(영문)" },
      { name: "title", label: "제목", required: true },
      { name: "lead", label: "소개 문구", wide: true }
    ];
    if (sec === "join" || sec === "portfolio") fields.push({ name: "notice", label: "안내 문구 (점선 상자)", wide: true });
    if (sec === "portfolio") fields.push({ name: "categories", label: "분류 목록 (한 줄에 하나)", type: "lines", rows: 4, wide: true });
    inlineForm(btn.closest(".admin-ctrl"), {
      title: "제목·소개 수정",
      fields: fields,
      values: s,
      onSave: function (v) {
        commit(function (next) {
          var o = next[sec] = next[sec] || {};
          fields.forEach(function (f) { o[f.name] = v[f.name]; });
        }, { msg: "제목·소개를 저장했습니다." });
      }
    });
  }

  /* ---------- 위로 · 아래로 · 삭제 ---------- */
  function moveOrDelete(kind, act, i) {
    var path = EDIT_PATHS[kind];
    var cfg = clone(base);
    var arr = kind === "poll" ? ensurePolls(cfg) : getAt(cfg, path) || [];
    var item = arr[i];
    if (!item) return;
    var name = item.title || item.q || item.question || item.paper || (item.week ? item.week + "주차" : KIND_NAME[kind]);
    if (act === "del" && !confirm("'" + name + "' " + KIND_OBJ[kind] + " 삭제할까요?")) return;

    var restore = {};
    if (kind === "week" && act !== "del") restore.openWeek = item.week;
    if (kind === "event") { restore.calKey = item.date; restore.anchor = "calendar"; }
    if (kind === "poll") restore.anchor = "poll-history";
    if (kind === "jc") restore.anchor = "journal-club";
    if (kind === "faq" && act !== "del") restore.openFaq = act === "up" ? i - 1 : i + 1;
    restore.msg = act === "del" ? KIND_OBJ[kind] + " 삭제했습니다." : "순서를 바꿨습니다.";

    commit(function (next) {
      var a = kind === "poll" ? ensurePolls(next) : getAt(next, path);
      if (act === "del") {
        a.splice(i, 1);
        if (kind === "poll") store.remove("poll." + item.id);
      }
      if (act === "up" && i > 0) a.splice(i - 1, 0, a.splice(i, 1)[0]);
      if (act === "down" && i < a.length - 1) a.splice(i + 1, 0, a.splice(i, 1)[0]);
    }, restore);
  }

  /* ---------- 본문 버튼 클릭 처리 ---------- */
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-edit]");
    if (!b || !isAdmin() || (root && root.contains(b))) return;
    e.preventDefault();
    e.stopPropagation();
    lastClicked = b;
    var kind = b.dataset.kind, act = b.dataset.edit;
    var i = b.dataset.i != null ? Number(b.dataset.i) : null;

    if (kind === "head") return headForm(b, b.dataset.sec);
    if (kind === "schedule") return scheduleForm(b);
    if (act === "attscreen") return openAttendanceScreen();
    if (act === "up" || act === "down" || act === "del") return moveOrDelete(kind, act, i);
    var idx = act === "add" ? null : i;
    var anchor = b.closest(".admin-ctrl") || b;
    if (kind === "week") weekForm(anchor, idx);
    if (kind === "event") eventForm(act === "add" ? b : anchor, idx);
    if (kind === "pf") pfForm(act === "add" ? b : anchor, idx);
    if (kind === "poll") pollForm(b, idx);
    if (kind === "faq") faqForm(act === "add" ? b : anchor, idx);
    if (kind === "jc") jcForm(act === "add" ? b : (b.closest(".jc-card") || anchor).querySelector(".table-wrap") || anchor, idx);
  }, true);

  /* ---------- 화면 아래 편집 막대 ---------- */
  function setupEditBar() {
    if (!isAdmin()) return;
    if (ss("editHidden") === "1") document.documentElement.classList.add("edit-hidden");
    var bar = document.createElement("div");
    bar.className = "edit-bar";
    bar.innerHTML =
      '<span class="eb-title">✏️ 본문 편집 모드</span>' +
      '<button type="button" data-eb="toggle"></button>' +
      '<button type="button" data-eb="att">📺 출석 코드</button>' +
      '<button type="button" data-eb="admin">관리자 화면</button>' +
      '<button type="button" data-eb="download" title="본문에서 고친 내용을 모든 방문자에게 반영하려면 이 파일로 config.js 를 교체">config.js 내려받기</button>';
    document.body.appendChild(bar);
    function label() {
      bar.querySelector('[data-eb="toggle"]').textContent =
        document.documentElement.classList.contains("edit-hidden") ? "편집 버튼 보이기" : "방문자 화면으로 보기";
    }
    label();
    bar.addEventListener("click", function (e) {
      var b = e.target.closest("[data-eb]");
      if (!b) return;
      if (b.dataset.eb === "toggle") {
        var hidden = document.documentElement.classList.toggle("edit-hidden");
        ss("editHidden", hidden ? "1" : null);
        closeEditor();
        label();
      }
      if (b.dataset.eb === "admin") openAdmin();
      if (b.dataset.eb === "att") openAttendanceScreen();
      if (b.dataset.eb === "download") {
        download("config.js", configFileText(base), "text/javascript;charset=utf-8");
        toast("config.js 를 내려받았습니다. 사이트 폴더의 config.js 와 바꿔 주세요.");
      }
    });
  }

  /* ---------- 시작 ---------- */
  setupEditBar();
  updateLock();
  var reopen = ss("adminReopen");
  if (reopen && isAdmin()) {
    ss("adminReopen", null);
    openAdmin(reopen);
    toast("저장하고 적용했습니다.");
  }
})();
