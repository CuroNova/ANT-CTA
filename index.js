const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const LOADOUTS_DIR = path.join(__dirname, 'loadouts'); // 📌 로드아웃 폴더 경로 정의
let currentPartiesFile = path.join(__dirname, 'loadouts', '브롤클랩.txt'); // 📌 현재 활성화된 파티 파일 추적 변수
const CONFIG_FILE = path.join(__dirname, 'settings', 'config.json'); // 📌 통합 설정 파일 경로 (guilds + passwords)
const JSON_MAPPING_FILE = path.join(__dirname, 'settings', 'mapping_image.json');

app.use(express.json());

// 📌 페이지 라우팅 (새로 개편된 views 폴더 기준)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'welcome.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/matching', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'matching.html'));
});

// 📌 정적 파일 및 에셋 폴더 서빙 설정 (루트 기준 폴더별 매핑)
app.use(express.static(path.join(__dirname, 'views')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// 💡 이미지 폴더 브라우저 캐시(7일) 적용으로 중복 트래픽 및 낭비 차단
app.use('/images', express.static(path.join(__dirname, 'images'), {
  maxAge: '7d', // 7일 동안 브라우저에 캐시 저장
  etag: true,
  lastModified: true
}));

app.use('/css', express.static(path.join(__dirname, 'css')));

// 📌 💡 통합 설정 파일(config.json) 로드 함수
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const fileContents = fs.readFileSync(CONFIG_FILE, 'utf8');
      const config = JSON.parse(fileContents);
      
      if (!config.inviteCode || !config.adminCode || !config.guilds) {
        throw new Error('config.json 내부 필수 키값(inviteCode, adminCode, guilds)이 누락되었습니다.');
      }
      return config;
    } else {
      throw new Error('config.json 파일이 존재하지 않습니다.');
    }
  } catch (e) {
    console.error('❌ 설정 파일 로드 실패:', e.message);
    return null; // 실패 시 null 반환
  }
}

// 📌 JSON 매핑 파일 로드 함수
function loadMappingConfig() {
  try {
    if (fs.existsSync(JSON_MAPPING_FILE)) {
      const fileContents = fs.readFileSync(JSON_MAPPING_FILE, 'utf8');
      return JSON.parse(fileContents);
    }
  } catch (e) {
    console.error('mapping_image.json 로드 실패:', e);
  }
  return { weapon: {}, armor: {} };
}

// 📌 이미지 경로 결정 함수 (확장자가 없으면 자동으로 .webp를 붙여주도록 업그레이드!)
function resolveImagePath(name, directUrl, type, mappingConfig) {
  if (directUrl && directUrl.trim() !== '') {
    return directUrl.trim();
  }

  const mapRules = mappingConfig[type] || {};
  if (name && name.trim() !== '') {
    const trimmedName = name.trim();
    for (const [key, imagePath] of Object.entries(mapRules)) {
      if (trimmedName.includes(key)) {
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('/')) {
          return imagePath;
        }
        // 💡 확장자가 생략되어 있다면 자동으로 .webp를 붙여줌
        const finalPath = imagePath.includes('.') ? imagePath : `${imagePath}.webp`;
        return `/images/${finalPath}`;
      }
    }
  }

  return type === 'weapon' ? '/images/default_weapon.webp' : '/images/default_armor.webp';
}

// 📌 닉네임, 길드, 출석 상태 백업 (조합표 변경 시 Free Role의 희망 포지션도 유지되도록 백업)
function getExistingUserDataMap() {
  const map = new Map();
  if (fs.existsSync(DATA_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (data && data.slots) {
        data.slots.forEach(slot => {
          if (!slot.isEmptyParty && slot.id) {
            map.set(slot.id, {
              nickname: slot.nickname || '',
              attended: slot.attended || false,
              guild: slot.guild || '',
              comment: slot.party && slot.party.includes('FREE ROLE') ? (slot.comment || '') : ''
            });
          }
        });
      }
    } catch (err) {
      console.error('기존 데이터 백업 중 오류:', err);
    }
  }
  return map;
}

