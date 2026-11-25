(() => {
const cfg=window.SSEG_CONFIG||{},configured=cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_URL.includes("PASTE_")&&!cfg.SUPABASE_ANON_KEY.includes("PASTE_");
const $=s=>document.querySelector(s);let db=null,staff=null,properties=[];
const loginPanel=$("#loginPanel"),dashboard=$("#dashboard"),modal=$("#propertyModal"),form=$("#propertyForm");
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function money(v){return "UGX "+Number(v).toLocaleString("en-UG");}
function notice(msg){$("#setupNotice").textContent=msg;$("#setupNotice").classList.remove("hidden");}
if(!configured){notice("Setup is not complete. Follow SETUP_GUIDE.md to create the Supabase project, run the database SQL and add your project URL and anon key to config.js.");$("#loginForm").addEventListener("submit",e=>{e.preventDefault();$("#loginStatus").textContent="Connect Supabase first. See SETUP_GUIDE.md.";});}
else{
 db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
 db.auth.onAuthStateChange((_event,session)=>{if(session)showDashboard();else showLogin();});
 db.auth.getSession().then(({data})=>{if(data.session)showDashboard();});
}
function showLogin(){loginPanel.classList.remove("hidden");dashboard.classList.add("hidden");}
async function showDashboard(){
 const {data:{user}}=await db.auth.getUser();if(!user){showLogin();return;}
 const {data:role,error}=await db.from("staff_members").select("role,active").eq("user_id",user.id).maybeSingle();
 if(error||!role||!role.active){await db.auth.signOut();$("#loginStatus").textContent="This account has not been authorised for staff access. Contact the company administrator.";showLogin();return;}
 staff=user;$("#staffEmail").textContent=`Signed in as ${user.email} • ${role.role}`;
 loginPanel.classList.add("hidden");dashboard.classList.remove("hidden");await refreshProperties();await refreshInquiries();
}
$("#loginForm").addEventListener("submit",async e=>{e.preventDefault();$("#loginStatus").textContent="Signing in…";const fd=new FormData(e.currentTarget);const {error}=await db.auth.signInWithPassword({email:fd.get("email"),password:fd.get("password")});$("#loginStatus").textContent=error?error.message:"";});
$("#logoutBtn").addEventListener("click",()=>db.auth.signOut());
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".admin-panel").forEach(x=>x.classList.add("hidden"));$("#"+b.dataset.tab).classList.remove("hidden");}));
async function refreshProperties(){
 const {data,error}=await db.from("properties").select("*").order("created_at",{ascending:false});
 if(error){$("#propertyRows").innerHTML=`<tr><td colspan="4">${esc(error.message)}</td></tr>`;return;}
 properties=data||[];$("#statAll").textContent=properties.length;$("#statPublished").textContent=properties.filter(p=>p.is_published).length;
 $("#propertyRows").innerHTML=properties.length?properties.map(p=>`<tr><td><strong>${esc(p.title)}</strong><small>${esc(p.location)} · ${esc(p.plot_size||"Size not entered")}</small></td><td>${money(p.price_ugx)}</td><td><span class="status ${p.is_published?"published":"draft"}">${p.is_published?"Published":"Hidden"}</span></td><td class="actions"><button data-edit="${p.id}">Edit</button><button data-toggle="${p.id}">${p.is_published?"Hide":"Publish"}</button><button class="danger" data-delete="${p.id}">Delete</button></td></tr>`).join(""):'<tr><td colspan="4">No properties yet. Add your first listing.</td></tr>';
 $("#propertyRows").querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>editProperty(b.dataset.edit)));
 $("#propertyRows").querySelectorAll("[data-toggle]").forEach(b=>b.addEventListener("click",()=>toggleProperty(b.dataset.toggle)));
 $("#propertyRows").querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>deleteProperty(b.dataset.delete)));
}
function openModal(p=null){
 form.reset();form.elements.id.value=p?.id||"";form.elements.title.value=p?.title||"";form.elements.location.value=p?.location||"";form.elements.price_ugx.value=p?.price_ugx||"";form.elements.plot_size.value=p?.plot_size||"50 x 100";form.elements.road_distance.value=p?.road_distance||"";form.elements.description.value=p?.description||"";form.elements.is_titled.checked=p?.is_titled??true;form.elements.is_published.checked=p?.is_published??true;
 $("#modalTitle").textContent=p?"Edit property":"Add property";$("#propertyStatus").textContent="";
 $("#existingPhotos").innerHTML=p?.image_urls?.length?`<p class="small-note">Current photos (${p.image_urls.length}). Upload additional photos below. To remove a photo, contact your system administrator for now.</p>`:"";
 modal.classList.remove("hidden");
}
$("#newPropertyBtn").addEventListener("click",()=>openModal());$("#closeModal").addEventListener("click",()=>modal.classList.add("hidden"));$("#cancelModal").addEventListener("click",()=>modal.classList.add("hidden"));
async function editProperty(id){openModal(properties.find(p=>p.id===id));}
async function saveImages(files,old=[]){
 const urls=[...old];for(const file of files){if(!file.type.startsWith("image/"))throw new Error("Only image files are allowed.");if(file.size>8*1024*1024)throw new Error("Each image must be 8 MB or smaller.");const safe=file.name.toLowerCase().replace(/[^a-z0-9._-]/g,"-");const path=`${crypto.randomUUID()}-${safe}`;const {error}=await db.storage.from("property-images").upload(path,file,{cacheControl:"3600",upsert:false});if(error)throw error;const {data}=db.storage.from("property-images").getPublicUrl(path);urls.push(data.publicUrl);}return urls;
}
form.addEventListener("submit",async e=>{
 e.preventDefault();const btn=$("#savePropertyBtn");btn.disabled=true;$("#propertyStatus").textContent="Saving…";
 try{const fd=new FormData(form),id=fd.get("id"),existing=properties.find(p=>p.id===id);const image_urls=await saveImages(form.elements.photos.files,existing?.image_urls||[]);
 const row={title:fd.get("title").trim(),location:fd.get("location").trim(),price_ugx:Number(fd.get("price_ugx")),plot_size:fd.get("plot_size").trim()||null,road_distance:fd.get("road_distance").trim()||null,description:fd.get("description").trim()||null,image_urls,is_titled:form.elements.is_titled.checked,is_published:form.elements.is_published.checked,updated_at:new Date().toISOString()};
 const result=id?await db.from("properties").update(row).eq("id",id):await db.from("properties").insert(row);
 if(result.error)throw result.error;modal.classList.add("hidden");await refreshProperties();
 }catch(err){$("#propertyStatus").textContent=err.message||"Could not save property.";}finally{btn.disabled=false;}
});
async function toggleProperty(id){const p=properties.find(x=>x.id===id);const {error}=await db.from("properties").update({is_published:!p.is_published,updated_at:new Date().toISOString()}).eq("id",id);if(error)alert(error.message);await refreshProperties();}
async function deleteProperty(id){const p=properties.find(x=>x.id===id);if(!confirm(`Permanently delete "${p.title}"? This cannot be undone.`))return;const {error}=await db.from("properties").delete().eq("id",id);if(error)alert(error.message);await refreshProperties();}
async function refreshInquiries(){
 const {data,error}=await db.from("inquiries").select("*,properties(title)").order("created_at",{ascending:false});
 if(error){$("#inquiryList").textContent=error.message;return;}
 $("#statInquiries").textContent=(data||[]).length;
 $("#inquiryList").innerHTML=data?.length?data.map(i=>`<article class="inquiry-item"><div class="inquiry-head"><strong>${esc(i.customer_name)}</strong><span class="status ${i.status==="new"?"new":"published"}">${esc(i.status)}</span></div><p>${esc(i.phone)} ${i.email?"· "+esc(i.email):""}</p><p><b>Interested in:</b> ${esc(i.properties?.title||"General inquiry")}</p><p>${esc(i.message||"No message supplied")}</p><small>${new Date(i.created_at).toLocaleString()}</small><div class="actions"><a href="https://wa.me/${esc(i.phone.replace(/\D/g,""))}" target="_blank" rel="noopener">WhatsApp customer</a><button data-done="${i.id}">Mark handled</button><button class="danger" data-remove="${i.id}">Delete</button></div></article>`).join(""):'<p>No customer inquiries have been received yet.</p>';
 $("#inquiryList").querySelectorAll("[data-done]").forEach(b=>b.addEventListener("click",async()=>{await db.from("inquiries").update({status:"handled"}).eq("id",b.dataset.done);await refreshInquiries();}));
 $("#inquiryList").querySelectorAll("[data-remove]").forEach(b=>b.addEventListener("click",async()=>{if(confirm("Delete this inquiry?")){await db.from("inquiries").delete().eq("id",b.dataset.remove);await refreshInquiries();}}));
}
$("#refreshInquiries").addEventListener("click",refreshInquiries);
})();