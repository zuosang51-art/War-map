const map = L.map('map').setView([48.5, 37.8], 6);

/* =========================
   1️⃣ 底图
========================= */
const osm = L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
);

const satellite = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
);

const terrain = L.tileLayer(
  'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
);

satellite.addTo(map);

/* =========================
   2️⃣ 图层控制（必须先创建）
========================= */
const baseMaps = {
  "🗺️ OSM": osm,
  "🛰️ 卫星": satellite,
  "⛰️ 地形": terrain
};

const overlays = {};

const layerControl = L.control.layers(baseMaps, overlays).addTo(map);

/* =========================
   3️⃣ 战线系统
========================= */
fetch("./data/frontlines.json")
.then(r=>r.json())
.then(data=>{

  data.lines.forEach(line=>{

    // 发光层
    L.polyline(line.coords,{
      color: line.color || "#ff0033",
      weight: 8,
      opacity: 0.15
    }).addTo(map);

    // 主线
    L.polyline(line.coords,{
      color: line.color || "#ff0033",
      weight: 3
    }).addTo(map);

  });

});

/* =========================
   4️⃣ 点位系统
========================= */
fetch("./data/points.json")
.then(r=>r.json())
.then(data=>{

  data.points.forEach(p=>{
    L.marker(p.coord)
      .addTo(map)
      .bindPopup(`<b>${p.name}</b><br>${p.side}`);
  });

});

/* =========================
   5️⃣ 标签系统（可编辑）
========================= */
let tags = JSON.parse(localStorage.getItem("tags") || "[]");

function icon(type){
  const c = type==="red"?"red":type==="blue"?"blue":"gray";

  return L.divIcon({
    className:"tag",
    html:`<div style="
      width:12px;height:12px;
      border-radius:50%;
      background:${c};
      box-shadow:0 0 6px ${c};
      border:1px solid #fff;"></div>`
  });
}

function renderTags(){
  tags.forEach((t,i)=>{
    const m = L.marker(t.coord,{icon:icon(t.type),draggable:true}).addTo(map);

    m.bindPopup(`
      <b>${t.name}</b><br>
      ${t.type}<br>
      <button onclick="delTag(${i})">删除</button>
    `);

    m.on("dragend",e=>{
      const p=e.target.getLatLng();
      tags[i].coord=[p.lat,p.lng];
      save();
    });
  });
}

function save(){
  localStorage.setItem("tags",JSON.stringify(tags));
}

function delTag(i){
  tags.splice(i,1);
  save();
  location.reload();
}

map.on("click",e=>{
  const name=prompt("标签名称");
  if(!name)return;

  const type=prompt("red/blue/gray","gray");

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
   6️⃣ KML / My Maps（稳定版）
========================= */
let kmlLayer;

fetch("./data/mymap.kml")
.then(r=>r.text())
.then(text=>{

  const parser = new DOMParser();
  const kml = parser.parseFromString(text,"text/xml");

  kmlLayer = new L.KML(kml);

  kmlLayer.addTo(map);

  layerControl.addOverlay(kmlLayer,"📡 My Maps");

  if(kmlLayer.getBounds?.().isValid()){
    map.fitBounds(kmlLayer.getBounds());
  }

});
