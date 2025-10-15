// Helper function to load a script dynamically and return a promise
function loadScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Main application logic, wrapped in an async function
async function main() {
    // First, await the loading of the plugin. This guarantees it's ready.
    await loadScript('https://cdn.jsdelivr.net/npm/leaflet-terminator/L.Terminator.js');

    // Now that the plugin is loaded, the rest of the application can run safely.
    const loader = document.getElementById('loader');
    
    const apiKey_OpenWeather = import.meta.env.VITE_API_KEY_OPENWEATHER;
    const apiKey_OpenUV = import.meta.env.VITE_API_KEY_OPENUV;

    if (!apiKey_OpenWeather || !apiKey_OpenUV) {
        alert('API sleutels zijn niet correct geladen. Controleer de omgevingsvariabelen.');
    }

    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' });
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles &copy; Esri' });

    const map = L.map('map', { center: [20, 0], zoom: 2, layers: [satelliteLayer] });

    // This line will now work without errors
    const dayNightLayer = L.terminator();

    // The rest of your application code remains the same...
    const rainLayerGroup = L.layerGroup();
    const cloudsLayer = L.tileLayer(`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${apiKey_OpenWeather}`, { opacity: 0.8 });
    const windLayer = L.layerGroup();
    const tempLayer = L.layerGroup();
    const uvLayer = L.layerGroup();

    const baseMaps = { "Standaard Kaart": osmLayer, "Satelliet": satelliteLayer };
    const overlayMaps = {
        "☀️ Dag & Nacht 🌑": dayNightLayer,
        "🌧️ Regenradar (geanimeerd)": rainLayerGroup,
        "🌡️ Temperatuur": tempLayer,
        "💨 Wind": windLayer,
        "☀️ UV Index": uvLayer,
        "☁️ Wolkendekking": cloudsLayer
    };

    L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);

    // --- All other functions (getWindArrow, getUvClass, radar setup, data fetching) remain unchanged ---

    function getWindArrow(degrees) {
        const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
        return arrows[Math.round(degrees / 45) % 8];
    }
    function getUvClass(uvi) {
        const uviValue = Math.round(uvi);
        if (uviValue <= 2) return 'uv-low';
        if (uviValue <= 5) return 'uv-moderate';
        if (uviValue <= 7) return 'uv-high';
        if (uviValue <= 10) return 'uv-very-high';
        return 'uv-extreme';
    }
    let radarFrames = [], radarTimer = null;
    async function setupAnimatedRadar() {
        try { const response = await fetch('https://api.rainviewer.com/public/weather-maps.json'); const data = await response.json(); radarFrames = data.radar.past.map(frame => L.tileLayer(`https://tilecache.rainviewer.com${frame.path}/256/{z}/{x}/{y}/2/1_1.png`, { opacity: 0, zIndex: frame.time })); } catch (error) { console.error("Kon regenradar data niet laden:", error); }
    }
    function playRadarAnimation() { if (radarTimer) clearInterval(radarTimer); let currentFrameIndex = 0; radarTimer = setInterval(() => { radarFrames.forEach(frame => frame.setOpacity(0)); const currentFrame = radarFrames[currentFrameIndex]; if (map.hasLayer(rainLayerGroup)) { currentFrame.setOpacity(0.7); } currentFrameIndex = (currentFrameIndex + 1) % radarFrames.length; }, 500); }
    function stopRadarAnimation() { if (radarTimer) clearInterval(radarTimer); }
    (async () => { try { const response = await fetch('/capitals.json'); if (!response.ok) throw new Error('capitals.json niet gevonden.'); const capitals = await response.json(); loader.style.display = 'none'; capitals.forEach(city => { if (!city.lat || !city.lon) return; fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lon}&appid=${apiKey_OpenWeather}&units=metric`).then(res => res.json()).then(data => { if (!data || !data.main) return; const tempIcon = L.divIcon({ className: 'temp-label', html: `${data.main.temp.toFixed(1)}°C` }); L.marker([city.lat, city.lon], { icon: tempIcon }).addTo(tempLayer); const windSpeed = (data.wind.speed * 3.6).toFixed(1); const windArrow = getWindArrow(data.wind.deg); const windIcon = L.divIcon({ className: 'wind-label', html: `<b>${windArrow}</b> ${windSpeed} km/u` }); L.marker([city.lat, city.lon], { icon: windIcon }).addTo(windLayer); }).catch(() => {}); fetch(`https://api.openuv.io/api/v1/uv?lat=${city.lat}&lng=${city.lon}`, { headers: { 'x-access-token': apiKey_OpenUV } }).then(res => res.json()).then(data => { if (!data || !data.result) return; const uvValue = data.result.uv.toFixed(1); const uvClass = getUvClass(data.result.uv); const uvIcon = L.divIcon({ className: `uv-label ${uvClass}`, html: `<b>${uvValue}</b>` }); L.marker([city.lat, city.lon], { icon: uvIcon }).addTo(uvLayer); }).catch(() => {}); }); } catch (error) { loader.innerText = 'Fout: Kon capitals.json niet laden.'; console.error(error); } })();
    map.on('overlayadd', e => { if (e.layer === rainLayerGroup) { radarFrames.forEach(f => f.addTo(rainLayerGroup)); playRadarAnimation(); }});
    map.on('overlayremove', e => { if (e.layer === rainLayerGroup) { stopRadarAnimation(); rainLayerGroup.clearLayers(); }});
    setupAnimatedRadar();
}

// Start the main application logic
main();