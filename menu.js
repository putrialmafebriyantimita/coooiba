// menu.js - LENGKAP DENGAN SEMUA FUNGSI
console.log("🚀 menu.js loaded!");

// Variabel global untuk state
let isUrlInputVisible = false;

// Tunggu DOM sepenuhnya siap
document.addEventListener('DOMContentLoaded', function() {
    console.log("✅ DOM Ready!");
    
    // 1. Tampilkan user info
    showUserInfo();
    
    // 2. Setup semua tombol dan listeners
    setupAllListeners();
    
    // 3. Setup auto-hide ketika klik di luar
    setupClickOutside();
    
    // 4. Debug info
    console.log("🔥 Menu setup complete!");
    console.log("User data:", {
        nama: localStorage.getItem('nama'),
        kelas: localStorage.getItem('kelas'),
        ujian: localStorage.getItem('nama_ujian')
    });
});

// ==================== FUNGSI UTAMA ====================

// Fungsi 1: Tampilkan info user
function showUserInfo() {
    try {
        const nama = localStorage.getItem('nama') || 'User';
        const mapel = localStorage.getItem('nama_ujian') || 'Ujian Online';
        const kelas = localStorage.getItem('kelas') || '';
        
        let infoText = `<strong>${nama}</strong>`;
        if (kelas) infoText += ` - ${kelas}`;
        infoText += ` | ${mapel}`;
        
        document.getElementById('userInfo').innerHTML = infoText;
        
        console.log("👤 User info loaded:", { nama, kelas, mapel });
    } catch (error) {
        console.error("❌ Error loading user info:", error);
        document.getElementById('userInfo').textContent = "User - Ujian";
    }
}

// Fungsi 2: Setup semua event listeners
function setupAllListeners() {
    console.log("🔧 Setting up all listeners...");
    
    // 1. Tombol Masukkan URL
    const btnUrlInput = document.getElementById('btnUrlInput');
    if (btnUrlInput) {
        btnUrlInput.addEventListener('click', toggleUrlInput);
        console.log("✅ Listener: Tombol URL");
    } else {
        console.error("❌ Tombol URL tidak ditemukan!");
        // Fallback: cari tombol dengan class
        const fallbackBtn = document.querySelector('.glossy-btn');
        if (fallbackBtn) {
            fallbackBtn.addEventListener('click', toggleUrlInput);
            console.log("✅ Fallback: Using .glossy-btn");
        }
    }
    
    // 2. Tombol Mulai Ujian
    const btnStartExam = document.getElementById('btnStartExam');
    if (btnStartExam) {
        btnStartExam.addEventListener('click', validateAndStartExam);
        console.log("✅ Listener: Tombol Mulai Ujian");
    } else {
        console.error("❌ Tombol Mulai Ujian tidak ditemukan!");
    }
    
    // 3. Enter key untuk input URL
    const urlInput = document.getElementById('urlInput');
    if (urlInput) {
        urlInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                console.log("↵ Enter key pressed");
                validateAndStartExam();
            }
        });
        console.log("✅ Listener: Enter key");
    }
    
    // 4. Escape key untuk close input
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isUrlInputVisible) {
            console.log("⎋ Escape key pressed");
            hideUrlInput();
        }
    });
    
    console.log("✅ All listeners setup!");
}

// Fungsi 3: Toggle show/hide input URL
function toggleUrlInput() {
    console.log("🔗 Tombol URL diklik!");
    
    const container = document.getElementById('urlInputContainer');
    if (!container) {
        console.error("❌ Container input tidak ditemukan!");
        return;
    }
    
    if (isUrlInputVisible) {
        hideUrlInput();
    } else {
        showUrlInput();
    }
}

