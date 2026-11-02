const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const INVITE_CODE = "anotherguild2026";

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'your_password',
  database: 'guild_matching'
};

let db;
async function initDB() {
  db = await mysql.createPool(dbConfig);
}

const loginFailures = {};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'curo_nova_secret_key',
  resave: false,
  saveUninitialized: true
}));

function parsePartiesFile() {
  const filePath = path.join(__dirname, 'parties.txt');
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  let parties = [];
  let currentPartyNum = 0;
  let currentPartySlots = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    if (line.startsWith('[') && line.endsWith(']')) {
      if (currentPartyNum > 0) {
        parties.push({ partyNum: currentPartyNum, slots: currentPartySlots });
      }
      const match = line.match(/\d+/);
      currentPartyNum = match ? parseInt(match[0]) : parties.length + 1;
      currentPartySlots = [];
    } else {
      const parts = line.split('|').map(p => p.trim());
      const weaponName = parts[0] || '무기';
      const armorName = parts[1] || '갑옷';
      const defaultNickname = parts[2] || '';
      const defaultComment = parts[3] || '';
      const imageUrl = (parts[4] && parts[4].startsWith('http')) 
        ? parts[4] 
        : 'https://render.albiononline.com/v1/item/T8_MAIN_SWORD@4';

      const slotIndex = currentPartySlots.length + 1;
      const slotId = `P${currentPartyNum}U${String(slotIndex).padStart(2, '0')}`;

      currentPartySlots.push({
        slotId,
        partyNum: currentPartyNum,
        weaponName,
        armorName,
        defaultNickname,
        defaultComment,
        imageUrl
      });
    }
  }
  if (currentPartyNum > 0 && currentPartySlots.length > 0) {
    parties.push({ partyNum: currentPartyNum, slots: currentPartySlots });
  }
  return parties;
}

function getGuildsList() {
  const filePath = path.join(__dirname, 'guilds.txt');
  let guilds = ['ANT'];
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').map(l => l.trim()).filter(l => l);
    for (let g of lines) {
      if (!guilds.includes(g)) guilds.push(g);
    }
  }
  return guilds;
}

async function syncSlotsToDB() {
  const parties = parsePartiesFile();
  for (const party of parties) {
    for (const slot of party.slots) {
      const [rows] = await db.execute('SELECT * FROM party_slots WHERE slot_id = ?', [slot.slotId]);
      if (rows.length === 0) {
        await db.execute(
          'INSERT INTO party_slots (slot_id, party_num, guild, nickname, comment, attendance) VALUES (?, ?, ?, ?, ?, ?)',
          [slot.slotId, slot.partyNum, 'ANT', slot.defaultNickname, slot.defaultComment, 0]
        );
      }
    }
  }
}

app.post('/api/login', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const { code } = req.body;

  const now = Date.now();
  if (loginFailures[ip] && loginFailures[ip].blockUntil > now) {
    const remainingSec = Math.ceil((loginFailures[ip].blockUntil - now) / 1000);
    return res.status(429).json({ success: false, message: `접속이 제한되었습니다. ${remainingSec}초 후 다시 시도하세요.` });
  }

  if (code === INVITE_CODE) {
    delete loginFailures[ip];
    req.session.isLoggedIn = true;
    return res.json({ success: true });
  } else {
    if (!loginFailures[ip]) {
      loginFailures[ip] = { count: 0, blockUntil: 0 };
    }
    loginFailures[ip].count += 1;

    if (loginFailures[ip].count >= 5) {
      loginFailures[ip].blockUntil = now + 60 * 1000;
      loginFailures[ip].count = 0;
      return res.status(429).json({ success: false, message: '초대코드를 5회 이상 틀려 1분간 접속이 차단됩니다.' });
    }

    const remain = 5 - loginFailures[ip].count;
    return res.status(401).json({ success: false, message: `초대코드가 틀렸습니다. (남은 기회: ${remain}회)` });
  }
});

app.get('/api/matching-data', async (req, res) => {
  if (!req.session.isLoggedIn) {
    return res.status(403).json({ success: false, message: '인증이 필요합니다.' });
  }

  const parties = parsePartiesFile();
  const guilds = getGuildsList();

  const [dbRows] = await db.execute('SELECT * FROM party_slots');
  const dbDataMap = {};
  dbRows.forEach(row => {
    if (!guilds.includes(row.guild)) {
      row.guild = 'ANT';
      db.execute('UPDATE party_slots SET guild = ? WHERE slot_id = ?', ['ANT', row.slot_id]);
    }
    dbDataMap[row.slot_id] = row;
  });

  const resultParties = parties.map(party => {
    let filledCount = 0;
    const slots = party.slots.map(slot => {
      const liveData = dbDataMap[slot.slotId] || {
        guild: 'ANT',
        nickname: slot.defaultNickname,
        comment: slot.defaultComment,
        attendance: 0,
        updated_at: '-'
      };

      if (liveData.nickname && liveData.nickname.trim() !== '') {
        filledCount++;
      }

      return {
        ...slot,
        guild: liveData.guild,
        nickname: liveData.nickname,
        comment: liveData.comment,
        attendance: liveData.attendance,
        updated_at: liveData.updated_at
      };
    });

    return {
      partyNum: party.partyNum,
      filledCount,
      totalCount: slots.length,
      slots
    };
  });

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  res.json({
    success: true,
    clientIp,
    guilds,
    parties: resultParties
  });
});

io.on('connection', (socket) => {
  socket.on('update-slot', async (data) => {
    let { slotId, field, value } = data;
    
    if (field === 'nickname' && value.length > 30) return;

    if (field === 'guild') {
      const guilds = getGuildsList();
      if (!guilds.includes(value)) {
        value = 'ANT';
      }
    }

    try {
      await db.execute(`UPDATE party_slots SET ${field} = ? WHERE slot_id = ?`, [value, slotId]);
      io.emit('refresh-data');
    } catch (err) {
      console.error(err);
    }
  });
});

initDB().then(() => {
  syncSlotsToDB();
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});