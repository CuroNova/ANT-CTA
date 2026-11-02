if (sessionStorage.getItem('just_logged_in') !== 'true') {
  window.location.href = '/login';
} else {
  sessionStorage.removeItem('just_logged_in');
}

const socket = io();
let currentData = { slots: [], guilds: [], isParty3Disabled: false };
let activeTabLabel = '';

// 📌 주신 데이터를 완벽하게 반영한 안전한 DA 매핑 함수 (20명 이하 0, 21명부터 정확한 값 매핑)
function calculateDisarray(playerCount) {
  if (playerCount <= 20) return 0;

  const daTable = {
    21: 1, 22: 2, 23: 2, 24: 2, 25: 2, 26: 3, 27: 3, 28: 8, 29: 9, 30: 10,
    31: 11, 32: 12, 33: 13, 34: 14, 35: 15, 36: 16, 37: 17, 38: 17, 39: 18, 40: 18,
    41: 19, 42: 19, 43: 20, 44: 20, 45: 20, 46: 21, 47: 21, 48: 22, 49: 22, 50: 23,
    51: 23, 52: 23, 53: 23, 54: 24, 55: 24, 56: 25, 57: 25, 58: 26, 59: 26, 60: 26,
    61: 27, 62: 27, 63: 27, 64: 28, 65: 28, 66: 28, 67: 29, 68: 29, 69: 29, 70: 30,
    71: 30, 72: 30, 73: 30, 74: 31, 75: 31, 76: 31, 77: 31, 78: 31, 79: 32, 80: 32,
    81: 32, 82: 32, 83: 33, 84: 33, 85: 33, 86: 33, 87: 33, 88: 33, 89: 34, 90: 34,
    91: 34, 92: 34, 93: 34, 94: 34, 95: 35, 96: 35, 97: 35, 98: 35, 99: 36, 100: 36,
    101: 36, 102: 36, 103: 37, 104: 37, 105: 37, 106: 37, 107: 37, 108: 38, 109: 38, 110: 38,
    111: 38, 112: 38, 113: 38, 114: 39, 115: 39, 116: 39, 117: 39, 118: 39, 119: 40, 120: 40,
    121: 40, 122: 40, 123: 40, 124: 40, 125: 40, 126: 41, 127: 41, 128: 41, 129: 41, 130: 41,
    131: 41, 132: 41, 133: 42, 134: 42, 135: 42, 136: 42, 137: 42, 138: 42, 139: 42, 140: 42,
    141: 43, 142: 43, 143: 43, 144: 43, 145: 43, 146: 43, 147: 43, 148: 44, 149: 44, 150: 44,
    151: 44, 152: 44, 153: 44, 154: 45, 155: 45, 156: 45, 157: 45, 158: 45, 159: 45, 160: 46,
    161: 46, 162: 46, 163: 46, 164: 46, 165: 46, 166: 46, 167: 47, 168: 47, 169: 47, 170: 47,
    171: 47, 172: 47, 173: 47, 174: 47, 175: 48, 176: 48, 177: 48, 178: 48, 179: 48, 180: 48,
    181: 48, 182: 48, 183: 49, 184: 49, 185: 49, 186: 49, 187: 49, 188: 49, 189: 49, 190: 49,
    191: 49, 192: 50, 193: 50, 194: 50, 195: 50, 196: 50, 197: 50, 198: 50, 199: 50, 200: 51,
    201: 51, 202: 51, 203: 51, 204: 51, 205: 51, 206: 51, 207: 52, 208: 52, 209: 52, 210: 52,
    211: 52, 212: 52, 213: 52, 214: 52, 215: 53, 216: 53, 217: 53, 218: 53, 219: 53, 220: 53,
    221: 53, 222: 53, 223: 54, 224: 54, 225: 54, 226: 54, 227: 54, 228: 54, 229: 54, 230: 54,
    231: 54, 232: 55, 233: 55, 234: 55, 235: 55, 236: 55, 237: 55, 238: 55, 239: 55, 240: 55,
    241: 55, 242: 56, 243: 56, 244: 56, 245: 56, 246: 56, 247: 56, 248: 56, 249: 56, 250: 56,
    251: 56, 252: 57, 253: 57, 254: 57, 255: 57, 256: 57, 257: 57, 258: 57, 259: 57, 260: 57,
    261: 57, 262: 57, 263: 57, 264: 58, 265: 58, 266: 58, 267: 58, 268: 58, 269: 58, 270: 58,
    271: 58, 272: 58, 273: 58, 274: 58, 275: 58, 276: 59, 277: 59, 278: 59, 279: 59, 280: 59,
    281: 59, 282: 59, 283: 59, 284: 59, 285: 59, 286: 59, 287: 59, 288: 59, 289: 59, 290: 60,
    291: 60, 292: 60, 293: 60, 294: 60, 295: 60, 296: 60, 297: 60, 298: 60, 299: 60, 300: 60,
    301: 60, 302: 60, 303: 60, 304: 60, 305: 61, 306: 61, 307: 61, 308: 61, 309: 61, 310: 61,
    311: 61, 312: 61, 313: 61, 314: 61, 315: 61, 316: 61, 317: 61, 318: 61, 319: 61, 320: 61,
    321: 61, 322: 62, 323: 62, 324: 62, 325: 62, 326: 62, 327: 62, 328: 62, 329: 62, 330: 62,
    331: 62, 332: 62, 333: 62, 334: 62, 335: 62, 336: 62, 337: 62, 338: 62, 339: 62, 340: 62,
    341: 62, 342: 62, 343: 62, 344: 62, 345: 62, 346: 62, 347: 62, 348: 62, 349: 62, 350: 62,
    351: 62, 352: 62, 353: 62, 354: 62, 355: 62, 356: 62, 357: 62, 358: 62, 359: 62, 360: 62,
    361: 64, 362: 64, 363: 64, 364: 64, 365: 64, 366: 64, 367: 64, 368: 64, 369: 64, 370: 64,
    371: 64, 372: 64, 373: 64, 374: 64, 375: 64, 376: 64, 377: 64, 378: 64, 379: 64, 380: 64,
    381: 64, 382: 64, 383: 64, 384: 64, 385: 65, 386: 65, 387: 65, 388: 65, 389: 65, 390: 65,
    391: 65, 392: 65, 393: 65, 394: 65, 395: 65, 396: 65, 397: 65, 398: 65, 399: 65, 400: 65,
    401: 65, 402: 65, 403: 65, 404: 65, 405: 65, 406: 65, 407: 65, 408: 65, 409: 65, 410: 65,
    411: 65, 412: 66
  };

  if (playerCount > 412) return 66;
  return daTable[playerCount] !== undefined ? daTable[playerCount] : 0;
}

