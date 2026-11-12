const $=s=>document.querySelector(s);
async function getSite(){try{const r=await fetch('/api/site');const d=await r.json();const c=d.content||{};
$('#intro').textContent=c.company_intro||'';$('#tagline').textContent=c.tagline||'Think beyond';
$('#missionHeading').textContent=c.mission_heading||'Our mission';$('#missionShort').textContent=c.mission_short||'';
$('#visionHeading').textContent=c.vision_heading||'Our vision';$('#visionShort').textContent=c.vision_short||'';
$('#supportLine').textContent=c.support_line||'';
if(c.hero_image)$('#heroImage').style.backgroundImage=`url("${c.hero_image}")`;
if(c.support_image)$('#supportImage').style.backgroundImage=`url("${c.support_image}")`;
const list=$('#productList');list.innerHTML='';
(d.items||[]).forEach(item=>{const el=document.createElement('article');el.className='product-card';
if(item.image){const img=document.createElement('img');img.src=item.image;img.alt=item.name;el.append(img)}
const body=document.createElement('div');body.className='product-card-content';
const status=document.createElement('span');status.className='status';status.textContent=item.status==='coming_soon'?'COMING SOON':item.type.toUpperCase();
const h=document.createElement('h3');h.textContent=item.name;const p=document.createElement('p');p.textContent=item.short_perception||'';
body.append(status,h,p);
const a=document.createElement('a');a.className='pill';a.textContent=item.status==='published'?(item.button_text||'Explore'):'Coming soon';a.href='/item.html?id='+item.id;body.append(a)
el.append(body);list.append(el)});
$('#year').textContent=new Date().getFullYear();
const foot=await fetch('/api/footer').then(x=>x.json());const links=$('#footerLinks');
(foot.sections||[]).forEach(s=>{const title=document.createElement('strong');title.textContent=s.title;links.append(title);(foot.items||[]).filter(i=>i.section_id===s.id).forEach(i=>{const a=document.createElement('a');a.textContent=i.name;a.href='#';a.addEventListener('click',e=>{e.preventDefault();openInfo(i.name,i.description)});links.append(a)})});
}catch(e){console.error(e)}}
function openInfo(title,body){$('#modalTitle').textContent=title;$('#modalBody').textContent=body;$('#modal').classList.add('open')}
document.querySelectorAll('[data-modal]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.modal;const key=k==='mission'?'mission':'vision';fetch('/api/site').then(r=>r.json()).then(d=>openInfo(d.content[key+'_heading'],d.content[key+'_description']))}));
$('#closeModal').addEventListener('click',()=>$('#modal').classList.remove('open'));$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')$('#modal').classList.remove('open')});
$('#menuBtn').addEventListener('click',()=>$('#nav').classList.toggle('show'));
window.addEventListener('scroll',()=>{const y=window.scrollY;$('#heroImage').style.transform=`translateY(${y*.22}px) scale(1.08)`;$('#supportImage').style.transform=`translateY(${(y-$('#support').offsetTop)*.12}px) scale(1.06)`},{passive:true});
getSite();