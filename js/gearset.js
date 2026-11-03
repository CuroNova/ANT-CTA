let gearsetsData = [];
const roles = ['오펜', '디펜', '서폿', '힐러', '딜러'];

document.addEventListener('DOMContentLoaded', () => {
  initUtcClock('[data-utc-clock]');
  fetchGearsets();
  checkAdminUI();
});

// UTC 시계 모듈
function initUtcClock(selector) {
  function update() {
    const el = document.querySelector(selector);
    if (!el) return;
    const now = new Date();
    el.innerText = `UTC ${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}`;
  }
  update();
  setInterval(update, 1000);
}

// 기어세트 데이터 가져오기
function fetchGearsets() {
  fetch('/api/gearsets')
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        gearsetsData = data.gearsets;
        renderGearsets();
      }
    });
}

// 관리자 여부 확인 후 추가 버튼 노출
function checkAdminUI() {
  const isAdmin = sessionStorage.getItem('is_admin') === 'true';
  const area = document.getElementById('admin-action-area');
  if (isAdmin && area) {
    area.innerHTML = `<button class="btn-add-gear" onclick="openGearModal()">+ 기어 세트 추가</button>`;
  }
}

// 화면 렌더링 함수
function renderGearsets() {
  const container = document.getElementById('gearset-container');
  container.innerHTML = '';
  const isAdmin = sessionStorage.getItem('is_admin') === 'true';

  roles.forEach(roleName => {
    const roleItems = gearsetsData.filter(item => item.role === roleName);
    
    const section = document.createElement('div');
    section.className = 'role-section';

    let cardsHtml = '';
    if (roleItems.length === 0) {
      cardsHtml = `<div style="padding: 20px; text-align: center; color: #64748b; font-size: 0.85rem;">등록된 기어 세트가 없습니다.</div>`;
    } else {
      roleItems.forEach(item => {
        const fallbackImg = '/images/nolink.webp';
        cardsHtml += `
          <div class="gear-card">
            <div class="gear-grid">
              <div class="gear-item"><img src="${item.weaponImg || fallbackImg}" class="gear-icon" onerror="this.src='${fallbackImg}'"><span>WEAPON</span></div>
              <div class="gear-item"><img src="${item.offhandImg || fallbackImg}" class="gear-icon" onerror="this.src='${fallbackImg}'"><span>OFF-HAND</span></div>
              <div class="gear-item"><img src="${item.helmImg || fallbackImg}" class="gear-icon" onerror="this.src='${fallbackImg}'"><span>HELMET</span></div>
              <div class="gear-item"><img src="${item.armorImg || fallbackImg}" class="gear-icon" onerror="this.src='${fallbackImg}'"><span>ARMOR</span></div>
              <div class="gear-item"><img src="${item.shoesImg || fallbackImg}" class="gear-icon" onerror="this.src='${fallbackImg}'"><span>SHOES</span></div>
              <div class="gear-item"><img src="${item.capeImg || fallbackImg}" class="gear-icon" onerror="this.src='${fallbackImg}'"><span>CAPE</span></div>
              <div class="gear-item"><img src="${item.foodImg || fallbackImg}" class="gear-icon" onerror="this.src='${fallbackImg}'"><span>FOOD</span></div>
              <div class="gear-item" style="justify-content: center; font-weight: bold; color: #38bdf8;"><span>${item.role}</span><span>POSITION</span></div>
            </div>
            
            <div class="gear-details">
              <!-- 모바일에서는 숨겨지는 스킬셋 및 코멘트 영역 -->
              <div class="mobile-hide" style="display: flex; flex-direction: column; gap: 3px;">
                <span style="color: #38bdf8; font-weight: bold;">SKILL SET: <span style="color: #f8fafc; font-weight: normal;">${escapeHtml(item.skillset || '-')}</span></span>
                <span class="gear-comment">COMMENTS: ${escapeHtml(item.comment || '-')}</span>
              </div>

              ${isAdmin ? `
                <div class="admin-card-actions">
                  <button class="btn-edit" onclick="openGearModal('${item.id}')">수정</button>
                  <button class="btn-delete" onclick="deleteGearset('${item.id}')">삭제</button>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      });
    }

    section.innerHTML = `
      <div class="role-header">
        <span>🚩 ${roleName} (${roleItems.length})</span>
      </div>
      <div class="role-content">${cardsHtml}</div>
    `;
    container.appendChild(section);
  });
}

// 모달 열기 (추가 또는 수정)
function openGearModal(id = null) {
  const modal = document.getElementById('gearset-modal');
  modal.style.display = 'flex';
  
  if (id) {
    document.getElementById('modal-title').innerText = '기어 세트 수정';
    const target = gearsetsData.find(i => i.id === id);
    if (target) {
      document.getElementById('form-id').value = target.id;
      document.getElementById('form-role').value = target.role || '오펜';
      document.getElementById('form-weapon').value = target.weapon || '';
      document.getElementById('form-offhand').value = target.offhand || '';
      document.getElementById('form-helm').value = target.helm || '';
      document.getElementById('form-armor').value = target.armor || '';
      document.getElementById('form-shoes').value = target.shoes || '';
      document.getElementById('form-cape').value = target.cape || '';
      document.getElementById('form-food').value = target.food || '';
      document.getElementById('form-skillset').value = target.skillset || '';
      document.getElementById('form-comment').value = target.comment || '';
    }
  } else {
    document.getElementById('modal-title').innerText = '기어 세트 추가';
    document.getElementById('gearset-form').reset();
    document.getElementById('form-id').value = 'gear_' + Date.now(); // 고유 기본키 생성 (화면 노출 안 함)
  }
}

function closeGearModal() {
  document.getElementById('gearset-modal').style.display = 'none';
}

// 폼 제출 (저장/수정)
document.getElementById('gearset-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('form-id').value;
  
  const newItem = {
    id: id,
    role: document.getElementById('form-role').value,
    weapon: document.getElementById('form-weapon').value,
    offhand: document.getElementById('form-offhand').value,
    helm: document.getElementById('form-helm').value,
    armor: document.getElementById('form-armor').value,
    shoes: document.getElementById('form-shoes').value,
    cape: document.getElementById('form-cape').value,
    food: document.getElementById('form-food').value,
    skillset: document.getElementById('form-skillset').value,
    comment: document.getElementById('form-comment').value
  };

  const index = gearsetsData.findIndex(i => i.id === id);
  if (index !== -1) {
    gearsetsData[index] = newItem;
  } else {
    gearsetsData.push(newItem);
  }

  saveToServer();
  closeGearModal();
});

// 삭제 기능
function deleteGearset(id) {
  if (confirm('정말로 이 기어 세트를 삭제하시겠습니까?')) {
    gearsetsData = gearsetsData.filter(i => i.id !== id);
    saveToServer();
  }
}

// 서버에 변경 사항 전송
function saveToServer() {
  fetch('/api/gearsets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gearsets: gearsetsData })
  })
  .then(res => res.json())
  .then(resData => {
    if (resData.success) {
      fetchGearsets(); // 최신 데이터 재조회 및 렌더링
    } else {
      alert('저장 중 오류가 발생했습니다.');
    }
  });
}

function escapeHtml(str) {
  return (str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
