// exam.js - Universal Exam System (FULL VERSION)
class UniversalExamSystem {
    constructor(config = {}) {
        console.log("🎯 UNIVERSAL EXAM SYSTEM STARTING...");

        this.isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        this.isLocked = false;
        this.violationCount = 0;
        this.warningCount = 0;
        this.maxWarnings = 3;
        this.examSubmitted = false;
        this.examStarted = false;

        // Anti false positive
        this.ignoreNextUnload = false;
        this.isPageRefreshing = false;
        this.legitimateActions = new Set(['PAGE_REFRESH']);
        this.isViolationDisabled = false;
        this.blurTime = null;

        // Timer
        this.examDuration = config.examDuration || 120 * 60; // 120 menit default
        this.timeLeft = parseInt(localStorage.getItem('exam_time_left')) || this.examDuration;
        this.timerInterval = null;

        // Telegram endpoint
        this.telegramServerEndpoint = config.telegramServerEndpoint || '/api/telegram-alert/';

        // Student data
        this.studentDataList = config.studentDataList || [];
        this.studentData = config.studentData || {};

        // Elements
        this.elements = {
            examFrame: document.getElementById('examFrame'),
            startButton: document.getElementById('startButton'),
            startOverlay: document.getElementById('startOverlay'),
            studentName: document.getElementById('studentName'),
            examName: document.getElementById('examName'),
            warningText: document.getElementById('warningText'),
            overlayTimer: document.getElementById('overlayTimer'),
            timer: document.getElementById('timer'),
            timerStatus: document.getElementById('timerStatus'),
            studentPhoto: document.getElementById('studentPhoto'),
            violationModal: document.getElementById('violationModal'),
            violationMessage: document.getElementById('violationMessage')
        };

        console.log("📱 Platform:", this.isMobile ? 'Mobile' : 'Desktop');
        console.log("⏰ Time left:", this.timeLeft);

        this.init();
    }

    init() {
        console.log("🚀 INITIALIZING SYSTEM...");

        this.loadExamData();
        this.setupStartOverlay();
        this.checkSubmitButton();

        console.log("✅ SYSTEM READY!");
    }

    checkSubmitButton() {
        console.log("🔍 CHECKING SUBMIT BUTTON IN HTML...");
        const submitBtn = document.getElementById('safeSubmitBtn');
        if (!submitBtn) {
            console.error("❌ ERROR: safeSubmitBtn NOT FOUND in HTML!");
            console.error("Please add this to your HTML:");
            console.error('<button id="safeSubmitBtn" class="safe-submit-btn hidden">');
            
            // Emergency create button
            this.createEmergencySubmitButton();
        } else {
            console.log("✅ Submit button found in HTML");
            // Initialize with hidden state
            submitBtn.classList.add('hidden');
            submitBtn.style.display = 'none';
        }
    }

    createEmergencySubmitButton() {
        console.log("🆘 CREATING EMERGENCY SUBMIT BUTTON...");
        
        const btn = document.createElement('button');
        btn.id = 'safeSubmitBtn';
        btn.className = 'safe-submit-btn hidden';
        btn.innerHTML = `
            <span class="submit-icon">✅</span>
            <span class="submit-text">SAYA SUDAH SELESAI & KIRIM JAWABAN</span>
        `;
        
        // Style inline langsung
        btn.style.cssText = `
            position: fixed !important;
            bottom: 20px !important;
            right: 20px !important;
            padding: 18px 32px !important;
            font-size: 16px !important;
            font-weight: 700 !important;
            background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%) !important;
            color: white !important;
            border: none !important;
            border-radius: 15px !important;
            cursor: pointer !important;
            z-index: 10000 !important;
            box-shadow: 0 8px 30px rgba(46, 204, 113, 0.5) !important;
            border: 2px solid rgba(255, 255, 255, 0.4) !important;
            backdrop-filter: blur(10px) !important;
            display: none !important;
            align-items: center !important;
            gap: 10px !important;
            opacity: 0 !important;
            visibility: hidden !important;
            transform: translateY(20px) !important;
            pointer-events: none !important;
            transition: all 0.3s ease !important;
        `;
        
        // Click handler
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("🟢 EMERGENCY SUBMIT BUTTON CLICKED");
            this.handleSafeSubmit();
        };
        
