// Elementos DOM
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const errorMessage = document.getElementById('error-message');
const currentWeatherSection = document.getElementById('current-weather-section');
const demoNotice = document.getElementById('demo-notice');
const apiKeyLink = document.getElementById('api-key-link');

// Elementos de datos actuales
const weatherIcon = document.getElementById('weather-icon');
const temperature = document.getElementById('temperature');
const weatherDescription = document.getElementById('weather-description');
const feelsLike = document.getElementById('feels-like');
const humidity = document.getElementById('humidity');
const pressure = document.getElementById('pressure');
const windSpeed = document.getElementById('wind-speed');
const statsContainer = document.getElementById('stats-container');

// Charts
let forecastChart = null;
let historicalChart = null;

// Event Listeners
searchBtn.addEventListener('click', fetchWeatherData);
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') fetchWeatherData();
});

// Verificar si estamos en modo demo
fetch('/api/weather/current/Madrid')
    .then(response => response.json())
    .then(data => {
        if (data.city === "Madrid" && data.country === "Demo") {
            demoNotice.style.display = 'block';
        }
    });

// Cargar datos iniciales
window.addEventListener('load', fetchWeatherData);

// Función principal para obtener datos
function fetchWeatherData() {
    const city = cityInput.value.trim();
    if (!city) {
        showError('Por favor, ingresa el nombre de una ciudad');
        return;
    }
    
    // Ocultar error
    hideError();
    
    // Mostrar loading
    showLoading();
    
    // Obtener datos actuales
    fetch(`/api/weather/current/${city}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showError(data.error);
                return;
            }
            displayCurrentWeather(data);
            return fetch(`/api/weather/forecast/${city}`);
        })
        .then(response => response ? response.json() : Promise.reject())
        .then(data => {
            if (data.error) {
                showError(data.error);
                return;
            }
            displayForecast(data);
            return fetch(`/api/weather/historical/${city}`);
        })
        .then(response => response ? response.json() : Promise.reject())
        .then(data => {
            if (data.error) {
                showError(data.error);
                return;
            }
            displayHistoricalData(data);
        })
        .catch(error => {
            console.error('Error:', error);
            showError('Error al obtener los datos. Intenta nuevamente.');
        })
        .finally(() => {
            // Ocultar loading
            hideLoading();
        });
}

function displayCurrentWeather(data) {
    currentWeatherSection.style.display = 'block';
    weatherIcon.src = `http://openweathermap.org/img/wn/${data.icon}@2x.png`;
    weatherIcon.alt = data.description;
    temperature.textContent = `${data.temperature}°C`;
    weatherDescription.textContent = data.description;
    feelsLike.textContent = `${data.feels_like}°C`;
    humidity.textContent = `${data.humidity}%`;
    pressure.textContent = `${data.pressure} hPa`;
    windSpeed.textContent = `${data.wind_speed} m/s`;
}

function displayForecast(data) {
    // Preparar datos para el gráfico
    const labels = data.forecasts
        .filter((_, index) => index % 2 === 0) // Tomar cada segundo registro para no saturar
        .map(forecast => {
            const date = new Date(forecast.datetime);
            return date.toLocaleDateString('es-ES', { 
                weekday: 'short', 
                day: 'numeric', 
                month: 'short',
                hour: '2-digit'
            });
        });
        
    const temperatures = data.forecasts
        .filter((_, index) => index % 2 === 0)
        .map(forecast => forecast.temperature);
    
    // Destruir gráfico anterior si existe
    if (forecastChart) {
        forecastChart.destroy();
    }
    
    // Crear nuevo gráfico
    const ctx = document.getElementById('forecast-chart').getContext('2d');
    forecastChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Temperatura (°C)',
                data: temperatures,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Pronóstico de 5 días para ${data.city}, ${data.country}`
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'Temperatura (°C)'
                    }
                }
            }
        }
    });
    
    // Mostrar estadísticas
    displayStatistics(data.statistics);
}

function displayHistoricalData(data) {
    // Preparar datos para el gráfico
    const labels = data.historical_data.map(item => {
        const date = new Date(item.date);
        return date.toLocaleDateString('es-ES', { 
            day: 'numeric', 
            month: 'short'
        });
    });
    
    const temperatures = data.historical_data.map(item => item.temperature);
    const humidity = data.historical_data.map(item => item.humidity);
    
    // Destruir gráfico anterior si existe
    if (historicalChart) {
        historicalChart.destroy();
    }
    
    // Crear nuevo gráfico
    const ctx = document.getElementById('historical-chart').getContext('2d');
    historicalChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Temperatura (°C)',
                    data: temperatures,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    borderWidth: 2,
                    yAxisID: 'y',
                    fill: true,
                    tension: 0.2
                },
                {
                    label: 'Humedad (%)',
                    data: humidity,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 2,
                    yAxisID: 'y1',
                    fill: true,
                    tension: 0.2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Datos históricos de ${data.city} (últimos 30 días)`
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Temperatura (°C)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Humedad (%)'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

function displayStatistics(stats) {
    statsContainer.innerHTML = `
        <div class="stat-box">
            <div class="stat-value">${stats.avg_temperature}°C</div>
            <div class="stat-label">Temp. Promedio</div>
        </div>
        <div class="stat-box">
            <div class="stat-value">${stats.max_temperature}°C</div>
            <div class="stat-label">Temp. Máxima</div>
        </div>
        <div class="stat-box">
            <div class="stat-value">${stats.min_temperature}°C</div>
            <div class="stat-label">Temp. Mínima</div>
        </div>
        <div class="stat-box">
            <div class="stat-value">${stats.avg_humidity}%</div>
            <div class="stat-label">Humedad Promedio</div>
        </div>
    `;
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

function hideError() {
    errorMessage.style.display = 'none';
}

function showLoading() {
    // Podríamos implementar un spinner de carga aquí
    searchBtn.textContent = "Buscando...";
    searchBtn.disabled = true;
}

function hideLoading() {
    searchBtn.textContent = "Buscar";
    searchBtn.disabled = false;
}

// Manejar el formulario para API key
apiKeyLink.addEventListener('click', function(e) {
    e.preventDefault();
    
    const formHtml = `
        <div class="api-key-form">
            <h3>Configurar API Key de OpenWeatherMap</h3>
            <p>Para obtener datos reales, necesitas una API key gratuita de <a href="https://openweathermap.org/api" target="_blank">OpenWeatherMap</a>.</p>
            <input type="text" id="api-key-input" placeholder="Pega tu API key aquí">
            <button id="save-api-key">Guardar</button>
        </div>
    `;
    
    // Insertar el formulario en el footer
    const footer = document.querySelector('footer .container');
    footer.innerHTML += formHtml;
    
    // Manejar el guardado de la API key
    document.getElementById('save-api-key').addEventListener('click', function() {
        const apiKey = document.getElementById('api-key-input').value.trim();
        if (apiKey) {
            // En una aplicación real, enviaríamos esto al backend para guardarlo de forma segura
            // Por simplicidad, recargaremos la página con un parámetro (no es seguro para producción)
            window.location.href = `/?api_key=${apiKey}`;
        }
    });
});