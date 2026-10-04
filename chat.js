const chatRef = db.ref('chat');
const chatMasterRef = db.ref('meta/chatMaster');
const sessionId = Math.random().toString(36).substring(2);
let isMaster = false;
let chatInitialized = false; 
let unreadMainCount = 0; 
let unreadModalCount = 0; 
let currentReply = null;

function handleNewChatMessage(key, c) {
    let tempUser = users[c.authorId]; 
    if(!tempUser) tempUser = { nickname: c.author, id: c.author };
    let replyQuoteHtml = '';
    if(c.replyTo) { replyQuoteHtml = `<div class="chat-reply-quote"><strong>${escapeHtml(c.replyTo.author)}:</strong><span class="reply-text">${escapeHtml(c.replyTo.message)}</span></div>`; }
    const dataAttrAuthor = escapeHtml(c.author).replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    const dataAttrMsg = escapeHtml(c.message).replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    const html = `<div class="chat-message" onclick="setReply('${key}', '${dataAttrAuthor}', '${dataAttrMsg}')">${getProfileImgHTML(tempUser)}<div class="chat-content-wrapper">${replyQuoteHtml}<div><span class="user">${escapeHtml(c.author)}:</span> <span class="chat-text">${linkify(escapeHtml(c.message))}</span></div></div></div>`;
    const mainScreen = document.getElementById('chatScreen'); const modalScreen = document.getElementById('chatModalScreen');
    [mainScreen, modalScreen].forEach(screen => { if(!screen) return; const isNearBottom = screen.scrollHeight - screen.scrollTop - screen.clientHeight < 100; screen.insertAdjacentHTML('beforeend', html); if(!chatInitialized || isNearBottom) { screen.scrollTop = screen.scrollHeight; } else { if(screen.id === 'chatScreen') { unreadMainCount++; updateNewMessageAlert('newMsgAlertMain', unreadMainCount); } else { unreadModalCount++; updateNewMessageAlert('newMsgAlertModal', unreadModalCount); } } });
}

chatMasterRef.transaction((currentMaster) => {
    if (!currentMaster) {
        isMaster = true;
        return sessionId;
    }
}, (error, committed) => {
    if (error) { console.error('Master transaction failed:', error); } 
    else if (committed && isMaster) {
        chatMasterRef.onDisconnect().remove();
        chatRef.limitToLast(1).once('value').then(snap => {
            const lastChatData = snap.val();
            if(lastChatData) {
                const lastKey = Object.keys(lastChatData)[0];
                const lastMsg = lastChatData[lastKey].message;
                const foundIndex = fakeChatLog.findIndex(line => {
                    const colonIdx = line.indexOf(':');
                    const msgPart = colonIdx > -1 ? line.substring(colonIdx + 1).trim() : line;
                    return msgPart === lastMsg;
                });
                
                if(foundIndex > -1) {
                    fakeScriptIndex = foundIndex + 1;
                    if(fakeScriptIndex >= fakeChatLog.length) fakeScriptIndex = 0;
                } else {
                    fakeScriptIndex = Math.floor(Math.random() * fakeChatLog.length);
                }
            } else {
                fakeScriptIndex = 0;
            }
            startFakeChatGenerator();
        });
    } else {
        setInterval(() => {
            chatMasterRef.once('value').then(snap => {
                if (!snap.val()) {
                    location.reload(); 
                }
            });
        }, 15000);
    }
});

chatRef.limitToLast(100).on('child_added', s => { 
    const c = s.val(); 
    const k = s.key; 
    handleNewChatMessage(k, c); 
    if(isMaster && c.authorId !== sessionId && (Date.now() - c.timestamp < 10000)) {
        stopFakeChatGenerator();
    }
});
chatRef.limitToLast(100).once('value').then(() => { chatInitialized = true; });