// 📌 소켓 데이터 수신 시: 상단 요약판 실시간 갱신
socket.on('dataUpdated', (data) => {
  currentData = data;
  renderSummaryPanels();

  const activeEl = document.activeElement;
  if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT')) {
    return; 
  }
  renderPartyTables();
});

// 📌 UTC 시계 기능 전용 모듈/함수
function initUtcClock(selector = '[data-utc-clock]') {
  function update() {
    const elements = document.querySelectorAll(selector);
    if (elements.length === 0) return;

    const now = new Date();
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');
    
    const timeString = `UTC ${hours}:${minutes}:${seconds}`;

    elements.forEach(el => {
      el.innerText = timeString;
    });
  }

  update();
  setInterval(update, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
  initUtcClock('[data-utc-clock]');
  removeOldResetButtons();   // 📌 기존에 남아있던 하단 초기화 버튼들 완전히 제거
  renderFloatingButtons();   // 📌 좌측 하단 마우스 오버 전용 플로팅 버튼들 동적 생성
});

// 📌 기존 HTML나 화면에 남아있는 초기화 관련 버튼들을 검색하여 완전히 제거하는 함수
function removeOldResetButtons() {
  const allElements = document.querySelectorAll('button, a, div, span');
  allElements.forEach(el => {
    if (el.innerText && (el.innerText.includes('초기화') || el.innerText.includes('Reset'))) {
      if (!el.closest('#admin-floating-modal')) {
        el.remove();
      }
    }
  });
}

// 📌 입력값 유무에 따라 텍스트 정렬을 동적으로 바꿔주는 함수 (코멘트/희망포지션용)
function handleTextAlign(inputEl) {
  if (inputEl.value && inputEl.value.length > 0) {
    inputEl.style.textAlign = 'left';
  } else {
    inputEl.style.textAlign = 'center';
  }
}

