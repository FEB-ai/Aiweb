/* =========================================================
   사이트 설정 파일 — 사이트의 모든 글은 여기서만 고치면 됩니다.
   - 따옴표(" ") 안의 글자만 바꾸고, 쉼표(,)와 괄호는 지워지지 않게 주의하세요.
   - 저장한 뒤 브라우저에서 새로고침(F5)하면 바로 반영됩니다.
   - [예시] 표시가 있는 내용은 실제 강의계획서로 바꿔 주세요.
   ========================================================= */
window.SITE_CONFIG = {
  /* ---------- 기본 정보 ---------- */
  site: {
    university: "고려대학교",
    department: "의과학과",
    courseName: "신경과학",
    tagline: "AI 기반 신경과학 학습능력 배양",
    logo: "images/logo.gif", // 로고 이미지 경로. 비워 두면 기본 아이콘이 보입니다.
    version: "v.1.0" // 첫 화면 제목 오른쪽 위에 빨간 글씨로 표시 (비우면 숨김)
  },

  /* ---------- 헤더 메뉴 (id는 아래 섹션 이름과 같아야 합니다) ---------- */
  nav: [
    { id: "about", label: "프로그램 소개" },
    { id: "curriculum", label: "커리큘럼" },
    { id: "portfolio", label: "포트폴리오" },
    { id: "guide", label: "수강 안내" },
    { id: "join", label: "참여하기" },
    { id: "classroom", label: "내 강의실" },
    { id: "faq", label: "FAQ" },
    { id: "instructor", label: "교수자" }
  ],

  /* ---------- 첫 화면 ---------- */
  hero: {
    badge: "2026 상반기 집중 프로그램",
    subtitle: "AI 기반 신경과학 학습능력 배양",
    description:
      "생성형 AI를 학습 도구로 활용해 뉴런의 신호 전달부터 감각·운동·기억, 신경계 질환의 기전까지 신경과학의 핵심 개념을 이해하고, 논문과 데이터를 스스로 읽고 해석하는 능력을 기릅니다.",
    buttons: [
      { label: "수강 신청", href: "#apply", primary: true },
      { label: "커리큘럼 보기", href: "#curriculum", primary: false }
    ],
    // 한눈에 보기 — auto 항목은 아래 커리큘럼의 일정(schedule)에서 자동으로 계산됩니다.
    glance: [
      { icon: "📅", label: "일정", auto: "period" },
      { icon: "⏰", label: "시간", auto: "time" },
      { icon: "💻", label: "수업 방식", value: "이론 강의 + AI 실습 병행" },
      { icon: "👥", label: "수강 대상", value: "의과학과 대학원생" }
    ]
  },

  /* ---------- 통계 카드 ----------
     value 대신 count: "tools" 라고 쓰면 아래 '실습 AI 도구' 개수를 자동으로 셉니다.
     [예시] 저술 수, 강의 경력은 실제 숫자로 바꿔 주세요. */
  stats: [
    { value: 15, unit: "주", label: "집중 과정" },
    { count: "tools", unit: "개", label: "실습 AI 도구" },
    { value: 3, unit: "권", label: "교수자 저술" },
    { value: 10, unit: "년", label: "강의 경력" }
  ],

  /* ---------- 프로그램 소개 ---------- */
  about: {
    eyebrow: "ABOUT",
    title: "프로그램 소개",
    lead: "AI와 함께 분자에서 행동까지, 신경계를 하나의 흐름으로 이해하는 강의입니다.",
    paragraphs: [
      "[예시] 본 교과목은 신경계의 구조와 기능을 세포·분자 수준에서부터 시스템 수준까지 체계적으로 다룹니다. 뉴런의 전기적 특성과 시냅스 전달의 원리를 이해하고, 이를 바탕으로 감각·운동·자율신경계의 작동 방식을 학습합니다.",
      "[예시] 매주 생성형 AI 도구를 활용해 개념을 정리하고, 논문을 요약·비교하며, 공개 데이터를 시각화하는 실습을 진행합니다. 후반부에는 학습과 기억, 신경 발달, 신경퇴행성 질환을 다루고 개인 탐구 프로젝트를 완성합니다."
    ],
    featuresTitle: "이 강의의 특징",
    // 좌우로 넘겨 보는 슬라이드 — 개수는 자유롭게 늘리거나 줄일 수 있습니다.
    features: [
      { icon: "🧠", title: "구조에서 기능까지", text: "신경계의 해부학적 구조와 생리학적 기능을 연결해 이해합니다." },
      { icon: "🤖", title: "AI와 함께 공부하기", text: "생성형 AI로 개념을 질문하고 정리하며 나만의 학습 노트를 만듭니다." },
      { icon: "📄", title: "논문 읽기 훈련", text: "AI 요약을 출발점 삼아 원문을 직접 확인하며 논문 읽는 법을 익힙니다." },
      { icon: "📊", title: "데이터 해석 실습", text: "공개 신경과학 데이터를 시각화하고 의미를 해석해 봅니다." },
      { icon: "🔬", title: "질환과 최신 연구", text: "신경계 질환의 기전과 최신 연구 기법을 의과학 관점에서 살펴봅니다." },
      { icon: "🎯", title: "탐구 프로젝트", text: "학기 말에 관심 주제를 정해 AI를 활용한 탐구 결과물을 발표합니다." }
    ],

    // 프로그램 소개 하단 인포그래픽 — 사이트에 이미 있는 내용을 한 장으로 요약
    // (15주 흐름의 from~to 는 주차 번호, 평가 구성은 '수강 안내'의 평가 방법에서 자동으로 가져옴)
    infographic: {
      title: "한눈에 보는 「신경과학」",
      inputsTitle: "활용하는 것",
      inputs: [
        { icon: "🤖", title: "생성형 AI", text: "ChatGPT · Claude · Gemini · NotebookLM · Perplexity · Elicit" },
        { icon: "📖", title: "교재와 논문", text: "신경과학 교재 · 감각계·기억·질환 관련 논문" },
        { icon: "📊", title: "공개 데이터", text: "공개 신경과학 데이터셋 · 신경영상 데이터" }
      ],
      outputsTitle: "만드는 것",
      outputs: [
        { icon: "📝", title: "개념 노트" },
        { icon: "📄", title: "논문 요약" },
        { icon: "📈", title: "데이터 시각화" },
        { icon: "🎯", title: "탐구 프로젝트" }
      ],
      stepsTitle: "학습 과정",
      steps: [
        { icon: "🧠", title: "개념 이해", text: "구조와 기능을 연결" },
        { icon: "🤖", title: "AI로 정리", text: "질문하고 노트 만들기" },
        { icon: "📄", title: "논문 읽기", text: "AI 요약 → 원문 확인" },
        { icon: "📊", title: "데이터 해석", text: "공개 데이터 시각화" },
        { icon: "🎯", title: "탐구 발표", text: "관심 주제 프로젝트" }
      ],
      flowTitle: "15주 학습 흐름",
      phases: [
        { from: 1, to: 5, title: "신경 신호의 기초", text: "뉴런 · 막전위 · 시냅스 · 신경전달물질" },
        { from: 6, to: 7, title: "감각계", text: "체감각 · 통증 · 시각 · 청각" },
        { from: 8, to: 8, title: "중간고사", text: "1–7주 평가" },
        { from: 9, to: 10, title: "운동과 항상성", text: "운동계 · 자율신경계 · 시상하부" },
        { from: 11, to: 14, title: "고위 기능과 연구", text: "기억 · 발달 · 질환 · 연구 기법" },
        { from: 15, to: 15, title: "기말고사", text: "9–14주 평가" }
      ],
      evalTitle: "평가 구성"
    }
  },

  /* ---------- 커리큘럼 (15주) ----------
     · 첫 수업일(firstClass)만 정하면 15주 날짜가 7일 간격으로 자동 계산됩니다.
     · 한 주만 날짜·시간·장소가 다르면 그 주차에 date / time / place 를 넣어 덮어쓰세요.
       예) { week: 10, date: "2026-05-07", ... }
     · 과제가 있는 주에는 assignment 를 넣으면 과제 상자·마감 카운트다운·제출 버튼이 생깁니다.
       due 는 "연-월-일T시:분" 형식, submitUrl 을 비워 두면 제출 버튼은 '준비 중'으로 보입니다.
     [예시] 주차 내용·과제·영상은 강의계획서에 맞게 바꿔 주세요. */
  curriculum: {
    eyebrow: "CURRICULUM",
    title: "커리큘럼",
    lead: "주차를 누르면 날짜·장소·학습 내용·과제를 볼 수 있습니다.",
    schedule: {
      firstClass: "2026-03-03", // 첫 수업일 (이 요일이 매주 수업 요일이 됩니다)
      time: "13:00 – 15:00",
      place: "의과대학 문숙의학관 703호"
    },
    // 공휴일 — 수업일과 겹치면 커리큘럼·달력에 경고가 표시됩니다. [확인 필요] 실제 학사력과 대조하세요.
    holidays: [
      { date: "2026-03-01", name: "삼일절" },
      { date: "2026-03-02", name: "대체공휴일" },
      { date: "2026-05-05", name: "어린이날" },
      { date: "2026-05-24", name: "부처님오신날" },
      { date: "2026-05-25", name: "대체공휴일" },
      { date: "2026-06-03", name: "전국동시지방선거" },
      { date: "2026-06-06", name: "현충일" }
    ],
    // 달력 일정 — 종류(type): 휴강 · 보강 · 특강 · 시험 · 행사 · 기타
    // '휴강'을 수업일에 넣으면 커리큘럼 목록에도 휴강 표시가 붙습니다.
    events: [
      { date: "2026-05-05", type: "휴강", title: "[예시] 어린이날 휴강", text: "보강 일정은 추후 공지합니다." }
    ],
    // 논문 발표 배정표 (저널클럽) — 해당 주차 목록에도 함께 표시됩니다.
    journalClub: [
      { week: 4, presenter: "[예시] 발표자 A", paper: "[예시] 시냅스 전달 관련 논문", link: "" },
      { week: 6, presenter: "[예시] 발표자 B", paper: "[예시] 통증 조절 회로 관련 논문", link: "" }
    ],
    weeks: [
      {
        week: 1, title: "신경과학 개요", text: "신경계의 구성과 신경과학 연구의 역사",
        topics: ["중추신경계와 말초신경계의 구성", "신경과학 연구의 역사와 주요 발견", "수업에서 쓰는 AI 도구 계정 만들기와 기본 사용법"],
        videos: [{ title: "[예시] 신경과학 입문 영상 검색", url: "https://www.youtube.com/results?search_query=introduction+to+neuroscience" }],
        // 주차별 자료실 — 강의 슬라이드·논문 PDF·데이터셋 등 (구글 드라이브·LMS 주소)
        resources: [{ title: "[예시] 1주차 강의 슬라이드", url: "" }, { title: "[예시] 강의계획서", url: "" }]
      },
      {
        week: 2, title: "뉴런과 신경교세포", text: "신경세포의 구조와 신경교세포의 역할",
        topics: ["뉴런의 구조: 세포체·수상돌기·축삭", "신경교세포의 종류와 기능", "혈뇌장벽"],
        videos: [{ title: "[예시] 뉴런 구조 영상 검색", url: "https://www.youtube.com/results?search_query=neuron+structure" }]
      },
      {
        week: 3, title: "막전위와 활동전위", text: "이온 채널, 안정막전위, 활동전위의 발생과 전도",
        topics: ["이온 채널과 안정막전위", "활동전위의 발생과 불응기", "도약 전도와 수초"],
        videos: [{ title: "[예시] 활동전위 영상 검색", url: "https://www.youtube.com/results?search_query=action+potential" }],
        assignment: {
          title: "활동전위 AI 개념 노트",
          text: "ChatGPT 또는 Claude와 대화하며 활동전위의 발생 과정을 정리하고, AI 답변 중 교재와 다른 부분을 찾아 표시해 제출하세요.",
          due: "2026-03-23T23:59",
          submitUrl: ""
        }
      },
      {
        week: 4, title: "시냅스 전달", text: "화학적·전기적 시냅스와 신경전달물질의 방출",
        topics: ["화학적 시냅스와 전기적 시냅스", "신경전달물질의 방출과 재흡수", "흥분성·억제성 시냅스후 전위"],
        videos: [{ title: "[예시] 시냅스 전달 영상 검색", url: "https://www.youtube.com/results?search_query=synaptic+transmission" }]
      },
      {
        week: 5, title: "신경전달물질과 수용체", text: "주요 신경전달물질 체계와 신경약리학의 기초",
        topics: ["글루탐산·GABA·아세틸콜린", "모노아민 계열 신경전달물질", "이온성·대사성 수용체"],
        videos: [{ title: "[예시] 신경전달물질 영상 검색", url: "https://www.youtube.com/results?search_query=neurotransmitters+receptors" }]
      },
      {
        week: 6, title: "감각계 I", text: "체감각과 통증의 전달 경로",
        topics: ["체감각 수용기", "척수 시상로와 후주 내측모대 경로", "통증의 조절"],
        videos: [{ title: "[예시] 체감각 경로 영상 검색", url: "https://www.youtube.com/results?search_query=somatosensory+pathway" }],
        assignment: {
          title: "신경과학 논문 요약",
          text: "감각계 관련 논문 한 편을 골라 AI 요약과 원문을 비교하고, 핵심 결과와 한계를 한 쪽으로 정리해 제출하세요.",
          due: "2026-04-13T23:59",
          submitUrl: ""
        }
      },
      {
        week: 7, title: "감각계 II", text: "시각과 청각 정보의 처리",
        topics: ["망막과 시각 경로", "시각피질의 정보 처리", "청각 경로와 소리의 부호화"],
        videos: [{ title: "[예시] 시각 경로 영상 검색", url: "https://www.youtube.com/results?search_query=visual+pathway+neuroscience" }]
      },
      { week: 8, title: "중간고사", text: "1–7주 학습 내용 평가", exam: true, topics: ["1–7주 학습 내용 평가"] },
      {
        week: 9, title: "운동계", text: "척수 반사, 운동피질, 기저핵과 소뇌",
        topics: ["척수 반사", "일차운동피질과 운동 계획", "기저핵과 소뇌의 역할"],
        videos: [{ title: "[예시] 운동계 영상 검색", url: "https://www.youtube.com/results?search_query=motor+system+basal+ganglia+cerebellum" }]
      },
      {
        week: 10, title: "자율신경계와 시상하부", text: "항상성 조절과 신경내분비계",
        topics: ["교감·부교감 신경계", "시상하부와 항상성", "신경내분비 조절"],
        videos: [{ title: "[예시] 자율신경계 영상 검색", url: "https://www.youtube.com/results?search_query=autonomic+nervous+system" }]
      },
      {
        week: 11, title: "학습과 기억", text: "해마와 시냅스 가소성(LTP·LTD)",
        topics: ["기억의 종류", "해마와 기억 형성", "장기강화(LTP)와 장기약화(LTD)"],
        videos: [{ title: "[예시] 장기강화 영상 검색", url: "https://www.youtube.com/results?search_query=long+term+potentiation" }],
        assignment: {
          title: "공개 데이터 시각화 실습",
          text: "공개 신경과학 데이터셋 하나를 골라 AI 도구의 도움을 받아 그래프로 시각화하고, 그래프가 보여 주는 의미를 해석해 제출하세요.",
          due: "2026-05-18T23:59",
          submitUrl: ""
        }
      },
      {
        week: 12, title: "신경 발달과 재생", text: "신경 회로의 형성과 손상 후 재생",
        topics: ["신경관 형성과 신경세포의 이동", "축삭 유도와 시냅스 형성", "손상 후 재생과 가소성"],
        videos: [{ title: "[예시] 신경 발달 영상 검색", url: "https://www.youtube.com/results?search_query=neural+development" }]
      },
      {
        week: 13, title: "신경계 질환", text: "알츠하이머병·파킨슨병 등 신경퇴행성 질환의 기전",
        topics: ["알츠하이머병의 병리와 기전", "파킨슨병과 도파민 신경세포", "치료 연구의 현재"],
        videos: [{ title: "[예시] 신경퇴행성 질환 영상 검색", url: "https://www.youtube.com/results?search_query=neurodegenerative+disease+mechanism" }]
      },
      {
        week: 14, title: "신경과학 연구 기법", text: "신경영상, 전기생리학, 광유전학 등 최신 기법",
        topics: ["fMRI·PET 등 신경영상", "전기생리학 기록", "광유전학과 화학유전학"],
        videos: [{ title: "[예시] 광유전학 영상 검색", url: "https://www.youtube.com/results?search_query=optogenetics" }],
        assignment: {
          title: "탐구 프로젝트 최종 보고서",
          text: "학기 동안 진행한 신경과학 탐구 프로젝트의 최종 보고서와 발표 자료를 제출하세요.",
          due: "2026-06-08T23:59",
          submitUrl: ""
        }
      },
      { week: 15, title: "기말고사", text: "9–14주 학습 내용 평가", exam: true, topics: ["9–14주 학습 내용 평가"] }
    ]
  },

  /* ---------- 우수 과제 포트폴리오 ----------
     과제물은 구글 드라이브 주소로만 등록합니다. 드라이브에서 파일 공유를
     '링크가 있는 모든 사용자 – 뷰어'로 바꿔야 방문자가 볼 수 있습니다.
     sample: true 인 항목은 가짜 주소라 '열기' 버튼이 막혀 있습니다. */
  portfolio: {
    eyebrow: "PORTFOLIO",
    title: "우수 과제 포트폴리오",
    lead: "수강생들이 AI와 함께 만든 우수 과제물을 소개합니다.",
    notice: "학생 이름은 본인 동의를 받은 경우에만 공개합니다.",
    categories: ["개념 노트", "논문 요약", "데이터 시각화", "탐구 프로젝트"],
    items: [
      {
        driveUrl: "https://drive.google.com/file/d/SAMPLE-1/view",
        title: "[샘플] 활동전위 AI 개념 노트", student: "수강생 A", term: "2026 상반기 · 3주차 과제",
        category: "개념 노트", description: "AI 답변과 교재를 비교하며 활동전위 발생 과정을 정리한 노트", sample: true
      },
      {
        driveUrl: "https://drive.google.com/file/d/SAMPLE-2/view",
        title: "[샘플] 해마 LTP 논문 요약", student: "수강생 B", term: "2026 상반기 · 6주차 과제",
        category: "논문 요약", description: "장기강화(LTP) 관련 논문의 핵심 결과와 한계를 한 쪽으로 정리", sample: true
      },
      {
        driveUrl: "https://drive.google.com/file/d/SAMPLE-3/view",
        title: "[샘플] 뇌 영역별 활성 데이터 시각화", student: "수강생 C", term: "2026 상반기 · 11주차 과제",
        category: "데이터 시각화", description: "공개 fMRI 데이터를 그래프로 시각화하고 의미를 해석", sample: true
      }
    ]
  },

  /* ---------- 수강 안내 ---------- */
  guide: {
    eyebrow: "GUIDE",
    title: "수강 안내",
    lead: "실습 도구, 평가 방법, 준비물을 확인해 주세요.",
    items: [
      { icon: "🎓", title: "수강 대상", text: "의과학과 대학원생" },
      { icon: "📚", title: "선수 과목", text: "[예시] 일반생물학, 세포생물학 수강을 권장합니다." },
      { icon: "📖", title: "교재", text: "[예시] Neuroscience: Exploring the Brain (Bear, Connors, Paradiso)" },
      { icon: "💻", title: "수업 방식", text: "[예시] 이론 강의와 AI 실습을 병행합니다." }
    ],

    // 실습에 쓰는 AI 도구 — [예시] 실제로 쓰는 도구로 바꿔 주세요. (개수는 통계 카드에 자동 반영)
    toolsTitle: "실습에 쓰는 AI 도구",
    tools: [
      { name: "ChatGPT", use: "개념 질문과 설명, 학습 노트 정리" },
      { name: "Claude", use: "긴 논문·자료 요약과 비교" },
      { name: "Gemini", use: "그림·도식 해석과 자료 검색" },
      { name: "NotebookLM", use: "강의 자료 기반 질의응답과 복습" },
      { name: "Perplexity", use: "출처가 달린 최신 연구 동향 검색" },
      { name: "Elicit", use: "논문 검색과 핵심 결과 추출" }
    ],

    evaluationTitle: "평가 방법",
    evaluation: [
      { label: "중간고사", percent: 30 },
      { label: "기말고사", percent: 30 },
      { label: "탐구 프로젝트", percent: 20 },
      { label: "출석", percent: 10 },
      { label: "수업 참여", percent: 10 }
    ],

    // 수강 준비물 — [예시]
    materialsTitle: "수강 준비물",
    materials: [
      "노트북 (매 수업 실습에 사용)",
      "Google 계정 (Gemini · NotebookLM 사용)",
      "ChatGPT 또는 Claude 무료 계정",
      "교재 (도서관 대출 가능)"
    ]
  },

  /* ---------- 참여하기: 투표 · 수강 신청서 ----------
     ※ 서버가 없는 사이트라서 투표와 신청서는 '이 브라우저'에만 저장됩니다. (시범 운영)
       신청서를 실제로 받으려면 apply.endpoint 에 받을 주소(예: 구글 Apps Script 웹앱 주소)를 넣으세요. */
  join: {
    eyebrow: "JOIN",
    title: "참여하기",
    lead: "여러분의 의견을 들려주고, 수강 신청서를 작성해 주세요.",
    notice: "지금은 시범 운영 중이라 투표와 신청서가 이 기기(브라우저)에만 저장됩니다.",
    // 설문 목록 — 관리자 모드에서 본문의 '+ 설문 추가'로 만들고, 설문 히스토리 표에서 수정·삭제합니다.
    // status: "open"(진행 중) / "closed"(마감 — 결과만 보기)
    polls: [
      {
        id: "p1",
        question: "가장 먼저 배우고 싶은 주제는?",
        hint: "하나를 골라 주세요. 다시 눌러 바꿀 수 있습니다.",
        options: [
          "AI로 신경계 핵심 개념 정리하기",
          "신경과학 논문 읽기와 요약",
          "신경과학 데이터 시각화",
          "뇌질환 최신 연구 탐구"
        ],
        author: "관리자",
        createdAt: "2026-03-02T09:00",
        status: "open"
      },
      // 수업 만족도 설문 — "draft"(준비 중)는 방문자에게 보이지 않습니다. 쓸 때 수정에서 '진행 중'으로 바꾸세요.
      {
        id: "mid-survey",
        question: "[중간 강의 평가] 지금까지의 수업 진행 속도는 어떤가요?",
        hint: "솔직한 의견이 수업 개선에 도움이 됩니다.",
        options: ["너무 빠르다", "조금 빠르다", "적당하다", "조금 느리다", "너무 느리다"],
        author: "관리자",
        createdAt: "2026-04-20T09:00",
        status: "draft"
      },
      {
        id: "final-survey",
        question: "[기말 강의 평가] 이 강의에 전반적으로 만족하시나요?",
        hint: "하나를 골라 주세요.",
        options: ["매우 만족", "만족", "보통", "불만족", "매우 불만족"],
        author: "관리자",
        createdAt: "2026-06-08T09:00",
        status: "draft"
      }
    ],
    apply: {
      title: "수강 신청서",
      endpoint: "", // 비워 두면 이 브라우저에만 저장
      submitLabel: "신청서 제출",
      doneMessage: "신청서가 접수되었습니다. 확인 후 이메일로 안내드리겠습니다.",
      // 신청서 항목 — required: true 인 항목이 비어 있으면 제출 전에 알려 줍니다.
      fields: [
        { name: "name", label: "이름", type: "text", required: true, placeholder: "홍길동" },
        { name: "studentId", label: "학번", type: "text", required: true, placeholder: "숫자 10자리", pattern: "^\\d{10}$", patternMessage: "학번은 숫자 10자리로 입력해 주세요." },
        { name: "major", label: "소속 학과", type: "text", required: true, placeholder: "○○학과" },
        { name: "year", label: "과정", type: "select", required: true, options: ["석사과정", "박사과정", "석·박사통합과정", "기타"] },
        { name: "email", label: "이메일", type: "email", required: true, placeholder: "name@korea.ac.kr" },
        { name: "phone", label: "연락처", type: "tel", required: false, placeholder: "010-0000-0000" },
        { name: "motivation", label: "수강 동기", type: "textarea", required: true, placeholder: "이 강의를 듣고 싶은 이유를 적어 주세요.", wide: true },
        { name: "agree", label: "수강 신청을 위한 개인정보(이름·학번·연락처) 수집에 동의합니다.", type: "checkbox", required: true, wide: true }
      ]
    }
  },

  /* ---------- 내 강의실: 로그인 · 출석 · 과제 제출 ----------
     · 로그인: 학번 + 이름 + 수강 코드. 수강 코드는 지문(SHA-256 해시)으로만 저장합니다.
       (config.js 는 누구나 열어 볼 수 있으므로 코드 원문은 여기에 적지 마세요. 5단계 관리자 모드에서 바꿀 수 있게 됩니다)
     · roster(수강생 명단)가 비어 있으면 수강 코드를 아는 누구나 로그인할 수 있습니다.
     · testMode: true 이면 수업일이 아니어도 출석 체크가 됩니다. 실제 운영 전에 false 로 바꾸세요.
     ※ 출석·과제 기록은 이 브라우저에만 남고, 과제 파일은 교수자에게 전송되지 않습니다. (시범 운영) */
  classroom: {
    eyebrow: "CLASSROOM",
    title: "내 강의실",
    lead: "로그인해서 출석을 체크하고 과제를 제출하세요.",
    notice: "지금은 시범 운영 중이라 출석·과제 기록이 이 기기(브라우저)에만 저장되고, 과제 파일은 교수자에게 전송되지 않습니다.",
    codeHash: "5e6a0724cc88e7e96f2a9b651e0cdfdeebe0b995e937ac073ffee75ad2f1381a",
    roster: [],
    testMode: true,
    maxFileMB: 20,
    // 출석 코드 — 관리자 화면 → 수강생 명단 탭에서 만듭니다. 비어 있으면 코드 없이 출석 버튼만 누르면 됩니다.
    // 값이 있으면 수업 중 화면에 띄운 4자리 코드(1분마다 바뀜)나 QR로만 출석할 수 있습니다.
    attendanceSecret: ""
  },

  /* ---------- 구글 시트 연동 (서버 없이 기록 모으기) ----------
     README 의 '구글 시트 연동' 순서대로 Apps Script 웹 앱을 만들고, 그 주소를 endpoint 에 넣으세요.
     넣으면 신청서·출석·과제 제출(파일은 구글 드라이브 폴더에 저장)·설문 응답이 시트로 모입니다.
     비워 두면 지금처럼 이 브라우저에만 저장됩니다. */
  sheets: {
    endpoint: ""
  },

  /* ---------- 첫 방문 안내 팝업 ---------- */
  popup: {
    enabled: true,
    delaySeconds: 2, // 접속 후 몇 초 뒤에 띄울지
    badge: "수강 신청 안내",
    title: "2026 상반기 수강 신청을 받고 있습니다",
    text: "[예시] 신청 기간과 방법을 이곳에 적어 주세요. 정원이 차면 조기 마감될 수 있습니다.",
    buttonLabel: "수강 신청하러 가기",
    buttonHref: "#apply"
  },

  /* ---------- 첫 방문 폭죽 ---------- */
  welcome: {
    confetti: true // 처음 방문한 사람에게 한 번 폭죽 효과 (주소 끝에 ?welcome 을 붙이면 다시 볼 수 있음)
  },

  /* ---------- 공지사항 (첫 화면 아래에 표시 · 관리자 화면의 '공지' 탭에서 관리) ---------- */
  notices: [
    { date: "2026-03-02", title: "[예시] 첫 수업 안내", text: "첫 수업에서 AI 도구 계정을 함께 만듭니다. 노트북을 꼭 가져와 주세요.", pinned: true }
  ],

  /* ---------- 관리자 ----------
     비밀번호 자체는 저장하지 않고 지문(SHA-256)만 넣습니다.
     비어 있으면 자물쇠를 처음 누를 때 비밀번호를 직접 만듭니다.
     잊어버렸으면 이 값을 "" 로 비우고 다시 올린 뒤 자물쇠를 눌러 새로 만드세요. */
  admin: {
    passwordHash: ""
  },

  /* ---------- 자주 묻는 질문 ---------- */
  faq: {
    eyebrow: "FAQ",
    title: "자주 묻는 질문",
    lead: "궁금한 점을 눌러 확인하세요.",
    items: [
      { q: "생물학 배경지식이 부족해도 수강할 수 있나요?", a: "[예시] 초반 주차에서 필요한 세포생물학 기초를 함께 복습하므로 수강할 수 있습니다." },
      { q: "AI 도구를 써 본 적이 없어도 괜찮나요?", a: "[예시] 첫 주에 계정 만들기부터 기본 사용법까지 함께 실습합니다." },
      { q: "유료 AI 서비스를 결제해야 하나요?", a: "[예시] 아니요. 수업은 모두 무료 버전으로 진행할 수 있습니다." },
      { q: "강의 자료는 어디에서 받나요?", a: "[예시] 매주 수업 전에 학교 LMS에 강의 자료를 올립니다." },
      { q: "시험 범위는 어떻게 되나요?", a: "[예시] 중간고사는 1–7주, 기말고사는 9–14주 내용을 다룹니다." }
    ]
  },

  /* ---------- 교수자 (페이지 맨 끝 푸터에 표시) ---------- */
  instructor: {
    eyebrow: "INSTRUCTOR",
    title: "교수자",
    name: "○○○ 교수",
    affiliation: "고려대학교 의과대학 의과학과",
    photo: "", // 사진 경로 (예: "images/professor.jpg"). 비워 두면 기본 아이콘이 보입니다.
    bio: "[예시] 교수자 소개 문구를 입력해 주세요.",
    contacts: [
      { label: "email", value: "example@korea.ac.kr" },
      { label: "office", value: "[예시] 연구실 위치" },
      { label: "office hours", value: "[예시] 화요일 15:00 – 17:00" }
    ]
  },

  /* ---------- 푸터 ---------- */
  footer: {
    copyright: "Copyright 2026 ⓒ 고려대학교 의과학과 「신경과학」. All Rights Reserved."
  }
};
