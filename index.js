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
const LOADOUTS_DIR = path.join(__dirname, 'loadouts');
const CONFIG_FILE = path.join(__dirname, 'settings', 'config.json'); 
const JSON_MAPPING_FILE = path.join(__dirname, 'settings', 'mapping_image.json');

app.use(express.json());

// 현재 활성화된 파티 파일 경로를 관리하는 변수 (기본값: brawlClap.txt)
let currentPartiesFile = path.join(LOADOUTS_DIR, 'brawlClap.txt');

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'welcome.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/matching', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'matching.html'));
});

app.use(express.static(path.join(__dirname, 'views')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/css', express.static(path.join(__dirname, 'css')));

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
    return null;
  }
}

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

function loadInitialState(disableParty3 = false) {
  let initialSlots = [];
  const mappingConfig = loadMappingConfig();
  const config = loadConfig();

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
        const slotId = parts[0] || '';       
        const roleName = parts[1] || '';     
        const weaponName = parts[2] || '';   
        const armorName = parts[3] || '';    
        const commentText = parts[4] || '';  
        const rawWeaponImg = parts[5] || ''; 
        const rawArmorImg = parts[6] || '';  

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
          guild: guilds[0] || 'ANT',
          comment: commentText,
          attended: false
        });
      }
    });

    definedParties.forEach(pName => {
      // 📌 3파티 비활성화가 켜져 있고 파티 이름에 '3'이 포함되어 있다면 슬롯을 비움(isEmptyParty: true) 처리
      const isTargetParty3 = disableParty3 && (pName.includes('3') || pName === '3파티');

      if (!isTargetParty3 && slotsByParty[pName] && slotsByParty[pName].length > 0) {
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
    isParty3Disabled: disableParty3,
    currentLoadout: path.basename(currentPartiesFile)
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

// 로그인 API
app.post('/api/login', (req, res) => {
  const { code } = req.body;
  const config = loadConfig();

  if (!config) {
    return res.json({ success: false, message: '설정 파일 로드에 문제가 생겼습니다!', redirectToLogin: true });
  }

  if (code === config.inviteCode) {
    res.json({ success: true });
  } else {
    res.json({ success: false, message: '초대코드가 일치하지 않습니다.' });
  }
});

// 관리자 인증 API
app.post('/api/admin-auth', (req, res) => {
  const { code } = req.body;
  const config = loadConfig();

  if (!config) {
    return res.json({ success: false, message: '설정 파일 로드에 문제가 생겼습니다!', redirectToLogin: true });
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
    const files = fs.readdirSync(LOADOUTS_DIR).filter(f => f.endsWith('.txt'));
    res.json({ success: true, files });
  } catch (err) {
    res.status(500).json({ success: false, message: '파일 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 📌 관리자 API: 조합(.txt) 변경
app.post('/api/admin/change-loadout', (req, res) => {
  const { filename } = req.body;
  const targetPath = path.join(LOADOUTS_DIR, filename);

  if (!fs.existsSync(targetPath)) {
    return.json({ success: false, message: '존재하지 않는 파일입니다.' });
  }

  currentPartiesFile = targetPath;
  const currentData = getData();
  const newState = loadInitialState(currentData.isParty3Disabled || false);
  newState.currentLoadout = filename;
  
  saveData(newState);
  io.emit('dataUpdated', newState);
  res.json({ success: true });
});

// 📌 관리자 API: 3파티 비활성화/활성화 토글
app.post('/api/admin/toggle-party3', (req, res) => {
  const data = getData();
  const nextState = !data.isParty3Disabled;

  const newState = loadInitialState(nextState);
  // 기존 입력된 닉네임이나 길드 선택 상태를 최대한 유지하고 싶다면 슬롯 머징 가능하지만, 
  // 요구사항에 맞춰 토글 시 파티 영역을 비활성화/활성화합니다.
  newState.currentLoadout = data.currentLoadout || 'brawlClap.txt';
  
  saveData(newState);
  io.emit('dataUpdated', newState);
  res.json({ success: true, isParty3Disabled: nextState });
});

// Socket.io 실시간 동기화
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
    const data = getData();
    const resetData = loadInitialState(data.isParty3Disabled || false);
    saveData(resetData);
    io.emit('dataUpdated', resetData);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
