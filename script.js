(function() {
    // ------------------------------------------------------------
    // GLOBAL DƏYİŞƏNLƏR
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
    // ADSGRAM REKLAM KONFİQURASİYASI
    // ------------------------------------------------------------
    const ADSGRAM_CONFIG = {
        BLOCK_ID: '8403904397', // ÖZ BLOCK ID-NİZİ YAZIN
        IS_ENABLED: true                     // Reklamı aktiv etmək üçün
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
    let extraLife = false; // Reklamdan qazanılan əlavə can
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

    // Unikal ID yaratma funksiyası (5 simvol - hərf və rəqəm qarışığı)
    function generateUniqueId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 5; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // LocalStorage-a yadda saxla
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

    // Bildiriş göstər
    function showNotification(message, isSuccess = true) {
        const feedback = document.getElementById('feedbackMessage');
        if (!feedback) return;
        
        feedback.textContent = message;
        feedback.className = `feedback-message ${isSuccess ? 'success' : 'error'}`;
        feedback.style.display = 'block';
        
        // 3 saniyə sonra gizlət
        setTimeout(() => {
            if (feedback) feedback.style.display = 'none';
        }, 3000);
    }

    // ------------------------------------------------------------
    // ADSGRAM REKLAM FUNKSİYALARI
    // ------------------------------------------------------------

    // AdsGram SDK-sını yüklə
    function loadAdsGramSDK() {
        return new Promise((resolve, reject) => {
            if (window.AdsGram) {
                resolve(window.AdsGram);
                return;
            }

            // SDK artıq HTML-də yüklənib, amma hazır olana qədər gözlə
            let attempts = 0;
            const checkInterval = setInterval(() => {
                attempts++;
                if (window.AdsGram) {
                    clearInterval(checkInterval);
                    resolve(window.AdsGram);
                } else if (attempts > 20) { // 2 saniyə timeout
                    clearInterval(checkInterval);
                    reject('AdsGram SDK timeout');
                }
            }, 100);
        });
    }

    // Reklamdan sonra mükafatı ver
    function handleAdReward() {
        // İstifadəçiyə 1 əlavə həyat ver
        extraLife = true;
        showNotification('🎁 Reklam izlədiyiniz üçün 1 əlavə can qazandınız!', true);
        
        // Cavabı təsdiq et düyməsini aktiv et (təkrar cəhd edə bilər)
        const submitBtn = document.getElementById('submitBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        if (submitBtn) submitBtn.disabled = false;
        if (nextBtn) nextBtn.disabled = true;
        
        // Seçimi təmizlə və təkrar cəhd etməyə icazə ver
        selectedOption = null;
        answerSubmitted = false;
        
        // Bütün option düymələrindən classları təmizlə
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.classList.remove('selected', 'correct', 'wrong');
        });
    }

    // Reklamsız səhv cavab davranışı
    function handleWrongAnswerWithoutAd() {
        const submitBtn = document.getElementById('submitBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        if (submitBtn) submitBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = false;
    }

    // AdsGram reklamını göstər
    async function showAdsGramRewardedAd() {
        if (!ADSGRAM_CONFIG.IS_ENABLED) {
            console.log('ℹ️ AdsGram reklamı deaktivdir');
            return false;
        }

        if (!ADSGRAM_CONFIG.BLOCK_ID || ADSGRAM_CONFIG.BLOCK_ID === 'YOUR_ADSGRAM_BLOCK_ID') {
            console.warn('⚠️ AdsGram BLOCK_ID təyin edilməyib');
            showNotification('Reklam konfiqurasiya edilməyib', false);
            return false;
        }

        try {
            const AdsGram = await loadAdsGramSDK();
            
            // Rewarded Video reklamı yarat 
            const adController = AdsGram.init({
                blockId: ADSGRAM_CONFIG.BLOCK_ID,
                type: 'rewarded', // Mükafatlı video reklam
                onReward: () => {
                    console.log('🎁 Reklam izləndi, mükafat verildi');
                    handleAdReward();
                },
                onError: (error) => {
                    console.error('❌ AdsGram xətası:', error);
                    showNotification('Reklam göstərilə bilmədi', false);
                    handleWrongAnswerWithoutAd();
                },
                onClose: () => {
                    console.log('Reklam bağlandı');
                }
            });

            // Reklamı göstər
            const result = await adController.show();
            return result;

        } catch (error) {
            console.error('❌ AdsGram reklamı göstərilərkən xəta:', error);
            showNotification('Reklam yüklənə bilmədi', false);
            return false;
        }
    }

    // ------------------------------------------------------------
    // FIREBASE FUNKSİYALARI
    // ------------------------------------------------------------

    // Firebase-dən istifadəçi məlumatlarını yüklə
    async function loadUserFromFirebase() {
        if (!db) {
            console.log('Firebase yoxdur, localStorage istifadə olunur');
            
            // Əgər uniqueId yoxdursa, yenisini yarat
            if (!userData.uniqueId) {
                userData.uniqueId = generateUniqueId();
                saveUserToLocalStorage();
            }
            
            displayUserProfile();
            return;
        }

        try {
            // Telegram istifadəçi ID-si varsa onu istifadə et
            const telegramId = tg?.initDataUnsafe?.user?.id?.toString();
            
            if (telegramId) {
                // Telegram ID ilə axtar
                const userQuery = await db.collection('users')
                    .where('telegramId', '==', telegramId)
                    .limit(1)
                    .get();
                
                if (!userQuery.empty) {
                    // İstifadəçi tapıldı
                    const userDoc = userQuery.docs[0];
                    userData.uniqueId = userDoc.id;
                    userData.login = userDoc.data().login || '';
                    userData.firstName = userDoc.data().firstName || tg?.initDataUnsafe?.user?.first_name || '';
                    userData.lastName = userDoc.data().lastName || tg?.initDataUnsafe?.user?.last_name || '';
                    userData.phone = userDoc.data().phone || '';
                    userData.score = userDoc.data().score || 0;
                    userData.gamesPlayed = userDoc.data().gamesPlayed || 0;
                    userData.createdAt = userDoc.data().createdAt || new Date().toISOString();
                    
                    console.log('✅ İstifadəçi Firebase-dən yükləndi:', userData);
                } else {
                    // Yeni istifadəçi yarat
                    userData.uniqueId = generateUniqueId();
                    userData.firstName = tg?.initDataUnsafe?.user?.first_name || '';
                    userData.lastName = tg?.initDataUnsafe?.user?.last_name || '';
                    userData.createdAt = new Date().toISOString();
                    
                    // Firebase-ə yadda saxla
                    await db.collection('users').doc(userData.uniqueId).set({
                        telegramId: telegramId,
                        uniqueId: userData.uniqueId,
                        login: userData.login,
                        firstName: userData.firstName,
                        lastName: userData.lastName,
                        phone: userData.phone,
                        score: userData.score,
                        gamesPlayed: userData.gamesPlayed,
                        createdAt: userData.createdAt,
                        lastSeen: new Date().toISOString()
                    });
                    
                    console.log('✅ Yeni istifadəçi yaradıldı:', userData);
                }
            } else {
                // Telegram ID yoxdursa, local ID yarat
                if (!userData.uniqueId) {
                    userData.uniqueId = generateUniqueId();
                }
                
                // Firebase-də bu ID ilə axtar
                const userDoc = await db.collection('users').doc(userData.uniqueId).get();
                
                if (userDoc.exists) {
                    userData.login = userDoc.data().login || '';
                    userData.firstName = userDoc.data().firstName || '';
                    userData.lastName = userDoc.data().lastName || '';
                    userData.phone = userDoc.data().phone || '';
                    userData.score = userDoc.data().score || 0;
                    userData.gamesPlayed = userDoc.data().gamesPlayed || 0;
                    userData.createdAt = userDoc.data().createdAt || new Date().toISOString();
                }
            }
            
            // LocalStorage-a yadda saxla
            saveUserToLocalStorage();
            
            // Profili göstər
            displayUserProfile();
            
        } catch (error) {
            console.error('❌ Firebase yükləmə xətası:', error);
            
            // Əgər uniqueId yoxdursa, yenisini yarat
            if (!userData.uniqueId) {
                userData.uniqueId = generateUniqueId();
                saveUserToLocalStorage();
            }
            
            displayUserProfile();
        }
    }

    // Firebase-ə yadda saxla
    async function saveUserToFirebase() {
        if (!db) return;
        
        try {
            const telegramId = tg?.initDataUnsafe?.user?.id?.toString();
            
            await db.collection('users').doc(userData.uniqueId).set({
                telegramId: telegramId || '',
                uniqueId: userData.uniqueId,
                login: userData.login,
                firstName: userData.firstName,
                lastName: userData.lastName,
                phone: userData.phone,
                score: userData.score,
                gamesPlayed: userData.gamesPlayed,
                createdAt: userData.createdAt || new Date().toISOString(),
                lastSeen: new Date().toISOString()
            }, { merge: true });
            
            console.log('✅ Məlumatlar Firebase-ə yadda saxlanıldı');
        } catch (error) {
            console.error('❌ Firebase yaddaş xətası:', error);
        }
    }

    // ------------------------------------------------------------
    // PROFİL FUNKSİYALARI
    // ------------------------------------------------------------

    // Profil məlumatlarını göstər
    function displayUserProfile() {
        const userUniqueIdEl = document.getElementById('userUniqueId');
        const profileIdEl = document.getElementById('profileId');
        const profileLoginEl = document.getElementById('profileLogin');
        const profileFirstNameEl = document.getElementById('profileFirstName');
        const profileLastNameEl = document.getElementById('profileLastName');
        const profilePhoneEl = document.getElementById('profilePhone');
        const profileDisplayNameEl = document.getElementById('profileDisplayName');
        const profileDisplayLoginEl = document.getElementById('profileDisplayLogin');
        const profileAvatarEl = document.getElementById('profileAvatar');
        const profileTotalScoreEl = document.getElementById('profileTotalScore');
        const profileGamesPlayedEl = document.getElementById('profileGamesPlayed');
        
        if (userUniqueIdEl) userUniqueIdEl.textContent = userData.uniqueId;
        if (profileIdEl) profileIdEl.value = userData.uniqueId;
        
        if (profileLoginEl) profileLoginEl.value = userData.login || '';
        if (profileFirstNameEl) profileFirstNameEl.value = userData.firstName || '';
        if (profileLastNameEl) profileLastNameEl.value = userData.lastName || '';
        if (profilePhoneEl) profilePhoneEl.value = userData.phone || '';
        
        const fullName = userData.firstName || userData.lastName ? 
            `${userData.firstName} ${userData.lastName}`.trim() : 'İstifadəçi';
        if (profileDisplayNameEl) profileDisplayNameEl.textContent = fullName;
        if (profileDisplayLoginEl) profileDisplayLoginEl.textContent = userData.login ? `@${userData.login}` : '@istifadeci';
        if (profileAvatarEl) profileAvatarEl.textContent = (userData.firstName?.[0] || userData.login?.[0] || '👤').toUpperCase();
        
        if (profileTotalScoreEl) profileTotalScoreEl.textContent = userData.score;
        if (profileGamesPlayedEl) profileGamesPlayedEl.textContent = userData.gamesPlayed;
        
        // Nümunə məlumatlar
        const profileDailyScoreEl = document.getElementById('profileDailyScore');
        const profileWeeklyScoreEl = document.getElementById('profileWeeklyScore');
        const profileMonthlyScoreEl = document.getElementById('profileMonthlyScore');
        const profileBestRankEl = document.getElementById('profileBestRank');
        const profileBestScoreEl = document.getElementById('profileBestScore');
        
        if (profileDailyScoreEl) profileDailyScoreEl.textContent = Math.floor(Math.random() * 200);
        if (profileWeeklyScoreEl) profileWeeklyScoreEl.textContent = Math.floor(Math.random() * 800);
        if (profileMonthlyScoreEl) profileMonthlyScoreEl.textContent = Math.floor(Math.random() * 2000);
        if (profileBestRankEl) profileBestRankEl.textContent = '#' + (Math.floor(Math.random() * 20) + 1);
        if (profileBestScoreEl) profileBestScoreEl.textContent = Math.floor(Math.random() * 3000) + 1000;
    }

    // Profili yadda saxla
    async function saveUserProfile() {
        const profileLoginEl = document.getElementById('profileLogin');
        const profileFirstNameEl = document.getElementById('profileFirstName');
        const profileLastNameEl = document.getElementById('profileLastName');
        const profilePhoneEl = document.getElementById('profilePhone');
        
        userData.login = profileLoginEl ? profileLoginEl.value : '';
        userData.firstName = profileFirstNameEl ? profileFirstNameEl.value : '';
        userData.lastName = profileLastNameEl ? profileLastNameEl.value : '';
        userData.phone = profilePhoneEl ? profilePhoneEl.value : '';
        
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
        const questionCountEl = document.getElementById('questionCount');
        const progressFillEl = document.getElementById('progressFill');
        
        if (questionCountEl) {
            questionCountEl.textContent = `${currentQuestionIndex + 1} / ${totalQuestions}`;
        }
        
        if (progressFillEl) {
            const progressPercent = ((currentQuestionIndex + 1) / totalQuestions) * 100;
            progressFillEl.style.width = `${progressPercent}%`;
        }
    }

    function updateScore() {
        const scoreDisplayEl = document.getElementById('scoreDisplay');
        if (scoreDisplayEl) {
            scoreDisplayEl.textContent = score;
        }
    }

    function selectOption(index) {
        if (answerSubmitted) return;
        
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        const selectedBtn = document.querySelector(`.option-btn[data-index="${index}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('selected');
        }
        
        selectedOption = index;
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) submitBtn.disabled = false;
    }

    function renderOptions(selectedIndex = null, correctIndex = null, disabled = false) {
        const currentQ = questions[currentQuestionIndex];
        const optionsContainer = document.getElementById('optionsContainer');
        if (!optionsContainer) return;
        
        optionsContainer.innerHTML = '';
        
        currentQ.options.forEach((option, index) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.setAttribute('data-index', index);
            
            if (disabled) btn.classList.add('disabled');
            btn.textContent = option;
            
            if (selectedIndex === index) btn.classList.add('selected');
            
            if (answerSubmitted) {
                if (index === currentQ.correct) btn.classList.add('correct');
                else if (selectedIndex === index && selectedIndex !== currentQ.correct) btn.classList.add('wrong');
            }
            
            btn.onclick = function(e) {
                e.preventDefault();
                if (!answerSubmitted && !disabled) selectOption(index);
            };
            
            optionsContainer.appendChild(btn);
        });
    }

    function loadQuestion() {
        const currentQ = questions[currentQuestionIndex];
        const questionTextEl = document.getElementById('questionText');
        const categoryBadgeEl = document.getElementById('categoryBadge');
        
        if (questionTextEl) questionTextEl.textContent = currentQ.question;
        if (categoryBadgeEl) categoryBadgeEl.textContent = currentQ.category;
        
        selectedOption = null;
        answerSubmitted = false;
        renderOptions();
        
        const submitBtn = document.getElementById('submitBtn');
        const nextBtn = document.getElementById('nextBtn');
        const feedbackMessage = document.getElementById('feedbackMessage');
        
        if (submitBtn) submitBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        if (feedbackMessage) feedbackMessage.style.display = 'none';
    }

    // Səhv cavab idarəetməsi (AdsGram ilə)
    async function handleWrongAnswer() {
        if (extraLife) {
            // İstifadəçinin əlavə canı var - səhv cavabı bağışla
            extraLife = false;
            showNotification('✨ Əlavə can istifadə edildi! Təkrar cəhd edin.', true);
            
            // Seçimi təmizlə və təkrar cəhd etməyə icazə ver
            selectedOption = null;
            answerSubmitted = false;
            
            // Bütün option düymələrindən classları təmizlə
            document.querySelectorAll('.option-btn').forEach(btn => {
                btn.classList.remove('selected', 'correct', 'wrong');
            });
            
            const submitBtn = document.getElementById('submitBtn');
            const nextBtn = document.getElementById('nextBtn');
            
            if (submitBtn) submitBtn.disabled = false;
            if (nextBtn) nextBtn.disabled = true;
            
            return;
        }

        // Reklam göstər
        const adShown = await showAdsGramRewardedAd();
        
        if (!adShown) {
            // Reklam göstərilmədisə, normal davam et
            handleWrongAnswerWithoutAd();
        }
    }

    async function handleSubmit() {
        if (selectedOption === null || answerSubmitted) return;

        const currentQ = questions[currentQuestionIndex];
        const isCorrect = (selectedOption === currentQ.correct);
        
        answerSubmitted = true;
        renderOptions(selectedOption, currentQ.correct, true);
        
        const feedbackMessage = document.getElementById('feedbackMessage');
        const submitBtn = document.getElementById('submitBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        if (isCorrect) {
            score += 10;
            updateScore();
            if (feedbackMessage) {
                feedbackMessage.textContent = '✅ Doğru cavab! +10 xal';
                feedbackMessage.className = 'feedback-message success';
                feedbackMessage.style.display = 'block';
            }
            if (submitBtn) submitBtn.disabled = true;
            if (nextBtn) nextBtn.disabled = false;
        } else {
            // SƏHV CAVAB - AdsGram reklamı çağır
            if (feedbackMessage) {
                feedbackMessage.textContent = '❌ Səhv cavab! Reklam izləyib davam edə bilərsiniz...';
                feedbackMessage.className = 'feedback-message error';
                feedbackMessage.style.display = 'block';
            }
            
            if (submitBtn) submitBtn.disabled = true;
            
            // Reklamı göstər
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
        const gameScreen = document.getElementById('gameScreen');
        const resultScreen = document.getElementById('resultScreen');
        const finalScoreEl = document.getElementById('finalScore');
        
        if (gameScreen) gameScreen.classList.remove('active');
        if (resultScreen) resultScreen.classList.add('active');
        
        const totalScore = score;
        if (finalScoreEl) finalScoreEl.textContent = `${totalScore} / ${totalQuestions * 10}`;
        
        // İstifadəçi xalını yenilə
        userData.score += totalScore;
        userData.gamesPlayed++;
        
        saveUserToLocalStorage();
        
        // Firebase-ə yadda saxla
        if (db) {
            try {
                // Oyunu yadda saxla
                await db.collection('games').add({
                    userId: userData.uniqueId,
                    userLogin: userData.login,
                    userName: `${userData.firstName} ${userData.lastName}`.trim() || userData.login,
                    score: totalScore,
                    playedAt: new Date().toISOString()
                });
                
                // İstifadəçini yenilə
                await db.collection('users').doc(userData.uniqueId).set({
                    score: userData.score,
                    gamesPlayed: userData.gamesPlayed,
                    lastPlayed: new Date().toISOString()
                }, { merge: true });
                
                console.log('✅ Oyun nəticəsi Firebase-ə yadda saxlanıldı');
            } catch (error) {
                console.error('❌ Oyun nəticəsi yadda saxlanılarkən xəta:', error);
            }
        }
        
        if (tg) {
            tg.sendData(JSON.stringify({
                score: totalScore,
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
        extraLife = false; // Əlavə canı sıfırla
        
        updateScore();
        
        const resultScreen = document.getElementById('resultScreen');
        const gameScreen = document.getElementById('gameScreen');
        const menuTabs = document.querySelectorAll('.menu-tab');
        const headerTitle = document.getElementById('headerTitle');
        
        if (resultScreen) resultScreen.classList.remove('active');
        if (gameScreen) gameScreen.classList.add('active');
        
        if (menuTabs.length > 0) {
            menuTabs.forEach(t => t.classList.remove('active'));
            menuTabs[0].classList.add('active');
        }
        
        if (headerTitle) headerTitle.textContent = 'Sual-Cavab';
        
        loadQuestion();
        updateQuestionCounter();
    }

    // ------------------------------------------------------------
    // LİDERLƏR PANELİ FUNKSİYALARI (SADƏLƏŞDİRİLMİŞ)
    // ------------------------------------------------------------

    function loadLeaderboard(period) {
        console.log(`${period} liderlər paneli yüklənir...`);
        
        const leaderboardList = document.getElementById(`${period}Leaderboard`);
        const previousList = document.getElementById(`previous${period.charAt(0).toUpperCase() + period.slice(1)}Leaderboard`);
        const lastUpdated = document.getElementById(`${period}LastUpdated`);
        
        if (leaderboardList) {
            leaderboardList.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        }
        
        if (previousList) {
            previousList.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        }
        
        // Mock məlumatlar
        setTimeout(() => {
            if (leaderboardList) {
                leaderboardList.innerHTML = generateMockLeaderboardHTML(15);
            }
            
            if (previousList) {
                previousList.innerHTML = generateMockLeaderboardHTML(10, true);
            }
            
            if (lastUpdated) {
                const now = new Date();
                lastUpdated.textContent = `Son yenilənmə: ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
            }
            
            // Statistikanı yenilə
            document.getElementById(`${period}TotalPlayers`).textContent = Math.floor(Math.random() * 100) + 50;
            document.getElementById(`${period}TotalGames`).textContent = Math.floor(Math.random() * 200) + 100;
            document.getElementById(`${period}TopScore`).textContent = Math.floor(Math.random() * 5000) + 1000;
            
        }, 800);
    }

    function generateMockLeaderboardHTML(count, isPrevious = false) {
        const names = ['Kənan', 'Aysel', 'Rəşad', 'Leyla', 'Elvin', 'Nigar', 'Orxan', 'Fatimə', 'Murad', 'Zəhra'];
        let html = '';
        
        for (let i = 0; i < count; i++) {
            const score = Math.floor(Math.random() * 5000) + 500;
            const name = names[i % names.length];
            const isCurrentUser = i === 2 && !isPrevious;
            
            let rankClass = '';
            if (i === 0) rankClass = 'top-1';
            else if (i === 1) rankClass = 'top-2';
            else if (i === 2) rankClass = 'top-3';
            
            html += `
                <div class="leaderboard-item">
                    <div class="leaderboard-rank ${rankClass}">${i + 1}</div>
                    <div class="leaderboard-info">
                        <div class="leaderboard-name">
                            ${name}
                            ${isCurrentUser ? '<span class="leaderboard-badge">Siz</span>' : ''}
                            ${i === 0 && !isPrevious ? ' 👑' : ''}
                        </div>
                        <div class="leaderboard-score">
                            Xal <span>${score}</span>
                        </div>
                    </div>
                    <div style="font-size: 1.2rem;">
                        ${i === 0 && !isPrevious ? '🥇' : i === 1 && !isPrevious ? '🥈' : i === 2 && !isPrevious ? '🥉' : ''}
                    </div>
                </div>
            `;
        }
        
        return html;
    }

    // ------------------------------------------------------------
    // EVENT DİNLƏYİCİLƏRİ (DOM YÜKLƏNDİKDƏN SONRA)
    // ------------------------------------------------------------
    
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM yükləndi, eventlər əlavə edilir...');
        
        // Oyun düymələri
        const submitBtn = document.getElementById('submitBtn');
        const nextBtn = document.getElementById('nextBtn');
        const newGameBtn = document.getElementById('newGameBtn');
        const viewLeaderboardBtn = document.getElementById('viewLeaderboardBtn');
        
        if (submitBtn) submitBtn.addEventListener('click', handleSubmit);
        if (nextBtn) nextBtn.addEventListener('click', handleNext);
        if (newGameBtn) newGameBtn.addEventListener('click', resetGame);
        
        if (viewLeaderboardBtn) {
            viewLeaderboardBtn.addEventListener('click', () => {
                const resultScreen = document.getElementById('resultScreen');
                const dailyScreen = document.getElementById('dailyScreen');
                const headerTitle = document.getElementById('headerTitle');
                const menuTabs = document.querySelectorAll('.menu-tab');
                
                if (resultScreen) resultScreen.classList.remove('active');
                if (dailyScreen) dailyScreen.classList.add('active');
                if (headerTitle) headerTitle.textContent = 'Günlük Liderlər';
                
                if (menuTabs.length > 0) {
                    menuTabs.forEach(t => t.classList.remove('active'));
                    if (menuTabs[1]) menuTabs[1].classList.add('active');
                }
                
                loadLeaderboard('daily');
            });
        }

        // Profil paneli
        const profileBtn = document.getElementById('profileBtn');
        const userProfile = document.getElementById('userProfile');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        const closeSidebar = document.getElementById('closeSidebar');
        const saveProfileBtn = document.getElementById('saveProfileBtn');
        
        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                displayUserProfile();
                if (userProfile) userProfile.classList.add('active');
                if (sidebarOverlay) sidebarOverlay.classList.add('active');
            });
        }

        if (closeSidebar) {
            closeSidebar.addEventListener('click', () => {
                if (userProfile) userProfile.classList.remove('active');
                if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            });
        }

        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', () => {
                if (userProfile) userProfile.classList.remove('active');
                if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            });
        }

        if (saveProfileBtn) {
            saveProfileBtn.addEventListener('click', saveUserProfile);
        }

        // Menu keçidləri
        const menuTabs = document.querySelectorAll('.menu-tab');
        menuTabs.forEach((tab) => {
            tab.addEventListener('click', () => {
                const screenName = tab.dataset.screen;
                
                menuTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                document.querySelectorAll('.screen').forEach(screen => {
                    screen.classList.remove('active');
                });
                
                const headerTitle = document.getElementById('headerTitle');
                
                switch(screenName) {
                    case 'game':
                        const gameScreen = document.getElementById('gameScreen');
                        if (gameScreen) gameScreen.classList.add('active');
                        if (headerTitle) headerTitle.textContent = 'Sual-Cavab';
                        break;
                    case 'daily':
                        const dailyScreen = document.getElementById('dailyScreen');
                        if (dailyScreen) dailyScreen.classList.add('active');
                        if (headerTitle) headerTitle.textContent = 'Günlük Liderlər';
                        loadLeaderboard('daily');
                        break;
                    case 'weekly':
                        const weeklyScreen = document.getElementById('weeklyScreen');
                        if (weeklyScreen) weeklyScreen.classList.add('active');
                        if (headerTitle) headerTitle.textContent = 'Həftəlik Liderlər';
                        loadLeaderboard('weekly');
                        break;
                    case 'monthly':
                        const monthlyScreen = document.getElementById('monthlyScreen');
                        if (monthlyScreen) monthlyScreen.classList.add('active');
                        if (headerTitle) headerTitle.textContent = 'Aylıq Liderlər';
                        loadLeaderboard('monthly');
                        break;
                }
            });
        });

        // Yenilə düymələri
        const refreshDaily = document.getElementById('refreshDaily');
        const refreshWeekly = document.getElementById('refreshWeekly');
        const refreshMonthly = document.getElementById('refreshMonthly');
        
        if (refreshDaily) {
            refreshDaily.addEventListener('click', () => loadLeaderboard('daily'));
        }
        
        if (refreshWeekly) {
            refreshWeekly.addEventListener('click', () => loadLeaderboard('weekly'));
        }
        
        if (refreshMonthly) {
            refreshMonthly.addEventListener('click', () => loadLeaderboard('monthly'));
        }

        // Telegram geri düyməsi
        if (tg) {
            tg.onEvent('backButtonClicked', () => {
                const userProfile = document.getElementById('userProfile');
                const dailyScreen = document.getElementById('dailyScreen');
                const weeklyScreen = document.getElementById('weeklyScreen');
                const monthlyScreen = document.getElementById('monthlyScreen');
                const resultScreen = document.getElementById('resultScreen');
                const sidebarOverlay = document.getElementById('sidebarOverlay');
                
                if (userProfile && userProfile.classList.contains('active')) {
                    userProfile.classList.remove('active');
                    if (sidebarOverlay) sidebarOverlay.classList.remove('active');
                } else if ((dailyScreen && dailyScreen.classList.contains('active')) || 
                           (weeklyScreen && weeklyScreen.classList.contains('active')) || 
                           (monthlyScreen && monthlyScreen.classList.contains('active'))) {
                    const gameTab = document.querySelector('.menu-tab[data-screen="game"]');
                    if (gameTab) gameTab.click();
                } else if (resultScreen && resultScreen.classList.contains('active')) {
                    resetGame();
                } else {
                    tg.close();
                }
            });
        }

        // Başlanğıc
        loadUserFromFirebase().then(() => {
            resetGame();
        });
    });

})();
