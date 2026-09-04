import {
  auth, db, esc, toast, fmtDate, applyContentProtection,
  onAuthStateChanged, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc,
  collection, getDocs, query, where, orderBy, serverTimestamp
} from "./firebase-config.js";

applyContentProtection();

// ================= التحقق من صلاحية الأدمن =================
onAuthStateChanged(auth, async (user) => {
  const lockMsg = document.getElementById("admin-lock-msg");
  if (!user){
    lockMsg.textContent = "يجب تسجيل الدخول أولًا من التطبيق الرئيسي.";
    return;
  }
  const snap = await getDoc(doc(db,"users",user.uid));
  if (!snap.exists() || !snap.data().isAdmin){
    lockMsg.textContent = "هذا الحساب لا يملك صلاحية الوصول للوحة التحكم.";
    return;
  }
  document.getElementById("admin-lock").classList.remove("active");
  document.getElementById("admin-root").style.display = "block";
  initAdmin();
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
  await addDoc(collection(db,"tracks"), {
    title: document.getElementById("tr-title").value.trim(),
    description: document.getElementById("tr-desc").value.trim(),
    image: document.getElementById("tr-image").value.trim(),
    order: Number(document.getElementById("tr-order").value)||1,
    createdAt: serverTimestamp()
  });
  e.target.reset();
  toast("تمت إضافة المسار");
  loadTracks();
});

// ================= الكورسات =================
async function loadCourses(){
  const snap = await getDocs(collection(db,"courses"));
  const list = document.getElementById("list-courses");
  const lectureSelect = document.getElementById("le-course");
  list.innerHTML = ""; lectureSelect.innerHTML = "";
  snap.forEach(d => {
    const c = d.data();
    lectureSelect.innerHTML += `<option value="${d.id}">${esc(c.title)}</option>`;
    list.innerHTML += `<div class="list-item glass">
      <div><div class="name">${esc(c.title)}</div><div class="sub">${c.isPaid ? "مدفوع - "+esc(c.price)+"$" : "مجاني"}</div></div>
      <button class="danger-btn" data-id="${d.id}" data-col="courses">حذف</button>
    </div>`;
  });
  bindDeletes(list, loadCourses);
}
document.getElementById("form-course").addEventListener("submit", async (e) => {
  e.preventDefault();
  await addDoc(collection(db,"courses"), {
    trackId: document.getElementById("co-track").value,
    title: document.getElementById("co-title").value.trim(),
    description: document.getElementById("co-desc").value.trim(),
    image: document.getElementById("co-image").value.trim(),
    instructor: document.getElementById("co-instructor").value.trim(),
    startDate: document.getElementById("co-start").value.trim(),
    isPaid: document.getElementById("co-paid").checked,
    price: Number(document.getElementById("co-price").value)||0,
    createdAt: serverTimestamp()
  });
  e.target.reset();
  toast("تمت إضافة الكورس");
  loadCourses();
});

// ================= المحاضرات =================
async function loadLectures(){
  const snap = await getDocs(collection(db,"lectures"));
  const list = document.getElementById("list-lectures");
  const taskSelect = document.getElementById("ta-lecture");
  list.innerHTML = ""; taskSelect.innerHTML = "";
  snap.forEach(d => {
    const l = d.data();
    taskSelect.innerHTML += `<option value="${d.id}">${esc(l.title)}</option>`;
    list.innerHTML += `<div class="list-item glass">
      <div><div class="name">${esc(l.title)}</div><div class="sub">${l.duration||0} دقيقة</div></div>
      <button class="danger-btn" data-id="${d.id}" data-col="lectures">حذف</button>
    </div>`;
  });
  bindDeletes(list, loadLectures);
}
document.getElementById("form-lecture").addEventListener("submit", async (e) => {
  e.preventDefault();
  await addDoc(collection(db,"lectures"), {
    courseId: document.getElementById("le-course").value,
    title: document.getElementById("le-title").value.trim(),
    description: document.getElementById("le-desc").value.trim(),
    image: document.getElementById("le-image").value.trim(),
    duration: Number(document.getElementById("le-duration").value)||0,
    order: Number(document.getElementById("le-order").value)||1,
    createdAt: serverTimestamp()
  });
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
  const snap = await getDocs(collection(db,"tasks"));
  const list = document.getElementById("list-tasks");
  list.innerHTML = "";
  snap.forEach(d => {
    const t = d.data();
    list.innerHTML += `<div class="list-item glass">
      <div><div class="name">${esc(t.type)}</div><div class="sub">ترتيب ${t.order||0}</div></div>
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
  e.target.reset();
  mcqQuestions = []; renderMcqBuilder();
  toast("تمت إضافة المهمة");
  loadTasks();
});

// ================= المنتدى (إدارة) =================
async function loadForum(){
  const snap = await getDocs(query(collection(db,"forumPosts"), orderBy("createdAt","desc")));
  const list = document.getElementById("list-forum");
  list.innerHTML = "";
  if (snap.empty){ list.innerHTML = `<p class="meta">لا توجد مشاركات</p>`; return; }
  snap.forEach(d => {
    const p = d.data();
    list.innerHTML += `<div class="list-item glass" style="align-items:flex-start;">
      <div><div class="name">${esc(p.name||"مستخدم")}</div><div class="sub">${esc((p.text||"").slice(0,60))}</div></div>
      <button class="danger-btn" data-id="${d.id}" data-col="forumPosts">حذف</button>
    </div>`;
  });
  bindDeletes(list, loadForum);
}

// ================= أداة حذف عامة =================
function bindDeletes(container, reload){
  container.querySelectorAll(".danger-btn[data-id]").forEach(btn => {
    btn.onclick = async () => {
      if (!confirm("هل تريد حذف هذا العنصر نهائيًا؟")) return;
      await deleteDoc(doc(db, btn.dataset.col, btn.dataset.id));
      toast("تم الحذف");
      reload();
    };
  });
}