function setReply(key, encodedAuthor, encodedMsg) { const txt = document.createElement("textarea"); txt.innerHTML = encodedAuthor; const author = txt.value; txt.innerHTML = encodedMsg; const msg = txt.value; const shortMsg = msg.length > 50 ? msg.substring(0, 50) + '...' : msg; currentReply = { id: key, author, message: shortMsg }; const mp = document.getElementById('replyPreviewMain'); const md = document.getElementById('replyPreviewModal'); const ph = `<strong>${escapeHtml(author)}</strong>에게 답장<br>${escapeHtml(shortMsg)}`; if(mp) { mp.querySelector('.reply-content').innerHTML = ph; mp.style.display = 'flex'; } if(md) { md.querySelector('.reply-content').innerHTML = ph; md.style.display = 'flex'; } if(document.getElementById('chatModal').style.display === 'flex') document.getElementById('chatModalInput').focus(); else document.getElementById('chatInput').focus(); }
function cancelReply() { currentReply = null; const mp = document.getElementById('replyPreviewMain'); const md = document.getElementById('replyPreviewModal'); if(mp) mp.style.display = 'none'; if(md) md.style.display = 'none'; }
function updateNewMessageAlert(id, count) { const el = document.getElementById(id); if(el && count > 0) { el.style.display = 'block'; el.querySelector('.count').innerText = count; } }
function scrollToBottom(screenId, alertId) { const s = document.getElementById(screenId); if(s) s.scrollTop = s.scrollHeight; if(alertId) { const el = document.getElementById(alertId); if(el) { el.style.display = 'none'; el.querySelector('.count').innerText = '0'; } } if(screenId === 'chatScreen') unreadMainCount = 0; else unreadModalCount = 0; }

function openChatModal() { 
    const ms = document.getElementById('chatScreen'); 
    const mds = document.getElementById('chatModalScreen'); 
    mds.innerHTML = ms.innerHTML; 
    document.getElementById('chatModal').style.display = 'flex'; 
    setTimeout(() => {
        mds.scrollTop = mds.scrollHeight; 
    }, 100);
}

async function sendMessage(isModal) { 
    const i = document.getElementById(isModal ? 'chatModalInput' : 'chatInput'); 
    const m = i.value.trim(); 
    if (m !== "") { 
        if(isMaster) stopFakeChatGenerator();
        let a = '익명', aid = 'guest'; 
        if (currentUser) { a = currentUser.nickname; aid = currentUser.id; } 
        else { a = await getAnonName(); aid = 'guest'; } 
        let cd = { author: a, authorId: aid, message: m, timestamp: firebase.database.ServerValue.TIMESTAMP }; 
        if(currentReply) cd.replyTo = currentReply; 
        chatRef.push(cd); 
        i.value = ""; 
        cancelReply(); 
    } 
}
function handleKeyPress(e) { if (e.key === 'Enter') sendMessage(false); }
function handleModalKeyPress(e) { if (e.key === 'Enter') sendMessage(true); }

