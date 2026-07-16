/* ====== 足迹地图 —— 地图交互 ====== */

// ====== 城市点击处理 ======

function handleCityClick(city) {
  // 清除之前的高亮
  clearHighlight();
  hideColorPicker();

  selectedCity = city;
  const cityCode = String(city.cityCode);

  // 查找该城市在地图上的标记
  let targetMarker = null;
  cityMarkersGroup.eachLayer(layer => {
    if (layer.cityData && String(layer.cityData.cityCode) === cityCode) {
      targetMarker = layer;
    }
  });

  // 高亮标记
  if (targetMarker) {
    highlightedMarker = targetMarker;
    const el = targetMarker.getElement();
    if (el) {
      el.classList.add('marker-highlighted');
    }
  }

  // 飞行到城市位置
  const lat = city.lat || city.latitude;
  const lng = city.lng || city.longitude;
  map.flyTo([lat, lng], Math.max(map.getZoom(), 8), { duration: 0.8 });

  // 检查是否已打卡
  const record = getRecordByCity(cityCode);

  if (record) {
    // 已打卡：显示游记查看
    showCityPopup(city, record, targetMarker);
    openRightPanelForView(record);
  } else {
    // 未打卡：显示「+」气泡和选色面板
    showCheckinPopup(city, targetMarker);
    showColorPicker(city);
  }
}

// ====== 打卡气泡弹窗 ======

function showCheckinPopup(city, marker) {
  if (!marker) return;

  const lat = city.lat || city.latitude;
  const lng = city.lng || city.longitude;

  const popupContent = document.createElement('div');
  popupContent.className = 'city-bubble';
  popupContent.innerHTML = `
    <span class="city-bubble__name">${city.cityName || city.name}</span>
    <button class="city-bubble__btn" id="btn-add-checkin" title="打卡">+</button>
  `;

  currentPopup = L.popup({
    className: 'custom-popup',
    closeButton: false,
    autoClose: false,
    closeOnClick: false,
    offset: [0, -20]
  })
    .setLatLng([lat, lng])
    .setContent(popupContent)
    .openOn(map);

  // 绑定「+」按钮事件
  setTimeout(() => {
    const btn = document.getElementById('btn-add-checkin');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        // 打开游记编辑面板（新增模式）
        editingRecord = null;
        openRightPanelForEdit(city);
      });
    }
  }, 100);
}

// 已打卡城市气泡
function showCityPopup(city, record, marker) {
  if (!marker) return;

  const lat = city.lat || city.latitude;
  const lng = city.lng || city.longitude;

  const popupContent = document.createElement('div');
  popupContent.className = 'city-bubble';
  popupContent.innerHTML = `
    <span class="city-bubble__name">${city.cityName || city.name}</span>
    <span class="city-bubble__checked-mark">📍</span>
  `;

  currentPopup = L.popup({
    className: 'custom-popup',
    closeButton: false,
    autoClose: false,
    closeOnClick: false,
    offset: [0, -20]
  })
    .setLatLng([lat, lng])
    .setContent(popupContent)
    .openOn(map);
}

// ====== 底部选色面板 ======

function showColorPicker(city) {
  const bar = document.getElementById('color-picker-bar');
  const cityNameEl = document.getElementById('color-picker-city-name');
  const colorsContainer = document.getElementById('color-options');

  // 显示城市名
  cityNameEl.textContent = '当前城市：' + (city.cityName || city.name);

  // 生成色块
  colorsContainer.innerHTML = '';
  MACARON_COLORS.forEach(color => {
    const colorEl = document.createElement('div');
    colorEl.className = 'color-picker__color';
    colorEl.style.backgroundColor = color.value;
    colorEl.title = color.name;
    colorEl.addEventListener('click', () => {
      onColorSelected(city, color.value);
    });
    colorsContainer.appendChild(colorEl);
  });

  // 显示面板
  bar.classList.add('color-picker-bar--visible');
}

function hideColorPicker() {
  const bar = document.getElementById('color-picker-bar');
  bar.classList.remove('color-picker-bar--visible');
}

// 选择颜色后的处理
async function onColorSelected(city, colorValue) {
  const cityCode = String(city.cityCode);
  const provinceCode = String(city.provinceCode || '');
  const provinceName = city.provinceName || '';
  const cityName = city.cityName || city.name;
  const lat = city.lat || city.latitude;
  const lng = city.lng || city.longitude;

  // 检查是否已有记录
  let record = getRecordByCity(cityCode);
  if (record) {
    // 已有记录：仅更新颜色，保留游记内容和打卡日期
    record.color = colorValue;
  } else {
    // 新记录：创建打卡记录（游记为空，后续可在编辑面板填写）
    record = {
      cityName: cityName,
      cityCode: cityCode,
      provinceName: provinceName,
      provinceCode: provinceCode,
      color: colorValue,
      lat: lat,
      lng: lng,
      checkinDate: new Date().toISOString().split('T')[0],
      note: {
        text: '',
        images: []
      }
    };
  }

  await addOrUpdateRecord(record);

  // 更新地图
  hideColorPicker();

  // 关闭打卡气泡，显示已打卡气泡
  if (currentPopup && map.hasLayer(currentPopup)) {
    map.closePopup(currentPopup);
    currentPopup = null;
  }

  // 刷新地图填色和标记
  applyCheckedRecords();

  // 如果编辑面板未打开，自动打开（保持原体验：选色后可编辑游记）
  // 如果面板已打开，不重复打开（避免覆盖用户正在编辑的内容）
  if (!panelRightOpen) {
    editingRecord = null;
    selectedCity = city;
    openRightPanelForEdit(city);
  }

  // 更新高亮和气泡
  setTimeout(() => {
    cityMarkersGroup.eachLayer(layer => {
      if (layer.cityData && String(layer.cityData.cityCode) === cityCode) {
        highlightedMarker = layer;
        const el = layer.getElement();
        if (el) {
          el.classList.add('marker-highlighted');
        }
        const rec = getRecordByCity(cityCode);
        if (rec) {
          showCityPopup(city, rec, layer);
        }
      }
    });
  }, 300);
}
