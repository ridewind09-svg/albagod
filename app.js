const firebaseConfig = { apiKey: "AIzaSyCLm9sr7hw5L4Vwl1ZoF1iQGPUQcsn8uFI", authDomain: "albagod-5cbb4.firebaseapp.com", databaseURL: "https://albagod-5cbb4-default-rtdb.asia-southeast1.firebasedatabase.app", projectId: "albagod-5cbb4", storageBucket: "albagod-5cbb4.firebasestorage.app", messagingSenderId: "1035968499607", appId: "1:1035968499607:web:1f699c1264021e4f40bed2", measurementId: "G-2P1ZPG28NT" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const profileColors = ['#FF6B6B', '#4ECDC4', '#556270', '#C7F464', '#FF8C42', '#6A4C93', '#1982C4', '#8AC926', '#FF595E', '#FFCA3A', '#F72585', '#7209B7', '#3A0CA3', '#4361EE', '#4CC9F0', '#06D6A0', '#118AB2', '#073B4C', '#EF476F', '#06D6A0'];
let users = {}; let currentUser = null; let posts = { semi: {}, other: {}, free: {}, ref: {} }; let tempSocialProvider = ''; let recommendedJobs = {}; let editingFiles = []; let tempSelectedFiles = []; let currentViewingPost = { type: null, id: null }; let currentReply = null; 
const savedUser = sessionStorage.getItem('currentUser'); if(savedUser) currentUser = JSON.parse(savedUser);
const usersRef = db.ref('users'); const postsRef = db.ref('posts'); const recJobsRef = db.ref('recommendedJobs'); const chatRef = db.ref('chat'); const metaRef = db.ref('meta');
metaRef.child('visitors').transaction(c => (c || 0) + 1);
metaRef.child('visitors').on('value', s => document.getElementById('visitorCount').innerText = s.val() || 0);
async function getAnonName() { if (sessionStorage.getItem('anonName')) return sessionStorage.getItem('anonName'); const r = await metaRef.child('anonCounter').transaction(c => (c || 0) + 1); const n = '익명' + r.snapshot.val(); sessionStorage.setItem('anonName', n); return n; }
function getColorForString(str) { if(!str) str = 'default'; let h = 0; for (let i = 0; i < str.length; i++) { h = str.charCodeAt(i) + ((h << 5) - h); } return Math.abs(h) % 20; }
function escapeHtml(t) { if(!t) return ''; return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
usersRef.on('value', s => { users = s.val() || {}; if(!users['admin']) usersRef.child('admin').set({ id: 'admin', pw: 'admin1234', nickname: '관리자', name: '운영자', phone: '010-0000-0000', provider: '관리자', scraps: {}, profilePic: null }); updateUserCount(); updateAuthMenu(); if(document.getElementById('admin').classList.contains('active')) loadAdminPage(); if(document.getElementById('mypage').classList.contains('active')) loadMypage(); });
postsRef.on('value', s => { posts = s.val() || { semi: {}, other: {}, free: {}, ref: {} }; renderPosts(); if(document.getElementById('home').classList.contains('active')) searchJobs(); if(currentViewingPost.type && currentViewingPost.id) renderComments(currentViewingPost.type, currentViewingPost.id); });
recJobsRef.on('value', s => { recommendedJobs = s.val() || {}; renderAdminRecJobs(); renderHomeRecJobs(); });

let chatInitialized = false; let unreadMainCount = 0; let unreadModalCount = 0;
function handleNewChatMessage(key, c) {
    let tempUser = users[c.authorId]; if(!tempUser) tempUser = { nickname: c.author, id: c.author };
    let replyQuoteHtml = '';
    if(c.replyTo) { replyQuoteHtml = `<div class="chat-reply-quote"><strong>${escapeHtml(c.replyTo.author)}:</strong><span class="reply-text">${escapeHtml(c.replyTo.message)}</span></div>`; }
    const dataAttrAuthor = escapeHtml(c.author).replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    const dataAttrMsg = escapeHtml(c.message).replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    const html = `<div class="chat-message" onclick="setReply('${key}', '${dataAttrAuthor}', '${dataAttrMsg}')">${getProfileImgHTML(tempUser)}<div class="chat-content-wrapper">${replyQuoteHtml}<div><span class="user">${escapeHtml(c.author)}:</span> <span class="chat-text">${linkify(escapeHtml(c.message))}</span></div></div></div>`;
    const mainScreen = document.getElementById('chatScreen'); const modalScreen = document.getElementById('chatModalScreen');
    [mainScreen, modalScreen].forEach(screen => { if(!screen) return; const isNearBottom = screen.scrollHeight - screen.scrollTop - screen.clientHeight < 100; screen.insertAdjacentHTML('beforeend', html); if(!chatInitialized || isNearBottom) { screen.scrollTop = screen.scrollHeight; } else { if(screen.id === 'chatScreen') { unreadMainCount++; updateNewMessageAlert('newMsgAlertMain', unreadMainCount); } else { unreadModalCount++; updateNewMessageAlert('newMsgAlertModal', unreadModalCount); } } });
}
chatRef.on('child_added', s => { const c = s.val(); const k = s.key; handleNewChatMessage(k, c); if(chatInitialized && (Date.now() - c.timestamp < 10000)) stopFakeChat(); });
chatRef.once('value').then(() => { chatInitialized = true; });

function updateUserCount() { const el = document.getElementById('userCount'); if(el) el.innerText = Object.keys(users).length; }
function getProfileImgHTML(user) { if(user && user.profilePic) return `<img src="${user.profilePic}" class="profile-img" alt="profile">`; const i = user && user.nickname ? user.nickname.charAt(0) : '?'; const ci = getColorForString(user && user.id ? user.id : (user && user.nickname ? user.nickname : 'guest')); return `<div class="profile-img-default" style="background-color: ${profileColors[ci]};">${i}</div>`; }
function linkify(text) { if (!text) return ''; return text.replace(/(https?:\/\/[^\s]+)/g, url => `<a href="${url}" target="_blank" class="link-in-text">${url}</a>`); }
function setReply(key, encodedAuthor, encodedMsg) { const txt = document.createElement("textarea"); txt.innerHTML = encodedAuthor; const author = txt.value; txt.innerHTML = encodedMsg; const msg = txt.value; const shortMsg = msg.length > 50 ? msg.substring(0, 50) + '...' : msg; currentReply = { id: key, author, message: shortMsg }; const mp = document.getElementById('replyPreviewMain'); const md = document.getElementById('replyPreviewModal'); const ph = `<strong>${escapeHtml(author)}</strong>에게 답장<br>${escapeHtml(shortMsg)}`; if(mp) { mp.querySelector('.reply-content').innerHTML = ph; mp.style.display = 'flex'; } if(md) { md.querySelector('.reply-content').innerHTML = ph; md.style.display = 'flex'; } if(document.getElementById('chatModal').style.display === 'flex') document.getElementById('chatModalInput').focus(); else document.getElementById('chatInput').focus(); }
function cancelReply() { currentReply = null; const mp = document.getElementById('replyPreviewMain'); const md = document.getElementById('replyPreviewModal'); if(mp) mp.style.display = 'none'; if(md) md.style.display = 'none'; }
function updateNewMessageAlert(id, count) { const el = document.getElementById(id); if(el && count > 0) { el.style.display = 'block'; el.querySelector('.count').innerText = count; } }
function scrollToBottom(screenId, alertId) { const s = document.getElementById(screenId); if(s) s.scrollTop = s.scrollHeight; if(alertId) { const el = document.getElementById(alertId); if(el) { el.style.display = 'none'; el.querySelector('.count').innerText = '0'; } } if(screenId === 'chatScreen') unreadMainCount = 0; else unreadModalCount = 0; }
function showPage(p, e) { document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active')); if(e) { document.querySelectorAll('.nav-link, .auth-menu a, .admin-link a').forEach(l => l.classList.remove('active')); e.classList.add('active'); } document.getElementById(p).classList.add('active'); if(p === 'mypage') loadMypage(); if(p === 'admin') { loadAdminPage(); renderAdminRecJobs(); } if(['semiconductor', 'otherjobs', 'freeboard', 'reference'].includes(p)) checkWriteAuth(p); window.scrollTo(0, 0); }
function goToBoard(b) { const nl = document.querySelectorAll('.nav-link'); let t = null; nl.forEach(l => { if(l.getAttribute('onclick') && l.getAttribute('onclick').includes(b)) t = l; }); showPage(b, t); }
function checkWriteAuth(p) { const am = { semiconductor: 'semiWriteArea', otherjobs: 'otherWriteArea', freeboard: 'freeWriteArea', reference: 'refWriteArea' }; const tm = { semiconductor: 'semi', otherjobs: 'other', freeboard: 'free', reference: 'ref' }; const a = document.getElementById(am[p]); const t = tm[p]; tempSelectedFiles = []; if(!currentUser) { a.innerHTML = `<div class="login-required-box"><p>🔒 게시글 작성은 로그인 후 이용 가능합니다.</p><button class="btn-auth" style="width: auto; padding: 10px 20px;" onclick="showPage('login', document.querySelector('.auth-menu a'))">로그인 하러가기</button></div>`; } else { const ij = (t === 'semi' || t === 'other'); a.innerHTML = `<div class="write-form"><h3 style="margin-bottom:15px;">글쓰기</h3>${ij ? `<select id="${t}Region"><option value="">근무 지역 (필수)</option><option value="서울">서울</option><option value="경기">경기</option><option value="인천">인천</option><option value="온라인">온라인</option></select>` : ''}<input type="text" id="${t}Title" placeholder="제목"><textarea id="${t}Content" placeholder="내용 (https://... 자동 링크)"></textarea><div class="file-upload-wrapper"><label class="file-upload-label" for="${t}File">📎 파일 첨부 (이미지/문서 10개, 동영상 1개)</label><input type="file" id="${t}File" multiple onchange="handleFileSelect('${t}', this)"><div class="file-name-display" id="${t}FileName">선택된 파일 없음</div></div><button class="btn-write" onclick="writePost('${t}')">작성 완료</button></div>`; } }
function handleFileSelect(t, i) { const nf = i.files; for(let j=0; j<nf.length; j++) { let iv = nf[j].type.startsWith('video/'), ii = nf[j].type.startsWith('image/'); let cvc = tempSelectedFiles.filter(f => f.type.startsWith('video/')).length; if(iv && cvc >= 1) { alert('동영상은 1개만 가능.'); continue; } if((ii || iv) && nf[j].size > 3*1024*1024) { alert(`${nf[j].name} 3MB 초과.`); continue; } tempSelectedFiles.push(nf[j]); } if(tempSelectedFiles.length > 10) { alert('최대 10개.'); tempSelectedFiles = tempSelectedFiles.slice(0, 10); } document.getElementById(`${t}FileName`).innerText = tempSelectedFiles.length > 0 ? `선택됨 (${tempSelectedFiles.length}개)` : '선택된 파일 없음'; i.value = ''; }
function compressImage(f) { return new Promise(r => { if(!f.type.startsWith('image/')) { const rd = new FileReader(); rd.onload = e => r({ name: f.name, type: f.type, data: e.target.result }); rd.readAsDataURL(f); return; } const rd = new FileReader(); rd.onload = e => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); const cx = c.getContext('2d'); let w = im.width, h = im.height, m = 1920; if(w > h && w > m) { h = Math.round(h*m/w); w = m; } else if(h > w && h > m) { w = Math.round(w*m/h); h = m; } c.width = w; c.height = h; cx.drawImage(im, 0, 0, w, h); r({ name: f.name, type: 'image/jpeg', data: c.toDataURL('image/jpeg', 0.8) }); }; im.src = e.target.result; }; rd.readAsDataURL(f); }); }
function handleSignup() { const i = document.getElementById('signupId').value.trim(), p = document.getElementById('signupPw').value.trim(), pc = document.getElementById('signupPwCheck').value.trim(), n = document.getElementById('signupNickname').value.trim(), nm = document.getElementById('signupName').value.trim(), ph = document.getElementById('signupPhone').value.trim(); if(!i||!p||!n||!nm||!ph) { alert('모두 입력.'); return; } if(p !== pc) { alert('비밀번호 불일치.'); return; } if(users[i]) { alert('존재하는 아이디.'); return; } usersRef.child(i).set({ id: i, pw: p, nickname: n, name: nm, phone: ph, provider: '일반', scraps: {}, profilePic: null }); alert('가입 완료.'); showPage('login', document.querySelector('.auth-menu a')); }
function handleLogin() { const i = document.getElementById('loginId').value.trim(), p = document.getElementById('loginPw').value.trim(); if(!i) { alert('아이디 없음.'); return; } if(!p) { alert('비밀번호 없음.'); return; } const u = users[i]; if(!u) { alert('없는 아이디.'); return; } if(u.pw !== p) { alert('비밀번호 틀림.'); return; } currentUser = u; sessionStorage.setItem('currentUser', JSON.stringify(u)); if(!u.scraps) u.scraps = {}; alert(`로그인 성공 ${u.nickname}`); updateAuthMenu(); showPage('home', document.querySelector('.nav-menu a')); }
function openSocialModal(p) { tempSocialProvider = p; document.getElementById('socialProviderName').innerText = p; document.getElementById('socialNicknameInput').value = ''; document.getElementById('socialNameInput').value = ''; document.getElementById('socialPhoneInput').value = ''; document.getElementById('socialVerifyCodeInput').value = ''; document.getElementById('socialModal').style.display = 'flex'; }
function sendVerificationCode() { const p = document.getElementById('socialPhoneInput').value.trim(); if(!p) { alert('번호 입력.'); return; } if(p.length < 10) { alert('올바른 번호 입력.'); return; } alert(`[가상 문자] ${p} 로 [1234] 발송.`); }
function confirmSocialLogin() { const n = document.getElementById('socialNicknameInput').value.trim(), nm = document.getElementById('socialNameInput').value.trim(), p = document.getElementById('socialPhoneInput').value.trim(), c = document.getElementById('socialVerifyCodeInput').value.trim(); if(!n||!nm||!p||!c) { alert('모두 입력.'); return; } if(c !== '1234') { alert('인증 실패. 1234'); return; } const ti = `${tempSocialProvider}_${Math.floor(Math.random()*10000)}`; currentUser = { id: ti, name: nm, nickname: n, phone: p, provider: tempSocialProvider, scraps: {}, profilePic: null }; usersRef.child(ti).set(currentUser); sessionStorage.setItem('currentUser', JSON.stringify(currentUser)); closeModal('socialModal'); alert(`${tempSocialProvider} 로그인 성공`); updateAuthMenu(); showPage('home', document.querySelector('.nav-menu a')); }
function handleLogout() { currentUser = null; sessionStorage.removeItem('currentUser'); alert('로그아웃.'); updateAuthMenu(); showPage('home', document.querySelector('.nav-link')); }
function updateAuthMenu() { const a = document.getElementById('authMenu'); const al = document.getElementById('adminMenuLink'); if(currentUser) { a.innerHTML = `<a style="background:#4a4a60; cursor:default;">${escapeHtml(currentUser.nickname)}님</a><a class="logout-btn" onclick="handleLogout()">로그아웃</a>`; al.style.display = currentUser.id === 'admin' ? 'block' : 'none'; } else { a.innerHTML = `<a onclick="showPage('login', this)">로그인</a><a onclick="showPage('signup', this)">회원가입</a>`; al.style.display = 'none'; } }
function handleProfilePicUpload(e) { const f = e.target.files[0]; if(f) { if(f.size > 3*1024*1024) { alert('3MB 이하만.'); return; } compressImage(f).then(c => { currentUser.profilePic = c.data; usersRef.child(currentUser.id).update({ profilePic: c.data }); sessionStorage.setItem('currentUser', JSON.stringify(currentUser)); loadMypage(); alert('변경 완료.'); }); } }
function loadMypage() { const m = document.getElementById('mypageContent'); if(!currentUser) { m.innerHTML = `<p style="text-align:center; color:#666;">로그인 필요.</p>`; return; } let mp = []; ['semi', 'other', 'free', 'ref'].forEach(t => { const tp = posts[t] || {}; Object.keys(tp).forEach(k => { const p = tp[k]; p.id = k; if(currentUser.id === p.authorId) mp.push({ type: t, post: p }); }); }); let sp = []; const us = currentUser.scraps || {}; ['semi', 'other', 'free', 'ref'].forEach(t => { const tp = posts[t] || {}; Object.keys(tp).forEach(k => { const p = tp[k]; p.id = k; if(us[k]) sp.push({ type: t, post: p }); }); }); let mph = mp.length === 0 ? `<p style="color:#999;">없음.</p>` : mp.map(m => `<div class="post-item"><div class="content-area" onclick="viewPost('${m.type}', '${m.post.id}')"><h3>${escapeHtml(m.post.title)}</h3><div class="meta">${getProfileImgHTML(currentUser)} ${m.post.date} <span class="view-btn">[보기]</span></div></div></div>`).join(''); let sph = sp.length === 0 ? `<p style="color:#999;">없음.</p>` : sp.map(s => { const su = users[s.post.authorId]; return `<div class="post-item"><div class="content-area" onclick="viewPost('${s.type}', '${s.post.id}')"><h3>${escapeHtml(s.post.title)}</h3><div class="meta">${getProfileImgHTML(su)} ${escapeHtml(s.post.author)} | ${s.post.date} <span class="view-btn">[보기]</span></div></div></div>`; }).join(''); m.innerHTML = `<div class="section-title">🧑‍💻 마이페이지</div><div class="mypage-header"><div class="mypage-profile-pic" id="mypageProfilePic">${currentUser.profilePic ? `<img src="${currentUser.profilePic}" style="width:100%; height:100%; object-fit:cover;">` : escapeHtml(currentUser.nickname.charAt(0))}</div><div><h2 style="margin-bottom:10px;">${escapeHtml(currentUser.nickname)}님</h2><input type="file" accept="image/*" onchange="handleProfilePicUpload(event)" style="display:none;" id="profilePicInput"><button class="btn-auth" style="width:auto; padding:8px 15px; font-size:14px;" onclick="document.getElementById('profilePicInput').click()">프로필 변경</button></div></div><div class="mypage-info"><div class="info-row"><div class="info-label">아이디</div><div class="info-value">${escapeHtml(currentUser.id)}</div></div><div class="info-row"><div class="info-label">닉네임</div><div class="info-value">${escapeHtml(currentUser.nickname)}</div></div><div class="info-row"><div class="info-label">이름</div><div class="info-value">${escapeHtml(currentUser.name)}</div></div><div class="info-row"><div class="info-label">연락처</div><div class="info-value">${escapeHtml(currentUser.phone)}</div></div><div class="info-row"><div class="info-label">가입 방식</div><div class="info-value">${escapeHtml(currentUser.provider)}</div></div></div><div class="mypage-section"><h3>📝 내가 쓴 글</h3><div class="post-list">${mph}</div></div><div class="mypage-section"><h3>⭐ 스크랩</h3><div class="post-list">${sph}</div></div>`; }
function loadAdminPage() { const tb = document.getElementById('adminUserList'); if(!currentUser || currentUser.id !== 'admin') return; tb.innerHTML = Object.values(users).map(u => `<tr><td>${escapeHtml(u.id)}</td><td>${escapeHtml(u.nickname)}</td><td>${escapeHtml(u.name)}</td><td>${escapeHtml(u.phone)}</td><td>${escapeHtml(u.provider)}</td><td>${u.id === 'admin' ? '<span style="color:#999;">불가</span>' : `<button class="btn-action btn-delete" onclick="deleteUser('${u.id}')">삭제</button>`}</td></tr>`).join(''); }
function deleteUser(i) { if(confirm(`${i} 삭제?`)) { usersRef.child(i).remove(); alert('삭제됨.'); } } updateAuthMenu();
function writePost(t) { const ti = document.getElementById(`${t}Title`), ci = document.getElementById(`${t}Content`), ri = document.getElementById(`${t}Region`); if(!ti || !ti.value.trim()) { alert('제목 입력.'); return; } if(!ci || !ci.value.trim()) { alert('내용 입력.'); return; } if(t !== 'free' && t !== 'ref' && (!ri || !ri.value)) { alert('지역 선택.'); return; } const tv = ti.value, cv = ci.value, rv = ri ? ri.value : '지역 없음'; const sp = (fda) => { const npr = postsRef.child(t).push(); const np = { title: tv, content: cv, author: currentUser.nickname, authorId: currentUser.id, date: new Date().toLocaleString(), region: rv, files: fda, comments: {} }; npr.set(np).then(() => { alert('작성 성공!'); ti.value = ""; ci.value = ""; if(ri) ri.value = ""; tempSelectedFiles = []; if(document.getElementById(`${t}FileName`)) document.getElementById(`${t}FileName`).innerText = '선택된 파일 없음'; }).catch(e => { console.error("실패", e); if(fda && fda.length > 0) { np.files = []; npr.set(np).then(() => { alert('글 작성됨 (파일 제외).'); ti.value=""; ci.value=""; if(ri) ri.value=""; tempSelectedFiles=[]; }).catch(() => alert('작성 실패.')); } else { alert('작성 실패.'); } }); }; if (tempSelectedFiles.length > 0) { let vc = 0; for(let i=0; i<tempSelectedFiles.length; i++) if(tempSelectedFiles[i].type.startsWith('video/')) vc++; if(vc > 1) { alert('동영상 1개만.'); return; } if(tempSelectedFiles.length > 10) { alert('파일 10개만.'); return; } const ps = []; for(let i=0; i<tempSelectedFiles.length; i++) { if(tempSelectedFiles[i].type.startsWith('video/') && tempSelectedFiles[i].size > 3*1024*1024) { alert('동영상 3MB 이하.'); return; } ps.push(compressImage(tempSelectedFiles[i])); } Promise.all(ps).then(r => sp(r)); } else { sp([]); } }
function openImageViewer(b64) { try { const p = b64.split(','); const m = p[0].match(/:(.*?);/)[1]; const bs = atob(p[1]); let u8 = new Uint8Array(bs.length); for (let i = 0; i < bs.length; i++) u8[i] = bs.charCodeAt(i); const b = new Blob([u8], { type: m }); const u = URL.createObjectURL(b); const w = window.open('', '_blank'); if (w) { w.location.href = u; setTimeout(() => URL.revokeObjectURL(u), 10000); } else { alert('팝업 차단.'); } } catch (e) { console.error("실패", e); window.open(b64, '_blank'); } }
function getFilesHTML(f) { if(!f || f.length === 0) return ''; let h = '<div class="file-attachment-box">'; f.forEach(x => { if(x.type.startsWith('image/')) h += `<img src="${x.data}" alt="${escapeHtml(x.name)}" onclick="openImageViewer(this.src)" style="cursor: zoom-in; max-width: 100%; border-radius: 8px; border: 1px solid #ddd;">`; else if(x.type.startsWith('video/')) h += `<video src="${x.data}" controls style="max-width: 100%; border-radius: 8px; border: 1px solid #ddd;">지원 안됨.</video>`; else h += `<a href="${x.data}" download="${escapeHtml(x.name)}" class="file-download-btn">📎 ${escapeHtml(x.name)} 다운로드</a>`; }); h += '</div>'; return h; }
function renderPosts() { ['semi', 'other', 'free', 'ref'].forEach(t => { const l = document.getElementById(t === 'ref' ? 'refList' : `${t}List`); if(!l) return; const bb = document.getElementById(`bulkBar_${t}`); if(bb) bb.classList.toggle('active', currentUser && currentUser.id === 'admin'); const tp = posts[t] || {}; const pa = Object.keys(tp).map(k => ({ id: k, ...tp[k] })).reverse(); if (pa.length === 0) l.innerHTML = `<p style="color:#999;">글 없음.</p>`; else l.innerHTML = pa.map(p => { const au = users[p.authorId]; const rt = p.region && p.region !== '지역 없음' ? `<span class="tag">${escapeHtml(p.region)}</span>` : ''; const fi = (p.files && p.files.length > 0) || p.file ? ' 📎' : ''; const cc = p.comments ? Object.keys(p.comments).length : 0; const ci = cc > 0 ? ` 💬${cc}` : ''; const ch = (currentUser && currentUser.id === 'admin') ? `<label class="admin-checkbox-label"><input type="checkbox" class="admin-checkbox" data-type="${t}" data-id="${p.id}"></label>` : ''; return `<div class="post-item">${ch}<div class="content-area" onclick="viewPost('${t}', '${p.id}')"><h3>${rt} ${escapeHtml(p.title)}${fi}${ci}</h3><p>${linkify(escapeHtml(p.content.length > 50 ? p.content.substring(0, 50) + '...' : p.content))}</p><div class="meta">${getProfileImgHTML(au)} ${escapeHtml(p.author)} | ${p.date} <span class="view-btn">[보기]</span></div></div></div>`; }).join(''); }); renderMainList('mainSemiList', 'semi'); renderMainList('mainOtherList', 'other'); }
function renderMainList(e, t) { const l = document.getElementById(e); const tp = posts[t] || {}; const lp = Object.keys(tp).map(k => ({ id: k, ...tp[k] })).reverse().slice(0, 3); if (lp.length === 0) l.innerHTML = `<p style="color:#999;">글 없음.</p>`; else l.innerHTML = lp.map(p => { const au = users[p.authorId]; return `<div class="post-item"><div class="content-area" onclick="viewPost('${t}', '${p.id}')"><h3>${p.region && p.region !== '지역 없음' ? `<span class="tag">${escapeHtml(p.region)}</span>` : ''} ${escapeHtml(p.title)}</h3><div class="meta">${getProfileImgHTML(au)} ${escapeHtml(p.author)} | ${p.date}</div></div></div>`; }).join(''); }
function toggleAllPosts(c, t) { document.querySelectorAll(`.admin-checkbox[data-type="${t}"]`).forEach(cb => cb.checked = c.checked); }
function bulkDeletePosts(t) { const c = document.querySelectorAll(`.admin-checkbox[data-type="${t}"]:checked`); if(c.length === 0) { alert('선택.'); return; } if(confirm(`${c.length}개 삭제?`)) { Promise.all(Array.from(c).map(cb => postsRef.child(t).child(cb.getAttribute('data-id')).remove())).then(() => { alert('삭제됨.'); document.getElementById(`selectAll_${t}`).checked = false; }).catch(() => alert('오류.')); } }
function bulkMovePosts(t) { const c = document.querySelectorAll(`.admin-checkbox[data-type="${t}"]:checked`); const nt = document.getElementById(`bulkMoveSelect_${t}`).value; if(c.length === 0) { alert('선택.'); return; } if(!nt) { alert('게시판 선택.'); return; } if(confirm(`${c.length}개 이동?`)) { Promise.all(Array.from(c).flatMap(cb => { const id = cb.getAttribute('data-id'); if(t !== nt) { const pd = posts[t][id]; return [postsRef.child(nt).push(pd), postsRef.child(t).child(id).remove()]; } return []; })).then(() => { alert('이동됨.'); document.getElementById(`bulkMoveSelect_${t}`).value = ''; document.getElementById(`selectAll_${t}`).checked = false; }).catch(() => alert('오류.')); } }
function viewRecJob(j) { const jb = recommendedJobs[j]; if(!jb) return; if(jb.originType && jb.originId && posts[jb.originType] && posts[jb.originType][jb.originId]) viewPost(jb.originType, jb.originId); else { document.getElementById('modalTitle').innerText = jb.title; document.getElementById('modalMeta').innerHTML = jb.region ? `<span class="tag">${escapeHtml(jb.region)}</span>` : ''; document.getElementById('modalContent').innerHTML = linkify(escapeHtml(jb.info).replace(/\n/g, '<br>')); document.getElementById('modalActions').innerHTML = `<button class="btn-action" style="background:#ccc; color:#333;" onclick="closeModal('postModal')">닫기</button>`; document.getElementById('modalMoveArea').style.display = 'none'; document.getElementById('postModal').style.display = 'flex'; } }
function viewPost(t, id) { if(!posts[t] || !posts[t][id]) { alert('삭제됨.'); return; } const p = posts[t][id]; const au = users[p.authorId] || {}; document.getElementById('modalTitle').innerText = p.title; document.getElementById('modalMeta').innerHTML = `${getProfileImgHTML(au)} <span>작성자: <strong>${escapeHtml(p.author)}</strong></span><span>작성일: ${p.date}</span>${p.region && p.region !== '지역 없음' ? `<span class="tag">${escapeHtml(p.region)}</span>` : ''}`; const f = p.files || (p.file ? [p.file] : []); document.getElementById('modalContent').innerHTML = linkify(escapeHtml(p.content).replace(/\n/g, '<br>')) + getFilesHTML(f); const a = document.getElementById('modalActions'); const m = document.getElementById('modalMoveArea'); a.innerHTML = ''; m.innerHTML = ''; m.style.display = 'none'; if(currentUser) { let h = ''; if(currentUser.id === p.authorId || currentUser.id === 'admin') { h += `<button class="btn-action btn-edit" onclick="editPost('${t}', '${id}')">수정</button><button class="btn-action btn-delete" onclick="deletePost('${t}', '${id}')">삭제</button>`; } if(currentUser.id !== p.authorId) { const is = currentUser.scraps && currentUser.scraps[id]; h += `<button class="btn-action btn-scrap" onclick="toggleScrap('${t}', '${id}')">${is ? '스크랩 취소' : '스크랩'}</button>`; } a.innerHTML = h; if(currentUser.id === 'admin') { a.innerHTML += `<button class="btn-action btn-rec" onclick="addPostToRec('${t}', '${id}')">추천 등록</button>`; m.style.display = 'block'; m.innerHTML = `<label style="font-weight:700; margin-right:10px;">게시판 이동:</label><select id="moveSelect"><option value="">선택</option><option value="semi">반도체</option><option value="other">기타</option><option value="ref">자료실</option><option value="free">자유</option></select><button class="btn-action btn-move" onclick="movePost('${t}', '${id}')">이동</button>`; } } currentViewingPost = { type: t, id: id }; renderComments(t, id); document.getElementById('postModal').style.display = 'flex'; }
function renderComments(t, id) { const p = posts[t][id]; const cs = p.comments || {}; const ca = Object.keys(cs).map(k => ({ id: k, ...cs[k] })).sort((a,b) => a.timestamp - b.timestamp); document.getElementById('commentCount').innerText = ca.length; const l = document.getElementById('commentList'); if(ca.length === 0) l.innerHTML = `<p style="color:#999; font-size:14px;">댓글 없음.</p>`; else l.innerHTML = ca.map(c => { const au = users[c.authorId] || { nickname: c.author, id: c.authorId }; const is = (currentUser && (currentUser.id === c.authorId || currentUser.id === 'admin')); const db = is ? `<button class="comment-delete-btn" onclick="deleteComment('${t}', '${id}', '${c.id}')">삭제</button>` : ''; return `<div class="comment-item"><div class="comment-meta"><div class="comment-author">${getProfileImgHTML(au)} ${escapeHtml(c.author)}</div><div><span class="comment-date">${new Date(c.timestamp).toLocaleString()}</span>${db}</div></div><div class="comment-content">${linkify(escapeHtml(c.content))}</div></div>`; }).join(''); }
async function addComment() { if(!currentViewingPost.type || !currentViewingPost.id) return; const i = document.getElementById('commentInput'); const c = i.value.trim(); if(!c) { alert('내용 입력.'); return; } let a = '익명', aid = 'guest'; if(currentUser) { a = currentUser.nickname; aid = currentUser.id; } else { a = await getAnonName(); } postsRef.child(currentViewingPost.type).child(currentViewingPost.id).child('comments').push({ author: a, authorId: aid, content: c, timestamp: Date.now() }).then(() => i.value = '').catch(() => alert('실패.')); }
function deleteComment(t, id, cid) { if(!confirm('삭제?')) return; postsRef.child(t).child(id).child('comments').child(cid).remove().then(() => alert('삭제됨.')).catch(() => alert('실패.')); }
function handleCommentKeyPress(e) { if (e.key === 'Enter') addComment(); }
function toggleScrap(t, id) { const sr = usersRef.child(currentUser.id).child('scraps').child(id); if(currentUser.scraps && currentUser.scraps[id]) { sr.remove(); alert('스크랩 취소.'); } else { sr.set(true); alert('스크랩 됨.'); } }
function addPostToRec(t, id) { const p = posts[t][id]; recJobsRef.push({ title: p.title, info: p.content, region: p.region || '미지정', originType: t, originId: id }); alert('추천 등록 완료.'); closeModal('postModal'); }
function movePost(t, id) { const nt = document.getElementById('moveSelect').value; if(!nt) { alert('게시판 선택.'); return; } if(nt === t) { alert('같은 게시판.'); return; } const p = posts[t][id]; postsRef.child(nt).push(p); postsRef.child(t).child(id).remove(); alert('이동됨.'); closeModal('postModal'); }
function editPost(t, id) { const p = posts[t][id]; editingFiles = p.files || (p.file ? [p.file] : []); document.getElementById('modalTitle').innerHTML = `<input type="text" id="editTitle" value="${escapeHtml(p.title)}" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:5px;">`; document.getElementById('modalContent').innerHTML = `<textarea id="editContent" style="width:100%; height:150px; padding:10px; border:1px solid #ccc; border-radius:5px;">${escapeHtml(p.content)}</textarea>${renderEditFileArea()}`; document.getElementById('modalActions').innerHTML = `<button class="btn-action btn-edit" onclick="savePost('${t}', '${id}')">저장</button><button class="btn-action" style="background:#ccc; color:#333;" onclick="viewPost('${t}', '${id}')">취소</button>`; document.getElementById('modalMoveArea').style.display = 'none'; }
function renderEditFileArea() { let h = '<div id="editFileArea">'; if(editingFiles && editingFiles.length > 0) editingFiles.forEach((f, i) => h += `<div class="edit-file-item"><span>${escapeHtml(f.name)}</span><button class="btn-action btn-delete" style="margin:0; padding:5px 10px;" onclick="removeEditingFile(${i})">삭제</button></div>`); h += `<div class="file-upload-wrapper"><label class="file-upload-label" for="editFile">📎 새 파일</label><input type="file" id="editFile" multiple style="display:none;" onchange="document.getElementById('editFileName').innerText = this.files.length > 0 ? this.files.length + '개 선택' : (editingFiles.length > 0 ? '기존 유지' : '없음');"><div class="file-name-display" id="editFileName">${editingFiles.length > 0 ? '기존 유지' : '없음'}</div></div></div>`; return h; }
function removeEditingFile(i) { editingFiles.splice(i, 1); document.getElementById('modalContent').innerHTML = document.getElementById('modalContent').innerHTML.split('<div id="editFileArea">')[0] + renderEditFileArea(); }
function savePost(t, id) { const nt = document.getElementById('editTitle').value.trim(), nc = document.getElementById('editContent').value.trim(); if(!nt || !nc) { alert('제목/내용 입력.'); return; } const nf = document.getElementById('editFile').files; const pr = postsRef.child(t).child(id); let vc = 0; for(let i=0; i<editingFiles.length; i++) if(editingFiles[i].type.startsWith('video/')) vc++; if(nf.length > 0) { for(let i=0; i<nf.length; i++) if(nf[i].type.startsWith('video/')) vc++; if(vc > 1) { alert('동영상 1개만.'); return; } if((editingFiles.length + nf.length) > 10) { alert('파일 10개만.'); return; } const ps = []; for(let i=0; i<nf.length; i++) ps.push(compressImage(nf[i])); Promise.all(ps).then(r => { const af = editingFiles.concat(r); pr.update({ title: nt, content: nc, files: af, file: null, date: `${new Date().toLocaleString()} (수정)` }).then(() => alert('수정됨.')).catch(() => pr.update({ title: nt, content: nc, files: [], file: null, date: `${new Date().toLocaleString()} (수정)` }).then(() => alert('수정됨 (파일 제외).')).catch(() => alert('실패.'))); }); } else { if(vc > 1) { alert('동영상 1개만.'); return; } pr.update({ title: nt, content: nc, files: editingFiles, file: null, date: `${new Date().toLocaleString()} (수정)` }).then(() => alert('수정됨.')).catch(() => alert('실패.')); } closeModal('postModal'); }
function deletePost(t, id) { if(confirm('삭제?')) { postsRef.child(t).child(id).remove(); alert('삭제됨.'); closeModal('postModal'); } }
function closeModal(m) { document.getElementById(m).style.display = 'none'; }
window.onclick = e => { if (e.target.id === 'postModal') closeModal('postModal'); if (e.target.id === 'socialModal') closeModal('socialModal'); if (e.target.id === 'chatModal') closeModal('chatModal'); }
function addRecJob() { const t = document.getElementById('recJobTitle').value.trim(), i = document.getElementById('recJobInfo').value.trim(); if(!t || !i) { alert('입력.'); return; } recJobsRef.push({ title: t, info: i, region: '미지정' }); document.getElementById('recJobTitle').value = ''; document.getElementById('recJobInfo').value = ''; }
function deleteRecJob(i) { recJobsRef.child(i).remove(); alert('삭제됨.'); }
function renderAdminRecJobs() { const l = document.getElementById('adminRecJobList'); const j = Object.keys(recommendedJobs).map(k => ({ id: k, ...recommendedJobs[k] })); if(j.length === 0) l.innerHTML = `<p style="color:#999;">없음.</p>`; else l.innerHTML = j.map(x => `<div class="job-card"><div class="job-title">${escapeHtml(x.title)}</div><div class="job-info">${escapeHtml(x.info.length > 30 ? x.info.substring(0, 30) + '...' : x.info)}</div><button class="btn-action btn-delete" style="margin-top:10px;" onclick="deleteRecJob('${x.id}')">삭제</button></div>`).join(''); }
function renderHomeRecJobs() { const l = document.getElementById('homeJobList'); const j = Object.keys(recommendedJobs).map(k => ({ id: k, ...recommendedJobs[k] })).reverse().slice(0, 4); if(j.length === 0) l.innerHTML = `<p style="color:#999;">없음.</p>`; else l.innerHTML = j.map(x => `<div class="job-card" onclick="viewRecJob('${x.id}')"><div class="job-title">${x.region ? `<span class="tag">${escapeHtml(x.region)}</span>` : ''} ${escapeHtml(x.title)}</div><div class="job-info">${escapeHtml(x.info.length > 50 ? x.info.substring(0, 50) + '...' : x.info)}</div></div>`).join(''); }
function searchJobs() { const i = document.getElementById('jobSearchInput').value.toUpperCase(), r = document.getElementById('searchRegion').value; const res = []; ['semi', 'other'].forEach(t => { const tp = posts[t] || {}; Object.keys(tp).forEach(k => { const p = tp[k]; p.id = k; if((p.title + p.content + p.author).toUpperCase().indexOf(i) > -1 && (!r || p.region === r)) res.push({ type: t, post: p }); }); }); const d = document.getElementById('searchResults'); if(i === "" && r === "") { d.innerHTML = `<p style="color:#999;">검색어 입력.</p>`; return; } if (res.length === 0) d.innerHTML = `<p style="color:#999;">결과 없음.</p>`; else d.innerHTML = res.map(x => `<div class="post-item"><div class="content-area" onclick="viewPost('${x.type}', '${x.post.id}')"><h3>${x.post.region ? `<span class="tag">${escapeHtml(x.post.region)}</span>` : ''} ${escapeHtml(x.post.title)}</h3><p>${linkify(escapeHtml(x.post.content.length > 50 ? x.post.content.substring(0, 50) + '...' : x.post.content))}</p><div class="meta">${getProfileImgHTML(users[x.post.authorId])} ${escapeHtml(x.post.author)} | ${x.post.date}</div></div></div>`).join(''); }

