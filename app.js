
/* =========================
   🚨 防黑屏保护
========================= */
window.onerror = function(e){
  console.log("JS ERROR:", e);
};

/* =========================
   🌍 初始化地图（最稳版本）
========================= */
const map = L.map('map', {
  center: [48.5, 37.8],
  zoom: 6
});

/* =========================
   🛰️ 卫星底图（稳定源）
========================= */
const satellite = L.tileLayer(
  'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {
    maxZoom: 19
  }
).addTo(map);

/* =========================
   🧭 战线系统
========================= */
fetch('./data/frontlines.json')
.then(r=>r.json())
.then(data=>{

  data.lines.forEach(l=>{

    L.polyline(l.coords,{
      color:l.color||"red",
      weight:3
    }).addTo(map);

  });

}).catch(e=>console.log("frontlines error",e));

/* =========================
   📍 点位系统
========================= */
fetch('./data/points.json')
.then(r=>r.json())
.then(data=>{

  data.points.forEach(p=>{
    L.marker(p.coord)
      .addTo(map)
      .bindPopup(p.name+"<br>"+p.side);
  });

}).catch(e=>console.log("points error",e));

/* =========================
   🏷️ 标签系统（稳定版）
========================= */
let tags = JSON.parse(localStorage.getItem("tags") || "[]");

function save(){
  localStorage.setItem("tags", JSON.stringify(tags));
}

function renderTags(){

  tags.forEach((t)=>{

    L.circleMarker(t.coord,{
      radius:6,
      color: t.type==="red"?"red":"blue"
    }).addTo(map)
      .bindPopup(t.name);

  });
}

map.on("click", e=>{

  const name = prompt("标签名");
  if(!name) return;

  const type = prompt("red/blue","red");

  tags.push({
    name,
    type,
    coord:[e.latlng.lat,e.latlng.lng]
  });

  save();
  location.reload();
});

renderTags();

/* =========================
   📐 控制区（稳定版：凸包）
========================= */
function buildZone(points,color){

  if(points.length < 3) return null;

  const fc = turf.featureCollection(
    points.map(p=>turf.point([p.coord[1],p.coord[0]]))
  );

  const hull = turf.convex(fc);

  if(!hull) return null;

  const coords = hull.geometry.coordinates[0]
    .map(c=>[c[1],c[0]]);

  const layer = L.polygon(coords,{
    color,
    fillOpacity:0.2
  }).addTo(map);

  const area = turf.area(hull)/1e6;

  layer.bindPopup(`${color} 控制区<br>${area.toFixed(2)} km²`);

  return layer;
}

let redLayer, blueLayer;

function updateZones(){

  if(redLayer) map.removeLayer(redLayer);
  if(blueLayer) map.removeLayer(blueLayer);

  const red = tags.filter(t=>t.type==="red");
  const blue = tags.filter(t=>t.type==="blue");

  redLayer = buildZone(red,"red");
  blueLayer = buildZone(blue,"blue");
}

updateZones();

/* =========================
   🔧 强制渲染修复（防黑屏关键）
========================= */
setTimeout(()=>{
  map.invalidateSize();
},300);
