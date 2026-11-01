/* Aanmelden en opslaan met Appwrite (e-mail + wachtwoord).
   Per gebruiker wordt één document bewaard; het document-ID is het gebruikers-ID. */
(function(){
  Object.assign(TR.nl,{
    lg_in:"Inloggen", lg_up:"Account maken", lg_email:"E-mailadres", lg_pw:"Wachtwoord (minstens 8 tekens)",
    lg_forgot:"Wachtwoord vergeten?", lg_out:"Uitloggen", lg_as:"Ingelogd als", lg_acc:"Account",
    lg_reset:"Er is een e-mail verstuurd om je wachtwoord te herstellen.", lg_need:"Vul eerst je e-mailadres in.",
    lg_load:"Gegevens laden…", lg_save:"Opslaan mislukt. Controleer je internetverbinding.",
    lg_loaderr:"Laden mislukt. Controleer de instellingen van je tabel en je verbinding, en ververs daarna.",
    lg_e_cred:"E-mailadres of wachtwoord klopt niet.", lg_e_exists:"Er bestaat al een account met dit e-mailadres.",
    lg_e_weak:"Het wachtwoord is ongeldig (minstens 8 tekens).", lg_e_mail:"Dit e-mailadres is ongeldig.",
    lg_e_other:"Er ging iets mis. Probeer opnieuw.", lg_e_many:"Te veel pogingen. Probeer het later opnieuw.",
    lg_newpw:"Nieuw wachtwoord (minstens 8 tekens)", lg_setpw:"Wachtwoord opslaan", lg_done:"Wachtwoord gewijzigd. Log nu in."
  });
  Object.assign(TR.en,{
    lg_in:"Log in", lg_up:"Create account", lg_email:"Email address", lg_pw:"Password (at least 8 characters)",
    lg_forgot:"Forgot password?", lg_out:"Log out", lg_as:"Logged in as", lg_acc:"Account",
    lg_reset:"An email was sent to reset your password.", lg_need:"Enter your email address first.",
    lg_load:"Loading data…", lg_save:"Saving failed. Check your internet connection.",
    lg_loaderr:"Loading failed. Check your table settings and connection, then refresh.",
    lg_e_cred:"Email or password is incorrect.", lg_e_exists:"An account with this email already exists.",
    lg_e_weak:"The password is invalid (at least 8 characters).", lg_e_mail:"This email address is invalid.",
    lg_e_other:"Something went wrong. Try again.", lg_e_many:"Too many attempts. Try again later.",
    lg_newpw:"New password (at least 8 characters)", lg_setpw:"Save password", lg_done:"Password changed. Log in now."
  });

  const cfg = window.APPWRITE_CONFIG || {};
  const tableId = cfg.tableId || cfg.collectionId || "";
  const ok = v => v && String(v).indexOf("PLAK") === -1;
  const configured = typeof Appwrite !== "undefined" && ok(cfg.projectId) && ok(cfg.databaseId) && ok(tableId);
  if(!configured) return;   // niet ingevuld: site werkt zonder aanmelden

  const client = new Appwrite.Client().setEndpoint(cfg.endpoint).setProject(cfg.projectId);
  const account = new Appwrite.Account(client);

  /* Nieuwe Appwrite-databases heten "TablesDB" (tabellen en rijen).
     Oudere varianten (Databases, collecties en documenten) blijven als reserve werken. */
  const useTables = typeof Appwrite.TablesDB === "function";
  const tdb = useTables ? new Appwrite.TablesDB(client) : null;
  const ddb = useTables ? null : new Appwrite.Databases(client);
  function getRow(id){
    return useTables ? tdb.getRow({ databaseId: cfg.databaseId, tableId: tableId, rowId: id })
                     : ddb.getDocument(cfg.databaseId, tableId, id);
  }
  function updateRow(id, d){
    return useTables ? tdb.updateRow({ databaseId: cfg.databaseId, tableId: tableId, rowId: id, data: d })
                     : ddb.updateDocument(cfg.databaseId, tableId, id, d);
  }
  function createRow(id, d, perms){
    return useTables ? tdb.createRow({ databaseId: cfg.databaseId, tableId: tableId, rowId: id, data: d, permissions: perms })
                     : ddb.createDocument(cfg.databaseId, tableId, id, d, perms);
  }

  let user = null, loaded = false, docExists = false, lastSaved = "[]", timer = null;
  const $$ = id => document.getElementById(id);

  /* ---------- Inlogscherm ---------- */
  const overlay = document.createElement("div");
  overlay.className = "authoverlay";
  document.body.appendChild(overlay);

  function showMessage(text){
    overlay.innerHTML = "";
    const box = document.createElement("div");
    box.className = "authbox";
    const p = document.createElement("p");
    p.textContent = text;
    p.style.textAlign = "center";
    box.appendChild(p);
    overlay.appendChild(box);
    overlay.style.display = "flex";
  }

  function errText(e){
    const c = e && e.code, ty = (e && e.type) || "";
    if(c === 401 || ty.indexOf("invalid_credentials") > -1) return t("lg_e_cred");
    if(c === 409 || ty.indexOf("already_exists") > -1) return t("lg_e_exists");
    if(ty.indexOf("password") > -1) return t("lg_e_weak");
    if(ty.indexOf("email") > -1) return t("lg_e_mail");
    if(c === 429) return t("lg_e_many");
    if(c === 400) return t("lg_e_weak");
    return t("lg_e_other");
  }

  function logoImg(){
    const img = document.createElement("img");
    img.src = "logo.png"; img.alt = "Budnex"; img.className = "authlogo";
    return img;
  }

  function showLogin(note){
    overlay.innerHTML = "";
    const box = document.createElement("div");
    box.className = "authbox";
    box.appendChild(logoImg());

    const email = document.createElement("input");
    email.type = "email"; email.placeholder = t("lg_email"); email.autocomplete = "email";
    const pw = document.createElement("input");
    pw.type = "password"; pw.placeholder = t("lg_pw"); pw.autocomplete = "current-password";
    const msg = document.createElement("div");
    msg.className = "authmsg" + (note ? " ok" : "");
    msg.textContent = note || "";

    const bIn = document.createElement("button");
    bIn.textContent = t("lg_in");
    const bUp = document.createElement("button");
    bUp.className = "btn-cancel";
    bUp.textContent = t("lg_up");
    const bF = document.createElement("button");
    bF.className = "linkbtn";
    bF.textContent = t("lg_forgot");

    function fail(e){ console.error(e); msg.className = "authmsg"; msg.textContent = errText(e); }
    function signIn(){
      return account.createEmailPasswordSession({ email: email.value.trim(), password: pw.value });
    }
    bIn.onclick = () => {
      msg.textContent = "";
      signIn().then(startSession).catch(fail);
    };
    bUp.onclick = () => {
      msg.textContent = "";
      account.create({ userId: Appwrite.ID.unique(), email: email.value.trim(), password: pw.value })
        .then(signIn).then(startSession).catch(fail);
    };
    bF.onclick = () => {
      if(!email.value.trim()){ msg.className = "authmsg"; msg.textContent = t("lg_need"); return; }
      account.createRecovery({ email: email.value.trim(), url: location.origin + location.pathname })
        .then(() => { msg.className = "authmsg ok"; msg.textContent = t("lg_reset"); })
        .catch(fail);
    };
    pw.addEventListener("keydown", e => { if(e.key === "Enter") bIn.click(); });

    [email, pw, msg, bIn, bUp, bF].forEach(el => box.appendChild(el));
    overlay.appendChild(box);
    overlay.style.display = "flex";
  }

  /* Scherm om een nieuw wachtwoord te kiezen (via de link in de herstel-mail) */
  function showReset(userId, secret){
    overlay.innerHTML = "";
    const box = document.createElement("div");
    box.className = "authbox";
    box.appendChild(logoImg());
    const pw = document.createElement("input");
    pw.type = "password"; pw.placeholder = t("lg_newpw"); pw.autocomplete = "new-password";
    const msg = document.createElement("div");
    msg.className = "authmsg";
    const b = document.createElement("button");
    b.textContent = t("lg_setpw");
    b.onclick = () => {
      account.updateRecovery({ userId: userId, secret: secret, password: pw.value })
        .then(() => {
          history.replaceState(null, "", location.pathname);
          showLogin(t("lg_done"));
        })
        .catch(e => { console.error(e); msg.textContent = errText(e); });
    };
    [pw, msg, b].forEach(el => box.appendChild(el));
    overlay.appendChild(box);
    overlay.style.display = "flex";
  }

  /* ---------- Laden en opslaan ---------- */
  function startSession(){
    return account.get().then(u => { user = u; loadData(u); });
  }

  function loadData(u){
    showMessage(t("lg_load"));
    getRow(u.$id).then(doc => {
      let cats = [];
      try { cats = JSON.parse(doc.categories || "[]"); } catch(e){ cats = []; }
      docExists = true;
      finishLoad(cats);
    }).catch(e => {
      if(e && e.code === 404){ docExists = false; finishLoad([]); }
      else { console.error(e); loaded = false; showMessage(t("lg_loaderr")); }
    });
  }
  function finishLoad(cats){
    data.categories = cats;
    lastSaved = JSON.stringify(cats);
    loaded = true;
    overlay.style.display = "none";
    refreshAll();
  }

  function saveNow(){
    if(!user || !loaded) return;
    const s = JSON.stringify(data.categories);
    if(s === lastSaved) return;
    let p;
    if(docExists){
      p = updateRow(user.$id, { categories: s });
    } else {
      p = createRow(user.$id, { categories: s }, [
        Appwrite.Permission.read(Appwrite.Role.user(user.$id)),
        Appwrite.Permission.update(Appwrite.Role.user(user.$id)),
        Appwrite.Permission.delete(Appwrite.Role.user(user.$id))
      ]).then(r => { docExists = true; return r; });
    }
    p.then(() => { lastSaved = s; })
     .catch(e => { console.error(e); alert(t("lg_save")); });
  }
  function scheduleSave(){
    clearTimeout(timer);
    timer = setTimeout(saveNow, 700);
  }

  /* Bij elke vernieuwing van de pagina bewaren we wijzigingen */
  const origRefresh = refreshAll;
  refreshAll = function(){
    origRefresh();
    renderAccount();
    scheduleSave();
  };

  /* ---------- Account-blok in het instellingenmenu ---------- */
  function renderAccount(){
    const bar = $$("settingsBar");
    let box = $$("accountBox");
    if(!box){
      box = document.createElement("div");
      box.id = "accountBox";
      bar.appendChild(box);
    }
    box.innerHTML = "";
    if(!user) return;
    const l = document.createElement("div");
    l.className = "side-label"; l.textContent = t("lg_acc");
    const p = document.createElement("div");
    p.className = "hint"; p.style.margin = "0 6px 10px";
    p.textContent = t("lg_as") + " " + (user.email || "");
    const b = document.createElement("button");
    b.className = "side-item";
    b.textContent = t("lg_out");
    b.onclick = () => {
      saveNow();
      setTimeout(() => {
        account.deleteSession({ sessionId: "current" }).catch(()=>{}).then(() => {
          user = null; loaded = false; docExists = false;
          data.categories = []; lastSaved = "[]";
          showLogin();
          refreshAll();
        });
      }, 400);
    };
    box.appendChild(l); box.appendChild(p); box.appendChild(b);
  }

  /* ---------- Start ---------- */
  const qs = new URLSearchParams(location.search);
  if(qs.get("userId") && qs.get("secret")){
    showReset(qs.get("userId"), qs.get("secret"));
  } else {
    showMessage(t("lg_load"));
    account.get().then(u => { user = u; loadData(u); }).catch(() => showLogin());
  }
})();
