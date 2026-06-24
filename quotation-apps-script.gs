/**
 * ════════════════════════════════════════════════════════════
 *  ProcureAI — Google Apps Script 後端
 *  版本：1.0
 * ════════════════════════════════════════════════════════════
 *
 *  【設定步驟】
 *  1. 開啟 https://script.google.com → 新增專案 → 貼上此程式碼
 *  2. 修改下方 CONFIG 的三個值
 *  3. 點「部署」→「新增部署」→ 類型：網路應用程式
 *       執行身分：我（你的 Google 帳號）
 *       存取權：所有人（包含匿名使用者）
 *  4. 第一次部署時會要求授權，點「授權存取」→ 允許
 *  5. 複製「部署網址」，貼到 HTML 的 BACKEND_URL 變數
 *
 * ════════════════════════════════════════════════════════════
 */

// ── 修改這裡 ──────────────────────────────────────
const CONFIG = {
  ADMIN_USER:      'AAA',
  ADMIN_PW:        '123',
  DRIVE_FOLDER_ID: '1XOQ5-lT6skQuzJwwarq2ppWdg0h-8DQK',
  MASTER_FILE_NAME: 'master_list.json',
  GEMINI_API_KEY:  'YOUR_GEMINI_API_KEY_HERE',  // ★ 只在 script.google.com 裡填入，絕對不要上傳到 GitHub
};
// ──────────────────────────────────────────────────
 
/**
 * 處理所有 GET/POST 請求
 */
function doPost(e) {
  // Apps Script Web App 自動處理 CORS，只要部署為「所有人可存取」即可
  // 如果仍有 CORS 問題，請確認：
  //   部署 → 執行身分：我  
  //   存取權：所有人（包含匿名使用者）
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;
 
    switch (action) {
      case 'login':       return respond(handleLogin(body));
      case 'loadMaster':  return respond(handleLoadMaster(body));
      case 'saveMaster':  return respond(handleSaveMaster(body));
      case 'uploadFile':  return respond(handleUploadFile(body));
      case 'saveReport':  return respond(handleSaveReport(body));
      case 'callGemini':     return respond(handleCallGemini(body));
      case 'generateExcel':    return respond(handleGenerateExcel(body));
      case 'saveCorrection':   return respond(handleSaveCorrection(body));
      case 'loadCorrections':  return respond(handleLoadCorrections(body));
      default:                 return respond({ ok: false, error: 'Unknown action' });
    }
  } catch (err) {
    return respond({ ok: false, error: err.message });
  }
}
 
function doGet(e) {
  // Health check
  return respond({ ok: true, msg: 'ProcureAI Backend running' });
}
 
// ── LOGIN ─────────────────────────────────────────
function handleLogin(body) {
  const { username, password } = body;
  if (username === CONFIG.ADMIN_USER && password === CONFIG.ADMIN_PW) {
    // 回傳一個 session token（簡易版：時間戳 hash）
    const token = Utilities.computeDigest(
      Utilities.DigestAlgorithm.MD5,
      username + password + CONFIG.ADMIN_PW + new Date().toDateString()
    ).map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2,'0')).join('');
    return { ok: true, role: 'admin', token };
  }
  return { ok: false, error: '帳號或密碼錯誤' };
}
 
// ── VERIFY TOKEN ──────────────────────────────────
function verifyToken(token) {
  const expected = Utilities.computeDigest(
    Utilities.DigestAlgorithm.MD5,
    CONFIG.ADMIN_USER + CONFIG.ADMIN_PW + CONFIG.ADMIN_PW + new Date().toDateString()
  ).map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2,'0')).join('');
  return token === expected;
}
 
// ── MASTER LIST ───────────────────────────────────
function handleLoadMaster(body) {
  // 任何人都可以讀取 master list（比價時需要）
  const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  const files  = folder.getFilesByName(CONFIG.MASTER_FILE_NAME);
  if (!files.hasNext()) {
    return { ok: true, data: [], msg: '主檔尚未建立' };
  }
  const file    = files.next();
  const content = file.getBlob().getDataAsString('utf-8');
  return { ok: true, data: JSON.parse(content) };
}
 
