/* main.js */
let currentMode = 'login'; // login or register
let userConfig = null;
let currentGameData = null;
let resultChartInstance = null;
let gameTimerInterval = null;
let gameTimeLeft = 15 * 60; // 15 minutes in seconds
let lastActionTime = 0; // tracking time per question
let hapBilgiUsed = false; // track if user opened help this question

document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
});

async function checkAuthStatus() {
    try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
            const data = await res.json();
            userConfig = data;
            updateDashboard();
            switchView('dashboard-view');
        } else {
            switchView('auth-view');
        }
    } catch (e) {
        switchView('auth-view');
    }
}

function switchAuthTab(mode) {
    currentMode = mode;
    document.getElementById('tab-login').classList.remove('active');
    document.getElementById('tab-register').classList.remove('active');
    document.getElementById(`tab-${mode}`).classList.add('active');
    document.getElementById('auth-submit-btn').innerText = mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol';
}

async function handleAuth(e) {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const errorEl = document.getElementById('auth-error');
    errorEl.innerText = "";

    const url = currentMode === 'login' ? '/api/auth/login' : '/api/auth/register';

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });
        const data = await res.json();
        
        if (res.ok) {
            userConfig = data.user;
            updateDashboard();
            switchView('dashboard-view');
        } else {
            errorEl.innerText = data.error || "Bir hata oluştu.";
        }
    } catch (err) {
        errorEl.innerText = "Sunucu bağlantı hatası.";
    }
}

async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    userConfig = null;
    switchView('auth-view');
    document.getElementById('username').value = "";
    document.getElementById('password').value = "";
}

function updateDashboard() {
    if (!userConfig) return;
    document.getElementById('dash-username').innerText = userConfig.username;
    document.getElementById('dash-score').innerText = userConfig.score;
    
    const levelDisplay = document.getElementById('dash-level');
    if (userConfig.level_id > 3) {
        levelDisplay.innerText = "🏆 Oyun Tamamlandı";
        levelDisplay.style.color = "var(--warning)";
    } else {
        levelDisplay.innerText = userConfig.level_name + (" ("+userConfig.stage_id+"/5)");
        levelDisplay.style.color = "var(--secondary)";
    }
    fetchLeaderboard();
}

async function fetchLeaderboard() {
    try {
        const res = await fetch('/api/leaderboard');
        if (res.ok) {
            const data = await res.json();
            const tbody = document.getElementById('leaderboard-body');
            tbody.innerHTML = '';
            data.leaderboard.forEach((user, index) => {
                const rank = index + 1;
                let rankClass = '';
                let rankDisplay = rank;
                if (rank === 1) { rankClass = 'rank-1'; rankDisplay = '🥇 1'; }
                else if (rank === 2) { rankClass = 'rank-2'; rankDisplay = '🥈 2'; }
                else if (rank === 3) { rankClass = 'rank-3'; rankDisplay = '🥉 3'; }
                
                tbody.innerHTML += `
                    <tr>
                        <td class="${rankClass}">${rankDisplay}</td>
                        <td style="${user.username === userConfig.username ? 'color: var(--primary); font-weight: bold;' : ''}">${user.username}</td>
                        <td>${user.level_name} (${user.stage_id}/5)</td>
                        <td style="color: var(--secondary); font-weight: bold;">${user.score}</td>
                        <td>${formatTime(user.total_time_spent)}</td>
                    </tr>
                `;
            });
        }
    } catch(e) {
        // Error silented for cleaner production experience
    }
}

function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => {
        v.classList.remove('active');
    });
    document.getElementById(viewId).classList.add('active');
}

function showDashboard() {
    updateDashboard(); // refresh scores
    switchView('dashboard-view');
}

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

function toggleHelpBox() {
    const box = document.getElementById('help-box');
    const isHidden = box.style.display === 'none' || box.style.display === '';
    box.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
        hapBilgiUsed = true; // user opened it — penalty applies
        const btn = document.getElementById('toggle-help-btn');
        if (btn) btn.style.color = '#f59e0b'; // warn with orange
    }
}