// ==================== 가짜 채팅 스크립트 ====================
const rawScript = `가퐈 : 죄송요 저는 낼 내려가는 일인입니다. 고수분들이 답해주실거에요
냐옹 : 무료 주차장은 없습니다
7번 게이트 입문 하시는 거라면 그린존 일하시는거 같은데 개서식당이나 정성 식당 식권 식사하시며 주차하시고 식당 버스 이용하시는게 빠를듯요
냐옹 : 개성식당 정성식당
커피7: 숙소는 고덕여염리이라서요
냐옹 : 그러면 차량 이용은 힘드시고 자전거나 오토바이뿐 입니다
냐옹 : 걷기에는 좀 힘들고요
커피7 : 네
냐옹 : 회사 어디에 입사 하셨나요?
커피7:광건요
냐옹 : 광건이라면 칸막이 공사죠? 탭동인가요?
가퐈:5동은 식사하고 주차가능 하는곳 아실까요?
커피7:p4요 복합동요
냐옹 : 5번 게이트 도 그린동 탭동 복합동이라 주차 불가입니다
냐옹 : 5번 게이트 입문하시면 빨라요 복합동 2번게이트도 괜찮고요
커피7:걸어서10분안으로주차 가능한곳은요
동태:없습니다
커피7:물산이아니고 E&J이라서요
냐옹 : 정성한식 뷔페 찍고 빌라쪽 쭉 올라가시면 아침 빠른시간 군데군데 주차 자리 있어요 그리고 걸어서 오면 10분 거리입니다 5번게이트
낙화유:2번개이트에서 걸어서 10분 거리에 유료주차장은 있어요. 월주차 33만원 입니다.
냐옹 : 네 E&a 5번게이트 복합동 맞습니다
그냥:주차편하게 하실거면 월 주차 해야되욤
커피7: 2 7 5게이트사용 가능한데 
2번게이트 사용 이 애매서요 물산 이 오픈안하면.못들어가서요
동태:5게이트나 7번게이트 이용하시면 호이스트 이용하실껀데 출퇴근 시간은 대기줄 길어요
그냥:혹시 소개로 들어가시나요,
커피7:아니요
그냥:화기 가세요
커피7: 아웃소싱 아니고. 아는분이라서요
그냥:아~~
화기로 가세요 안담이예요?
커피7: 둘다아니에요
냐옹:반장님
그냥:그럼?
커피7: 시공
냐옹:전기쪽 이신듯 트레이
지금 공기 1달 남았어요 가지마세요
그냥:아~시공 아~ 이제인식요 남자분이시구나
냐옹:지금 힘들고 공사 막바지라 사람들 다 빠지고 공사 힘든 구간만 남아서 일하기 빡세고 힘든 구간만 남았어요
제주도:P4로 가는데 7번게이트로 가면 금방일까요?
커피7: 6시15분 이면 5번게이트까지 10분안 도착할까?
갈매기:그래도 2번이 나으실텐데...걸어서 5번은 ..힘드실꺼예요
냐옹:5번게이트요
갈매기:달려가시면 가능하시겠죠?
여보세:평택 지금 p5 공사하나요?
동태:네
그냥:안되요 넘어요
여보세:감사용
커피7: 함밥집셔틀타면요
냐옹:자잔거 다 썩은거 3만원 주고 하나 사서 타고 다니세요 정성식당 근처 차 대놓고
그냥:제가 아시는 블이 삼성에 몇분계시는데 소장님도 계시구 
직발쪽도 계시는데 저 안들어갔어요 이뜻은알아 들으셔야 하실것요
동태:어찌되었던 2게이트기준 6시 30분전에 들어가시는게 편함니다
커피7: 네
냐옹:지금 상황이 별루 인거죠?
그냥:2게이트 좀더 일찍들어가시든데요 기공블들도요
커피7: p4는마무리고요 p5들어가야죠
냐옹:일단 소주 몇잔 더 드시고 몇일 더 쉬시다 1일부터 P5고고 하세요
그냥:지금 들어가심 젤 힘들때 들어가시는거궁P5도 시작할땐 림듭니다
저희 애인이 매봐 이구요 기능공입니다 이일 20년 했더라구요
그냥:저도 이천 이나 청주sk있었근요
유단자:용인으로 뜨고 싶다 후
냐옹:저도 청주 m15 x 멤버
그냥:전 용인 오라하는거 안가구 있슴요
냐옹:거긴 추퇴근 지옥
스티븐:P5 복합동 안감 입니다.  
유단자:입사 동기 10명인데 2주만에 7명이 그만두고
1명은 병가 내고….주말에 복귀하니 숙소가 썰렁합니다. 용인Sk 넘어가고 싶네요.
유단자:아 더 지옥이에요?
커피7: 용인 출퇴근지욕 2차선ㅜㅜ
유단자:저는 p4 안감임다 ㅋㅋ 안감 별로네여 후
냐옹:네 평택 2배라고 생각하심되요 저 한달하고 지쳐서 평택서 청주 1시간30분 출퇴근 ㅣ년 보다 더힘듬요
유단자:여염에서 5번 게이트 맨날 걸어서 출퇴근하는데 이것도 빡셈유 후
그냥:아뇨 전 편하게 했어요 경기도 굉주 가 집이였는데 회사에서 숙소 얻어 줬어요
저도 소개 였구 직발 이었는데
스티븐:P4 안감은 젊은 사람 위주인듯. 블랙조끼 유니폼은 P5 파란색 보다 나은듯
그냥:일할땐 내직장 상사가 누구였는지 그게 큰 것같고 그경험했습니다
냐옹:빙고
유단자:내일을 위해 로그아웃 ....
스티븐:저도 조출이라서 먼저 잡니다.
그냥:잘쉬시고 지금은 고덕 잘 모르겠네요 저사는데 앞집 아저씨
넘힘들어하시드라구요
토마토: 오토바이 주차도 빡쎄보이던데 그냥 아무대나 대도 괜찮은건지요
스쿠터 타고 출퇴근예정인데 아는 정보가 하나도 없네요 ㅜ
머리털 나고 평택 처음와보는 서울촌놈입니다 ㅋ
그냥:잠가놓으세요 글루 오토바이 긁거나 쉽게 차로 설명 드리면 빽밀러 각아 놓고 그냥가시는분 많으셍
토마토: 엔진만 뽀려가지 않으면 괜찮습니다 ㅎㅎ 주차는 그냥 자리빈곳 아무대나 해도 되나요
그냥:그렇게 일해본분이 계셔서 말씀 드리는거궁 음~다니 오토바이는
차 처럼 그 앞근방에 세워놓고 출퇴근가능요 그럼다른분들 보다 조금 늦게 나오셔도되궁 출퇴근 편하시게 되는거지용
토마토: 차도있는데 스쿠터로 다닐려고요 보니까 차는 답이안나올것 같더라구요 ㅋㅋ
그냥:남들 5시에 나갈걸 스쿠터는집에서 6시에 나가도 된신다는 장점요
토마토: 그렇군요 현장근처 답사갔는데 바이크가 엄청많더라구요 그래서 이거 이거 바이크도 댈곳이없겠는데 싶었네요
그냥:백날 얘기 듣느니 함 해보세요
토마토: 얘기도 못들었습니다 ㅋ
그냥:예를 들면 살치 아님소고기 새우살도 먹어 봐야 알듯이 직접 경험 하시고 아무리 일이힘들어도
같이 일하시는분들 께서 많이챙겨주심그걸 로 만족하셔야할듯요
토마토: 넵 현답이십니다 뭐 직접 부딪혀봐야 실수도하고 알아내기도 하는거겠죠 그냥 대충이나마 도움얻을수 있을까 싶어 질문드렸습니다 감사합니다
그냥: 요샌 일 해도 냉정한시대라 ㅠㅠ
토마토: 그러니까요 점점 개인주의가 심해져서 이젠 어디가서 도움도 못청하는 시대가 된거같아 씁쓸하네요
일 해보실거면 맘 잡고 일해보세요
왕초짜:안녕하세요 아무것도 모르는상태에서와서 8일째하는데요 발바닥아픈거빼곤 할만합니다
토마토: 서울에서 맘잡고 일해보려고 한달전부터 가재동에 집구하고 현장답사도 가보고 엄청 노력중입니다 이제 집정리가 좀 끝났네요 좋은말씀 감사드리고 꿀잠주무세요
그냥:8일 정도면 좀더 몇일있다 ㆍㄹ집 잡힘니다
토마토: 어떤 공정 하시는지요
토마토: 저는 안전화도 적응하려고 일안할때도 신고 다니고있습니다 ㅋㅋ
개인적으로 구매했네요 안전화
그냥:개인 안전화 인가요
토마토: 네네 k2 lt122인가? 이거 가볍고 좋네요 6인치
갈매기:한 10일 지나면 안아플낌니더
그냥:안전화 안에 하나 더 깔구신으셍ㆍ느
갓퐈:서울 어디서 오셨어요?
왕초짜:수장입니다 금토 비때문에 개인안전화신다가 여기서준거신고 그랬네요
토마토: 능동에서 왔어요
왕초짜:하루쉬니 다리아픈거도 풀린거같고 내일도 화이팅입니다
갓퐈:아~~무튼 반갑습니다 같은 서울사람
토마토: 오~ 반가워요 ㅎㅎ
그냥:다들 남성분이시죠?
토마토: 전 서교동
전 여잔데요 ㅎ
그냥:아~~
토마토: 서교동이면 연희동 그 근처라인 맞죠?
갓퐈:어맛 마자요
토마토: 동교동옆.연남동옆
어릴때 홍대랑 신촌 많이갔습니다 ㅋㅋ
갓퐈:홍대.합정.신촌
어쩜 봤을수도 ㅎ
갈매기:갑자기 소고기 토킹을 하시니
배고프다 아입니꼬 ㅋㅋㅋㅋㅋㅋ
그냥:일단 일해보세요 자신에게 믽는일이라 새
생각이들면 하는거니까요
토마토: 여기오니 서울에는 절대없는 여유? 같은게 있네요 바이크로 돌아다니다가 길을 잘못들었는데 양옆이 논 조금더가니 소키우는곳이 ㅋㅋ
갈매기:우리도 수학여행은 ㅋ쓰울로 갔었거등예!!!ㅋㅋㅋㅋㅋㅋ63빌딩에 ㅋㅋㅋㅋ
그냥:제가 말씀드리것은 메보 뜻은 아시는거죠
갓퐈:우린 경주요
그냥:ㅠㅠ
토마토: 태어난곳은 이태원1동 이에요 홍대랑 모두 가까워서 자주 갔었습니다 물론 젊었을적 ㅋㅋ
갓퐈:여기 옛날 이태원같은 곳있어요 깜놀 했어요
다이소찾다가
지금 이태원말고
토마토: 거기가 어딘가요? 추억 돋고싶은데
갓퐈:무슨 공군 비행장인가
그냥:일하스는데가 메인 배관 이지.그뜻인데요
갓퐈:다이소 앞이던데
토마토: 한번 찾아봐야겠네요 ㅎㅎ
파랑:엥?
그냥:아님 방수도 있구요
토마토: 이태원 내가 살던시절엔 진짜 정글이었는데 지금은 정말 좋아진 케이스
요나:오~ 여러분 
지평막걸리에 토닉워터 레몬즙 타서 드셔보셨나요
갓퐈:지금은 LA느낌나쥬 ㅎ
경리단길
그냥:남성분 이시네요
갓퐈:참 좋아요
요나:이게 야채튀김안주에 기가 막히네요
토마토: 그거보단 외지인들이 더많아서 ㅎㅎ
갓퐈:거기 가보세요
이전 이태원같아요
토마토: 경리단길이 이태원1동 이에요 내고향
갓퐈:오호
요나:여러분들도 행복 편안한 밤되세요~
갓퐈:감사요
그냥:저 팽성에서 3년 살다 이사 나왔읍니다
갓퐈:낼 일하시렴 주무셔야 겠네요. 저는 다시 내려가서 도돌이 해야해요ㅠㅠ
그냥:미군 가족들 ㅠ 대박 주말마다 파티하심ㅇᆢㄷ
토마토: 저 집구할때 그쪽도 알아봤는데 현장하고는 거리가 멀더라구요
갓퐈:팽성은 횡성?
그냥:팽성읍
갓퐈:아 지송
그냥:경기도
토마토: 여기 평택에 팽성 이라고 있지않나요?
갓퐈:영어 좀 하셨나?
네네 저두 byee
그냥:네 ~ 나머진 바디랭귀지
갓퐈:me to
주무세요~~Goodnight`;

