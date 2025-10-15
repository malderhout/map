document.addEventListener('DOMContentLoaded', async function () {
    const loader = document.getElementById('loader');
    const apiKey = '861b5db9ba1f7251f5499a739b4977e3';

    // --- BASISKAARTEN ---
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Satellietbeeld'
    });

    // --- KAART INITIALISATIE ---
    const map = L.map('map', { center: [20, 0], zoom: 2, layers: [satelliteLayer] });

    // --- HULPFUNCTIES ---
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

    // --- 🌧️ GEANIMEERDE REGENRADAR ---
    const rainLayerGroup = L.layerGroup();
    let radarFrames = [], radarTimer = null;
    async function setupAnimatedRadar() { /* ... bestaande code ... */ }
    function playRadarAnimation() { /* ... bestaande code ... */ }
    function stopRadarAnimation() { /* ... bestaande code ... */ }
    // De inhoud van de radarfuncties is ongewijzigd en hier weggelaten voor de beknoptheid.

    // --- ANDERE WEER-OVERLAYS ---
    const cloudsLayer = L.tileLayer(`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${apiKey}`, { opacity: 0.8 });
    const windLayer = L.layerGroup();
    const tempLayer = L.layerGroup();
    const uvLayer = L.layerGroup(); // Nieuwe laag voor UV Index

    // --- DATA OPHALEN EN MARKERS TOEVOEGEN ---
    (async () => {
        try {
            const response = await fetch('capitals.json');
            if (!response.ok) throw new Error('Bestand capitals.json niet gevonden.');
            const capitals = await response.json();
            
            loader.style.display = 'none';

            capitals.forEach(city => {
                if (!city.lat || !city.lon) return;
                // Gebruik de One Call API om alle data in één keer te krijgen
                fetch(`https://api.openweathermap.org/data/3.0/onecall?lat=${city.lat}&lon=${city.lon}&exclude=minutely,hourly,daily,alerts&appid=${apiKey}&units=metric`)
                    .then(res => res.json())
                    .then(data => {
                        if (!data || !data.current) return;
                        const current = data.current;

                        // Maak temperatuurmarker
                        const tempIcon = L.divIcon({ className: 'temp-label', html: `${current.temp.toFixed(1)}°C` });
                        L.marker([city.lat, city.lon], { icon: tempIcon }).addTo(tempLayer);
                        
                        // Maak windmarker
                        const windSpeed = (current.wind_speed * 3.6).toFixed(1);
                        const windArrow = getWindArrow(current.wind_deg);
                        const windIcon = L.divIcon({ className: 'wind-label', html: `<b>${windArrow}</b> ${windSpeed} km/u` });
                        L.marker([city.lat, city.lon], { icon: windIcon }).addTo(windLayer);

                        // Maak UV Index marker
                        const uvValue = current.uvi.toFixed(1);
                        const uvClass = getUvClass(current.uvi);
                        const uvIcon = L.divIcon({ className: `uv-label ${uvClass}`, html: `<b>${uvValue}</b>` });
                        L.marker([city.lat, city.lon], { icon: uvIcon }).addTo(uvLayer);

                    }).catch(() => {});
            });
        } catch (error) {
            loader.innerText = 'Fout: Kon capitals.json niet laden.';
            console.error(error);
        }
    })();
    
    // --- LAYER CONTROL (met UV Index toegevoegd) ---
    const baseMaps = { "Standaard Kaart": osmLayer, "Satelliet": satelliteLayer };
    const overlayMaps = {
        "🌧️ Regenradar (geanimeerd)": rainLayerGroup,
        "🌡️ Temperatuur": tempLayer,
        "💨 Wind": windLayer,
        "☀️ UV Index": uvLayer, // Nieuwe laag hier toegevoegd
        "☁️ Wolkendekking": cloudsLayer
    };

    L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);

    // --- EVENT LISTENERS VOOR ANIMATIE ---
    map.on('overlayadd', e => { if (e.layer === rainLayerGroup) { radarFrames.forEach(f => f.addTo(rainLayerGroup)); playRadarAnimation(); }});
    map.on('overlayremove', e => { if (e.layer === rainLayerGroup) { stopRadarAnimation(); rainLayerGroup.clearLayers(); }});

    setupAnimatedRadar();
});