// 📌 초기 데이터 로드 함수 (isReset이 true일 때는 닉네임/길드/출석뿐만 아니라 Free Role 희망포지션까지 완벽히 초기화)
function loadInitialState(isParty3Disabled = false, isReset = false) {
  let initialSlots = [];
  const mappingConfig = loadMappingConfig();
  const config = loadConfig();
  
  // 💡 초기화(reset) 시에는 백업본을 빈 Map으로 두어 개인 입력 데이터가 싹 비워지게 함
  const savedUserDataMap = isReset ? new Map() : getExistingUserDataMap();

  const guilds = config ? config.guilds : ['ANT', '드래곤길드', '크라운길드', '무소속'];

  if (fs.existsSync(currentPartiesFile)) {
    const lines = fs.readFileSync(currentPartiesFile, 'utf8').split('\n');
    let currentParty = '';
    let partySlotCounter = 1;
    let definedParties = [];
    let slotsByParty = {};

    lines.forEach(line => {
      line = line.trim();
      if (!line) return;
      
      if (line.startsWith('[') && line.endsWith(']')) {
        currentParty = line.replace(/[\[\]]/g, '');
        partySlotCounter = 1; 
        if (!definedParties.includes(currentParty)) {
          definedParties.push(currentParty);
        }
        if (!slotsByParty[currentParty]) {
          slotsByParty[currentParty] = [];
        }
      } else {
        if (!currentParty) return;
        const matches = line.match(/"([^"]*)"/g);
        if (!matches || matches.length < 1) return;

        const parts = matches.map(m => m.replace(/"/g, '').trim());
        const slotId = parts[0] || '';       // 1. 기본키
        const roleName = parts[1] || '';     // 2. 역할명
        const weaponName = parts[2] || '';   // 3. 무기명
        const armorName = parts[3] || '';    // 4. 갑옷명
        const commentText = parts[4] || '';  // 5. 코멘트 (txt 원본 값)
        const rawWeaponImg = parts[5] || ''; // 6. 무기 이미지 링크
        const rawArmorImg = parts[6] || '';  // 7. 갑옷 이미지 링크

        const finalWeaponImg = resolveImagePath(weaponName, rawWeaponImg, 'weapon', mappingConfig);
        const finalArmorImg = resolveImagePath(armorName, rawArmorImg, 'armor', mappingConfig);

        const isTargetParty3 = isParty3Disabled && currentParty.includes('3') && currentParty !== 'FREE ROLE';
        if (isTargetParty3) return;

        let userNickname = '';
        let userAttended = false;
        let userGuild = guilds[0] || 'ANT';
        let finalComment = commentText; 

        // 💡 조합표 변경 시 닉네임, 길드, 출석, 그리고 Free Role의 희망포지션은 유지
        if (savedUserDataMap.has(slotId)) {
          const saved = savedUserDataMap.get(slotId);
          userNickname = saved.nickname;
          userAttended = saved.attended;
          if (saved.guild) userGuild = saved.guild;

          if (currentParty.includes('FREE ROLE') && saved.comment) {
            finalComment = saved.comment; 
          }
        }

        slotsByParty[currentParty].push({
          id: slotId,
          role: roleName,
          weaponName: weaponName,
          armorName: armorName,
          weaponImg: finalWeaponImg,
          armorImg: finalArmorImg,
          displayIndex: partySlotCounter++,
          party: currentParty,
          nickname: userNickname,
          guild: userGuild,
          comment: finalComment,
          attended: userAttended
        });
      }
    });

    definedParties.forEach(pName => {
      const isTargetParty3 = isParty3Disabled && pName.includes('3') && pName !== 'FREE ROLE';

      if (isTargetParty3) {
        initialSlots.push({
          id: `EMPTY_${pName}`,
          party: pName,
          isEmptyParty: true,
          displayIndex: 1,
          role: '',
          weaponName: '',
          armorName: '',
          weaponImg: '',
          armorImg: '',
          nickname: '',
          guild: guilds[0] || 'ANT',
          comment: '',
          attended: false
        });
      } else if (slotsByParty[pName] && slotsByParty[pName].length > 0) {
        initialSlots.push(...slotsByParty[pName]);
      } else {
        initialSlots.push({
          id: `EMPTY_${pName}`,
          party: pName,
          isEmptyParty: true,
          displayIndex: 1,
          role: '',
          weaponName: '',
          armorName: '',
          weaponImg: '',
          armorImg: '',
          nickname: '',
          guild: guilds[0] || 'ANT',
          comment: '',
          attended: false
        });
      }
    });
  }

  return { 
    slots: initialSlots, 
    guilds, 
    inviteCode: config ? config.inviteCode : '1234',
    currentLoadout: path.basename(currentPartiesFile, '.txt'),
    isParty3Disabled: isParty3Disabled
  };
}

// 📌 슬롯 코멘트 변경 시 활성화된 .txt 파일의 해당 줄을 실시간으로 수정하여 파일에 반영
function updateTxtFileLine(slotId, newComment) {
  try {
    if (!fs.existsSync(currentPartiesFile)) return;
    const content = fs.readFileSync(currentPartiesFile, 'utf8');
    const lines = content.split('\n');

    const newLines = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('[') || trimmed.startsWith(';')) {
        return line;
      }
      if (trimmed.startsWith(`"${slotId}"`)) {
        const matches = trimmed.match(/"([^"]*)"/g);
        if (matches && matches.length >= 5) {
          const parts = matches.map(m => m);
          parts[4] = `"${newComment}"`;
          let reconstructed = parts.join(',');
          return reconstructed;
        }
      }
      return line;
    });

    fs.writeFileSync(currentPartiesFile, newLines.join('\n'), 'utf8');
  } catch (err) {
    console.error('❌ .txt 파일 코멘트 업데이트 실패:', err);
  }
}