function handleSaveMaster(body) {
  if (!verifyToken(body.token)) return { ok: false, error: '未授權' };
  const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  const json   = JSON.stringify(body.data, null, 2);
  const files  = folder.getFilesByName(CONFIG.MASTER_FILE_NAME);
  if (files.hasNext()) {
    // 更新現有檔案
    const file = files.next();
    file.setContent(json);
    // 保留前一版備份
    const backup = folder.getFilesByName('master_list_backup.json');
    if (backup.hasNext()) backup.next().setTrashed(true);
    file.makeCopy('master_list_backup.json', folder);
  } else {
    // 第一次建立
    folder.createFile(CONFIG.MASTER_FILE_NAME, json, MimeType.PLAIN_TEXT);
  }
  return { ok: true, count: body.data.length };
}
 
// ── UPLOAD ORIGINAL FILE ──────────────────────────
function handleUploadFile(body) {
  if (!verifyToken(body.token)) return { ok: false, error: '未授權' };
  const { fileName, base64Data, mimeType } = body;
  const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
 
  // 建立子資料夾 /uploads/YYYY-MM/
  const ym     = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM');
  let   subFolder;
  const subs = folder.getFoldersByName('uploads');
  const uploadsFolder = subs.hasNext() ? subs.next() : folder.createFolder('uploads');
  const months = uploadsFolder.getFoldersByName(ym);
  subFolder = months.hasNext() ? months.next() : uploadsFolder.createFolder(ym);
 
  const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, fileName);
  const file = subFolder.createFile(blob);
  return { ok: true, fileId: file.getId(), fileName };
}
 
// ── SAVE REPORT JSON ──────────────────────────────
function handleSaveReport(body) {
  if (!verifyToken(body.token)) return { ok: false, error: '未授權' };
  const { reportId, reportData } = body;
  const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
 
  // 建立子資料夾 /reports/YYYY-MM/
  const ym = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM');
  const subs = folder.getFoldersByName('reports');
  const reportsFolder = subs.hasNext() ? subs.next() : folder.createFolder('reports');
  const months = reportsFolder.getFoldersByName(ym);
  const subFolder = months.hasNext() ? months.next() : reportsFolder.createFolder(ym);
 
  const json = JSON.stringify(reportData, null, 2);
  subFolder.createFile(reportId + '.json', json, MimeType.PLAIN_TEXT);
  return { ok: true, reportId };
}
 
// ── GEMINI API PROXY ──────────────────────────────
// 前端把 prompt + 檔案 base64 傳來，後端用 CONFIG 裡的 Key 呼叫 Gemini
// Key 永遠不會傳到前端
function handleCallGemini(body) {
  const { prompt, base64Data, mimeType } = body;
  // 不需要驗證 token，任何人都可以使用比價功能
  const key = CONFIG.GEMINI_API_KEY;
  if (!key || key === 'YOUR_GEMINI_KEY') {
    return { ok: false, error: 'Gemini API Key 尚未設定，請在 Apps Script CONFIG.GEMINI_API_KEY 填入' };
  }
 
  const parts = (base64Data && mimeType)
    ? [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64Data } }]
    : [{ text: prompt }];

  const payload = JSON.stringify({ contents: [{ parts }] });
  const fetchOptions = {
    method: 'post',
    contentType: 'application/json',
    payload: payload,
    muteHttpExceptions: true
  };

  // 模型優先順序：2.5 Flash → 1.5 Flash → 2.0 Flash
  const MODELS = [
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-2.0-flash'
  ];

  let response, code, usedModel;
  for (let m = 0; m < MODELS.length; m++) {
    usedModel = MODELS[m];
    const url = `https://generativelanguage.googleapis.com/v1/models/${usedModel}:generateContent?key=${key}`;
    // 每個模型最多重試 2 次
    for (let attempt = 1; attempt <= 2; attempt++) {
      response = UrlFetchApp.fetch(url, fetchOptions);
      code = response.getResponseCode();
      if (code !== 429 && code !== 503) break;
      if (attempt < 2) Utilities.sleep(3000);
    }
    // 200 或 400/401/403（這些不是過載，換模型也沒用）就停止
    if (code === 200 || code === 400 || code === 401 || code === 403) break;
    // 仍是 429/503 → 試下一個模型
    if (m < MODELS.length - 1) Utilities.sleep(2000);
  }

  if (code !== 200) {
    const errText = response.getContentText();
    if (code === 429) return { ok: false, error: 'Gemini 請求次數超限（429）：免費版每分鐘上限 10 次、每日 250 次。請稍後再試或升級配額。' };
    if (code === 503) return { ok: false, error: 'Gemini 所有模型目前過載（503），這是 Google 暫時性問題，請等 5 分鐘後重試。' };
    return { ok: false, error: `Gemini API 錯誤 ${code}: ${errText.slice(0, 200)}` };
  }
 
  const result = JSON.parse(response.getContentText());
  const candidate = result.candidates?.[0];

  // 安全過濾或 token 超限
  if (!candidate || !candidate.content) {
    const reason = candidate?.finishReason || 'UNKNOWN';
    if (reason === 'SAFETY') return { ok: false, error: '內容被 Gemini 安全過濾攔截，請確認上傳檔案內容合規' };
    if (reason === 'MAX_TOKENS') return { ok: false, error: 'Gemini Token 超限，報價單或主檔資料過大，請縮短內容再試' };
    return { ok: false, error: `Gemini 未回傳內容（${reason}），請重試` };
  }

  const text = candidate.content.parts?.[0]?.text || '';
  if (!text.trim()) return { ok: false, error: 'Gemini 回傳空白內容，請重試' };
  return { ok: true, text };
}
 
 
 
