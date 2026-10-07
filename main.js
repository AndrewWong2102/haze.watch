import "./style.css";
(function(){
"use strict";
var NEA_PSI="https://api-open.data.gov.sg/v2/real-time/api/psi";
var NEA_PM25="https://api-open.data.gov.sg/v2/real-time/api/pm25";
var OM_WX="https://api.open-meteo.com/v1/forecast";

var REGIONS=[
 {id:"north",name:"North"},{id:"south",name:"South"},{id:"east",name:"East"},{id:"west",name:"West"},{id:"central",name:"Central"}
];
var AREAS={north:"Woodlands, Yishun, Sembawang",south:"Marina Bay, Sentosa, Queenstown",east:"Bedok, Tampines, Pasir Ris",west:"Jurong, Clementi, Tuas",central:"Toa Payoh, Bishan, Orchard"};
var CITIES=[
 {n:"Singapore",c:"Singapore",lat:1.3521,lon:103.8198,home:1},
 {n:"Jakarta",c:"Indonesia",lat:-6.2088,lon:106.8456},
 {n:"Kuala Lumpur",c:"Malaysia",lat:3.139,lon:101.6869},
 {n:"Manila",c:"Philippines",lat:14.5995,lon:120.9842},
 {n:"Bangkok",c:"Thailand",lat:13.7563,lon:100.5018},
 {n:"Hanoi",c:"Vietnam",lat:21.0278,lon:105.8342},
 {n:"Phnom Penh",c:"Cambodia",lat:11.5564,lon:104.9282},
 {n:"Vientiane",c:"Laos",lat:17.9757,lon:102.6331},
 {n:"Naypyidaw",c:"Myanmar",lat:19.7633,lon:96.0785},
 {n:"Bandar Seri Begawan",c:"Brunei",lat:4.9031,lon:114.9398},
 {n:"Dili",c:"Timor-Leste",lat:-8.5569,lon:125.5603}
];

/* Last NEA reading retrieved when this page was built. Shown only when the live feed cannot be reached. */
var SNAP={
 psi:{timestamp:"2026-10-06T19:00:00+08:00",updated:"2026-10-06T19:30:48+08:00",r:{
  psi_twenty_four_hourly:{north:107,south:101,west:111,east:119,central:134},
  pm25_twenty_four_hourly:{north:61,south:56,west:65,east:72,central:87},
  pm10_twenty_four_hourly:{north:78,south:82,west:114,east:104,central:112},
  o3_eight_hour_max:{north:135,south:66,west:58,east:88,central:97},
  no2_one_hour_max:{north:20,south:19,west:27,east:13,central:30},
  so2_twenty_four_hourly:{north:6,south:3,west:10,east:4,central:6},
  co_eight_hour_max:{north:1,south:1,west:1,east:1,central:1},
  pm25_sub_index:{north:107,south:101,west:111,east:119,central:134},pm10_sub_index:{north:64,south:66,west:82,east:77,central:81},
  o3_sub_index:{north:72,south:28,west:25,east:37,central:41},co_sub_index:{north:11,south:9,west:9,east:9,central:9},so2_sub_index:{north:4,south:2,west:6,east:3,central:4}}},
 pm25:{timestamp:"2026-10-06T20:00:00+08:00",r:{north:50,south:53,west:71,east:85,central:84}}
};

var PSI_BANDS=[
 {max:50,k:"good",label:"Good",tip:"Normal activity is fine."},
 {max:100,k:"mod",label:"Moderate",tip:"Normal activity is fine for most people."},
 {max:200,k:"unh",label:"Unhealthy",tip:"Cut back on long or strenuous outdoor activity. Children, older adults and people with heart or lung conditions should stay indoors more."},
 {max:300,k:"vun",label:"Very unhealthy",tip:"Everyone should cut back on heavy outdoor activity. A well-fitted N95 mask helps outdoors."},
 {max:9999,k:"haz",label:"Hazardous",tip:"Stay indoors and avoid physical activity outdoors."}
];
function band(list,v){for(var i=0;i<list.length;i++)if(v<=list[i].max)return list[i];return list[list.length-1]}

var WMO={0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Rime fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",
 61:"Light rain",63:"Rain",65:"Heavy rain",80:"Light showers",81:"Showers",82:"Heavy showers",95:"Thunderstorm",96:"Thunderstorm, hail",99:"Thunderstorm, hail"};
function wmo(c){return WMO[c]||"—"}
var DIRS=["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
function dir(d){return d==null?"":DIRS[Math.round(d/22.5)%16]}

/* simple line icons drawn with currentColor */
function icon(code){
  var sun='<circle cx="16" cy="16" r="5.5" fill="var(--accent)" stroke="none"/><g stroke="var(--accent)" stroke-width="2" stroke-linecap="round"><path d="M16 4v3M16 25v3M4 16h3M25 16h3M7.5 7.5l2 2M22.5 22.5l2 2M24.5 7.5l-2 2M9.5 22.5l-2 2"/></g>';
  var cloud='<path d="M9 23h14a5 5 0 0 0 .6-9.96A7 7 0 0 0 10 12.5 5.3 5.3 0 0 0 9 23z" fill="var(--surface)" stroke="var(--muted)" stroke-width="2" stroke-linejoin="round"/>';
  var s;
  if(code===0||code===1)s=sun;
  else if(code===2)s='<g transform="translate(-4,-5) scale(.85)">'+sun+'</g><g transform="translate(3,3) scale(.85)">'+cloud+'</g>';
  else if(code>=95)s=cloud+'<path d="M16 21l-3 5h3l-1 4 4-6h-3z" fill="var(--accent)" stroke="none"/>';
  else if((code>=51&&code<=67)||(code>=80&&code<=82))s=cloud+'<g stroke="var(--ink)" stroke-width="2" stroke-linecap="round"><path d="M11 26l-1 3M16 26l-1 3M21 26l-1 3"/></g>';
  else s=cloud;
  return '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true">'+s+'</svg>';
}

var state={psi:null,pm25:null,live:false,wx:{},daily:null,sel:"central",hist:[],errors:[],more:false};
function $(id){return document.getElementById(id)}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function fmt(v,d){return v==null||isNaN(v)?"—":Number(v).toFixed(d||0)}
function hm(iso){return new Date(iso).toLocaleTimeString("en-GB",{timeZone:"Asia/Singapore",hour:"2-digit",minute:"2-digit"})}
function getJSON(u){return fetch(u,{cache:"no-store"}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()})}
function regionName(id){return REGIONS.filter(function(x){return x.id===id})[0].name}

/* ---------- map ---------- */
var ZONES={
 north:[[315,88],[375,55],[425,47],[490,70],[591,138],[591,200],[315,200]],
 central:[[315,200],[591,200],[591,338],[315,338]],
 south:[[315,338],[591,338],[591,348],[533,375],[443,397],[373,400],[315,390]],
 west:[[315,88],[238,90],[123,225],[66,340],[93,413],[315,390]],
 east:[[591,138],[718,188],[800,260],[795,307],[708,337],[591,348]]
};
var ISLET=[[401,433],[443,423],[496,430],[453,450],[408,447]];
var BOX={north:[378,70,150,100],west:[115,222,150,100],central:[378,219,150,100],east:[620,222,150,100],south:[378,478,150,100]};
function pstr(a){return a.map(function(q){return q.join(",")}).join(" ")}
function psiOf(id){var p=state.psi;return p&&p.r.psi_twenty_four_hourly?p.r.psi_twenty_four_hourly[id]:null}

function drawMap(){
  var h="";
  ["west","north","east","south","central"].forEach(function(id){
    var v=psiOf(id),b=v==null?null:band(PSI_BANDS,v);
    h+='<polygon class="zone" data-r="'+id+'" points="'+pstr(ZONES[id])+'" style="fill:'+(b?'var(--'+b.k+')':'var(--line)')+'"><title>'+regionName(id)+(v!=null?' · PSI '+v:'')+'</title></polygon>';
  });
  h+='<polygon points="'+pstr(ISLET)+'" style="fill:var(--line)" opacity=".8"/>';
  h+='<circle cx="453" cy="383" r="4" style="fill:var(--muted)"/><line x1="453" y1="387" x2="453" y2="478" stroke="var(--muted)" stroke-dasharray="2 5" stroke-width="1.5"/>';
  REGIONS.forEach(function(r){
    var v=psiOf(r.id),b=v==null?null:band(PSI_BANDS,v),q=BOX[r.id],x=q[0],y=q[1],w=q[2],hh=q[3],cx=x+w/2;
    h+='<g class="lab" data-r="'+r.id+'" tabindex="0" role="button" aria-label="'+r.name+', PSI '+fmt(v)+(b?', '+b.label:'')+'">'+
      (state.sel===r.id?'<rect class="ring" x="'+(x-7)+'" y="'+(y-7)+'" width="'+(w+14)+'" height="'+(hh+14)+'" rx="18"/>':'')+
      '<rect class="box" x="'+x+'" y="'+y+'" width="'+w+'" height="'+hh+'" rx="13" style="stroke:'+(b?'var(--'+b.k+')':'var(--line)')+'"/>'+
      '<text class="ln" x="'+cx+'" y="'+(y+26)+'">'+r.name+'</text>'+
      '<text class="lv" x="'+cx+'" y="'+(y+64)+'">'+fmt(v)+'</text>'+
      '<text class="lb" x="'+cx+'" y="'+(y+88)+'">'+(b?b.label:'')+'</text></g>';
  });
  h+='<text class="maptxt" x="435" y="26" text-anchor="middle" opacity="0">JOHOR</text><text class="maptxt" x="18" y="582">SINGAPORE STRAIT</text>';
  var svg=$("map");svg.innerHTML=h;
  svg.querySelectorAll("[data-r]").forEach(function(el){
    el.addEventListener("click",function(){select(el.getAttribute("data-r"))});
    el.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();select(el.getAttribute("data-r"))}});
  });
  $("legend").innerHTML=PSI_BANDS.map(function(b,i){
    var lo=i?PSI_BANDS[i-1].max+1:0;var rng=b.max>999?lo+"+":lo+"–"+b.max;
    return '<span><i style="background:var(--'+b.k+')"></i>'+b.label+' '+rng+'</span>'}).join("");
}

