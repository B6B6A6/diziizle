(function() {
    // ------------------------------------------------------------
    // GLOBAL DƏYİŞƏNLƠR
    // ------------------------------------------------------------
    
    // Telegram WebApp ilə əlaqə
    const tg = window.Telegram ? window.Telegram.WebApp : null;
    
    // Firebase-i qlobal dəyişəndən al
    const db = window.db;

    // Telegram-ı init et
    if (tg) {
        tg.ready();
        tg.expand();
    }

    // ------------------------------------------------------------
    // ADSGRAM REKLAM KONFİQURASİYASI - ÖZ BLOCK ID-NİZİ YAZIN
    // ------------------------------------------------------------
    const ADSGRAM_CONFIG = {
        BLOCK_ID: '1234-5678-9012-3456', // AdsGram panelindən aldığınız REAL block ID
        IS_ENABLED: true,
        TEST_MODE: true // Test rejimi (reklam olmadan sınaq üçün)
    };

    // ------------------------------------------------------------
    // OYUN SUALLARI
    // ------------------------------------------------------------
    const questions = [
        {
            question: "Azərbaycanın paytaxtı haradır?",
            options: ["Gəncə", "Bakı", "Sumqayıt", "Naxçıvan"],
            correct: 1,
            category: "Coğrafiya"
        },
        {
            question: "Hansı rəng Azərbaycan bayrağında yoxdur?",
            options: ["Mavi", "Yaşıl", "Sarı", "Qırmızı"],
            correct: 2,
            category: "Bilgi"
        },
        {
            question: "2 + 2 * 2 neçə edir?",
            options: ["6", "8", "4", "10"],
            correct: 0,
            category: "Riyaziyyat"
        },
        {
            question: "Dünyada ən çox istifadə olunan proqramlaşdırma dili hansıdır?",
            options: ["Python", "JavaScript", "Java", "C++"],
            correct: 1,
            category: "Texnologiya"
        },
        {
            question: "'Koroğlu' dastanı hansı xalqa məxsusdur?",
            options: ["Türk", "Azərbaycan", "Özbək", "Qazax"],
            correct: 1,
            category: "Ədəbiyyat"
        }
    ];

    // ------------------------------------------------------------
    // OYUN DƏYİŞƏNLƏRİ
    // ------------------------------------------------------------
    let currentQuestionIndex = 0;
    let score = 0;
    let selectedOption = null;
    let answerSubmitted = false;
    let extraLife = false;
    let totalQuestions = questions.length;

    // ------------------------------------------------------------
    // İSTİFADƏÇİ MƏLUMATLARI
    // ------------------------------------------------------------
    let userData = {
        uniqueId: localStorage.getItem('userUniqueId') || '',
        login: localStorage.getItem('userLogin') || '',
        firstName: localStorage.getItem('userFirstName') || '',
        lastName: localStorage.getItem('userLastName') || '',
        phone: localStorage.getItem('userPhone') || '',
        score: parseInt(localStorage.getItem('userScore')) || 0,
        gamesPlayed: parseInt(localStorage.getItem('userGamesPlayed')) || 0,
        createdAt: localStorage.getItem('userCreatedAt') || new Date().toISOString()
    };

    // ------------------------------------------------------------
    // KÖMƏKÇİ FUNKSİYALAR
    // ------------------------------------------------------------

    function generateUniqueId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 5; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    function saveUserToLocalStorage() {
        localStorage.setItem('userUniqueId', userData.uniqueId);
        localStorage.setItem('userLogin', userData.login);
        localStorage.setItem('userFirstName', userData.firstName);
        localStorage.setItem('userLastName', userData.lastName);
        localStorage.setItem('userPhone', userData.phone);
        localStorage.setItem('userScore', userData.score);
        localStorage.setItem('userGamesPlayed', userData.gamesPlayed);
        localStorage.setItem('userCreatedAt', userData.createdAt);
    }

    function showNotification(message, isSuccess = true) {
        const feedback = document.getElementById('feedbackMessage');
        if (!feedback) return;
        
        feedback.textContent = message;
        feedback.className = `feedback-message ${isSuccess ? 'success' : 'error'}`;
        feedback.style.display = 'block';
        
        setTimeout(() => {
            if (feedback) feedback.style.display = 'none';
        }, 3000);
    }

    // ------------------------------------------------------------
    // ADSGRAM REKLAM FUNKSİYALARI - YENİLƏNƏN VERSİYA
    // ------------------------------------------------------------

    // SDK-nın yükləndiyini yoxla
    function checkAdsGramSDK() {
        return new Promise((resolve) => {
            if (window.AdsGram) {
                console.log('✅ AdsGram SDK artıq yüklənib');
                resolve(true);
                return;
            }

            console.log('⏳ AdsGram SDK yüklənir...');
            
            // SDK-nı əl ilə yüklə
            const script = document.createElement('script');
            script.src = 'https://sdk.adsgram.ai/js/sdk.min.js';
            script.async = true;
            
            script.onload = () => {
                console.log('✅ AdsGram SDK uğurla yükləndi');
                resolve(true);
            };
            
            script.onerror = (error) => {
                console.error('❌ AdsGram SDK yüklənmədi:', error);
                resolve(false);
            };
            
            document.head.appendChild(script);
        });
    }

    // Test rejimi üçün mock reklam
    function showTestReward() {
        console.log('🧪 Test rejimi: Reklam göstərilir...');
        
        showNotification('🔴 Test reklamı: 3 saniyə gözləyin...', false);
        
        setTimeout(() => {
            handleAdReward();
            showNotification('✅ Test reklamı tamamlandı! Bonus verildi.', true);
        }, 3000);
    }

    // Reklamdan sonra mükafatı ver
    function handleAdReward() {
        extraLife = true;
        showNotification('🎁 Reklam izlədiyiniz üçün 1 əlavə can qazandınız!', true);
        
        const submitBtn = document.getElementById('submitBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        if (submitBtn) submitBtn.disabled = false;
        if (nextBtn) nextBtn.disabled = true;
        
        selectedOption = null;
        answerSubmitted = false;
        
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.classList.remove('selected', 'correct', 'wrong');
        });
    }

    // AdsGram reklamını göstər - YENİLƏNƏN VERSİYA
    async function showAdsGramRewardedAd() {
        // Test rejimi aktivdirsə, mock reklam göstər
        if (ADSGRAM_CONFIG.TEST_MODE) {
            showTestReward();
            return true;
        }

        if (!ADSGRAM_CONFIG.IS_ENABLED) {
            console.log('ℹ️ AdsGram reklamı deaktivdir');
            return false;
        }

        if (!ADSGRAM_CONFIG.BLOCK_ID || ADSGRAM_CONFIG.BLOCK_ID === 'YOUR_ADSGRAM_BLOCK_ID' || ADSGRAM_CONFIG.BLOCK_ID.length < 5) {
            console.error('❌ AdsGram BLOCK_ID yanlışdır:', ADSGRAM_CONFIG.BLOCK_ID);
            showNotification('Reklam ID-si düzgün deyil!', false);
            
            // Test rejimini aktiv et
            ADSGRAM_CONFIG.TEST_MODE = true;
            showTestReward();
            return true;
        }

        try {
            // SDK-nın yükləndiyini yoxla
            const sdkLoaded = await checkAdsGramSDK();
            if (!sdkLoaded) {
                throw new Error('SDK yüklənmədi');
            }

            console.log('🎯 AdsGram reklamı göstərilir, BLOCK_ID:', ADSGRAM_CONFIG.BLOCK_ID);
            
            // Rewarded Video reklamı yarat 
            const adController = AdsGram.init({
                blockId: ADSGRAM_CONFIG.BLOCK_ID,
                type: 'rewarded',
                onReward: () => {
                    console.log('🎁 Reklam izləndi, mükafat verildi');
                    handleAdReward();
                },
                onError: (error) => {
                    console.error('❌ AdsGram xətası:', error);
                    showNotification('Reklam göstərilə bilmədi: ' + (error.message || 'Bilinməyən xəta'), false);
                    
                    // Xəta olduqda test rejiminə keç
                    ADSGRAM_CONFIG.TEST_MODE = true;
                    showTestReward();
                },
                onClose: () => {
                    console.log('Reklam bağlandı');
                }
            });

            // Reklamı göstər
            const result = await adController.show();
            console.log('✅ Reklam göstərildi:', result);
            return result;

        } catch (error) {
            console.error('❌ AdsGram reklamı xətası:', error);
            showNotification('Reklam xətası: ' + error.message, false);
            
            // Xəta olduqda test rejiminə keç
            ADSGRAM_CONFIG.TEST_MODE = true;
            showTestReward();
            return false;
        }
    }

    // Reklamsız səhv cavab davranışı
    function handleWrongAnswerWithoutAd() {
        const submitBtn = document.getElementById('submitBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        if (submitBtn) submitBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = false;
    }

    // ------------------------------------------------------------
    // FIREBASE FUNKSİYALARI (SADƏLƏŞDİRİLMİŞ)
    // ------------------------------------------------------------

    async function loadUserFromFirebase() {
        if (!userData.uniqueId) {
            userData.uniqueId = generateUniqueId();
            saveUserToLocalStorage();
        }
        displayUserProfile();
    }

    async function saveUserToFirebase() {
        // Firebase yoxdursa, sadəcə local-a yaz
        saveUserToLocalStorage();
    }

    // ------------------------------------------------------------
    // PROFİL FUNKSİYALARI
    // ------------------------------------------------------------

    function displayUserProfile() {
        const elements = {
            userUniqueId: document.getElementById('userUniqueId'),
            profileId: document.getElementById('profileId'),
            profileLogin: document.getElementById('profileLogin'),
            profileFirstName: document.getElementById('profileFirstName'),
            profileLastName: document.getElementById('profileLastName'),
            profilePhone: document.getElementById('profilePhone'),
            profileDisplayName: document.getElementById('profileDisplayName'),
            profileDisplayLogin: document.getElementById('profileDisplayLogin'),
            profileAvatar: document.getElementById('profileAvatar'),
            profileTotalScore: document.getElementById('profileTotalScore'),
            profileGamesPlayed: document.getElementById('profileGamesPlayed')
        };
        
        if (elements.userUniqueId) elements.userUniqueId.textContent = userData.uniqueId;
        if (elements.profileId) elements.profileId.value = userData.uniqueId;
        if (elements.profileLogin) elements.profileLogin.value = userData.login || '';
        if (elements.profileFirstName) elements.profileFirstName.value = userData.firstName || '';
        if (elements.profileLastName) elements.profileLastName.value = userData.lastName || '';
        if (elements.profilePhone) elements.profilePhone.value = userData.phone || '';
        
        const fullName = userData.firstName || userData.lastName ? 
            `${userData.firstName} ${userData.lastName}`.trim() : 'İstifadəçi';
        if (elements.profileDisplayName) elements.profileDisplayName.textContent = fullName;
        if (elements.profileDisplayLogin) elements.profileDisplayLogin.textContent = userData.login ? `@${userData.login}` : '@istifadeci';
        if (elements.profileAvatar) elements.profileAvatar.textContent = (userData.firstName?.[0] || userData.login?.[0] || '👤').toUpperCase();
        
        if (elements.profileTotalScore) elements.profileTotalScore.textContent = userData.score;
        if (elements.profileGamesPlayed) elements.profileGamesPlayed.textContent = userData.gamesPlayed;
        
        // Nümunə statistikalar
        const dailyEl = document.getElementById('profileDailyScore');
        const weeklyEl = document.getElementById('profileWeeklyScore');
        const monthlyEl = document.getElementById('profileMonthlyScore');
        const rankEl = document.getElementById('profileBestRank');
        const bestEl = document.getElementById('profileBestScore');
        
        if (dailyEl) dailyEl.textContent = Math.floor(Math.random() * 200);
        if (weeklyEl) weeklyEl.textContent = Math.floor(Math.random() * 800);
        if (monthlyEl) monthlyEl.textContent = Math.floor(Math.random() * 2000);
        if (rankEl) rankEl.textContent = '#' + (Math.floor(Math.random() * 20) + 1);
        if (bestEl) bestEl.textContent = Math.floor(Math.random() * 3000) + 1000;
    }

    async function saveUserProfile() {
        const loginEl = document.getElementById('profileLogin');
        const firstEl = document.getElementById('profileFirstName');
        const lastEl = document.getElementById('profileLastName');
        const phoneEl = document.getElementById('profilePhone');
        
        userData.login = loginEl ? loginEl.value : '';
        userData.firstName = firstEl ? firstEl.value : '';
        userData.lastName = lastEl ? lastEl.value : '';
        userData.phone = phoneEl ? phoneEl.value : '';
        
        saveUserToLocalStorage();
        await saveUserToFirebase();
        displayUserProfile();
        
        if (tg) {
            tg.showAlert('✅ Profil məlumatları yadda saxlanıldı!');
        } else {
            alert('✅ Profil məlumatları yadda saxlanıldı!');
        }
    }

    // ------------------------------------------------------------
    // OYUN FUNKSİYALARI
    // ------------------------------------------------------------

    function updateQuestionCounter() {
        const qEl = document.getElementById('questionCount');
        const pEl = document.getElementById('progressFill');
        
        if (qEl) qEl.textContent = `${currentQuestionIndex + 1} / ${totalQuestions}`;
        if (pEl) {
            const percent = ((currentQuestionIndex + 1) / totalQuestions) * 100;
            pEl.style.width = `${percent}%`;
        }
    }

    function updateScore() {
        const scoreEl = document.getElementById('scoreDisplay');
        if (scoreEl) scoreEl.textContent = score;
    }

    function selectOption(index) {
        if (answerSubmitted) return;
        
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        const btn = document.querySelector(`.option-btn[data-index="${index}"]`);
        if (btn) btn.classList.add('selected');
        
        selectedOption = index;
        const sb = document.getElementById('submitBtn');
        if (sb) sb.disabled = false;
    }

    function renderOptions(selectedIndex = null, correctIndex = null, disabled = false) {
        const q = questions[currentQuestionIndex];
        const container = document.getElementById('optionsContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        q.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.setAttribute('data-index', idx);
            if (disabled) btn.classList.add('disabled');
            btn.textContent = opt;
            
            if (selectedIndex === idx) btn.classList.add('selected');
            
            if (answerSubmitted) {
                if (idx === q.correct) btn.classList.add('correct');
                else if (selectedIndex === idx && selectedIndex !== q.correct) btn.classList.add('wrong');
            }
            
            btn.onclick = (e) => {
                e.preventDefault();
                if (!answerSubmitted && !disabled) selectOption(idx);
            };
            
            container.appendChild(btn);
        });
    }

    function loadQuestion() {
        const q = questions[currentQuestionIndex];
        const qEl = document.getElementById('questionText');
        const cEl = document.getElementById('categoryBadge');
        
        if (qEl) qEl.textContent = q.question;
        if (cEl) cEl.textContent = q.category;
        
        selectedOption = null;
        answerSubmitted = false;
        renderOptions();
        
        const sb = document.getElementById('submitBtn');
        const nb = document.getElementById('nextBtn');
        const fb = document.getElementById('feedbackMessage');
        
        if (sb) sb.disabled = true;
        if (nb) nb.disabled = true;
        if (fb) fb.style.display = 'none';
    }

    async function handleWrongAnswer() {
        if (extraLife) {
            extraLife = false;
            showNotification('✨ Əlavə can istifadə edildi! Təkrar cəhd edin.', true);
            
            selectedOption = null;
            answerSubmitted = false;
            
            document.querySelectorAll('.option-btn').forEach(btn => {
                btn.classList.remove('selected', 'correct', 'wrong');
            });
            
            const sb = document.getElementById('submitBtn');
            const nb = document.getElementById('nextBtn');
            
            if (sb) sb.disabled = false;
            if (nb) nb.disabled = true;
            
            return;
        }

        // Reklam göstər
        await showAdsGramRewardedAd();
    }

    async function handleSubmit() {
        if (selectedOption === null || answerSubmitted) return;

        const q = questions[currentQuestionIndex];
        const correct = (selectedOption === q.correct);
        
        answerSubmitted = true;
        renderOptions(selectedOption, q.correct, true);
        
        const fb = document.getElementById('feedbackMessage');
        const sb = document.getElementById('submitBtn');
        const nb = document.getElementById('nextBtn');
        
        if (correct) {
            score += 10;
            updateScore();
            if (fb) {
                fb.textContent = '✅ Doğru cavab! +10 xal';
                fb.className = 'feedback-message success';
                fb.style.display = 'block';
            }
            if (sb) sb.disabled = true;
            if (nb) nb.disabled = false;
        } else {
            if (fb) {
                fb.textContent = '❌ Səhv cavab! Reklam izləyib davam edə bilərsiniz...';
                fb.className = 'feedback-message error';
                fb.style.display = 'block';
            }
            if (sb) sb.disabled = true;
            await handleWrongAnswer();
        }
    }

    function handleNext() {
        if (currentQuestionIndex < totalQuestions - 1) {
            currentQuestionIndex++;
            loadQuestion();
            updateQuestionCounter();
        } else {
            showResultScreen();
        }
    }

    async function showResultScreen() {
        const gs = document.getElementById('gameScreen');
        const rs = document.getElementById('resultScreen');
        const fs = document.getElementById('finalScore');
        
        if (gs) gs.classList.remove('active');
        if (rs) rs.classList.add('active');
        if (fs) fs.textContent = `${score} / ${totalQuestions * 10}`;
        
        userData.score += score;
        userData.gamesPlayed++;
        saveUserToLocalStorage();
        await saveUserToFirebase();
        
        if (tg) {
            tg.sendData(JSON.stringify({
                score: score,
                userId: userData.uniqueId,
                login: userData.login
            }));
        }
    }

    function resetGame() {
        currentQuestionIndex = 0;
        score = 0;
        selectedOption = null;
        answerSubmitted = false;
        extraLife = false;
        
        updateScore();
        
        const rs = document.getElementById('resultScreen');
        const gs = document.getElementById('gameScreen');
        const tabs = document.querySelectorAll('.menu-tab');
        const title = document.getElementById('headerTitle');
        
        if (rs) rs.classList.remove('active');
        if (gs) gs.classList.add('active');
        
        tabs.forEach(t => t.classList.remove('active'));
        if (tabs[0]) tabs[0].classList.add('active');
        if (title) title.textContent = 'Sual-Cavab';
        
        loadQuestion();
        updateQuestionCounter();
    }

    // ------------------------------------------------------------
    // LİDERLƏR PANELİ (SADƏ)
    // ------------------------------------------------------------

    function loadLeaderboard(period) {
        const list = document.getElementById(`${period}Leaderboard`);
        const prev = document.getElementById(`previous${period.charAt(0).toUpperCase() + period.slice(1)}Leaderboard`);
        const upd = document.getElementById(`${period}LastUpdated`);
        
        if (list) list.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        if (prev) prev.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        
        setTimeout(() => {
            if (list) {
                let html = '';
                for (let i = 0; i < 15; i++) {
                    const score = Math.floor(Math.random() * 5000) + 500;
                    const names = ['Kənan','Aysel','Rəşad','Leyla','Elvin','Nigar','Orxan','Fatimə','Murad','Zəhra'];
                    const name = names[i % names.length];
                    
                    let rankClass = '';
                    if (i === 0) rankClass = 'top-1';
                    else if (i === 1) rankClass = 'top-2';
                    else if (i === 2) rankClass = 'top-3';
                    
                    const isCurrent = i === 2;
                    
                    html += `
                        <div class="leaderboard-item">
                            <div class="leaderboard-rank ${rankClass}">${i+1}</div>
                            <div class="leaderboard-info">
                                <div class="leaderboard-name">
                                    ${name} ${isCurrent ? '<span class="leaderboard-badge">Siz</span>' : ''} ${i===0?'👑':''}
                                </div>
                                <div class="leaderboard-score">Xal <span>${score}</span></div>
                            </div>
                            <div>${i===0?'🥇':i===1?'🥈':i===2?'🥉':''}</div>
                        </div>
                    `;
                }
                list.innerHTML = html;
            }
            
            if (prev) {
                let html = '';
                for (let i = 0; i < 10; i++) {
                    const score = Math.floor(Math.random() * 4000) + 400;
                    const names = ['Kənan','Aysel','Rəşad','Leyla','Elvin','Nigar','Orxan','Fatimə','Murad','Zəhra'];
                    html += `
                        <div class="leaderboard-item">
                            <div class="leaderboard-rank">${i+1}</div>
                            <div class="leaderboard-info">
                                <div class="leaderboard-name">${names[i % names.length]}</div>
                                <div class="leaderboard-score">Xal <span>${score}</span></div>
                            </div>
                        </div>
                    `;
                }
                prev.innerHTML = html;
            }
            
            if (upd) {
                const d = new Date();
                upd.textContent = `Son yenilənmə: ${d.getHours()}:${d.getMinutes().toString().padStart(2,'0')}`;
            }
            
            document.getElementById(`${period}TotalPlayers`).textContent = Math.floor(Math.random()*100)+50;
            document.getElementById(`${period}TotalGames`).textContent = Math.floor(Math.random()*200)+100;
            document.getElementById(`${period}TopScore`).textContent = Math.floor(Math.random()*5000)+1000;
        }, 800);
    }

    // ------------------------------------------------------------
    // EVENT DİNLƏYİCİLƏRİ
    // ------------------------------------------------------------
    
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM yükləndi, versiya 2.0 (AdsGram test rejimi aktiv)');
        
        // Oyun düymələri
        document.getElementById('submitBtn')?.addEventListener('click', handleSubmit);
        document.getElementById('nextBtn')?.addEventListener('click', handleNext);
        document.getElementById('newGameBtn')?.addEventListener('click', resetGame);
        
        document.getElementById('viewLeaderboardBtn')?.addEventListener('click', () => {
            document.getElementById('resultScreen')?.classList.remove('active');
            document.getElementById('dailyScreen')?.classList.add('active');
            document.getElementById('headerTitle').textContent = 'Günlük Liderlər';
            document.querySelectorAll('.menu-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.menu-tab')[1]?.classList.add('active');
            loadLeaderboard('daily');
        });

        // Profil paneli
        document.getElementById('profileBtn')?.addEventListener('click', () => {
            displayUserProfile();
            document.getElementById('userProfile')?.classList.add('active');
            document.getElementById('sidebarOverlay')?.classList.add('active');
        });

        document.getElementById('closeSidebar')?.addEventListener('click', () => {
            document.getElementById('userProfile')?.classList.remove('active');
            document.getElementById('sidebarOverlay')?.classList.remove('active');
        });

        document.getElementById('sidebarOverlay')?.addEventListener('click', () => {
            document.getElementById('userProfile')?.classList.remove('active');
            document.getElementById('sidebarOverlay')?.classList.remove('active');
        });

        document.getElementById('saveProfileBtn')?.addEventListener('click', saveUserProfile);

        // Menu keçidləri
        document.querySelectorAll('.menu-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const screen = tab.dataset.screen;
                document.querySelectorAll('.menu-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
                
                const title = document.getElementById('headerTitle');
                
                switch(screen) {
                    case 'game':
                        document.getElementById('gameScreen')?.classList.add('active');
                        if (title) title.textContent = 'Sual-Cavab';
                        break;
                    case 'daily':
                        document.getElementById('dailyScreen')?.classList.add('active');
                        if (title) title.textContent = 'Günlük Liderlər';
                        loadLeaderboard('daily');
                        break;
                    case 'weekly':
                        document.getElementById('weeklyScreen')?.classList.add('active');
                        if (title) title.textContent = 'Həftəlik Liderlər';
                        loadLeaderboard('weekly');
                        break;
                    case 'monthly':
                        document.getElementById('monthlyScreen')?.classList.add('active');
                        if (title) title.textContent = 'Aylıq Liderlər';
                        loadLeaderboard('monthly');
                        break;
                }
            });
        });

        // Yenilə düymələri
        document.getElementById('refreshDaily')?.addEventListener('click', () => loadLeaderboard('daily'));
        document.getElementById('refreshWeekly')?.addEventListener('click', () => loadLeaderboard('weekly'));
        document.getElementById('refreshMonthly')?.addEventListener('click', () => loadLeaderboard('monthly'));

        // Başlanğıc
        loadUserFromFirebase().then(() => resetGame());
    });

})();