// 📌 닉네임 전용 정렬 함수
function handleNicknameFocus(inputEl) {
  inputEl.style.textAlign = 'left';
}

function handleNicknameBlur(inputEl) {
  if (!inputEl.value || inputEl.value.trim() === '') {
    inputEl.style.textAlign = 'center';
  }
}

// 📌 화면 좌측 하단 마우스 오버 플로팅 버튼 생성
function renderFloatingButtons() {
  const existingContainer = document.getElementById('floating-buttons-container');
  if (existingContainer) existingContainer.remove();

  const container = document.createElement('div');
  container.id = 'floating-buttons-container';
  container.style.cssText = `
    position: fixed;
    bottom: 70px;
    left: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 9998;
  `;

  const buttonStyle = `
    background: #475569;
    color: #f8fafc;
    border: 1px solid #64748b;
    padding: 10px 18px;
    border-radius: 8px;
    font-weight: bold;
    font-size: 0.9rem;
    cursor: pointer;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    width: 135px;
    text-align: center;
    box-sizing: border-box;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease, background 0.2s;
  `;

  const postingBtn = document.createElement('button');
  postingBtn.innerText = '포스팅 하러가기';
  postingBtn.style.cssText = buttonStyle;
  postingBtn.onmouseover = () => { postingBtn.style.background = '#334155'; };
  postingBtn.onmouseout = () => { postingBtn.style.background = '#475569'; };
  postingBtn.onclick = () => {
    window.open('https://www.naver.com', '_blank');
  };

  const regearBtn = document.createElement('button');
  regearBtn.innerText = '리기어 신청';
  regearBtn.style.cssText = buttonStyle;
  regearBtn.onmouseover = () => { regearBtn.style.background = '#334155'; };
  regearBtn.onmouseout = () => { regearBtn.style.background = '#475569'; };
  regearBtn.onclick = () => {
    window.open('https://docs.google.com/spreadsheets/d/155P_zDLKiue4DuxCKz5-q3R7lzkSVrSRiZHO2RgbkuU/edit?usp=sharing', '_blank');
  };

  container.appendChild(postingBtn);
  container.appendChild(regearBtn);

  container.onmouseenter = () => {
    postingBtn.style.opacity = '1';
    postingBtn.style.pointerEvents = 'auto';
    regearBtn.style.opacity = '1';
    regearBtn.style.pointerEvents = 'auto';
  };

  container.onmouseleave = () => {
    postingBtn.style.opacity = '0';
    postingBtn.style.pointerEvents = 'none';
    regearBtn.style.opacity = '0';
    regearBtn.style.pointerEvents = 'none';
  };

  document.body.appendChild(container);
}

function getRoleColor(role) {
  if (!role) return '#38bdf8';
  const trimmed = role.trim();
  switch (trimmed) {
    case '디펜': return '#38bdf8'; // 파랑색
    case '오펜': return '#a855f7'; // 보라색
    case '서폿': return '#eab308'; // 노란색
    case '딜러': return '#ef4444'; // 빨간색
    case '힐러': return '#22c55e'; // 초록색
    default: return '#38bdf8';
  }
}

