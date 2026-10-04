/* =========================================================
   config.js 의 내용을 읽어 화면을 그리고 움직이게 하는 코드
   (내용을 바꾸려면 이 파일이 아니라 config.js 를 고치세요)
   ========================================================= */
(function () {
  "use strict";

  var C = window.SITE_CONFIG;
  if (!C) {
    document.body.innerHTML =
      '<p style="padding:40px;font-family:sans-serif">config.js 를 불러오지 못했습니다. 파일 이름과 위치를 확인해 주세요.</p>';
    return;
  }

  /* 관리자 화면에서 '저장하고 적용'한 수정본이 이 브라우저에 있으면 그것을 사용
     · 주소 끝에 ?reset 을 붙이면 수정본을 버리고 config.js 원본으로 돌아감 */
  var ORIGINAL = C, hasOverride = false;
  try {
    if (/[?&]reset\b/.test(location.search)) {
      localStorage.removeItem("aiweb.configOverride");
      history.replaceState(null, "", location.pathname + location.hash);
    }
    var ov = localStorage.getItem("aiweb.configOverride");
    if (ov) { C = JSON.parse(ov); hasOverride = true; }
  } catch (e) { C = ORIGINAL; }

  /* 관리자로 로그인한 상태면 본문에 수정 버튼을 함께 그림 (클릭 처리는 admin.js)
     · RESTORE: 본문에서 수정·저장한 뒤 새로고침되었을 때 보던 위치로 돌아가기 위한 정보 */
  var ADMIN = false, RESTORE = null;
  try {
    ADMIN = sessionStorage.getItem("aiweb.admin") === "1";
    RESTORE = JSON.parse(sessionStorage.getItem("aiweb.restore") || "null");
    sessionStorage.removeItem("aiweb.restore");
  } catch (e) { /* 무시 */ }
  if (ADMIN) document.documentElement.classList.add("is-admin");

  /* ---------- 도우미 ---------- */
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function $(sel) { return document.querySelector(sel); }
  function sectionHead(s, key) {
    return (
      '<div class="section-head">' +
      '<span class="eyebrow">' + esc(s.eyebrow) + "</span>" +
      "<h2>" + esc(s.title) + "</h2>" +
      (s.lead ? '<p class="lead">' + esc(s.lead) + "</p>" : "") +
      (ADMIN && key ? '<div class="admin-ctrl head-ctrl"><button type="button" data-edit="edit" data-kind="head" data-sec="' + key + '">✏️ 제목·소개 수정</button></div>' : "") +
      "</div>"
    );
  }

  /* 관리자용 수정 버튼 묶음 (관리자가 아니면 아무것도 그리지 않음) */
  function adminCtrl(kind, i, n, noMove) {
    if (!ADMIN) return "";
    return '<div class="admin-ctrl">' +
      '<button type="button" data-edit="edit" data-kind="' + kind + '" data-i="' + i + '">✏️ 수정</button>' +
      (!noMove && n > 1
        ? '<button type="button" data-edit="up" data-kind="' + kind + '" data-i="' + i + '" aria-label="위로"' + (i === 0 ? " disabled" : "") + ">↑</button>" +
          '<button type="button" data-edit="down" data-kind="' + kind + '" data-i="' + i + '" aria-label="아래로"' + (i === n - 1 ? " disabled" : "") + ">↓</button>"
        : "") +
      '<button type="button" class="del" data-edit="del" data-kind="' + kind + '" data-i="' + i + '">🗑 삭제</button>' +
    "</div>";
  }
  function adminAdd(kind, label, attrs) {
    if (!ADMIN) return "";
    return '<button type="button" class="admin-add" data-edit="add" data-kind="' + kind + '"' + (attrs || "") + ">+ " + esc(label) + "</button>";
  }
  function wrap(inner) { return '<div class="container">' + inner + "</div>"; }

  /* 브라우저 저장소 (사생활 보호 모드 등에서 막혀 있어도 사이트가 멈추지 않도록) */
  var store = {
    get: function (k, fallback) {
      try { var v = localStorage.getItem("aiweb." + k); return v === null ? fallback : JSON.parse(v); }
      catch (e) { return fallback; }
    },
    set: function (k, v) {
      try { localStorage.setItem("aiweb." + k, JSON.stringify(v)); return true; } catch (e) { return false; }
    },
    remove: function (k) { try { localStorage.removeItem("aiweb." + k); } catch (e) { /* 무시 */ } }
  };

  /* SHA-256 지문 (수강 코드를 원문 대신 지문으로 비교) */
  function sha256(text) {
    if (!(window.crypto && crypto.subtle && window.TextEncoder)) return Promise.reject(new Error("no-crypto"));
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
    });
  }

  /* 구글 시트로 기록 보내기 (config.sheets.endpoint 에 Apps Script 웹 앱 주소가 있을 때만)
     · 브라우저 보안 규칙 때문에 응답은 읽을 수 없어서 '보냈다'까지만 확인됩니다. */
  function sheetEndpoint() { return String((C.sheets || {}).endpoint || "").trim(); }
  function sendSheet(type, data) {
    var url = sheetEndpoint();
    if (!url) return Promise.resolve(false);
    return fetch(url, {
      method: "POST", mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ type: type, course: (C.site || {}).courseName, sentAt: new Date().toISOString(), data: data })
    }).then(function () { return true; }).catch(function () { return false; });
  }

  /* 출석 코드: 비밀값 + 날짜 + 1분 단위 시각으로 4자리 숫자를 만듦 (교수자 화면과 학생 화면이 같은 계산) */
  function codeSlot() { return Math.floor(Date.now() / 60000); }
  function attendanceCode(secret, dayKey, slot) {
    return sha256(secret + "|" + dayKey + "|" + slot).then(function (h) {
      return ("000" + (parseInt(h.slice(0, 8), 16) % 10000)).slice(-4);
    });
  }

  /* 화면 아래 잠깐 뜨는 알림 */
  var toastTimer = null;
  function toast(msg) {
    var el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, 2800);
  }

  var site = C.site || {};
  var courseTitle = "「" + site.courseName + "」";

  /* ---------- 날짜 도우미 ---------- */
  var DAYS = ["일", "월", "화", "수", "목", "금", "토"];
  function parseDate(s) { // "2026-03-03" → 그 날 0시 (현지 시각)
    var p = String(s).split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function keyOf(d) {
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function fmtShort(d) { return (d.getMonth() + 1) + "." + d.getDate() + " (" + DAYS[d.getDay()] + ")"; }
  function fmtLong(d) { return (d.getMonth() + 1) + "월 " + d.getDate() + "일 (" + DAYS[d.getDay()] + ")"; }
  function fmtDue(d) {
    return d.getFullYear() + ". " + (d.getMonth() + 1) + ". " + d.getDate() + " (" + DAYS[d.getDay()] + ") " +
      ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  }

  /* ---------- 커리큘럼 일정 계산: 첫 수업일 + 7일 간격 (주차별 덮어쓰기 가능) ---------- */
  var cur = C.curriculum || {};
  var sched = cur.schedule || {};
  var firstClass = sched.firstClass ? parseDate(sched.firstClass) : null;
  var holidays = {};
  (cur.holidays || []).forEach(function (h) { holidays[h.date] = h.name; });
  // 달력 일정 (휴강·보강·특강 등) — 날짜별로 모아 둠
  var EVENT_TYPES = ["휴강", "보강", "특강", "시험", "행사", "기타"];
  var EVENT_CLASS = { "휴강": "ev-cancel", "보강": "ev-makeup", "특강": "ev-special", "시험": "ev-exam", "행사": "ev-event" };
  var calEvents = (cur.events || []).map(function (e, i) { return { src: e, idx: i, key: e.date }; });
  var eventsByDate = {};
  calEvents.forEach(function (e) { (eventsByDate[e.key] = eventsByDate[e.key] || []).push(e); });
  var weeks = (cur.weeks || []).map(function (w, i) {
    var date = w.date ? parseDate(w.date) : firstClass ? addDays(firstClass, 7 * ((Number(w.week) || i + 1) - 1)) : null;
    var due = w.assignment && w.assignment.due ? new Date(w.assignment.due) : null;
    var key = date ? keyOf(date) : "";
    var cancel = (eventsByDate[key] || []).filter(function (e) { return e.src.type === "휴강"; })[0];
    return {
      src: w, idx: i, week: w.week, date: date, key: key,
      time: w.time || sched.time || "", place: w.place || sched.place || "",
      holiday: date ? holidays[key] : "", due: due && !isNaN(due) ? due : null,
      cancel: cancel ? cancel.src : null
    };
  });
  document.title = site.courseName + " | " + (site.tagline || site.university + " " + site.department);

  /* ---------- 헤더 ---------- */
  function renderHeader() {
    var mark = site.logo
      ? '<img src="' + esc(site.logo) + '" alt="">'
      : "🧠";

    // 로고 이미지를 브라우저 탭 아이콘으로도 사용
    if (site.logo) {
      var icon = document.querySelector('link[rel="icon"]') || document.head.appendChild(document.createElement("link"));
      icon.rel = "icon";
      icon.href = site.logo;
    }
    var links = (C.nav || []).map(function (n) {
      return '<a href="#' + esc(n.id) + '" data-id="' + esc(n.id) + '">' + esc(n.label) + "</a>";
    }).join("");

    $("#site-header").innerHTML = wrap(
      '<div class="header-inner">' +
        '<a class="brand" href="#hero" aria-label="맨 위로">' +
          '<span class="brand-mark' + (site.logo ? " has-logo" : "") + '">' + mark + "</span>" +
          '<span class="brand-text"><small>' + esc(site.university + " " + site.department) + "</small>" +
          "<strong>" + esc(courseTitle) + "</strong></span>" +
        "</a>" +
        '<nav class="nav" id="nav" aria-label="주요 메뉴">' + links + "</nav>" +
        '<div class="header-actions">' +
          '<button class="lock-btn" type="button" aria-label="관리자 모드" title="관리자 모드">🔒</button>' +
          '<button class="menu-toggle" type="button" aria-label="메뉴 열기" aria-expanded="false" aria-controls="nav"><span></span></button>' +
        "</div>" +
      "</div>"
    );
  }

  /* ---------- 첫 화면 ---------- */
  function renderHero() {
    var h = C.hero || {};
    var buttons = (h.buttons || []).map(function (b) {
      return '<a class="btn ' + (b.primary ? "btn-primary" : "btn-ghost") + '" href="' + esc(b.href) + '">' + esc(b.label) + "</a>";
    }).join("");

    var dated = weeks.filter(function (w) { return w.date; });
    function autoValue(kind) {
      if (!dated.length) return "";
      var a = dated[0].date, b = dated[dated.length - 1].date;
      if (kind === "period") {
        return a.getFullYear() + ". " + (a.getMonth() + 1) + ". " + a.getDate() + " – " +
          (b.getMonth() + 1) + ". " + b.getDate() + " (" + dated.length + "주)";
      }
      if (kind === "time") return "매주 " + DAYS[a.getDay()] + "요일 " + (sched.time || "");
      return "";
    }
    var glance = (h.glance || []).map(function (g) {
      var value = g.auto ? autoValue(g.auto) : g.value;
      return (
        '<div class="glance-item">' +
          '<span class="glance-icon" aria-hidden="true">' + esc(g.icon) + "</span>" +
          '<span><small>' + esc(g.label) + "</small><strong>" + esc(value) + "</strong></span>" +
        "</div>"
      );
    }).join("");

    var toolCount = ((C.guide || {}).tools || []).length;
    var stats = (C.stats || []).map(function (s) {
      var value = s.count === "tools" ? toolCount : Number(s.value) || 0;
      return (
        '<div class="card stat">' +
          '<p class="stat-num"><b data-count="' + value + '">' + value + "</b><span>" + esc(s.unit) + "</span></p>" +
          '<p class="stat-label">' + esc(s.label) + "</p>" +
        "</div>"
      );
    }).join("");

    $("#hero").innerHTML = wrap(
      (h.badge ? '<span class="hero-badge">' + esc(h.badge) + "</span>" : "") +
      '<p class="hero-org">' + esc(site.university + " " + site.department) + "</p>" +
      '<h1 class="hero-title">' + esc(courseTitle) +
        (site.version ? '<sup class="hero-version">' + esc(site.version) + "</sup>" : "") + "</h1>" +
      '<p class="hero-subtitle">' + esc(h.subtitle || site.tagline) + "</p>" +
      '<p class="hero-desc">' + esc(h.description) + "</p>" +
      '<div class="hero-actions">' + buttons + "</div>" +
      (glance ? '<div class="card glance">' + glance + "</div>" : "") +
      (stats ? '<div class="stats">' + stats + "</div>" : "")
    );
  }

  /* ---------- 공지사항 (관리자 화면의 '공지' 탭에서 올림) ---------- */
  function renderNotices() {
    var box = $("#notices");
    var list = (C.notices || []).slice().sort(function (a, b) {
      if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
      return String(b.date).localeCompare(String(a.date));
    });
    if (!list.length) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = wrap(
      '<div class="card notices-card">' +
        '<h2 class="notices-title">📢 공지사항</h2>' +
        '<div class="notice-list">' +
        list.map(function (n) {
          return (
            '<details class="notice-item">' +
              "<summary>" + (n.pinned ? '<span class="tag tag-exam">중요</span>' : "") +
                '<span class="notice-t">' + esc(n.title) + "</span>" +
                '<span class="notice-d">' + esc(n.date) + "</span></summary>" +
              '<div class="notice-body">' + esc(n.text) + "</div>" +
            "</details>"
          );
        }).join("") +
        "</div>" +
      "</div>"
    );
  }

  /* ---------- 프로그램 소개 ---------- */
  function renderAbout() {
    var a = C.about || {};
    var paras = (a.paragraphs || []).map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
    var feats = (a.features || []).map(function (f, i) {
      var num = i + 1 < 10 ? "0" + (i + 1) : String(i + 1);
      return (
        '<div class="slide" role="group" aria-roledescription="slide" aria-label="' + (i + 1) + " / " + a.features.length + '">' +
          '<article class="card feature">' +
            '<span class="feature-num" aria-hidden="true">' + num + "</span>" +
            '<div class="icon-bubble" aria-hidden="true">' + esc(f.icon) + "</div>" +
            "<h3>" + esc(f.title) + "</h3><p>" + esc(f.text) + "</p>" +
          "</article>" +
        "</div>"
      );
    }).join("");

    $("#about").innerHTML = wrap(
      sectionHead(a) +
      '<div class="card about-body">' + paras + "</div>" +
      (feats
        ? '<h3 class="sub-title">' + esc(a.featuresTitle || "이 강의의 특징") + "</h3>" +
          '<div class="slider" tabindex="0" aria-roledescription="carousel" aria-label="' + esc(a.featuresTitle || "이 강의의 특징") + ' (← → 키로 넘기기)">' +
            '<div class="slider-viewport"><div class="slider-track">' + feats + "</div></div>" +
            '<div class="slider-controls">' +
              '<button class="slider-btn prev" type="button" aria-label="이전">‹</button>' +
              '<div class="slider-dots"></div>' +
              '<button class="slider-btn next" type="button" aria-label="다음">›</button>' +
            "</div>" +
          "</div>"
        : "") +
      renderInfographic(a.infographic)
    );
  }

  /* ---------- 프로그램 소개 인포그래픽 ---------- */
  function renderInfographic(ig) {
    if (!ig) return "";
    function pill(t) { return '<span class="ig-pill">' + esc(t) + "</span>"; }

    // ① 활용하는 것 → 만드는 것
    var inputs = (ig.inputs || []).map(function (x) {
      return '<div class="ig-input"><span class="ig-ico" aria-hidden="true">' + esc(x.icon) + "</span>" +
        "<div><strong>" + esc(x.title) + "</strong><small>" + esc(x.text) + "</small></div></div>";
    }).join("");
    var outputs = (ig.outputs || []).map(function (x) {
      return '<div class="ig-output"><span class="ig-ico" aria-hidden="true">' + esc(x.icon) + "</span>" + esc(x.title) + "</div>";
    }).join("");

    // ② 학습 과정
    var steps = (ig.steps || []).map(function (s, i) {
      return '<li class="ig-step"><span class="ig-step-n">' + (i + 1) + "</span>" +
        '<span class="ig-step-ico" aria-hidden="true">' + esc(s.icon) + "</span>" +
        "<strong>" + esc(s.title) + "</strong><small>" + esc(s.text) + "</small></li>";
    }).join("");

    // ③ 15주 학습 흐름 — 막대 폭은 주 수에 비례
    var phases = ig.phases || [];
    function range(p) { return p.from === p.to ? p.from + "주" : p.from + "–" + p.to + "주"; }
    var bar = phases.map(function (p, i) {
      var n = Math.max(1, (p.to - p.from + 1) || 1);
      return '<span class="ig-seg ig-c' + (i % 6) + '" style="flex:' + n + '" title="' + esc(range(p) + " · " + p.title) + '">' + esc(range(p)) + "</span>";
    }).join("");
    var phaseCards = phases.map(function (p, i) {
      return '<div class="ig-phase"><span class="ig-badge ig-c' + (i % 6) + '">' + esc(range(p)) + "</span>" +
        "<strong>" + esc(p.title) + "</strong><small>" + esc(p.text) + "</small></div>";
    }).join("");

    // ④ 평가 구성 — '수강 안내'의 평가 방법에서 자동으로
    var ev = ((C.guide || {}).evaluation || []).filter(function (e) { return Number(e.percent) > 0; });
    var evBar = ev.map(function (e, i) {
      return '<span class="ig-seg ig-e' + (i % 6) + '" style="flex:' + Number(e.percent) + '" title="' + esc(e.label + " " + e.percent + "%") + '">' + esc(e.percent) + "%</span>";
    }).join("");
    var evLegend = ev.map(function (e, i) {
      return '<span><i class="ig-e' + (i % 6) + '"></i>' + esc(e.label) + " " + esc(e.percent) + "%</span>";
    }).join("");

    return (
      '<div class="card infographic" role="region" aria-label="' + esc(ig.title) + '">' +
        '<h3 class="ig-title">' + esc(ig.title) + "</h3>" +
        '<div class="ig-io">' +
          '<div class="ig-col">' + pill(ig.inputsTitle || "활용하는 것") + inputs + "</div>" +
          '<div class="ig-arrow" aria-hidden="true">➜</div>' +
          '<div class="ig-col">' + pill(ig.outputsTitle || "만드는 것") + '<div class="ig-outputs">' + outputs + "</div></div>" +
        "</div>" +
        (steps ? '<div class="ig-block">' + pill(ig.stepsTitle || "학습 과정") + '<ol class="ig-steps">' + steps + "</ol></div>" : "") +
        (bar
          ? '<div class="ig-block">' + pill(ig.flowTitle || "학습 흐름") +
              '<div class="ig-bar" aria-hidden="true">' + bar + "</div>" +
              '<div class="ig-phases">' + phaseCards + "</div></div>"
          : "") +
        (evBar
          ? '<div class="ig-block">' + pill(ig.evalTitle || "평가 구성") +
              '<div class="ig-bar ig-evbar" aria-hidden="true">' + evBar + "</div>" +
              '<div class="ig-legend">' + evLegend + "</div></div>"
          : "") +
      "</div>"
    );
  }

  /* ---------- 커리큘럼 ---------- */
  function renderCurriculum() {
    var list = weeks.map(function (w) {
      var s = w.src, a = s.assignment;
      var badges =
        (s.exam ? '<span class="tag tag-exam">시험</span>' : "") +
        (a ? '<span class="tag tag-hw">과제</span>' : "") +
        ((cur.journalClub || []).some(function (j) { return Number(j.week) === Number(w.week); }) ? '<span class="tag tag-jc">논문 발표</span>' : "") +
        (w.cancel ? '<span class="tag tag-cancel">휴강</span>' : "") +
        (w.holiday ? '<span class="tag tag-holiday" title="수업일이 공휴일과 겹칩니다">⚠ ' + esc(w.holiday) + "</span>" : "");

      var topics = (s.topics || []).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
      var videos = (s.videos || []).map(function (v) {
        return '<li><a href="' + esc(v.url) + '" target="_blank" rel="noopener noreferrer">▶ ' + esc(v.title) + "</a></li>";
      }).join("");
      // 주차별 자료실 (주소가 비어 있으면 '준비 중'으로 표시)
      var resources = (s.resources || []).map(function (r) {
        return r.url
          ? '<li><a href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer">📎 ' + esc(r.title) + "</a></li>"
          : '<li class="muted">📎 ' + esc(r.title) + " <small>(준비 중)</small></li>";
      }).join("");
      // 이 주차의 논문 발표
      var jcs = (cur.journalClub || []).filter(function (j) { return Number(j.week) === Number(w.week); }).map(function (j) {
        return "<li><strong>" + esc(j.presenter) + "</strong> · " +
          (j.link ? '<a href="' + esc(j.link) + '" target="_blank" rel="noopener noreferrer">' + esc(j.paper) + " ↗</a>" : esc(j.paper)) + "</li>";
      }).join("");

      var hw = "";
      if (a) {
        // submitUrl 이 있으면 그 주소(LMS·구글 폼 등)로, 없으면 '내 강의실'의 과제 제출로 이동
        var submit = a.submitUrl
          ? '<a class="btn btn-primary btn-sm" href="' + esc(a.submitUrl) + '" target="_blank" rel="noopener noreferrer">과제 제출</a>'
          : '<a class="btn btn-primary btn-sm" href="#classroom" data-submit-week="' + esc(w.week) + '">내 강의실에서 제출</a>';
        hw =
          '<div class="hw">' +
            '<div class="hw-head"><strong>📝 ' + esc(a.title) + "</strong>" +
              (w.due ? '<span class="countdown" data-due="' + w.due.getTime() + '"></span>' : "") +
            "</div>" +
            "<p>" + esc(a.text) + "</p>" +
            '<div class="hw-foot">' +
              (w.due ? '<span class="hw-due">마감 ' + esc(fmtDue(w.due)) + "</span>" : "<span></span>") +
              submit +
            "</div>" +
          "</div>";
      }

      return (
        '<details class="card week' + (s.exam ? " exam" : "") + '" id="week-' + esc(w.week) + '">' +
          "<summary>" +
            '<span class="week-num"><b>' + esc(w.week) + "</b>주차</span>" +
            '<span class="week-main">' +
              '<span class="week-date">' + (w.date ? esc(fmtShort(w.date)) : "") + "</span>" +
              '<span class="week-title">' + esc(s.title) + "</span>" +
              '<span class="week-text">' + esc(s.text) + "</span>" +
            "</span>" +
            '<span class="week-tags">' + badges + "</span>" +
          "</summary>" +
          '<div class="week-body">' +
            adminCtrl("week", w.idx, weeks.length) +
            '<dl class="week-meta">' +
              (w.date ? "<div><dt>날짜</dt><dd>" + esc(fmtLong(w.date)) + "</dd></div>" : "") +
              (w.time ? "<div><dt>시간</dt><dd>" + esc(w.time) + "</dd></div>" : "") +
              (w.place ? "<div><dt>장소</dt><dd>" + esc(w.place) + "</dd></div>" : "") +
            "</dl>" +
            (w.cancel ? '<p class="warn">🚫 휴강 · ' + esc(w.cancel.title) + (w.cancel.text ? " — " + esc(w.cancel.text) : "") + "</p>" : "") +
            (w.holiday && !w.cancel ? '<p class="warn">⚠ 이 날은 ' + esc(w.holiday) + "입니다. 휴강·보강 여부를 확인해 주세요.</p>" : "") +
            (topics ? '<h4>학습 내용</h4><ul class="topics">' + topics + "</ul>" : "") +
            (videos ? '<h4>참고 영상</h4><ul class="videos">' + videos + "</ul>" : "") +
            (resources ? '<h4>강의 자료</h4><ul class="videos resources">' + resources + "</ul>" : "") +
            (jcs ? '<h4>논문 발표</h4><ul class="topics">' + jcs + "</ul>" : "") +
            hw +
          "</div>" +
        "</details>"
      );
    }).join("");

    $("#curriculum").innerHTML = wrap(
      sectionHead(cur, "curriculum") +
      '<h3 class="sub-title">주차별 학습</h3>' +
      '<div class="week-list">' + list + adminAdd("week", "주차 추가") + "</div>" +
      '<div class="cal-headrow"><h3 class="sub-title cal-title" id="calendar">월간 수업 달력</h3>' +
        '<button type="button" class="btn btn-ghost btn-sm ics-btn" title="수업·과제 마감·일정을 구글·아웃룩·애플 캘린더로 가져가기">📅 내 캘린더에 추가 (.ics)</button></div>' +
      (ADMIN
        ? '<div class="admin-ctrl cal-admin">' +
            '<button type="button" data-edit="edit" data-kind="schedule">⚙ 수업 일정 기본값 (첫 수업일·시간·장소)</button>' +
            '<button type="button" data-edit="add" data-kind="event">+ 일정 추가</button>' +
          "</div>"
        : "") +
      '<div class="calendar-wrap">' +
        '<div class="card calendar">' +
          '<div class="cal-head">' +
            '<button class="cal-nav" type="button" data-step="-1" aria-label="이전 달">‹</button>' +
            '<strong class="cal-month" aria-live="polite"></strong>' +
            '<button class="cal-nav" type="button" data-step="1" aria-label="다음 달">›</button>' +
          "</div>" +
          '<div class="cal-grid cal-dow">' + DAYS.map(function (d) { return "<span>" + d + "</span>"; }).join("") + "</div>" +
          '<div class="cal-grid cal-days"></div>' +
          '<div class="cal-legend"><span><i class="lg-class"></i>수업</span><span><i class="lg-due"></i>과제 마감</span><span><i class="lg-event"></i>일정</span><span><i class="lg-holiday"></i>공휴일</span></div>' +
        "</div>" +
        '<div class="card cal-detail" aria-live="polite"></div>' +
      "</div>" +
      renderJournalClub()
    );
  }

  /* ---------- 논문 발표 배정표 (저널클럽) ---------- */
  function renderJournalClub() {
    var list = cur.journalClub || [];
    if (!list.length && !ADMIN) return "";
    var rows = list.map(function (j, i) {
      var w = weeks.filter(function (x) { return Number(x.week) === Number(j.week); })[0];
      return "<tr>" +
        "<td>" + esc(j.week) + "주차</td>" +
        "<td>" + (w && w.date ? esc(fmtShort(w.date)) : "-") + "</td>" +
        "<td><strong>" + esc(j.presenter) + "</strong></td>" +
        '<td class="q">' + esc(j.paper) + "</td>" +
        "<td>" + (j.link ? '<a class="tbl-btn" href="' + esc(j.link) + '" target="_blank" rel="noopener noreferrer">논문 열기 ↗</a>' : '<span class="muted">-</span>') + "</td>" +
        (ADMIN ? '<td class="ctrl-cell">' + adminCtrl("jc", i, list.length) + "</td>" : "") +
      "</tr>";
    }).join("");
    return (
      '<h3 class="sub-title jc-title" id="journal-club">논문 발표 배정표</h3>' +
      '<div class="card jc-card">' +
        (list.length
          ? '<div class="table-wrap"><table class="history-table jc-table"><thead><tr>' +
              "<th>주차</th><th>날짜</th><th>발표자</th><th>논문</th><th>링크</th>" + (ADMIN ? "<th>관리</th>" : "") +
            "</tr></thead><tbody>" + rows + "</tbody></table></div>"
          : '<p class="muted">아직 배정된 발표가 없습니다.</p>') +
        adminAdd("jc", "발표 배정 추가") +
      "</div>"
    );
  }

  /* ---------- 내 캘린더에 추가 (.ics 파일 내려받기) ---------- */
  function icsDate(d) { // 20260303T130000
    function p(n) { return ("0" + n).slice(-2); }
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "T" + p(d.getHours()) + p(d.getMinutes()) + "00";
  }
  function icsText(s) { return String(s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1"); }
  function parseTimes(t) { // "13:00 – 15:00" → [[13,0],[15,0]]
    var m = String(t || "").match(/(\d{1,2}):(\d{2})\D+(\d{1,2}):(\d{2})/);
    return m ? [[+m[1], +m[2]], [+m[3], +m[4]]] : null;
  }
  function buildIcs() {
    var name = courseTitle + " " + (site.university || "") + " " + (site.department || "");
    var stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); // UTC (표준 규칙)
    var ev = [];
    function add(uid, start, end, title, place, desc, allDay) {
      ev.push("BEGIN:VEVENT", "UID:" + uid + "@aiweb", "DTSTAMP:" + stamp,
        allDay ? "DTSTART;VALUE=DATE:" + icsDate(start).slice(0, 8) : "DTSTART;TZID=Asia/Seoul:" + icsDate(start),
        allDay ? "DTEND;VALUE=DATE:" + icsDate(addDays(start, 1)).slice(0, 8) : "DTEND;TZID=Asia/Seoul:" + icsDate(end),
        "SUMMARY:" + icsText(title), place ? "LOCATION:" + icsText(place) : "", desc ? "DESCRIPTION:" + icsText(desc) : "",
        "END:VEVENT");
    }
    weeks.forEach(function (w) {
      if (!w.date) return;
      var t = parseTimes(w.time);
      var st = new Date(w.date), en = new Date(w.date);
      if (t) { st.setHours(t[0][0], t[0][1]); en.setHours(t[1][0], t[1][1]); }
      add("week-" + w.week + "-" + w.key, st, en,
        (w.cancel ? "[휴강] " : "") + courseTitle + " " + w.week + "주차 · " + w.src.title,
        w.place, (w.src.topics || []).join(" / "), !t);
      if (w.due) {
        var dEnd = new Date(w.due.getTime() + 30 * 60000);
        add("due-" + w.week, w.due, dEnd, "[과제 마감] " + w.src.assignment.title, "", w.src.assignment.text, false);
      }
    });
    calEvents.forEach(function (e) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(e.key)) return;
      add("event-" + e.idx + "-" + e.key, parseDate(e.key), null, "[" + (e.src.type || "일정") + "] " + e.src.title, "", e.src.text, true);
    });
    return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AIWEB//Course Calendar//KO", "CALSCALE:GREGORIAN",
      "X-WR-CALNAME:" + icsText(name), "X-WR-TIMEZONE:Asia/Seoul",
      "BEGIN:VTIMEZONE", "TZID:Asia/Seoul", "BEGIN:STANDARD", "DTSTART:19700101T000000",
      "TZOFFSETFROM:+0900", "TZOFFSETTO:+0900", "TZNAME:KST", "END:STANDARD", "END:VTIMEZONE"]
      .concat(ev).concat(["END:VCALENDAR"]).filter(Boolean).join("\r\n");
  }
  function setupIcs() {
    var b = document.querySelector(".ics-btn");
    if (!b) return;
    b.addEventListener("click", function () {
      var blob = new Blob([buildIcs()], { type: "text/calendar;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = (site.courseName || "강의") + "_일정.ics";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      toast("캘린더 파일을 내려받았습니다. 구글 캘린더 → 설정 → 가져오기, 또는 파일을 열어 추가하세요.");
    });
  }

  /* 주차를 펼치고 그 위치로 이동 */
  function openWeek(n) {
    var el = document.getElementById("week-" + n);
    if (!el) return;
    el.open = true;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- 우수 과제 포트폴리오 (구글 드라이브 주소로 등록) ---------- */
  // 드라이브 주소에서 파일 ID와 종류를 알아냄
  function driveInfo(url) {
    var s = String(url || ""), m;
    if ((m = s.match(/\/file\/d\/([\w-]+)/))) return { id: m[1], kind: "file" };
    if ((m = s.match(/\/document\/d\/([\w-]+)/))) return { id: m[1], kind: "doc" };
    if ((m = s.match(/\/presentation\/d\/([\w-]+)/))) return { id: m[1], kind: "slide" };
    if ((m = s.match(/\/spreadsheets\/d\/([\w-]+)/))) return { id: m[1], kind: "sheet" };
    if ((m = s.match(/\/folders\/([\w-]+)/))) return { id: m[1], kind: "folder" };
    if ((m = s.match(/[?&]id=([\w-]+)/))) return { id: m[1], kind: "file" };
    return null;
  }
  var DRIVE_ICON = { file: "📄", doc: "📝", slide: "📽️", sheet: "📊", folder: "📁" };
  var DRIVE_KIND = { file: "파일", doc: "문서", slide: "슬라이드", sheet: "스프레드시트", folder: "폴더" };

  function renderPortfolio() {
    var p = C.portfolio;
    var box = $("#portfolio");
    if (!p) { box.hidden = true; return; }
    var items = p.items || [];
    var cats = p.categories || [];
    var cards = items.map(function (it, i) {
      var info = driveInfo(it.driveUrl) || { kind: "file" };
      // 실제 파일이면 드라이브 미리 보기 그림을 표지로, 샘플·폴더는 아이콘
      var thumb = !it.sample && info.id && info.kind !== "folder"
        ? '<img src="https://drive.google.com/thumbnail?id=' + encodeURIComponent(info.id) + '&sz=w640" alt="" loading="lazy" ' +
          "onerror=\"this.parentNode.classList.add('noimg');this.remove()\">"
        : "";
      return (
        '<article class="card pf-card" data-cat="' + esc(it.category) + '">' +
          '<div class="pf-thumb' + (thumb ? "" : " noimg") + '"><span class="pf-icon" aria-hidden="true">' + (DRIVE_ICON[info.kind] || "📄") + "</span>" + thumb +
            (it.sample ? '<span class="pf-sample">샘플</span>' : "") + "</div>" +
          '<div class="pf-body">' +
            '<span class="tag tag-hw">' + esc(it.category) + "</span>" +
            "<h3>" + esc(it.title) + "</h3>" +
            '<p class="pf-meta">' + esc(it.student) + (it.term ? " · " + esc(it.term) : "") + "</p>" +
            (it.description ? '<p class="pf-desc">' + esc(it.description) + "</p>" : "") +
            (it.sample
              ? '<button class="btn btn-ghost btn-sm" type="button" disabled title="샘플이라 열 수 없습니다">샘플 (열기 불가)</button>'
              : '<a class="btn btn-primary btn-sm" href="' + esc(it.driveUrl) + '" target="_blank" rel="noopener noreferrer">' + (DRIVE_KIND[info.kind] || "파일") + " 열기 ↗</a>") +
            adminCtrl("pf", i, items.length) +
          "</div>" +
        "</article>"
      );
    }).join("");

    box.hidden = false;
    box.innerHTML = wrap(
      sectionHead(p, "portfolio") +
      noticeBox(p.notice) +
      adminAdd("pf", "과제물 등록 (구글 드라이브 주소)") +
      (cats.length && items.length
        ? '<div class="pf-filter" role="group" aria-label="분류">' +
            '<button type="button" class="on" data-cat="">전체</button>' +
            cats.map(function (c) { return '<button type="button" data-cat="' + esc(c) + '">' + esc(c) + "</button>"; }).join("") +
          "</div>"
        : "") +
      (items.length ? '<div class="pf-grid">' + cards + "</div>" : '<p class="muted pf-empty">아직 등록된 과제물이 없습니다.</p>')
    );
  }

  function setupPortfolio() {
    var filter = document.querySelector(".pf-filter");
    if (!filter) return;
    filter.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cat]");
      if (!b) return;
      Array.prototype.forEach.call(filter.children, function (x) { x.classList.toggle("on", x === b); });
      Array.prototype.forEach.call(document.querySelectorAll(".pf-card"), function (card) {
        card.hidden = !!b.dataset.cat && card.dataset.cat !== b.dataset.cat;
      });
    });
  }

  /* ---------- 수강 안내 ---------- */
  function renderGuide() {
    var g = C.guide || {};
    var items = (g.items || []).map(function (i) {
      return (
        '<article class="card guide-item">' +
          '<div class="icon-bubble" aria-hidden="true">' + esc(i.icon) + "</div>" +
          "<div><h3>" + esc(i.title) + "</h3><p>" + esc(i.text) + "</p></div>" +
        "</article>"
      );
    }).join("");
    var evalRows = (g.evaluation || []).map(function (e) {
      var pct = Math.max(0, Math.min(100, Number(e.percent) || 0));
      return (
        '<div class="eval-row"><span>' + esc(e.label) + "</span>" +
        '<div class="eval-bar"><span style="width:' + pct + '%"></span></div>' +
        "<strong>" + pct + "%</strong></div>"
      );
    }).join("");

    var tools = (g.tools || []).map(function (t) {
      return (
        '<div class="card tool">' +
          '<span class="tool-mark" aria-hidden="true">' + esc(String(t.name).charAt(0)) + "</span>" +
          "<div><h4>" + esc(t.name) + "</h4><p>" + esc(t.use) + "</p></div>" +
        "</div>"
      );
    }).join("");
    var materials = (g.materials || []).map(function (m) { return "<li>" + esc(m) + "</li>"; }).join("");

    $("#guide").innerHTML = wrap(
      sectionHead(g) +
      '<div class="guide-grid">' + items + "</div>" +
      (tools ? '<h3 class="sub-title">' + esc(g.toolsTitle || "실습 도구") + "</h3>" + '<div class="tools">' + tools + "</div>" : "") +
      '<div class="guide-bottom">' +
        (evalRows ? '<div class="card eval"><h3>' + esc(g.evaluationTitle || "평가 방법") + "</h3>" + evalRows + "</div>" : "") +
        (materials ? '<div class="card materials"><h3>' + esc(g.materialsTitle || "수강 준비물") + "</h3><ul>" + materials + "</ul></div>" : "") +
      "</div>"
    );
  }

  /* ---------- FAQ ---------- */
  function renderFaq() {
    var f = C.faq || {};
    var list = f.items || [];
    var items = list.map(function (i, n) {
      return (
        '<details class="card faq-item" id="faq-' + n + '"><summary>' + esc(i.q) + "</summary>" +
        '<div class="answer">' + esc(i.a) + adminCtrl("faq", n, list.length) + "</div></details>"
      );
    }).join("");

    $("#faq").innerHTML = wrap(sectionHead(f, "faq") + '<div class="faq-list">' + items + adminAdd("faq", "질문 추가") + "</div>");
  }

  /* ---------- 교수자 ---------- */
  function renderInstructor() {
    var p = C.instructor || {};
    var photo = p.photo
      ? '<img src="' + esc(p.photo) + '" alt="' + esc(p.name) + ' 사진">'
      : '<span aria-hidden="true">👩‍🏫</span>';
    var chips = (p.contacts || []).map(function (c) {
      return '<span class="chip"><b>' + esc(c.label) + "</b>" + esc(c.value) + "</span>";
    }).join("");

    // 교수자 소개 · 연락처 · 저작권 문구를 페이지 맨 끝 푸터에 함께 표시
    $("#instructor").innerHTML = wrap(
      sectionHead(p) +
      '<div class="card instructor-card">' +
        '<div class="instructor-photo">' + photo + "</div>" +
        '<div class="instructor-info">' +
          "<h3>" + esc(p.name) + "</h3>" +
          '<p class="instructor-aff">' + esc(p.affiliation) + "</p>" +
          '<p class="instructor-bio">' + esc(p.bio) + "</p>" +
          '<div class="chips">' + chips + "</div>" +
        "</div>" +
      "</div>" +
      '<p class="copyright">' + esc((C.footer || {}).copyright) + "</p>"
    );
  }

  /* ---------- 동작: 특징 슬라이드 (버튼 · 점 · 손가락 넘기기 · 키보드 ← →) ---------- */
  function setupSlider() {
    var slider = document.querySelector(".slider");
    if (!slider) return;
    var track = slider.querySelector(".slider-track");
    var slides = slider.querySelectorAll(".slide");
    var dotsBox = slider.querySelector(".slider-dots");
    var prev = slider.querySelector(".prev");
    var next = slider.querySelector(".next");
    var index = 0;

    function perView() { return window.innerWidth >= 960 ? 3 : window.innerWidth >= 640 ? 2 : 1; }
    function maxIndex() { return Math.max(0, slides.length - perView()); }

    function buildDots() {
      var html = "";
      for (var i = 0; i <= maxIndex(); i++) {
        html += '<button type="button" aria-label="' + (i + 1) + '번째로 이동" data-i="' + i + '"></button>';
      }
      dotsBox.innerHTML = html;
    }
    function go(i) {
      index = Math.max(0, Math.min(maxIndex(), i));
      track.style.transform = "translateX(" + (-index * (100 / perView())) + "%)";
      prev.disabled = index === 0;
      next.disabled = index === maxIndex();
      Array.prototype.forEach.call(dotsBox.children, function (d, k) {
        d.classList.toggle("on", k === index);
        d.setAttribute("aria-current", k === index ? "true" : "false");
      });
    }

    prev.addEventListener("click", function () { go(index - 1); });
    next.addEventListener("click", function () { go(index + 1); });
    dotsBox.addEventListener("click", function (e) {
      var d = e.target.closest("button");
      if (d) go(Number(d.dataset.i));
    });
    slider.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1); }
    });

    // 손가락(터치) 넘기기
    var startX = null, startY = null;
    track.addEventListener("touchstart", function (e) {
      startX = e.touches[0].clientX; startY = e.touches[0].clientY;
    }, { passive: true });
    track.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      var dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(index + (dx < 0 ? 1 : -1));
      startX = null;
    });

    var lastPer = perView();
    window.addEventListener("resize", function () {
      if (perView() !== lastPer) { lastPer = perView(); buildDots(); }
      go(index);
    });

    buildDots();
    go(0);
  }

  /* ---------- 동작: 과제 마감 카운트다운 (30초마다 갱신) ---------- */
  function updateCountdowns() {
    var now = Date.now();
    Array.prototype.forEach.call(document.querySelectorAll("[data-due]"), function (el) {
      var left = Number(el.dataset.due) - now;
      el.classList.toggle("closed", left <= 0);
      el.classList.toggle("urgent", left > 0 && left < 864e5);
      if (left <= 0) { el.textContent = "마감되었습니다"; return; }
      var m = Math.floor(left / 6e4), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
      el.textContent = "마감까지 " + (d ? d + "일 " : "") + (d || h ? h + "시간 " : "") + mm + "분 남음";
    });
  }
  function setupCountdown() {
    updateCountdowns();
    setInterval(updateCountdowns, 30000);
  }

  /* ---------- 동작: 월간 수업 달력 ---------- */
  function setupCalendar() {
    var daysBox = document.querySelector(".cal-days");
    if (!daysBox) return;
    var monthLabel = document.querySelector(".cal-month");
    var detail = document.querySelector(".cal-detail");
    var navBtns = document.querySelectorAll(".cal-nav");

    // 날짜별 일정 모으기: 수업 · 과제 마감 · 달력 일정 · 공휴일
    var events = {};
    function at(key) { return events[key] || (events[key] = { classes: [], dues: [], items: [] }); }
    weeks.forEach(function (w) {
      if (w.date) at(w.key).classes.push(w);
      if (w.due) at(keyOf(w.due)).dues.push(w);
    });
    calEvents.forEach(function (e) { if (/^\d{4}-\d{2}-\d{2}$/.test(e.key)) at(e.key).items.push(e); });
    Object.keys(holidays).forEach(function (k) { at(k).holiday = holidays[k]; });

    var marks = weeks.filter(function (w) { return w.date; }).map(function (w) { return w.date; })
      .concat(weeks.filter(function (w) { return w.due; }).map(function (w) { return w.due; }))
      .concat(calEvents.filter(function (e) { return /^\d{4}-\d{2}-\d{2}$/.test(e.key); }).map(function (e) { return parseDate(e.key); }));
    if (!marks.length) { daysBox.closest(".calendar-wrap").style.display = "none"; return; }
    marks.sort(function (a, b) { return a - b; });
    var minM = new Date(marks[0].getFullYear(), marks[0].getMonth(), 1);
    var maxM = new Date(marks[marks.length - 1].getFullYear(), marks[marks.length - 1].getMonth(), 1);

    var today = new Date();
    var todayKey = keyOf(today);
    var inRange = today >= minM && today < new Date(maxM.getFullYear(), maxM.getMonth() + 1, 1);
    var view = inRange ? new Date(today.getFullYear(), today.getMonth(), 1) : new Date(minM);
    var selected = inRange ? todayKey : keyOf(marks[0]);

    function render() {
      monthLabel.textContent = view.getFullYear() + "년 " + (view.getMonth() + 1) + "월";
      navBtns[0].disabled = view <= minM;
      navBtns[1].disabled = view >= maxM;

      var html = "";
      for (var b = 0; b < view.getDay(); b++) html += '<span class="cal-cell empty"></span>';
      var last = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      for (var d = 1; d <= last; d++) {
        var date = new Date(view.getFullYear(), view.getMonth(), d);
        var key = keyOf(date), ev = events[key];
        var cls = "cal-cell";
        var marksHtml = "", label = fmtLong(date);
        if (date.getDay() === 0) cls += " sun";
        if (date.getDay() === 6) cls += " sat";
        if (key === todayKey) cls += " today";
        if (key === selected) cls += " selected";
        if (ev) {
          if (ev.holiday) { cls += " holiday"; marksHtml += '<em class="m-holiday">' + esc(ev.holiday) + "</em>"; label += ", " + ev.holiday; }
          ev.classes.forEach(function (w) {
            cls += " has-class";
            marksHtml += '<em class="m-class">' + esc(w.week) + "주차</em>";
            label += ", " + w.week + "주차 " + w.src.title;
          });
          if (ev.dues.length) { cls += " has-due"; marksHtml += '<em class="m-due">마감</em>'; label += ", 과제 마감"; }
          ev.items.forEach(function (e) {
            marksHtml += '<em class="m-event ' + (EVENT_CLASS[e.src.type] || "ev-etc") + '">' + esc(e.src.type || "일정") + "</em>";
            label += ", " + (e.src.type || "일정") + " " + e.src.title;
          });
        }
        html +=
          '<button type="button" class="' + cls + '" data-key="' + key + '" aria-label="' + esc(label) + '"' +
          (key === selected ? ' aria-pressed="true"' : "") + ">" +
          '<span class="d">' + d + "</span>" + marksHtml + "</button>";
      }
      daysBox.innerHTML = html;
    }

    function showDetail(key) {
      var date = parseDate(key), ev = events[key];
      var html = '<p class="cd-date">' + esc(fmtLong(date)) + (key === todayKey ? ' <span class="tag tag-today">오늘</span>' : "") + "</p>";
      if (!ev) {
        var next = weeks.filter(function (w) { return w.date && w.date > date; })[0];
        html += '<p class="cd-empty">수업이 없는 날입니다.</p>' +
          (next ? '<button class="link-btn" type="button" data-goto="' + next.key + '">다음 수업: ' + esc(fmtShort(next.date)) + " · " + esc(next.week) + "주차 →</button>" : "");
      } else {
        if (ev.holiday) html += '<p class="cd-holiday">🎌 공휴일 · ' + esc(ev.holiday) + "</p>";
        ev.items.forEach(function (e) {
          html +=
            '<div class="cd-block cd-event">' +
              '<span class="tag ' + (EVENT_CLASS[e.src.type] || "ev-etc") + '">' + esc(e.src.type || "일정") + "</span>" +
              "<h4>" + esc(e.src.title) + "</h4>" +
              (e.src.text ? '<p class="cd-meta">' + esc(e.src.text) + "</p>" : "") +
              adminCtrl("event", e.idx, 1, true) +
            "</div>";
        });
        ev.classes.forEach(function (w) {
          var topics = (w.src.topics || []).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
          html +=
            '<div class="cd-block">' +
              '<p class="cd-week">' + esc(w.week) + "주차" + (w.src.exam ? " · 시험" : "") + "</p>" +
              "<h4>" + esc(w.src.title) + "</h4>" +
              '<p class="cd-meta">⏰ ' + esc(w.time) + (w.place ? "<br>📍 " + esc(w.place) : "") + "</p>" +
              (ev.holiday ? '<p class="warn">⚠ 공휴일과 겹칩니다. 휴강·보강 여부를 확인해 주세요.</p>' : "") +
              (topics ? '<ul class="topics">' + topics + "</ul>" : "") +
              '<button class="btn btn-ghost btn-sm" type="button" data-week="' + esc(w.week) + '">커리큘럼에서 자세히 보기</button>' +
            "</div>";
        });
        ev.dues.forEach(function (w) {
          html +=
            '<div class="cd-block cd-due">' +
              '<p class="cd-week">' + esc(w.week) + "주차 과제 마감</p>" +
              "<h4>📝 " + esc(w.src.assignment.title) + "</h4>" +
              '<p class="cd-meta">마감 ' + esc(fmtDue(w.due)) + "</p>" +
              '<span class="countdown" data-due="' + w.due.getTime() + '"></span>' +
              '<button class="btn btn-ghost btn-sm" type="button" data-week="' + esc(w.week) + '">과제 자세히 보기</button>' +
            "</div>";
        });
      }
      html += adminAdd("event", "이 날짜에 일정 추가", ' data-date="' + key + '"');
      detail.innerHTML = html;
      updateCountdowns();
    }

    function select(key) {
      selected = key;
      var d = parseDate(key);
      view = new Date(d.getFullYear(), d.getMonth(), 1);
      render();
      showDetail(key);
    }

    Array.prototype.forEach.call(navBtns, function (btn) {
      btn.addEventListener("click", function () {
        view = new Date(view.getFullYear(), view.getMonth() + Number(btn.dataset.step), 1);
        render();
      });
    });
    daysBox.addEventListener("click", function (e) {
      var cell = e.target.closest("[data-key]");
      if (!cell) return;
      selected = cell.dataset.key;
      render();
      showDetail(selected);
    });
    detail.addEventListener("click", function (e) {
      var wb = e.target.closest("[data-week]");
      if (wb) { openWeek(wb.dataset.week); return; }
      var gb = e.target.closest("[data-goto]");
      if (gb) select(gb.dataset.goto);
    });

    calendarSelect = select; // 저장 후 새로고침했을 때 보던 날짜로 돌아가기용
    render();
    showDetail(selected);
  }
  var calendarSelect = null;

  /* ---------- 동작: 통계 숫자가 화면에 들어오면 0부터 올라가기 ---------- */
  function setupCountUp() {
    var nums = document.querySelectorAll("[data-count]");
    if (!nums.length) return;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) return; // 숫자를 그대로 보여 줌

    function run(el) {
      var target = Number(el.dataset.count) || 0;
      var start = null;
      function step(t) {
        if (start === null) start = t;
        var p = Math.min(1, (t - start) / 1200);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { run(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    Array.prototype.forEach.call(nums, function (el) { el.textContent = "0"; io.observe(el); });
  }

  /* ---------- 동작: 헤더 그림자 · 맨 위로 버튼 ---------- */
  function setupScroll() {
    var header = $("#site-header");
    var toTop = $("#to-top");
    function onScroll() {
      var y = window.scrollY;
      header.classList.toggle("scrolled", y > 8);
      toTop.classList.toggle("show", y > 480);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
  }

  /* ---------- 동작: 휴대폰 메뉴 ---------- */
  function setupMenu() {
    var nav = $("#nav");
    var btn = document.querySelector(".menu-toggle");
    function setOpen(open) {
      nav.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
    }
    btn.addEventListener("click", function () { setOpen(!nav.classList.contains("open")); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
    document.addEventListener("click", function (e) {
      if (nav.classList.contains("open") && !e.target.closest(".header-inner")) setOpen(false);
    });
  }

  /* ---------- 동작: 현재 위치 메뉴 강조 ---------- */
  function setupScrollSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll(".nav a"));
    var ids = links.map(function (a) { return a.dataset.id; });
    function update() {
      var line = window.innerHeight * 0.35;
      var current = null;
      ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      });
      // 페이지 맨 끝에 닿으면 마지막 메뉴를 강조
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        current = ids[ids.length - 1];
      }
      links.forEach(function (a) { a.classList.toggle("active", a.dataset.id === current); });
    }
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ---------- 동작: 떨어지는 꽃잎 ---------- */
  function setupPetals() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var box = document.querySelector(".petals");
    var count = window.innerWidth < 640 ? 8 : 14;
    for (var i = 0; i < count; i++) {
      var p = document.createElement("span");
      var size = 8 + Math.random() * 10;
      p.className = "petal";
      p.style.left = Math.random() * 100 + "%";
      p.style.width = size + "px";
      p.style.height = size * 0.8 + "px";
      p.style.animationDuration = 12 + Math.random() * 12 + "s";
      p.style.animationDelay = -Math.random() * 20 + "s";
      box.appendChild(p);
    }
  }

  /* =========================================================
     4단계 — 수강생 참여 기능
     ========================================================= */
  function noticeBox(text) {
    return text ? '<p class="notice">ℹ️ ' + esc(text) + "</p>" : "";
  }

  /* ---------- 참여하기 섹션 ---------- */
  /* 설문 목록 (예전 설정의 poll 한 개짜리도 읽어 줌) */
  function pollList() {
    var j = C.join || {};
    if (j.polls && j.polls.length) return j.polls;
    if (j.poll && j.poll.options) {
      return [{ id: "default", question: j.poll.question, hint: j.poll.hint, options: j.poll.options, author: "관리자", createdAt: "", status: "open" }];
    }
    return [];
  }
  function pollVotes(id) {
    var s = store.get("poll." + id, null);
    return s && s.votes ? s : { votes: {}, mine: null };
  }
  function fmtCreated(s) {
    var d = s ? new Date(s) : null;
    return d && !isNaN(d) ? fmtDue(d) : "-";
  }

  function renderJoin() {
    var j = C.join;
    if (!j) return;
    var apply = j.apply || {};
    $("#join").innerHTML = wrap(
      sectionHead(j, "join") +
      noticeBox(j.notice) +
      '<div class="poll-head"><h3 class="sub-title">설문</h3>' + adminAdd("poll", "설문 추가") + "</div>" +
      '<div class="card poll" id="poll-card"></div>' +
      '<h3 class="sub-title" id="apply">' + esc(apply.title || "수강 신청서") + "</h3>" +
      '<div class="card apply-card"></div>' +
      '<h3 class="sub-title poll-history-title" id="poll-history">설문 히스토리</h3>' +
      '<div class="card poll-history"></div>'
    );
  }

  /* 설문 — 진행 중인 설문에 투표 (같은 브라우저의 다른 탭에서 투표해도 바로 반영)
     · 설문 히스토리 표의 '열기'로 지난 설문의 결과도 볼 수 있음 */
  var currentPollId = null;
  function setupPoll() {
    var card = document.getElementById("poll-card");
    if (!card) return;
    var hist = document.querySelector(".poll-history");
    // '준비 중(draft)' 설문은 관리자에게만 보임
    var allPolls = pollList();
    var polls = allPolls.filter(function (p) { return ADMIN || p.status !== "draft"; });
    var STATUS = { open: ["진행 중", "tag-hw"], closed: ["마감", "tag-closed"], draft: ["준비 중", "tag-draft"] };
    function st(p) { return STATUS[p.status] || STATUS.open; }

    // 기본으로 보여 줄 설문: 진행 중인 것 중 가장 최근 → 없으면 가장 최근 (준비 중은 제외)
    var byNewest = polls.map(function (p) { return { p: p, i: allPolls.indexOf(p) }; })
      .sort(function (a, b) { return String(b.p.createdAt).localeCompare(String(a.p.createdAt)); });
    var firstOpen = byNewest.filter(function (x) { return x.p.status === "open" || !x.p.status; })[0] ||
      byNewest.filter(function (x) { return x.p.status !== "draft"; })[0] || byNewest[0];
    currentPollId = (RESTORE && RESTORE.poll && polls.some(function (p) { return p.id === RESTORE.poll; }))
      ? RESTORE.poll : firstOpen ? firstOpen.p.id : null;

    function drawPoll() {
      var p = polls.filter(function (x) { return x.id === currentPollId; })[0];
      if (!p) {
        card.innerHTML = '<p class="muted">진행 중인 설문이 없습니다.</p>';
        return;
      }
      var closed = p.status === "closed" || p.status === "draft"; // 준비 중도 투표 불가
      var s = pollVotes(p.id), sum = 0, options = p.options || [];
      options.forEach(function (_, i) { sum += s.votes[i] || 0; });
      card.innerHTML =
        '<div class="poll-top">' +
          '<span class="tag ' + st(p)[1] + '">' + st(p)[0] + "</span>" +
          '<span class="poll-meta">' + esc(p.author || "-") + " · " + esc(fmtCreated(p.createdAt)) + "</span>" +
        "</div>" +
        '<h4 class="poll-q">' + esc(p.question) + "</h4>" +
        '<p class="poll-hint">' + esc(p.status === "draft" ? "준비 중인 설문입니다. 방문자에게는 보이지 않습니다. (수정에서 '진행 중'으로 바꾸면 공개)"
          : closed ? "마감된 설문입니다. 결과만 볼 수 있습니다." : p.hint || "") + "</p>" +
        '<div class="poll-options">' +
        options.map(function (label, i) {
          var n = s.votes[i] || 0, pct = sum ? Math.round((n / sum) * 100) : 0, mine = s.mine === i;
          return (
            '<button type="button" class="poll-option' + (mine ? " mine" : "") + '" data-i="' + i + '" aria-pressed="' + mine + '"' + (closed ? " disabled" : "") + ">" +
              '<span class="poll-bar" style="width:' + pct + '%"></span>' +
              '<span class="poll-label">' + (mine ? "✓ " : "") + esc(label) + "</span>" +
              '<span class="poll-count">' + n + "표 · " + pct + "%</span>" +
            "</button>"
          );
        }).join("") +
        "</div>" +
        '<p class="poll-total">총 ' + sum + "표" + (s.mine !== null && options[s.mine] ? " · 내 선택: " + esc(options[s.mine]) : "") + "</p>";
    }

    function drawHistory() {
      if (!polls.length) { hist.innerHTML = '<p class="muted">만든 설문이 없습니다.</p>'; return; }
      hist.innerHTML =
        '<div class="table-wrap"><table class="history-table"><thead><tr>' +
          "<th>번호</th><th>설문</th><th>생성일시</th><th>주체</th><th>상태</th><th>참여</th><th>열기</th>" +
          (ADMIN ? "<th>수정</th><th>삭제</th>" : "") +
        "</tr></thead><tbody>" +
        byNewest.map(function (x, n) {
          var p = x.p, s = pollVotes(p.id), sum = 0;
          (p.options || []).forEach(function (_, i) { sum += s.votes[i] || 0; });
          var on = p.id === currentPollId;
          return (
            "<tr" + (on ? ' class="on"' : "") + ">" +
              "<td>" + (byNewest.length - n) + "</td>" +
              '<td class="q">' + esc(p.question) + "</td>" +
              "<td>" + esc(fmtCreated(p.createdAt)) + "</td>" +
              "<td>" + esc(p.author || "-") + "</td>" +
              '<td><span class="tag ' + st(p)[1] + '">' + st(p)[0] + "</span></td>" +
              "<td>" + sum + "표</td>" +
              '<td><button type="button" class="tbl-btn" data-open-poll="' + esc(p.id) + '"' + (on ? " disabled" : "") + ">" + (on ? "보는 중" : "열기") + "</button></td>" +
              (ADMIN
                ? '<td><button type="button" class="tbl-btn" data-edit="edit" data-kind="poll" data-i="' + x.i + '">✏️ 수정</button></td>' +
                  '<td><button type="button" class="tbl-btn del" data-edit="del" data-kind="poll" data-i="' + x.i + '">🗑 삭제</button></td>'
                : "") +
            "</tr>"
          );
        }).join("") +
        "</tbody></table></div>" +
        '<p class="muted small">참여 수는 이 브라우저에서 집계한 값입니다. (시범 운영)</p>';
    }

    card.addEventListener("click", function (e) {
      var b = e.target.closest("[data-i]");
      if (!b || b.disabled) return;
      var p = polls.filter(function (x) { return x.id === currentPollId; })[0];
      if (!p || p.status === "closed" || p.status === "draft") return;
      var i = Number(b.dataset.i), s = pollVotes(p.id);
      if (s.mine === i) return;
      if (s.mine !== null) s.votes[s.mine] = Math.max(0, (s.votes[s.mine] || 0) - 1);
      s.votes[i] = (s.votes[i] || 0) + 1;
      s.mine = i;
      store.set("poll." + p.id, s);
      // 구글 시트 연동 시 응답 기록 (로그인한 수강생이면 학번도 함께)
      var me = store.get("session", null);
      sendSheet("poll", { pollId: p.id, question: p.question, choice: p.options[i], studentId: me ? me.id : "", name: me ? me.name : "" });
      drawPoll();
      drawHistory();
      toast("투표했습니다: " + p.options[i]);
    });
    hist.addEventListener("click", function (e) {
      var b = e.target.closest("[data-open-poll]");
      if (!b) return;
      currentPollId = b.dataset.openPoll;
      drawPoll();
      drawHistory();
      card.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    window.addEventListener("storage", function (e) {
      if (e.key && e.key.indexOf("aiweb.poll.") === 0) { drawPoll(); drawHistory(); }
    });
    drawPoll();
    drawHistory();
  }

  /* 수강 신청서 — 빠진 항목을 모아서 알려 줌 */
  function setupApply() {
    var card = document.querySelector(".apply-card");
    if (!card) return;
    var cfg = C.join.apply || {};
    var fields = cfg.fields || [];

    function fieldHtml(f) {
      var id = "ap-" + f.name, req = f.required ? ' <span class="req" aria-hidden="true">*</span>' : "";
      var attrs = ' id="' + id + '" name="' + esc(f.name) + '"' + (f.required ? ' aria-required="true"' : "") + ' aria-describedby="' + id + '-err"';
      var input;
      if (f.type === "checkbox") {
        return (
          '<div class="field wide check-field"><label class="check"><input type="checkbox"' + attrs + ">" +
          "<span>" + esc(f.label) + req + "</span></label>" +
          '<p class="field-err" id="' + id + '-err"></p></div>'
        );
      }
      if (f.type === "select") {
        input = "<select" + attrs + '><option value="">선택해 주세요</option>' +
          (f.options || []).map(function (o) { return "<option>" + esc(o) + "</option>"; }).join("") + "</select>";
      } else if (f.type === "textarea") {
        input = "<textarea" + attrs + ' rows="4" placeholder="' + esc(f.placeholder) + '"></textarea>';
      } else {
        input = '<input type="' + esc(f.type || "text") + '"' + attrs + ' placeholder="' + esc(f.placeholder) + '"' +
          (f.type === "email" ? ' autocomplete="email"' : "") + (f.name === "name" ? ' autocomplete="name"' : "") + ">";
      }
      return (
        '<div class="field' + (f.wide ? " wide" : "") + '">' +
          '<label for="' + id + '">' + esc(f.label) + req + "</label>" + input +
          '<p class="field-err" id="' + id + '-err"></p>' +
        "</div>"
      );
    }

    function drawForm() {
      card.innerHTML =
        '<form class="form apply-form" novalidate>' +
          '<div class="form-summary" role="alert" hidden></div>' +
          '<div class="form-grid">' + fields.map(fieldHtml).join("") + "</div>" +
          '<button class="btn btn-primary" type="submit">' + esc(cfg.submitLabel || "신청서 제출") + "</button>" +
        "</form>";
      card.querySelector("form").addEventListener("submit", onSubmit);
    }

    function eulReul(word) { // 받침이 있으면 '을', 없으면 '를'
      var c = String(word).charCodeAt(String(word).length - 1) - 0xac00;
      return c >= 0 && c <= 11171 && c % 28 !== 0 ? "을" : "를";
    }
    function check(f, el) {
      var v = f.type === "checkbox" ? el.checked : String(el.value || "").trim();
      if (f.required && !v) {
        if (f.type === "checkbox") return "동의해 주셔야 신청할 수 있습니다.";
        return f.label + eulReul(f.label) + (f.type === "select" ? " 선택해 주세요." : " 입력해 주세요.");
      }
      if (v && f.pattern && !new RegExp(f.pattern).test(v)) return f.patternMessage || f.label + " 형식을 확인해 주세요.";
      if (v && f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "이메일 주소 형식을 확인해 주세요.";
      return "";
    }

    function onSubmit(e) {
      e.preventDefault();
      var form = e.target, problems = [], firstBad = null, data = {};
      fields.forEach(function (f) {
        var el = form.elements[f.name];
        var msg = check(f, el);
        var err = document.getElementById("ap-" + f.name + "-err");
        err.textContent = msg;
        el.setAttribute("aria-invalid", msg ? "true" : "false");
        el.closest(".field").classList.toggle("invalid", !!msg);
        if (msg) { problems.push(f.type === "checkbox" ? "개인정보 수집 동의" : f.label); if (!firstBad) firstBad = el; }
        data[f.name] = f.type === "checkbox" ? el.checked : String(el.value || "").trim();
      });

      var summary = form.querySelector(".form-summary");
      if (problems.length) {
        summary.hidden = false;
        summary.innerHTML = "<strong>빠진 항목이나 잘못된 항목이 있습니다.</strong> " + problems.map(esc).join(", ");
        firstBad.focus();
        return;
      }
      summary.hidden = true;

      data.submittedAt = new Date().toISOString();
      var list = store.get("applications", []);
      var dup = list.some(function (a) { return a.studentId && a.studentId === data.studentId; });
      list = list.filter(function (a) { return !(a.studentId && a.studentId === data.studentId); });
      list.push(data);
      store.set("applications", list);

      // 받을 주소가 있으면 함께 보냄: 신청서 전용 주소(apply.endpoint) → 없으면 구글 시트 연동 주소
      var sent = !!(cfg.endpoint || sheetEndpoint());
      if (cfg.endpoint) {
        fetch(cfg.endpoint, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(data) })
          .catch(function () { toast("신청서를 서버로 보내지 못했습니다. 이 브라우저에는 저장되었습니다."); });
      } else if (sheetEndpoint()) {
        sendSheet("application", data).then(function (ok) { if (!ok) toast("신청서를 시트로 보내지 못했습니다. 이 브라우저에는 저장되었습니다."); });
      }

      card.innerHTML =
        '<div class="done"><div class="done-icon" aria-hidden="true">🎉</div>' +
        "<h4>" + esc(cfg.doneMessage || "신청서가 접수되었습니다.") + "</h4>" +
        "<p>" + esc(data.name) + " (" + esc(data.studentId) + ")" + (dup ? " · 같은 학번의 이전 신청서를 새 내용으로 바꿨습니다." : "") + "</p>" +
        (sent ? "" : '<p class="muted">시범 운영 중이라 이 브라우저에만 저장되었습니다.</p>') +
        '<button class="btn btn-ghost btn-sm" type="button">다시 작성하기</button></div>';
      card.querySelector("button").addEventListener("click", drawForm);
      card.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    drawForm();
  }

  /* ---------- 내 강의실 섹션 ---------- */
  var preferredWeek = null; // 커리큘럼의 '내 강의실에서 제출'로 들어왔을 때 미리 고를 과제

  // 출석 QR 로 들어온 경우 (주소 끝 ?att=1234) → 출석 코드 칸에 미리 넣어 둠
  var pendingAttCode = null;
  (function () {
    var m = location.search.match(/[?&]att=(\d{4})\b/);
    if (!m) return;
    pendingAttCode = m[1];
    try { history.replaceState(null, "", location.pathname + "#classroom"); } catch (e) { /* 무시 */ }
  })();

  function renderClassroom() {
    var c = C.classroom;
    if (!c) return;
    $("#classroom").innerHTML = wrap(
      sectionHead(c) + noticeBox(c.notice) +
      (ADMIN
        ? '<div class="admin-ctrl att-admin"><button type="button" data-edit="attscreen" data-kind="att">📺 출석 코드 화면 띄우기 (교실 화면용)</button></div>'
        : "") +
      '<div class="cr-body"></div>'
    );
  }

  function setupClassroom() {
    var body = document.querySelector(".cr-body");
    if (!body) return;
    var cfg = C.classroom;
    var assignments = weeks.filter(function (w) { return w.src.assignment; });

    function session() { return store.get("session", null); }

    /* 로그인 화면 */
    function drawLogin() {
      body.innerHTML =
        '<div class="card login-card">' +
          '<div class="login-icon" aria-hidden="true">🔐</div>' +
          "<h3>수강생 로그인</h3>" +
          '<p class="muted">학번, 이름, 수업 시간에 안내받은 수강 코드를 입력하세요.</p>' +
          '<form class="form login-form" novalidate>' +
            '<div class="form-summary" role="alert" hidden></div>' +
            '<div class="field"><label for="lg-id">학번 <span class="req" aria-hidden="true">*</span></label><input id="lg-id" name="id" inputmode="numeric" autocomplete="username" placeholder="숫자 10자리"></div>' +
            '<div class="field"><label for="lg-name">이름 <span class="req" aria-hidden="true">*</span></label><input id="lg-name" name="name" autocomplete="name" placeholder="홍길동"></div>' +
            '<div class="field"><label for="lg-code">수강 코드 <span class="req" aria-hidden="true">*</span></label><input id="lg-code" name="code" type="password" autocomplete="current-password" placeholder="수강 코드"></div>' +
            '<button class="btn btn-primary" type="submit">로그인</button>' +
          "</form>" +
        "</div>";
      body.querySelector("form").addEventListener("submit", onLogin);
    }

    function onLogin(e) {
      e.preventDefault();
      var f = e.target, summary = f.querySelector(".form-summary");
      var id = f.elements.id.value.trim(), name = f.elements.name.value.trim(), code = f.elements.code.value.trim();
      var problems = [];
      if (!/^\d{10}$/.test(id)) problems.push("학번(숫자 10자리)");
      if (!name) problems.push("이름");
      if (cfg.codeHash && !code) problems.push("수강 코드");
      function fail(msg) { summary.hidden = false; summary.innerHTML = msg; }
      if (problems.length) { fail("<strong>확인해 주세요:</strong> " + problems.join(", ")); return; }

      Promise.all([cfg.codeHash ? sha256(code) : Promise.resolve(""), sha256(id)]).then(function (h) {
        if (cfg.codeHash && h[0] !== cfg.codeHash) { fail("수강 코드가 맞지 않습니다."); return; }
        if (cfg.roster && cfg.roster.length && cfg.roster.indexOf(h[1]) === -1) { fail("수강생 명단에 없는 학번입니다. 교수자에게 문의해 주세요."); return; }
        store.set("session", { id: id, name: name, at: new Date().toISOString() });
        toast(name + "님, 환영합니다!");
        draw();
      }).catch(function () {
        fail("이 브라우저에서는 로그인 기능을 쓸 수 없습니다. 최신 Chrome 또는 Edge로 열어 주세요.");
      });
    }

    /* 로그인 후 화면 */
    function drawDashboard(me) {
      var subOpts = assignments.map(function (w) {
        var closed = w.due && w.due.getTime() < Date.now();
        return '<option value="' + esc(w.week) + '"' + (String(preferredWeek) === String(w.week) ? " selected" : "") + ">" +
          esc(w.week + "주차 · " + w.src.assignment.title + (w.due ? " (마감 " + fmtShort(w.due) + ")" : "") + (closed ? " — 마감 지남" : "")) +
          "</option>";
      }).join("");
      preferredWeek = null;

      body.innerHTML =
        '<div class="card cr-top">' +
          '<span class="cr-hello">👋 <strong>' + esc(me.name) + "</strong>님 <span class=\"muted\">(" + esc(me.id) + ")</span></span>" +
          '<button class="btn btn-ghost btn-sm" type="button" data-logout>로그아웃</button>' +
        "</div>" +
        '<div class="cr-grid">' +
          '<div class="card cr-att"><h3>✅ 출석 체크</h3><div class="att-status"></div><div class="att-grid"></div></div>' +
          '<div class="card cr-sub"><h3>📝 과제 제출</h3>' +
            (assignments.length
              ? '<form class="form sub-form" novalidate>' +
                  '<div class="form-summary" role="alert" hidden></div>' +
                  '<div class="field"><label for="sb-week">과제 <span class="req" aria-hidden="true">*</span></label><select id="sb-week" name="week"><option value="">선택해 주세요</option>' + subOpts + "</select></div>" +
                  '<div class="field"><label for="sb-file">파일 <span class="req" aria-hidden="true">*</span></label><input id="sb-file" name="file" type="file"><p class="hint">최대 ' + esc(cfg.maxFileMB || 20) + "MB</p></div>" +
                  '<div class="field"><label for="sb-memo">메모</label><textarea id="sb-memo" name="memo" rows="2" placeholder="교수자에게 남길 말 (선택)"></textarea></div>' +
                  '<button class="btn btn-primary" type="submit">제출하기</button>' +
                "</form>" +
                '<h4 class="my-subs-title">내 제출 기록</h4><ul class="my-subs"></ul>'
              : '<p class="muted">제출할 과제가 없습니다.</p>') +
          "</div>" +
        "</div>";

      body.querySelector("[data-logout]").addEventListener("click", function () {
        store.remove("session");
        toast("로그아웃했습니다.");
        draw();
      });
      drawAttendance(me);
      var form = body.querySelector(".sub-form");
      if (form) { form.addEventListener("submit", function (e) { onSubmitWork(e, me); }); drawMySubs(me); }
    }

    /* 출석 */
    function drawAttendance(me) {
      var recs = store.get("attendance", []).filter(function (r) { return r.id === me.id; });
      var done = {};
      recs.forEach(function (r) { done[r.week] = r.at; });
      var todayKey = keyOf(new Date());
      var classToday = weeks.filter(function (w) { return w.key === todayKey; })[0];
      var target = classToday || (cfg.testMode ? weeks.filter(function (w) { return !done[w.week]; })[0] : null);

      var status = body.querySelector(".att-status");
      var html = "";
      if (cfg.testMode) html += '<p class="test-badge">테스트 모드 · 수업일이 아니어도 출석 체크가 됩니다</p>';
      if (target && done[target.week]) {
        html += "<p>오늘(" + esc(target.week) + "주차) 출석이 완료되었습니다. ✔</p>";
      } else if (target) {
        html += "<p>" + esc(target.week) + "주차 · " + (target.date ? esc(fmtLong(target.date)) : "") + "</p>" +
          (cfg.attendanceSecret
            ? '<div class="att-code"><label for="att-code">출석 코드 <small class="muted">(수업 화면의 4자리 숫자 또는 QR)</small></label>' +
                '<input id="att-code" inputmode="numeric" maxlength="4" autocomplete="one-time-code" placeholder="0000" value="' + esc(pendingAttCode || "") + '">' +
                '<p class="att-msg" role="alert"></p></div>'
            : "") +
          '<button class="btn btn-primary" type="button" data-check="' + esc(target.week) + '">' + esc(target.week) + "주차 출석 체크</button>";
      } else {
        var next = weeks.filter(function (w) { return w.date && w.key > todayKey; })[0];
        html += '<p class="muted">오늘은 수업일이 아닙니다.' + (next ? " 다음 수업: " + esc(fmtShort(next.date)) + " · " + esc(next.week) + "주차" : " 이번 학기 수업이 모두 끝났습니다.") + "</p>";
      }
      status.innerHTML = html;

      body.querySelector(".att-grid").innerHTML = weeks.map(function (w) {
        var ok = !!done[w.week];
        return '<span class="att-cell' + (ok ? " ok" : "") + '" title="' + esc(w.week + "주차" + (ok ? " 출석" : "")) + '">' +
          "<b>" + esc(w.week) + "</b><small>" + (ok ? "출석" : w.date ? (w.date.getMonth() + 1) + "." + w.date.getDate() : "") + "</small></span>";
      }).join("") +
      '<p class="att-sum">출석 ' + recs.length + " / " + weeks.length + "회</p>";

      var btn = status.querySelector("[data-check]");
      if (!btn) return;
      function record() {
        var rec = { id: me.id, name: me.name, week: Number(btn.dataset.check), at: new Date().toISOString() };
        var all = store.get("attendance", []);
        all.push(rec);
        store.set("attendance", all);
        sendSheet("attendance", rec);
        pendingAttCode = null;
        toast(btn.dataset.check + "주차 출석 완료!");
        drawAttendance(me);
      }
      btn.addEventListener("click", function () {
        if (!cfg.attendanceSecret) { record(); return; }

        // 출석 코드 확인: 지금 1분 구간과 직전 1분 구간의 코드를 인정 (5번 틀리면 그날은 잠금)
        var input = status.querySelector("#att-code"), msg = status.querySelector(".att-msg");
        var code = String(input.value || "").trim();
        var lock = store.get("attLock", {});
        if (lock.day === todayKey && lock.fails >= 5) { msg.textContent = "코드를 5번 틀려 오늘은 더 시도할 수 없습니다. 교수자에게 문의해 주세요."; return; }
        if (!/^\d{4}$/.test(code)) { msg.textContent = "4자리 숫자 코드를 입력해 주세요."; input.focus(); return; }
        var slot = codeSlot();
        Promise.all([attendanceCode(cfg.attendanceSecret, todayKey, slot), attendanceCode(cfg.attendanceSecret, todayKey, slot - 1)])
          .then(function (ok) {
            if (ok.indexOf(code) !== -1) { store.remove("attLock"); record(); return; }
            var fails = lock.day === todayKey ? (lock.fails || 0) + 1 : 1;
            store.set("attLock", { day: todayKey, fails: fails });
            msg.textContent = "출석 코드가 맞지 않습니다. (" + fails + "/5) 코드는 1분마다 바뀌니 화면의 최신 코드를 입력하세요.";
          })
          .catch(function () { msg.textContent = "이 브라우저에서는 출석 코드를 확인할 수 없습니다. 최신 Chrome 또는 Edge로 열어 주세요."; });
      });
    }

    /* 과제 제출 (시범 운영: 파일 이름·크기·시각만 기록) */
    function onSubmitWork(e, me) {
      e.preventDefault();
      var f = e.target, summary = f.querySelector(".form-summary");
      var week = f.elements.week.value, file = f.elements.file.files[0], memo = f.elements.memo.value.trim();
      var problems = [];
      if (!week) problems.push("과제");
      if (!file) problems.push("파일");
      if (file && file.size > (cfg.maxFileMB || 20) * 1048576) problems.push("파일 크기(최대 " + (cfg.maxFileMB || 20) + "MB)");
      if (problems.length) { summary.hidden = false; summary.innerHTML = "<strong>확인해 주세요:</strong> " + problems.join(", "); return; }
      summary.hidden = true;

      var w = weeks.filter(function (x) { return String(x.week) === week; })[0];
      var rec = {
        id: me.id, name: me.name, week: Number(week), title: w.src.assignment.title,
        file: file.name, size: file.size, memo: memo, at: new Date().toISOString(),
        late: !!(w.due && Date.now() > w.due.getTime()), sent: false
      };
      function save() {
        var all = store.get("submissions", []).filter(function (s) { return !(s.id === me.id && String(s.week) === week); });
        all.push(rec);
        store.set("submissions", all);
        drawMySubs(me);
      }

      if (!sheetEndpoint()) { // 시범 운영: 파일 이름·크기·시각만 이 브라우저에 기록
        save();
        f.reset();
        toast(week + "주차 과제 제출 기록이 저장되었습니다.");
        return;
      }

      // 구글 시트 연동: 파일을 읽어 교수자의 구글 드라이브 폴더로 보냄
      var btnEl = f.querySelector("button[type=submit]");
      btnEl.disabled = true;
      btnEl.textContent = "보내는 중…";
      var reader = new FileReader();
      reader.onload = function () {
        var data = String(reader.result).split(",")[1] || "";
        var payload = {};
        Object.keys(rec).forEach(function (k) { payload[k] = rec[k]; });
        payload.fileData = { name: file.name, type: file.type || "application/octet-stream", base64: data };
        sendSheet("submission", payload).then(function (ok) {
          rec.sent = ok;
          save();
          f.reset();
          btnEl.disabled = false;
          btnEl.textContent = "제출하기";
          toast(ok ? week + "주차 과제를 교수자에게 보냈습니다." : "과제를 보내지 못했습니다. 인터넷 연결을 확인하고 다시 제출해 주세요.");
        });
      };
      reader.onerror = function () {
        btnEl.disabled = false;
        btnEl.textContent = "제출하기";
        summary.hidden = false;
        summary.textContent = "파일을 읽지 못했습니다. 다른 파일로 다시 시도해 주세요.";
      };
      reader.readAsDataURL(file);
    }

    function drawMySubs(me) {
      var ul = body.querySelector(".my-subs");
      var mine = store.get("submissions", []).filter(function (s) { return s.id === me.id; })
        .sort(function (a, b) { return a.week - b.week; });
      ul.innerHTML = mine.length
        ? mine.map(function (s) {
            var at = new Date(s.at);
            return "<li><strong>" + esc(s.week) + "주차 · " + esc(s.title) + "</strong>" +
              (s.late ? ' <span class="tag tag-holiday">기한 후 제출</span>' : ' <span class="tag tag-hw">제출 완료</span>') +
              (s.sent ? ' <span class="tag tag-sent">교수자에게 전송됨</span>' : "") +
              '<span class="muted">📎 ' + esc(s.file) + " (" + Math.max(1, Math.round(s.size / 1024)) + "KB) · " + esc(fmtDue(at)) + "</span></li>";
          }).join("")
        : '<li class="muted">아직 제출한 과제가 없습니다.</li>';
    }

    function draw() {
      var me = session();
      if (me && me.id) drawDashboard(me); else drawLogin();
    }

    // 커리큘럼의 '내 강의실에서 제출' 버튼 → 그 과제를 미리 골라 둠
    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-submit-week]");
      if (!b) return;
      preferredWeek = b.dataset.submitWeek;
      var sel = document.getElementById("sb-week");
      if (sel) sel.value = preferredWeek; else draw();
      if (!session()) toast("먼저 로그인해 주세요.");
    });

    draw();
  }

  /* ---------- 첫 방문 안내 팝업 ('오늘 하루 보지 않기' = 자정까지 숨김) ---------- */
  function setupPopup() {
    var p = C.popup;
    if (!p || !p.enabled) return;
    if (store.get("popupHideUntil", 0) > Date.now()) return;
    try { if (sessionStorage.getItem("aiweb.adminReopen") || sessionStorage.getItem("aiweb.admin")) return; } catch (e) { /* 무시 */ }

    setTimeout(function () {
      var lastFocus = document.activeElement;
      var mark = site.logo ? '<img src="' + esc(site.logo) + '" alt="">' : "🧠";
      var wrapEl = document.createElement("div");
      wrapEl.className = "modal-backdrop";
      wrapEl.innerHTML =
        '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="popup-title">' +
          '<button class="modal-x" type="button" aria-label="닫기" data-close>×</button>' +
          '<div class="brand-mark modal-mark' + (site.logo ? " has-logo" : "") + '">' + mark + "</div>" +
          '<span class="eyebrow">' + esc(p.badge) + "</span>" +
          '<h3 id="popup-title">' + esc(p.title) + "</h3>" +
          "<p>" + esc(p.text) + "</p>" +
          '<a class="btn btn-primary modal-go" href="' + esc(p.buttonHref || "#apply") + '" data-close>' + esc(p.buttonLabel) + "</a>" +
          '<div class="modal-foot"><button class="link-btn muted" type="button" data-today>오늘 하루 보지 않기</button>' +
          '<button class="link-btn muted" type="button" data-close>닫기</button></div>' +
        "</div>";
      document.body.appendChild(wrapEl);
      requestAnimationFrame(function () { wrapEl.classList.add("show"); });
      wrapEl.querySelector(".modal-go").focus();

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
        if (e.target.closest("[data-today]")) {
          var midnight = new Date(); midnight.setHours(24, 0, 0, 0);
          store.set("popupHideUntil", midnight.getTime());
          close();
        }
      });
    }, (Number(p.delaySeconds) || 2) * 1000);
  }

  /* ---------- 첫 방문 폭죽 ---------- */
  function setupWelcome() {
    // 주소 끝에 ?welcome 을 붙이면 폭죽과 안내 팝업을 다시 볼 수 있음
    if (/[?&]welcome\b/.test(location.search)) { store.remove("welcomed"); store.remove("popupHideUntil"); }
    if (!C.welcome || !C.welcome.confetti || store.get("welcomed", false)) return;
    store.set("welcomed", true);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var canvas = document.createElement("canvas");
    canvas.className = "confetti";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    var dpr = window.devicePixelRatio || 1, W = window.innerWidth, H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    var colors = ["#8b0029", "#a6192e", "#c8385a", "#f0ccd3", "#b8b8b8", "#d4af37"]; // 크림슨 · 은색 · 금색
    var parts = [];
    function burst(x, dir) {
      for (var i = 0; i < 80; i++) {
        var angle = (-Math.PI / 2) + dir * (Math.random() * 0.9) + (Math.random() - 0.5) * 0.5;
        var speed = 9 + Math.random() * 9;
        parts.push({
          x: x, y: H + 10, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
          color: colors[(Math.random() * colors.length) | 0]
        });
      }
    }
    burst(W * 0.1, 1);
    burst(W * 0.9, -1);

    var start = performance.now();
    (function frame(t) {
      var el = t - start;
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = el > 2600 ? Math.max(0, 1 - (el - 2600) / 900) : 1;
      parts.forEach(function (p) {
        p.vy += 0.32; p.vx *= 0.99; p.vy *= 0.99;
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.cos(p.rot * 2));
        ctx.restore();
      });
      if (el < 3500) requestAnimationFrame(frame); else canvas.remove();
    })(start);
  }

  renderHeader();
  renderHero();
  renderNotices();
  renderAbout();
  renderCurriculum();
  renderPortfolio();
  renderGuide();
  renderJoin();
  renderClassroom();
  renderFaq();
  renderInstructor();
  setupScroll();
  setupMenu();
  setupSlider();
  setupCountUp();
  setupCountdown();
  setupCalendar();
  setupIcs();
  setupPortfolio();
  setupPoll();
  setupApply();
  setupClassroom();
  setupWelcome();
  setupPopup();

  /* admin.js 가 쓰는 도구 모음 */
  window.AIWEB = {
    config: C, original: ORIGINAL, hasOverride: hasOverride,
    store: store, sha256: sha256, esc: esc, toast: toast,
    weeks: weeks, fmtDue: fmtDue, keyOf: keyOf,
    driveInfo: driveInfo, EVENT_TYPES: EVENT_TYPES,
    currentPoll: function () { return currentPollId; },
    attendanceCode: attendanceCode, codeSlot: codeSlot, sheetEndpoint: sheetEndpoint
  };

  // 출석 QR 로 들어왔으면 내 강의실로 이동
  if (pendingAttCode && !RESTORE) {
    setTimeout(function () {
      var cr = document.getElementById("classroom");
      if (cr) cr.scrollIntoView({ behavior: "instant", block: "start" });
      toast(store.get("session", null) ? "출석 코드가 입력되었습니다. 출석 체크를 눌러 주세요." : "출석 코드가 입력되었습니다. 로그인한 뒤 출석 체크를 눌러 주세요.");
    }, 300);
  }
  setupScrollSpy();
  setupPetals();

  /* 본문에서 수정·저장한 뒤 새로고침되었으면 보던 곳으로 되돌아가기 */
  if (RESTORE) {
    try { history.scrollRestoration = "manual"; } catch (e) { /* 무시 */ }
    if (RESTORE.openWeek != null) { var wEl = document.getElementById("week-" + RESTORE.openWeek); if (wEl) wEl.open = true; }
    if (RESTORE.openFaq != null) { var fEl = document.getElementById("faq-" + RESTORE.openFaq); if (fEl) fEl.open = true; }
    if (RESTORE.calKey && calendarSelect) calendarSelect(RESTORE.calKey);
    // 고친 항목(anchor)이 화면의 같은 높이에 오도록 — 글씨체·그림이 다 불러와진 뒤에 한 번 더 맞춤
    var restoreScroll = function () {
      var el = RESTORE.anchor && document.getElementById(RESTORE.anchor);
      var top = el ? el.getBoundingClientRect().top + window.scrollY - (RESTORE.offset || 100) : RESTORE.y || 0;
      window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
    };
    restoreScroll();
    if (document.readyState !== "complete") window.addEventListener("load", function () { requestAnimationFrame(restoreScroll); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { requestAnimationFrame(restoreScroll); });
    if (RESTORE.msg) toast(RESTORE.msg);
  }
})();
