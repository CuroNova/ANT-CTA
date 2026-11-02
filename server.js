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

app.use(express.static('public'));
app.use(express.json());

// Initialize data.json if it doesn't exist
function loadInitialState() {
  let initialSlots = [];
  let guilds = ['길드 A', '길드 B', '길드 C'];

  // Load guilds if file exists
  if (fs.existsSync(GUILDS_FILE)) {
    const rawGuilds = fs.readFileSync(GUILDS_FILE, 'utf8');
    guilds = rawGuilds.split('\n').map(g => g.trim()).filter(Boolean);
  }

  // Load parties structure from parties.txt if exists
  if (fs.existsSync(PARTIES_FILE)) {
    const lines = fs.readFileSync(PARTIES_FILE, 'utf8').split('\n');
    let currentParty = '';
    lines.forEach(line => {
      line = line.trim();
      if (!line) return;
      if (line.startsWith('[') && line.endsWith(']')) {
        currentParty = line.replace(/[\[\]]/g, '');
      } else {
        initialSlots.push({
          id: line,
          party: currentParty,
          nickname: '',
          guild: '',
          comment: '',
          status: 'pending' // pending, joined, absent
        });
      }
    });
  } else {
    // Default fallback structure
    for (let p = 1; p <= 4; p++) {
      for (let u = 1; u <= 5; u++) {
        const id = `P${p}U${u < 10 ? '0' + u : u}`;
        initialSlots.push({
          id,
          party: `파티 ${p}`,
          nickname: '',
          guild: '',
          comment: '',
          status: 'pending'
        });
      }
    }
  }

  return { slots: initialSlots, guilds };
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

// API Routes
app.get('/api/data', (req, res) => {
  res.json(getData());
});

app.post('/api/reset', (req, res) => {
  const resetData = loadInitialState();
  saveData(resetData);
  io.emit('dataUpdated', resetData);
  res.json({ success: true, message: '초기화되었습니다.' });
});

// Socket.io Real-time connection
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