// ⚡ 1. 상단 요약 현황판(DA, 길드, 갑옷) 전용 실시간 갱신 함수
function renderSummaryPanels() {
  if (!currentData.slots) return;

  const guildCounts = {};
  if (currentData.guilds) {
    currentData.guilds.forEach(g => guildCounts[g] = 0);
  }
  
  const armorTargets = ['심판관', '데몬', '기사', '가디언', '더스크'];
  const armorCurrentCounts = { '심판관': 0, '데몬': 0, '기사': 0, '가디언': 0, '더스크': 0 };
  const armorTotalCounts = { '심판관': 0, '데몬': 0, '기사': 0, '가디언': 0, '더스크': 0 };

  let activePlayerCount = 0; // 활성 닉네임 인원 카운트

  currentData.slots.forEach(slot => {
    if (slot.nickname && slot.nickname.trim() !== '') {
      activePlayerCount++;
      const gName = slot.guild || 'ANT';
      if (guildCounts[gName] !== undefined) {
        guildCounts[gName]++;
      } else {
        guildCounts[gName] = 1;
      }
    }

    if (!slot.isEmptyParty && slot.party && !slot.party.includes('FREE ROLE')) {
      const aName = slot.armorName || '';
      armorTargets.forEach(target => {
        if (aName.includes(target)) {
          armorTotalCounts[target]++;
          if (slot.nickname && slot.nickname.trim() !== '') {
            armorCurrentCounts[target]++;
          }
        }
      });
    }
  });

  // DA 계산식 적용
  const daValue = currentData.daValue !== undefined ? currentData.daValue : calculateDisarray(activePlayerCount);

  // 📌 기존 HTML 내에 인원현황/갑옷현황과 나란히 위치할 DA 박스 자동 동적 주입 (인원/갑옷현황처럼 스크롤 시 제자리에 머묌)
  const guildSummaryContainer = document.getElementById('guild-summary');
  if (guildSummaryContainer) {
    const summaryBox = guildSummaryContainer.closest('.summary-box') || guildSummaryContainer.parentElement;
    if (summaryBox) {
      let daWrapper = document.getElementById('da-summary-wrapper');
      if (!daWrapper) {
        daWrapper = document.createElement('div');
        daWrapper.id = 'da-summary-wrapper';
        daWrapper.className = 'summary-item';
        summaryBox.insertBefore(daWrapper, summaryBox.firstChild);
      }

      let daColorHex = '#f8fafc'; // 기본 흰색 (0)
      if (daValue >= 20) {
        daColorHex = '#f97316'; // 20 이상: 주황색
      } else if (daValue >= 10) {
        daColorHex = '#eab308'; // 10 이상: 노란색
      }

      daWrapper.innerHTML = `
        <span class="summary-label">DA</span>
        <span style="color: ${daColorHex}; font-weight: bold; font-size: 1.05rem;">${daValue}</span>
      `;
    }
  }

  // 📌 길드 현황 업데이트
  if (guildSummaryContainer && currentData.guilds) {
    guildSummaryContainer.innerHTML = '';
    currentData.guilds.forEach((g, index) => {
      const count = guildCounts[g] || 0;
      const itemDiv = document.createElement('div');
      itemDiv.className = 'summary-item';

      let countClass = 'zero-count';
      if (count > 0) {
        countClass = (index === 0) ? 'guild-first-active' : 'guild-other-active';
      }

      itemDiv.innerHTML = `
        <span class="summary-label">${g}</span>
        <span class="${countClass}">${count}</span>
      `;
      guildSummaryContainer.appendChild(itemDiv);
    });
  }

  // 📌 갑옷 현황 업데이트
  const armorSummaryContainer = document.getElementById('armor-summary');
  if (armorSummaryContainer) {
    armorSummaryContainer.innerHTML = '';
    armorTargets.forEach(a => {
      const current = armorCurrentCounts[a] || 0;
      const total = armorTotalCounts[a] || 0;
      const itemDiv = document.createElement('div');
      itemDiv.className = 'summary-item';

      const currentClass = current === 0 ? 'zero-count' : 'armor-count-active';

      itemDiv.innerHTML = `
        <span class="summary-label">${a}</span>
        <span><span class="${currentClass}">${current}</span>/${total}</span>
      `;
      armorSummaryContainer.appendChild(itemDiv);
    });
  }
}