// Fungsi 4: Tampilkan input URL
function showUrlInput() {
    const container = document.getElementById('urlInputContainer');
    const input = document.getElementById('urlInput');
    
    console.log("👁️ Menampilkan input URL...");
    
    // Tambah kelas show untuk animasi
    container.classList.add('show');
    
    // Set inline styles untuk pastikan visible
    container.style.cssText = `
        max-height: 200px !important;
        opacity: 1 !important;
        transform: translateY(0) !important;
        display: block !important;
        visibility: visible !important;
    `;
    
    // Update state
    isUrlInputVisible = true;
    
    // Focus ke input setelah animasi
    setTimeout(() => {
        if (input) {
            input.focus();
            console.log("🎯 Focus ke input URL");
        }
    }, 300);
    
    // Scroll ke input jika di mobile
    if (window.innerWidth < 768) {
        container.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Fungsi 5: Sembunyikan input URL
function hideUrlInput() {
    const container = document.getElementById('urlInputContainer');
    const input = document.getElementById('urlInput');
    
    console.log("👻 Menyembunyikan input URL...");
    
    // Hapus kelas show
    container.classList.remove('show');
    
    // Reset styles
    container.style.maxHeight = "0";
    container.style.opacity = "0";
    container.style.transform = "translateY(-20px)";
    
    // Update state
    isUrlInputVisible = false;
    
    // Clear input value
    setTimeout(() => {
        if (input) {
            input.value = "";
            console.log("🧹 Input dikosongkan");
        }
    }, 200);
}

// Fungsi 6: Validasi dan mulai ujian
function validateAndStartExam() {
    console.log("🚀 Validasi URL dan mulai ujian...");
    
    const urlInput = document.getElementById('urlInput');
    if (!urlInput) {
        console.error("❌ Input URL tidak ditemukan!");
        showError("Input URL tidak ditemukan!");
        return;
    }
    
    const url = urlInput.value.trim();
    console.log("🌐 URL yang diinput:", url);
    
    // Validasi 1: URL tidak boleh kosong
    if (!url) {
        showError("Masukkan URL ujian terlebih dahulu!");
        urlInput.focus();
        return;
    }
    
    // Validasi 2: Format URL harus benar
    if (!isValidUrl(url)) {
        showError("Format URL tidak valid! Gunakan http:// atau https://");
        urlInput.focus();
        urlInput.select();
        return;
    }
    
    // Validasi 3: URL harus aman (optional)
    if (!isSafeUrl(url)) {
        if (!confirm("URL tidak menggunakan HTTPS. Lanjutkan?")) {
            urlInput.focus();
            return;
        }
    }
    
    // Jika semua validasi passed
    startExam(url);
}

// Fungsi 7: Validasi format URL
function isValidUrl(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
}

// Fungsi 8: Cek apakah URL aman
function isSafeUrl(url) {
    return url.startsWith('https://');
}

// Fungsi 9: Mulai ujian dengan URL yang valid
function startExam(url) {
    console.log("🎯 Memulai ujian dengan URL:", url);
    
    // Tampilkan loading
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
        loadingEl.style.display = 'block';
        loadingEl.innerHTML = `
            <div class="loader-container">
                <div class="loader"></div>
                <span>Mempersiapkan ujian...</span>
            </div>
        `;
    }
    
    // Sembunyikan error jika ada
    hideError();
    
    // Simpan URL ke localStorage untuk backup
    localStorage.setItem('exam_url', url);
    localStorage.setItem('last_exam_time', new Date().toISOString());
    
    console.log("💾 Data disimpan:", {
        exam_url: url,
        time: new Date().toLocaleTimeString()
    });
    
    // Redirect ke halaman exam dengan delay
    setTimeout(() => {
        const encodedUrl = encodeURIComponent(url);
        const redirectUrl = `/exam/?url=${encodedUrl}&t=${Date.now()}`;
        
        console.log("🔄 Redirect ke:", redirectUrl);
        console.log("📊 Data user:", {
            nama: localStorage.getItem('nama'),
            ujian: localStorage.getItem('nama_ujian')
        });
        
        // Redirect dengan method yang reliable
        window.location.replace(redirectUrl);
    }, 1500);
}

// Fungsi 10: Tampilkan error message
function showError(message) {
    console.error("❌ Error:", message);
    
    const errorEl = document.getElementById('errorMessage') || document.getElementById('qrResult');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        
        // Animasi shake
        errorEl.classList.remove('shake');
        void errorEl.offsetWidth; // Trigger reflow
        errorEl.classList.add('shake');
        
        // Auto hide setelah 5 detik
        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 5000);
    } else {
        // Fallback ke alert
        alert(`❌ ${message}`);
    }
}