async function startGame() {
    try {
        const res = await fetch('/api/game/case');
        const data = await res.json();
        
        if (data.game_over) {
            alert(data.message);
            return;
        }
        
        if (res.ok) {
            currentGameData = data.data; // Now comes from Backend
            
            document.getElementById('level-display').innerText = "Seviye: " + data.level_name;
            document.getElementById('stage-display').innerText = "Bölüm: " + data.stage_id + "/5";
            
            // Inject to grid
            const grid = document.getElementById('data-grid');
            grid.innerHTML = `
                <div class="data-item"><div class="label">Enflasyon</div><div class="value">%${currentGameData.inflation}</div></div>
                <div class="data-item"><div class="label">İşsizlik</div><div class="value">%${currentGameData.unemployment}</div></div>
                <div class="data-item"><div class="label">Faiz Oranı</div><div class="value">%${currentGameData.interest_rate}</div></div>
                <div class="data-item"><div class="label">Büyüme</div><div class="value">%${currentGameData.growth}</div></div>
                <div class="data-item"><div class="label">Döviz Kuru</div><div class="value">₺${currentGameData.exchange_rate}</div></div>
            `;
        
            switchView('game-view');
            updateHelpBox();
            startTimer();
            lastActionTime = Date.now();
            // Reset help state for new question
            hapBilgiUsed = false;
            const helpBox = document.getElementById('help-box');
            if (helpBox) helpBox.style.display = 'none';
            const helpBtn = document.getElementById('toggle-help-btn');
            if (helpBtn) helpBtn.style.color = '';
        } else {
            alert(data.error || "Erişim reddedildi.");
        }
    } catch(err) {
        alert("Bağlantı hatası.");
    }
}

function startTimer() {
    if (gameTimerInterval) return;
    
    document.getElementById('game-timer-container').style.display = 'flex';
    
    gameTimerInterval = setInterval(() => {
        gameTimeLeft--;
        updateTimerDisplay();
        
        if (gameTimeLeft <= 0) {
            clearInterval(gameTimerInterval);
            gameTimerInterval = null;
            alert("⏰ Süreniz doldu! Oyun sona erdi.");
            logout();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const timerEl = document.getElementById('game-timer');
    if (!timerEl) return;
    
    const min = Math.floor(gameTimeLeft / 60);
    const sec = gameTimeLeft % 60;
    timerEl.innerText = `${min}:${sec < 10 ? '0' : ''}${sec}`;
    
    if (gameTimeLeft < 60) {
        timerEl.classList.add('timer-urgent');
    } else {
        timerEl.classList.remove('timer-urgent');
    }
}

function updateHelpBox() {
    if (!currentGameData) return;
    
    const content = document.getElementById('help-content');
    if (!content) return;
    
    const { inflation, unemployment, growth, exchange_rate, interest_rate } = currentGameData;
    
    // Build a list of neutral, educational observations about the data
    const clues = [];
    
    if (inflation > 50)
        clues.push(`💡 Enflasyon <b>%${inflation}</b> ile olağanüstü yüksek. Tarihsel olarak bu seviyelerde para birimlerinin günlük alım gücü hızla eriyebiliyor.`);
    else if (inflation > 15)
        clues.push(`💡 Enflasyon <b>%${inflation}</b> — merkez bankasının hedef bandının oldukça üstünde. Faiz politikası bu durumu nasıl etkiliyor, incele.`);
    else if (inflation < 1)
        clues.push(`💡 Enflasyon neredeyse sıfır ya da negatif. Bu durum tüketicilerin harcama yapmayı ertelediğine işaret edebilir.`);

    if (unemployment > 15)
        clues.push(`💡 İşsizlik oranı <b>%${unemployment}</b> — iş piyasası çok baskı altında. İstihdam olmadan ekonomik aktivite daralır.`);
    else if (unemployment > 8)
        clues.push(`💡 İşsizlik <b>%${unemployment}</b> ile yüksek seyrediyor; ancak ekonomi her zaman bu eşiği bir kriz sayılır mı?`);

    if (growth < -2)
        clues.push(`💡 Büyüme <b>%${growth}</b> ile negatif — ekonomi küçülüyor. Art arda iki çeyrek böyle giderse teknik olarak resesyon tanımlanır.`);
    else if (growth > 5)
        clues.push(`💡 Büyüme <b>%${growth}</b> — ülke ekonomisi hızlı genişliyor. Yatırım ve tüketim tarafını kontrol et.`);

    if (interest_rate < inflation && inflation > 10)
        clues.push(`💡 Faiz (<b>%${interest_rate}</b>) enflasyonun (<b>%${inflation}</b>) çok altında: "reel faiz" negatif. Bu durum paranın değerini eriten bir sarmalı besleyebilir.`);

    const tip = clues.length > 0
        ? clues.join('<br><br>')
        : `💡 Verilerin hepsi birden yorum yapmayı gerektiriyor. Büyüme, işsizlik ve enflasyon üçlüsüne birlikte bak — biri tek başına hikayeyi anlatmaz.`;
    
    content.innerHTML = tip;
}

async function submitPrediction(prediction) {
    if (!currentGameData) return;

    const timeSpent = Math.floor((Date.now() - lastActionTime) / 1000);
    lastActionTime = Date.now(); // Update for next question

    try {
        const res = await fetch('/api/game/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prediction: prediction,
                time_spent: timeSpent,
                hap_bilgi_used: hapBilgiUsed
            })
        });
        
        if (res.ok) {
            const data = await res.json();
            
            // Sync with backend state
            userConfig = data.user_data;
            
            showResultModal(data);
        } else {
             const data = await res.json();
             alert(data.error || "Beklenmeyen Hata");
        }
    } catch(e) {
        alert("Bir hata oluştu. Lütfen tekrar dene.");
    }
}