const fakeChatLog = rawScript.split('\n').map(s => s.trim()).filter(s => s.length > 0);
let fakeScriptIndex = 0; 
let fakeChatInterval = null; 
let fakeChatTimeout = null; // 랜덤 타이머용 변수 추가
let inactivityTimeout = null; 
let lastFakeAuthor = '익명';

function appendFakeMessage() {
    if(fakeScriptIndex >= fakeChatLog.length) fakeScriptIndex = 0; 
    
    const line = fakeChatLog[fakeScriptIndex];
    const colonIndex = line.indexOf(':');
    let author = lastFakeAuthor;
    let msg = line;
    
    if(colonIndex > -1) {
        author = line.substring(0, colonIndex).trim();
        msg = line.substring(colonIndex + 1).trim();
        lastFakeAuthor = author;
    }
    
    if(msg.length > 0) {
        chatRef.push({ 
            author: author, 
            authorId: sessionId, 
            message: msg, 
            timestamp: firebase.database.ServerValue.TIMESTAMP 
        });
    }
    
    fakeScriptIndex++;
}

// 3~9초 랜덤 대기 시간 생성
function getRandomDelay() {
    return Math.floor(Math.random() * 7000) + 3000; // 3000ms ~ 9999ms (3~9.9초)
}

// 재귀 호출로 랜덤 간격 실행
function scheduleNextFakeMessage() {
    fakeChatTimeout = setTimeout(() => {
        appendFakeMessage();
        scheduleNextFakeMessage();
    }, getRandomDelay());
}

function startFakeChatGenerator() { 
    if(fakeChatInterval || fakeChatTimeout) return; 
    // 즉시 올리지 않고 처음부터 3~9초 랜덤 타이머만 설정
    scheduleNextFakeMessage(); 
}

function stopFakeChatGenerator() { 
    if(fakeChatInterval) { 
        clearInterval(fakeChatInterval); 
        fakeChatInterval = null; 
    } 
    if(fakeChatTimeout) { 
        clearTimeout(fakeChatTimeout); 
        fakeChatTimeout = null; 
    } 
    if(inactivityTimeout) clearTimeout(inactivityTimeout); 
    inactivityTimeout = setTimeout(() => startFakeChatGenerator(), 120000); 
} 

window.addEventListener('load', () => {
    if (window.innerWidth <= 768) {
        openChatModal();
    }
});