// Fungsi 11: Sembunyikan error
function hideError() {
    const errorEl = document.getElementById('errorMessage') || document.getElementById('qrResult');
    if (errorEl) {
        errorEl.style.display = 'none';
    }
}

// Fungsi 12: Setup auto-hide ketika klik di luar
function setupClickOutside() {
    document.addEventListener('click', function(e) {
        const container = document.getElementById('urlInputContainer');
        const btnUrlInput = document.getElementById('btnUrlInput');
        
        if (isUrlInputVisible && container && btnUrlInput) {
            // Cek apakah klik di luar container dan bukan di tombol
            if (!container.contains(e.target) && e.target !== btnUrlInput) {
                console.log("👆 Klik di luar, menyembunyikan input...");
                hideUrlInput();
            }
        }
    });
}

// ==================== FUNGSI BANTUAN & DEBUG ====================

// Fungsi untuk auto-fill URL testing
window.autoFillTest = function(url = "https://example.com/ujian") {
    const input = document.getElementById('urlInput');
    if (input) {
        input.value = url;
        console.log("✅ URL test diisi:", url);
        
        // Tampilkan input jika hidden
        if (!isUrlInputVisible) {
            showUrlInput();
        }
        
        input.focus();
        input.select();
    }
    return url;
};

// Fungsi untuk clear semua data
window.clearExamData = function() {
    localStorage.removeItem('exam_url');
    localStorage.removeItem('last_exam_time');
    const input = document.getElementById('urlInput');
    if (input) input.value = "";
    hideError();
    console.log("🧹 Data ujian dibersihkan");
    alert("Data ujian dibersihkan!");
};

// Fungsi untuk test redirect langsung
window.testRedirect = function() {
    const testUrl = "https://ujian-online.com/contoh";
    console.log("🧪 Test redirect ke:", testUrl);
    startExam(testUrl);
};

// Fungsi untuk debug info
window.debugMenu = function() {
    console.clear();
    console.log("=== DEBUG MENU ===");
    console.log("1. State:", {
        isUrlInputVisible: isUrlInputVisible,
        localStorage: localStorage,
        userAgent: navigator.userAgent
    });
    
    console.log("2. Elements:");
    const elements = ['userInfo', 'btnUrlInput', 'urlInputContainer', 'urlInput', 'btnStartExam', 'loading', 'errorMessage'];
    elements.forEach(id => {
        const el = document.getElementById(id);
        console.log(`  ${id}:`, el ? "✅ Found" : "❌ Missing");
    });
    
    console.log("3. Test actions:");
    console.log("  - autoFillTest(): Isi URL test");
    console.log("  - toggleUrlInput(): Toggle input");
    console.log("  - validateAndStartExam(): Validasi & mulai");
    console.log("  - clearExamData(): Hapus data");
    
    // Auto test
    autoFillTest();
};

// Auto debug saat development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log("🔧 Development mode active");
    
    // Tambah debug button
    setTimeout(() => {
        const debugBtn = document.createElement('button');
        debugBtn.innerHTML = '🐛 DEBUG';
        debugBtn.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            background: #ff6b6b;
            color: white;
            padding: 8px 12px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            z-index: 9999;
            font-size: 12px;
            opacity: 0.7;
        `;
        debugBtn.onclick = debugMenu;
        document.body.appendChild(debugBtn);
        console.log("✅ Debug button added");
    }, 2000);
}

console.log("✅ menu.js initialization complete");