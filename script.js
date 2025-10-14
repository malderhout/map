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
    const map = L.map('map', {
        center: [20, 0],
        zoom: 2,
        layers: [satelliteLayer]
    });

    // --- HULPFUNCTIES ---
    function getWindArrow(degrees) {
        const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
        return arrows[Math.round(degrees / 45) % 8];
    }

    // --- 🌧️ GEANIMEERDE REGENRADAR ---
    const rainLayerGroup = L.layerGroup();
    let radarFrames = [];
    let radarTimer = null;
    
    async function setupAnimatedRadar() {
        try {
            const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
            const data = await response.json();
            const pastFrames = data.radar.past;
            radarFrames = pastFrames.map(frame => 
                L.tileLayer(`https://tilecache.rainviewer.com${frame.path}/256/{z}/{x}/{y}/2/1_1.png`, {
                    opacity: 0,
                    zIndex: frame.time
                })
            );
        } catch (error) {
            console.error("Kon regenradar data niet laden:", error);
        }
    }

    function playRadarAnimation() {
        if (radarTimer) clearInterval(radarTimer);
        let currentFrameIndex = 0;
        radarTimer = setInterval(() => {
            radarFrames.forEach(frame => frame.setOpacity(0));
            const currentFrame = radarFrames[currentFrameIndex];
            if (map.hasLayer(rainLayerGroup)) {
                 currentFrame.setOpacity(0.7);
            }
            currentFrameIndex = (currentFrameIndex + 1) % radarFrames.length;
        }, 500);
    }

    function stopRadarAnimation() {
        if (radarTimer) clearInterval(radarTimer);
    }

    // --- ANDERE WEER-OVERLAYS ---
    const cloudsLayer = L.tileLayer(`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${apiKey}`, { opacity: 0.8 });
    const windLayer = L.layerGroup();
    windLayer.addLayer(L.tileLayer(`https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${apiKey}`, { opacity: 0.6 }));
    const tempLayer = L.layerGroup();
    tempLayer.addLayer(L.tileLayer(`https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${apiKey}`, { opacity: 0.5 }));

    // --- DATA OPHALEN EN MARKERS TOEVOEGEN ---
    (async () => {
        try {
            const response = await fetch('capitals.json');
            if (!response.ok) throw new Error('Bestand capitals.json niet gevonden.');
            const capitals = await response.json();
            
            loader.style.display = 'none';

            capitals.forEach(city => {
                if (!city.lat || !city.lon) return;
                fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lon}&appid=${apiKey}&units=metric`)
                    .then(res => res.json())
                    .then(data => {
                        if (!data || !data.main) return;
                        
                        // Maak temperatuurmarker ZONDER plaatsnaam
                        const temp = data.main.temp.toFixed(1);
                        const tempIcon = L.divIcon({ className: 'temp-label', html: `<b>${temp}°C</b>` });
                        L.marker([city.lat, city.lon], { icon: tempIcon }).addTo(tempLayer);
                        
                        // Maak windmarker
                        const windSpeed = (data.wind.speed * 3.6).toFixed(1);
                        const windArrow = getWindArrow(data.wind.deg);
                        const windIcon = L.divIcon({ className: 'wind-label', html: `<b>${windArrow}</b> ${windSpeed} km/u` });
                        L.marker([city.lat, city.lon], { icon: windIcon }).addTo(windLayer);
                    }).catch(() => {});
            });
        } catch (error) {
            loader.innerText = 'Fout: Kon capitals.json niet laden.';
            console.error(error);
        }
    })();
    
    // --- LAYER CONTROL ---
    const baseMaps = { "Standaard Kaart": osmLayer, "Satelliet": satelliteLayer };
    const overlayMaps = {
        "🌧️ Regenradar (geanimeerd)": rainLayerGroup,
        "🌡️ Temperatuur (Wereld)": tempLayer,
        "☁️ Wolkendekking": cloudsLayer,
        "💨 Wind (Wereld)": windLayer
    };

    L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);

    // --- EVENT LISTENERS VOOR ANIMATIE ---
    map.on('overlayadd', function(e) {
        if (e.layer === rainLayerGroup) {
            radarFrames.forEach(frame => frame.addTo(rainLayerGroup));
            playRadarAnimation();
        }
    });

    map.on('overlayremove', function(e) {
        if (e.layer === rainLayerGroup) {
            stopRadarAnimation();
            rainLayerGroup.clearLayers();
        }
    });

    setupAnimatedRadar();
});