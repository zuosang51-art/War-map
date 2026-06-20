
/* =========================
   🌍 地图初始化
========================= */
const map = L.map('map', {
  center: [48.5, 37.8],
  zoom: 6,
  preferCanvas: true
});

/* =========================
   🛰️ 卫星底图（稳定）
========================= */
const satellite = L.tileLayer(
  'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  { maxZoom: 19 }
).addTo(map);

/* =========================
   🧭 控制层
========================= */
L.control.layers({
  "卫星": satellite
}, {}).addTo(map);

/* =========================
   ✏️ 绘制工具（确保显示）
========================= */
const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

const drawControl = new L.Control.Draw({
  position: "topright",
  draw: {
    polygon: true,
    polyline: true,
    rectangle: true,
    marker: true,
    circle: false,
    circlemarker: false
  },
  edit: {
    featureGroup: drawnItems
  }
});

map.addControl(drawControl);

/* =========================
   📐 绘制监听 + 面积
========================= */
map.on(L.Draw.Event.CREATED, function (e) {

  const layer = e.layer;
  drawnItems.addLayer(layer);

  if (e.layerType === "polygon") {

    const coords = layer.getLatLngs()[0]
      .map(p => [p.lng, p.lat]);

    const poly = turf.polygon([coords]);
    const area = turf.area(poly) / 1e6;

    layer.bindPopup("面积：" + area.toFixed(2) + " km²");
  }
});

/* =========================
   🔧 强制刷新避免UI不显示
========================= */
setTimeout(() => {
  map.invalidateSize();
}, 300);