// 채팅 모달 열기 (커서 자동 이동 제거)
function openChatModal() { 
    const ms = document.getElementById('chatScreen'); 
    const mds = document.getElementById('chatModalScreen'); 
    mds.innerHTML = ms.innerHTML; 
    mds.scrollTop = mds.scrollHeight; 
    document.getElementById('chatModal').style.display = 'flex'; 
}

async function sendMessage(isModal) { const i = document.getElementById(isModal ? 'chatModalInput' : 'chatInput'); const m = i.value.trim(); if (m !== "") { stopFakeChat(); let a = '익명', aid = 'guest'; if (currentUser) { a = currentUser.nickname; aid = currentUser.id; } else { a = await getAnonName(); aid = 'guest'; } let cd = { author: a, authorId: aid, message: m, timestamp: Date.now() }; if(currentReply) cd.replyTo = currentReply; chatRef.push(cd); i.value = ""; cancelReply(); } }
function handleKeyPress(e) { if (e.key === 'Enter') sendMessage(false); }
function handleModalKeyPress(e) { if (e.key === 'Enter') sendMessage(true); }

const fakeNicknames = ['알바고수', '평택일번지', '주차왕', '궁금해요', '현직러', '친절맨', '도우미', '서울촌놈', '반장님', '기능공'];
const rawScript = `평택7번게이트 근처 무료주차장있나요?
죄송요 저는 낼 내려가는 일인입니다. 고수분들이 답해주실거에요
무료 주차장은 없습니다
7번 게이트 입문 하시는 거라면 그린존 일하시는거 같은데 개서식당이나 정성 식당 식권 식사하시며 주차하시고 식당 버스 이용하시는게 빠를듯요
개성식당 정성식당
숙소는 고덕여염리이라서요
그러면 차량 이용은 힘드시고 자전거나 오토바이뿐 입니다
걷기에는 좀 힘들고요
네
회사 어디에 입사 하셨나요?
광건요
광건이라면 칸막이 공사죠? 탭동인가요?
5동은 식사하고 주차가능 하는곳 아실까요?
p4요 복합동요
5번 게이트 도 그린동 탭동 복합동이라 주차 불가입니다
5번 게이트 입문하시면 빨라요 복합동 2번게이트도 괞찬고요
걸어서10분안으로주차 가능한곳은요
없음니다
물산이아니고 E&J이라서요
정성한식 뷔페 찍고 빌라쪽 쭉 올라가시면 아침 빠른시간 군데군데 주차 자리 있어요 그리고 걸어서 오면 10분 거리입니다 5번게이트
2번개이트에서 걸어서 10분 거리에 유료주차장은 있어요. 월주차 33만원 입니다.
네 E&a 5번게이트 복합동 맞습니다
주차편하게 하실거면 월 주차 해야되욤
2 7 5게이트사용 가능한데 
2번게이트 사용 이 애매서요 물산 이 오픈안하면.못들어가서요
5게이트나 7번게이트 이용하시면 호이스트 이용하실껀데 출퇴근 시간은 대기줄 길어요
혹시 소개로 들어가시나요,
아니요
화기 가세요
아웃소싱 아니고. 아는분이라서요
아~~
화기로 가세요 안담이예요?
둘다아니에요
반장님
그럼?
시공
전기쪽 이신듯 트레이
지금 공기 1달 남았어요 가지마세요
아~시공 아~ 이제인식요 남자분이시구나
지금 힘들고 공사 막바지라 사람들 다 빠지고 공사 힘든 구간만 남아서 일하기 빡세고 힘든 구간만 남았어요
P4로 가는데 7번게이트로 가면 금방일까요?
6시15분 이면 5번게이트까지 10분안 도착할까?
그래도 2번이 나으실텐데...걸어서 5번은 ..힘드실꺼예요
5번게이트요
달려가시면 가능하시겠죠?
평택 지금 p5 공사하나요?
네
안되요 넘어요
감사용
함밥집셔틀타면요
자잔거 다 썩은거 3만원 주고 하나 사서 타고 다니세요 정성식당 근처 차 대놓고
제가 아시는 블이 삼성에 몇분계시는데 소장님도 계시구 
직발쪽도 계시는데 저 안들어갔어요 이뜻은알아 들으셔야 하실것요
어찌되었던 2게이트기준 6시 30분전에 들어가시는게 편함니다
네
지금 상황이 별루 인거죠?
2게이트 좀더 일칙들어가시든데요 기공블들도요
p4는마무리고요 p5들어가야죠
일단 소주 몇잔 더 드시고 몇일 더 쉬시다 1일부터 P5고고 하세요
지금 들어가심 젤 힘들때 들어가시는거궁P5도 시작할땐 림듭니다
저희 애인이 매봐 이구요 기능공입니다 이일 20년 했더라구요
저도 이천 이나 청주sk있었근요
용인으로 뜨고 싶다 후
저도 청주 m15 x 멤버
전 용인 오라하는거 안가구 있슴요
거긴 추퇴근 지옥
P5 복합동 안감 입니다.  
입사 동기 10명인데 2주만에 7명이 그만두고
1명은 병가 내고….주말에 복귀하니 숙소가 썰렁합니다. 용인Sk 넘어가고 싶네요.
아 더 지옥이에요?
용인 출퇴근지욕 2차선ㅜㅜ
저는 p4 안감임다 ㅋㅋ 안감 별로네여 후
네 평택 2배라고 생각하심되요 저 한달하고 지처서 평택서 청주 1시간30분 출퇴근 ㅣ년 보다 더힘듬요
여염에서 5번 게이트 맨날 걸어서 출퇴근하는데 이것도 빡셈유 후
아뇨 전 편하게 했어요 경기도 굉주 가 집이였는데 회사에서 숙소 얻어 줬어요
저도 소개 였구 직발 이었는데
P4 안감은 젊은 사람 위주인듯. 블랙조끼 유니폼은 P5 파란색 보다 나은듯
일할땐 내직장 상사가 누구였는지 그게 큰 것같고 그경험했습니다
빙고
내일을 위해 로그아웃 ....
저도 조출이라서 먼저 잡니다.
잘쉬시고 지금은 고덕 잘 모르겠네요 저사는데 앞집 아저씨
넘힘들어하시드라구요
오토바이 주차도 빡쎄보이던데 그냥 아무대나 대도 괜찮은건지요
스쿠터 타고 출퇴근예정인데 아는 정보가 하나도 없네요 ㅜ
머리털 나고 평택 처음와보는 서울촌놈입니다 ㅋ
잠가놓으세요 글루 오토바이 긁거나 쉽게 차로 설명 드리면 빽밀러 각아 놓고 그냥가시는분 많으셍
엔진만 뽀려가지 않으면 괜찮습니다 ㅎㅎ 주차는 그냥 자리빈곳 아무대나 해도 되나요
그렇게 일해본분이 계셔서 말씀 드리는거궁 음~다니 오토바이는
차 처럼 그 앞근방에 세워놓고 출퇴근가능요 그럼다른분들 보다 조금 늦게 나오셔도되궁 출퇴근 편하시게 되는거지용
차도있는데 스쿠터로 다닐려고요 보니까 차는 답이안나올것 같더라구요 ㅋㅋ
남들 5시에 나갈걸 스쿠터는집에서 6시에 나가도 된신다는 장점요
그렇군요 현장근처 답사갔는데 바이크가 엄청많더라구요 그래서 이거 이거 바이크도 댈곳이없겠는데 싶었네요
백날 얘기 듣느니 함 해보세요
얘기도 못들었습니다 ㅋ
예를 들면 살치 아님소고기 새우살도 먹어 봐야 알듯이 직접 경험 하시고 아무리 일이힘들어도
같이 일하시는분들 께서 많이챙겨주심그걸 로 만족하셔야할듯요
넵 현답이십니다 뭐 직접 부딪혀봐야 실수도하고 알아내기도 하는거겠죠 그냥 대충이나마 도움얻을수 있을까 싶어 질문드렸습니다 감사합니다
그러니까요 점점 개인주의가 심해져서 이젠 어디가서 도움도 못청하는 시대가 된거같아 씁쓸하네요
일 해보실거면 맘 잡고 일해보세요
안녕하세요 아무것도 모르는상태에서와서 8일째하는데요 발바닥아픈거빼곤 할만합니다
서울에서 맘잡고 일해보려고 한달전부터 가재동에 집구하고 현장답사도 가보고 엄청 노력중입니다 이제 집정리가 좀 끝났네요 좋은말씀 감사드리고 꿀잠주무세요
8일 정도면 좀더 몇일있다 ㆍㄹ집 잡힘니다
어떤 공정 하시는지요
저는 안전화도 적응하려고 일안할때도 신고 다니고있습니다 ㅋㅋ
개인적으로 구매했네요 안전화
개인 안전화 인가요
네네 k2 lt122인가? 이거 가볍고 좋네요 6인치
한 10일 지나면 안아플낌니더
안전화 안에 하나 더 깔구신으셍ㆍ느
서울 어디서 오셨어요?
수장입니다 금토 비때문에 개인안전화신다가 여기서준거신고 그랬네요
능동에서 왔어요
하루쉬니 다리아픈거도 풀린거같고 내일도 화이팅입니다
아~~무튼 반갑습니다 같은 서울사람
오~ 반가워요 ㅎㅎ
다들 남성분이시죠?
전 서교동
전 여잔데요 ㅎ
아~~
서교동이면 연희동 그 근처라인 맞죠?
어맛 마자요
동교동옆.연남동옆
어릴때 홍대랑 신촌 많이갔습니다 ㅋㅋ
홍대.합정.신촌
어쩜 봤을수도 ㅎ
갑자기 소고기 토킹을 하시니
배고프다 아입니꼬 ㅋㅋㅋㅋㅋㅋ
일단 일해보세요 자신에게 믽는일이라 새
생각이들면 하는거니까요
여기오니 서울에는 절대없는 여유? 같은게 있네요 바이크로 돌아다니다가 길을 잘못들었는데 양옆이 논 조금더가니 소키우는곳이 ㅋㅋ
우리도 수학여행은 ㅋ쓰울로 갔었거등예!!!ㅋㅋㅋㅋㅋㅋ63빌딩에 ㅋㅋㅋㅋ
제가 말씀드리것은 메보 뜻은 아시는거죠
우린 경주요
ㅠㅠ
태어난곳은 이태원1동 이에요 홍대랑 모두 가까워서 자주 갔었습니다 물론 젊었을적 ㅋㅋ
여기 옛날 이태원같은 곳있어요 깜놀 했어요
다이소찾다가
지금 이태원말고
거기가 어딘가요? 추억 돋고싶은데
무슨 공군 비행장인가
일하스는데가 메인 배관 이지.그뜻인데요
다이소 앞이던데
한번 찾아봐야겠네요 ㅎㅎ
엥?
아님 방수도 있구요
이태원 내가 살던시절엔 진짜 정글이었는데 지금은 정말 좋아진 케이스
오~ 여러분 
지평막걸리에 토닉워터 레몬즙 타서 드셔보셨나요
지금은 LA느낌나쥬 ㅎ
경리단길
남성분 이시네요
참 좋아요
이게 야채튀김안주에 기가 막히네요
그거보단 외지인들이 더많아서 ㅎㅎ
거기 가보세요
이전 이태원같아요
경리단길이 이태원1동 이에요 내고향
오호
여러분들도 행복 편안한 밤되세요~
감솨요
저 팽성에서 3년 살다 이사 나왔읍니다
낼 일하시렴 주무셔야 겠네요. 저는 다시 내려가서 도돌이 해야해요ㅠㅠ
미군 가족들 ㅠ 대박 주말마다 파티하심ㅇᆢㄷ
저 집구할때 그쪽도 알아봤는데 현장하고는 거리가 멀더라구요
팽성은 횡성?
팽성읍
아 지송
경기도
여기 평택에 팽성 이라고 있지않나요?
영어 좀 하셨나?
네네 저두 byee
네 ~ 나머진 바디랭귀지
me to
주무세요~~Goodnight`;
const fakeScript = rawScript.split('\n').map(s => s.trim()).filter(s => s.length > 0);
let fakeScriptIndex = 0; let fakeChatInterval = null; let inactivityTimeout = null;
let currentSpeaker = null;

