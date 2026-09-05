import {
  auth, db, esc, toast, fmtDate, applyContentProtection, uploadToImgbb, APP,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged,
  doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc,
  collection, getDocs, query, where, orderBy, serverTimestamp
} from "./firebase-config.js";

applyContentProtection();

// ================= الخطوة 1: حساب المشرف (بريد إداري ثابت) =================
document.getElementById("form-admin-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("admin-email-input").value.trim();
  const pass = document.getElementById("admin-pass-input").value;
  const errEl = document.getElementById("admin-email-err");
  errEl.style.display = "none";
  try{
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    if ((cred.user.email||"").toLowerCase() !== APP.adminEmail.toLowerCase()){
      await signOut(auth);
      errEl.textContent = "هذا الحساب ليس حساب المشرف المعتمد";
      errEl.style.display = "block";
      return;
    }
    goToPinStep();
  }catch(err){
    errEl.textContent = "بيانات الدخول غير صحيحة (" + (err.code || "خطأ") + ")";
    errEl.style.display = "block";
  }
});

document.getElementById("toggle-admin-signup").onclick = () => {
  document.getElementById("step-email").style.display = "none";
  document.getElementById("step-email-signup").style.display = "block";
};
document.getElementById("toggle-admin-login").onclick = () => {
  document.getElementById("step-email-signup").style.display = "none";
  document.getElementById("step-email").style.display = "block";
};

document.getElementById("form-admin-signup").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("admin-signup-email").value.trim();
  const pass = document.getElementById("admin-signup-pass").value;
  const errEl = document.getElementById("admin-signup-err");
  errEl.style.display = "none";
  if (email.toLowerCase() !== APP.adminEmail.toLowerCase()){
    errEl.style.display = "block";
    return;
  }
  try{
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await setDoc(doc(db,"users",cred.user.uid), {
      firstName: "فريق", middleName: "سَرْمَد", lastName: "الإدارة",
      email, username: "admin", phone: "",
      isAdmin: true, plan: "free", createdAt: serverTimestamp()
    });
    goToPinStep();
  }catch(err){
    errEl.textContent = "تعذّر إنشاء الحساب (" + (err.code || "خطأ") + ")";
    errEl.style.display = "block";
  }
});

function goToPinStep(){
  document.getElementById("step-email").style.display = "none";
  document.getElementById("step-email-signup").style.display = "none";
  document.getElementById("step-pin").style.display = "block";
}

// ================= الخطوة 2: رمز PIN =================
document.getElementById("form-pin").addEventListener("submit", async (e) => {
  e.preventDefault();
  const val = document.getElementById("admin-pin-input").value.trim();
  if (val !== APP.adminPin){
    document.getElementById("admin-pin-input").closest(".field").classList.add("invalid");
    return;
  }
  document.getElementById("admin-pin-input").closest(".field").classList.remove("invalid");
  sessionStorage.setItem("sarmad_admin_pin_ok","1");
  unlockAdmin();
});

function unlockAdmin(){
  document.getElementById("admin-lock").classList.remove("active");
  document.getElementById("admin-root").style.display = "block";
  initAdmin();
}

// لو الأدمن مسجّل دخول بالفعل من قبل (نفس المتصفح) وأدخل الـ PIN من قبل في نفس الجلسة، ادخل مباشرة
let alreadyChecked = false;
onAuthStateChanged(auth, (user) => {
  if (alreadyChecked) return; alreadyChecked = true;
  if (user && (user.email||"").toLowerCase() === APP.adminEmail.toLowerCase() &&
      sessionStorage.getItem("sarmad_admin_pin_ok") === "1"){
    unlockAdmin();
  }
});

// ================= سجل عمليات الإدارة (أمان/مساءلة) =================
async function logAction(action, detail){
  try{
    await addDoc(collection(db,"adminLogs"), { action, detail, at: serverTimestamp() });
  }catch(e){ /* تسجيل السجل ليس حرجًا لعمل اللوحة */ }
}

// ================= رفع الصور مباشرة عبر ImgBB =================
document.querySelectorAll(".img-upload-input").forEach(input => {
  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;
    const targetId = input.dataset.uploadTarget;
    const targetField = document.getElementById(targetId);
    const preview = document.querySelector(`.upload-preview[data-preview-for="${targetId}"]`);
    toast("جاري رفع الصورة...");
    try{
      const url = await uploadToImgbb(file);
      targetField.value = url;
      if (preview){ preview.src = url; preview.style.display = "block"; }
      toast("تم رفع الصورة بنجاح");
    }catch(err){ toast("فشل رفع الصورة"); }
  });
});