// ── CORRECTIONS ───────────────────────────────────
function handleSaveCorrection(body) {
  // 不需要管理員 token，任何人都可以回報錯誤
  const { correction } = body;
  const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  const files  = folder.getFilesByName('corrections.json');
  let corrections = [];
  if (files.hasNext()) {
    corrections = JSON.parse(files.next().getBlob().getDataAsString('utf-8'));
  }
  corrections.push(correction);
  // 重新寫入
  const corrFiles = folder.getFilesByName('corrections.json');
  if (corrFiles.hasNext()) corrFiles.next().setContent(JSON.stringify(corrections, null, 2));
  else folder.createFile('corrections.json', JSON.stringify(corrections, null, 2), MimeType.PLAIN_TEXT);
  return { ok: true, total: corrections.length };
}
 
function handleLoadCorrections(body) {
  // 依 category 過濾，common 永遠帶入
  const { category } = body;
  const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  const files  = folder.getFilesByName('corrections.json');
  if (!files.hasNext()) return { ok: true, data: [] };
  const all = JSON.parse(files.next().getBlob().getDataAsString('utf-8'));
  const filtered = category === 'all'
    ? all
    : all.filter(c => !c.category || c.category === category || c.category === 'common');
  // 最近 30 筆
  return { ok: true, data: filtered.slice(-30) };
}
 
