
/* =========================
   🌍 1️⃣ 初始化地图
========================= */
const map = L.map('map').setView([48.5, 37.8], 6);

/* =========================
   🗺️ 2️⃣ 底图
========================= */
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');

const satellite = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{x}/{y}'
);

const terrain = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png');

satellite.addTo(map);

/* =========================
   🧭 3️⃣ 图层控制
========================= */
const baseMaps = {
  "OSM": osm,
  "卫星": satellite,
  "地形": terrain
};

const overlays = {};

const layerControl = L.control.layers(baseMaps, overlays).addTo(map);

/* =========================
   ⚔️ 4️⃣ 战线
========================= */
fetch("./data/frontlines.json")
.then(r=>r.json())
.then(data=>{

  data.lines.forEach(line=>{

    L.polyline(line.coords,{
      color: line.color || "red",
      weight: 8,
      opacity: 0.15
    }).addTo(map);

    L.polyline(line.coords,{
      color: line.color || "red",
      weight: 3
    }).addTo(map);

  });

});

/* =========================
   📍 5️⃣ 点位
========================= */
fetch("./data/points.json")
.then(r=>r.json())
.then(data=>{

  data.points.forEach(p=>{
    L.marker(p.coord)
      .addTo(map)
      .bindPopup(p.name + "<br>" + p.side);
  });

});

/* =========================
   🏷️ 6️⃣ 标签系统
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

function save(){
  localStorage.setItem("tags",JSON.stringify(tags));
}

function renderTags(){
  tags.forEach((t,i)=>{

    const m = L.marker(t.coord,{
      icon: icon(t.type),
      draggable:true
    }).addTo(map);

    m.bindPopup(`
      <b>${t.name}</b><br>
      ${t.type}
      <br><button onclick="delTag(${i})">删除</button>
    `);

    m.on("dragend",e=>{
      const p=e.target.getLatLng();
      tags[i].coord=[p.lat,p.lng];
      save();
      updateZones();
    });

  });
}

function delTag(i){
  tags.splice(i,1);
  save();
  location.reload();
}

map.on("click",e=>{

  const name=prompt("标签名");
  if(!name)return;

  const type=prompt("red / blue","red");

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
   📡 7️⃣ KML
========================= */
omnivore.kml("./data/mymap.kml")
.on("ready",function(){

  this.addTo(map);
  layerControl.addOverlay(this,"My Maps");

  map.fitBounds(this.getBounds());

});

/* =========================
   📐 8️⃣ 控制区 + 面积系统
========================= */
let redLayer, blueLayer;

function updateZones(){

  if(redLayer) map.removeLayer(redLayer);
  if(blueLayer) map.removeLayer(blueLayer);

  let red = tags.filter(t=>t.type==="red");
  let blue = tags.filter(t=>t.type==="blue");

  if(red.length>=3){

    const fc = turf.featureCollection(
      red.map(p=>turf.point([p.coord[1],p.coord[0]]))
    );

    const hull = turf.convex(fc);

    if(hull){

      const coords = hull.geometry.coordinates[0]
        .map(c=>[c[1],c[0]]);

      redLayer = L.polygon(coords,{
        color:"red",
        fillOpacity:0.2
      }).addTo(map);

      const area = turf.area(hull)/1e6;

      redLayer.bindPopup("红方控制区<br>面积：" + area.toFixed(2)+" km²");

      layerControl.addOverlay(redLayer,"红方控制区");
    }
  }

  if(blue.length>=3){

    const fc = turf.featureCollection(
      blue.map(p=>turf.point([p.coord[1],p.coord[0]]))
    );

    const hull = turf.convex(fc);

    if(hull){

      const coords = hull.geometry.coordinates[0]
        .map(c=>[c[1],c[0]]);

      blueLayer = L.polygon(coords,{
        color:"blue",
        fillOpacity:0.2
      }).addTo(map);

      const area = turf.area(hull)/1e6;

      blueLayer.bindPopup("蓝方控制区<br>面积：" + area.toFixed(2)+" km²");

      layerControl.addOverlay(blueLayer,"蓝方控制区");
    }
  }
}

/* 初始化控制区 */
updateZones();