// ================= التبويبات =================
document.querySelectorAll(".admin-tabs button").forEach(b => {
  b.onclick = () => {
    document.querySelectorAll(".admin-tabs button").forEach(x => x.classList.remove("active"));
    document.querySelectorAll(".admin-panel").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    document.getElementById(b.dataset.panel).classList.add("active");
  };
});

function initAdmin(){
  loadTracks();
  loadCourses();
  loadLectures();
  loadTasks();
  loadForum();
  loadUsers();
  loadReports();
  loadStats();
  loadLog();
}

// ================= ربط الأسماء بين الجداول =================
async function nameMap(col){
  const snap = await getDocs(collection(db,col));
  const map = {};
  snap.forEach(d => map[d.id] = d.data().title);
  return map;
}

// ================= المسارات =================
async function loadTracks(){
  const snap = await getDocs(query(collection(db,"tracks"), orderBy("order","asc")));
  const list = document.getElementById("list-tracks");
  const trackSelect = document.getElementById("co-track");
  list.innerHTML = ""; trackSelect.innerHTML = "";
  snap.forEach(d => {
    const t = d.data();
    trackSelect.innerHTML += `<option value="${d.id}">${esc(t.title)}</option>`;
    list.innerHTML += `<div class="list-item glass">
      <div><div class="name">${esc(t.title)}</div><div class="sub">ترتيب ${t.order||0}</div></div>
      <button class="danger-btn" data-id="${d.id}" data-col="tracks">حذف</button>
    </div>`;
  });
  bindDeletes(list, loadTracks);
}
document.getElementById("form-track").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("tr-title").value.trim();
  await addDoc(collection(db,"tracks"), {
    title,
    description: document.getElementById("tr-desc").value.trim(),
    image: document.getElementById("tr-image").value.trim(),
    order: Number(document.getElementById("tr-order").value)||1,
    createdAt: serverTimestamp()
  });
  logAction("إضافة مسار", title);
  e.target.reset();
  toast("تمت إضافة المسار");
  loadTracks();
});

// ================= الكورسات =================
async function loadCourses(){
  const tracks = await nameMap("tracks");
  const snap = await getDocs(collection(db,"courses"));
  const list = document.getElementById("list-courses");
  const lectureSelect = document.getElementById("le-course");
  list.innerHTML = ""; lectureSelect.innerHTML = "";
  snap.forEach(d => {
    const c = d.data();
    lectureSelect.innerHTML += `<option value="${d.id}">${esc(c.title)}</option>`;
    list.innerHTML += `<div class="list-item glass">
      <div><div class="name">${esc(c.title)}</div><div class="sub">مسار: ${esc(tracks[c.trackId]||"—")} · ${c.isPaid ? "مدفوع - "+esc(c.price)+"$" : "مجاني"}</div></div>
      <button class="danger-btn" data-id="${d.id}" data-col="courses">حذف</button>
    </div>`;
  });
  bindDeletes(list, loadCourses);
}
document.getElementById("form-course").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("co-title").value.trim();
  await addDoc(collection(db,"courses"), {
    trackId: document.getElementById("co-track").value,
    title,
    description: document.getElementById("co-desc").value.trim(),
    image: document.getElementById("co-image").value.trim(),
    instructor: document.getElementById("co-instructor").value.trim(),
    startDate: document.getElementById("co-start").value.trim(),
    isPaid: document.getElementById("co-paid").checked,
    price: Number(document.getElementById("co-price").value)||0,
    createdAt: serverTimestamp()
  });
  logAction("إضافة كورس", title);
  e.target.reset();
  toast("تمت إضافة الكورس");
  loadCourses();
});

