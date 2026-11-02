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
const GUILDS_FILE = path.join(__dirname, 'guilds.txt');

// 🔑 코드 설정
const INVITE_CODE = '1234';          // 일반 참여자 입장용 초대코드
const ADMIN_CODE = 'admin9999';      // 🛡️ 관리자 초기화 전용 코드

app.use(express.json());

// 페이지 라우팅
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/matching', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'matching.html'));
});

// 정적 파일 및 이미지 서빙
app.use(express.static('public'));
app.use('/images', express.static(path.join(__dirname, 'images')));

// 초기 데이터 로드 함수 (parties.txt 기반 파싱)
function loadInitialState() {
  let initialSlots = [];
  let guilds = ['ANT', '드래곤길드', '크라운길드', '무소속'];

  if (fs.existsSync(GUILDS_FILE)) {
    const rawGuilds = fs.readFileSync(GUILDS_FILE, 'utf8');
    guilds = rawGuilds.split('\n').map(g => g.trim()).filter(Boolean);
  }

  if (fs.existsSync(PARTIES_FILE)) {
    const lines = fs.readFileSync(PARTIES_FILE, 'utf8').split('\n');
    let currentParty = '';
    let partySlotCounter = 1;

    lines.forEach(line => {
      line = line.trim();
      if (!line) return;
      if (line.startsWith('[') && line.endsWith(']')) {
        currentParty = line.replace(/[\[\]]/g, '');
        partySlotCounter = 1; 
      } else {
        initialSlots.push({
          id: line,
          itemCode: line.startsWith('FREEROLE') ? 'T8_MAIN_SWORD' : line, // FREE ROLE은 기본 무기 코드 지정 가능
          displayIndex: partySlotCounter++,
          party: currentParty,
          nickname: '',
          guild: 'ANT',
          comment: currentParty === 'FREE ROLE' ? '자유 롤' : '',
          attended: false
        });
      }
    });
  }

  return { slots: initialSlots, guilds, inviteCode: INVITE_CODE };
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

// 로그인 API (일반 참여자 입장용)
app.post('/api/login', (req, res) => {
  const { code } = req.body;
  const data = getData();
  if (code === (data.inviteCode || INVITE_CODE)) {
    res.json({ success: true });
  } else {
    res.json({ success: false, message: '초대코드가 일치하지 않습니다.' });
  }
});

// 🛡️ 관리자 코드 전용 인증 API
app.post('/api/admin-auth', (req, res) => {
  const { code } = req.body;
  if (code === ADMIN_CODE) {
    res.json({ success: true });
  } else {
    res.json({ success: false, message: '관리자 코드가 일치하지 않습니다.' });
  }
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
    const resetData = loadInitialState();
    saveData(resetData);
    io.emit('dataUpdated', resetData);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