function select(id){state.sel=id;drawChips();drawMap();drawHaze();drawOutlook()}

function drawChips(){
  var el=$("chips");
  el.innerHTML=REGIONS.map(function(r){return '<button type="button" data-r="'+r.id+'" aria-pressed="'+(r.id===state.sel)+'">'+r.name+'</button>'}).join("");
  el.querySelectorAll("button").forEach(function(b){b.addEventListener("click",function(){select(b.dataset.r)})});
}

/* ---------- haze column ---------- */
var SUBS=[["PM2.5","pm25_sub_index"],["PM10","pm10_sub_index"],["O₃","o3_sub_index"],["CO","co_sub_index"],["SO₂","so2_sub_index"]];
function drawHaze(){
  var id=state.sel,p=state.psi,box=$("hazeBox"),tips=$("hazeTips");
  if(!p){box.innerHTML='<p class="empty">NEA readings are unavailable right now.</p>';tips.innerHTML="";return}
  var R=p.r,v=psiOf(id),b=v==null?null:band(PSI_BANDS,v);
  function g(k){return R[k]?R[k][id]:null}
  var main=null,mv=-1;SUBS.forEach(function(s){var x=g(s[1]);if(x!=null&&x>mv){mv=x;main=s[0]}});
  var C=2*Math.PI*46,frac=Math.min(v||0,300)/300;
  box.innerHTML=
   '<div class="haze-top"><div class="gauge"><svg viewBox="0 0 112 112" aria-hidden="true"><circle cx="56" cy="56" r="46" fill="none" stroke="var(--line)" stroke-width="10"/>'+
   '<circle cx="56" cy="56" r="46" fill="none" stroke="'+(b?'var(--'+b.k+')':'var(--line)')+'" stroke-width="10" stroke-linecap="round" stroke-dasharray="'+(C*frac).toFixed(1)+' '+C.toFixed(1)+'" transform="rotate(-90 56 56)"/></svg>'+
   '<div class="c"><b>'+fmt(v)+'</b><span>PSI</span></div></div>'+
   '<div class="t"><span class="rn">'+regionName(id)+' · '+AREAS[id]+'</span>'+(b?'<span class="bn"><i style="background:var(--'+b.k+')"></i>'+b.label+'</span>':'')+
   '<span class="mono">24-hour PSI</span></div></div>'+
   '<div class="stats">'+
   '<div><small>PM2.5, 24 h</small><b>'+fmt(g("pm25_twenty_four_hourly"))+' <small>µg/m³</small></b></div>'+
   '<div><small>PM10, 24 h</small><b>'+fmt(g("pm10_twenty_four_hourly"))+' <small>µg/m³</small></b></div>'+
   '<div><small>PM2.5, latest hour</small><b>'+fmt(state.pm25&&state.pm25.r?state.pm25.r[id]:null)+' <small>µg/m³</small></b></div>'+
   '<div><small>Main pollutant</small><b>'+(main||"—")+'</b></div></div>';
  tips.innerHTML='<b>Additional haze tips</b><ul><li>'+(b?b.tip:"")+'</li>'+
    (v>100?'<li>Keep windows closed when the reading is high and run an air purifier if you have one.</li>':'<li>Check back through the day, as readings update every hour.</li>')+'</ul>';
}