// ⚡ 2. 메인 파티 슬롯 렌더링 함수
function renderPartyTables() {
  const activeEl = document.activeElement;
  let activeSlotId = null;
  let activeFieldType = null;
  let activeSelectionStart = null;
  let activeSelectionEnd = null;

  if (activeEl && activeEl.dataset.slotId) {
    activeSlotId = activeEl.dataset.slotId;
    activeFieldType = activeEl.dataset.fieldType;
    if (typeof activeEl.selectionStart === 'number') {
      activeSelectionStart = activeEl.selectionStart;
      activeSelectionEnd = activeEl.selectionEnd;
    }
  }

  const parties = {};
  currentData.slots.forEach(slot => {
    if (!parties[slot.party]) parties[slot.party] = [];
    parties[slot.party].push(slot);
  });

  const allPartyNames = Object.keys(parties);
  if (allPartyNames.length === 0) return;

  const tabs = [];
  const p12 = allPartyNames.filter(p => p === '1파티' || p === '2파티' || p === '1' || p === '2');
  if (p12.length > 0) tabs.push({ label: '1PT & 2PT', parties: p12 });

  const p3Free = [];
  if (parties['3파티']) p3Free.push('3파티');
  else {
    allPartyNames.forEach(p => {
      if (p.includes('3') && p !== 'FREE ROLE') p3Free.push(p);
    });
  }
  if (parties['FREE ROLE']) p3Free.push('FREE ROLE');
  if (p3Free.length > 0) tabs.push({ label: '3PT & FREE ROLE', parties: p3Free });

  allPartyNames.forEach(p => {
    if (!p12.includes(p) && !p3Free.includes(p)) {
      tabs.push({ label: p, parties: [p] });
    }
  });

  if (tabs.length === 0) {
    allPartyNames.forEach(p => tabs.push({ label: p, parties: [p] }));
  }

  tabs.push({ label: '관리자 메뉴', isAdminTab: true });

  if (!activeTabLabel || !tabs.find(t => t.label === activeTabLabel)) {
    activeTabLabel = tabs[0].label;
  }

  const tabsContainer = document.getElementById('party-tabs');
  tabsContainer.innerHTML = '';
  tabs.forEach(tab => {
    const btn = document.createElement('button');
    btn.className = tab.isAdminTab ? `tab-btn admin-tab-btn ${tab.label === activeTabLabel ? 'active' : ''}` : `tab-btn ${tab.label === activeTabLabel ? 'active' : ''}`;
    btn.innerText = tab.label;
    btn.onclick = () => {
      if (tab.isAdminTab) {
        verifyAdminAndOpenMenu();
      } else {
        activeTabLabel = tab.label;
        render();
      }
    };
    tabsContainer.appendChild(btn);
  });

  const container = document.getElementById('sheet-container');
  container.innerHTML = '';

  const currentTab = tabs.find(t => t.label === activeTabLabel) || tabs[0];
  if (currentTab.isAdminTab) return;

  const isMulti = currentTab.parties.length > 1;

  const gridWrapper = document.createElement('div');
  gridWrapper.className = isMulti ? 'side-by-side-grid' : '';
  container.appendChild(gridWrapper);

  const isAdmin = sessionStorage.getItem('is_admin') === 'true';

  currentTab.parties.forEach(partyName => {
    const partySlots = parties[partyName] || [];
    const partyColumn = document.createElement('div');

    const isEmpty = partySlots.length === 0 || (partySlots.length === 1 && partySlots[0].isEmptyParty);
    const maxCount = isEmpty ? 0 : partySlots.length;
    const currentCount = isEmpty ? 0 : partySlots.filter(s => s.nickname && s.nickname.trim() !== '').length;

    if (isMulti || currentTab.parties.length === 1) {
      const subTitle = document.createElement('div');
      subTitle.className = 'party-sub-title';
      subTitle.innerText = `🚩 ${partyName} (${currentCount} / ${maxCount})`;
      partyColumn.appendChild(subTitle);
    }

    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'excel-container';

    const isFreeRole = partyName.includes('FREE ROLE');
    let tbodyHtml = '';
    
    if (isEmpty) {
      const colspanVal = isFreeRole ? 5 : 7;
      tbodyHtml = `
        <tr>
          <td colspan="${colspanVal}" style="text-align: center; padding: 30px; color: #64748b; font-weight: bold;">
            비활성화된 파티입니다.
          </td>
        </tr>
      `;
    } else {
      partySlots.forEach((slot, idx) => {
        const guildOptions = currentData.guilds.map(g => 
          `<option value="${g}" ${(slot.guild || 'ANT') === g ? 'selected' : ''}>${g}</option>`
        ).join('');

        const formattedIndex = String(slot.displayIndex || (idx + 1)).padStart(2, '0');

        let currentNickname = slot.nickname;
        if (activeSlotId === slot.id && activeFieldType === 'nickname') {
          const activeInputValue = activeEl ? activeEl.value : slot.nickname;
          currentNickname = activeInputValue;
        }

        let currentComment = slot.comment || '';
        if (activeSlotId === slot.id && activeFieldType === 'comment') {
          const activeInputValue = activeEl ? activeEl.value : (slot.comment || '');
          currentComment = activeInputValue;
        }

        const canEditComment = isAdmin || isFreeRole;
        let commentHtml = '';
        if (canEditComment) {
          const commentAlign = (currentComment && currentComment.length > 0) ? 'left' : 'center';
          const placeholderText = isFreeRole ? '희망 포지션 입력' : '코멘트 입력';
          commentHtml = `<input type="text" placeholder="${placeholderText}" value="${escapeHtml(currentComment)}" data-slot-id="${slot.id}" data-field-type="comment" oninput="handleTextAlign(this); updateSlot('${slot.id}', 'comment', this.value)" style="width: 100%; box-sizing: border-box; text-align: ${commentAlign};" />`;
        } else {
          const commentAlign = (currentComment && currentComment.length > 0) ? 'left' : 'center';
          commentHtml = `<input type="text" class="readonly-comment" value="${escapeHtml(slot.comment || '')}" disabled style="width: 100%; box-sizing: border-box; text-align: ${commentAlign};" />`;
        }

        const attendanceAttr = isAdmin ? '' : 'disabled';
        const nicknameAlign = (currentNickname && currentNickname.trim() !== '') ? 'left' : 'center';

        if (isFreeRole) {
          tbodyHtml += `
            <tr>
              <td style="width: 35px; text-align: center; font-weight: bold; color: #94a3b8; white-space: nowrap;">${formattedIndex}</td>
              <td style="width: 455px;">${commentHtml}</td>
              <td style="width: 65px;">
                <select onchange="updateSlot('${slot.id}', 'guild', this.value)" data-slot-id="${slot.id}" data-field-type="guild" style="width: 100%; box-sizing: border-box;">
                  ${guildOptions}
                </select>
              </td>
              <td style="width: 115px;">
                <input type="text" placeholder="닉네임 입력" value="${escapeHtml(currentNickname)}" data-slot-id="${slot.id}" data-field-type="nickname" onfocus="handleNicknameFocus(this)" onblur="handleNicknameBlur(this)" oninput="updateSlot('${slot.id}', 'nickname', this.value)" style="width: 100%; box-sizing: border-box; text-align: ${nicknameAlign};" />
              </td>
              <td style="width: 35px;" class="chk-center">
                <input type="checkbox" ${slot.attended ? 'checked' : ''} ${attendanceAttr} onchange="updateSlot('${slot.id}', 'attended', this.checked)" />
              </td>
            </tr>
          `;
        } else {
          const weaponImgUrl = (slot.weaponImg && slot.weaponImg.trim() !== '') ? slot.weaponImg : '/images/default_weapon.png';
          const armorImgUrl = (slot.armorImg && slot.armorImg.trim() !== '') ? slot.armorImg : '/images/default_armor.png';
          const weaponName = slot.weaponName || '';
          const armorName = slot.armorName || '';
          const weaponTextColor = getRoleColor(slot.role);

          tbodyHtml += `
            <tr>
              <td style="width: 35px; text-align: center; font-weight: bold; color: #94a3b8; white-space: nowrap;">${formattedIndex}</td>
              <td style="width: 110px;">
                <div class="gear-cell">
                  <img src="${weaponImgUrl}" alt="Weapon" class="gear-img" onerror="this.src='/images/default_weapon.png'" />
                  <span style="font-size: 0.8rem; font-weight: bold; color: ${weaponTextColor}; overflow: hidden; text-overflow: ellipsis;" title="${weaponName}">${escapeHtml(weaponName)}</span>
                </div>
              </td>
              <td style="width: 95px;">
                <div class="gear-cell">
                  <img src="${armorImgUrl}" alt="Armor" class="gear-img" onerror="this.src='/images/default_armor.png'" />
                  <span style="font-size: 0.8rem; font-weight: bold; color: #f8fafc; overflow: hidden; text-overflow: ellipsis;" title="${armorName}">${escapeHtml(armorName)}</span>
                </div>
              </td>
              <td style="width: 250px;">${commentHtml}</td>
              <td style="width: 65px;">
                <select onchange="updateSlot('${slot.id}', 'guild', this.value)" data-slot-id="${slot.id}" data-field-type="guild" style="width: 100%; box-sizing: border-box;">
                  ${guildOptions}
                </select>
              </td>
              <td style="width: 115px;">
                <input type="text" placeholder="닉네임 입력" value="${escapeHtml(currentNickname)}" data-slot-id="${slot.id}" data-field-type="nickname" onfocus="handleNicknameFocus(this)" onblur="handleNicknameBlur(this)" oninput="updateSlot('${slot.id}', 'nickname', this.value)" style="width: 100%; box-sizing: border-box; text-align: ${nicknameAlign};" />
              </td>
              <td style="width: 35px;" class="chk-center">
                <input type="checkbox" ${slot.attended ? 'checked' : ''} ${attendanceAttr} onchange="updateSlot('${slot.id}', 'attended', this.checked)" />
              </td>
            </tr>
          `;
        }
      });
    }

    tableWrapper.innerHTML = `
      <table class="sheet-table">
        <thead>
          <tr>
            <th style="width: 35px; text-align: center;">순번</th>
            ${isFreeRole ? '<th style="width: 455px; text-align: center;">희망 포지션</th>' : '<th style="width: 110px; text-align: center;">무기</th><th style="width: 95px; text-align: center;">갑옷</th><th style="width: 250px; text-align: center;">코멘트</th>'}
            <th style="width: 65px; text-align: center;">길드</th>
            <th style="width: 115px; text-align: center;">닉네임</th>
            <th style="width: 35px; text-align: center;">출석</th>
          </tr>
        </thead>
        <tbody>${tbodyHtml}</tbody>
      </table>
    `;

    partyColumn.appendChild(tableWrapper);
    gridWrapper.appendChild(partyColumn);
  });

  if (activeSlotId && activeFieldType) {
    const selector = `[data-slot-id="${activeSlotId}"][data-field-type="${activeFieldType}"]`;
    const targetToFocus = document.querySelector(selector);
    if (targetToFocus) {
      targetToFocus.focus();
      if (typeof activeSelectionStart === 'number' && typeof targetToFocus.setSelectionRange === 'function') {
        targetToFocus.setSelectionRange(activeSelectionStart, activeSelectionEnd);
      } else if (targetToFocus.tagName === 'INPUT') {
        const len = targetToFocus.value.length;
        targetToFocus.setSelectionRange(len, len);
      }
    }
  }
}

