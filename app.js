
/* =========================
   🌍 1️⃣ 地图初始化（修复卫星错乱关键）
========================= */
const map = L.map('map', {
  center: [48.5, 37.8],
  zoom: 6,
  zoomControl: true,
  preferCanvas: true   // ⭐ 防止渲染错位
});

/* =========================
   🛰️ 2️⃣ 底图系统（只允许一个默认）
========================= */
const satellite = L.tileLayer(
  'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {
    attribution: "Esri Satellite",
    maxZoom: 19,
    crossOrigin: true
  }
);

const osm = L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  { maxZoom: 19 }
);

const terrain = L.tileLayer(
  'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  { maxZoom: 17 }
);

/* ⭐ 默认只加载一个底图 */
satellite.addTo(map);

/* =========================
   🧭 3️⃣ 图层控制（统一管理）
========================= */
const baseMaps = {
  "🛰️ 卫星": satellite,
  "🗺️ OSM": osm,
  "⛰️ 地形": terrain
};

const overlays = {};
const layerControl = L.control.layers(baseMaps, overlays, {
  collapsed: false
}).addTo(map);

/* =========================
   ⚔️ 4️⃣ 战线系统
========================= */
fetch("./data/frontlines.json")
.then(r => r.json())
.then(data => {

  data.lines.forEach(line => {

    L.polyline(line.coords, {
      color: line.color || "red",
      weight: 8,
      opacity: 0.15
    }).addTo(map);

    L.polyline(line.coords, {
      color: line.color || "red",
      weight: 3
    }).addTo(map);

  });

});

/* =========================
   📍 5️⃣ 点位系统
========================= */
fetch("./data/points.json")
.then(r => r.json())
.then(data => {

  data.points.forEach(p => {
    L.marker(p.coord)
      .addTo(map)
      .bindPopup(`<b>${p.name}</b><br>${p.side}`);
  });

});

/* =========================
   🏷️ 6️⃣ 标签系统（本地存储）
========================= */
let tags = JSON.parse(localStorage.getItem("tags") || "[]");

function icon(type){
  const c = type === "red" ? "red" :
            type === "blue" ? "blue" : "gray";

  return L.divIcon({
    className: "tag",
    html: `<div style="
      width:12px;height:12px;
      border-radius:50%;
      background:${c};
      box-shadow:0 0 6px ${c};
      border:1px solid #fff;"></div>`
  });
}

function saveTags(){
  localStorage.setItem("tags", JSON.stringify(tags));
}

function delTag(i){
  tags.splice(i,1);
  saveTags();
  location.reload();
}

function renderTags(){

  tags.forEach((t,i)=>{

    const m = L.marker(t.coord, {
      icon: icon(t.type),
      draggable: true
    }).addTo(map);

    m.bindPopup(`
      <b>${t.name}</b><br>
      类型：${t.type}<br>
      <button onclick="delTag(${i})">删除</button>
    `);

    m.on("dragend", e=>{
      const p = e.target.getLatLng();
      tags[i].coord = [p.lat, p.lng];
      saveTags();
      updateZones();
    });

  });
}

/* 点击添加标签 */
map.on("click", e => {

  const name = prompt("标签名称");
  if(!name) return;

  const type = prompt("red / blue / gray", "red");

  tags.push({
    name,
    type,
    coord: [e.latlng.lat, e.latlng.lng]
  });

  saveTags();
  location.reload();
});

renderTags();

/* =========================
   📡 7️⃣ KML (My Maps)
========================= */
omnivore.kml("./data/mymap.kml")
.on("ready", function(){

  this.addTo(map);

  layerControl.addOverlay(this, "📡 My Maps");

  try{
    map.fitBounds(this.getBounds());
  }catch(e){}

});

/* =========================
   📐 8️⃣ 真实控制区（Concave Hull + 面积）
========================= */
function buildZone(points, color){

  if(points.length < 3) return null;

  const fc = turf.featureCollection(
    points.map(p =>
      turf.point([p.coord[1], p.coord[0]])
    )
  );

  let hull = turf.concave(fc, { maxEdge: 0.8 });

  if(!hull){
    hull = turf.convex(fc);
  }

  if(!hull) return null;

  const coords = hull.geometry.coordinates[0]
    .map(c => [c[1], c[0]]);

  const layer = L.polygon(coords, {
    color,
    fillColor: color,
    fillOpacity: 0.25,
    weight: 2
  }).addTo(map);

  const area = turf.area(hull) / 1e6;

  layer.bindPopup(`
    <b>${color === "red" ? "红方" : "蓝方"}控制区</b><br>
    面积：${area.toFixed(2)} km²
  `);

  layerControl.addOverlay(layer, color + " 控制区");

  return layer;
}

let redLayer, blueLayer;

function updateZones(){

  if(redLayer) map.removeLayer(redLayer);
  if(blueLayer) map.removeLayer(blueLayer);

  const red = tags.filter(t => t.type === "red");
  const blue = tags.filter(t => t.type === "blue");

  redLayer = buildZone(red, "red");
  blueLayer = buildZone(blue, "blue");
}

/* 初始化控制区 */
updateZones();

/* 防止地图渲染错位 */
setTimeout(() => map.invalidateSize(), 300);