/* ---------- weather column ---------- */
function drawWeather(){
  var w=state.wx["c:Singapore"],d=state.daily,box=$("wxBox"),tips=$("wxTips");
  if(!w&&!d){box.innerHTML='<p class="empty">Weather is unavailable right now. Open the file in your browser to load it.</p>';tips.innerHTML="";tips.hidden=true;return}
  tips.hidden=false;
  var today=new Date().toLocaleDateString("en-SG",{timeZone:"Asia/Singapore",weekday:"long",day:"numeric",month:"long"});
  var code=w?w.weather_code:(d?d.weather_code[0]:0);
  var hi=d?d.temperature_2m_max[0]:null,lo=d?d.temperature_2m_min[0]:null,rp=d?d.precipitation_probability_max[0]:null;
  var h='<div class="wx-today"><div class="l"><div class="ic">'+icon(code)+'</div><div><h3>Today</h3><div class="d">'+today+' · '+wmo(code)+'</div></div></div>'+
    '<div class="wx-hl"><span class="r"><span class="up">▲</span>'+fmt(hi)+'°C</span><span class="r">▼ '+fmt(lo)+'°C</span><span class="r">'+fmt(rp)+'% rain</span></div></div>';
  if(w)h+='<div class="wx-now"><span><b>'+fmt(w.temperature_2m)+'°C</b> now, feels '+fmt(w.apparent_temperature)+'°</span><span><b>'+fmt(w.relative_humidity_2m)+'%</b> humidity</span><span><b>'+fmt(w.wind_speed_10m)+' km/h</b> '+dir(w.wind_direction_10m)+'</span></div>';
  if(d&&d.time.length>1){
    h+='<div class="days" id="days"'+(state.more?'':' hidden')+'>';
    for(var i=1;i<d.time.length;i++){
      var dn=new Date(d.time[i]+"T12:00:00+08:00").toLocaleDateString("en-SG",{timeZone:"Asia/Singapore",weekday:"long"});
      h+='<div class="day">'+icon(d.weather_code[i])+'<span>'+dn+'</span><span>▲ '+fmt(d.temperature_2m_max[i])+'° ▼ '+fmt(d.temperature_2m_min[i])+'°</span><span class="rain">'+fmt(d.precipitation_probability_max[i])+'%</span></div>';
    }
    h+='</div><button class="more" id="more" type="button" aria-expanded="'+state.more+'">'+(state.more?'Show fewer days':'Show more days')+'</button>';
  }
  box.innerHTML=h;
  var m=$("more");if(m)m.addEventListener("click",function(){state.more=!state.more;drawWeather()});
  var t=[];
  if(rp!=null&&rp>=50)t.push("There is a fair chance of rain. Carry an umbrella.");
  if(w&&w.relative_humidity_2m>=85)t.push("Humidity is high, so it will feel muggy outdoors.");
  if(w&&w.apparent_temperature>=34)t.push("It feels very hot. Drink plenty of water and rest in the shade.");
  var pv=psiOf(state.sel);if(pv!=null&&pv>100)t.push("With haze at this level, take outdoor exercise indoors.");
  if(!t.length)t.push("Conditions look comfortable for most outdoor plans.");
  tips.innerHTML='<b>Additional weather tips</b><ul>'+t.map(function(x){return '<li>'+x+'</li>'}).join("")+'</ul>';
}

