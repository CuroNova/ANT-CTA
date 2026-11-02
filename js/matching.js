if (sessionStorage.getItem('just_logged_in') !== 'true') {
  window.location.href = '/login';
} else {
  sessionStorage.removeItem('just_logged_in');
}

const socket = io();
let currentData = { slots: [], guilds: [], isParty3Disabled: false };
let activeTabLabel = '';

socket.on('dataUpdated', (data) => {
  currentData = data;
  render();
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
});

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

  // 📌 관리자 메뉴 탭 추가
  tabs.push({ label: '관리자 메뉴', isAdminTab: true });

  if (!activeTabLabel || !tabs.find(t => t.label === activeTabLabel)) {
    activeTabLabel = tabs[0].label;
  }

  const tabsContainer = document.getElementById('party-tabs');
  tabsContainer.innerHTML = '';
  tabs.forEach(tab => {
    const btn = document.createElement('button');
    
    if (tab.isAdminTab) {
      btn.className = `tab-btn admin-tab-btn ${tab.label === activeTabLabel ? 'active' : ''}`;
    } else {
      btn.className = `tab-btn ${tab.label === activeTabLabel ? 'active' : ''}`;
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
          <td colspan="7" style="text-align: center; padding: 30px; color: #64748b; font-weight: bold;">
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

function updateSlot(id, key, value) {
  const slot = currentData.slots.find(s => s.id === id);
  if (slot) {
    slot[key] = value;
    socket.emit('updateSlot', slot);
  }
}

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
      activeTabLabel = '1·2파티';
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
      activeTabLabel = '1·2파티';
      render();
    };

    contentDiv.querySelector('#btn-reset-data').onclick = () => {
      if (confirm('정말로 모든 데이터를 초기화하시겠습니까?')) {
        socket.emit('resetData');
        modal.remove();
        activeTabLabel = '1·2파티';
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
            activeTabLabel = '1·2파티';
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