        document.body.appendChild(btn);
        console.log("✅ EMERGENCY SUBMIT BUTTON CREATED");
    }

    loadExamData() {
        console.log("📝 LOADING EXAM DATA...");

        const studentNameRaw = (localStorage.getItem('nama') || 'Unknown Student').trim();
        const examName = localStorage.getItem('nama_ujian') || 'Unknown Exam';
        const className = localStorage.getItem('kelas') || 'Unknown Class';

        // Update UI elements
        if (this.elements.studentName) {
            this.elements.studentName.textContent = studentNameRaw;
            this.elements.studentName.title = studentNameRaw; // Tooltip untuk nama panjang
        }
        
        if (this.elements.examName) {
            this.elements.examName.textContent = examName;
            this.elements.examName.title = examName;
        }
        
        if (this.elements.warningText) {
            this.elements.warningText.textContent = '0/3';
        }
        
        // Update overlay timer
        if (this.elements.overlayTimer) {
            const minutes = Math.floor(this.examDuration / 60);
            this.elements.overlayTimer.textContent = minutes;
        }

        console.log("👤 Student:", studentNameRaw);
        console.log("🏫 Class:", className);
        console.log("📚 Exam:", examName);

        // Load exam URL
        const urlParams = new URLSearchParams(window.location.search);
        const examUrl = urlParams.get('url') || 'https://google.com';

        if (this.elements.examFrame && examUrl) {
            console.log("🌐 Exam URL:", examUrl);
            this.elements.examFrame.src = examUrl;
            
            // Add loading handler
            this.elements.examFrame.onload = () => {
                console.log("✅ Exam iframe loaded successfully");
            };
            
            this.elements.examFrame.onerror = () => {
                console.error("❌ Failed to load exam iframe");
            };
        }
    }

    setupStartOverlay() {
        console.log("🖥️ SETTING UP START OVERLAY...");

        if (this.elements.startButton && this.elements.startOverlay && this.elements.examFrame) {
            // Show overlay, hide iframe
            this.elements.startOverlay.style.display = 'flex';
            this.elements.examFrame.style.display = 'none';

            this.elements.startButton.onclick = () => {
                console.log("🖱️ Start button clicked");
                this.requestFullscreen();
            };
        }
    }

    async requestFullscreen() {
        try {
            console.log("🖥️ REQUESTING FULLSCREEN...");
            
            // Hide overlay first
            if (this.elements.startOverlay) {
                this.elements.startOverlay.style.display = 'none';
                this.elements.startOverlay.classList.remove('visible');
            }
            
            if (this.elements.examFrame) {
                this.elements.examFrame.style.display = 'block';
                this.elements.examFrame.classList.add('active');
                
                // Focus iframe untuk interaksi
                setTimeout(() => {
                    try {
                        this.elements.examFrame.focus();
                    } catch (e) {
                        console.log("⚠️ Cannot focus iframe (cross-origin restriction)");
                    }
                }, 100);
            }
            
            // Request fullscreen
            const elem = document.documentElement;
            let promise;

            if (elem.requestFullscreen) {
                promise = elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                promise = elem.webkitRequestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                promise = elem.mozRequestFullScreen();
            } else if (elem.msRequestFullscreen) {
                promise = elem.msRequestFullscreen();
            } else {
                console.log("❌ Fullscreen API not supported");
                this.startExam();
                return;
            }

            await promise;
            
            console.log("✅ FULLSCREEN ACTIVATED");
            this.isLocked = true;
            this.startExam();

        } catch (error) {
            console.log("❌ FULLSCREEN FAILED:", error);
            this.showFullscreenWarning();
        }
    }

    showFullscreenWarning() {
        console.log("⚠️ SHOWING FULLSCREEN WARNING MODAL");
        
        // Hapus modal lama jika ada
        const oldModal = document.querySelector('.fullscreen-warning-modal');
        if (oldModal) oldModal.remove();

        const modal = document.createElement('div');
        modal.className = 'fullscreen-warning-modal';
        modal.innerHTML = `
            <div class="warning-icon">⚠️</div>
            <h2 class="warning-title">IZINKAN FULLSCREEN!</h2>
            <p class="warning-message">Ujian harus dilakukan dalam mode fullscreen.<br>Silakan izinkan permintaan fullscreen browser Anda.</p>
            <div class="warning-buttons">
                <button id="retryFullscreenBtn" class="btn-primary">Coba Lagi</button>
                <button id="continueBtn" class="btn-secondary">Lanjut Tanpa Fullscreen</button>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('retryFullscreenBtn').onclick = () => {
            modal.remove();
            this.requestFullscreen();
        };

        document.getElementById('continueBtn').onclick = () => {
            modal.remove();
            this.startExam();
        };
    }

    startExam() {
        console.log("▶️ STARTING EXAM...");

        // DEBUG LOG untuk tombol selesai
        console.log("🔍 CHECKING SUBMIT BUTTON BEFORE EXAM START...");
        const submitBtn = document.getElementById('safeSubmitBtn');
        console.log("Submit button exists:", !!submitBtn);
        if (submitBtn) {
            console.log("Submit button classes:", submitBtn.className);
            console.log("Submit button computed display:", window.getComputedStyle(submitBtn).display);
        }

        if (this.elements.examFrame) {
            this.elements.examFrame.style.display = 'block';
            this.elements.examFrame.classList.add('active');
        }
        
        if (this.elements.timerStatus) {
            this.elements.timerStatus.textContent = "Timer sedang berjalan...";
            this.elements.timerStatus.classList.add('timer-running');
        }

        this.examStarted = true;
        this.startTimer();
        this.activateFullLockdown();
        this.blockShortcuts();
        this.startMonitoring();
        
        // TAMPILKAN TOMBOL SELESAI!
        this.showSubmitButton();

        console.log("✅ EXAM STARTED!");
    }

    showSubmitButton() {
        console.log("🟢 SHOWING SUBMIT BUTTON...");
        const submitBtn = document.getElementById('safeSubmitBtn');
        
        if (submitBtn) {
            console.log("✅ Found submit button in DOM");
            
            // 1. Hapus class hidden
            submitBtn.classList.remove('hidden');
            console.log("✅ Hidden class removed");
            
            // 2. Set style secara bertahap
            submitBtn.style.display = 'flex';
            setTimeout(() => {
                submitBtn.style.opacity = '1';
                submitBtn.style.visibility = 'visible';
                submitBtn.style.transform = 'translateY(0)';
                submitBtn.style.pointerEvents = 'all';
                submitBtn.classList.add('visible');
            }, 10);
            
            console.log("✅ Styles applied");
            
            // 3. Tambah event listener (overwrite jika sudah ada)
            const oldOnClick = submitBtn.onclick;
            submitBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("🟢 SUBMIT BUTTON CLICKED!");
                this.handleSafeSubmit();
            };
            
            // 4. Tambah keyboard shortcut (Alt+Enter)
            document.addEventListener('keydown', (e) => {
                if (e.altKey && e.key === 'Enter' && this.examStarted && !this.examSubmitted) {
                    e.preventDefault();
                    console.log("🟢 ALT+ENTER PRESSED - Triggering submit");
                    this.handleSafeSubmit();
                }
            });
            
            console.log("✅ Submit button SHOWN and READY");
        } else {
            console.error("❌ ERROR: safeSubmitBtn NOT FOUND!");
            console.error("Creating emergency button...");
            this.createEmergencySubmitButton();
            
            // Coba lagi setelah 1 detik
            setTimeout(() => {
                this.showSubmitButton();
            }, 1000);
        }
    }

    hideSubmitButton() {
        const submitBtn = document.getElementById('safeSubmitBtn');
        if (submitBtn) {
            submitBtn.classList.add('hidden');
            submitBtn.classList.remove('visible');
            submitBtn.style.opacity = '0';
            submitBtn.style.visibility = 'hidden';
            submitBtn.style.transform = 'translateY(20px)';
            submitBtn.style.pointerEvents = 'none';
            setTimeout(() => {
                submitBtn.style.display = 'none';
            }, 300);
        }
    }

    startTimer() {
        console.log("⏰ STARTING TIMER...");

        const updateTimer = () => {
            // Simpan waktu ke localStorage untuk recovery
            localStorage.setItem('exam_time_left', this.timeLeft);

            const minutes = Math.floor(this.timeLeft / 60);
            const seconds = this.timeLeft % 60;
            const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            // Update semua timer display
            if (this.elements.timer) {
                this.elements.timer.textContent = timeString;
                if (this.timeLeft < 300) { // 5 menit terakhir
                    this.elements.timer.classList.add('timer-critical');
                    if (this.timeLeft === 300) {
                        this.showTimeWarning("⚠️ 5 MENIT LAGI!");
                    }
                }
            }

            if (this.elements.overlayTimer) {
                this.elements.overlayTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }

            // Update timer display di overlay jika ada
            const timerDisplay = document.querySelector('.timer-display');
            if (timerDisplay) {
                timerDisplay.textContent = timeString;
                if (this.timeLeft < 300) {
                    timerDisplay.classList.add('timer-critical');
                }
            }

            // Cek jika waktu habis
            if (this.timeLeft <= 0) {
                this.finishExam();
                return;
            }

            this.timeLeft--;
        };

        // Start interval
        this.timerInterval = setInterval(updateTimer, 1000);
        updateTimer(); // Panggil sekali untuk update langsung

        console.log("✅ TIMER STARTED");
    }

    showTimeWarning(message) {
        const warning = document.createElement('div');
        warning.className = 'time-warning';
        warning.textContent = message;
        warning.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #ff6b6b, #ee5a52);
            color: white;
            padding: 20px 40px;
            border-radius: 15px;
            font-weight: bold;
            z-index: 9999;
            box-shadow: 0 10px 30px rgba(255, 107, 107, 0.5);
            animation: pulse 1s infinite;
        `;
        
        document.body.appendChild(warning);
        
        setTimeout(() => {
            if (warning.parentNode) {
                warning.parentNode.removeChild(warning);
            }
        }, 3000);
    }

    activateFullLockdown() {
        console.log("🔒 ACTIVATING LOCKDOWN...");

        const fsChange = () => {
            const isFs = !!(document.fullscreenElement || 
                           document.webkitFullscreenElement || 
                           document.mozFullScreenElement || 
                           document.msFullscreenElement);
            
            if (!isFs && this.isLocked && !this.examSubmitted) {
                console.log("❌ FULLSCREEN EXITED");
                this.detectViolation('FULLSCREEN_EXIT', 'User left fullscreen');

                // Auto request fullscreen kembali
                setTimeout(() => {
                    if (!this.examSubmitted) {
                        this.requestFullscreen();
                    }
                }, 1000);
            }
        };

        document.addEventListener('fullscreenchange', fsChange);
        document.addEventListener('webkitfullscreenchange', fsChange);
        document.addEventListener('mozfullscreenchange', fsChange);

        // Block right click
        document.addEventListener('contextmenu', e => {
            e.preventDefault();
            if (this.examStarted && !this.examSubmitted) {
                this.detectViolation('CONTEXT_MENU', 'Right click detected');
            }
        });

        // Block text selection
        if (document.documentElement) {
            document.documentElement.classList.add('no-select');
        }

        // Block drag and drop
        document.addEventListener('dragstart', e => e.preventDefault());
        document.addEventListener('drop', e => e.preventDefault());

        console.log("✅ LOCKDOWN ACTIVATED");
    }

    blockShortcuts() {
        console.log("⌨️ BLOCKING SHORTCUTS...");

        const blockedHandler = (e) => {
            if (this.isViolationDisabled || this.examSubmitted || !this.examStarted) return;

            const key = e.key || e.code || '';

            const blocked =
                e.key === 'F12' ||
                e.key === 'F11' ||
                e.key === 'F5' ||
                (e.ctrlKey && (e.key === 'r' || e.key === 'R')) ||
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) ||
                (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) ||
                (e.ctrlKey && e.key === 'U') ||
                e.key === 'PrintScreen' ||
                (e.altKey && e.key === 'Tab') ||
                (e.ctrlKey && e.key === 't') || // New tab
                (e.ctrlKey && e.key === 'n') || // New window
                (e.ctrlKey && e.shiftKey && e.key === 'N') || // New incognito
                e.key === 'Escape';

            if (blocked) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                console.log(`🚫 BLOCKED KEY: ${key}`);
                this.detectViolation('KEYBOARD_SHORTCUT', `Pressed: ${key}`);
                return false;
            }
        };

        // Gunakan capture phase untuk menangkap lebih awal
        document.addEventListener('keydown', blockedHandler, true);
        window.addEventListener('keydown', blockedHandler, true);

        console.log("✅ SHORTCUTS BLOCKED");
    }

    startMonitoring() {
        console.log("👁️ STARTING MONITORING...");

        let visibilityTimer = null;
        let hiddenStartTime = null;

        document.addEventListener('visibilitychange', () => {
            if (this.isViolationDisabled || this.examSubmitted || !this.examStarted) return;

            if (document.hidden) {
                hiddenStartTime = Date.now();
                visibilityTimer = setTimeout(() => {
                    if (document.hidden && !this.isPageRefreshing) {
                        const duration = Date.now() - hiddenStartTime;
                        console.log("❌ CONFIRMED: REAL PAGE LEAVE");
                        this.detectViolation('PAGE_HIDDEN', `Left page for ${Math.round(duration/1000)}s`);
                    }
                }, 2000);
            } else {
                if (visibilityTimer) clearTimeout(visibilityTimer);
                hiddenStartTime = null;
            }
        });

        window.addEventListener('blur', () => {
            if (this.isViolationDisabled || this.examSubmitted || !this.examStarted) return;
            console.log("⚠️ WINDOW BLURRED - MONITORING...");
            this.blurTime = Date.now();
        });

        window.addEventListener('focus', () => {
            if (this.isViolationDisabled || this.examSubmitted || !this.examStarted) return;

            if (this.blurTime) {
                const blurDuration = Date.now() - this.blurTime;
                console.log(`✅ WINDOW FOCUSED AFTER ${blurDuration}ms`);

                if (blurDuration > 5000 && !this.isPageRefreshing) {
                    console.log("❌ CONFIRMED: REAL APP SWITCHING");
                    this.detectViolation('WINDOW_SWITCH', `Switched app for ${Math.round(blurDuration/1000)}s`);
                }
            }
            this.blurTime = null;
        });

        window.addEventListener('beforeunload', (e) => {
            if (this.ignoreNextUnload || this.isPageRefreshing || this.examSubmitted || !this.examStarted) {
                console.log("🔄 REFRESH DETECTED - IGNORING VIOLATION");
                return;
            }
            console.log("🚨 REAL NAVIGATION ATTEMPT");
            this.detectViolation('PAGE_NAVIGATION', 'Tried to leave exam page');
            e.preventDefault();
            e.returnValue = 'Anda tidak boleh meninggalkan halaman ujian!';
        });

        // Monitor iframe events
        if (this.elements.examFrame) {
            window.addEventListener('message', (e) => {
                console.log("📨 Message from iframe:", e.data);
                // Tambahkan logika handling message dari iframe jika perlu
            });
        }

        console.log("✅ MONITORING STARTED");
    }

    async detectViolation(violationType, details) {
        if (this.isViolationDisabled || this.examSubmitted || !this.examStarted) {
            console.log(`✅ IGNORING ${violationType} - Detection disabled or exam submitted`);
            return;
        }

        if (this.isPageRefreshing || this.legitimateActions.has(violationType)) {
            console.log(`✅ IGNORING ${violationType} - Legitimate action`);
            return;
        }

        this.violationCount++;
        this.warningCount++;

        console.log(`🚨 VIOLATION #${this.violationCount}: ${violationType} - ${details}`);
        console.log(`📊 WARNINGS: ${this.warningCount}/${this.maxWarnings}`);

        // Update UI
        this.updateWarningDisplay();
        
        // Play sound effect
        this.playSiren();
        
        // Show visual warning
        this.showViolationModal(violationType, details);
        
        // Send to Telegram
        await this.sendViolationAlert(violationType, details);

        // Check if max warnings reached
        if (this.warningCount >= this.maxWarnings) {
            console.log("💀 MAX WARNINGS REACHED - TERMINATING EXAM");
            setTimeout(() => {
                this.triggerExamTermination();
            }, 1000);
        }
    }

    async sendViolationAlert(violationType, details) {
        console.log("📤 SENDING VIOLATION ALERT TO SERVER...");

        try {
            const studentNameRaw = (localStorage.getItem('nama') || 'Unknown Student').trim();
            const examName = localStorage.getItem('nama_ujian') || 'Unknown Exam';
            const platform = this.isMobile ? 'Mobile' : 'Desktop';
            const className = this.getStudentClass(studentNameRaw);
            const timestamp = new Date().toLocaleString('id-ID');

            const message = `🚨 PELANGGARAN UJIAN TERDETEKSI 🚨

👤 Siswa: ${studentNameRaw}
🏫 Kelas: ${className}
📚 Ujian: ${examName}
⚠️ Jenis Pelanggaran: ${violationType}
📋 Detail: ${details}
🔢 Peringatan: ${this.warningCount}/${this.maxWarnings}
💻 Platform: ${platform}
⏰ Waktu: ${timestamp}`.trim();

            const payload = {
                type: 'VIOLATION',
                student: studentNameRaw,
                class: className,
                exam: examName,
                violationType: violationType,
                details: details,
                warningCount: this.warningCount,
                maxWarnings: this.maxWarnings,
                platform: platform,
                timestamp: timestamp,
                message: message
            };

            console.log('📨 SENDING VIOLATION PAYLOAD:', payload);

            const response = await fetch(this.telegramServerEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(payload)
            });

            console.log('📩 VIOLATION RESPONSE STATUS:', response.status);

        } catch (error) {
            console.error('❌ VIOLATION ALERT FAILED:', error);
        }
    }

    getStudentClass(studentName) {
        const className = localStorage.getItem('kelas') || 'Unknown Class';
        
        if (this.studentDataList && this.studentDataList.length > 0) {
            const student = this.studentDataList.find(s => 
                s.nama && s.nama.trim().toLowerCase() === studentName.toLowerCase()
            );
            if (student && student.kelas) {
                return student.kelas;
            }
        }
        
        return className || 'Unknown Class';
    }

    updateWarningDisplay() {
        // Update warning text
        if (this.elements.warningText) {
            this.elements.warningText.textContent = `${this.warningCount}/${this.maxWarnings}`;
        }

        // Update warning dot color
        const warningDot = document.querySelector('.warning-dot');
        if (warningDot) {
            warningDot.classList.remove('warning-low', 'warning-medium', 'warning-high');
            
            if (this.warningCount === 1) {
                warningDot.classList.add('warning-low');
            } else if (this.warningCount === 2) {
                warningDot.classList.add('warning-medium');
            } else if (this.warningCount >= 3) {
                warningDot.classList.add('warning-high');
            }
        }

        // Update header warning indicator
        const warningCountElement = document.querySelector('.warning-count');
        if (warningCountElement) {
            warningCountElement.classList.remove('warning-low', 'warning-medium', 'warning-high');
            
            if (this.warningCount === 1) {
                warningCountElement.classList.add('warning-low');
            } else if (this.warningCount === 2) {
                warningCountElement.classList.add('warning-medium');
            } else if (this.warningCount >= 3) {
                warningCountElement.classList.add('warning-high');
                warningCountElement.style.animation = 'pulse 0.5s infinite';
            }
        }
    }

    playSiren() {
        if (this.isViolationDisabled || this.examSubmitted) return;

        console.log("🔊 PLAYING BEEP SIREN...");
        
        // Coba play audio file
        const audio = document.getElementById('warningSound');
        if (audio && typeof audio.play === 'function') {
            audio.volume = 0.7;
            audio.currentTime = 0;
            
            audio.play().catch(e => {
                console.log("❌ AUDIO FILE FAILED:", e);
                this.playWebBeep();
            });
        } else {
            this.playWebBeep();
        }
        
        // Flash screen
        this.flashScreen();
    }

    playWebBeep() {
        if (this.isViolationDisabled || this.examSubmitted) return;

        console.log("🔊 USING WEB AUDIO BEEP...");
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) {
                console.log("❌ Web Audio API not supported");
                return;
            }
            
            const audioContext = new AudioContext();
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.5);
            
            gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.5);

            setTimeout(() => {
                if (audioContext.close) {
                    audioContext.close();
                }
            }, 1000);

            console.log("✅ WEB BEEP PLAYED");
        } catch (error) {
            console.log("❌ WEB BEEP FAILED:", error);
        }
    }

    flashScreen() {
        if (this.isViolationDisabled || this.examSubmitted) return;

        const overlay = document.createElement('div');
        overlay.className = 'flash-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 0, 0, 0.3);
            z-index: 9998;
            pointer-events: none;
            animation: flash 0.5s ease-in-out;
        `;

        // Add animation if not exists
        if (!document.querySelector('style#flash-animation')) {
            const style = document.createElement('style');
            style.id = 'flash-animation';
            style.textContent = `
                @keyframes flash {
                    0% { opacity: 0; }
                    50% { opacity: 1; }
                    100% { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(overlay);

        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 500);
    }

    showViolationModal(violationType, details) {
        if (this.isViolationDisabled || this.examSubmitted) return;

        console.log("📢 SHOWING VIOLATION MODAL...");

        // Gunakan modal yang sudah ada di HTML atau buat baru
        let modal = this.elements.violationModal;
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'violationModal';
            modal.className = 'modal';
            modal.style.display = 'none';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-icon">🚨</div>
                <h3>PELANGGARAN TERDETEKSI!</h3>
                <p class="violation-type">${this.getViolationText(violationType)}</p>
                <p id="violationMessage">${details}</p>
                <div class="warning-sound">🔊 Suara peringatan aktif</div>
                <div class="warning-count-display">
                    Peringatan: <span class="warning-count-number">${this.warningCount}/${this.maxWarnings}</span>
                </div>
                <button onclick="closeModal()" class="btn-acknowledge">
                    Saya Mengerti
                </button>
            </div>
        `;
        
        modal.style.display = 'block';
        modal.classList.add('visible');

        // Auto close setelah 4 detik
        setTimeout(() => {
            this.closeModal();
        }, 4000);
    }

    getViolationText(violationType) {
        const texts = {
            'FULLSCREEN_EXIT': 'Anda keluar dari mode fullscreen!',
            'CONTEXT_MENU': 'Klik kanan dilarang selama ujian!',
            'KEYBOARD_SHORTCUT': 'Shortcut keyboard diblokir!',
            'PAGE_HIDDEN': 'Anda meninggalkan halaman ujian!',
            'WINDOW_SWITCH': 'Anda berpindah aplikasi/window!',
            'PAGE_NAVIGATION': 'Anda mencoba meninggalkan halaman ujian!'
        };
        return texts[violationType] || 'Pelanggaran terdeteksi!';
    }

    closeModal() {
        const modal = document.getElementById('violationModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('visible');
        }
    }

    async handleSafeSubmit() {
        if (this.examSubmitted) {
            console.log("⚠️ Exam already submitted");
            return;
        }

        console.log("🟢 HANDLING SAFE SUBMIT...");

        // Disable violation detection sementara
        this.disableViolationDetection();

        const userConfirmed = confirm(
            '⚠️ KONFIRMASI PENGIRIMAN ⚠️\n\n' +
            'Apakah Anda yakin sudah mengirim jawaban di Google Form?\n\n' +
            'PASTIKAN ANDA SUDAH:\n' +
            '✅ 1. Mengisi semua jawaban\n' +
            '✅ 2. Klik tombol "Kirim" di Google Form\n' +
            '✅ 3. Melihat halaman konfirmasi "Jawaban Anda telah direkam"\n\n' +
            'Klik OK untuk mengakhiri ujian dan kembali ke login.'
        );

        if (userConfirmed) {
            console.log("✅ User confirmed submission");
            
            // Play success sound
            this.playCuteSound();
            
            // Send completion alert
            await this.sendCompletionAlert();
            
            // Handle completion
            this.handleExamCompletion();
        } else {
            console.log("❌ User cancelled submission");
            // Re-enable violation detection
            this.enableViolationDetection();
        }
    }
playCuteSound() {
    console.log("🔊 PLAYING CUTE RINGTONE (SIMPLE VERSION)...");
    
    // Coba 3 metode berbeda
    this.tryAudioMethod1();
}

tryAudioMethod1() {
    try {
        // Method 1: Use existing audio element
        const audio = document.getElementById('cuteSound');
        if (!audio) throw new Error('No audio element');
        
        audio.currentTime = 0;
        audio.volume = 0.7;
        
        audio.play()
            .then(() => console.log("✅ Method 1: Element play success"))
            .catch(e => {
                console.log("❌ Method 1 failed:", e.message);
                this.tryAudioMethod2();
            });
            
    } catch (error) {
        console.log("❌ Method 1 error:", error.message);
        this.tryAudioMethod2();
    }
}

tryAudioMethod2() {
    try {
        // Method 2: Create new audio with base URL
        const baseUrl = window.location.origin;
        const audio = new Audio(baseUrl + '/static/ujian_core/sounds/cute.mp3');
        audio.volume = 0.7;
        
        audio.play()
            .then(() => console.log("✅ Method 2: New audio success"))
            .catch(e => {
                console.log("❌ Method 2 failed:", e.message);
                this.tryAudioMethod3();
            });
            
    } catch (error) {
        console.log("❌ Method 2 error:", error.message);
        this.tryAudioMethod3();
    }
}

tryAudioMethod3() {
    try {
        // Method 3: Use beep.mp3 as last resort
        const audio = document.getElementById('warningSound') || 
                     new Audio('/static/ujian_core/sounds/beep.mp3');
        audio.currentTime = 0;
        audio.volume = 0.7;
        
        audio.play()
            .then(() => console.log("✅ Method 3: Beep success"))
            .catch(e => {
                console.log("❌ Method 3 failed:", e.message);
                console.log("🎵 ALL AUDIO METHODS FAILED");
            });
            
    } catch (error) {
        console.log("❌ Method 3 error:", error.message);
    }
}

    async sendCompletionAlert() {
        console.log("📤 SENDING COMPLETION ALERT TO SERVER...");

        try {
            const studentNameRaw = (localStorage.getItem('nama') || 'Unknown Student').trim();
            const examName = localStorage.getItem('nama_ujian') || 'Unknown Exam';
            const platform = this.isMobile ? 'Mobile' : 'Desktop';
            const className = this.getStudentClass(studentNameRaw);
            const timestamp = new Date().toLocaleString('id-ID');

            const message = `✅ SISWA MENYELESAIKAN UJIAN

👤 Siswa: ${studentNameRaw}
🏫 Kelas: ${className}
📚 Ujian: ${examName}
💻 Platform: ${platform}
⏰ Waktu: ${timestamp}
⏱️ Sisa Waktu: ${Math.floor(this.timeLeft/60)}:${this.timeLeft%60}
✅ Status: Ujian selesai dengan baik`.trim();

            const payload = {
                type: 'EXAM_FINISHED',
                student: studentNameRaw,
                class: className,
                exam: examName,
                platform: platform,
                timestamp: timestamp,
                status: 'completed',
                timeLeft: this.timeLeft,
                message: message,
                isCompletion: true
            };

            console.log('📨 SENDING COMPLETION PAYLOAD:', payload);

            const response = await fetch(this.telegramServerEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(payload)
            });

            console.log('📩 COMPLETION RESPONSE STATUS:', response.status);

        } catch (error) {
            console.error('❌ COMPLETION ALERT FAILED:', error);
        }
    }

    handleExamCompletion() {
        console.log("🎉 HANDLING EXAM COMPLETION...");

        this.examSubmitted = true;

        // Stop timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        // Hide submit button
        this.hideSubmitButton();

        // Show completion overlay
        const completionOverlay = document.createElement('div');
        completionOverlay.id = 'completionOverlay';
        completionOverlay.className = 'completion-overlay visible';
        completionOverlay.innerHTML = `
            <div class="completion-modal">
                <div class="completion-icon">🎉</div>
                <h1 class="completion-title">UJIAN SELESAI</h1>
                <p class="completion-message">Jawaban Anda telah berhasil dikirim!<br>Terima kasih telah mengikuti ujian.</p>
                <div class="redirect-spinner">
                    <div class="spinner"></div>
                    <p class="redirect-text">Mengarahkan ke halaman login...</p>
                </div>
            </div>
        `;

        document.body.appendChild(completionOverlay);

        // Redirect setelah 2 detik
        setTimeout(() => {
            this.finalRedirect();
        }, 2000);
    }

    finalRedirect() {
        console.log("🔀 FINAL REDIRECT TO LOGIN...");
        
        // Clear localStorage
        localStorage.removeItem('exam_time_left');
        localStorage.removeItem('nama');
        localStorage.removeItem('nama_ujian');
        localStorage.removeItem('kelas');
        
        // Exit fullscreen jika masih aktif
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
        
        // Redirect ke halaman login
        window.location.href = '/';
    }

    finishExam() {
        console.log("✅ EXAM FINISHED - TIME UP");

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        // Show time up modal
        this.showTimeUpModal();
        
        // Redirect setelah 3 detik
        setTimeout(() => {
            localStorage.removeItem('exam_time_left');
            window.location.href = '/';
        }, 3000);
    }

    showTimeUpModal() {
        const modal = document.createElement('div');
        modal.className = 'timeup-modal';
        modal.innerHTML = `
            <div class="timeup-content">
                <div class="timeup-icon">⏰</div>
                <h2 class="timeup-title">WAKTU HABIS!</h2>
                <p class="timeup-message">Waktu ujian telah habis.<br>Anda akan diarahkan ke halaman login.</p>
            </div>
        `;
        document.body.appendChild(modal);
    }

    triggerExamTermination() {
        console.log("💥 TERMINATING EXAM - MAX WARNINGS REACHED");

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        this.showTerminationModal();
        
        setTimeout(() => {
            localStorage.removeItem('exam_time_left');
            window.location.href = '/';
        }, 3000);
    }

    showTerminationModal() {
        const modal = document.createElement('div');
        modal.className = 'termination-modal';
        modal.innerHTML = `
            <div class="termination-content">
                <div class="termination-icon">❌</div>
                <h2 class="termination-title">UJIAN DIHENTIKAN!</h2>
                <p class="termination-message">Anda melebihi batas pelanggaran.<br>Ujian dihentikan otomatis.</p>
            </div>
        `;
        document.body.appendChild(modal);
    }

    disableViolationDetection() {
        console.log("🔕 TEMPORARILY DISABLING VIOLATION DETECTION...");

        this.originalDetectViolation = this.detectViolation;

        this.detectViolation = function(violationType, details) {
            console.log(`✅ VIOLATION DETECTION DISABLED - IGNORING: ${violationType}`);
        };

        this.isViolationDisabled = true;
    }

    enableViolationDetection() {
        console.log("🔔 RE-ENABLING VIOLATION DETECTION...");

        if (this.originalDetectViolation) {
            this.detectViolation = this.originalDetectViolation;
        }

        this.isViolationDisabled = false;
    }
}

// Initialize system when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log("📄 DOM READY - STARTING EXAM SYSTEM...");

    // Block back button
    history.pushState(null, null, location.href);
    window.onpopstate = () => {
        history.go(1);
        if (window.examSystem) {
            window.examSystem.detectViolation('PAGE_NAVIGATION', 'Used back button');
        }
    };

    // Initialize exam system
    try {
        window.examSystem = new UniversalExamSystem({
            studentDataList: [],
            telegramServerEndpoint: '/api/telegram-alert/'
        });

        console.log("🎉 EXAM SYSTEM INITIALIZED SUCCESSFULLY!");
        
        // Quick test: Check if submit button will work
        setTimeout(() => {
            const btn = document.getElementById('safeSubmitBtn');
            if (btn) {
                console.log("✅ Submit button ready in DOM");
            } else {
                console.error("❌ Submit button NOT FOUND!");
            }
        }, 1000);
        
    } catch (error) {
        console.error("❌ FAILED TO INITIALIZE EXAM SYSTEM:", error);
    }
});

// Global function for modal close
function closeModal() {
    if (window.examSystem) {
        window.examSystem.closeModal();
    }
}

// Export untuk penggunaan module jika perlu
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UniversalExamSystem;
}