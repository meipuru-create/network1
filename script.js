/* =========================================================
   共通ユーティリティ
   ========================================================= */
function makeBitCell(value, { input=false, clickable=false, parity=false, flipped=false, ok=false, subLabel=null } = {}) {
  const cell = document.createElement('div');
  cell.className = 'bit';
  if (input) cell.classList.add('is-input');
  if (clickable) cell.classList.add('is-clickable');
  if (parity) cell.classList.add('is-parity');
  if (flipped) cell.classList.add('is-flipped');
  if (ok) cell.classList.add('is-ok');
  cell.textContent = value;
  if (subLabel) {
    const sub = document.createElement('span');
    sub.style.cssText = 'position:absolute;bottom:-18px;left:0;right:0;text-align:center;font-size:10px;font-family:var(--font-mono);color:var(--ink-soft);';
    sub.textContent = subLabel;
    cell.style.position = 'relative';
    cell.appendChild(sub);
  }
  return cell;
}

function countOnes(arr) { return arr.reduce((a, b) => a + b, 0); }

/* =========================================================
   モード切り替え
   ========================================================= */
const modeButtons = document.querySelectorAll('.mode-btn');
const modePanels = { parity: document.getElementById('parity-mode'), hamming: document.getElementById('hamming-mode') };

function switchMode(mode) {
  modeButtons.forEach(b => {
    const active = b.dataset.mode === mode;
    b.classList.toggle('is-active', active);
    b.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  Object.entries(modePanels).forEach(([key, el]) => {
    el.classList.toggle('is-active', key === mode);
    el.setAttribute('aria-hidden', key === mode ? 'false' : 'true');
  });
}
modeButtons.forEach(b => b.addEventListener('click', () => switchMode(b.dataset.mode)));

/* =========================================================
   モードA：パリティチェック
   ========================================================= */
const p = {
  dataBits: [1, 0, 1, 1],
  parityType: 'even',
  fullBits: [],
  channelBits: [],
  started: false,
};

const pBitcountSel = document.getElementById('p-bitcount');
const pDataBitsEl = document.getElementById('p-data-bits');
const pFullBitsEl = document.getElementById('p-full-bits');
const pChannelBitsEl = document.getElementById('p-channel-bits');
const pReceivedBitsEl = document.getElementById('p-received-bits');
const pWireFill = document.getElementById('p-wire-fill');
const pStartBtn = document.getElementById('p-start-btn');
const pNoiseBtn = document.getElementById('p-noise-btn');
const pJudgeBtn = document.getElementById('p-judge-btn');
const pNoiseHint = document.getElementById('p-noise-hint');
const pResultBox = document.getElementById('p-result');
const pEfficiencyBar = document.getElementById('p-efficiency-bar');
const pEfficiencyValue = document.getElementById('p-efficiency-value');
const pCostValue = document.getElementById('p-cost-value');
const pToHammingBtn = document.getElementById('p-to-hamming');

function computeParityBit(bits, type) {
  const ones = countOnes(bits);
  if (type === 'even') return ones % 2 === 0 ? 0 : 1;
  return ones % 2 === 0 ? 1 : 0;
}

function pRebuildFromBitcount() {
  const n = parseInt(pBitcountSel.value, 10);
  const next = [];
  for (let i = 0; i < n; i++) next.push(p.dataBits[i] !== undefined ? p.dataBits[i] : (i % 2));
  p.dataBits = next;
  pResetTransmission();
  pRenderData();
}

function pRenderData() {
  pDataBitsEl.innerHTML = '';
  p.dataBits.forEach((v, i) => {
    const cell = makeBitCell(v, { input: true });
    cell.addEventListener('click', () => {
      p.dataBits[i] = p.dataBits[i] === 1 ? 0 : 1;
      pResetTransmission();
      pRenderData();
    });
    pDataBitsEl.appendChild(cell);
  });

  const parityBit = computeParityBit(p.dataBits, p.parityType);
  p.fullBits = [...p.dataBits, parityBit];

  pFullBitsEl.innerHTML = '';
  p.fullBits.forEach((v, i) => {
    const isParity = i === p.fullBits.length - 1;
    pFullBitsEl.appendChild(makeBitCell(v, { parity: isParity }));
  });

  pRenderTradeoff();
}

function pRenderTradeoff() {
  const m = p.dataBits.length;
  const n = p.fullBits.length;
  const efficiency = Math.round((m / n) * 100);
  pEfficiencyBar.style.width = efficiency + '%';
  pEfficiencyValue.textContent = efficiency + '%';
  pCostValue.textContent = `${n} 円（データ ${m} 円 ＋ パリティ ${n - m} 円）`;
}

function pResetTransmission() {
  p.started = false;
  p.channelBits = [];
  pWireFill.style.width = '0%';
  pChannelBitsEl.innerHTML = '';
  pReceivedBitsEl.innerHTML = '';
  pStartBtn.disabled = false;
  pNoiseBtn.disabled = true;
  pJudgeBtn.disabled = true;
  pNoiseHint.textContent = '';
  pResultBox.className = 'result-box';
  pResultBox.innerHTML = '<p class="result-status">通信スタートを押すと結果がここに表示されます</p>';
  pToHammingBtn.hidden = true;
}

function pRenderChannel() {
  const manual = document.querySelector('input[name="p-noise-mode"]:checked').value === 'manual';
  pChannelBitsEl.innerHTML = '';
  p.channelBits.forEach((v, i) => {
    const flipped = v !== p.fullBits[i];
    const cell = makeBitCell(v, { clickable: manual, flipped });
    if (manual) {
      cell.addEventListener('click', () => {
        p.channelBits[i] = p.channelBits[i] === 1 ? 0 : 1;
        pRenderChannel();
      });
    }
    pChannelBitsEl.appendChild(cell);
  });
}

pStartBtn.addEventListener('click', () => {
  p.started = true;
  p.channelBits = [...p.fullBits];
  pStartBtn.disabled = true;
  pWireFill.style.width = '100%';
  const manual = document.querySelector('input[name="p-noise-mode"]:checked').value === 'manual';
  setTimeout(() => {
    pRenderChannel();
    pJudgeBtn.disabled = false;
    if (manual) {
      pNoiseBtn.disabled = true;
      pNoiseHint.textContent = '上のビットを直接クリックすると反転します。';
    } else {
      pNoiseBtn.disabled = false;
      pNoiseHint.textContent = '';
    }
  }, 1150);
});

pNoiseBtn.addEventListener('click', () => {
  const mode = document.querySelector('input[name="p-noise-mode"]:checked').value;
  const count = mode === 'random2' ? 2 : 1;
  const n = p.fullBits.length;
  p.channelBits = [...p.fullBits];
  const idxs = new Set();
  while (idxs.size < Math.min(count, n)) idxs.add(Math.floor(Math.random() * n));
  idxs.forEach(i => { p.channelBits[i] = p.channelBits[i] === 1 ? 0 : 1; });
  pRenderChannel();
});

document.querySelectorAll('input[name="p-noise-mode"]').forEach(r => r.addEventListener('change', () => {
  if (p.started) {
    p.channelBits = [...p.fullBits];
    pRenderChannel();
    const manual = r.form ? false : false;
    const isManual = document.querySelector('input[name="p-noise-mode"]:checked').value === 'manual';
    pNoiseBtn.disabled = isManual;
    pNoiseHint.textContent = isManual ? '上のビットを直接クリックすると反転します。' : '';
  }
}));

pJudgeBtn.addEventListener('click', () => {
  pReceivedBitsEl.innerHTML = '';
  p.channelBits.forEach(v => pReceivedBitsEl.appendChild(makeBitCell(v)));

  const actualFlips = p.channelBits.reduce((acc, v, i) => acc + (v !== p.fullBits[i] ? 1 : 0), 0);

  pResultBox.className = 'result-box';
  pToHammingBtn.hidden = true;

  if (actualFlips === 0) {
    pResultBox.classList.add('state-ok');
    pResultBox.innerHTML = '<p class="result-status">✅ データ正常受信</p><p class="result-reason">通信中にビットの反転は起こらなかった。</p>';
  } else if (actualFlips % 2 === 1) {
    pResultBox.classList.add('state-detected');
    pResultBox.innerHTML = `<p class="result-status">⚠️ 誤りを検出（${actualFlips} ビット反転）</p><p class="result-reason">奇数個のビットが反転すると、受信データの1の個数の偶奇が変わるためパリティチェックで検出できる。ここではデータの再送を要求する。</p>`;
  } else {
    pResultBox.classList.add('state-missed');
    pResultBox.innerHTML = `<p class="result-status">❌ 誤り見逃し（${actualFlips} ビット反転）</p><p class="result-reason">偶数個のビットが同時に反転すると、1の個数の偶奇は変わらないためパリティチェックをすり抜けてしまう。これがパリティ方式の限界。</p>`;
    pToHammingBtn.hidden = false;
  }
});

pToHammingBtn.addEventListener('click', () => {
  hBitcountSel.value = String(p.dataBits.length);
  h.dataBits = [...p.dataBits];
  switchMode('hamming');
  hRenderAll();
});

pBitcountSel.addEventListener('change', pRebuildFromBitcount);
document.querySelectorAll('input[name="p-parity"]').forEach(r => r.addEventListener('change', () => {
  p.parityType = document.querySelector('input[name="p-parity"]:checked').value;
  pResetTransmission();
  pRenderData();
}));

pRebuildFromBitcount();

/* =========================================================
   モードB：ハミング符号
   ========================================================= */
const h = { dataBits: [1, 0, 1, 1], code: [], n: 0, parityPositions: [], dataPositions: [], channelCode: [], started: false };

const hBitcountSel = document.getElementById('h-bitcount');
const hDataBitsEl = document.getElementById('h-data-bits');
const hCodeBitsEl = document.getElementById('h-code-bits');
const hGroupLegend = document.getElementById('h-group-legend');
const hChannelBitsEl = document.getElementById('h-channel-bits');
const hWireFill = document.getElementById('h-wire-fill');
const hStartBtn = document.getElementById('h-start-btn');
const hResetNoiseBtn = document.getElementById('h-reset-noise-btn');
const hFlipCountEl = document.getElementById('h-flip-count');
const hCheckList = document.getElementById('h-check-list');
const hSyndromeBox = document.getElementById('h-syndrome-box');
const hSyndromeBin = document.getElementById('h-syndrome-bin');
const hSyndromeDec = document.getElementById('h-syndrome-dec');
const hFixedBitsEl = document.getElementById('h-fixed-bits');
const hResultBox = document.getElementById('h-result');

function buildHamming(dataBits) {
  const m = dataBits.length;
  let r = 1;
  while (Math.pow(2, r) < m + r + 1) r++;
  const n = m + r;
  const parityPositions = [];
  for (let k = 0; k < r; k++) parityPositions.push(Math.pow(2, k));
  const dataPositions = [];
  for (let pos = 1; pos <= n; pos++) if (!parityPositions.includes(pos)) dataPositions.push(pos);

  const code = new Array(n + 1).fill(0); // 1-indexed, index 0 unused
  dataPositions.forEach((pos, i) => { code[pos] = dataBits[i]; });

  parityPositions.forEach(pPos => {
    let x = 0;
    dataPositions.forEach(pos => { if ((pos & pPos) !== 0) x ^= code[pos]; });
    code[pPos] = x;
  });

  return { n, code, parityPositions, dataPositions };
}

function hCheckSyndrome(code, parityPositions, n) {
  const flags = [];
  let syndrome = 0;
  parityPositions.slice().sort((a, b) => b - a).forEach(pPos => {
    let x = 0;
    for (let pos = 1; pos <= n; pos++) if ((pos & pPos) !== 0) x ^= code[pos];
    flags.push({ pPos, bad: x !== 0 });
    if (x !== 0) syndrome += pPos;
  });
  return { flags, syndrome };
}

function hRebuildFromBitcount() {
  const m = parseInt(hBitcountSel.value, 10);
  const next = [];
  for (let i = 0; i < m; i++) next.push(h.dataBits[i] !== undefined ? h.dataBits[i] : (i % 2));
  h.dataBits = next;
  hResetChannel();
  hRenderAll();
}

function hRenderAll() {
  hDataBitsEl.innerHTML = '';
  h.dataBits.forEach((v, i) => {
    const cell = makeBitCell(v, { input: true });
    cell.addEventListener('click', () => {
      h.dataBits[i] = h.dataBits[i] === 1 ? 0 : 1;
      hResetChannel();
      hRenderAll();
    });
    hDataBitsEl.appendChild(cell);
  });

  const built = buildHamming(h.dataBits);
  h.n = built.n; h.code = built.code; h.parityPositions = built.parityPositions; h.dataPositions = built.dataPositions;

  hCodeBitsEl.innerHTML = '';
  for (let pos = 1; pos <= h.n; pos++) {
    const isParity = h.parityPositions.includes(pos);
    const dLabel = isParity ? ('P' + pos) : ('D' + (h.dataPositions.indexOf(pos) + 1));
    hCodeBitsEl.appendChild(makeBitCell(h.code[pos], { parity: isParity, subLabel: dLabel }));
  }
  hCodeBitsEl.style.marginBottom = '18px';

  hGroupLegend.innerHTML = '';
  h.parityPositions.forEach(pPos => {
    const covered = [];
    for (let pos = 1; pos <= h.n; pos++) if ((pos & pPos) !== 0) covered.push(pos);
    const item = document.createElement('div');
    item.className = 'group-legend-item';
    item.textContent = `P${pPos} が担当するグループ：位置 ${covered.join(', ')}`;
    hGroupLegend.appendChild(item);
  });
}

function hResetChannel() {
  h.started = false;
  h.channelCode = [];
  hWireFill.style.width = '0%';
  hChannelBitsEl.innerHTML = '';
  hStartBtn.disabled = false;
  hResetNoiseBtn.disabled = true;
  hFlipCountEl.textContent = '0';
  hCheckList.innerHTML = '';
  hSyndromeBox.hidden = true;
  hFixedBitsEl.innerHTML = '';
  hResultBox.className = 'result-box';
  hResultBox.innerHTML = '<p class="result-status">送信スタートを押すと結果がここに表示されます</p>';
}

function hRenderChannel() {
  hChannelBitsEl.innerHTML = '';
  for (let pos = 1; pos <= h.n; pos++) {
    const flipped = h.channelCode[pos] !== h.code[pos];
    const cell = makeBitCell(h.channelCode[pos], { clickable: true, flipped });
    cell.addEventListener('click', () => {
      h.channelCode[pos] = h.channelCode[pos] === 1 ? 0 : 1;
      hRenderChannel();
      hEvaluate();
    });
    hChannelBitsEl.appendChild(cell);
  }
  const flipCount = h.channelCode.reduce((acc, v, i) => i === 0 ? acc : acc + (v !== h.code[i] ? 1 : 0), 0);
  hFlipCountEl.textContent = flipCount;
  hResetNoiseBtn.disabled = flipCount === 0;
}

function hEvaluate() {
  const { flags, syndrome } = hCheckSyndrome(h.channelCode, h.parityPositions, h.n);

  hCheckList.innerHTML = '';
  flags.forEach(f => {
    const item = document.createElement('div');
    item.className = 'check-item ' + (f.bad ? 'is-error' : 'is-ok');
    const flag = document.createElement('span');
    flag.className = 'check-flag';
    flag.textContent = f.bad ? '1' : '0';
    const text = document.createElement('span');
    text.textContent = `P${f.pPos} のグループ　${f.bad ? '異常！' : '正常'}`;
    item.appendChild(flag); item.appendChild(text);
    hCheckList.appendChild(item);
  });

  const actualFlips = h.channelCode.reduce((acc, v, i) => i === 0 ? acc : acc + (v !== h.code[i] ? 1 : 0), 0);

  if (syndrome === 0) {
    hSyndromeBox.hidden = true;
    hFixedBitsEl.innerHTML = '';
    h.channelCode.slice(1).forEach((v, i) => hFixedBitsEl.appendChild(makeBitCell(v, { parity: h.parityPositions.includes(i + 1) })));
    hResultBox.className = 'result-box';
    if (actualFlips === 0) {
      hResultBox.classList.add('state-ok');
      hResultBox.innerHTML = '<p class="result-status">✅ 誤りなし、データ正常受信</p>';
    } else {
      hResultBox.classList.add('state-missed');
      hResultBox.innerHTML = `<p class="result-status">❌ 誤り見逃し（${actualFlips} ビット同時反転）</p><p class="result-reason">複数ビットが特定の組み合わせで同時に反転すると、検査ビットの結果が偶然すべて一致してしまい、ハミング符号でも検出できないことがある。</p>`;
    }
    return;
  }

  const bin = flags.map(f => (f.bad ? '1' : '0')).join('');
  hSyndromeBox.hidden = false;
  hSyndromeBin.textContent = bin;
  hSyndromeDec.textContent = syndrome;

  const fixed = [...h.channelCode];
  const posValid = syndrome <= h.n;
  if (posValid) fixed[syndrome] = fixed[syndrome] === 1 ? 0 : 1;

  hFixedBitsEl.innerHTML = '';
  for (let pos = 1; pos <= h.n; pos++) {
    const isParity = h.parityPositions.includes(pos);
    const corrected = posValid && pos === syndrome;
    hFixedBitsEl.appendChild(makeBitCell(fixed[pos], { parity: isParity, ok: corrected }));
  }

  const fixedData = h.dataPositions.map(pos => fixed[pos]);
  const matches = JSON.stringify(fixedData) === JSON.stringify(h.dataBits);

  hResultBox.className = 'result-box';
  if (actualFlips === 1) {
    hResultBox.classList.add('state-ok');
    hResultBox.innerHTML = `<p class="result-status">✅ ${syndrome} 番目のビットの誤りを特定し、自動で訂正した</p><p class="result-reason">パリティ方式では検出しかできなかったが、ハミング符号では誤りの位置まで特定して直せる。</p>`;
  } else if (matches) {
    hResultBox.classList.add('state-detected');
    hResultBox.innerHTML = `<p class="result-status">⚠️ ${actualFlips} ビット反転したが、偶然データは一致した</p><p class="result-reason">${syndrome} 番目を訂正した結果、たまたま元のデータと同じ値に戻った。</p>`;
  } else {
    hResultBox.classList.add('state-missed');
    hResultBox.innerHTML = `<p class="result-status">❌ 誤った場所を「訂正」してしまった（${actualFlips} ビット同時反転）</p><p class="result-reason">ハミング符号は1ビットの誤りしか正しく訂正できない。2ビット以上が同時に反転すると、検査ビットの組み合わせが別の位置の誤りだと誤認識し、間違った場所を書き換えてしまう。</p>`;
  }
}

hStartBtn.addEventListener('click', () => {
  h.started = true;
  h.channelCode = [...h.code];
  hStartBtn.disabled = true;
  hWireFill.style.width = '100%';
  setTimeout(() => {
    hRenderChannel();
    hEvaluate();
  }, 1150);
});

hResetNoiseBtn.addEventListener('click', () => {
  h.channelCode = [...h.code];
  hRenderChannel();
  hEvaluate();
});

hBitcountSel.addEventListener('change', hRebuildFromBitcount);

hRebuildFromBitcount();