/* ---------- cities ---------- */
function nationalPsi(){var o=state.psi&&state.psi.r.psi_twenty_four_hourly;if(!o)return null;return Math.max.apply(null,Object.keys(o).map(function(k){return o[k]}))}
function drawCities(){
  var h="";
  CITIES.forEach(function(c){
    var w=state.wx["c:"+c.n],haze="";
    if(c.home){
      var v=nationalPsi(),bd=v==null?null:band(PSI_BANDS,v);
      haze='<div class="aq" style="background:'+(bd?'var(--'+bd.k+'-t)':'var(--panel)')+'"><span>'+(bd?bd.label:'PSI unavailable')+'</span><b>'+fmt(v)+'<small style="font:400 11px var(--body);color:var(--muted)"> PSI, highest region</small></b></div>';
    }else{
      haze='<div class="aq" style="background:var(--panel);color:var(--muted)"><span>No haze data from data.gov.sg</span></div>';
    }
    h+='<article class="card city'+(c.home?' home':'')+'"><div class="top"><div><h3>'+esc(c.n)+'</h3><div class="cc">'+esc(c.c)+'</div></div>'+
      '<div class="t">'+(w?fmt(w.temperature_2m)+'°':'—')+'</div></div>'+
      '<div class="cond">'+(w?wmo(w.weather_code)+' · feels '+fmt(w.apparent_temperature)+'°':'Weather unavailable')+'</div>'+haze+
      '<div class="meta"><span>'+(w?fmt(w.relative_humidity_2m)+'% humidity':'')+'</span><span>'+(w?fmt(w.wind_speed_10m)+' km/h '+dir(w.wind_direction_10m):'')+'</span><span>'+(w?fmt(w.precipitation,1)+' mm rain':'')+'</span></div></article>';
  });
  $("cities").innerHTML=h;
}

