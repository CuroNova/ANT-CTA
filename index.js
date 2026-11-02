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
const PARTIES_FILE = path.join(__dirname, 'parties.txt');
const GUILDS_FILE = path.join(__dirname, 'settings', 'guilds.txt');
const JSON_MAPPING_FILE = path.join(__dirname, 'settings', 'mapping_image.json');
const PASSWORD_FILE = path.join(__dirname, 'settings', 'password.json'); // 🔑 비밀번호 설정 파일 경로

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
app.use('/images', express.static(path.join(__dirname, 'images')));

// 📌 비밀번호 설정 파일 로드 함수 (실패 시 에러 처리 포함)
function loadPasswords() {
  try {
    if (fs.existsSync(PASSWORD_FILE)) {
      const fileContents = fs.readFileSync(PASSWORD_FILE, 'utf8');
      const passwords = JSON.parse(fileContents);
      
      if (!passwords.inviteCode || !passwords.adminCode) {
        throw new Error('password.json 내부 키값이 누락되었습니다.');
      }
      return passwords;
    } else {
      throw new Error('password.json 파일이 존재하지 않습니다.');
    }
  } catch (e) {
    console.error('❌ 암호화 설정 로드 실패:', e.message);
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

// 📌 이미지 경로 결정 함수
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
        return `/images/${imagePath}`;
      }
    }
  }

  return type === 'weapon' ? '/images/default_weapon.png' : '/images/default_armor.png';
}

// 📌 초기 데이터 로드 함수
function loadInitialState() {
  let initialSlots = [];
  let guilds = ['ANT', '드래곤길드', '크라운길드', '무소속'];
  const mappingConfig = loadMappingConfig();
  const passwords = loadPasswords();

  if (fs.existsSync(GUILDS_FILE)) {
    const rawGuilds = fs.readFileSync(GUILDS_FILE, 'utf8');
    guilds = rawGuilds.split('\n').map(g => g.trim()).filter(Boolean);
  }

  if (fs.existsSync(PARTIES_FILE)) {
    const lines = fs.readFileSync(PARTIES_FILE, 'utf8').split('\n');
    let currentParty = '';
    let partySlotCounter = 1;
    let definedParties = [];
    let slotsByParty = {};

    lines.forEach(line => {
      line = line.trim();
      if (!line) return;
      
      if (line.startsWith('[') && line.endsWith(']')) {
        currentParty = line.replace(/[[\]]/g, '');
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
        const commentText = parts[4] || '';  // 5. 코멘트
        const rawWeaponImg = parts[5] || ''; // 6. 무기 이미지 링크
        const rawArmorImg = parts[6] || '';  // 7. 갑옷 이미지 링크

        const finalWeaponImg = resolveImagePath(weaponName, rawWeaponImg, 'weapon', mappingConfig);
        const finalArmorImg = resolveImagePath(armorName, rawArmorImg, 'armor', mappingConfig);

        slotsByParty[currentParty].push({
          id: slotId,
          role: roleName,
          weaponName: weaponName,
          armorName: armorName,
          weaponImg: finalWeaponImg,
          armorImg: finalArmorImg,
          displayIndex: partySlotCounter++,
          party: currentParty,
          nickname: '',
          guild: 'ANT',
          comment: commentText,
          attended: false
        });
      }
    });

    definedParties.forEach(pName => {
      if (slotsByParty[pName] && slotsByParty[pName].length > 0) {
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
          guild: 'ANT',
          comment: '',
          attended: false
        });
      }
    });
  }

  return { 
    slots: initialSlots, 
    guilds, 
    inviteCode: passwords ? passwords.inviteCode : '1234' 
  };
}

function getData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = loadInitialState();
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf8');
    return initialData;
  }
  try {
    const content = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    const initialData = loadInitialState();
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf8');
    return initialData;
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// 📌 로그인 API (비밀번호 파일 검증 및 예외 처리 추가)
app.post('/api/login', (req, res) => {
  const { code } = req.body;
  const passwords = loadPasswords();

  if (!passwords) {
    return res.json({ 
      success: false, 
      message: '암호화 로직에 문제가 생겼습니다!', 
      redirectToLogin: true 
    });
  }

  if (code === passwords.inviteCode) {
    res.json({ success: true });
  } else {
    res.json({ success: false, message: '초대코드가 일치하지 않습니다.' });
  }
});

// 📌 관리자 인증 API (비밀번호 파일 검증 및 예외 처리 추가)
app.post('/api/admin-auth', (req, res) => {
  const { code } = req.body;
  const passwords = loadPasswords();

  if (!passwords) {
    return res.json({ 
      success: false, 
      message: '암호화 로직에 문제가 생겼습니다!', 
      redirectToLogin: true 
    });
  }

  if (code === passwords.adminCode) {
    res.json({ success: true });
  } else {
    res.json({ success: false, message: '관리자 코드가 일치하지 않습니다.' });
  }
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
      io.emit('dataUpdated', data);
    }
  });

  socket.on('resetData', () => {
    const resetData = loadInitialState();
    saveData(resetData);
    io.emit('dataUpdated', resetData);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
