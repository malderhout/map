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
    async function setupAnimatedRadar() {
        try {
            const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
            const data = await response.json();
            radarFrames = data.radar.past.map(frame => 
                L.tileLayer(`https://tilecache.rainviewer.com${frame.path}/256/{z}/{x}/{y}/2/1_1.png`, {
                    opacity: 0, zIndex: frame.time
                })
            );
        } catch (error) { console.error("Kon regenradar data niet laden:", error); }
    }
    function playRadarAnimation() {
        if (radarTimer) clearInterval(radarTimer);
        let currentFrameIndex = 0;
        radarTimer = setInterval(() => {
            radarFrames.forEach(frame => frame.setOpacity(0));
            const currentFrame = radarFrames[currentFrameIndex];
            if (map.hasLayer(rainLayerGroup)) { currentFrame.setOpacity(0.7); }
            currentFrameIndex = (currentFrameIndex + 1) % radarFrames.length;
        }, 500);
    }
    function stopRadarAnimation() { if (radarTimer) clearInterval(radarTimer); }

    // --- ANDERE WEER-OVERLAYS ---
    const cloudsLayer = L.tileLayer(`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${apiKey_OpenWeather}`, { opacity: 0.8 });
    const windLayer = L.layerGroup();
    const tempLayer = L.layerGroup();
    const uvLayer = L.layerGroup();

    // --- DATA OPHALEN ---
    (async () => {
        try {
            const response = await fetch('/capitals.json');
            if (!response.ok) throw new Error('capitals.json niet gevonden.');
            const capitals = await response.json();
            loader.style.display = 'none';

            capitals.forEach(city => {
                if (!city.lat || !city.lon) return;

                // 1. Haal Temp & Wind op van OpenWeatherMap
                fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lon}&appid=${apiKey_OpenWeather}&units=metric`)
                    .then(res => res.json())
                    .then(data => {
                        if (!data || !data.main) return;
                        const tempIcon = L.divIcon({ className: 'temp-label', html: `${data.main.temp.toFixed(1)}°C` });
                        L.marker([city.lat, city.lon], { icon: tempIcon }).addTo(tempLayer);
                        
                        const windSpeed = (data.wind.speed * 3.6).toFixed(1);
                        const windArrow = getWindArrow(data.wind.deg);
                        const windIcon = L.divIcon({ className: 'wind-label', html: `<b>${windArrow}</b> ${windSpeed} km/u` });
                        L.marker([city.lat, city.lon], { icon: windIcon }).addTo(windLayer);
                    }).catch(() => {});

                // 2. Haal UV Index op van OpenUV
                fetch(`https://api.openuv.io/api/v1/uv?lat=${city.lat}&lng=${city.lon}`, {
                    headers: { 'x-access-token': apiKey_OpenUV }
                })
                    .then(res => res.json())
                    .then(data