// 📌 전체 메인 렌더링 함수
function render() {
  renderSummaryPanels();
  renderPartyTables();
}

function updateSlot(id, key, value) {
  const slot = currentData.slots.find(s => s.id === id);
  if (slot) {
    slot[key] = value;
    socket.emit('updateSlot', slot);
  }
}

function verifyAdminAndOpenMenu() {
  if (sessionStorage.getItem('is_admin') === 'true') {
    openAdminFloatingModal();
    return;
  }

  const code = prompt('관리자 메뉴를 열려면 [관리자 코드]를 입력하세요:');
  if (code === null) return;

  if (code.trim() === '') {
    alert('코드가 입력되지 않았습니다.');
    return;
  }

  fetch('/api/admin-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: code.trim() })
  })
  .then(res => res.json())
  .then(result => {
    if (result.redirectToLogin) {
      alert(result.message);
      window.location.href = '/login';
      return;
    }

    if (result.success) {
      sessionStorage.setItem('is_admin', 'true');
      render();
      openAdminFloatingModal();
    } else {
      alert('관리자 코드가 일치하지 않습니다.');
    }
  })
  .catch(err => {
    console.error(err);
    alert('서버 통신 중 오류가 발생했습니다.');
  });
}

function openAdminFloatingModal() {
  const existingModal = document.getElementById('admin-floating-modal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'admin-floating-modal';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center;
    z-index: 9999; backdrop-filter: blur(4px);
  `;

  const renderMainMenu = () => {
    const contentDiv = modal.querySelector('.modal-content');
    const isParty3Disabled = currentData.isParty3Disabled || false;
    const party3ToggleBtnText = isParty3Disabled ? '🟢 3파티 활성화하기' : '🔴 3파티 비활성화하기';
    const party3ToggleBtnBg = isParty3Disabled ? '#10b981' : '#f59e0b';

    contentDiv.innerHTML = `
      <h3 style="margin-top: 0; margin-bottom: 20px; font-size: 1.25rem; color: #38bdf8;">⚙️ 관리자 제어 메뉴</h3>
      
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <button id="btn-loadout-change" style="padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; transition: background 0.2s;">
          📂 조합 변경
        </button>

        <button id="btn-toggle-party3" style="padding: 12px; background: ${party3ToggleBtnBg}; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; transition: background 0.2s;">
          ${party3ToggleBtnText}
        </button>

        <button id="btn-reset-data" style="padding: 12px; background: #ef4444; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; transition: background 0.2s;">
          🔄 초기화
        </button>
      </div>

      <button id="btn-close-modal" style="margin-top: 20px; padding: 8px 16px; background: #475569; color: white; border: none; border-radius: 6px; cursor: pointer; width: 100%;">
        닫기
      </button>
    `;

    contentDiv.querySelector('#btn-close-modal').onclick = () => {
      modal.remove();
      activeTabLabel = '1PT & 2PT';
      render();
    };

    contentDiv.querySelector('#btn-loadout-change').onclick = () => {
      fetch('/api/admin/loadouts')
        .then(res => res.json())
        .then(resData => {
          if (!resData.success || resData.files.length === 0) {
            alert('loadouts 폴더에 사용 가능한 .txt 파일이 없습니다.');
            return;
          }
          renderLoadoutSelection(resData.files);
        })
        .catch(err => {
          console.error(err);
          alert('서버 통신 중 오류가 발생했습니다.');
        });
    };

    contentDiv.querySelector('#btn-toggle-party3').onclick = () => {
      socket.emit('toggleParty3');
      modal.remove();
      activeTabLabel = '1PT & 2PT';
      render();
    };

    contentDiv.querySelector('#btn-reset-data').onclick = () => {
      if (confirm('정말로 모든 데이터를 초기화하시겠습니까?')) {
        socket.emit('resetData');
        modal.remove();
        activeTabLabel = '1PT & 2PT';
        render();
        alert('데이터가 초기화되었습니다.');
      }
    };
  };

  const renderLoadoutSelection = (files) => {
    const contentDiv = modal.querySelector('.modal-content');
    
    let buttonsHtml = files.map(filename => `
      <button class="loadout-select-btn" data-filename="${filename}" style="padding: 10px 12px; background: #334155; color: #f8fafc; border: 1px solid #475569; border-radius: 6px; font-weight: bold; cursor: pointer; text-align: left; transition: background 0.2s; display: flex; align-items: center; gap: 8px;">
        <span style="color: #38bdf8;">📄</span> ${filename}
      </button>
    `).join('');

    contentDiv.innerHTML = `
      <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 1.15rem; color: #38bdf8;">📂 변경할 조합 선택</h3>
      
      <div style="display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto; margin-bottom: 15px; padding-right: 4px;">
        ${buttonsHtml}
      </div>

      <button id="btn-back-menu" style="padding: 8px 16px; background: #475569; color: white; border: none; border-radius: 6px; cursor: pointer; width: 100%;">
        🔙 뒤로 가기
      </button>
    `;

    contentDiv.querySelector('#btn-back-menu').onclick = renderMainMenu;

    contentDiv.querySelectorAll('.loadout-select-btn').forEach(btn => {
      btn.onclick = () => {
        const chosenFileName = btn.dataset.filename;
        fetch('/api/admin/change-loadout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: chosenFileName })
        })
        .then(r => r.json())
        .then(rRes => {
          if (rRes.success) {
            alert(`조합이 [${chosenFileName}] (으)로 교체되었습니다!`);
            modal.remove();
            activeTabLabel = '1PT & 2PT';
            render();
          } else {
            alert(rRes.message || '변경 실패');
          }
        });
      };
    });
  };

  modal.innerHTML = `
    <div class="modal-content" style="background: #1e293b; padding: 30px; border-radius: 12px; width: 320px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); border: 1px solid #334155; text-align: center; color: #f8fafc;">
    </div>
  `;

  document.body.appendChild(modal);
  renderMainMenu();
}

function escapeHtml(str) {
  return (str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
