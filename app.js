const $ = id => document.getElementById(id);

let activePackage = null;
let currentIndex = 0;
let score = 0;
let secondsLeft = 90;
let timerId = null;
let answered = new Set();
let optionCache = new Map();
let effectTimeout = null;

const allQuestions = () => activePackage.items;
const allAnswers = [...new Set(PACKAGES.flatMap(pack => pack.items.map(item => item.answer)))];

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function stopTimer() {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
}

function updateTimerDisplay() {
  const shownSeconds = secondsLeft;
  const minutes = Math.floor(shownSeconds / 60);
  const remainder = shownSeconds % 60;
  $('timer').textContent = `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  $('timer').classList.toggle('urgent', shownSeconds <= 10);
  $('timerLabel').textContent = 'WAKTU TERSISA';
}

function drawPackages() {
  $('packages').innerHTML = PACKAGES.map(pack => `
    <button class="pack" type="button" data-package="${pack.id}">
      <b>🇮🇩 ${escapeHTML(pack.title)}</b>
      <p>${pack.items.length} pertanyaan</p>
      <small>1 menit 30 detik untuk semua soal</small>
    </button>
  `).join('');

  $('packages').querySelectorAll('[data-package]').forEach(button => {
    button.addEventListener('click', () => openPackage(Number(button.dataset.package)));
  });
}

function openPackage(id) {
  stopTimer();
  activePackage = PACKAGES.find(pack => pack.id === id);
  if (!activePackage) return;

  currentIndex = 0;
  score = 0;
  secondsLeft = 90;
  answered = new Set();
  optionCache = new Map();

  $('score').textContent = '0';
  $('packTitle').textContent = activePackage.title;
  $('packLabel').textContent = `PAKET ${String(id).padStart(2, '0')}`;
  $('desc').textContent = `${activePackage.items.length} soal • semua soal menggunakan satu timer 1 menit 30 detik yang terus berjalan.`;
  $('home').classList.add('hide');
  $('quiz').classList.remove('hide');
  $('quiz').classList.remove('fade');
  void $('quiz').offsetWidth;
  $('quiz').classList.add('fade');
  renderQuestion();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getOptions(question) {
  if (!optionCache.has(question.number)) {
    const distractors = shuffle(allAnswers.filter(answer => answer !== question.answer)).slice(0, 3);
    optionCache.set(question.number, shuffle([question.answer, ...distractors]));
  }
  return optionCache.get(question.number);
}

function startMainTimer() {
  if (timerId !== null || secondsLeft <= 0) return;
  timerMode = 'main';
  updateTimerDisplay();

  timerId = setInterval(() => {
    secondsLeft -= 1;
    updateTimerDisplay();

    if (secondsLeft <= 0) {
      stopTimer();
      expireGame();
    }
  }, 1000);
}

function expireGame() {
  stopTimer();
  $('finish').classList.remove('hide', 'sweep');
  $('finish').querySelector('h2').textContent = 'LELET BANGET SUMPAH LO';
  $('summary').textContent = 'Waktu kamu habis. Yuk, coba lagi dari menu utama!';
  $('continue').classList.add('hide');
  $('homeBtn').textContent = 'Kembali ke menu utama';
  $('quiz').classList.add('hide');
  $('home').classList.remove('hide');
  void $('finish').offsetWidth;
  $('finish').classList.add('sweep');
  if (effectTimeout) clearTimeout(effectTimeout);
  effectTimeout = setTimeout(() => {
    $('finish').classList.add('hide');
    $('continue').classList.remove('hide');
    $('homeBtn').textContent = 'Semua paket';
    $('finish').querySelector('h2').textContent = 'Tetap Semangat!';
  }, 3000);
}


function renderQuestion() {
  const question = activePackage.items[currentIndex];
  // Semua soal memakai satu timer bersama selama 90 detik.
  // Timer tidak di-reset atau dihentikan ketika berpindah/menjawab soal.
  startMainTimer();
  updateTimerDisplay();

  $('level').textContent = question.difficulty.toUpperCase();
  $('level').className = `pill ${question.difficulty}`;
  $('num').textContent = `Soal #${question.number}`;
  $('points').textContent = `${question.points} poin`;
  $('question').textContent = question.question;
  $('progress').textContent = `Soal ${currentIndex + 1} dari ${activePackage.items.length}`;
  $('batch').textContent = 'Waktu berjalan · 01:30';
  $('bar').style.width = `${((currentIndex + 1) / activePackage.items.length) * 100}%`;
  $('left').textContent = `Sisa ${activePackage.items.length - currentIndex - 1} soal`;

  $('feedback').className = 'hide';
  $('feedback').textContent = '';
  $('correctAnswer').textContent = `Jawaban benar: ${question.answer}`;
  $('correctAnswer').classList.add('hide');

  $('choices').innerHTML = getOptions(question).map((answer, index) => `
    <button class="choice" type="button">
      <b>${'ABCD'[index]}</b><span>${escapeHTML(answer)}</span>
    </button>
  `).join('');

  $('choices').querySelectorAll('.choice').forEach(button => {
    button.addEventListener('click', () => chooseAnswer(button, question));
  });

  $('next').textContent = currentIndex === activePackage.items.length - 1
    ? 'Selesaikan paket'
    : 'Soal berikutnya →';

  if (secondsLeft <= 0) {
    $('choices').querySelectorAll('button').forEach(button => { button.disabled = true; });
  }
}