// ── GENERATE EXCEL REPORT ─────────────────────────
function handleGenerateExcel(body) {
  const { reportId, vendor, project, date, items } = body;
  // 不需要驗證 token，任何人都可以匯出報告
 
  // ── 建立 Spreadsheet ──
  const folder   = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  const ym       = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM');
  const rptSubs  = folder.getFoldersByName('reports');
  const rptFolder = rptSubs.hasNext() ? rptSubs.next() : folder.createFolder('reports');
  const mSubs    = rptFolder.getFoldersByName(ym);
  const mFolder  = mSubs.hasNext() ? mSubs.next() : rptFolder.createFolder(ym);
 
  const ss   = SpreadsheetApp.create(reportId);
  const sheet = ss.getActiveSheet();
  sheet.setName('比價報告');
 
  // ── 色票 ──
  const COL = {
    header:  '#0A2A36',  // 深藍綠
    cyan:    '#81D8CF',  // 蒂芬妮藍
    green:   '#4ECDC4',
    red:     '#FF6B6B',
    purple:  '#B8A9FF',
    amber:   '#FFD166',
    gray:    '#8A9BA8',
    white:   '#E8F8F6',
    rowOdd:  '#F0FAFA',
    rowEven: '#FFFFFF',
    secBg:   '#D9F2F0',
    totBg:   '#B2E8E4',
  };
 
  // ── 標題區 ──
  sheet.getRange('A1:I1').merge().setValue('AI 比價分析報告')
    .setBackground(COL.header).setFontColor(COL.cyan)
    .setFontSize(16).setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.setRowHeight(1, 40);
 
  sheet.getRange('A2').setValue('廠商').setFontWeight('bold').setFontColor(COL.header);
  sheet.getRange('B2').setValue(vendor);
  sheet.getRange('D2').setValue('工程名稱').setFontWeight('bold').setFontColor(COL.header);
  sheet.getRange('E2:G2').merge().setValue(project);
  sheet.getRange('H2').setValue('分析日期').setFontWeight('bold').setFontColor(COL.header);
  sheet.getRange('I2').setValue(date);
  sheet.getRange('A3').setValue('報告編號').setFontWeight('bold').setFontColor(COL.header);
  sheet.getRange('B3:C3').merge().setValue(reportId);
  sheet.getRange('A2:I3').setBackground('#EBF8F7');
 
  // ── 表頭 ──
  const HEADERS = ['品項規格（廠商原文）','單位','數量','廠商單價(฿)','報價小計(฿)','歷史最低價/工費預估(฿)','差異幅度','比對品項','燈號'];
  const COLS    = ['A','B','C','D','E','F','G','H','I'];
  const hRow    = 5;
  HEADERS.forEach((h, i) => {
    const cell = sheet.getRange(COLS[i] + hRow);
    cell.setValue(h).setBackground(COL.header).setFontColor(COL.cyan)
      .setFontWeight('bold').setFontSize(10).setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
      .setHorizontalAlignment(i <= 0 ? 'left' : 'center').setVerticalAlignment('middle');
  });
  sheet.setRowHeight(hRow, 36);
 
  // ── 資料列 ──
  let row = hRow + 1;
  const catLabels = { material:'配管材料', labor:'工費', package:'整包項目', other:'其他' };
  const cats = {};
  items.forEach(it => { const c = it.category || 'other'; (cats[c] = cats[c] || []).push(it); });
 
  Object.entries(cats).forEach(([cat, catItems]) => {
    // 類別標題列
    sheet.getRange(`A${row}:I${row}`).merge()
      .setValue('▸  ' + (catLabels[cat] || cat))
      .setBackground(COL.secBg).setFontColor(COL.header)
      .setFontWeight('bold').setFontSize(10);
    sheet.setRowHeight(row, 24);
    row++;
 
    catItems.forEach((it, idx) => {
      const isOdd = idx % 2 === 0;
      const bg    = isOdd ? COL.rowOdd : COL.rowEven;
      const sub   = it.subtotal != null ? it.subtotal : (it.qty ? it.unitPrice * it.qty : null);
 
      // 差異計算
      let diffVal = null, diffStr = '—';
      if (it.flag === 'labor_package' && it._est != null) {
        diffVal = (it.unitPrice - it._est) / it._est * 100;
        diffStr = (diffVal >= 0 ? '+' : '') + diffVal.toFixed(1) + '%';
      } else if (it.masterLowestPrice) {
        diffVal = (it.unitPrice - it.masterLowestPrice) / it.masterLowestPrice * 100;
        diffStr = (diffVal >= 0 ? '+' : '') + diffVal.toFixed(1) + '%';
      }
 
      // 燈號文字
      let flag = '—';
      if (it.flag === 'normal')        flag = '🟢 正常';
      else if (it.flag === 'high')     flag = '🔴 偏高';
      else if (it.flag === 'low')      flag = '🟣 偏低';
      else if (it.flag === 'pending')  flag = '🟠 待確認';
      else if (it.flag === 'no_basis') flag = '⚪ 無基準';
      else if (it.flag === 'labor_package') {
        if (it._est == null) flag = '🟡 工費/整包';
        else if (Math.abs((it.unitPrice - it._est) / it._est) <= 0.1) flag = '🟢 工費正常';
        else if (it.unitPrice > it._est * 1.1) flag = '🔴 工費偏高';
        else flag = '🟣 工費偏低';
      }
 
      // 基準價
      let basePrice = '';
      if (it.flag === 'labor_package' && it._est != null) basePrice = it._est;
      else if (it.masterLowestPrice) basePrice = it.masterLowestPrice;
 
      const rowData = [
        it.spec,
        it.unit || '—',
        it.qty != null ? it.qty : '—',
        it.unitPrice,
        sub != null ? sub : '—',
        basePrice || '—',
        diffStr,
        it.masterSpec || (it.flag === 'labor_package' ? '工費預估' : '—'),
        flag
      ];
 
      rowData.forEach((val, ci) => {
        const cell = sheet.getRange(COLS[ci] + row);
        cell.setValue(val).setBackground(bg).setFontSize(10).setVerticalAlignment('middle');
        if (ci === 0) cell.setHorizontalAlignment('left').setWrap(true);
        else cell.setHorizontalAlignment('center');
        // 差異顏色
        if (ci === 6 && diffVal !== null) {
          cell.setFontColor(diffVal > 10 ? COL.red : diffVal < -10 ? COL.purple : COL.green)
            .setFontWeight('bold');
        }
        // 數字格式
        if ([3,4,5].includes(ci) && typeof val === 'number') {
          cell.setNumberFormat('#,##0.00');
        }
      });
      sheet.setRowHeight(row, 22);
      row++;
    });
  });
 
  // ── 總計列 ──
  const totalQ = items.reduce((s, it) => s + (it.subtotal ?? it.unitPrice * (it.qty ?? 1)), 0);
  let totalS = 0, canSave = 0;
  items.forEach(it => {
    const sub = it.subtotal ?? it.unitPrice * (it.qty ?? 1);
    if (it.flag === 'labor_package' && it._est != null) { totalS += it._est; if (it.unitPrice > it._est * 1.1) canSave += (it.unitPrice - it._est); }
    else if (it.flag === 'high' && it.masterLowestPrice) { totalS += it.masterLowestPrice * (it.qty ?? 1); canSave += (it.unitPrice - it.masterLowestPrice) * (it.qty ?? 1); }
    else totalS += sub;
  });
 
  sheet.getRange(`A${row}:C${row}`).merge().setValue('報價總計')
    .setBackground(COL.totBg).setFontWeight('bold').setFontColor(COL.header).setFontSize(11);
  sheet.getRange(`D${row}`).setValue('廠商總價 (฿)').setBackground(COL.totBg).setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange(`E${row}`).setValue(totalQ).setBackground(COL.totBg).setFontWeight('bold')
    .setNumberFormat('#,##0.00').setHorizontalAlignment('center').setFontColor('#CC0000');
  sheet.getRange(`F${row}`).setValue('建議目標價 (฿)').setBackground(COL.totBg).setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange(`G${row}`).setValue(totalS).setBackground(COL.totBg).setFontWeight('bold')
    .setNumberFormat('#,##0.00').setHorizontalAlignment('center').setFontColor('#006B5E');
  sheet.getRange(`H${row}`).setValue('可節省 (฿)').setBackground(COL.totBg).setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange(`I${row}`).setValue(canSave).setBackground(COL.totBg).setFontWeight('bold')
    .setNumberFormat('#,##0.00').setHorizontalAlignment('center').setFontColor('#CC0000');
  sheet.setRowHeight(row, 32);
 
  // ── 欄寬 ──
  sheet.setColumnWidth(1, 280);
  [2,3,9].forEach(c => sheet.setColumnWidth(c, 70));
  [4,5,6].forEach(c => sheet.setColumnWidth(c, 110));
  sheet.setColumnWidth(7, 80);
  sheet.setColumnWidth(8, 180);
 
  // ── 框線 ──
  const dataRange = sheet.getRange(hRow, 1, row - hRow + 1, 9);
  dataRange.setBorder(true, true, true, true, true, true,
    COL.header, SpreadsheetApp.BorderStyle.SOLID);
 
  // ── 移至 Drive 資料夾 ──
  const ssFile = DriveApp.getFileById(ss.getId());
  mFolder.addFile(ssFile);
  DriveApp.getRootFolder().removeFile(ssFile);
 
  // ── 匯出為 xlsx 並回傳 base64 ──
  const exportUrl = `https://docs.google.com/spreadsheets/d/${ss.getId()}/export?format=xlsx`;
  const token     = ScriptApp.getOAuthToken();
  const response  = UrlFetchApp.fetch(exportUrl, {
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true
  });
  const xlsxBytes = response.getContent();
  const base64    = Utilities.base64Encode(xlsxBytes);
 
  return { ok: true, base64, sheetUrl: ss.getUrl(), reportId };
}
 
// ── HELPER ────────────────────────────────────────
function respond(data) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}
 
// Apps Script Web App 處理 CORS preflight
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}
 