if (sessionStorage.getItem('just_logged_in') !== 'true') {
  window.location.href = '/login';
} else {
  sessionStorage.removeItem('just_logged_in');
}

const socket = io();
let currentData = { slots: [], guilds: [] };
let activeTabLabel = '';

socket.on('dataUpdated', (data) => {
  currentData = data;
  render();
});

// UTC 시계 기능
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
});

function getRoleColor(role) {
  if (!role) return '#38bdf8';
  const trimmed = role.trim();
  switch (trimmed) {
    case '디펜': return '#38bdf8';
    case '오펜': return '#a855f7';
    case '서폿': return '#eab308';
    case '딜러': return '#ef4444';
    case '힐러': return '#22c55e';
    default: return '#38bdf8';
  }
}

function render() {
  const activeEl = document.activeElement;
  let activeSlotId = null;
  let activeFieldType = null;

  if (activeEl && activeEl.dataset.slotId) {
    activeSlotId = activeEl.dataset.slotId;
    activeFieldType = activeEl.dataset.fieldType;
  }

  const parties = {};
  currentData.slots.forEach(slot => {
    if (!parties[slot.party]) parties[slot.party] = [];
    parties[slot.party].push(slot);
  });

  const allPartyNames = Object.keys(parties);
  if (allPartyNames.length === 0) return;

  const guildCounts = {};
  currentData.guilds.forEach(g => guildCounts[g] = 0);
  
  const armorTargets = ['심판관', '데몬', '기사', '가디언', '더스크'];
  const armorCurrentCounts = { '심판관': 0, '데몬': 0, '기사': 0, '가디언': 0, '더스크': 0 };
  const armorTotalCounts = { '심판관': 0, '데몬': 0, '기사': 0, '가디언': 0, '더스크': 0 };

  currentData.slots.forEach(slot => {
    if (slot.nickname && slot.nickname.trim() !== '') {
      const gName = slot.guild || 'ANT';
      if (guildCounts[gName] !== undefined) {
        guildCounts[gName]++;
      } else {
        guildCounts[gName] = 1;
      }
    }

    if (!slot.isEmptyParty) {
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

  // 길드 요약 UI
  const guildSummaryContainer = document.getElementById('guild-summary');
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

  // 갑옷 요약 UI
  const armorSummaryContainer = document.getElementById('armor-summary');
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

  // 탭 구성
  const tabs = [];
  const p12 = allPartyNames.filter(p => p === '1파티' || p === '2파티' || p === '1' || p === '2');
  if (p12.length > 0) tabs.push({ label: '1·2파티', parties: p12 });

  const p3Free = [];
  if (parties['3파티']) p3Free.push('3파티');
  else {
    allPartyNames.forEach(p => {
      if (p.includes('3') && p !== 'FREE ROLE') p3Free.push(p);
    });
  }
  if (parties['FREE ROLE']) p3Free.push('FREE ROLE');
  if (p3Free.length > 0) tabs.push({ label: '3파티 · FREE ROLE', parties: p3Free });

  allPartyNames.forEach(p => {
    if (!p12.includes(p) && !p3Free.includes(p)) {
      tabs.push({ label: p, parties: [p] });
    }
  });

  if (tabs.length === 0) {
    allPartyNames.forEach(p => tabs.push({ label: p, parties: [p] }));
  }

  // 📌 탭 목록 맨 우측에 '관리자 메뉴' 추가
  tabs.push({ label: '관리자 메뉴', isAdminTab: true });

  if (!activeTabLabel || !tabs.find(t => t.label === activeTabLabel)) {
    activeTabLabel = tabs[0].label;
  }

  const tabsContainer = document.getElementById('party-tabs');
  tabsContainer.innerHTML = '';
  tabs.forEach(tab => {
    const btn = document.createElement('button');
    btn.className = `tab-btn ${tab.label === activeTabLabel ? 'active' : ''}`;
    if (tab.isAdminTab) {
      btn.style.borderColor = '#ef4444';
      btn.style.color = '#f87171';
    }
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
  
  // 관리자 메뉴 탭일 때는 시트 내용을 띄우지 않음 (플로팅 모달이 뜸)
  if (currentTab.isAdminTab) {
    return;
  }

  const isMulti = currentTab.parties.length > 1;

  const gridWrapper = document.createElement('div');
  gridWrapper.className = isMulti ? 'side-by-side-grid' : '';
  container.appendChild(gridWrapper);

  currentTab.parties.forEach(partyName => {
    const partySlots = parties[partyName] || [];
    const partyColumn = document.createElement('div');

    const isEmpty = partySlots.length === 0 || (partySlots.length === 1 && partySlots[0].isEmptyParty);
    const maxCount = isEmpty ? 0 : partySlots.length;
    const currentCount = isEmpty ? 0 : partySlots.filter(s => s.nickname && s.nickname.trim() !== '').length;

    if (isMulti || currentTab.parties.length === 1) {
      const subTitle = document.createElement('div');
      subTitle.className = 'party-sub-title';
      subTitle.innerText = `📌 ${partyName} (${currentCount} / ${maxCount})`;
      partyColumn.appendChild(subTitle);
    }

    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'excel-container';

    let tbodyHtml = '';
    
    if (isEmpty) {
      tbodyHtml = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px; color: #ef4444; font-weight: bold; background: rgba(239, 68, 68, 0.05);">
            비활성화된 파티입니다.
          </td>
        </tr>
      `;
    } else {
      partySlots.forEach((slot, idx) => {
        const guildOptions = currentData.guilds.map(g => 
          `<option value="${g}" ${(slot.guild || 'ANT') === g ? 'selected' : ''}>${g}</option>`
        ).join('');

        const weaponImgUrl = (slot.weaponImg && slot.weaponImg.trim() !== '') ? slot.weaponImg : '/images/default_weapon.png';
        const armorImgUrl = (slot.armorImg && slot.armorImg.trim() !== '') ? slot.armorImg : '/images/default_armor.png';
        
        const formattedIndex = String(slot.displayIndex || (idx + 1)).padStart(2, '0');
        const weaponName = slot.weaponName || '';
        const armorName = slot.armorName || '';
        const weaponTextColor = getRoleColor(slot.role);

        let currentNickname = slot.nickname;
        if (activeSlotId === slot.id && activeFieldType === 'nickname') {
          const activeInputValue = activeEl ? activeEl.value : slot.nickname;
          currentNickname = activeInputValue;
        }

        tbodyHtml += `
          <tr>
            <td style="width: 45px; text-align: center; font-weight: bold; color: #94a3b8; white-space: nowrap;">${formattedIndex}</td>
            <td style="width: 125px;">
              <div class="gear-cell">
                <img src="${weaponImgUrl}" alt="Weapon" class="gear-img" onerror="this.src='/images/default_weapon.png'" />
                <span style="font-size: 0.8rem; font-weight: bold; color: ${weaponTextColor}; overflow: hidden; text-overflow: ellipsis;" title="${weaponName}">${escapeHtml(weaponName)}</span>
              </div>
            </td>
            <td style="width: 125px;">
              <div class="gear-cell">
                <img src="${armorImgUrl}" alt="Armor" class="gear-img" onerror="this.src='/images/default_armor.png'" />
                <span style="font-size: 0.8rem; font-weight: bold; color: #f8fafc; overflow: hidden; text-overflow: ellipsis;" title="${armorName}">${escapeHtml(armorName)}</span>
              </div>
            </td>
            <td style="width: 140px;">
              <input type="text" class="readonly-comment" value="${escapeHtml(slot.comment || '')}" disabled />
            </td>
            <td style="width: 75px;">
              <select onchange="updateSlot('${slot.id}', 'guild', this.value)" data-slot-id="${slot.id}" data-field-type="guild">
                ${guildOptions}
              </select>
            </td>
            <td style="width: 150px;">
              <input type="text" placeholder="닉네임 입력" value="${escapeHtml(currentNickname)}" data-slot-id="${slot.id}" data-field-type="nickname" oninput="updateSlot('${slot.id}', 'nickname', this.value)" />
            </td>
            <td style="width: 45px;" class="chk-center">
              <input type="checkbox" ${slot.attended ? 'checked' : ''} onchange="updateSlot('${slot.id}', 'attended', this.checked)" />
            </td>
          </tr>
        `;
      });
    }

    tableWrapper.innerHTML = `
      <table class="sheet-table">
        <thead>
          <tr>
            <th style="width: 45px; text-align: center;">순번</th>
            <th style="width: 125px; text-align: center;">무기</th>
            <th style="width: 125px; text-align: center;">갑옷</th>
            <th style="width: 140px; text-align: center;">코멘트</th>
            <th style="width: 75px; text-align: center;">길드</th>
            <th style="width: 150px; text-align: center;">닉네임</th>
            <th style="width: 45px; text-align: center;">출석</th>
          </tr>
        </thead>
        <tbody>
          ${tbodyHtml}
        </tbody>
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
      if (targetToFocus.tagName === 'INPUT' && typeof targetToFocus.selectionStart === 'number') {
        const len = targetToFocus.value.length;
        targetToFocus.setSelectionRange(len, len);
      }
    }
  }
}

// 📌 관리자 인증 후 플로팅 모달 메뉴 오픈
function verifyAdminAndOpenMenu() {
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

// 📌 화면 정중앙 플로팅 관리자 메뉴 팝업 생성
function openAdminFloatingModal() {
  // 기존에 열려있는 모달이 있다면 제거
  const existingModal = document.getElementById('admin-floating-modal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'admin-floating-modal';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center;
    z-index: 9999; backdrop-filter: blur(4px);
  `;

  const isParty3Disabled = currentData.isParty3Disabled || false;
  const party3ToggleText = isParty3Disabled ? '🟢 3파티 활성화하기' : '🔴 3파티 비활성화';

  modal.innerHTML = `
    <div style="background: #1e293b; padding: 30px; border-radius: 12px; width: 360px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); border: 1px solid #334155; text-align: center; color: #f8fafc;">
      <h3 style="margin-top: 0; margin-bottom: 20px; font-size: 1.25rem; color: #38bdf8;">⚙️ 관리자 제어 메뉴</h3>
      
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <button id="btn-loadout-change" style="padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; transition: background 0.2s;">
          📂 조합 변경 (로드아웃 선택)
        </button>
        
        <button id="btn-toggle-party3" style="padding: 12px; background: ${isParty3Disabled ? '#10b981' : '#f59e0b'}; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">
          ${party3ToggleText}
        </button>

        <button id="btn-reset-data" style="padding: 12px; background: #ef4444; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">
          🔄 전체 초기화
        </button>
      </div>

      <button id="btn-close-modal" style="margin-top: 20px; padding: 8px 16px; background: #475569; color: white; border: none; border-radius: 6px; cursor: pointer; width: 100%;">
        닫기
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  // 이벤트 바인딩
  document.getElementById('btn-close-modal').onclick = () => modal.remove();
  
  // 1. 조합 변경 버튼 클릭 시 .txt 파일 리스트 팝업 띄우기
  document.getElementById('btn-loadout-change').onclick = () => {
    fetch('/api/admin/loadouts')
      .then(res => res.json())
      .then(resData => {
        if (!resData.success || resData.files.length === 0) {
          alert('loadouts 폴더에 사용 가능한 .txt 파일이 없습니다.');
          return;
        }
        
        let fileListStr = resData.files.map((f, i) => `${i + 1}. ${f}`).join('\n');
        let selectedIdxStr = prompt(`변경할 조합 파일 번호를 입력하세요:\n\n${fileListStr}`);
        if (!selectedIdxStr) return;

        let idx = parseInt(selectedIdxStr.trim()) - 1;
        if (isNaN(idx) || !resData.files[idx]) {
          alert('올바른 번호를 입력해주세요.');
          return;
        }

        let chosenFile = resData.files[idx];
        fetch('/api/admin/change-loadout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: chosenFile })
        })
        .then(r => r.json())
        .then(rRes => {
          if (rRes.success) {
            alert(`조합이 [${chosenFile}] (으)로 성공적으로 변경되었습니다!`);
            modal.remove();
          } else {
            alert(rRes.message || '변경 실패');
          }
        });
      });
  };

  // 2. 3파티 비활성화/활성화 토글
  document.getElementById('btn-toggle-party3').onclick = () => {
    fetch('/api/admin/toggle-party3', { method: 'POST' })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          alert(resData.isParty3Disabled ? '3파티가 비활성화되었습니다.' : '3파티가 활성화되었습니다.');
          modal.remove();
        }
      });
  };

  // 3. 전체 초기화
  document.getElementById('btn-reset-data').onclick = () => {
    if (confirm('정말로 모든 데이터를 초기화하시겠습니까?')) {
      socket.emit('resetData');
      modal.remove();
      alert('초기화되었습니다.');
    }
  };
}

function updateSlot(id, key, value) {
  const slot = currentData.slots.find(s => s.id === id);
  if (slot) {
    slot[key] = value;
    socket.emit('updateSlot', slot);
  }
}

function escapeHtml(str) {
  return (str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