function getRandomResponder(excludeName) {
    const available = fakeNicknames.filter(n => n !== excludeName);
    return available[Math.floor(Math.random() * available.length)];
}

function appendFakeMessage() {
    const mtp = Math.floor(Math.random() * 3) + 1; 
    for(let i=0; i<mtp; i++) {
        if(fakeScriptIndex >= fakeScript.length) fakeScriptIndex = 0; 
        
        const msg = fakeScript[fakeScriptIndex];
        let author;

        if(msg.includes('?')) {
            currentSpeaker = fakeNicknames[Math.floor(Math.random() * fakeNicknames.length)];
            author = currentSpeaker;
        } else {
            if(Math.random() < 0.8) {
                author = getRandomResponder(currentSpeaker);
            } else {
                author = currentSpeaker;
            }
        }

        const fakeKey = 'fake_' + Date.now() + '_' + i;
        const tempUser = { nickname: author, id: 'fake_' + author };
        const dataAttrAuthor = escapeHtml(author).replace(/"/g, '&quot;').replace(/'/g, '&#039;');
        const dataAttrMsg = escapeHtml(msg).replace(/"/g, '&quot;').replace(/'/g, '&#039;');
        const html = `<div class="chat-message" onclick="setReply('${fakeKey}', '${dataAttrAuthor}', '${dataAttrMsg}')">${getProfileImgHTML(tempUser)}<div class="chat-content-wrapper"><div><span class="user">${escapeHtml(author)}:</span> <span class="chat-text">${linkify(escapeHtml(msg))}</span></div></div></div>`;
        const ms = document.getElementById('chatScreen'); const mds = document.getElementById('chatModalScreen');
        [ms, mds].forEach(screen => { if(!screen) return; const isNearBottom = screen.scrollHeight - screen.scrollTop - screen.clientHeight < 100; screen.insertAdjacentHTML('beforeend', html); if(isNearBottom) { screen.scrollTop = screen.scrollHeight; } else { if(screen.id === 'chatScreen') { unreadMainCount++; updateNewMessageAlert('newMsgAlertMain', unreadMainCount); } else { unreadModalCount++; updateNewMessageAlert('newMsgAlertModal', unreadModalCount); } } });
        fakeScriptIndex++;
    }
}
function startFakeChat() { if(fakeChatInterval) return; appendFakeMessage(); fakeChatInterval = setInterval(appendFakeMessage, 12000); }
function stopFakeChat() { if(fakeChatInterval) { clearInterval(fakeChatInterval); fakeChatInterval = null; } if(inactivityTimeout) clearTimeout(inactivityTimeout); inactivityTimeout = setTimeout(() => startFakeChat(), 120000); } 
startFakeChat();

// 모바일에서 첫 접속 시 채팅 크게 보기 자동 실행
window.addEventListener('load', () => {
    if (window.innerWidth <= 768) {
        openChatModal();
    }
});
