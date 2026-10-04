/**
 * 「신경과학」 강의 사이트 → 구글 시트 기록 받기 (Google Apps Script)
 *
 * 사용법 (README 의 '구글 시트 연동' 참고)
 *  1. 구글 시트를 새로 만들고 → 확장 프로그램 → Apps Script
 *  2. 이 파일 내용을 모두 붙여 넣고 저장
 *  3. 배포 → 새 배포 → 유형: 웹 앱
 *     · 실행 사용자: 나   · 액세스 권한: 모든 사용자
 *  4. 나오는 '웹 앱 URL' 을 사이트 config.js 의 sheets.endpoint 에 넣기
 *
 * 받는 기록
 *  · 수강신청 / 출석 / 과제제출 / 설문응답  → 시트 탭별로 한 줄씩 쌓임
 *  · 과제 파일 → 내 구글 드라이브의 '강의 과제 제출' 폴더에 저장되고, 시트에 파일 주소가 남음
 */

var FOLDER_NAME = "강의 과제 제출";

// 시트에 보일 한글 열 이름
var LABELS = {
  id: "학번", studentId: "학번", name: "이름", week: "주차", at: "시각", title: "과제", file: "파일 이름",
  size: "크기(byte)", memo: "메모", late: "기한 후 제출", fileUrl: "파일 주소", major: "소속 학과", year: "과정",
  email: "이메일", phone: "연락처", motivation: "수강 동기", agree: "개인정보 동의", submittedAt: "제출 시각",
  pollId: "설문 ID", question: "설문", choice: "선택", sent: "전송"
};
var SHEETS = { application: "수강신청", attendance: "출석", submission: "과제제출", poll: "설문응답" };

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var body = JSON.parse(e.postData.contents);
    // 신청서 전용 주소(apply.endpoint)로 바로 보낸 경우에는 type 이 없음
    var type = body.type || "application";
    var data = body.type ? (body.data || {}) : body;

    if (type === "submission" && data.fileData) {
      data.fileUrl = saveFile(data);
      delete data.fileData;
    }
    delete data.sent;
    appendRow(SHEETS[type] || type, data);
    return ContentService.createTextOutput("ok");
  } catch (err) {
    return ContentService.createTextOutput("error: " + err);
  } finally {
    lock.releaseLock();
  }
}

// 브라우저에서 웹 앱 주소를 열었을 때 확인용
function doGet() {
  return ContentService.createTextOutput("강의 사이트 기록 받기: 정상 작동 중");
}

function saveFile(d) {
  var it = DriveApp.getFoldersByName(FOLDER_NAME);
  var folder = it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
  var f = d.fileData;
  var fileName = d.week + "주차_" + d.id + "_" + d.name + "_" + f.name;
  var blob = Utilities.newBlob(Utilities.base64Decode(f.base64), f.type || "application/octet-stream", fileName);
  return folder.createFile(blob).getUrl();
}

function appendRow(sheetName, obj) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
  var keys = Object.keys(obj);

  // 첫 줄(머리글)에 없는 항목은 오른쪽에 추가
  var header = sh.getLastRow() === 0 ? ["받은 시각"] : sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  keys.forEach(function (k) {
    var label = LABELS[k] || k;
    if (header.indexOf(label) === -1) header.push(label);
  });
  sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight("bold");

  var byLabel = {};
  keys.forEach(function (k) {
    var v = obj[k];
    if (v === true) v = "예";
    if (v === false) v = "";
    byLabel[LABELS[k] || k] = v;
  });
  var row = header.map(function (h) { return h === "받은 시각" ? new Date() : (byLabel[h] !== undefined ? byLabel[h] : ""); });
  sh.appendRow(row);
}
