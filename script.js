// 1. Firebase Config (Shafiq bhai, aapka original config waisa hi hai)
const firebaseConfig = {
    apiKey: "AIzaSyAywaLwLtQlZB3nqrL3tSudjLd5XDVxSmw",
    authDomain: "labor-connect-pro.firebaseapp.com",
    databaseURL: "https://Labor-connect-pro-default-rtdb.firebaseio.com", 
    projectId: "labor-connect-pro",
    storageBucket: "labor-connect-pro.firebasestorage.app",
    messagingSenderId: "274517220693",
    appId: "1:274517220693:web:af52f211ca4486251ba3dc",
    measurementId: "G-V9TJMW69TH"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database(), auth = firebase.auth();

// --- APP ID ADDED ---
const APP_ID = "3956730"; 

const welcomeText = "Welcome to Labor Connect! Post your work requirements here.";
// SOUND FIX: Naya tez sound link
const notifSound = new Audio('https://notificationsounds.com/storage/sounds/file-sounds-1150-pristine.mp3');
const getEl = id => document.getElementById(id);
const toggleDisplay = (id, show) => getEl(id).style.display = show ? 'block' : 'none';

// Secure Admin ID
const MY_ADMIN_ID = "Fut2luiSM4NVpPOaZLIt11MAU6A3";

// --- PROFILE & FAST IMAGE COMPRESSION LOGIC ---
let tempPhoto64 = "";
function compressAndConvert(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 300; 
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const base64 = canvas.toDataURL('image/jpeg', 0.6); 
                resolve(base64);
            };
        };
        reader.onerror = error => reject(error);
    });
}

async function previewAndConvert(input) {
    if (input.files && input.files[0]) {
        tempPhoto64 = await compressAndConvert(input.files[0]);
        if(getEl('prof-img-preview')) getEl('prof-img-preview').src = tempPhoto64;
    }
}

function loadProfileData() {
    const user = auth.currentUser;
    if (!user) return;
    db.ref('users/' + user.uid).once('value', snap => {
        const d = snap.val();
        if(d) {
            getEl('prof-display-name').innerText = d.name || "User";
            getEl('prof-display-email').innerText = d.email || "";
            getEl('edit-name').value = d.name || "";
            getEl('edit-city').value = d.city || "Bandipora";
            getEl('edit-category').value = d.category || "General Laborer";
            getEl('edit-ward').value = d.ward || "";
            if(d.profilePhoto) getEl('prof-img-preview').src = d.profilePhoto;
        }
    });
}