// ================= المحاضرات =================
async function loadLectures(){
  const courses = await nameMap("courses");
  const snap = await getDocs(collection(db,"lectures"));
  const list = document.getElementById("list-lectures");
  const taskSelect = document.getElementById("ta-lecture");
  list.innerHTML = ""; taskSelect.innerHTML = "";
  snap.forEach(d => {
    const l = d.data();
    taskSelect.innerHTML += `<option value="${d.id}">${esc(l.title)}</option>`;
    list.innerHTML += `<div class="list-item glass">
      <div><div class="name">${esc(l.title)}</div><div class="sub">كورس: ${esc(courses[l.courseId]||"—")} · ${l.duration||0} دقيقة</div></div>
      <button class="danger-btn" data-id="${d.id}" data-col="lectures">حذف</button>
    </div>`;
  });
  bindDeletes(list, loadLectures);
}
document.getElementById("form-lecture").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("le-title").value.trim();
  await addDoc(collection(db,"lectures"), {
    courseId: document.getElementById("le-course").value,
    title,
    description: document.getElementById("le-desc").value.trim(),
    image: document.getElementById("le-image").value.trim(),
    duration: Number(document.getElementById("le-duration").value)||0,
    order: Number(document.getElementById("le-order").value)||1,
    createdAt: serverTimestamp()
  });
  logAction("إضافة محاضرة", title);
  e.target.reset();
  toast("تمت إضافة المحاضرة");
  loadLectures();
});

// ================= المهام =================
document.getElementById("ta-type").addEventListener("change", (e) => {
  document.querySelectorAll(".task-type-fields").forEach(f => f.style.display = "none");
  document.getElementById(`ta-fields-${e.target.value}`).style.display = "block";
});

let mcqQuestions = [];
function renderMcqBuilder(){
  const wrap = document.getElementById("mcq-builder");
  wrap.innerHTML = "";
  mcqQuestions.forEach((q, qi) => {
    const box = document.createElement("div");
    box.className = "qbox";
    box.innerHTML = `
      <div class="field"><label>نص السؤال ${qi+1}</label><input type="text" class="mq-q" data-qi="${qi}" value="${esc(q.q)}"></div>
      ${q.options.map((opt,oi) => `
        <div class="field" style="display:flex; gap:8px; align-items:center;">
          <input type="radio" name="correct-${qi}" ${q.correctIndex===oi?"checked":""} class="mq-correct" data-qi="${qi}" data-oi="${oi}" style="width:auto;">
          <input type="text" class="mq-opt" data-qi="${qi}" data-oi="${oi}" value="${esc(opt)}" placeholder="خيار ${oi+1}" style="flex:1;">
        </div>`).join("")}
      <button type="button" class="danger-btn" data-remove-q="${qi}">حذف السؤال</button>
    `;
    wrap.appendChild(box);
  });
  wrap.querySelectorAll(".mq-q").forEach(el => el.oninput = () => mcqQuestions[el.dataset.qi].q = el.value);
  wrap.querySelectorAll(".mq-opt").forEach(el => el.oninput = () => mcqQuestions[el.dataset.qi].options[el.dataset.oi] = el.value);
  wrap.querySelectorAll(".mq-correct").forEach(el => el.onchange = () => mcqQuestions[el.dataset.qi].correctIndex = Number(el.dataset.oi));
  wrap.querySelectorAll("[data-remove-q]").forEach(el => el.onclick = () => {
    mcqQuestions.splice(Number(el.dataset.removeQ),1); renderMcqBuilder();
  });
}
document.getElementById("btn-add-q").addEventListener("click", () => {
  mcqQuestions.push({ q:"", options:["","",""], correctIndex:0 });
  renderMcqBuilder();
});

async function loadTasks(){
  const lectures = await nameMap("lectures");
  const snap = await getDocs(collection(db,"tasks"));
  const list = document.getElementById("list-tasks");
  const typeLabels = { json:"محتوى تفاعلي", pdf:"PDF", video:"فيديو", mcq:"اختبار", code:"مهمة برمجية" };
  list.innerHTML = "";
  snap.forEach(d => {
    const t = d.data();
    list.innerHTML += `<div class="list-item glass">
      <div><div class="name">${esc(typeLabels[t.type]||t.type)}</div><div class="sub">محاضرة: ${esc(lectures[t.lectureId]||"—")} · ترتيب ${t.order||0}</div></div>
      <button class="danger-btn" data-id="${d.id}" data-col="tasks">حذف</button>
    </div>`;
  });
  bindDeletes(list, loadTasks);
}

