// login.js - FIXED VERSION
console.log("🔥 login.js LOADED!");

// Tunggu DOM sepenuhnya siap
document.addEventListener("DOMContentLoaded", function() {
    console.log("✅ DOM Ready!");
    
    // Cek apakah semua element ada
    checkElements();
    
    // Setup form listener
    setupLoginForm();
    
    // Tampilkan debug info
    console.log("✅ Login setup complete!");
});

// Fungsi untuk cek semua element
function checkElements() {
    console.log("🔍 Checking elements...");
    
    const elements = [
        'loginForm', 'nama', 'token_ujian', 'kelas', 
        'loading', 'errorMessage', 'successMessage'
    ];
    
    elements.forEach(id => {
        const el = document.getElementById(id);
        console.log(`${id}:`, el ? "✅ Found" : "❌ NOT FOUND");
    });
}

// Setup form login
function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    
    if (!loginForm) {
        console.error("❌ ERROR: Form login tidak ditemukan!");
        
        // Fallback: Coba cari form dengan cara lain
        const forms = document.getElementsByTagName('form');
        console.log("Forms found:", forms.length);
        
        if (forms.length > 0) {
            console.log("Using first form found");
            forms[0].addEventListener('submit', handleLogin);
        }
        return;
    }
    
    console.log("✅ Form ditemukan, adding listener...");
    
    // Hapus event listener lama jika ada
    loginForm.removeEventListener('submit', handleLogin);
    
    // Tambah event listener baru
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        handleLogin();
    });
    
    // Debug: Tambah click listener untuk tombol submit
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.addEventListener('click', function(e) {
            console.log("🖱️ Submit button clicked!");
            e.preventDefault();
            handleLogin();
        });
    }
}

// Handle login process
async function handleLogin() {
    console.log("🎯 Login process started!");
    
    // Ambil element dengan safety check
    const namaInput = document.getElementById('nama');
    const tokenInput = document.getElementById('token_ujian');
    const kelasInput = document.getElementById('kelas');
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('errorMessage');
    
    // Check if elements exist
    if (!namaInput || !tokenInput) {
        console.error("❌ ERROR: Input elements not found!");
        console.log("Nama input:", namaInput);
        console.log("Token input:", tokenInput);
        alert("Error: Form elements not found. Please refresh page.");
        return;
    }
    
    // Get values
    const nama = namaInput.value ? namaInput.value.trim() : '';
    const token_ujian = tokenInput.value ? tokenInput.value.trim() : '';
    const kelas = kelasInput ? (kelasInput.value ? kelasInput.value.trim() : '') : '';
    
    console.log("📥 Data:", { nama, token_ujian, kelas });
    
    // Validasi
    if (!nama || !token_ujian) {
        showError("Harap isi Nama dan Token Ujian!");
        return;
    }
    
    // Tampilkan loading
    if (loadingEl) loadingEl.style.display = 'block';
    
    // Sembunyikan error
    hideError();
    
    try {
        console.log("📡 Sending to /api/login/");
        
        // Kirim data ke API
        const response = await fetch('/api/login/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                nama: nama,
                pin_ujian: token_ujian  // PERHATIAN: field harus 'pin_ujian'
            })
        });
        
        console.log("📥 Response status:", response.status);
        
        const data = await response.json();
        console.log("✅ Server response:", data);
        
        if (data.status === 'success') {
            console.log("🎉 LOGIN SUCCESS!");
            
            // Simpan ke localStorage
            localStorage.clear();
            localStorage.setItem('peserta_id', data.peserta_id);
            localStorage.setItem('nama', data.nama);
            localStorage.setItem('ujian_id', data.ujian_id);
            localStorage.setItem('nama_ujian', data.nama_ujian || 'Ujian Online');
            
            // Simpan kelas dari form atau response
            if (data.kelas) {
                localStorage.setItem('kelas', data.kelas);
            } else if (kelas) {
                localStorage.setItem('kelas', kelas);
            }
            
            console.log("💾 Saved to localStorage:", {
                nama: localStorage.getItem('nama'),
                peserta_id: localStorage.getItem('peserta_id'),
                ujian_id: localStorage.getItem('ujian_id')
            });
            
            // Tampilkan pesan sukses
            const successEl = document.getElementById('successMessage');
            if (successEl) {
                successEl.textContent = 'Login berhasil! Mengalihkan...';
                successEl.style.display = 'block';
            } else {
                alert("✅ Login berhasil! Mengarahkan ke menu...");
            }
            
            // Redirect ke menu
            setTimeout(() => {
                console.log("🔄 Redirecting to /menu/");
                window.location.href = '/menu/';
            }, 1500);
            
        } else {
            console.log("❌ Login failed:", data.message);
            showError(data.message || 'Login gagal!');
        }
        
    } catch (error) {
        console.error("💥 Error:", error);
        showError('Error jaringan: ' + error.message);
    } finally {
        // Sembunyikan loading
        if (loadingEl) loadingEl.style.display = 'none';
    }
}

// Helper functions
function showError(message) {
    console.error("❌ Error:", message);
    const errorEl = document.getElementById('errorMessage');
    
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    } else {
        alert(message); // Fallback
    }
}

function hideError() {
    const errorEl = document.getElementById('errorMessage');
    if (errorEl) {
        errorEl.style.display = 'none';
    }
}

// Debug function untuk testing
window.testLogin = function() {
    console.log("🧪 Testing login...");
    
    // Auto fill untuk testing
    const namaInput = document.getElementById('nama');
    const tokenInput = document.getElementById('token_ujian');
    const kelasInput = document.getElementById('kelas');
    
    if (namaInput) namaInput.value = "Test User";
    if (tokenInput) tokenInput.value = "123456";
    if (kelasInput) kelasInput.value = "XII IPA 1";
    
    console.log("✅ Test data filled");
    console.log("Now triggering login...");
    
    // Trigger login setelah 1 detik
    setTimeout(() => {
        handleLogin();
    }, 1000);
};

// Check jika page baru di-load
if (window.performance) {
    if (performance.navigation.type === 1) {
        console.log("🔄 Page was reloaded");
    }
}

console.log("🚀 login.js execution complete");3