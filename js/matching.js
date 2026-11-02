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
  const parties = {};
  currentData.slots.forEach(slot => {
    if (!parties[slot.party]) parties[slot.party] = [];
    parties[slot.party].push(slot);
  });

  const allPartyNames = Object.keys(parties);
  if (allPartyNames.length === 0) return;

  // 📌 1. 길드별 참여 인원 집계
  const guildCounts = {};
  currentData.guilds.forEach(g => guildCounts[g] = 0);
  
  // 📌 2. 주요 갑옷 종류별 인원 집계 (현재 착용 인원 / 전체 지정 총량)
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

    // 비어있는 파티 슬롯은 갑옷 총량 집계에서 제외
    if (!slot.isEmptyParty) {
      const aName = slot.armorName || '';
      armorTargets.forEach(target => {
        if (aName.includes(target)) {
          armorTotalCounts[target]++; // 전체 지정된 총량 증가
          if (slot.nickname && slot.nickname.trim() !== '') {
            armorCurrentCounts[target]++; // 실제 착용 중인 인원 증가
          }
        }
      });
    }
  });

  // 📌 길드 요약 UI 렌더링
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
      <span class="${countClass}">${count}명</span>
    `;
    guildSummaryContainer.appendChild(itemDiv);
  });

  // 📌 갑옷 요약 UI 렌더링 (현재 인원 부분만 색상 적용, 뒤의 /총량은 흰색)
  const armorSummaryContainer = document.getElementById('armor-summary');
  armorSummaryContainer.innerHTML = '';
  armorTargets.forEach(a => {
    const current = armorCurrentCounts[a] || 0;
    const total = armorTotalCounts[a] || 0;
    const itemDiv = document.createElement('div');
    itemDiv.className = 'summary-item';

    // current가 0일 때와 0보다 클 때(색상 분기)
    const currentClass = current === 0 ? 'zero-count' : 'armor-count-active';

    itemDiv.innerHTML = `
      <span class="summary-label">${a}</span>
      <span><span class="${currentClass}">${current}</span>/${total}</span>
    `;
    armorSummaryContainer.appendChild(itemDiv);
  });

  // 📌 탭 설정 및 렌더링
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

  if (!activeTabLabel || !tabs.find(t => t.label === activeTabLabel)) {
    activeTabLabel = tabs[0].label;
  }

  const tabsContainer = document.getElementById('party-tabs');
  tabsContainer.innerHTML = '';
  tabs.forEach(tab => {
    const btn = document.createElement('button');
    btn.className = `tab-btn ${tab.label === activeTabLabel ? 'active' : ''}`;
    btn.innerText = tab.label;
    btn.onclick = () => { activeTabLabel = tab.label; render(); };
    tabsContainer.appendChild(btn);
  });

  const container = document.getElementById('sheet-container');
  container.innerHTML = '';

  const currentTab = tabs.find(t => t.label === activeTabLabel) || tabs[0];
  const isMulti = currentTab.parties.length > 1;

  const gridWrapper = document.createElement('div');
  gridWrapper.className = isMulti ? 'side-by-side-grid' : '';
  container.appendChild(gridWrapper);

    currentTab.parties.forEach(partyName => {
    const partySlots = parties[partyName] || [];

    const partyColumn = document.createElement('div');

    // 📌 빈 파티(isEmptyParty: true) 판별 로직
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
              <select onchange="updateSlot('${slot.id}', 'guild', this.value)">
                ${guildOptions}
              </select>
            </td>
            <td style="width: 150px;">
              <input type="text" placeholder="닉네임 입력" value="${escapeHtml(slot.nickname)}" onchange="updateSlot('${slot.id}', 'nickname', this.value)" />
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
}

function updateSlot(id, key, value) {
  const slot = currentData.slots.find(s => s.id === id);
  if (slot) {
    slot[key] = value;
    socket.emit('updateSlot', slot);
  }
}

function requestReset() {
  const code = prompt('전체 초기화를 진행하려면 [관리자 코드]를 입력하세요:');
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
      if (confirm('관리자 인증 완료! 모든 데이터를 초기화하시겠습니까?')) {
        socket.emit('resetData');
      }
    } else {
      alert('관리자 코드가 일치하지 않습니다.');
    }
  })
  .catch(err => {
    console.error(err);
    alert('서버 통신 중 오류가 발생했습니다.');
  });
}

function escapeHtml(str) {
  return (str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
