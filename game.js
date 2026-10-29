(() => {
  const socket = io();
  const $ = id => document.getElementById(id);
  const lobby = $('lobby'), game = $('game');
  let myId = null, currentRoom = null, lastResultKey = '', flipTimer = null;
  const showToast = msg => { const el = $('toast'); el.textContent = msg; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2400); };
  const setError = msg => $('lobbyError').textContent = msg || '';
  const nameValue = () => $('playerName').value.trim() || 'Jogador';
  function enterGame(code, playerId) { myId = playerId; currentRoom = code; lobby.classList.add('hidden'); game.classList.remove('hidden'); $('roomCodeLabel').textContent = code; window.scrollTo({top:0,behavior:'smooth'}); }
  $('createBtn').addEventListener('click', () => { setError(''); socket.emit('createRoom', {name:nameValue()}, res => { if (!res?.ok) return setError('Não foi possível criar a sala.'); enterGame(res.code, res.playerId); }); });
  $('joinBtn').addEventListener('click', () => { setError(''); const code = $('roomCode').value.trim().toUpperCase(); if (!code) return setError('Coloca o código que teu amigo te mandou.'); socket.emit('joinRoom', {code, name:nameValue()}, res => { if (!res?.ok) return setError(res?.error || 'Não foi possível entrar.'); enterGame(res.code, res.playerId); }); });
  $('roomCode').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6); });
  $('copyBtn').addEventListener('click', async () => { try { await navigator.clipboard.writeText(currentRoom); showToast('Código copiado! Manda pro Caio.'); } catch { showToast('Código da sala: ' + currentRoom); } });
  document.querySelectorAll('.choice-btn').forEach(btn => btn.addEventListener('click', () => { if (!currentRoom) return; socket.emit('choose', btn.dataset.choice, res => { if (!res?.ok) showToast(res?.error || 'Não deu para registrar a escolha.'); }); }));
  $('nextBtn').addEventListener('click', () => socket.emit('nextRound', res => { if (!res?.ok) showToast(res?.error || 'Erro ao avançar rodada.'); }));
  $('resetBtn').addEventListener('click', () => { if (confirm('Zerar o placar e o histórico da partida?')) socket.emit('resetMatch', res => { if (!res?.ok) showToast(res?.error || 'Erro ao reiniciar.'); }); });
  socket.on('connect', () => { $('connectionStatus').classList.remove('waiting'); $('connectionStatus').innerHTML = '<i></i> CONECTADO'; });
  socket.on('disconnect', () => { $('connectionStatus').classList.add('waiting'); $('connectionStatus').innerHTML = '<i></i> RECONectando'; });
  socket.on('state', state => {
    if (currentRoom && state.code !== currentRoom) return;
    currentRoom = state.code; $('roomCodeLabel').textContent = state.code;
    $('roundNum').textContent = state.round;
    const myIndex = state.players.findIndex(p => p.id === myId);
    state.players.forEach((p, i) => {
      $('playerName'+i).textContent = p.name + (p.id === myId ? ' (VOCÊ)' : '');
      $('score'+i).textContent = p.score;
      const status = $('choiceStatus'+i);
      const c = state.choices.find(x => x.id === p.id);
      if (!p.connected) { status.textContent = 'DESCONECTADO'; status.style.color = '#ff8bb4'; }
      else if (state.result) { const resultChoice = state.result.choices.find(x => x.id === p.id); status.textContent = resultChoice.choice.toUpperCase() + (resultChoice.correct ? ' ✓' : ' ✕'); status.style.color = resultChoice.correct ? '#83f3c4' : '#ff8bb4'; }
      else if (c?.ready) { status.textContent = p.id === myId ? 'SUA ESCOLHA FEITA' : 'ESCOLHA FEITA'; status.style.color = '#ffd56c'; }
      else { status.textContent = 'AGUARDANDO'; status.style.color = ''; }
      $('playerCard'+i).style.opacity = p.connected ? '1' : '.55';
    });
    if (state.players.length < 2) { $('playerName1').textContent = 'Esperando...'; $('score1').textContent = '—'; $('choiceStatus1').textContent = 'SEM RIVAL'; }
    $('gameMessage').textContent = state.message || '';
    const myChoice = myIndex >= 0 ? state.choices.find(c => c.id === myId)?.ready : false;
    document.querySelectorAll('.choice-btn').forEach(btn => { btn.disabled = state.players.length !== 2 || Boolean(myChoice) || Boolean(state.result) || state.status !== 'playing'; btn.classList.toggle('selected', Boolean(myChoice) && !state.result); });
    $('nextBtn').classList.toggle('hidden', !state.result);
    $('resetBtn').classList.toggle('hidden', state.players.length < 2);
    $('resultBanner').classList.toggle('hidden', !state.result);
    if (state.result) {
      $('resultBanner').textContent = state.result.outcome === 'cara' ? '✦ DEU CARA ✦' : '✦ DEU COROA ✦';
      const key = state.code + '-' + state.round;
      if (lastResultKey !== key) { lastResultKey = key; const coin = $('coin'); coin.classList.remove('flipping'); void coin.offsetWidth; coin.classList.add('flipping'); clearTimeout(flipTimer); flipTimer = setTimeout(() => { coin.classList.remove('flipping'); coin.style.transform = state.result.outcome === 'coroa' ? 'rotateY(180deg)' : 'rotateY(0deg)'; }, 1600); }
    } else { lastResultKey = ''; $('resultBanner').classList.add('hidden'); $('coin').classList.remove('flipping'); $('coin').style.transform = 'rotateY(0deg)'; }
    const history = [...state.history].reverse(); $('historyCount').textContent = `${state.history.length} / 8`;
    $('historyList').innerHTML = history.length ? history.map(item => {
      const me = item.players.find(p => p.name === (state.players.find(x => x.id === myId)?.name));
      const result = item.outcome.toUpperCase();
      const outcomeText = item.players.map(p => `${escapeHtml(p.name)}: ${p.choice.toUpperCase()} ${p.correct ? '✓' : '✕'}`).join(' · ');
      return `<div class="history-item"><div class="history-round">R${item.round}</div><div class="history-info">${outcomeText}</div><div class="history-result">${result}</div></div>`;
    }).join('') : '<div class="empty-history">A história ainda não foi escrita.</div>';
    if (state.status === 'waiting') $('gameMessage').textContent = state.message || 'Esperando o rival entrar...';
  });
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
})();
