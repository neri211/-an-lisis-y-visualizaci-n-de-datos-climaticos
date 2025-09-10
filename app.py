from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd
import numpy as np
import requests
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

app = Flask(__name__, static_folder='static')
CORS(app)

# Configuración - Usar variable de entorno para la API key
API_KEY = os.getenv("OPENWEATHER_API_KEY", "demo_key")
BASE_URL = "http://api.openweathermap.org/data/2.5"

# Ruta para servir archivos estáticos
@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

# Ruta principal
@app.route('/')
def serve_frontend():
    return send_from_directory('static', 'index.html')

# Tus rutas de API existentes (get_current_weather, get_forecast, get_historical_data)
# ... [mantén todo el código de tus rutas API aquí] ...



@app.route('/api/weather/current/<city>')
def get_current_weather(city):
    """Obtener el clima actual de una ciudad"""
    try:
        # Para demostración, si no hay API key, devolver datos de ejemplo
        if API_KEY == "demo_key":
            return jsonify(get_demo_current_data(city))
            
        url = f"{BASE_URL}/weather?q={city}&appid={API_KEY}&units=metric"
        response = requests.get(url)
        data = response.json()
        
        if response.status_code != 200:
            return jsonify({"error": data["message"]}), 400
        
        # Procesar datos
        weather_data = {
            "city": data["name"],
            "country": data["sys"]["country"],
            "temperature": data["main"]["temp"],
            "feels_like": data["main"]["feels_like"],
            "humidity": data["main"]["humidity"],
            "pressure": data["main"]["pressure"],
            "wind_speed": data["wind"]["speed"],
            "description": data["weather"][0]["description"],
            "icon": data["weather"][0]["icon"],
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        return jsonify(weather_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/weather/forecast/<city>')
def get_forecast(city):
    """Obtener pronóstico de 5 días para una ciudad"""
    try:
        # Para demostración, si no hay API key, devolver datos de ejemplo
        if API_KEY == "demo_key":
            return jsonify(get_demo_forecast_data(city))
            
        url = f"{BASE_URL}/forecast?q={city}&appid={API_KEY}&units=metric"
        response = requests.get(url)
        data = response.json()
        
        if response.status_code != 200:
            return jsonify({"error": data["message"]}), 400
        
        # Procesar datos con pandas
        forecasts = []
        for item in data["list"]:
            forecast = {
                "datetime": item["dt_txt"],
                "temperature": item["main"]["temp"],
                "feels_like": item["main"]["feels_like"],
                "humidity": item["main"]["humidity"],
                "pressure": item["main"]["pressure"],
                "wind_speed": item["wind"]["speed"],
                "description": item["weather"][0]["description"],
                "icon": item["weather"][0]["icon"]
            }
            forecasts.append(forecast)
        
        # Crear DataFrame para análisis
        df = pd.DataFrame(forecasts)
        df['datetime'] = pd.to_datetime(df['datetime'])
        
        # Calcular estadísticas
        stats = {
            "avg_temperature": round(df['temperature'].mean(), 2),
            "max_temperature": round(df['temperature'].max(), 2),
            "min_temperature": round(df['temperature'].min(), 2),
            "avg_humidity": round(df['humidity'].mean(), 2),
            "total_records": len(df)
        }
        
        return jsonify({
            "city": data["city"]["name"],
            "country": data["city"]["country"],
            "forecasts": forecasts,
            "statistics": stats
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/weather/historical/<city>')
def get_historical_data(city):
    """Obtener datos históricos (simulados) para una ciudad"""
    try:
        # Generar datos históricos simulados
        dates = [datetime.now() - timedelta(days=i) for i in range(30, 0, -1)]
        
        # Generar temperaturas simuladas con una tendencia estacional
        base_temp = np.random.uniform(15, 25)
        seasonal_effect = 5 * np.sin(2 * np.pi * np.arange(30) / 30)
        noise = np.random.normal(0, 2, 30)
        temperatures = base_temp + seasonal_effect + noise
        
        # Generar humedad simulada
        humidity = np.random.normal(70, 10, 30)
        
        # Crear DataFrame
        df = pd.DataFrame({
            "date": [d.strftime("%Y-%m-%d") for d in dates],
            "temperature": temperatures,
            "humidity": humidity
        })
        
        # Calcular estadísticas con pandas
        stats = {
            "avg_temperature": round(df['temperature'].mean(), 2),
            "max_temperature": round(df['temperature'].max(), 2),
            "min_temperature": round(df['temperature'].min(), 2),
            "avg_humidity": round(df['humidity'].mean(), 2),
            "temperature_std": round(df['temperature'].std(), 2)
        }
        
        # Calcular tendencia (regresión lineal simple)
        x = np.arange(len(df))
        slope, intercept = np.polyfit(x, df['temperature'], 1)
        trend = "Ascendente" if slope > 0.1 else "Descendente" if slope < -0.1 else "Estable"
        
        stats["trend"] = trend
        stats["trend_slope"] = round(slope, 3)
        
        return jsonify({
            "city": city,
            "historical_data": df.to_dict('records'),
            "statistics": stats
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Funciones de demostración para cuando no hay API key disponible
def get_demo_current_data(city):
    """Generar datos de demostración para el clima actual"""
    return {
        "city": city,
        "country": "Demo",
        "temperature": round(np.random.uniform(15, 30), 1),
        "feels_like": round(np.random.uniform(14, 29), 1),
        "humidity": np.random.randint(40, 90),
        "pressure": np.random.randint(1000, 1030),
        "wind_speed": round(np.random.uniform(1, 10), 1),
        "description": "soleado",
        "icon": "01d",
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

def get_demo_forecast_data(city):
    """Generar datos de demostración para el pronóstico"""
    forecasts = []
    now = datetime.now()
    
    for i in range(0, 40, 2):  # 20 registros cada 6 horas
        forecast_time = now + timedelta(hours=i)
        forecasts.append({
            "datetime": forecast_time.strftime("%Y-%m-%d %H:%M:%S"),
            "temperature": round(20 + 5 * np.sin(i/10), 1),
            "feels_like": round(19 + 5 * np.sin(i/10), 1),
            "humidity": np.random.randint(40, 90),
            "pressure": np.random.randint(1000, 1030),
            "wind_speed": round(np.random.uniform(1, 10), 1),
            "description": "parcialmente nublado",
            "icon": "02d"
        })
    
    return {
        "city": city,
        "country": "Demo",
        "forecasts": forecasts,
        "statistics": {
            "avg_temperature": 20.5,
            "max_temperature": 25.3,
            "min_temperature": 15.7,
            "avg_humidity": 65.2,
            "total_records": 20
        }
    }
    
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000, debug=True)