function showEffect(message, type) {
  const layer = $('fx');
  $('fxText').textContent = message;
  $('stars').innerHTML = type === 'good'
    ? Array.from({ length: 18 }, (_, index) => `<i style="--i:${index}">✦</i>`).join('')
    : '';

  layer.className = type;
  if (effectTimeout) clearTimeout(effectTimeout);
  effectTimeout = setTimeout(() => { layer.className = ''; }, type === 'good' ? 3000 : 1900);
}

function chooseAnswer(button, question) {
  if (answered.has(question.number) || secondsLeft <= 0) return;

  button.classList.add('drop');
  const chosenAnswer = button.querySelector('span').textContent;
  const isCorrect = chosenAnswer === question.answer;

  answered.add(question.number);

  $('choices').querySelectorAll('.choice').forEach(option => {
    option.disabled = true;
    if (option.querySelector('span').textContent === question.answer) {
      option.classList.add('right');
    }
  });

  if (isCorrect) {
    score += question.points;
    $('score').textContent = score;
    $('feedback').className = 'goodmsg';
    $('feedback').textContent = `Benar! +${question.points} poin`;
    showEffect('GOKIL!', 'good');
  } else {
    button.classList.add('wrong');
    $('feedback').className = 'bad';
    $('feedback').textContent = 'Jawaban belum tepat.';
    showEffect('NKRI LO MANA?', 'badfx');
  }

  $('correctAnswer').classList.remove('hide');

  // Timer sengaja tetap berjalan setelah jawaban dipilih.
}

function moveToNextQuestion() {
  const currentQuestion = activePackage.items[currentIndex];
  if (!answered.has(currentQuestion.number)) return;

  if (currentIndex < activePackage.items.length - 1) {
    currentIndex += 1;
  } else {
    finishPackage();
    return;
  }

  renderQuestion();
}

function finishPackage() {
  stopTimer();
  $('continue').classList.remove('hide');
  $('homeBtn').textContent = 'Semua paket';
  $('finish').querySelector('h2').textContent = 'Tetap Semangat!';
  $('summary').textContent = `${activePackage.title} selesai! Skor kamu: ${score} poin.`;
  $('continue').dataset.id = activePackage.id === PACKAGES.length ? PACKAGES[0].id : activePackage.id + 1;
  $('continue').textContent = activePackage.id === PACKAGES.length
    ? 'Main lagi dari Paket 01'
    : `Lanjut ke ${PACKAGES.find(pack => pack.id === activePackage.id + 1).title} →`;

  $('finish').classList.remove('hide', 'sweep');
  void $('finish').offsetWidth;
  $('finish').classList.add('sweep');
}

$('next').addEventListener('click', moveToNextQuestion);
$('continue').addEventListener('click', () => {
  $('finish').classList.add('hide');
  openPackage(Number($('continue').dataset.id));
});
$('homeBtn').addEventListener('click', () => {
  stopTimer();
  $('finish').classList.add('hide');
  $('continue').classList.remove('hide');
  $('quiz').classList.add('hide');
  $('home').classList.remove('hide');
});
$('back').addEventListener('click', () => {
  stopTimer();
  $('quiz').classList.add('hide');
  $('home').classList.remove('hide');
});

drawPackages();
