/* ABN SHOP Tangail. Requires config.js with public Supabase URL/key. */
(() => {
"use strict";
const cfg=window.ABN_CONFIG||{};
const $=id=>document.getElementById(id);
const money=n=>"৳"+Number(n||0).toLocaleString("en-BD");
let sb=null,products=[],cart=JSON.parse(localStorage.getItem("abn_cart_v2")||"[]"),user=null,admin=false;
const categories=["Fashion","Electronics","Home","Beauty","Grocery","Accessories"];
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function toast(msg){$("toast").textContent=msg;$("toast").classList.remove("hidden");setTimeout(()=>$("toast").classList.add("hidden"),2600)}
function modal(id,show=true){$(id).classList.toggle("hidden",!show)}
function saveCart(){localStorage.setItem("abn_cart_v2",JSON.stringify(cart));renderCart()}
function total(){return cart.reduce((s,i)=>s+i.qty*(products.find(p=>p.id===i.id)?.price||0),0)}
function emoji(cat){return ({Fashion:"👕",Electronics:"🎧",Home:"🏠",Beauty:"🧴",Grocery:"🛍️",Accessories:"⌚"})[cat]||"📦"}
async function init(){
 $("year").textContent=new Date().getFullYear();
 if(!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY||!window.supabase){$("productGrid").innerHTML='<p>সাইট কনফিগার করা হয়নি। README-এর ধাপ অনুসরণ করে config.js যোগ করুন।</p>';wire();return}
 sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
 wire();await loadProducts();
 const {data}=await sb.auth.getSession();if(data.session){user=data.session.user;await checkAdmin()}
}
function wire(){
 $("adminOpen").onclick=()=>{ $("storeView").classList.add("hidden");$("adminView").classList.remove("hidden");$("loginBox").classList.toggle("hidden",!!admin);$("dashboard").classList.toggle("hidden",!admin);if(admin)loadAdminOrders()};
 $("storeBack").onclick=()=>{$("adminView").classList.add("hidden");$("storeView").classList.remove("hidden")};
 $("cartOpen").onclick=()=>{renderCart();modal("cartOverlay")};
 document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>modal(b.dataset.close,false));
 $("checkoutOpen").onclick=()=>{if(!cart.length)return toast("আগে পণ্য কার্টে যোগ করুন");modal("cartOverlay",false);modal("checkoutOverlay")};
 $("search").oninput=renderProducts;$("category").onchange=renderProducts;
 $("checkoutForm").onsubmit=submitOrder;$("loginForm").onsubmit=login;$("logout").onclick=logout;
 document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{const orders=b.dataset.tab==="orders";$("adminOrders").classList.toggle("hidden",!orders);$("adminProducts").classList.toggle("hidden",orders);document.querySelectorAll("[data-tab]").forEach(x=>x.className="btn light");b.className="btn";if(orders)loadAdminOrders();else loadAdminProducts()});
 $("productForm").onsubmit=addProduct;
}
async function loadProducts(){
 const {data,error}=await sb.from("products").select("id,name,category,price,image_url,description").eq("active",true).order("created_at",{ascending:false});
 if(error){$("productGrid").innerHTML='<p>পণ্য লোড করা যায়নি। Supabase SQL ও public read policy পরীক্ষা করুন।</p>';console.error(error);return}
 products=data||[];renderProducts();renderCart();
}
function renderProducts(){
 const q=($("search")?.value||"").toLowerCase(),cat=$("category")?.value||"";
 const list=products.filter(p=>(!cat||p.category===cat)&&(`${p.name} ${p.category} ${p.description||""}`).toLowerCase().includes(q));
 $("productGrid").innerHTML=list.length?list.map(p=>`<article class="product">${p.image_url?`<img loading="lazy" src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" onerror="this.style.display='none'">`:`<div class="emoji">${emoji(p.category)}</div>`}<div class="pbody"><small>${escapeHtml(p.category)}</small><h3>${escapeHtml(p.name)}</h3><div class="muted">${escapeHtml(p.description||"")}</div><p class="price">${money(p.price)}</p><button class="btn" data-add="${p.id}">＋ কার্টে রাখুন</button></div></article>`).join(""):'<p>এই ক্যাটাগরিতে পণ্য পাওয়া যায়নি।</p>';
 document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{const id=b.dataset.add;const i=cart.find(x=>x.id===id);if(i)i.qty++;else cart.push({id,qty:1});saveCart();toast("কার্টে যোগ করা হয়েছে")});
}
function renderCart(){
 $("cartCount").textContent=cart.reduce((s,x)=>s+x.qty,0);
 if(!$("cartItems"))return;
 $("cartItems").innerHTML=cart.length?cart.map(i=>{const p=products.find(x=>x.id===i.id);return p?`<div class="cart-row"><div><b>${escapeHtml(p.name)}</b><br><small>${money(p.price)} × ${i.qty}</small></div><div class="qty"><button data-dec="${p.id}">−</button>${i.qty}<button data-inc="${p.id}">+</button><button data-remove="${p.id}" aria-label="Remove">×</button></div></div>`:""}).join(""):'<p>আপনার কার্ট খালি।</p>';
 $("cartTotal").textContent=money(total());
 document.querySelectorAll("[data-inc]").forEach(b=>b.onclick=()=>qty(b.dataset.inc,1));document.querySelectorAll("[data-dec]").forEach(b=>b.onclick=()=>qty(b.dataset.dec,-1));document.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{cart=cart.filter(i=>i.id!==b.dataset.remove);saveCart()});
}
function qty(id,n){const i=cart.find(x=>x.id===id);if(i)i.qty+=n;cart=cart.filter(x=>x.qty>0);saveCart()}
async function submitOrder(e){
 e.preventDefault();if(!cart.length)return toast("কার্ট খালি");
 const payload={customer_name:$("cName").value.trim(),customer_phone:$("cPhone").value.trim(),delivery_address:$("cAddress").value.trim(),customer_note:$("cNote").value.trim(),items:cart.map(i=>({product_id:i.id,quantity:i.qty}))};
 const btn=$("checkoutForm").querySelector("button[type=submit]");btn.disabled=true;btn.textContent="অর্ডার পাঠানো হচ্ছে…";
 try{
   const {data,error}=await sb.functions.invoke("submit-order",{body:payload});
   if(error)throw error;
   if(!data?.ok)throw new Error(data?.error||"অর্ডার গ্রহণ করা যায়নি");
   cart=[];saveCart();$("checkoutForm").reset();modal("checkoutOverlay",false);
   $("messageTitle").textContent="অর্ডার নেওয়া হয়েছে";$("messageBody").textContent=`আপনার অর্ডার নম্বর ${data.order_number}। পণ্য মূল্য ${money(data.total)}। আমরা অর্ডার নিশ্চিত করতে যোগাযোগ করব।`;modal("messageOverlay");
 }catch(err){console.error(err);toast("অর্ডার পাঠানো যায়নি। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।")}
 finally{btn.disabled=false;btn.textContent="অর্ডার নিশ্চিত করুন"}
}
async function login(e){e.preventDefault();if(!sb)return;const {data,error}=await sb.auth.signInWithPassword({email:$("adminEmail").value,password:$("adminPassword").value});if(error){toast("লগইন ব্যর্থ। ইমেইল/পাসওয়ার্ড যাচাই করুন।");return}user=data.user;await checkAdmin()}
async function checkAdmin(){
 if(!user||!sb)return;
 const {data,error}=await sb.from("admin_users").select("user_id").eq("user_id",user.id).maybeSingle();
 if(error||!data){await sb.auth.signOut();user=null;admin=false;toast("এই অ্যাকাউন্টে অ্যাডমিন অনুমতি নেই");$("loginBox").classList.remove("hidden");$("dashboard").classList.add("hidden");return}
 admin=true;$("loginBox").classList.add("hidden");$("dashboard").classList.remove("hidden");await loadAdminOrders()
}
async function logout(){await sb.auth.signOut();user=null;admin=false;$("dashboard").classList.add("hidden");$("loginBox").classList.remove("hidden");toast("লগআউট হয়েছে")}
async function loadAdminOrders(){
 if(!admin)return;const {data,error}=await sb.from("orders").select("id,order_number,customer_name,customer_phone,delivery_address,customer_note,total,status,created_at,order_items(product_name,unit_price,quantity)").order("created_at",{ascending:false}).limit(100);
 if(error){$("ordersList").textContent="অর্ডার লোড হয়নি। RLS policy পরীক্ষা করুন।";console.error(error);return}
 $("ordersList").innerHTML=(data||[]).length?data.map(o=>`<article class="order"><b>${escapeHtml(o.order_number)}</b> · ${new Date(o.created_at).toLocaleString("bn-BD")}<p><b>${escapeHtml(o.customer_name)}</b> · ${escapeHtml(o.customer_phone)}</p><p>${escapeHtml(o.delivery_address)}</p><ul>${(o.order_items||[]).map(i=>`<li>${escapeHtml(i.product_name)} × ${i.quantity} — ${money(i.unit_price*i.quantity)}</li>`).join("")}</ul><b>মোট: ${money(o.total)}</b><br><label>অবস্থা <select data-status="${o.id}">${["new","confirmed","shipped","completed","cancelled"].map(s=>`<option value="${s}" ${s===o.status?"selected":""}>${({new:"নতুন",confirmed:"নিশ্চিত",shipped:"পাঠানো হয়েছে",completed:"সম্পন্ন",cancelled:"বাতিল"})[s]}</option>`).join("")}</select></label></article>`).join(""):'<p>এখনও কোনো অর্ডার নেই।</p>';
 document.querySelectorAll("[data-status]").forEach(s=>s.onchange=async()=>{const {error}=await sb.from("orders").update({status:s.value}).eq("id",s.dataset.status);if(error)toast("স্ট্যাটাস পরিবর্তন হয়নি");else toast("অর্ডার আপডেট হয়েছে")});
}
async function loadAdminProducts(){
 if(!admin)return;const {data,error}=await sb.from("products").select("*").order("created_at",{ascending:false}).limit(200);
 if(error){$("productsAdminList").textContent="পণ্য লোড হয়নি";return}
 $("productsAdminList").innerHTML=(data||[]).map(p=>`<article class="admin-product"><b>${escapeHtml(p.name)}</b> · ${money(p.price)} · ${escapeHtml(p.category)} <button class="btn light" data-delete="${p.id}">মুছুন</button></article>`).join("");
 document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=async()=>{if(!confirm("পণ্যটি মুছবেন?"))return;const {error}=await sb.from("products").update({active:false}).eq("id",b.dataset.delete);if(error)toast("মুছতে ব্যর্থ");else{toast("পণ্য নিষ্ক্রিয় হয়েছে");await loadProducts();await loadAdminProducts()}});
}
async function addProduct(e){
 e.preventDefault();const p={name:$("pName").value.trim(),category:$("pCategory").value,price:Number($("pPrice").value),image_url:$("pImage").value.trim()||null,description:$("pDescription").value.trim(),active:true};
 const {error}=await sb.from("products").insert(p);if(error){toast("পণ্য যোগ হয়নি। অ্যাডমিন অনুমতি যাচাই করুন।");console.error(error);return}
 $("productForm").reset();toast("পণ্য যোগ হয়েছে");await loadProducts();await loadAdminProducts()
}
document.addEventListener("DOMContentLoaded",init);
})();