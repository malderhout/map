import 'leaflet-terminator'; // <-- NIEUW: Voeg deze regel bovenaan toe

document.addEventListener('DOMContentLoaded', async function () {
    const loader = document.getElementById('loader');
    
    // API-sleutels veilig inladen vanuit de omgevingsvariabelen
    const apiKey_OpenWeather = import.meta.env.VITE_API_KEY_OPENWEATHER;
    const apiKey_OpenUV = import.meta.env.VITE_API_KEY_OPENUV;

    if (!apiKey_OpenWeather || !apiKey_OpenUV) {
        alert('API sleutels zijn niet correct geladen. Controleer de omgevingsvariabelen op je hostingplatform.');
    }

    // --- BASISKAARTEN ---
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' });
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles &copy; Esri' });

    // --- KAART INITIALISATIE ---
    const map = L.map('map', { center: [20, 0], zoom: 2, layers: [satelliteLayer] });

    // --- HULPFUNCTIES ---
    function getWindArrow(degrees) { /* ... ongewijzigd ... */ }
    function getUvClass(uvi) { /* ... ongewijzigd ... */ }

    // --- 🌧️ GEANIMEERDE REGENRADAR ---
    const rainLayerGroup = L.layerGroup();
    // ... de volledige radar-code blijft ongewijzigd ...

    // --- ANDERE WEER-OVERLAYS ---
    const cloudsLayer = L.tileLayer(`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${apiKey_OpenWeather}`, { opacity: 0.8 });
    const windLayer = L.layerGroup();
    const tempLayer = L.layerGroup();
    const uvLayer = L.layerGroup();
    
    // NIEUW: Maak de dag/nacht-laag aan
    const dayNightLayer = L.terminator();

    // --- DATA OPHALEN ---
    // ... de volledige data-ophalen code blijft ongewijzigd ...
    
    // --- LAYER CONTROL ---
    const baseMaps = { "Standaard Kaart": osmLayer, "Satelliet": satelliteLayer };
    const overlayMaps = {
        "☀️ Dag & Nacht 🌑": dayNightLayer, // NIEUW: Hier toegevoegd
        "🌧️ Regenradar (geanimeerd)": rainLayerGroup,
        "🌡️ Temperatuur": tempLayer,
        "💨 Wind": windLayer,
        "☀️ UV Index": uvLayer,
        "☁️ Wolkendekking": cloudsLayer
    };

    L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);

    // --- EVENT LISTENERS ---
    // ... de volledige event-listener code blijft ongewijzigd ...

    // --- Oude code voor de volledigheid ---
    // (De functies hieronder zijn ingeklapt omdat ze niet veranderd zijn)
    async function setupAnimatedRadar() {
        try { const response = await fetch('https://api.rainviewer.com/public/weather-maps.json'); const data = await response.json(); radarFrames = data.radar.past.map(frame => L.tileLayer(`https://tilecache.rainviewer.com${frame.path}/256/{z}/{x}/{y}/2/1_1.png`, { opacity: 0, zIndex: frame.time })); } catch (error) { console.error("Kon regenradar data niet laden:", error); }
    }
    function playRadarAnimation() { if (radarTimer) clearInterval(radarTimer); let currentFrameIndex = 0; radarTimer = setInterval(() => { radarFrames.forEach(frame => frame.setOpacity(0)); const currentFrame = radarFrames[currentFrameIndex]; if (map.hasLayer(rainLayerGroup)) { currentFrame.setOpacity(0.7); } currentFrameIndex = (currentFrameIndex + 1) % radarFrames.length; }, 500); }
    function stopRadarAnimation() { if (radarTimer) clearInterval(radarTimer); }
    (async () => { try { const response = await fetch('/capitals.json'); if (!response.ok) throw new Error('capitals.json niet gevonden.'); const capitals = await response.json(); loader.style.display = 'none'; capitals.forEach(city => { if (!city.lat || !city.lon) return; fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lon}&appid=${apiKey_OpenWeather}&units=metric`).then(res => res.json()).then(data => { if (!data || !data.main) return; const tempIcon = L.divIcon({ className: 'temp-label', html: `${data.main.temp.toFixed(1)}°C` }); L.marker([city.lat, city.lon], { icon: tempIcon }).addTo(tempLayer); const windSpeed = (data.wind.speed * 3.6).toFixed(1); const windArrow = getWindArrow(data.wind.deg); const windIcon = L.divIcon({ className: 'wind-label', html: `<b>${windArrow}</b> ${windSpeed} km/u` }); L.marker([city.lat, city.lon], { icon: windIcon }).addTo(windLayer); }).catch(() => {}); fetch(`https://api.openuv.io/api/v1/uv?lat=${city.lat}&lng=${city.lon}`, { headers: { 'x-access-token': apiKey_OpenUV } }).then(res => res.json()).then(data => { if (!data || !data.result) return; const uvValue = data.result.uv.toFixed(1); const uvClass = getUvClass(data.result.uv); const uvIcon = L.divIcon({ className: `uv-label ${uvClass}`, html: `<b>${uvValue}</b>` }); L.marker([city.lat, city.lon], { icon: uvIcon }).addTo(uvLayer); }).catch(() => {}); }); } catch (error) { loader.innerText = 'Fout: Kon capitals.json niet laden.'; console.error(error); } })();
    map.on('overlayadd', e => { if (e.layer === rainLayerGroup) { radarFrames.forEach(f => f.addTo(rainLayerGroup)); playRadarAnimation(); }});
    map.on('overlayremove', e => { if (e.layer === rainLayerGroup) { stopRadarAnimation(); rainLayerGroup.clearLayers(); }});
    setupAnimatedRadar();
});