/* ---------- PM2.5 history ---------- */
function drawOutlook(){
  var box=$("outlook"),id=state.sel,nm=regionName(id);
  var rows=state.hist.filter(function(h){return h.v[id]!=null});
  $("olSub").textContent=nm+" region · hourly, µg/m³ · NEA on data.gov.sg";
  if(rows.length<2){box.innerHTML='<p class="empty">The hourly PM2.5 history is unavailable right now.</p>';return}
  var VW=1000,VH=260,L=44,R=12,T=14,B=30,n=rows.length;
  var vals=rows.map(function(r){return r.v[id]});
  var mx=Math.max(60,Math.ceil(Math.max.apply(null,vals)/20)*20);
  function X(i){return L+(VW-L-R)*i/(n-1)}function Y(v){return T+(VH-T-B)*(1-v/mx)}
  var d="";vals.forEach(function(v,i){d+=(i?"L":"M")+X(i).toFixed(1)+","+Y(v).toFixed(1)});
  var area=d+"L"+X(n-1).toFixed(1)+","+Y(0)+"L"+X(0).toFixed(1)+","+Y(0)+"Z";
  var g="";
  for(var t=0;t<=mx;t+=mx/4){g+='<line x1="'+L+'" x2="'+(VW-R)+'" y1="'+Y(t)+'" y2="'+Y(t)+'" stroke="var(--line)"/><text x="'+(L-8)+'" y="'+(Y(t)+4)+'" text-anchor="end">'+t+'</text>'}
  var lab="",step=Math.max(1,Math.round(n/6));
  for(var j=0;j<n;j+=step){lab+='<text x="'+X(j)+'" y="'+(VH-8)+'" text-anchor="middle">'+new Date(rows[j].t).toLocaleString("en-SG",{timeZone:"Asia/Singapore",weekday:"short",hour:"numeric"})+'</text>'}
  var e=n-1;
  box.innerHTML='<svg class="spark" viewBox="0 0 '+VW+' '+VH+'" role="img" aria-label="Hourly PM2.5, '+nm+' region">'+g+lab+
   '<path d="'+area+'" fill="var(--accent)" opacity=".14"/><path d="'+d+'" fill="none" stroke="var(--accent)" stroke-width="2"/>'+
   '<circle cx="'+X(e)+'" cy="'+Y(vals[e])+'" r="5" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>'+
   '<text x="'+(X(e)-10)+'" y="'+(T+12)+'" text-anchor="end">Latest · '+fmt(vals[e])+' µg/m³</text></svg>';
}