function showResultModal(resultData) {
    const modal = document.getElementById('result-modal');
    const title = document.getElementById('result-title');
    const msg = document.getElementById('result-message');
    const exp = document.getElementById('result-explanation');
    const country = document.getElementById('result-country');

    if (resultData.is_correct) {
        title.innerText = "Tebrikler Detektif! 🕵️‍♂️";
        title.style.color = "var(--success)";
    } else {
        title.innerText = "Maalesef Yanlış! 🚨";
        title.style.color = "var(--danger)";
    }

    msg.innerText = resultData.msg_title;
    country.innerText = resultData.country;
    
    let bonusText = `\n\nPuan: ${userConfig.score} | Seviye: ${userConfig.level_name}`;
    if(resultData.level_up) {
        bonusText = `\n\n🎉 SEVİYE ATLADINIZ! 🎉\nYeni Puanın: ${userConfig.score} | Yeni Seviye: ${userConfig.level_name}`;
    }
    if(resultData.game_finished) {
        bonusText = `\n\n🏆 OYUNU BİTİRDİNİZ! 🏆\nTüm görevleri tamamladınız. Puanın: ${userConfig.score}`;
    }
    
    exp.innerText = resultData.explanation + bonusText;

    if (resultChartInstance) {
        resultChartInstance.destroy();
    }
    const ctx = document.getElementById('resultChart').getContext('2d');
    
    const isGrowthPositive = currentGameData.growth >= 0;
    
    resultChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Enflasyon', 'İşsizlik', 'Faiz Oranı', 'Büyüme', 'Döviz Kuru'],
            datasets: [{
                label: 'Ekonomik Veriler (%)',
                data: [
                    currentGameData.inflation,
                    currentGameData.unemployment,
                    currentGameData.interest_rate,
                    currentGameData.growth,
                    currentGameData.exchange_rate
                ],
                backgroundColor: [
                    'rgba(239, 68, 68, 0.7)',  // Kırmızı (Enflasyon)
                    'rgba(245, 158, 11, 0.7)', // Turuncu (İşsizlik)
                    'rgba(59, 130, 246, 0.7)', // Mavi (Faiz)
                    isGrowthPositive ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)', // Büyüme (Yeşil/Kırmızı)
                    'rgba(139, 92, 246, 0.7)'  // Mor (Döviz)
                ],
                borderColor: [
                    'rgba(239, 68, 68, 1)',
                    'rgba(245, 158, 11, 1)',
                    'rgba(59, 130, 246, 1)',
                    isGrowthPositive ? 'rgba(16, 185, 129, 1)' : 'rgba(239, 68, 68, 1)',
                    'rgba(139, 92, 246, 1)'
                ],
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: { color: 'white', font: { family: 'Outfit' } }
                }
            },
            scales: {
                y: {
                    ticks: { color: 'white', font: { family: 'Outfit' } },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                x: {
                    ticks: { color: 'white', font: { family: 'Outfit' } },
                    grid: { display: false }
                }
            }
        }
    });

    modal.classList.add('active');
}

function closeResultAndCheckProgress() {
    document.getElementById('result-modal').classList.remove('active');
    
    // If game is not finished, go to next case directly
    if (userConfig && userConfig.level_id <= 3) {
        startGame();
    } else {
        showDashboard();
    }
}
