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
const notifSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
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
    if (!user) return alert("Please login first!");
    const btn = getEl('update-btn');
    const newName = getEl('edit-name').value.trim();
    if(!newName) return alert("Name is required!");
    btn.innerText = "Updating..."; btn.disabled = true;
    const updatedData = {
        name: newName,
        city: getEl('edit-city').value,
        category: getEl('edit-category').value,
        ward: getEl('edit-ward').value
    };
    if (tempPhoto64) updatedData.profilePhoto = tempPhoto64;
    try {
        await db.ref('users/' + user.uid).update(updatedData);
        alert("Profile Updated Successfully!");
        openPage('home');
        location.reload(); 
    } catch (e) { alert("Error: " + e.message); }
    finally { btn.innerText = "UPDATE PROFILE"; btn.disabled = false; }
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
                html = `<div class="history-card" style="border-left: 5px solid #075e54;">
                    <button class="btn-ind-del" onclick="confirm('Delete Forever?') && db.ref('history/${user.uid}/${c.key}').remove()">Delete</button>
                    <span class="badge ${d.status === 'Accepted' ? 'bg-success' : 'bg-secondary'}" style="font-size:9px;">${d.status}</span><br>
                    <b>${d.name} (${d.skill})</b><p class="mb-0 small">${d.msg}</p><small class="text-muted">${d.time}</small></div>` + html;
            });
            getEl('history-content').innerHTML = html || "No History Found.";
        });
        db.ref('payments/' + user.uid).on('value', snap => {
            let tWages = 0, tPending = 0, html = "";
            snap.forEach(c => {
                const p = c.val(); tWages += p.totalAmount; tPending += p.pendingAmount;
                html += `<div class="history-card" style="border-left: 5px solid ${p.pendingAmount > 0 ? '#d32f2f' : '#2e7d32'}">
                    <button class="btn-ind-del" onclick="confirm('Delete record?') && db.ref('payments/${user.uid}/${c.key}').remove()">Del</button>
                    <b>${p.workerName}</b><br><small>Total: ₹${p.totalAmount} | Pending: ₹${p.pendingAmount}</small></div>`;
            });
            getEl('ledger-content').innerHTML = html; getEl('dash-total').innerText = "₹" + tWages; getEl('dash-pending').innerText = "₹" + tPending;
        });
    } else if (!window.location.href.includes("login.html")) {
        window.location.href = "login.html";
    }
});

function logout() { if(confirm("Are you sure you want to logout?")) auth.signOut().then(() => window.location.href = "login.html"); }

function sendAdminAlert() {
    const val = getEl('admin-manual-msg').value.trim();
    if(!val) return alert("Please enter a message!");
    const user = auth.currentUser;
    db.ref('alerts').push({
        name: "ADMIN UPDATE 📢",
        skill: "Official Notification",
        msg: val,
        time: new Date().toLocaleString(),
        type: 'admin',
        creatorUid: user.uid
    }).then(() => {
        getEl('admin-manual-msg').value = "";
        alert("Message sent successfully!");
        closeNav();
    }).catch(e => alert(e.message));
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
        alert("Please login first!");
        window.location.href = "login.html";
        return;
    }
    const name = getEl('in-name').value.trim();
    const skill = getEl('in-skill').value;
    const msg = getEl('in-msg').value.trim() || (type === 'free' ? "I am available for work." : "");
    if(!name || !msg) return alert("Please enter Name and Details!");
    db.ref('users/' + user.uid).once('value', snap => {
        const uData = snap.val();
        const photoUrl = (uData && uData.profilePhoto) ? uData.profilePhoto : "";
        db.ref('alerts').push({ 
            name, 
            skill, 
            msg, 
            time: new Date().toLocaleString(), 
            type, 
            userPhoto: photoUrl, 
            creatorUid: user.uid 
        }).then(() => {
            getEl('in-msg').value = ""; 
            alert("Alert Sent Successfully!");
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
    const user = auth.currentUser;
    if(!user) return;
    if(confirm("Do you want to save this to history and clear from dashboard?")) {
        db.ref('alerts/' + id).once('value', snap => {
            if(snap.val()) {
                db.ref('history/' + user.uid).push({ ...snap.val(), status, archivedAt: new Date().toLocaleString() });
                db.ref('alerts/' + id).remove();
            }
        });
    }
}

function savePayment() {
    const user = auth.currentUser;
    if(!user) return alert("Please login first!");
    const n = getEl('pay-name').value.trim();
    const t = parseFloat(getEl('pay-total').value) || 0;
    const p = parseFloat(getEl('pay-pending').value) || 0;
    if(!n || t <= 0) return alert("Please enter Worker Name and correct Wages!");
    if(p > t) return alert("Error: Pending amount cannot be more than Total Wages!");
    db.ref('payments/' + user.uid).push({ 
        workerName: n, totalAmount: t, pendingAmount: p, date: new Date().toLocaleString() 
    }).then(() => {
        ['pay-name', 'pay-total', 'pay-pending'].forEach(id => getEl(id).value = ""); 
        alert("Record saved successfully!");
    }).catch(e => alert("Error: " + e.message));
}

db.ref('alerts').limitToLast(1).on('child_added', snap => {
    const d = snap.val();
    const ticker = getEl('running-msg');
    const currentTime = new Date().toLocaleTimeString();
    const currentDate = new Date().toLocaleDateString();
    if (d.type === 'free') {
        ticker.innerHTML = `📢 <b>NEW ALERT:</b> ${d.name} is now <b>I AM AVAILABLE</b> [${currentDate} ${currentTime}]`;
    } else if (d.type === 'admin') {
        ticker.innerHTML = `📢 <b>ADMIN:</b> ${d.msg} [${currentDate} ${currentTime}]`;
    } else {
        ticker.innerHTML = `⚠️ <b>NEW ALERT:</b> ${d.name} says: "${d.msg}" [${currentDate} ${currentTime}]`;
    }
    notifSound.play().catch(e => {});
    if (Notification.permission === "granted") new Notification("Labor Connect", { body: `${d.name}: ${d.msg}` });
});

setInterval(function() {
    var ticker = document.getElementById('running-msg');
    if (ticker && !ticker.innerHTML.includes("ALERT") && !ticker.innerHTML.includes("ADMIN")) {
        var d = new Date();
        ticker.innerHTML = "📅 " + d.toLocaleDateString() + " | 🕒 " + d.toLocaleTimeString() + " | " + welcomeText;
    }
}, 1000);
        
