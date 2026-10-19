/* =========================================================
   Beyond the Clock — Live Orrery
   实时太阳系 / 中国传统星盘 / 西方占星盘 / 现代天体力学
   ========================================================= */
(function () {
  'use strict';

  var DEG = Math.PI / 180;
  var TAU = Math.PI * 2;
  var AU_KM = 149597870.7;

  /* ---------- 轨道根数 (JPL approximate elements, 1800–2050) ----------
     a, e, I, L, varpi, Omega, then rates per Julian century        */
  var EL = {
    mercury: [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593,
              0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
    venus:   [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255,
              0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418],
    earth:   [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0,
              0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0],
    mars:    [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891,
              0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
    jupiter: [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909,
              -0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
    saturn:  [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448,
              -0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794],
    uranus:  [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503,
              -0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589],
    neptune: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574,
              0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664]
  };

  var PLANETS = [
    { key: 'mercury', cn: '水星', west: 'Mercury', glyph: '☿', color: '#9fb0bf', size: 2.4, el: EL.mercury, cnName: '辰星', element: '水' },
    { key: 'venus',   cn: '金星', west: 'Venus',   glyph: '♀', color: '#e3c489', size: 2.9, el: EL.venus,   cnName: '太白', element: '金' },
    { key: 'mars',    cn: '火星', west: 'Mars',    glyph: '♂', color: '#d98b6a', size: 2.6, el: EL.mars,    cnName: '荧惑', element: '火' },
    { key: 'jupiter', cn: '木星', west: 'Jupiter', glyph: '♃', color: '#d9b483', size: 3.4, el: EL.jupiter, cnName: '岁星', element: '木' },
    { key: 'saturn',  cn: '土星', west: 'Saturn',  glyph: '♄', color: '#e0cf9a', size: 3.1, el: EL.saturn,  cnName: '镇星', element: '土' },
    { key: 'uranus',  cn: '天王星', west: 'Uranus', glyph: '♅', color: '#8fd3d8', size: 2.7, el: EL.uranus, cnName: '天王', element: '水' },
    { key: 'neptune', cn: '海王星', west: 'Neptune', glyph: '♆', color: '#7f9fe0', size: 2.7, el: EL.neptune, cnName: '海王', element: '水' }
  ];

  var ORRERY_BODIES = PLANETS.slice(0, 2).concat([{
    key: 'earth', cn: '地球', west: 'Earth', glyph: '♁', color: '#7fb7e0', size: 3.0,
    cnName: '地', element: '土', el: EL.earth
  }]).concat(PLANETS.slice(2));

  var ZODIAC = [
    { cn: '白羊', en: 'Aries', glyph: '♈\uFE0E' },
    { cn: '金牛', en: 'Taurus', glyph: '♉\uFE0E' },
    { cn: '双子', en: 'Gemini', glyph: '♊\uFE0E' },
    { cn: '巨蟹', en: 'Cancer', glyph: '♋\uFE0E' },
    { cn: '狮子', en: 'Leo', glyph: '♌\uFE0E' },
    { cn: '处女', en: 'Virgo', glyph: '♍\uFE0E' },
    { cn: '天秤', en: 'Libra', glyph: '♎\uFE0E' },
    { cn: '天蝎', en: 'Scorpio', glyph: '♏\uFE0E' },
    { cn: '射手', en: 'Sagittarius', glyph: '♐\uFE0E' },
    { cn: '摩羯', en: 'Capricorn', glyph: '♑\uFE0E' },
    { cn: '水瓶', en: 'Aquarius', glyph: '♒\uFE0E' },
    { cn: '双鱼', en: 'Pisces', glyph: '♓\uFE0E' }
  ];

  /* 二十八宿：传统距度（古度），按 365.25 折算为黄道 360° */
  var XIU = [
    { name: '角', width: 12,    group: '青龙' }, { name: '亢', width: 9,     group: '青龙' },
    { name: '氐', width: 15,    group: '青龙' }, { name: '房', width: 5,     group: '青龙' },
    { name: '心', width: 5,     group: '青龙' }, { name: '尾', width: 18,    group: '青龙' },
    { name: '箕', width: 11,    group: '青龙' },
    { name: '斗', width: 26.25, group: '玄武' }, { name: '牛', width: 8,     group: '玄武' },
    { name: '女', width: 12,    group: '玄武' }, { name: '虚', width: 10,    group: '玄武' },
    { name: '危', width: 17,    group: '玄武' }, { name: '室', width: 16,    group: '玄武' },
    { name: '壁', width: 9,     group: '玄武' },
    { name: '奎', width: 16,    group: '白虎' }, { name: '娄', width: 12,    group: '白虎' },
    { name: '胃', width: 14,    group: '白虎' }, { name: '昴', width: 11,    group: '白虎' },
    { name: '毕', width: 16,    group: '白虎' }, { name: '觜', width: 2,     group: '白虎' },
    { name: '参', width: 9,     group: '白虎' },
    { name: '井', width: 33,    group: '朱雀' }, { name: '鬼', width: 4,     group: '朱雀' },
    { name: '柳', width: 15,    group: '朱雀' }, { name: '星', width: 7,     group: '朱雀' },
    { name: '张', width: 18,    group: '朱雀' }, { name: '翼', width: 18,    group: '朱雀' },
    { name: '轸', width: 17,    group: '朱雀' }
  ];

  var GROUP_COLOR = { 青龙: '#6fbfa0', 玄武: '#6f8fbf', 白虎: '#c9a96a', 朱雀: '#d97b6c' };

  /* 二十四节气：太阳黄经 */
  var TERMS = [
    ['春分', 0], ['清明', 15], ['谷雨', 30], ['立夏', 45], ['小满', 60], ['芒种', 75],
    ['夏至', 90], ['小暑', 105], ['大暑', 120], ['立秋', 135], ['处暑', 150], ['白露', 165],
    ['秋分', 180], ['寒露', 195], ['霜降', 210], ['立冬', 225], ['小雪', 240], ['大雪', 255],
    ['冬至', 270], ['小寒', 285], ['大寒', 300], ['立春', 315], ['雨水', 330], ['惊蛰', 345]
  ];

  var WEEK = ['日', '一', '二', '三', '四', '五', '六'];

  /* ---------------- 天文计算 ---------------- */

  function norm360(x) { x = x % 360; return x < 0 ? x + 360 : x; }
  function norm180(x) { x = norm360(x); return x > 180 ? x - 360 : x; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function julian(date) { return date.getTime() / 86400000 + 2440587.5; }
  function century(date) { return (julian(date) - 2451545.0) / 36525; }

  function helio(el, date) {
    var T = century(date);
    var a = el[0] + el[6] * T;
    var e = el[1] + el[7] * T;
    var I = (el[2] + el[8] * T) * DEG;
    var L = el[3] + el[9] * T;
    var wbar = el[4] + el[10] * T;
    var Om = (el[5] + el[11] * T) * DEG;

    var M = norm360(L - wbar) * DEG;
    var E = M;
    for (var i = 0; i < 12; i++) {
      var dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= dE;
      if (Math.abs(dE) < 1e-12) break;
    }

    var xv = a * (Math.cos(E) - e);
    var yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
    var w = (el[4] + el[10] * T) * DEG - Om;
    var cw = Math.cos(w), sw = Math.sin(w);
    var cO = Math.cos(Om), sO = Math.sin(Om);
    var ci = Math.cos(I), si = Math.sin(I);

    return {
      x: (cw * cO - sw * sO * ci) * xv + (-sw * cO - cw * sO * ci) * yv,
      y: (cw * sO + sw * cO * ci) * xv + (-sw * sO + cw * cO * ci) * yv,
      z: (sw * si) * xv + (cw * si) * yv,
      a: a, e: e
    };
  }

  function geoOf(el, earth, date) {
    var p = helio(el, date);
    var dx = p.x - earth.x, dy = p.y - earth.y, dz = p.z - earth.z;
    return {
      lon: norm360(Math.atan2(dy, dx) / DEG),
      lat: Math.atan2(dz, Math.hypot(dx, dy)) / DEG,
      dist: Math.sqrt(dx * dx + dy * dy + dz * dz)
    };
  }

  function geoOfApparent(el, earth, date) {
    var g = geoOf(el, earth, date);
    for (var i = 0; i < 2; i++) {
      var dt = g.dist * 499.004784 / 86400;
      var pDate = new Date(date.getTime() - dt * 86400000);
      var p = helio(el, pDate);
      var dx = p.x - earth.x, dy = p.y - earth.y, dz = p.z - earth.z;
      g = {
        lon: norm360(Math.atan2(dy, dx) / DEG),
        lat: Math.atan2(dz, Math.hypot(dx, dy)) / DEG,
        dist: Math.sqrt(dx * dx + dy * dy + dz * dz)
      };
    }
    return g;
  }

  function apparentLon(lon, lat, sunLon, T) {
    var Ls = (280.4665 + 36000.7698 * T) * DEG;
    var Lm = (218.3165 + 481267.8813 * T) * DEG;
    var Om = (125.04452 - 1934.136261 * T) * DEG;
    var dPsi = (-17.20 * Math.sin(Om) - 1.32 * Math.sin(2 * Ls) - 0.23 * Math.sin(2 * Lm) + 0.21 * Math.sin(2 * Om)) / 3600;
    var aberr = -(20.4955 / 3600) * Math.cos((lon - sunLon) * DEG) / Math.max(0.1, Math.cos(lat * DEG));
    return norm360(lon + dPsi + aberr);
  }

  function sunGeo(earth) {
    return {
      lon: norm360(Math.atan2(-earth.y, -earth.x) / DEG),
      lat: 0,
      dist: Math.hypot(earth.x, earth.y)
    };
  }

  function moonGeo(date) {
    var d = julian(date) - 2451545.0;
    var Lp = 218.316 + 13.176396 * d;
    var D = 297.8502 + 12.190749 * d;
    var M = 357.5291 + 0.98560028 * d;
    var Mp = 134.9634 + 13.064993 * d;
    var F = 93.2721 + 13.229350 * d;
    var sin = function (x) { return Math.sin(x * DEG); };
    var cos = function (x) { return Math.cos(x * DEG); };
    var lon = Lp
      + 6.289 * sin(Mp) + 1.274 * sin(2 * D - Mp) + 0.658 * sin(2 * D)
      + 0.214 * sin(2 * Mp) - 0.186 * sin(M) - 0.114 * sin(2 * F)
      + 0.059 * sin(2 * D - 2 * Mp) + 0.057 * sin(2 * D - M - Mp)
      + 0.053 * sin(2 * D + Mp) + 0.046 * sin(2 * D - M)
      + 0.041 * sin(Mp - M) - 0.035 * sin(D) - 0.031 * sin(Mp + M)
      - 0.015 * sin(2 * F - 2 * D) + 0.011 * sin(Mp - 4 * D);
    var lat = 5.128 * sin(F)
      + 0.280 * sin(Mp + F) + 0.277 * sin(Mp - F) + 0.173 * sin(2 * D - F)
      + 0.055 * sin(2 * D + F - Mp) + 0.046 * sin(2 * D - F - Mp)
      + 0.033 * sin(2 * D + F) + 0.017 * sin(2 * Mp + F);
    var distKm = 385000.56
      - 20905.355 * cos(Mp) - 3699.111 * cos(2 * D - Mp) - 2955.968 * cos(2 * D)
      - 569.925 * cos(2 * Mp) + 48.888 * cos(M) - 3.149 * cos(2 * F)
      + 246.158 * cos(2 * D - 2 * Mp) - 152.138 * cos(2 * D - M - Mp)
      - 170.733 * cos(2 * D + Mp) - 204.586 * cos(2 * D - M)
      - 129.620 * cos(Mp - M) + 108.743 * cos(D) + 104.755 * cos(Mp + M)
      + 10.321 * cos(2 * F - 2 * D) + 79.661 * cos(Mp - 2 * D);
    return { lon: norm360(lon), lat: lat, dist: distKm / AU_KM, distKm: distKm };
  }

  function mansionAt(lon, date) {
    var years = (julian(date) - 2451545.0) / 365.25;
    var origin = 204.10 + 0.01397 * years; /* 角宿距星 Spica 的黄经 */
    var scale = 360 / 365.25;
    var d = norm360(lon - origin);
    var acc = 0;
    for (var i = 0; i < XIU.length; i++) {
      var w = XIU[i].width * scale;
      if (d < acc + w) {
        return { name: XIU[i].name, group: XIU[i].group, index: i, start: norm360(origin + acc), width: w };
      }
      acc += w;
    }
    return { name: XIU[0].name, group: XIU[0].group, index: 0, start: norm360(origin), width: XIU[0].width * scale };
  }

  function termAt(sunLon) {
    var lon = norm360(sunLon);
    var chosen = TERMS[TERMS.length - 1];
    for (var i = 0; i < TERMS.length; i++) {
      if (TERMS[i][1] <= lon) chosen = TERMS[i];
    }
    return chosen;
  }

  function zodiacName(i) { return state.lang === 'en' ? ZODIAC[i].en : ZODIAC[i].cn; }

  function signInfo(lon) {
    lon = norm360(lon);
    var i = Math.floor(lon / 30);
    var within = lon - i * 30;
    var d = Math.floor(within);
    var m = Math.floor((within - d) * 60);
    return { i: i, d: d, m: m, text: zodiacName(i) + ' ' + d + '°' + pad2(m) + '′' };
  }

  function shortSign(lon) {
    var s = signInfo(lon);
    return (state.lang === 'en' ? ZODIAC[s.i].en.slice(0, 3) : ZODIAC[s.i].cn) + ' ' + s.d + '°';
  }

  function formatDist(dist) {
    return dist < 0.01 ? dist.toFixed(5) : dist.toFixed(3);
  }

  function lightTime(dist) {
    var s = dist * 499.004784;
    if (s < 60) return s.toFixed(1) + ' ' + L('sec');
    if (s < 3600) return (s / 60).toFixed(1) + ' ' + L('min');
    return (s / 3600).toFixed(1) + ' ' + L('hour');
  }

  function moonPhase(sunLon, moonLon) {
    var e = norm360(moonLon - sunLon);
    var names = state.lang === 'en'
      ? ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent']
      : ['新月', '娥眉月', '上弦月', '盈凸月', '满月', '亏凸月', '下弦月', '残月'];
    var idx = Math.floor(((e + 22.5) % 360) / 45);
    var illum = (1 - Math.cos(e * DEG)) / 2;
    return { name: names[idx], illum: illum, age: e / 360 * 29.53059, elong: e };
  }

  function aspectsOf(bodies) {
    var defs = [
      { angle: 0, orb: 6, color: '#d9b483', name: '合' },
      { angle: 60, orb: 5, color: '#7fb7e0', name: '六合' },
      { angle: 90, orb: 5, color: '#d97b6c', name: '刑' },
      { angle: 120, orb: 5, color: '#6fbfa0', name: '三合' },
      { angle: 180, orb: 6, color: '#c58fb0', name: '冲' }
    ];
    var out = [];
    for (var i = 0; i < bodies.length; i++) {
      for (var j = i + 1; j < bodies.length; j++) {
        var diff = Math.abs(norm180(bodies[i].lon - bodies[j].lon));
        for (var k = 0; k < defs.length; k++) {
          var d = Math.abs(diff - defs[k].angle);
          if (d <= defs[k].orb) {
            out.push({ a: bodies[i], b: bodies[j], def: defs[k], orb: d });
            break;
          }
        }
      }
    }
    return out;
  }

  /* ---------------- 状态 ---------------- */

  var state = {
    view: 'orrery',
    layers: { cn: true, west: true, sci: true },
    offset: 0,
    live: true,
    trueScale: false,
    lang: 'zh',
    visual: 'frame',
    open: false
  };

  var I18N = {
    zh: {
      orreryTab: '3D', chartTab: '天象盘', language: '语言', orbitScale: '轨道比例', visual: '视觉', frame: '画框', dusk: '半深', deep: '深色', layersCn: '中国传统', layersWest: '西方占星', layersSci: '现代科学',
      compressed: '压缩', trueScale: '真实', live: '实时', now: '此刻',
      hint: '拖动旋转 · 滚轮缩放 · 双击复位', term: '节气', phase: '月相', age: '月龄',
      body: '天体', position: '黄道位置', distanceStatus: '距离 · 状态',
      note: 'JPL 近似根数（1800–2050）· 开普勒方程 · 光行时/章动/光行差 · 月球主要周期项。二十八宿为文化映射；轨道默认压缩，可切换真实比例。',
      open3d: '打开 3D ↗', liveSky: 'LIVE · 天象', openEntry: '打开全屏 3D ↗',
      entryTitle: '实时天象仪', entryDesc: '太阳系 3D · 二十八宿 · 七政 · 黄道相位',
      sun: '太阳', moon: '月亮', earth: '地球', geocentric: '地心', here: '博主在这里',
      direct: '顺', retro: '逆行', station: '留', ageUnit: '天', sec: '秒', min: '分', hour: '时'
    },
    en: {
      orreryTab: '3D', chartTab: 'Chart', language: 'Language', orbitScale: 'Orbit scale', visual: 'Look', frame: 'Framed', dusk: 'Dusk', deep: 'Deep', layersCn: 'Chinese', layersWest: 'Western', layersSci: 'Modern',
      compressed: 'Compressed', trueScale: 'True', live: 'Live', now: 'Now',
      hint: 'Drag to rotate · Scroll to zoom · Double-click to reset', term: 'Solar term', phase: 'Moon phase', age: 'Moon age',
      body: 'Body', position: 'Ecliptic', distanceStatus: 'Distance · Status',
      note: 'JPL approximate elements (1800–2050) · Kepler solver · light-time, nutation, aberration · lunar periodic terms. 28 mansions are a cultural mapping; orbits compressed by default.',
      open3d: 'Open 3D ↗', liveSky: 'LIVE · SKY', openEntry: 'Open full 3D ↗',
      entryTitle: 'Live Orrery', entryDesc: 'Solar system 3D · 28 mansions · Seven governors · Zodiac',
      sun: 'Sun', moon: 'Moon', earth: 'Earth', geocentric: 'Geocentric', here: "I'M HERE",
      direct: 'Direct', retro: 'Retrograde', station: 'Station', ageUnit: 'd', sec: 's', min: 'min', hour: 'h'
    }
  };

  function L(k) {
    var d = I18N[state.lang] || I18N.zh;
    return d[k] !== undefined ? d[k] : (I18N.zh[k] !== undefined ? I18N.zh[k] : k);
  }

  try {
    var savedLang = localStorage.getItem('btc-orrery-lang');
    if (savedLang === 'en' || savedLang === 'zh') state.lang = savedLang;
  } catch (e) {}

  var els = {};
  var lastMini = 0;

  function currentDate() {
    return new Date(Date.now() + state.offset * 86400000);
  }

  function snapshot() {
    var date = currentDate();
    var earth = helio(EL.earth, date);
    var T = century(date);
    var sunG = sunGeo(earth);
    var sunLon = apparentLon(sunG.lon, 0, sunG.lon, T);
    var sun = { lon: sunLon, lat: 0, dist: sunG.dist };
    var moonG = moonGeo(date);
    var moonLon = apparentLon(moonG.lon, moonG.lat, sunLon, T);
    var moon = { lon: moonLon, lat: moonG.lat, dist: moonG.dist, distKm: moonG.distKm };

    var planets = PLANETS.map(function (p) {
      var g = geoOfApparent(p.el, earth, date);
      var lon = apparentLon(g.lon, g.lat, sunLon, T);

      var bDate = new Date(date.getTime() - 43200000);
      var aDate = new Date(date.getTime() + 43200000);
      var bEarth = helio(EL.earth, bDate);
      var aEarth = helio(EL.earth, aDate);
      var bG = geoOfApparent(p.el, bEarth, bDate);
      var aG = geoOfApparent(p.el, aEarth, aDate);
      var bLon = apparentLon(bG.lon, bG.lat, sunGeo(bEarth).lon, century(bDate));
      var aLon = apparentLon(aG.lon, aG.lat, sunGeo(aEarth).lon, century(aDate));

      var speed = norm180(aLon - bLon);
      var status = Math.abs(speed) < 0.02 ? '留' : (speed < 0 ? '逆行' : '顺行');
      return {
        key: p.key, cn: p.cn, west: p.west, glyph: p.glyph, color: p.color, size: p.size,
        cnName: p.cnName, lon: lon, lat: g.lat, dist: g.dist, speed: speed, status: status,
        helio: helio(p.el, date), a: p.el[0]
      };
    });

    return {
      date: date, earth: earth, sun: sun, moon: moon, planets: planets,
      sunLon: sunLon, moonLon: moonLon,
      phase: moonPhase(sunLon, moonLon),
      term: termAt(sunLon),
      mansions: { sun: mansionAt(sunLon, date), moon: mansionAt(moonLon, date) }
    };
  }

  /* ---------------- 绘图工具 ---------------- */

  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function palette() {
    return {
      ink: cssVar('--text-primary', '#18212b'),
      muted: cssVar('--text-muted', '#54697a'),
      accent: cssVar('--accent', '#29648f'),
      line: cssVar('--divider', 'rgba(70,102,126,0.12)')
    };
  }

  function isDark3D() {
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  function theme3D() {
    var dark = isDark3D();
    return {
      dark: dark,
      bg0: dark ? 'rgba(24,50,74,0.62)' : 'rgba(80,135,165,0.90)',
      bg1: dark ? 'rgba(9,21,34,0.42)' : 'rgba(30,75,105,0.60)',
      bg2: dark ? 'rgba(3,8,14,0)' : 'rgba(5,28,45,0.45)',
      star: dark ? '#dceaf5' : '#ffffff',
      starAlpha: dark ? 1 : 1,
      grid: dark ? 'rgba(142,196,232,0.075)' : 'rgba(130,215,255,0.18)',
      gridLine: dark ? 'rgba(142,196,232,0.045)' : 'rgba(130,215,255,0.11)',
      label: dark ? 'rgba(224,240,250,0.84)' : 'rgba(230,245,252,0.90)',
      labelShadow: dark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.72)',
      sunLabel: dark ? 'rgba(255,228,170,0.9)' : 'rgba(255,228,170,0.92)',
      vignette: dark ? 'rgba(0,0,0,0.34)' : 'rgba(2,18,32,0.42)',
      belt: dark ? 'rgba(214,198,170,0.9)' : 'rgba(180,200,215,0.55)',
      glow: dark ? 0.16 : 0.22,
      rim: dark ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.24)'
    };
  }

  function hexA(hex, a) {
    if (hex.charAt(0) !== '#') return hex;
    var h = hex.slice(1);
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    var n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function colorA(c, a) {
    if (!c) return c;
    if (c.charAt(0) === '#') return hexA(c, a);
    var m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return c;
    var p = m[1].split(',').map(parseFloat);
    return 'rgba(' + p[0] + ',' + p[1] + ',' + p[2] + ',' + a + ')';
  }

  function polar(cx, cy, r, lon) {
    var a = Math.PI - lon * DEG;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }

  function arcPath(ctx, cx, cy, r, lon0, lon1, anti) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI - lon0 * DEG, Math.PI - lon1 * DEG, !anti);
  }

  function setFont(ctx, size, weight) {
    ctx.font = (weight ? weight + ' ' : '') + size + 'px -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Hiragino Sans GB", sans-serif';
  }

  function setSymbolFont(ctx, size) {
    ctx.font = size + 'px "Apple Symbols", "Segoe UI Symbol", "Noto Sans Symbols 2", "Times New Roman", serif';
  }

  function glowDot(ctx, x, y, r, color, glow) {
    if (glow) {
      var g = ctx.createRadialGradient(x, y, 0, x, y, r * 4.5);
      g.addColorStop(0, hexA(color, 0.55));
      g.addColorStop(1, hexA(color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 4.5, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }

  /* ---------------- 黄道盘 ---------------- */

  function drawChart(canvas, snap, detail) {
    var rect = canvas.getBoundingClientRect();
    var w = rect.width, h = rect.height;
    if (!w || !h) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var cx = w / 2, cy = h / 2;
    var R = Math.min(w, h) / 2 - (detail ? 16 : 6);
    var darkChart = isDark3D();
    var pal = palette();
    if (darkChart && !isDark3D()) {
      pal = { ink: '#e7f1f8', muted: '#a9c0d0', accent: '#8ec9ee', line: 'rgba(220,238,248,0.12)' };
    }
    var lightChart = !darkChart;
    function A(v) { return Math.min(1, v * (lightChart ? 1.6 : 1)); }
    var layers = state.layers;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    /* 中心光晕 */
    var halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    halo.addColorStop(0, hexA(hexToHex(pal.accent), 0.10));
    halo.addColorStop(0.55, hexA(hexToHex(pal.accent), A(0.035)));
    halo.addColorStop(1, hexA(hexToHex(pal.accent), 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.fill();

    if (lightChart) {
      var disk = ctx.createRadialGradient(cx, cy, R * 0.10, cx, cy, R * 0.98);
      disk.addColorStop(0, 'rgba(255,255,255,0.55)');
      disk.addColorStop(0.72, 'rgba(255,255,255,0.34)');
      disk.addColorStop(1, 'rgba(255,255,255,0.06)');
      ctx.fillStyle = disk;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.98, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(24,33,43,0.10)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.98, 0, TAU);
      ctx.stroke();
    }

    /* 背景星点 */
    if (detail && layers.sci) {
      var seed = 7;
      for (var s = 0; s < 90; s++) {
        seed = (seed * 9301 + 49297) % 233280;
        var rr = (seed / 233280) * R;
        seed = (seed * 9301 + 49297) % 233280;
        var aa = (seed / 233280) * TAU;
        var sx = cx + Math.cos(aa) * rr;
        var sy = cy + Math.sin(aa) * rr;
        ctx.globalAlpha = 0.10 + 0.18 * ((s % 5) / 5);
        ctx.fillStyle = pal.ink;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    /* ---- 二十四节气环 ---- */
    if (layers.cn) {
      ctx.strokeStyle = hexA(hexToHex(pal.ink), A(0.10));
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.965, 0, TAU);
      ctx.stroke();

      for (var t = 0; t < 24; t++) {
        var tl = t * 15;
        var major = (t % 6 === 0);
        var p1 = polar(cx, cy, R * 0.965, tl);
        var p2 = polar(cx, cy, R * (major ? 0.935 : 0.950), tl);
        ctx.strokeStyle = hexA(hexToHex(pal.ink), major ? A(0.30) : A(0.14));
        ctx.lineWidth = major ? 1 : 0.6;
        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.stroke();

        if (detail) {
          var pl = polar(cx, cy, R * 0.985, tl + 7.5);
          setFont(ctx, Math.max(6.5, R * 0.024), '400');
          ctx.fillStyle = hexA(hexToHex(pal.muted), A(0.85));
          ctx.fillText(TERMS[t][0], pl[0], pl[1]);
        }
      }
    }

    /* ---- 黄道十二宫 ---- */
    if (layers.west) {
      var zOut = R * 0.925, zIn = R * 0.805;
      for (var zi = 0; zi < 12; zi++) {
        var l0 = zi * 30, l1 = l0 + 30;
        arcPath(ctx, cx, cy, zOut, l0, l1, false);
        ctx.strokeStyle = hexA(hexToHex(pal.ink), A(0.16));
        ctx.lineWidth = 0.8;
        ctx.stroke();

        if (zi % 2 === 0) {
          ctx.beginPath();
          ctx.arc(cx, cy, zIn, Math.PI - l0 * DEG, Math.PI - l1 * DEG, true);
          ctx.arc(cx, cy, zOut, Math.PI - l1 * DEG, Math.PI - l0 * DEG, false);
          ctx.closePath();
          ctx.fillStyle = hexA(hexToHex(pal.accent), A(0.035));
          ctx.fill();
        }

        var b1 = polar(cx, cy, zIn, l0);
        var b2 = polar(cx, cy, zOut, l0);
        ctx.strokeStyle = hexA(hexToHex(pal.ink), A(0.14));
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(b1[0], b1[1]);
        ctx.lineTo(b2[0], b2[1]);
        ctx.stroke();

        var gc = polar(cx, cy, detail ? R * 0.878 : R * 0.86, l0 + 15);
        setSymbolFont(ctx, detail ? Math.max(11, R * 0.048) : Math.max(9, R * 0.06));
        ctx.fillStyle = hexA(hexToHex(pal.ink), A(0.78));
        ctx.fillText(ZODIAC[zi].glyph, gc[0], gc[1]);

        if (detail) {
          var nc = polar(cx, cy, R * 0.823, l0 + 15);
          setFont(ctx, Math.max(6.5, R * 0.022), '500');
          ctx.fillStyle = hexA(hexToHex(pal.muted), A(0.75));
          ctx.fillText(zodiacName(zi), nc[0], nc[1]);
        }
      }
      if (detail && layers.sci) {
        for (var dg = 0; dg < 360; dg += 5) {
          var isTen = dg % 10 === 0;
          var q1 = polar(cx, cy, zOut, dg);
          var q2 = polar(cx, cy, zOut - R * (isTen ? 0.018 : 0.009), dg);
          ctx.strokeStyle = hexA(hexToHex(pal.ink), isTen ? A(0.22) : A(0.10));
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(q1[0], q1[1]);
          ctx.lineTo(q2[0], q2[1]);
          ctx.stroke();
        }
        for (var dl = 0; dl < 4; dl++) {
          var dv = dl * 90;
          var dp = polar(cx, cy, R * 0.945, dv);
          setFont(ctx, Math.max(6, R * 0.018), '500');
          ctx.fillStyle = hexA(hexToHex(pal.muted), A(0.85));
          ctx.fillText(dv + '°', dp[0], dp[1]);
        }
      }
    }

    /* ---- 二十八宿 ---- */
    if (layers.cn) {
      var xOut = R * 0.790, xIn = R * 0.700;
      var scale = 360 / 365.25;
      var years = (julian(snap.date) - 2451545.0) / 365.25;
      var origin = 204.10 + 0.01397 * years;
      var acc = 0;

      for (var xi = 0; xi < XIU.length; xi++) {
        var width = XIU[xi].width * scale;
        var s0 = origin + acc, s1 = origin + acc + width;
        var col = GROUP_COLOR[XIU[xi].group];

        ctx.beginPath();
        ctx.arc(cx, cy, xIn, Math.PI - s0 * DEG, Math.PI - s1 * DEG, true);
        ctx.arc(cx, cy, xOut, Math.PI - s1 * DEG, Math.PI - s0 * DEG, false);
        ctx.closePath();
        ctx.fillStyle = hexA(col, A(0.055));
        ctx.fill();

        if (detail) {
          var xc = polar(cx, cy, (xIn + xOut) / 2, s0 + width / 2);
          setFont(ctx, Math.max(7, R * 0.025), '500');
          ctx.fillStyle = hexA(col, 0.95);
          ctx.fillText(XIU[xi].name, xc[0], xc[1]);
        }

        var xp1 = polar(cx, cy, xIn, s0);
        var xp2 = polar(cx, cy, xOut, s0);
        ctx.strokeStyle = hexA(col, A(0.28));
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(xp1[0], xp1[1]);
        ctx.lineTo(xp2[0], xp2[1]);
        ctx.stroke();

        acc += width;
      }
    }

    /* ---- 相位线 ---- */
    if (layers.west) {
      var laneMap = { mercury: 2, venus: 0, mars: 1, jupiter: 2, saturn: 0, uranus: 1, neptune: 2 };
      var ringLevels = [0.500, 0.560, 0.440];
      var bodies = [
        { lon: snap.sunLon, name: '日', lane: 0 },
        { lon: snap.moonLon, name: '月', lane: 1 }
      ].concat(snap.planets.slice(0, 5).map(function (p) {
        return { lon: p.lon, name: p.cn, lane: laneMap[p.key] || 0 };
      }));

      var aspectList = aspectsOf(bodies);
      for (var ai = 0; ai < aspectList.length; ai++) {
        var asp = aspectList[ai];
        if (asp.def.angle === 0) continue;
        var a1 = polar(cx, cy, R * ringLevels[asp.a.lane], asp.a.lon);
        var a2 = polar(cx, cy, R * ringLevels[asp.b.lane], asp.b.lon);
        ctx.strokeStyle = hexA(asp.def.color, A(0.24));
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(a1[0], a1[1]);
        ctx.lineTo(a2[0], a2[1]);
        ctx.stroke();
      }
    }

    /* ---- 行星落点 ---- */
    var markers = [
      { lon: snap.sunLon, color: '#e8b44a', size: detail ? 5 : 3.6, glyph: '☉', label: L('sun'), lane: 0 },
      { lon: snap.moonLon, color: '#c9d3dd', size: detail ? 4.4 : 3.2, glyph: '☽', label: L('moon'), lane: 1 }
    ].concat(snap.planets.map(function (p) {
      return { lon: p.lon, color: p.color, size: detail ? 3.4 : 2.4, glyph: p.glyph, label: state.lang === 'en' ? p.west : p.cn, lane: laneMap[p.key] || 0 };
    }));

    var sorted = markers.slice().sort(function (a, b) { return a.lon - b.lon; });
    var labelLevels = [0.610, 0.645, 0.575];
    var n = sorted.length;

    for (var mi = 0; mi < n; mi++) {
      var m = sorted[mi];
      var lv = m.lane;
      var mr = R * ringLevels[lv];
      var mp = polar(cx, cy, mr, m.lon);
      glowDot(ctx, mp[0], mp[1], m.size, m.color, detail);

      if (detail) {
        var lp = polar(cx, cy, R * labelLevels[lv], m.lon);
        var leaderEnd = polar(cx, cy, R * (labelLevels[lv] - 0.014), m.lon);
        ctx.strokeStyle = hexA(hexToHex(m.color), A(0.35));
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(mp[0] + Math.cos(Math.PI - m.lon * DEG) * (m.size + 2),
                    mp[1] + Math.sin(Math.PI - m.lon * DEG) * (m.size + 2));
        ctx.lineTo(leaderEnd[0], leaderEnd[1]);
        ctx.stroke();

        setFont(ctx, Math.max(7, R * 0.023), '600');
        var tw = ctx.measureText(m.label).width;
        ctx.fillStyle = lightChart ? 'rgba(255,255,255,0.72)' : 'rgba(5,15,25,0.55)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(lp[0] - tw / 2 - 3, lp[1] - 7, tw + 6, 14, 7);
        else ctx.rect(lp[0] - tw / 2 - 3, lp[1] - 7, tw + 6, 14);
        ctx.fill();
        ctx.fillStyle = hexA(hexToHex(pal.ink), A(0.86));
        ctx.textAlign = 'center';
        ctx.fillText(m.label, lp[0], lp[1]);
      }
    }

    /* ---- 中心 ---- */
    ctx.fillStyle = hexA(hexToHex(pal.ink), 0.85);
    ctx.beginPath();
    ctx.arc(cx, cy, detail ? 3.2 : 2, 0, TAU);
    ctx.fill();

    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.arc(cx, cy, detail ? 9 : 6, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (detail) {
      setFont(ctx, Math.max(7.5, R * 0.024), '500');
      ctx.fillStyle = hexA(hexToHex(pal.muted), A(0.8));
      ctx.fillText(L('geocentric'), cx, cy + 22);
    }
  }

  function hexToHex(color) {
    if (color && color.charAt(0) === '#') return color;
    /* 将 rgb()/color-mix 回退为中性色 */
    return '#5b7488';
  }

/* ---------------- 3D 太阳系 ---------------- */

  var Z_AMP = 3.2;
  var orreryCam = { az: -0.72, el: 0.56, dist: 2.58, target: [0, 0, 0] };
  var miniCam = { az: -0.86, el: 0.50, dist: 2.95 };
  var orrerySnap = null;
  var orreryHits = [];
  var selectedKey = null;
  var camReturning = false;
  var miniSnap = null;
  var raf3d = null;
  var rafMini = null;
  var last3dFrame = 0;
  var lastMiniFrame = 0;
  var lastCamInput = 0;
  var dragging3d = false;
  var camIntroStart = 0;
  var ORBIT_CACHE = {};
  var BELT_CACHE = null;
  var STAR_CACHE = null;
  var REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function clampNum(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function vecSub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function vecCross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function vecDot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function vecNorm(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function orbitRadius3(a, trueScale) {
    if (trueScale) return 0.03 + 0.97 * (a / 30.07);
    return 0.14 + 0.86 * Math.pow(a / 30.07, 0.42);
  }

  function shadeHex(hex, amt) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    var n = parseInt(h, 16);
    if (isNaN(n)) return hex;
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    var t = amt > 0 ? 255 : 0, k = Math.abs(amt);
    r = Math.round(r + (t - r) * k);
    g = Math.round(g + (t - g) * k);
    b = Math.round(b + (t - b) * k);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function cameraBasis(cam, w, h) {
    var ce = Math.cos(cam.el), se = Math.sin(cam.el);
    var target = cam.target || [0, 0, 0];
    var eye = [target[0] + Math.cos(cam.az) * ce * cam.dist, target[1] + se * cam.dist, target[2] + Math.sin(cam.az) * ce * cam.dist];
    var fwd = vecNorm([target[0] - eye[0], target[1] - eye[1], target[2] - eye[2]]);
    var right = vecNorm(vecCross(fwd, [0, 1, 0]));
    var up = vecCross(right, fwd);
    return {
      eye: eye, fwd: fwd, right: right, up: up,
      focal: 2.35, scale: Math.min(w, h) * 0.5,
      cx: w / 2, cy: h * 0.52, dist: cam.dist
    };
  }

  function project3(p, c) {
    var dx = p[0] - c.eye[0], dy = p[1] - c.eye[1], dz = p[2] - c.eye[2];
    var z = dx * c.fwd[0] + dy * c.fwd[1] + dz * c.fwd[2];
    if (z <= 0.15) return null;
    var x = dx * c.right[0] + dy * c.right[1] + dz * c.right[2];
    var y = dx * c.up[0] + dy * c.up[1] + dz * c.up[2];
    var s = c.focal / z;
    return { x: c.cx + x * c.scale * s, y: c.cy - y * c.scale * s, z: z, s: s };
  }

  function worldOf(helio, a, trueScale) {
    var rr = Math.hypot(helio.x, helio.y);
    var target = orbitRadius3(a, trueScale);
    var k = rr > 1e-9 ? target / rr : 0;
    return [helio.x * k, helio.z * k * Z_AMP, helio.y * k];
  }

  function orbitPoints3(el, date, a, segments, trueScale) {
    var T = century(date);
    var e = el[1] + el[7] * T;
    var I = (el[2] + el[8] * T) * DEG;
    var wbar = el[4] + el[10] * T;
    var Om = (el[5] + el[11] * T) * DEG;
    var w = wbar * DEG - Om;
    var cw = Math.cos(w), sw = Math.sin(w);
    var cO = Math.cos(Om), sO = Math.sin(Om);
    var ci = Math.cos(I), si = Math.sin(I);
    var k = orbitRadius3(a, trueScale) / a;
    var pts = [];
    for (var i = 0; i <= segments; i++) {
      var M = (i / segments) * TAU;
      var E = M;
      for (var j = 0; j < 8; j++) {
        var d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
        E -= d;
        if (Math.abs(d) < 1e-10) break;
      }
      var xv = a * (Math.cos(E) - e);
      var yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
      var x = (cw * cO - sw * sO * ci) * xv + (-sw * cO - cw * sO * ci) * yv;
      var y = (cw * sO + sw * cO * ci) * xv + (-sw * sO + cw * cO * ci) * yv;
      var z = (sw * si) * xv + (cw * si) * yv;
      pts.push([x * k, z * k * Z_AMP, y * k]);
    }
    return pts;
  }

  function getOrbitPoints(body, date, detail, trueScale) {
    var key = body.key + '|' + Math.floor(date.getTime() / 3600000) + '|' + (detail ? 128 : 72) + '|' + (trueScale ? 'true' : 'false');
    if (ORBIT_CACHE[key]) return ORBIT_CACHE[key];
    var pts = orbitPoints3(body.el, date, body.a, detail ? 128 : 72, trueScale);
    ORBIT_CACHE[key] = pts;
    return pts;
  }

  function starField() {
    if (STAR_CACHE) return STAR_CACHE;
    var seed = 1337, out = [];
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (var i = 0; i < 280; i++) {
      var u = rnd() * 2 - 1, th = rnd() * TAU, r = 8.5;
      var sq = Math.sqrt(1 - u * u);
      out.push({
        p: [Math.cos(th) * sq * r, u * r, Math.sin(th) * sq * r],
        s: 0.45 + rnd() * 1.1,
        a: 0.30 + rnd() * 0.62
      });
    }
    STAR_CACHE = out;
    return out;
  }

  function beltField() {
    if (BELT_CACHE) return BELT_CACHE;
    var seed = 20261019, out = [];
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (var i = 0; i < 420; i++) {
      out.push({
        a: 2.10 + rnd() * 1.25,
        th: rnd() * TAU,
        inc: (rnd() - 0.5) * 0.22
      });
    }
    BELT_CACHE = out;
    return out;
  }

  function drawEclipticGrid(ctx, c, detail, theme) {
    if (!detail) return;
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 0.6;
    var rings = [0.24, 0.45, 0.66, 0.86, 1.02];
    for (var r = 0; r < rings.length; r++) {
      ctx.beginPath();
      var started = false;
      for (var i = 0; i <= 96; i++) {
        var a = (i / 96) * TAU;
        var q = project3([Math.cos(a) * rings[r], 0, Math.sin(a) * rings[r]], c);
        if (!q) { started = false; continue; }
        if (!started) { ctx.moveTo(q.x, q.y); started = true; } else ctx.lineTo(q.x, q.y);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = theme.gridLine;
    for (var k = 0; k < 24; k++) {
      var ang = (k / 24) * TAU;
      var p1 = project3([Math.cos(ang) * 0.20, 0, Math.sin(ang) * 0.20], c);
      var p2 = project3([Math.cos(ang) * 1.02, 0, Math.sin(ang) * 1.02], c);
      if (!p1 || !p2) continue;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  }

  function drawOrbit3(ctx, c, pts, color, detail, theme) {
    var started = false, i, q;
    ctx.beginPath();
    for (i = 0; i < pts.length; i++) {
      q = project3(pts[i], c);
      if (!q) { started = false; continue; }
      if (!started) { ctx.moveTo(q.x, q.y); started = true; } else ctx.lineTo(q.x, q.y);
    }
    ctx.closePath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    var oc = theme.dark ? color : shadeHex(color, 0.12);
    var glowC = theme.dark ? oc : '#6fe4ff';
    ctx.strokeStyle = colorA(glowC, detail ? 0.20 : 0.24);
    ctx.lineWidth = detail ? 2.8 : 2.3;
    ctx.stroke();
    ctx.strokeStyle = colorA(oc, detail ? 0.42 : 0.50);
    ctx.lineWidth = detail ? 1.0 : 0.85;
    ctx.stroke();
  }

  function drawBelt3(ctx, c, theme, trueScale) {
    var belt = beltField();
    for (var i = 0; i < belt.length; i++) {
      var b = belt[i];
      var R = orbitRadius3(b.a, trueScale);
      var q = project3([Math.cos(b.th) * R, Math.sin(b.inc) * R * 0.10, Math.sin(b.th) * R], c);
      if (!q) continue;
      ctx.globalAlpha = 0.28 + (i % 5) * 0.06;
      ctx.fillStyle = theme.belt;
      ctx.beginPath();
      ctx.arc(q.x, q.y, 0.55, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawTrail3(ctx, c, body, snap, detail, trueScale) {
    var pts = getOrbitPoints(body, snap.date, detail, trueScale);
    var pos = worldOf(body.helio, body.a, trueScale);
    var best = 0, bestD = 1e9;
    for (var i = 0; i < pts.length; i++) {
      var dx = pts[i][0] - pos[0], dz = pts[i][2] - pos[2];
      var d = dx * dx + dz * dz;
      if (d < bestD) { bestD = d; best = i; }
    }
    var start = Math.max(0, best - 42);
    for (var j = start; j < best; j++) {
      var q1 = project3(pts[j], c), q2 = project3(pts[j + 1], c);
      if (!q1 || !q2) continue;
      var a = (j - start) / Math.max(1, best - start);
      ctx.strokeStyle = hexA(body.color, 0.008 + a * 0.30);
      ctx.lineWidth = 0.5 + a * 2.2;
      ctx.beginPath();
      ctx.moveTo(q1.x, q1.y);
      ctx.lineTo(q2.x, q2.y);
      ctx.stroke();
    }
  }

  function drawSun3(ctx, x, y, r, detail, haloScale, flareAlpha) {
    var halo = r * (haloScale || (detail ? 10 : 7));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createRadialGradient(x, y, 0, x, y, halo);
    g.addColorStop(0, 'rgba(255, 248, 220, 0.95)');
    g.addColorStop(0.07, 'rgba(255, 219, 140, 0.62)');
    g.addColorStop(0.26, 'rgba(255, 174, 82, 0.20)');
    g.addColorStop(0.62, 'rgba(255, 140, 55, 0.06)');
    g.addColorStop(1, 'rgba(255, 120, 30, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, halo, 0, TAU);
    ctx.fill();

    var flare = ctx.createLinearGradient(x - halo, y, x + halo, y);
    flare.addColorStop(0, 'rgba(255, 210, 140, 0)');
    flare.addColorStop(0.5, 'rgba(255, 233, 186, ' + (flareAlpha || 0.18) + ')');
    flare.addColorStop(1, 'rgba(255, 210, 140, 0)');
    ctx.fillStyle = flare;
    ctx.fillRect(x - halo, y - 1.2, halo * 2, 2.4);
    ctx.restore();

    var core = ctx.createRadialGradient(x - r * 0.22, y - r * 0.22, 0, x, y, r);
    core.addColorStop(0, '#fffdf5');
    core.addColorStop(0.42, '#ffe6ae');
    core.addColorStop(1, '#f2a63e');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();

    if (detail) {
      ctx.strokeStyle = 'rgba(255, 232, 180, 0.35)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.55, 0, TAU);
      ctx.stroke();
    }
  }

  function drawPlanet3(ctx, q, body, sunQ, detail, cam, theme) {
    var boost = (selectedKey === body.key) ? 1.65 : (cam.dist < 1.8 ? 1.18 : 1);
    var r = Math.max(detail ? 2.4 : 1.2, body.size * q.s * (detail ? 2.6 : 2.05)) * boost;
    var lit = sunQ ? [sunQ.x - q.x, sunQ.y - q.y] : [-1, -1];
    var ll = Math.hypot(lit[0], lit[1]) || 1;
    lit = [lit[0] / ll, lit[1] / ll];
    var hx = q.x + lit[0] * r * 0.42;
    var hy = q.y + lit[1] * r * 0.42;

    if (detail) {
      var glow = ctx.createRadialGradient(q.x, q.y, r * 0.5, q.x, q.y, r * 2.8);
      glow.addColorStop(0, colorA(body.color, theme.glow));
      glow.addColorStop(1, hexA(body.color, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(q.x, q.y, r * 2.8, 0, TAU);
      ctx.fill();
    }

    var g = ctx.createRadialGradient(hx, hy, r * 0.04, q.x, q.y, r * 1.04);
    g.addColorStop(0, shadeHex(body.color, 0.55));
    g.addColorStop(0.46, body.color);
    g.addColorStop(1, shadeHex(body.color, -0.62));
    ctx.beginPath();
    ctx.arc(q.x, q.y, r, 0, TAU);
    ctx.fillStyle = g;
    ctx.fill();

    if (detail && r > 2.4) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(q.x, q.y, r, 0, TAU);
      ctx.clip();

      if (body.key === 'jupiter' || body.key === 'saturn') {
        for (var b = -3; b <= 3; b++) {
          ctx.fillStyle = colorA(b % 2 ? shadeHex(body.color, 0.22) : shadeHex(body.color, -0.14), 0.16);
          ctx.fillRect(q.x - r, q.y + b * r * 0.19 - r * 0.05, r * 2, r * 0.11);
        }
      } else if (body.key === 'venus') {
        for (var v = -2; v <= 2; v++) {
          ctx.fillStyle = 'rgba(255, 244, 214, 0.15)';
          ctx.fillRect(q.x - r, q.y + v * r * 0.26 - r * 0.05, r * 2, r * 0.10);
        }
      } else if (body.key === 'earth') {
        ctx.fillStyle = 'rgba(92, 154, 112, 0.55)';
        ctx.beginPath();
        ctx.ellipse(q.x - r * 0.22, q.y - r * 0.08, r * 0.34, r * 0.22, -0.5, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(q.x + r * 0.28, q.y + r * 0.22, r * 0.24, r * 0.16, 0.6, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
        ctx.beginPath();
        ctx.ellipse(q.x + r * 0.02, q.y - r * 0.32, r * 0.30, r * 0.09, 0.3, 0, TAU);
        ctx.fill();
      } else if (body.key === 'mars') {
        ctx.fillStyle = 'rgba(120, 60, 35, 0.24)';
        ctx.beginPath();
        ctx.ellipse(q.x - r * 0.18, q.y + r * 0.18, r * 0.28, r * 0.14, 0.4, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 246, 236, 0.62)';
        ctx.beginPath();
        ctx.ellipse(q.x, q.y - r * 0.76, r * 0.24, r * 0.12, 0, 0, TAU);
        ctx.fill();
      } else if (body.key === 'mercury') {
        ctx.fillStyle = 'rgba(60, 70, 80, 0.22)';
        for (var c = 0; c < 4; c++) {
          ctx.beginPath();
          ctx.arc(q.x + (c - 1.5) * r * 0.28, q.y + (c % 2 ? r * 0.22 : -r * 0.16), r * 0.09, 0, TAU);
          ctx.fill();
        }
      } else if (body.key === 'uranus' || body.key === 'neptune') {
        for (var u = -1; u <= 1; u++) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
          ctx.fillRect(q.x - r, q.y + u * r * 0.30 - r * 0.04, r * 2, r * 0.08);
        }
      }

      var sh = ctx.createLinearGradient(q.x - lit[0] * r, q.y - lit[1] * r, q.x + lit[0] * r, q.y + lit[1] * r);
      sh.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
      sh.addColorStop(0.5, 'rgba(0, 0, 0, 0.08)');
      sh.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = sh;
      ctx.fillRect(q.x - r, q.y - r, r * 2, r * 2);
      ctx.restore();
    }

    if (detail) {
      ctx.beginPath();
      ctx.arc(q.x, q.y, r * 1.06, 0, TAU);
      ctx.strokeStyle = colorA(body.color, theme.dark ? 0.10 : 0.18);
      ctx.lineWidth = Math.max(0.5, r * 0.10);
      ctx.stroke();
    }

    var rimAng = Math.atan2(lit[1], lit[0]);
    ctx.beginPath();
    ctx.arc(q.x, q.y, r * 0.98, rimAng - 0.65, rimAng + 0.65);
    ctx.strokeStyle = theme.rim;
    ctx.lineWidth = Math.max(0.5, r * 0.07);
    ctx.stroke();

    if (detail && r > 2) {
      ctx.beginPath();
      ctx.arc(q.x + lit[0] * r * 0.42, q.y + lit[1] * r * 0.42, r * 0.13, 0, TAU);
      ctx.fillStyle = theme.dark ? 'rgba(255, 255, 255, 0.20)' : 'rgba(255, 255, 255, 0.38)';
      ctx.fill();
    }

    if (body.key === 'saturn') {
      var ang = (cam.az * 0.65) - 0.35;
      ctx.save();
      ctx.translate(q.x, q.y);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 2.15, r * 0.58, 0, 0, TAU);
      ctx.strokeStyle = 'rgba(226, 208, 154, 0.55)';
      ctx.lineWidth = Math.max(0.9, r * 0.26);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.72, r * 0.42, 0, 0, TAU);
      ctx.strokeStyle = 'rgba(226, 208, 154, 0.25)';
      ctx.lineWidth = Math.max(0.6, r * 0.14);
      ctx.stroke();
      ctx.restore();
    }

    if (selectedKey === body.key) {
      ctx.beginPath();
      ctx.arc(q.x, q.y, r + 7, 0, TAU);
      ctx.strokeStyle = 'rgba(110,228,255,0.55)';
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }

    return r;
  }

  function drawLabel3(ctx, q, text, detail, theme, w, h) {
    setFont(ctx, detail ? 8.6 : 7.2, '600');
    var lx = q.x + 9, ly = q.y - 8, align = 'left';
    if (lx + 46 > w) { lx = q.x - 9; align = 'right'; }
    if (ly < 12) ly = q.y + 12;
    if (ly > h - 8) ly = q.y - 12;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.shadowColor = theme.labelShadow;
    ctx.shadowBlur = 4;
    ctx.fillStyle = theme.label;
    ctx.fillText(text, lx, ly);
    ctx.shadowBlur = 0;
  }

  function updateCameraFocus() {
    if (!orreryCam.target) orreryCam.target = [0, 0, 0];
    if (camReturning) {
      var rk = 0.06;
      orreryCam.target[0] += (0 - orreryCam.target[0]) * rk;
      orreryCam.target[1] += (0 - orreryCam.target[1]) * rk;
      orreryCam.target[2] += (0 - orreryCam.target[2]) * rk;
      orreryCam.dist += (2.58 - orreryCam.dist) * rk;
      if (Math.abs(orreryCam.dist - 2.58) < 0.015 && Math.abs(orreryCam.target[0]) < 0.01 && Math.abs(orreryCam.target[1]) < 0.01 && Math.abs(orreryCam.target[2]) < 0.01) {
        orreryCam.target = [0, 0, 0];
        orreryCam.dist = 2.58;
        camReturning = false;
      }
      return;
    }
    if (!selectedKey || !orrerySnap) return;
    var goal = [0, 0, 0], goalDist = 1.5;
    if (selectedKey === 'moon') {
      var earthW = worldOf(orrerySnap.earth, EL.earth[0], state.trueScale);
      var mr = state.trueScale ? 0.010 : 0.030;
      goal = [earthW[0] + Math.cos(orrerySnap.moonLon * DEG) * mr, earthW[1], earthW[2] + Math.sin(orrerySnap.moonLon * DEG) * mr];
      goalDist = 0.55;
    } else if (selectedKey !== 'sun') {
      var body = null;
      if (selectedKey === 'earth') body = { helio: orrerySnap.earth, a: EL.earth[0] };
      else {
        for (var i = 0; i < orrerySnap.planets.length; i++) {
          if (orrerySnap.planets[i].key === selectedKey) { body = orrerySnap.planets[i]; break; }
        }
      }
      if (body) { goal = worldOf(body.helio, body.a, state.trueScale); goalDist = 1.15; }
    }
    var k = 0.075;
    orreryCam.target[0] += (goal[0] - orreryCam.target[0]) * k;
    orreryCam.target[1] += (goal[1] - orreryCam.target[1]) * k;
    orreryCam.target[2] += (goal[2] - orreryCam.target[2]) * k;
    orreryCam.dist += (goalDist - orreryCam.dist) * k;
  }

  function drawAuRings(ctx, c, theme) {
    var aus = [1, 5, 10, 20, 30];
    for (var ai = 0; ai < aus.length; ai++) {
      var R = orbitRadius3(aus[ai], true);
      ctx.beginPath();
      var started = false;
      for (var i = 0; i <= 96; i++) {
        var a = (i / 96) * TAU;
        var q = project3([Math.cos(a) * R, 0, Math.sin(a) * R], c);
        if (!q) { started = false; continue; }
        if (!started) { ctx.moveTo(q.x, q.y); started = true; } else ctx.lineTo(q.x, q.y);
      }
      ctx.closePath();
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.globalAlpha = 1;
      var lp = project3([Math.cos(0.65) * R, 0, Math.sin(0.65) * R], c);
      if (lp) {
        setFont(ctx, 7, '500');
        ctx.fillStyle = theme.label;
        ctx.globalAlpha = 0.55;
        ctx.textAlign = 'left';
        ctx.fillText(aus[ai] + ' AU', lp.x + 4, lp.y - 4);
        ctx.globalAlpha = 1;
      }
    }
  }

  function drawMeteors(ctx, w, h, theme) {
    var t = Date.now() / 1000;
    var cycle = 10.5;
    for (var i = 0; i < 3; i++) {
      var phase = (t + i * 3.5) % cycle;
      if (phase < 1.25) {
        var p = phase / 1.25;
        var x0 = w * (0.82 - i * 0.12), y0 = h * (0.06 + i * 0.06);
        var x1 = w * (0.26 - i * 0.04), y1 = h * (0.38 + i * 0.10);
        var hx = x0 + (x1 - x0) * p;
        var hy = y0 + (y1 - y0) * p;
        var tailP = Math.max(0, p - 0.38);
        var tx = x0 + (x1 - x0) * tailP;
        var ty = y0 + (y1 - y0) * tailP;
        var g = ctx.createLinearGradient(tx, ty, hx, hy);
        g.addColorStop(0, theme.dark ? 'rgba(180,240,255,0)' : 'rgba(70,160,200,0)');
        g.addColorStop(0.75, theme.dark ? 'rgba(180,240,255,0.35)' : 'rgba(70,160,200,0.24)');
        g.addColorStop(1, theme.dark ? 'rgba(225,250,255,0.80)' : 'rgba(95,180,220,0.55)');
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(hx, hy);
        ctx.stroke();
        ctx.fillStyle = theme.dark ? 'rgba(235,252,255,0.85)' : 'rgba(90,175,215,0.65)';
        ctx.beginPath();
        ctx.arc(hx, hy, 1.3, 0, TAU);
        ctx.fill();
      }
    }
  }

  function drawHereCallout(ctx, q, r, theme, w, h) {
    var text = L('here');
    setFont(ctx, 8.5, '600');
    var tw = ctx.measureText(text).width;
    var padX = 8, lh = 20, lw = tw + padX * 2;
    var lx = q.x + 20, ly = q.y - 42;
    if (lx + lw > w - 8) lx = q.x - 20 - lw;
    if (lx < 8) lx = 8;
    if (ly < 8) ly = q.y + 22;
    if (ly + lh > h - 8) ly = q.y - 42;
    var ax = q.x < lx ? lx : (q.x > lx + lw ? lx + lw : Math.max(lx, Math.min(lx + lw, q.x)));
    var ay = q.y < ly ? ly : (q.y > ly + lh ? ly + lh : ly + lh / 2);
    var accent = 'rgba(120,220,255,0.60)';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
    var ang = Math.atan2(q.y - ay, q.x - ax), ah = 5;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(q.x, q.y);
    ctx.lineTo(q.x - Math.cos(ang - 0.5) * ah, q.y - Math.sin(ang - 0.5) * ah);
    ctx.lineTo(q.x - Math.cos(ang + 0.5) * ah, q.y - Math.sin(ang + 0.5) * ah);
    ctx.closePath();
    ctx.fill();
    var pulse = 0.5 + 0.5 * Math.sin(Date.now() / 700);
    ctx.globalAlpha = 0.20 + 0.20 * pulse;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(q.x, q.y, r + 7 + pulse * 3, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(8,18,28,0.76)';
    ctx.strokeStyle = 'rgba(180,220,245,0.18)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(lx, ly, lw, lh, 8); else ctx.rect(lx, ly, lw, lh);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = theme.label;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, lx + lw / 2, ly + lh / 2);
  }

  var MILKY_STARS = null;

  function milkyStars() {
    if (MILKY_STARS) return MILKY_STARS;
    var seed = 20261019, out = [];
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    var clusters = [-0.64, -0.20, 0.26, 0.70];
    for (var c = 0; c < clusters.length; c++) {
      var n = 70 + Math.floor(rnd() * 35);
      for (var i = 0; i < n; i++) {
        out.push({
          s: clusters[c] + (rnd() - 0.5) * 0.30,
          t: (rnd() + rnd() + rnd() - 1.5) / 1.5,
          size: 0.35 + Math.pow(rnd(), 3) * 1.15,
          a: 0.12 + rnd() * 0.55,
          warm: rnd()
        });
      }
    }
    for (var b = 0; b < 110; b++) {
      out.push({
        s: rnd() * 2 - 1,
        t: (rnd() + rnd() + rnd() - 1.5) / 1.5 * 1.25,
        size: 0.28 + rnd() * 0.55,
        a: 0.08 + rnd() * 0.22,
        warm: rnd()
      });
    }
    for (var k = 0; k < 16; k++) {
      out.push({
        s: rnd() * 2 - 1,
        t: (rnd() + rnd() + rnd() - 1.5) / 1.5 * 0.5,
        size: 1.35 + rnd() * 0.85,
        a: 0.55 + rnd() * 0.30,
        warm: rnd()
      });
    }
    for (var z = 0; z < out.length; z++) {
      out[z].phase = rnd() * TAU;
      out[z].speed = 0.6 + rnd() * 1.5;
    }
    MILKY_STARS = out;
    return out;
  }

  var MILKY_FIELD = null;

  function milkyField() {
    if (MILKY_FIELD) return MILKY_FIELD;
    var seed = 7719, out = [];
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (var i = 0; i < 150; i++) {
      out.push({
        x: rnd(),
        y: rnd(),
        size: 0.30 + rnd() * 0.70,
        a: 0.05 + rnd() * 0.20,
        phase: rnd() * TAU,
        speed: 0.6 + rnd() * 1.4,
        warm: rnd()
      });
    }
    MILKY_FIELD = out;
    return out;
  }

  function drawMilkyWay(ctx, w, h, theme, detail) {
    var stars = milkyStars();
    var field = milkyField();
    var now = Date.now() / 1000;
    var count = detail ? stars.length : Math.min(stars.length, 180);
    var step = stars.length / count;
    var ang = -0.52;
    var span = Math.max(w, h) * 0.82;
    var width = Math.min(w, h) * 0.24;
    for (var fi = 0; fi < field.length; fi++) {
      var fs = field[fi];
      var ftw = 0.70 + 0.30 * Math.sin(now * fs.speed + fs.phase);
      var fa = fs.a * ftw * (detail ? 1 : 0.7);
      var fsize = fs.size * (detail ? 1 : 0.75);
      if (theme.dark) {
        ctx.fillStyle = fs.warm > 0.84 ? 'rgba(255,235,210,' + fa + ')' : 'rgba(220,240,255,' + fa + ')';
      } else {
        ctx.globalAlpha = fa * 0.9;
        ctx.fillStyle = 'rgba(50,105,145,1)';
        ctx.beginPath();
        ctx.arc(fs.x * w, fs.y * h, fsize + 1.0, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(255,255,255,' + (fa * 0.9) + ')';
      }
      ctx.beginPath();
      ctx.arc(fs.x * w, fs.y * h, fsize, 0, TAU);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(w * 0.5, h * 0.5);
    ctx.rotate(ang);

    var haze = ctx.createLinearGradient(0, -width * 2.1, 0, width * 2.1);
    haze.addColorStop(0, 'rgba(0,0,0,0)');
    haze.addColorStop(0.46, theme.dark ? 'rgba(190,220,255,0.035)' : 'rgba(120,180,215,0.055)');
    haze.addColorStop(0.5, theme.dark ? 'rgba(220,240,255,0.060)' : 'rgba(150,205,235,0.080)');
    haze.addColorStop(0.54, theme.dark ? 'rgba(190,220,255,0.035)' : 'rgba(120,180,215,0.055)');
    haze.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = haze;
    ctx.fillRect(-span, -width * 2.1, span * 2, width * 4.2);

    var core = ctx.createRadialGradient(0, 0, 0, 0, 0, width * 1.9);
    core.addColorStop(0, theme.dark ? 'rgba(215,235,255,0.045)' : 'rgba(120,180,215,0.050)');
    core.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, width * 1.9, 0, TAU);
    ctx.fill();

    for (var i = 0; i < count; i++) {
      var st = stars[Math.floor(i * step)];
      var x = st.s * span;
      var y = st.t * width;
      var tw = 0.70 + 0.30 * Math.sin(now * st.speed + st.phase);
      var size = st.size * (detail ? (theme.dark ? 1 : 1.12) : 0.75);
      var a = st.a * (detail ? 1 : 0.8) * tw;
      if (theme.dark) {
        ctx.fillStyle = st.warm > 0.82
          ? 'rgba(255,232,205,' + a + ')'
          : 'rgba(225,242,255,' + a + ')';
      } else {
        ctx.globalAlpha = a * 0.10;
        ctx.fillStyle = 'rgba(90,150,190,1)';
        ctx.beginPath();
        ctx.arc(x, y, size + 1.4, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = st.warm > 0.82
          ? 'rgba(255,252,245,' + (a * 0.95) + ')'
          : 'rgba(245,253,255,' + (a * 0.92) + ')';
      }
      ctx.beginPath();
      ctx.arc(x, y, size, 0, TAU);
      ctx.fill();
      if (detail && st.size > 1.5) {
        ctx.globalAlpha = 0.16;
        ctx.strokeStyle = theme.dark ? 'rgba(230,245,255,0.8)' : 'rgba(110,170,210,0.65)';
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        ctx.moveTo(x - 2.6, y);
        ctx.lineTo(x + 2.6, y);
        ctx.moveTo(x, y - 2.6);
        ctx.lineTo(x, y + 2.6);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawOrrery3D(canvas, snap, detail, cam) {
    var rect = canvas.getBoundingClientRect();
    var w = rect.width, h = rect.height;
    if (!w || !h) return;

    var dpr = Math.min(window.devicePixelRatio || 1, detail ? 1.8 : 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var c = cameraBasis(cam, w, h);
    var theme = theme3D();
    var ts = !!state.trueScale;
    var closeUp = cam.dist < 2.0;

    var bg = ctx.createRadialGradient(w * 0.5, h * 0.44, 0, w * 0.5, h * 0.44, Math.max(w, h) * 0.78);
    bg.addColorStop(0, theme.bg0);
    bg.addColorStop(0.46, theme.bg1);
    bg.addColorStop(1, theme.bg2);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    if (!theme.dark) {
      var nebA = ctx.createRadialGradient(w * 0.22, h * 0.24, 0, w * 0.22, h * 0.24, Math.max(w, h) * 0.60);
      nebA.addColorStop(0, 'rgba(120,235,255,0.22)');
      nebA.addColorStop(0.5, 'rgba(90,190,255,0.08)');
      nebA.addColorStop(1, 'rgba(90,190,255,0)');
      ctx.fillStyle = nebA;
      ctx.fillRect(0, 0, w, h);
      var nebB = ctx.createRadialGradient(w * 0.82, h * 0.78, 0, w * 0.82, h * 0.78, Math.max(w, h) * 0.55);
      nebB.addColorStop(0, 'rgba(150,150,255,0.14)');
      nebB.addColorStop(1, 'rgba(150,150,255,0)');
      ctx.fillStyle = nebB;
      ctx.fillRect(0, 0, w, h);
    }

    if (theme.dark) {
      var darkNebA = ctx.createRadialGradient(w * 0.24, h * 0.22, 0, w * 0.24, h * 0.22, Math.max(w, h) * 0.62);
      darkNebA.addColorStop(0, 'rgba(40,110,160,0.12)');
      darkNebA.addColorStop(1, 'rgba(40,110,160,0)');
      ctx.fillStyle = darkNebA;
      ctx.fillRect(0, 0, w, h);
      var darkNebB = ctx.createRadialGradient(w * 0.80, h * 0.78, 0, w * 0.80, h * 0.78, Math.max(w, h) * 0.55);
      darkNebB.addColorStop(0, 'rgba(90,60,140,0.08)');
      darkNebB.addColorStop(1, 'rgba(90,60,140,0)');
      ctx.fillStyle = darkNebB;
      ctx.fillRect(0, 0, w, h);
    }

    drawMilkyWay(ctx, w, h, theme, detail);
    if (detail) drawMeteors(ctx, w, h, theme);

    drawEclipticGrid(ctx, c, detail, theme);
    if (ts && detail && !closeUp) drawAuRings(ctx, c, theme);

    var bodies = [];
    for (var bi = 0; bi < ORRERY_BODIES.length; bi++) {
      var body = ORRERY_BODIES[bi];
      var src = body.key === 'earth' ? { helio: snap.earth, a: EL.earth[0] } : null;
      if (!src) {
        for (var pi = 0; pi < snap.planets.length; pi++) {
          if (snap.planets[pi].key === body.key) {
            src = { helio: snap.planets[pi].helio, a: snap.planets[pi].a };
            break;
          }
        }
      }
      if (!src) continue;
      bodies.push({
        key: body.key, cn: body.cn, west: body.west, color: body.color, size: body.size,
        el: body.el, a: src.a, helio: src.helio
      });
    }

    for (var oi = 0; oi < bodies.length; oi++) {
      if (closeUp) continue;
      var ob = bodies[oi];
      var pts = getOrbitPoints(ob, snap.date, detail, ts);
      drawOrbit3(ctx, c, pts, ob.color, detail, theme);
    }

    if (detail && state.layers.sci && !closeUp) drawBelt3(ctx, c, theme, ts);
    if (detail && !closeUp) {
      for (var ti = 0; ti < bodies.length; ti++) drawTrail3(ctx, c, bodies[ti], snap, detail, ts);
    }

    var sunQ = project3([0, 0, 0], c);
    var items = [{ type: 'sun', q: sunQ }];
    for (var bj = 0; bj < bodies.length; bj++) {
      var bb = bodies[bj];
      var wq = project3(worldOf(bb.helio, bb.a, ts), c);
      if (wq) items.push({ type: 'planet', body: bb, q: wq });
    }
    items.sort(function (a, b) { return b.q.z - a.q.z; });

    var hits = [];
    for (var ii = 0; ii < items.length; ii++) {
      var it = items[ii];
      if (it.type === 'sun') {
        if (!it.q) continue;
        var sunScale = ts ? 0.28 : (theme.dark ? 1 : 0.58);
        var sunMin = ts ? 2.2 : (theme.dark ? 6.2 : 4.6);
        var sunR = Math.max(detail ? sunMin : 3.4, (detail ? 8.2 : 4.8) * it.q.s * 2.2 * sunScale);
        drawSun3(ctx, it.q.x, it.q.y, sunR, detail, ts ? 4 : (theme.dark ? 0 : 6), theme.dark ? 0.18 : 0.04);
        hits.push({ key: 'sun', cn: '太阳', q: it.q, r: sunR });
        if (selectedKey === 'sun') {
          ctx.beginPath();
          ctx.arc(it.q.x, it.q.y, sunR + 10, 0, TAU);
          ctx.strokeStyle = 'rgba(110,228,255,0.55)';
          ctx.lineWidth = 0.9;
          ctx.stroke();
        }
        if (detail) {
          setFont(ctx, 9, '600');
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = theme.labelShadow;
          ctx.shadowBlur = 4;
          ctx.fillStyle = theme.sunLabel;
          ctx.fillText(L('sun'), it.q.x, it.q.y + sunR + 12);
          ctx.shadowBlur = 0;
        }
        if (!theme.dark && detail) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          for (var ray = 0; ray < 14; ray++) {
            var ra = (ray / 14) * TAU + cam.az * 0.2;
            var rl = sunR * (2.2 + (ray % 4) * 0.45);
            ctx.strokeStyle = 'rgba(180,245,255,0.025)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(it.q.x + Math.cos(ra) * sunR * 1.15, it.q.y + Math.sin(ra) * sunR * 1.15);
            ctx.lineTo(it.q.x + Math.cos(ra) * rl, it.q.y + Math.sin(ra) * rl);
            ctx.stroke();
          }
          ctx.restore();
        }
      } else {
        var pr = drawPlanet3(ctx, it.q, it.body, sunQ, detail, cam, theme);
        hits.push({ key: it.body.key, cn: it.body.cn, q: it.q, r: pr });
        if (detail && it.body.key === 'earth') {
          ctx.beginPath();
          ctx.arc(it.q.x, it.q.y, pr + 5, 0, TAU);
          ctx.strokeStyle = 'rgba(110,228,255,0.35)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
        if (detail && state.layers.sci && (!closeUp || selectedKey === it.body.key)) drawLabel3(ctx, it.q, state.lang === 'en' ? it.body.west : it.body.cn, detail, theme, w, h);
      }
    }

    var earthWorld = worldOf(snap.earth, EL.earth[0], ts);
    var moonOrbit = ts ? 0.010 : 0.030;
    var moonAng = snap.moonLon * DEG;
    var moonPos = [earthWorld[0] + Math.cos(moonAng) * moonOrbit, earthWorld[1], earthWorld[2] + Math.sin(moonAng) * moonOrbit];
    if (!closeUp && selectedKey !== 'moon') {
    ctx.beginPath();
    var moonStarted = false;
    for (var mi2 = 0; mi2 <= 48; mi2++) {
      var ma = (mi2 / 48) * TAU;
      var mq0 = project3([earthWorld[0] + Math.cos(ma) * moonOrbit, earthWorld[1], earthWorld[2] + Math.sin(ma) * moonOrbit], c);
      if (!mq0) { moonStarted = false; continue; }
      if (!moonStarted) { ctx.moveTo(mq0.x, mq0.y); moonStarted = true; } else ctx.lineTo(mq0.x, mq0.y);
    }
    ctx.closePath();
    ctx.strokeStyle = theme.grid;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
    }
    var mq = project3(moonPos, c);
    if (mq) {
      glowDot(ctx, mq.x, mq.y, detail ? (selectedKey === 'moon' ? 4.6 : 2.4) : 1.4, '#c9d3dd', detail);
      hits.push({ key: 'moon', cn: '月亮', q: mq, r: detail ? 3 : 1.6 });
      if (selectedKey === 'moon') {
        ctx.beginPath();
        ctx.arc(mq.x, mq.y, detail ? 7 : 4, 0, TAU);
        ctx.strokeStyle = 'rgba(110,228,255,0.55)';
        ctx.lineWidth = 0.9;
        ctx.stroke();
      }
      if (detail && (cam.dist < 2.2 || selectedKey === 'moon')) drawLabel3(ctx, mq, L('moon'), detail, theme, w, h);
    }

    var earthHit = null;
    for (var hi2 = 0; hi2 < hits.length; hi2++) {
      if (hits[hi2].key === 'earth') { earthHit = hits[hi2]; break; }
    }
    if (detail && earthHit && (!closeUp || selectedKey === 'earth') && earthHit.q.x > 10 && earthHit.q.x < w - 10 && earthHit.q.y > 10 && earthHit.q.y < h - 10) {
      drawHereCallout(ctx, earthHit.q, earthHit.r, theme, w, h);
    }

    orreryHits = hits;

    var vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.22, w / 2, h / 2, Math.max(w, h) * 0.74);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, theme.vignette);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  function resetCameraView() {
    selectedKey = null;
    updateFocusHud(null);
    camReturning = true;
    lastCamInput = Date.now();
    camIntroStart = 0;
  }

  function attach3DControls(canvas) {
    var pointers = {};
    var downPoint = null;
    function redraw() {
      if (state.view !== 'orrery' || !orrerySnap) return;
      drawOrrery3D(canvas, orrerySnap, true, orreryCam);
    }
    canvas.addEventListener('pointerdown', function (e) {
      canvas.setPointerCapture(e.pointerId);
      camReturning = false;
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      downPoint = { x: e.clientX, y: e.clientY };
      if (Object.keys(pointers).length === 1) {
        dragging3d = true;
        canvas.classList.add('is-dragging');
      }
      lastCamInput = Date.now();
      camIntroStart = 0;
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!pointers[e.pointerId]) return;
      var prev = pointers[e.pointerId];
      var dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (Object.keys(pointers).length === 1) {
        orreryCam.az -= dx * 0.005;
        orreryCam.el = clampNum(orreryCam.el + dy * 0.003, -0.06, 1.22);
        lastCamInput = Date.now();
        redraw();
      }
    });
    function end(e) {
      delete pointers[e.pointerId];
      if (!Object.keys(pointers).length) {
        dragging3d = false;
        canvas.classList.remove('is-dragging');
      }
    }
    canvas.addEventListener('pointerup', function (e) {
      if (downPoint) {
        var moved = Math.hypot(e.clientX - downPoint.x, e.clientY - downPoint.y);
        if (moved < 6) {
          var rect = canvas.getBoundingClientRect();
          var px = e.clientX - rect.left, py = e.clientY - rect.top;
          var best = null, bestD = 1e9;
          for (var hi = 0; hi < orreryHits.length; hi++) {
            var h = orreryHits[hi];
            var d = Math.hypot(h.q.x - px, h.q.y - py);
            if (d < Math.max(18, h.r + 10) && d < bestD) { bestD = d; best = h; }
          }
          if (best && best.key === selectedKey) {
            resetCameraView();
          } else if (best) {
            selectedKey = best.key;
            camReturning = false;
            camIntroStart = 0;
            updateFocusHud(selectedKey);
          } else {
            resetCameraView();
          }
          redraw();
        }
      }
      downPoint = null;
      end(e);
    });
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      camReturning = false;
      orreryCam.dist = clampNum(orreryCam.dist * (1 + e.deltaY * 0.0012), 2.0, 6.5);
      lastCamInput = Date.now();
      camIntroStart = 0;
      redraw();
    }, { passive: false });
    canvas.addEventListener('dblclick', function () {
      resetCameraView();
      redraw();
    });
  }

  function start3dLoop() {
    if (raf3d) return;
    function tick(t) {
      if (!state.open || state.view !== 'orrery') { raf3d = null; return; }
      if (t - last3dFrame > 32) {
        last3dFrame = t;
        if (camIntroStart) {
          var ik = clampNum((t - camIntroStart) / 1400, 0, 1);
          var ie = 1 - Math.pow(1 - ik, 3);
          orreryCam.dist = 4.7 + (2.58 - 4.7) * ie;
          if (ik >= 1) camIntroStart = 0;
        }
        if (!dragging3d && Date.now() - lastCamInput > 650) orreryCam.az += 0.0016;
        updateCameraFocus();
        var cv = document.getElementById('btc-orrery-canvas');
        if (cv && orrerySnap) drawOrrery3D(cv, orrerySnap, true, orreryCam);
      }
      raf3d = requestAnimationFrame(tick);
    }
    raf3d = requestAnimationFrame(tick);
  }

  function stop3dLoop() {
    if (raf3d) { cancelAnimationFrame(raf3d); raf3d = null; }
  }

  function startMiniLoop() {
    if (REDUCED_MOTION || rafMini) return;
    miniSnap = snapshot();
    function tick(t) {
      if (!document.getElementById('btc-orrery-mini')) { rafMini = null; return; }
      if (t - lastMiniFrame > 45) {
        lastMiniFrame = t;
        miniCam.az += 0.0028;
        var m = document.getElementById('btc-orrery-mini');
        if (m && miniSnap) drawOrrery3D(m, miniSnap, false, miniCam);
      }
      rafMini = requestAnimationFrame(tick);
    }
    rafMini = requestAnimationFrame(tick);
  }

  function stopMiniLoop() {
    if (rafMini) { cancelAnimationFrame(rafMini); rafMini = null; }
  }

  /* ---------------- 文案 ---------------- */

  function dateText(date) {
    if (state.lang === 'en') {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) + ' · ' + date.toLocaleDateString('en-US', { weekday: 'long' });
    }
    return date.getFullYear() + ' 年 ' + (date.getMonth() + 1) + ' 月 ' + date.getDate() + ' 日 · 星期' + WEEK[date.getDay()];
  }

  function statusLabel(s) {
    if (s === '逆行') return L('retro');
    if (s === '顺行') return L('direct');
    if (s === '留') return L('station');
    return s;
  }

  function clockText(date) {
    return pad2(date.getHours()) + ':' + pad2(date.getMinutes());
  }

  function renderSidebar(snap) {
    var date = snap.date;
    setText('btc-orrery-clock', clockText(date));
    setText('btc-orrery-sun', '☉ ' + shortSign(snap.sunLon));
    setText('btc-orrery-moon', '☽ ' + shortSign(snap.moonLon));
    setText('btc-orrery-term', TERM_LABEL(snap));
    setText('btc-orrery-phase', snap.phase.name + ' ' + Math.round(snap.phase.illum * 100) + '%');

    var mini = document.getElementById('btc-orrery-mini');
    if (mini) { miniSnap = snap; drawOrrery3D(mini, snap, false, miniCam); }
  }

  function TERM_LABEL(snap) {
    return snap.term[0];
  }

  function applyLang() {
    var d = I18N[state.lang] || I18N.zh;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      if (d[k] !== undefined) el.textContent = d[k];
    });
    var box = document.getElementById('btc-orrery-lang');
    if (box) box.querySelectorAll('button').forEach(function (b) { b.classList.toggle('is-active', b.getAttribute('data-lang') === state.lang); });
  }

  function applyVisual() {
    var modal = document.getElementById('btc-orrery-modal');
    if (modal) {
      modal.classList.remove('visual-dusk', 'visual-deep');
      modal.classList.add('visual-frame');
    }
  }

  function setLang(lang) {
    state.lang = lang === 'en' ? 'en' : 'zh';
    try { localStorage.setItem('btc-orrery-lang', state.lang); } catch (e) {}
    applyLang();
    renderAll();
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function updateFocusHud(key) {
    var el = document.getElementById('btc-orrery-focus');
    if (!el) return;
    if (!key || !orrerySnap) { el.hidden = true; return; }
    var snap = orrerySnap, row = null;
    if (key === 'sun') row = { cn: '太阳', west: 'Sun', lon: snap.sunLon, dist: snap.sun.dist, status: '—' };
    else if (key === 'moon') row = { cn: '月亮', west: 'Moon', lon: snap.moonLon, dist: snap.moon.dist, status: '—' };
    else if (key === 'earth') row = { cn: '地球', west: 'Earth', lon: null, dist: null, status: '—' };
    else {
      var p = snap.planets.find(function (x) { return x.key === key; });
      if (p) row = { cn: p.cn, west: p.west, lon: p.lon, dist: p.dist, status: p.status };
    }
    if (!row) { el.hidden = true; return; }
    el.hidden = false;
    setText('btc-orrery-focus-name', state.lang === 'en' ? row.west : row.cn);
    var meta;
    if (row.lon != null && row.dist != null) {
      meta = signInfo(row.lon).text + ' · ' + mansionAt(row.lon, snap.date).name + '宿 · ' + formatDist(row.dist) + ' AU · ' + lightTime(row.dist) + (row.status !== '—' ? ' · ' + statusLabel(row.status) : '');
    } else {
      meta = state.lang === 'en' ? "Heliocentric · 1.000 AU · I'M HERE" : '日心轨道 · 1.000 AU · 博主在这里';
    }
    setText('btc-orrery-focus-meta', meta);
  }

  function renderPanel(snap) {
    setText('btc-orrery-date', dateText(snap.date));
    setText('btc-orrery-sub', clockText(snap.date) + ' · ' + snap.term[0] + ' · ' + snap.phase.name);
    setText('btc-orrery-term', snap.term[0]);
    var illumPct = Math.round(snap.phase.illum * 100);
    setText('btc-orrery-phase', state.lang === 'en' ? snap.phase.name + ' · ' + illumPct + '% illuminated' : snap.phase.name + ' · 照亮 ' + illumPct + '%');
    setText('btc-orrery-age', snap.phase.age.toFixed(1) + ' ' + L('ageUnit'));
    setText('btc-orrery-offset', state.live ? L('now') : (state.offset > 0 ? '+' : '') + state.offset.toFixed(2) + (state.lang === 'en' ? ' d' : ' 天'));

    var tbody = document.getElementById('btc-orrery-tbody');
    if (tbody) {
      var rows = [{
        cn: '太阳', west: 'Sun', glyph: '☉', color: '#e8b44a', lon: snap.sunLon,
        dist: snap.sun.dist, status: '—', mansion: mansionAt(snap.sunLon, snap.date)
      }, {
        cn: '月亮', west: 'Moon', glyph: '☽', color: '#c9d3dd', lon: snap.moonLon,
        dist: snap.moon.dist, status: '—', mansion: mansionAt(snap.moonLon, snap.date)
      }].concat(snap.planets.map(function (p) {
        return {
          cn: p.cn, west: p.west, glyph: p.glyph, color: p.color, lon: p.lon,
          dist: p.dist, status: p.status, mansion: mansionAt(p.lon, snap.date)
        };
      }));

      var html = '';
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var si = signInfo(r.lon);
        var statusText = r.status === '逆行' ? '℞ ' + L('retro') : statusLabel(r.status);
        var primary = state.lang === 'en' ? r.west : r.cn;
        var secondary = state.lang === 'en' ? r.cn : r.west;
        html += '<div class="btc-orrery-row">'
          + '<div class="who"><span class="btc-orrery-dot" style="--dot:' + r.color + '"></span><b>' + primary + '</b><em>' + secondary + '</em></div>'
          + '<div class="where"><b>' + si.text + '</b><span>' + r.mansion.name + '宿 · ' + r.mansion.group + '</span></div>'
          + '<div class="meta"><b>' + formatDist(r.dist) + ' AU</b><span>' + lightTime(r.dist) + ' · <i class="' + (r.status === '逆行' ? 'st-retro' : '') + '">' + statusText + '</i></span></div>'
          + '</div>';
      }
      tbody.innerHTML = html;
    }

    var canvas = document.getElementById('btc-orrery-canvas');
    if (canvas) {
      if (state.view === 'chart') drawChart(canvas, snap, true);
      else { orrerySnap = snap; drawOrrery3D(canvas, snap, true, orreryCam); }
      if (state.view === 'orrery') updateFocusHud(selectedKey);
    }
  }

  function renderAll() {
    applyLang();
    applyVisual();
    var snap = snapshot();
    if (document.getElementById('btc-orrery-mini')) renderSidebar(snap);
    if (state.open) renderPanel(snap);
    lastMini = Date.now();
  }

  /* ---------------- UI ---------------- */

  function isLinksPage() { return /\/links\/?$/.test(location.pathname); }

  var ENTRY_HTML = ''
    + '<div class="btc-orrery-entry-visual"><canvas id="btc-orrery-mini"></canvas></div>'
    + '<div class="btc-orrery-entry-copy">'
    + '  <span class="btc-orrery-kicker"><i></i>LIVE · 天象</span>'
    + '  <h2><span data-i18n="entryTitle">实时天象仪</span> <em>ORRERY</em></h2>'
    + '  <p data-i18n="entryDesc">太阳系 3D · 二十八宿 · 七政 · 黄道相位</p>'
    + '  <div class="btc-orrery-entry-meta"><span id="btc-orrery-sun">☉ —</span><span id="btc-orrery-moon">☽ —</span></div>'
    + '  <span class="btc-orrery-entry-cta" data-i18n="openEntry">打开全屏 3D ↗</span>'
    + '  <span class="btc-orrery-clock btc-orrery-entry-clock" id="btc-orrery-clock">--:--</span>'
    + '</div>';

  var CARD_HTML = ''
    + '<div class="btc-orrery-mini">'
    + '  <canvas id="btc-orrery-mini"></canvas>'
    + '  <span class="btc-orrery-live"><i></i>LIVE</span>'
    + '  <span class="btc-orrery-clock" id="btc-orrery-clock">--:--</span>'
    + '</div>'
    + '<div class="btc-orrery-card-foot">'
    + '  <span class="btc-orrery-caption"><span id="btc-orrery-sun">☉ —</span><span id="btc-orrery-moon">☽ —</span></span>'
    + '  <b data-i18n="open3d">打开 3D ↗</b>'
    + '</div>';

  var MODAL_HTML = ''
    + '<div class="btc-orrery-panel" role="document">'
    + '  <header class="btc-orrery-top">'
    + '    <div class="btc-orrery-heading">'
    + '      <span class="btc-orrery-sunmark"></span>'
    + '      <div><h2>天象仪 <em>ORRERY</em></h2><p id="btc-orrery-sub">实时 3D 轨道 · 二十八宿 · 七政</p></div>'
    + '    </div>'
    + '    <div class="btc-orrery-menu" id="btc-orrery-menu">'
    + '      <button type="button" class="btc-orrery-menu-btn" aria-label="Settings">⋯</button>'
    + '      <div class="btc-orrery-menu-pop" hidden>'
    + '        <div class="btc-orrery-menu-row"><span data-i18n="language">语言</span><div class="btc-orrery-lang" id="btc-orrery-lang" role="group" aria-label="Language"><button type="button" data-lang="zh" class="is-active">中</button><button type="button" data-lang="en">EN</button></div></div>'
    + '        <div class="btc-orrery-menu-row"><span data-i18n="orbitScale">轨道比例</span><label class="btc-orrery-scale" title="轨道比例"><span class="btc-orrery-scale-label is-on" data-scale-label="compressed" data-i18n="compressed">压缩</span><input type="checkbox" id="btc-orrery-scale-input" aria-label="真实轨道比例"><i class="btc-orrery-scale-track"></i><span class="btc-orrery-scale-label" data-scale-label="true" data-i18n="trueScale">真实</span></label></div>'
    + '      </div>'
    + '    </div>'
    + '    <div class="btc-orrery-seg" role="tablist" aria-label="视图">'
    + '      <button type="button" data-view="orrery" class="is-active" data-i18n="orreryTab">3D</button>'
    + '      <button type="button" data-view="chart" data-i18n="chartTab">天象盘</button>'
    + '    </div>'
    + '    <button type="button" class="btc-orrery-close" aria-label="关闭">×</button>'
    + '  </header>'
    + '  <div class="btc-orrery-body is-orrery">'
    + '    <section class="btc-orrery-stage is-orrery">'
    + '      <canvas id="btc-orrery-canvas"></canvas>'
    + '      <div class="btc-orrery-focus" id="btc-orrery-focus" hidden><span class="btc-orrery-focus-kicker">SELECTED</span><b id="btc-orrery-focus-name">—</b><span id="btc-orrery-focus-meta">—</span></div>'
    + '      <div class="btc-orrery-layers">'
    + '        <label><input type="checkbox" data-layer="cn" checked><span data-i18n="layersCn">中国传统</span></label>'
    + '        <label><input type="checkbox" data-layer="west" checked><span data-i18n="layersWest">西方占星</span></label>'
    + '        <label><input type="checkbox" data-layer="sci" checked><span data-i18n="layersSci">现代科学</span></label>'
    + '      </div>'
    + '      <div class="btc-orrery-timebar">'
    + '        <button type="button" id="btc-orrery-live" class="is-live"><i></i><span data-i18n="live">实时</span></button>'
    + '        <input id="btc-orrery-slider" type="range" min="-30" max="30" step="0.25" value="0" aria-label="时间偏移">'
    + '        <output id="btc-orrery-offset">此刻</output>'
    + '      </div>'
    + '    </section>'
    + '    <aside class="btc-orrery-info">'
    + '      <div class="btc-orrery-now">'
    + '        <div class="btc-orrery-date" id="btc-orrery-date">—</div>'
    + '        <div class="btc-orrery-nowrow"><span data-i18n="term">节气</span><b id="btc-orrery-term">—</b></div>'
    + '        <div class="btc-orrery-nowrow"><span data-i18n="phase">月相</span><b id="btc-orrery-phase">—</b></div>'
    + '        <div class="btc-orrery-nowrow"><span data-i18n="age">月龄</span><b id="btc-orrery-age">—</b></div>'
    + '      </div>'
    + '      <div class="btc-orrery-tablewrap">'
    + '        <div class="btc-orrery-ledgerhead"><span data-i18n="body">天体</span><span data-i18n="position">黄道位置</span><span data-i18n="distanceStatus">距离 · 状态</span></div>'
    + '        <div class="btc-orrery-ledger" id="btc-orrery-tbody"></div>'
    + '      </div>'
    + '      <p class="btc-orrery-note" data-i18n="note">JPL 近似根数（1800–2050）· 低精度月球 · 几何黄经（未做光行时/章动）。二十八宿为文化映射；轨道默认压缩，可切换真实比例。</p>'
    + '    </aside>'
    + '  </div>'
    + '</div>';

  function mountCard() {
    if (document.getElementById('btc-orrery-card')) return true;
    if (isLinksPage()) return mountLinksEntry();
    var host = document.querySelector('.sidebar-blogroll') || document.querySelector('.site-overview-wrap');
    if (!host) return false;

    var card = document.createElement('div');
    card.className = 'btc-orrery-card';
    card.id = 'btc-orrery-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', '打开全屏 3D 天象仪');
    card.innerHTML = CARD_HTML;
    host.appendChild(card);

    card.addEventListener('click', openModal);
    card.addEventListener('pointerenter', startMiniLoop);
    card.addEventListener('pointerleave', stopMiniLoop);
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(); }
    });

    renderAll();
    return true;
  }

  function mountLinksEntry() {
    if (document.getElementById('btc-orrery-links-entry')) return true;
    var grid = document.querySelector('.friend-grid');
    if (!grid || !grid.parentNode) return false;

    var entry = document.createElement('div');
    entry.className = 'btc-orrery-entry';
    entry.id = 'btc-orrery-links-entry';
    entry.setAttribute('role', 'button');
    entry.setAttribute('tabindex', '0');
    entry.setAttribute('aria-label', '打开全屏 3D 天象仪');
    entry.innerHTML = ENTRY_HTML;
    grid.parentNode.insertBefore(entry, grid.nextSibling);

    entry.addEventListener('click', openModal);
    entry.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(); }
    });
    entry.addEventListener('pointerenter', startMiniLoop);
    entry.addEventListener('pointerleave', stopMiniLoop);

    renderAll();
    return true;
  }

  function ensureModal() {
    if (els.modal) return;
    var modal = document.createElement('div');
    modal.className = 'btc-orrery-modal';
    modal.id = 'btc-orrery-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', '实时天象仪');
    modal.innerHTML = MODAL_HTML;
    document.body.appendChild(modal);
    els.modal = modal;

    var canvas = modal.querySelector('#btc-orrery-canvas');
    els.canvas = canvas;
    attach3DControls(canvas);

    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });
    modal.querySelector('.btc-orrery-close').addEventListener('click', closeModal);

    var menu = modal.querySelector('#btc-orrery-menu');
    var menuBtn = menu && menu.querySelector('.btc-orrery-menu-btn');
    var menuPop = menu && menu.querySelector('.btc-orrery-menu-pop');
    if (menuBtn && menuPop) {
      menuBtn.addEventListener('click', function (e) { e.stopPropagation(); menuPop.hidden = !menuPop.hidden; });
      modal.addEventListener('click', function (e) { if (!menu.contains(e.target)) menuPop.hidden = true; });
    }

    var langBox = modal.querySelector('#btc-orrery-lang');
    if (langBox) {
      langBox.addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (b) setLang(b.getAttribute('data-lang'));
      });
    }

    var scaleInput = modal.querySelector('#btc-orrery-scale-input');
    if (scaleInput) {
      scaleInput.addEventListener('change', function () {
        state.trueScale = scaleInput.checked;
        modal.querySelectorAll('.btc-orrery-scale-label').forEach(function (label) {
          var isTrue = label.getAttribute('data-scale-label') === 'true';
          label.classList.toggle('is-on', isTrue === state.trueScale);
        });
        renderAll();
      });
    }

    modal.querySelectorAll('.btc-orrery-seg button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.view = btn.getAttribute('data-view');
        modal.querySelectorAll('.btc-orrery-seg button').forEach(function (b) { b.classList.toggle('is-active', b === btn); });
        modal.querySelector('.btc-orrery-stage').classList.toggle('is-orrery', state.view === 'orrery');
        modal.querySelector('.btc-orrery-body').classList.toggle('is-orrery', state.view === 'orrery');
        renderAll();
        requestAnimationFrame(function () { if (state.open) renderAll(); });
        if (state.view === 'orrery') start3dLoop(); else stop3dLoop();
      });
    });

    modal.querySelectorAll('input[data-layer]').forEach(function (input) {
      input.addEventListener('change', function () {
        state.layers[input.getAttribute('data-layer')] = input.checked;
        renderAll();
      });
    });

    var slider = modal.querySelector('#btc-orrery-slider');
    var liveBtn = modal.querySelector('#btc-orrery-live');

    function pulseLive() {
      if (!liveBtn) return;
      liveBtn.classList.remove('is-snapping');
      void liveBtn.offsetWidth;
      liveBtn.classList.add('is-snapping');
      setTimeout(function () { liveBtn.classList.remove('is-snapping'); }, 430);
    }

    function setLive(play) {
      state.offset = 0;
      state.live = true;
      slider.value = '0';
      if (liveBtn) liveBtn.classList.add('is-live');
      if (play) pulseLive();
      renderAll();
    }

    slider.addEventListener('input', function () {
      var v = parseFloat(slider.value);
      if (Math.abs(v) <= 0.30) {
        setLive(false);
        pulseLive();
        return;
      }
      state.offset = v;
      state.live = false;
      if (liveBtn) liveBtn.classList.remove('is-live');
      renderAll();
    });

    slider.addEventListener('change', function () {
      if (Math.abs(parseFloat(slider.value)) <= 0.45) setLive(true);
    });

    liveBtn.addEventListener('click', function () { setLive(true); });

    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () {
        if (state.open) renderAll();
      });
      ro.observe(modal.querySelector('.btc-orrery-stage'));
    }
  }

  function openModal() {
    ensureModal();
    state.open = true;
    if (state.view === 'orrery') { orreryCam.dist = 4.7; camIntroStart = performance.now(); }
    stopMiniLoop();
    els.modal.classList.add('is-open');
    document.documentElement.classList.add('btc-orrery-locked');
    renderAll();
    setTimeout(function () {
      renderAll();
    }, 60);
    if (state.view === 'orrery') start3dLoop();
    els.modal.querySelector('.btc-orrery-close').focus({ preventScroll: true });
  }

  function closeModal() {
    if (!els.modal) return;
    state.open = false;
    stop3dLoop();
    els.modal.classList.remove('is-open');
    document.documentElement.classList.remove('btc-orrery-locked');
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && state.open) closeModal();
  });

  function boot() {
    var tries = 0;
    function attempt() {
      if (mountCard()) return;
      if (++tries < 40) setTimeout(attempt, 120);
    }
    attempt();

    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onScheme = function () { renderAll(); };
      if (mq.addEventListener) mq.addEventListener('change', onScheme);
      else if (mq.addListener) mq.addListener(onScheme);
    }

    setInterval(function () {
      if (document.hidden) return;
      var snap = snapshot();
      if (document.getElementById('btc-orrery-card')) renderSidebar(snap);
      if (state.open && Date.now() - lastMini > 30000) renderPanel(snap);
    }, 30000);

    if (location.hash === '#orrery') {
      setTimeout(openModal, 160);
    }

    window.addEventListener('resize', function () {
      if (document.getElementById('btc-orrery-card')) {
        var mini = document.getElementById('btc-orrery-mini');
        if (mini) drawChart(mini, snapshot(), false);
      }
      if (state.open) renderAll();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