document.getElementById("form-task").addEventListener("submit", async (e) => {
  e.preventDefault();
  const type = document.getElementById("ta-type").value;
  const base = {
    lectureId: document.getElementById("ta-lecture").value,
    type,
    order: Number(document.getElementById("ta-order").value)||1,
    timeLimitSeconds: Number(document.getElementById("ta-time").value)||0,
    createdAt: serverTimestamp()
  };
  let extra = {};
  if (type === "json"){
    extra.contentJson = JSON.stringify({
      title: document.getElementById("tj-title").value.trim(),
      color: document.getElementById("tj-color").value.trim(),
      blocks: [
        document.getElementById("tj-text").value.trim() ? { type:"text", value: document.getElementById("tj-text").value.trim() } : null,
        document.getElementById("tj-image").value.trim() ? { type:"image", src: document.getElementById("tj-image").value.trim() } : null,
        document.getElementById("tj-link").value.trim() ? { type:"link", href: document.getElementById("tj-link").value.trim(), label:"رابط ذو صلة" } : null,
      ].filter(Boolean)
    });
  } else if (type === "pdf"){
    extra.url = document.getElementById("tp-url").value.trim();
  } else if (type === "video"){
    extra.url = document.getElementById("tv-url").value.trim();
    extra.estimatedSeconds = Number(document.getElementById("tv-est").value)||120;
  } else if (type === "mcq"){
    extra.questionsJson = JSON.stringify(mcqQuestions);
  } else if (type === "code"){
    extra.language = document.getElementById("tc-lang").value;
    extra.instructions = document.getElementById("tc-instructions").value.trim();
    extra.starterCode = document.getElementById("tc-starter").value;
  }
  await addDoc(collection(db,"tasks"), { ...base, ...extra });
  logAction("إضافة مهمة", type);
  e.target.reset();
  mcqQuestions = []; renderMcqBuilder();
  toast("تمت إضافة المهمة");
  loadTasks();
});

