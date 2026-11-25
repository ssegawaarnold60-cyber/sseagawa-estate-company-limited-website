(() => {
const cfg=window.SSEG_CONFIG||{};
const configured=cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_URL.includes("PASTE_")&&!cfg.SUPABASE_ANON_KEY.includes("PASTE_");
const grid=document.getElementById("propertyGrid"), select=document.getElementById("interest");
document.getElementById("year").textContent=new Date().getFullYear();
document.getElementById("menuToggle").addEventListener("click",()=>document.getElementById("mainNav").classList.toggle("open"));
function money(v){return "UGX "+Number(v).toLocaleString("en-UG");}
function card(p){
 const loc=(p.location||"").toLowerCase();
 const fallback=loc.includes("namayumba")?"assets/namayumba-land.jpg":loc.includes("gobero")?"assets/gobero-land.jpg":"assets/wakiso-town.jpg";
 const image=(p.image_urls&&p.image_urls[0])||fallback;
 return `<article class="property-card"><div class="property-image"><img src="${image}" alt="${esc(p.title)}" loading="lazy"><span class="image-tag">${p.is_titled?"TITLED LAND":"LAND LISTING"}</span></div><div class="property-meta"><span>${esc(p.location||"Wakiso, Uganda")}</span><strong>${money(p.price_ugx)}</strong></div><h3>${esc(p.title)}</h3><p>${esc(p.description||"Contact our team for more information and a free site inspection.")}</p><ul>${p.plot_size?`<li>Plot size: ${esc(p.plot_size)}</li>`:""}${p.road_distance?`<li>Distance from main road: ${esc(p.road_distance)}</li>`:""}<li>${p.is_titled?"Advertised as titled":"Ask our team about title details"}</li></ul><a class="card-link" href="https://wa.me/256708759877?text=${encodeURIComponent("Hello, I am interested in "+p.title+" in "+p.location+". Please share more details.")}" target="_blank" rel="noopener">Enquire about this property ↗</a></article>`;
}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function load(){
 if(!configured){grid.innerHTML=`<div class="setup-card"><strong>Website setup required</strong><p>The property catalogue will appear here after the company connects its Supabase project. The sample listings are available in the setup guide.</p></div>`;return;}
 const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
 const {data,error}=await db.from("properties").select("*").eq("is_published",true).order("created_at",{ascending:false});
 if(error){grid.innerHTML='<div class="setup-card">We could not load listings right now. Please contact our team by phone or WhatsApp.</div>';return;}
 if(!data.length){grid.innerHTML='<div class="setup-card">No properties are currently published. Please check again or contact our team.</div>';return;}
 grid.innerHTML=data.map(card).join("");
 select.innerHTML='<option value="">General inquiry</option>'+data.map(p=>`<option value="${esc(p.id)}">${esc(p.title)} — ${money(p.price_ugx)}</option>`).join("");
}
document.getElementById("inquiryForm").addEventListener("submit",async e=>{
 e.preventDefault();const form=e.currentTarget,status=document.getElementById("formStatus"),fd=new FormData(form);
 const payload={customer_name:fd.get("name"),phone:fd.get("phone"),email:fd.get("email")||null,property_id:fd.get("property_id")||null,message:fd.get("message")||null,status:"new"};
 if(!configured){status.textContent="Online inquiry service is not connected yet. Please call or WhatsApp 0708 759 877.";return;}
 const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
 const {error}=await db.from("inquiries").insert(payload);
 if(error){status.textContent="We could not submit your inquiry. Please call or WhatsApp 0708 759 877.";return;}
 status.textContent="Thank you. Your inquiry has been sent successfully.";form.reset();
});
load();
})();