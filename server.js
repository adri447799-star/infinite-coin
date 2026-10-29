const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
app.use(express.static('public'));
app.get('/health', (_req, res) => res.json({ ok: true, game: 'MOEDACRAFT' }));

const rooms = new Map();
const cleanName = (s) => String(s || '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 18) || 'Jogador';
const roomCode = () => crypto.randomBytes(3).toString('hex').toUpperCase();

function publicState(room) {
  return {
    code: room.code,
    players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, connected: p.connected })),
    round: room.round,
    status: room.status,
    choices: room.players.map(p => ({ id: p.id, ready: Boolean(p.choice) })),
    result: room.result,
    history: room.history.slice(-8),
    message: room.message
  };
}
function emitRoom(room) { io.to(room.code).emit('state', publicState(room)); }
function getPlayer(socket, room) { return room.players.find(p => p.id === socket.id); }

io.on('connection', socket => {
  socket.on('createRoom', ({ name } = {}, cb = () => {}) => {
    let code = roomCode(); while (rooms.has(code)) code = roomCode();
    const room = { code, players: [{ id: socket.id, name: cleanName(name), score: 0, choice: null, connected: true }], round: 1, status: 'waiting', result: null, history: [], message: 'Esperando o rival entrar...' };
    rooms.set(code, room); socket.join(code); socket.data.roomCode = code;
    cb({ ok: true, code, playerId: socket.id }); emitRoom(room);
  });

  socket.on('joinRoom', ({ code, name } = {}, cb = () => {}) => {
    code = String(code || '').trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return cb({ ok: false, error: 'Sala não encontrada. Confere o código com teu amigo.' });
    if (room.players.length >= 2) return cb({ ok: false, error: 'Essa sala já está cheia.' });
    if (room.players.some(p => p.id === socket.id)) return cb({ ok: true, code, playerId: socket.id });
    room.players.push({ id: socket.id, name: cleanName(name), score: 0, choice: null, connected: true });
    room.status = 'playing'; room.message = 'Os dois chegaram. Escolham cara ou coroa!';
    socket.join(code); socket.data.roomCode = code;
    cb({ ok: true, code, playerId: socket.id }); emitRoom(room);
  });

  socket.on('choose', (choice, cb = () => {}) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room) return cb({ ok: false, error: 'Sala inválida.' });
    if (room.players.length !== 2) return cb({ ok: false, error: 'Ainda falta o outro jogador.' });
    if (!['cara', 'coroa'].includes(choice)) return cb({ ok: false, error: 'Escolha inválida.' });
    if (room.status !== 'playing' || room.result) return cb({ ok: false, error: 'A rodada ainda não pode começar.' });
    const player = getPlayer(socket, room);
    if (!player) return cb({ ok: false, error: 'Você não faz parte desta sala.' });
    if (player.choice) return cb({ ok: false, error: 'Você já escolheu nesta rodada.' });
    player.choice = choice;
    room.message = room.players.every(p => p.choice) ? 'As escolhas foram feitas. A moeda vai voar!' : `${player.name} escolheu. Esperando o rival...`;
    if (room.players.every(p => p.choice)) {
      const outcome = crypto.randomInt(0, 2) === 0 ? 'cara' : 'coroa';
      const winners = room.players.filter(p => p.choice === outcome);
      winners.forEach(p => p.score++);
      room.result = { outcome, winners: winners.map(p => p.id), choices: room.players.map(p => ({ id: p.id, name: p.name, choice: p.choice, correct: p.choice === outcome })) };
      room.history.push({ round: room.round, outcome, players: room.result.choices.map(c => ({ name: c.name, choice: c.choice, correct: c.correct })) });
      room.message = winners.length === 2 ? 'EMPATE! Os dois acertaram!' : winners.length === 1 ? `${winners[0].name} levou essa rodada!` : 'A moeda enganou os dois. Ninguém pontua!';
    }
    cb({ ok: true }); emitRoom(room);
  });

  socket.on('nextRound', (cb = () => {}) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room) return cb({ ok: false, error: 'Sala inválida.' });
    if (room.players.length !== 2 || !room.result) return cb({ ok: false, error: 'A rodada ainda não terminou.' });
    room.round++;
    room.players.forEach(p => p.choice = null);
    room.result = null; room.status = 'playing'; room.message = 'Nova rodada! Façam suas apostas.';
    cb({ ok: true }); emitRoom(room);
  });

  socket.on('resetMatch', (cb = () => {}) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room) return cb({ ok: false, error: 'Sala inválida.' });
    room.players.forEach(p => { p.score = 0; p.choice = null; });
    room.round = 1; room.result = null; room.history = [];
    room.status = room.players.length === 2 ? 'playing' : 'waiting';
    room.message = room.players.length === 2 ? 'Nova partida! Escolham cara ou coroa.' : 'Esperando o rival entrar...';
    cb({ ok: true }); emitRoom(room);
  });

  socket.on('disconnect', () => {
    const code = socket.data.roomCode; const room = rooms.get(code);
    if (!room) return;
    const p = room.players.find(p => p.id === socket.id);
    if (p) p.connected = false;
    room.message = `${p ? p.name : 'Um jogador'} desconectou. A sala fica aberta até vocês recarregarem ou criarem outra.`;
    emitRoom(room);
    // Keep room for a while so the remaining player can see what happened; clean up empty rooms.
    if (room.players.every(p => !p.connected)) setTimeout(() => { if (rooms.get(code) === room && room.players.every(p => !p.connected)) rooms.delete(code); }, 60000);
  });
});

server.listen(PORT, '0.0.0.0', () => console.log(`MOEDACRAFT rodando na porta ${PORT}`));