// ================= المنتدى (إدارة + الرد) =================
async function loadForum(){
  const snap = await getDocs(query(collection(db,"forumPosts"), orderBy("createdAt","desc")));
  const list = document.getElementById("list-forum");
  list.innerHTML = "";
  if (snap.empty){ list.innerHTML = `<p class="meta">لا توجد مشاركات</p>`; return; }
  for (const d of snap.docs){
    const p = d.data();
    const box = document.createElement("div");
    box.className = "list-item glass";
    box.style.flexDirection = "column";
    box.style.alignItems = "stretch";
    box.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; width:100%;">
        <div><div class="name">${esc(p.name||"مستخدم")}</div><div class="sub">${esc(p.text||"")}</div></div>
        <button class="danger-btn" data-id="${d.id}" data-col="forumPosts">حذف</button>
      </div>
      ${p.image ? `<img src="${esc(p.image)}" style="width:70px;height:70px;border-radius:10px;object-fit:cover;margin-top:8px;">` : ""}
      <div id="replies-${d.id}"></div>
      <div class="reply-box">
        <input type="text" placeholder="اكتب ردًا كفريق سرمد..." id="reply-input-${d.id}">
        <button class="btn btn-primary" style="padding:9px 16px;" data-reply-post="${d.id}">إرسال</button>
      </div>
    `;
    list.appendChild(box);
    renderReplies(d.id);
  }
  bindDeletes(list, loadForum);
  document.querySelectorAll("[data-reply-post]").forEach(btn => {
    btn.onclick = async () => {
      const postId = btn.dataset.replyPost;
      const input = document.getElementById(`reply-input-${postId}`);
      const text = input.value.trim();
      if (!text) return;
      await addDoc(collection(db,"forumReplies"), {
        postId, text, byAdmin: true, createdAt: serverTimestamp()
      });
      input.value = "";
      renderReplies(postId);
      toast("تم إرسال الرد");
    };
  });
}

async function renderReplies(postId){
  const wrap = document.getElementById(`replies-${postId}`);
  if (!wrap) return;
  const snap = await getDocs(query(collection(db,"forumReplies"), where("postId","==",postId), orderBy("createdAt","asc")));
  wrap.innerHTML = "";
  snap.forEach(d => {
    const r = d.data();
    wrap.innerHTML += `<div class="reply-item"><div class="who">فريق سَرْمَد</div>${esc(r.text)}</div>`;
  });
}

// ================= المستخدمون =================
async function loadUsers(){
  const wrap = document.getElementById("list-users");
  const snap = await getDocs(collection(db,"users"));
  if (snap.empty){ wrap.innerHTML = `<p class="meta">لا يوجد مستخدمون بعد</p>`; return; }
  wrap.innerHTML = "";
  snap.forEach(d => {
    const u = d.data();
    const card = document.createElement("div");
    card.className = "user-card glass";
    card.innerHTML = `
      <div class="name">${esc(u.firstName||"")} ${esc(u.middleName||"")} ${esc(u.lastName||"")} ${u.isAdmin ? `<span class="badge" style="margin-right:6px;">مشرف</span>` : ""}</div>
      <div class="row"><span>@${esc(u.username||"—")}</span><span>${esc(u.phone||"—")}</span></div>
      <div class="row"><span>${esc(u.email||"—")}</span><span>${u.plan==="free"?"مجاني":esc(u.plan||"")}</span></div>
    `;
    wrap.appendChild(card);
  });
}

// ================= بلاغات المنتدى =================
async function loadReports(){
  const wrap = document.getElementById("list-reports");
  const snap = await getDocs(query(collection(db,"forumReports"), orderBy("createdAt","desc")));
  if (snap.empty){ wrap.innerHTML = `<p class="meta">لا توجد بلاغات حاليًا</p>`; return; }
  wrap.innerHTML = "";
  for (const d of snap.docs){
    const r = d.data();
    let postText = "(تم حذف المنشور)";
    try{
      const postSnap = await getDoc(doc(db,"forumPosts",r.postId));
      if (postSnap.exists()) postText = postSnap.data().text || "";
    }catch(e){}
    const row = document.createElement("div");
    row.className = "list-item glass";
    row.innerHTML = `
      <div><div class="name">بلاغ على منشور</div><div class="sub">${esc(postText.slice(0,80))}</div></div>
      <div style="display:flex; gap:8px;">
        <button class="danger-btn" data-post-del="${r.postId}">حذف المنشور</button>
        <button class="danger-btn" data-id="${d.id}" data-col="forumReports">تجاهل</button>
      </div>`;
    wrap.appendChild(row);
  }
  bindDeletes(wrap, loadReports);
  wrap.querySelectorAll("[data-post-del]").forEach(btn => {
    btn.onclick = async () => {
      if (!confirm("حذف المنشور المُبلّغ عنه نهائيًا؟")) return;
      await deleteDoc(doc(db,"forumPosts",btn.dataset.postDel));
      logAction("حذف منشور مبلّغ عنه", btn.dataset.postDel);
      toast("تم حذف المنشور");
      loadReports(); loadForum();
    };
  });
}

// ================= الإحصائيات =================
async function loadStats(){
  const wrap = document.getElementById("stats-grid");
  const [users, tracks, courses, lectures, tasks, progress, subs, posts] = await Promise.all([
    getDocs(collection(db,"users")), getDocs(collection(db,"tracks")), getDocs(collection(db,"courses")),
    getDocs(collection(db,"lectures")), getDocs(collection(db,"tasks")), getDocs(collection(db,"progress")),
    getDocs(query(collection(db,"subscriptions"), where("status","==","active"))), getDocs(collection(db,"forumPosts"))
  ]);
  const completedCount = progress.docs.filter(d => d.data().completed).length;
  const cards = [
    ["المستخدمون", users.size], ["المسارات", tracks.size], ["الكورسات", courses.size],
    ["المحاضرات", lectures.size], ["المهام", tasks.size], ["مهام مكتملة", completedCount],
    ["اشتراكات فعّالة", subs.size], ["مشاركات المنتدى", posts.size],
  ];
  wrap.innerHTML = cards.map(([lbl,num]) => `
    <div class="stat-card glass"><div class="num">${num}</div><div class="lbl">${esc(lbl)}</div></div>`).join("");
}

// ================= سجل عمليات الإدارة =================
async function loadLog(){
  const wrap = document.getElementById("list-log");
  const snap = await getDocs(query(collection(db,"adminLogs"), orderBy("at","desc")));
  if (snap.empty){ wrap.innerHTML = `<p class="meta">لا يوجد سجل بعد</p>`; return; }
  wrap.innerHTML = "";
  let count = 0;
  snap.forEach(d => {
    if (count++ >= 50) return;
    const l = d.data();
    wrap.innerHTML += `<div class="log-item glass">
      <b>${esc(l.action)}</b> — ${esc(l.detail||"")}
      <div class="meta">${fmtDate(l.at)}</div>
    </div>`;
  });
}

// ================= أداة حذف عامة =================
function bindDeletes(container, reload){
  container.querySelectorAll(".danger-btn[data-id]").forEach(btn => {
    btn.onclick = async () => {
      if (!confirm("هل تريد حذف هذا العنصر نهائيًا؟")) return;
      await deleteDoc(doc(db, btn.dataset.col, btn.dataset.id));
      logAction("حذف", `${btn.dataset.col} / ${btn.dataset.id}`);
      toast("تم الحذف");
      reload();
    };
  });
}