async function updateProfile() {
    const user = auth.currentUser;
    if (!user) return Swal.fire('Error', 'Please login first!', 'error');
    const btn = getEl('update-btn');
    const newName = getEl('edit-name').value.trim();
    if(!newName) return Swal.fire('Wait!', 'Name is required!', 'warning');
    
    // --- LOADING SPINNER ---
    Swal.fire({ title: 'Updating...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
    
    const updatedData = {
        name: newName,
        city: getEl('edit-city').value,
        category: getEl('edit-category').value,
        ward: getEl('edit-ward').value
    };
    if (tempPhoto64) updatedData.profilePhoto = tempPhoto64;
    try {
        await db.ref('users/' + user.uid).update(updatedData);
        // AUTO CLOSE SUCCESS
        Swal.fire({ title: 'Success', text: 'Profile Updated!', icon: 'success', timer: 1500, showConfirmButton: false });
        openPage('home');
        setTimeout(() => { location.reload(); }, 1600); 
    } catch (e) { Swal.fire('Error', e.message, 'error'); }
}

// --- Auth Check & Data Loading ---
auth.onAuthStateChanged(user => {
    if (user) {
        db.ref('users/' + user.uid).on('value', snap => {
            const d = snap.val();
            if(d) { 
                if(user.uid === MY_ADMIN_ID || d.name === "Shafiq Ahmad") {
                    if(getEl('admin-only-tools')) getEl('admin-only-tools').style.display = 'block';
                }
                getEl('side-name').innerText = d.name; 
                getEl('in-name').value = d.name; 
                if(d.profilePhoto && getEl('side-user-img')) {
                    getEl('side-user-img').src = d.profilePhoto;
                }
            }
        });
        db.ref('history/' + user.uid).on('value', snap => {
            let html = "";
            snap.forEach(c => {
                const d = c.val();
                html = `<div class="history-card" style="border-left: 5px solid #075e54; position:relative;">
                    <button class="btn-ind-del" onclick="deleteHistoryItem('${c.key}')">Delete</button>
                    <span class="badge ${d.status === 'Accepted' ? 'bg-success' : 'bg-secondary'}" style="font-size:9px;">${d.status}</span><br>
                    <b>${d.name} (${d.skill})</b><p class="mb-0 small">${d.msg}</p><small class="text-muted">${d.time}</small></div>` + html;
            });
            getEl('history-content').innerHTML = html || "No History Found.";
        });
        db.ref('payments/' + user.uid).on('value', snap => {
            let tWages = 0, tPending = 0, html = "";
            snap.forEach(c => {
                const p = c.val(); tWages += p.totalAmount; tPending += p.pendingAmount;
                html += `<div class="history-card" style="border-left: 5px solid ${p.pendingAmount > 0 ? '#d32f2f' : '#2e7d32'}; position:relative;">
                    <button class="btn-ind-del" onclick="deletePaymentItem('${c.key}')">Del</button>
                    <b>${p.workerName}</b><br><small>Total: ₹${p.totalAmount} | Pending: ₹${p.pendingAmount}</small></div>`;
            });
            getEl('ledger-content').innerHTML = html; getEl('dash-total').innerText = "₹" + tWages; getEl('dash-pending').innerText = "₹" + tPending;
        });
    } else if (!window.location.href.includes("login.html")) {
        window.location.href = "login.html";
    }
});

// Professional Logout with Sidebar Closure
function logout() {
    // Menu band karein taake logout box piche na chupe
    closeNav(); 
    
    Swal.fire({
        title: 'Logout?',
        text: "Are you sure you want to logout?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#075e54',
        confirmButtonText: 'Yes, Logout!'
    }).then((result) => {
        if (result.isConfirmed) {
            auth.signOut().then(() => { window.location.href = "login.html"; });
        }
    });
}

function sendAdminAlert() {
    const val = getEl('admin-manual-msg').value.trim();
    if(!val) return Swal.fire('Info', 'Please enter a message!', 'info');
    
    Swal.fire({ title: 'Sending...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
    
    db.ref('alerts').push({
        name: "ADMIN UPDATE 📢",
        skill: "Official Notification",
        msg: val,
        time: new Date().toLocaleString(),
        type: 'admin',
        creatorUid: auth.currentUser.uid
    }).then(() => {
        getEl('admin-manual-msg').value = "";
        Swal.fire({ title: 'Sent!', text: 'Broadcast sent!', icon: 'success', timer: 1500, showConfirmButton: false });
        closeNav();
    }).catch(e => Swal.fire('Error', e.message, 'error'));
}

function openNav() { getEl("mySidebar").style.width = "270px"; getEl("wrapper").classList.add("blur-bg"); toggleDisplay("menu-overlay", true); }
function closeNav() { getEl("mySidebar").style.width = "0"; getEl("wrapper").classList.remove("blur-bg"); toggleDisplay("menu-overlay", false); }

function openPage(id) {
    closeNav();
    if (!window.history.state || window.history.state.page !== id) window.history.pushState({page: id}, id, "");
    document.querySelectorAll('.page-view, #home-view').forEach(p => p.style.display = 'none');
    getEl('wrapper').style.display = 'none';
    if(id === 'home') {
        getEl('home-view').style.display = 'block';
        getEl('wrapper').style.display = 'block';
    } else {
        const target = getEl(id + '-view');
        if(target) target.style.display = 'block';
        if(id === 'profile') loadProfileData();
    }
}

window.onpopstate = e => {
    const p = (e.state && e.state.page) ? e.state.page : 'home';
    openPage(p);
};

window.onload = () => {
    window.history.replaceState({page: 'home'}, "home", "");
    if ("Notification" in window && Notification.permission !== "granted") Notification.requestPermission();
};

function toggleNotif(e) {
    if(e) e.stopPropagation();
    const show = getEl('notif-box').style.display !== 'block';
    ['notif-box', 'notif-overlay'].forEach(id => toggleDisplay(id, show));
}

function postJob(type) {
    const user = auth.currentUser;
    if (!user) {
        Swal.fire('Login Required', 'Please login first!', 'warning');
        window.location.href = "login.html";
        return;
    }
    const name = getEl('in-name').value.trim();
    const skill = getEl('in-skill').value;
    const msg = getEl('in-msg').value.trim() || (type === 'free' ? "I am available for work." : "");
    if(!name || !msg) return Swal.fire('Empty Fields', 'Please enter Name and Details!', 'warning');
    
    // SPINNER
    Swal.fire({ title: 'Posting...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

    db.ref('users/' + user.uid).once('value', snap => {
        const uData = snap.val();
        const photoUrl = (uData && uData.profilePhoto) ? uData.profilePhoto : "";
        db.ref('alerts').push({ 
            name, skill, msg, time: new Date().toLocaleString(), type, 
            userPhoto: photoUrl, creatorUid: user.uid 
        }).then(() => {
            getEl('in-msg').value = ""; 
            Swal.fire({ title: 'Sent!', text: 'Alert Published!', icon: 'success', timer: 1500, showConfirmButton: false });
        });
    });
}

db.ref('alerts').on('value', snap => {
    let feed = "", notif = "";
    const tickerContainer = getEl('running-msg').parentElement;
    if(!snap.exists()) {
        tickerContainer.style.background = "#dcf8c6"; tickerContainer.style.color = "#000000";
        getEl('running-msg').innerHTML = welcomeText;
    }
    snap.forEach(child => {
        const d = child.val(), id = child.key, isFree = d.type === 'free', isAdmin = d.type === 'admin';
        if(isAdmin) { tickerContainer.style.background = "#ffeb3b"; tickerContainer.style.color = "#000000"; }
        else if(isFree) { tickerContainer.style.background = "#ffeb3b"; tickerContainer.style.color = "#000000"; }
        else { tickerContainer.style.background = "#ff5252"; tickerContainer.style.color = "#ffffff"; }
        const userImgHtml = d.userPhoto ? `<img src="${d.userPhoto}" style="width:40px; height:40px; border-radius:50%; margin-right:10px; float:left; object-fit:cover; border:1px solid #ddd;">` : `<i class="fas fa-user-circle fa-2x" style="float:left; margin-right:10px; color:#ccc;"></i>`;
        feed = `<div class="card-box mb-2" style="border-left: 5px solid ${isAdmin ? '#ffc107' : (isFree ? '#fbc02d' : '#25d366')}; text-align:left; overflow:hidden; ${isAdmin ? 'background:#fff9c4;' : ''}">
            <button class="btn-ind-del" onclick="archiveAlert('${id}', 'Cleared')">Clear</button>
            ${userImgHtml}
            <b>${d.name} (${d.skill})</b><p class="m-0 small">${d.msg}</p>
            <span class="post-time" style="font-size:10px; color:gray;"><i class="far fa-clock"></i> ${d.time}</span><br>
            <button class="btn-accept mt-2" onclick="archiveAlert('${id}', 'Accepted')" style="background:#075e54; color:white; border:none; padding:6px 12px; border-radius:4px; font-size:12px;">Accept & Clear</button>
        </div>` + feed;
        notif = `<div class="p-2 border-bottom text-start small" style="background:#f9f9f9; margin-bottom:2px;"><i class="fas fa-bell ${isAdmin ? 'text-warning' : 'text-success'} me-1"></i> <b>${d.name}:</b> ${d.skill} <br><span class="text-muted" style="font-size:9px;">${d.time}</span></div>` + notif;
    });
    getEl('feed-container').innerHTML = feed; getEl('notif-list').innerHTML = notif || "No new alerts.";
});

function archiveAlert(id, status) {
    Swal.fire({
        title: 'Clear Alert?',
        text: "Save to history?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#075e54',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes'
    }).then((result) => {
        if (result.isConfirmed) {
            db.ref('alerts/' + id).once('value', snap => {
                if(snap.val()) {
                    db.ref('history/' + auth.currentUser.uid).push({ ...snap.val(), status, archivedAt: new Date().toLocaleString() });
                    db.ref('alerts/' + id).remove();
                }
            });
        }
    });
}

function deleteHistoryItem(key) {
    Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Delete' }).then((result) => {
        if (result.isConfirmed) { db.ref(`history/${auth.currentUser.uid}/${key}`).remove(); }
    });
}

function deletePaymentItem(key) {
    Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Delete' }).then((result) => {
        if (result.isConfirmed) { db.ref(`payments/${auth.currentUser.uid}/${key}`).remove(); }
    });
}

function savePayment() {
    const n = getEl('pay-name').value.trim();
    const t = parseFloat(getEl('pay-total').value) || 0;
    const p = parseFloat(getEl('pay-pending').value) || 0;
    if(!n || t <= 0) return Swal.fire('Incomplete', 'Fill details!', 'info');
    
    Swal.fire({ title: 'Saving...', didOpen: () => { Swal.showLoading(); } });

    db.ref('payments/' + auth.currentUser.uid).push({ workerName: n, totalAmount: t, pendingAmount: p, date: new Date().toLocaleString() })
    .then(() => {
        ['pay-name', 'pay-total', 'pay-pending'].forEach(id => getEl(id).value = ""); 
        Swal.fire({ title: 'Saved!', icon: 'success', timer: 1200, showConfirmButton: false });
    });
}

db.ref('alerts').limitToLast(1).on('child_added', snap => {
    const d = snap.val();
    const ticker = getEl('running-msg');
    ticker.innerHTML = `📢 <b>NEW:</b> ${d.name}: ${d.msg}`;
    notifSound.play().catch(e => {});
    if (Notification.permission === "granted") {
        new Notification("Labor Connect Pro 📢", { body: `${d.name}: ${d.msg}`, icon: 'https://shafiqrr3.github.io/labour-connect-pro/icon.png' });
    }
});

// --- TICKER LOGIC (TIME & DATE ALWAYS RUNNING) ---
setInterval(function() {
    var ticker = document.getElementById('running-msg');
    if (ticker) {
        var d = new Date();
        var timeStr = d.toLocaleTimeString();
        var dateStr = d.toLocaleDateString();
        
        if (ticker.innerHTML.includes("NEW") || ticker.innerHTML.includes("ADMIN")) {
            if(!ticker.innerHTML.includes(" | 🕒")) {
                ticker.innerHTML += ` | 📅 ${dateStr} | 🕒 ${timeStr}`;
            }
        } else {
            ticker.innerHTML = `📅 ${dateStr} | 🕒 ${timeStr} | ${welcomeText}`;
        }
    }
}, 1000);