function getData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = loadInitialState(false);
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf8');
    return initialData;
  }
  try {
    const content = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    const initialData = loadInitialState(false);
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf8');
    return initialData;
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// 📌 로그인 API
app.post('/api/login', (req, res) => {
  const { code } = req.body;
  const config = loadConfig();

  if (!config) {
    return res.json({ 
      success: false, 
      message: '설정 파일 로드에 문제가 생겼습니다!', 
      redirectToLogin: true 
    });
  }

  if (code === config.inviteCode) {
    res.json({ success: true, isAdmin: false });
  } else if (code === config.adminCode) {
    res.json({ success: true, isAdmin: true });
  } else {
    res.json({ success: false, message: '코드가 일치하지 않습니다.' });
  }
});

// 📌 관리자 인증 API
app.post('/api/admin-auth', (req, res) => {
  const { code } = req.body;
  const config = loadConfig();

  if (!config) {
    return res.json({ 
      success: false, 
      message: '설정 파일 로드에 문제가 생겼습니다!', 
      redirectToLogin: true 
    });
  }

  if (code === config.adminCode) {
    res.json({ success: true });
  } else {
    res.json({ success: false, message: '관리자 코드가 일치하지 않습니다.' });
  }
});

// 📌 관리자 API: loadouts 폴더 내 .txt 파일 목록 조회
app.get('/api/admin/loadouts', (req, res) => {
  try {
    if (!fs.existsSync(LOADOUTS_DIR)) {
      return res.json({ success: true, files: [] });
    }
    const files = fs.readdirSync(LOADOUTS_DIR)
      .filter(f => f.endsWith('.txt'))
      .map(f => path.basename(f, '.txt'));
    res.json({ success: true, files });
  } catch (err) {
    res.status(500).json({ success: false, message: '파일 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 📌 관리자 API: 조합(.txt) 변경
app.post('/api/admin/change-loadout', (req, res) => {
  const { filename } = req.body;
  const targetFilename = filename.endsWith('.txt') ? filename : `${filename}.txt`;
  const targetPath = path.join(LOADOUTS_DIR, targetFilename);

  if (!fs.existsSync(targetPath)) {
    return res.json({ success: false, message: '존재하지 않는 파일입니다.' });
  }

  currentPartiesFile = targetPath;
  const oldData = getData();
  const newState = loadInitialState(oldData.isParty3Disabled || false);

  saveData(newState);
  io.emit('dataUpdated', newState);
  res.json({ success: true });
});

// 📌 Socket.io 실시간 동기화
io.on('connection', (socket) => {
  socket.emit('dataUpdated', getData());

  socket.on('updateSlot', (updatedSlot) => {
    const data = getData();
    const index = data.slots.findIndex(s => s.id === updatedSlot.id);
    if (index !== -1) {
      data.slots[index] = { ...data.slots[index], ...updatedSlot };
      saveData(data);

      // Free Role이 아닐 때만 일반 코멘트를 txt 파일 원본에 반영
      if (updatedSlot.comment !== undefined && (!data.slots[index].party || !data.slots[index].party.includes('FREE ROLE'))) {
        updateTxtFileLine(updatedSlot.id, updatedSlot.comment);
      }

      io.emit('dataUpdated', data);
    }
  });

  socket.on('toggleParty3', () => {
    const data = getData();
    const nextDisabledState = !(data.isParty3Disabled || false);
    
    const newState = loadInitialState(nextDisabledState);
    saveData(newState);
    io.emit('dataUpdated', newState);
  });

  socket.on('resetData', () => {
    // 💡 초기화 시에는 isReset을 true로 주어 닉네임, 길드, 출석, 그리고 Free Role 희망포지션까지 싹 비움
    const resetData = loadInitialState(false, true); 
    saveData(resetData);
    io.setItem ? null : null; // 호환용
    io.emit('dataUpdated', resetData);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