/* ---------- data ---------- */
function parseNea(j){var it=j&&j.data&&j.data.items&&j.data.items[0];if(!it)throw new Error("empty");return it}
function sgDate(off){return new Date(Date.now()+8*3600e3-off*86400e3).toISOString().slice(0,10)}

function loadAll(){
  state.errors=[];var jobs=[];
  jobs.push(getJSON(NEA_PSI).then(function(j){var it=parseNea(j);state.psi={timestamp:it.timestamp,updated:it.updatedTimestamp,r:it.readings};state.live=true})
    .catch(function(){state.errors.push("NEA PSI");state.psi=SNAP.psi;state.live=false}));
  jobs.push(getJSON(NEA_PM25).then(function(j){var it=parseNea(j);state.pm25={timestamp:it.timestamp,r:it.readings.pm25_one_hourly}})
    .catch(function(){state.errors.push("NEA PM2.5");state.pm25=SNAP.pm25}));
  jobs.push(Promise.all([getJSON(NEA_PM25+"?date="+sgDate(1)),getJSON(NEA_PM25+"?date="+sgDate(0))]).then(function(res){
    var rows=[];res.forEach(function(j){((j.data&&j.data.items)||[]).forEach(function(it){rows.push({t:it.timestamp,v:it.readings.pm25_one_hourly})})});
    rows.sort(function(a,b){return new Date(a.t)-new Date(b.t)});
    var cut=Date.now()-24*3600e3;state.hist=rows.filter(function(r){return new Date(r.t).getTime()>=cut});
  }).catch(function(){state.errors.push("NEA PM2.5 history")}));

  var q="latitude="+CITIES.map(function(c){return c.lat}).join(",")+"&longitude="+CITIES.map(function(c){return c.lon}).join(",")+"&timezone=auto";
  jobs.push(getJSON(OM_WX+"?"+q+"&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m").then(function(a){
    a=[].concat(a);CITIES.forEach(function(c,i){if(a[i]&&a[i].current)state.wx["c:"+c.n]=a[i].current})}).catch(function(){state.errors.push("Open-Meteo weather")}));
  jobs.push(getJSON(OM_WX+"?latitude=1.3521&longitude=103.8198&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=4&timezone=Asia%2FSingapore").then(function(j){state.daily=j.daily}).catch(function(){state.errors.push("Open-Meteo forecast")}));
  return Promise.all(jobs);
}

function render(){
  var p=state.psi,pill=$("pill"),ok=state.live&&!state.errors.length;
  pill.className="pill "+(ok?"live":"stale");
  $("pillText").textContent=ok?"Live data":(state.live?"Partly live: "+state.errors.join(", ")+" unavailable":"Offline: showing last saved NEA reading");
  $("mapTime").textContent=p?hm(p.timestamp)+" SGT":"";
  $("mapnote").textContent=p?"Reading for "+hm(p.timestamp)+" SGT, updated "+hm(p.updated)+(state.live?"":" (saved copy)")+". Area boundaries are approximate. PSI is a 24-hour measure and NEA updates it every hour. Tap an area for details.":"";
  drawChips();drawMap();drawHaze();drawWeather();drawOutlook();drawCities();
}

function run(){
  var b=$("refresh");b.disabled=true;b.textContent="Refreshing…";
  loadAll().then(render).then(function(){b.disabled=false;b.textContent="Refresh"});
}
$("refresh").addEventListener("click",run);
state.psi=SNAP.psi;state.pm25=SNAP.pm25;render();
run();
setInterval(run,10*60*1000);
})();
