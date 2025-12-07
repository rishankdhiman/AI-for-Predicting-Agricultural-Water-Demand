// ==========================================
// WEATHER API CONFIGURATION
// ==========================================
const WEATHER_API_KEY = 'YOUR_OPENWEATHERMAP_API_KEY'; // Replace with your API key
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';

// ==========================================
// GEMINI AI API CONFIGURATION
// ==========================================
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY'; // Replace with your API key
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// ==========================================
// FUNCTION 1: FETCH WEATHER DATA
// ==========================================
async function fetchWeatherData(city = 'Dehradun') {
    try {
        const response = await fetch(
            `${WEATHER_API_URL}?q=${city}&appid=${WEATHER_API_KEY}&units=metric`
        );
        
        if (!response.ok) {
            throw new Error('Weather data fetch failed');
        }
        
        const data = await response.json();
        
        // Extract relevant weather information
        const weatherData = {
            temperature: Math.round(data.main.temp),
            humidity: data.main.humidity,
            rainfall: data.rain ? data.rain['1h'] || 0 : 0,
            description: data.weather[0].description,
            city: data.name
        };
        
        // Update input fields with weather data
        document.getElementById('temp').value = weatherData.temperature;
        document.getElementById('humidity').value = weatherData.humidity;
        document.getElementById('rain').value = weatherData.rainfall;
        
        console.log('Weather data fetched successfully:', weatherData);
        return weatherData;
        
    } catch (error) {
        console.error('Error fetching weather data:', error);
        alert('⚠️ Could not fetch weather data. Please enter manually or check your API key.');
        return null;
    }
}

// ==========================================
// FUNCTION 2: GET AI RECOMMENDATIONS FROM GEMINI
// ==========================================
async function getGeminiRecommendations(crop, waterDemand, temp, humidity, rain, area, areaUnit) {
    try {
        const prompt = `As an agricultural AI expert, provide 5-7 specific irrigation recommendations for the following scenario:

Crop: ${crop}
Water Demand: ${waterDemand.toFixed(2)} mm/day
Temperature: ${temp}°C
Humidity: ${humidity}%
Rainfall: ${rain}mm
Land Area: ${area} ${areaUnit}

Provide practical, actionable recommendations covering:
1. Irrigation timing and frequency
2. Water conservation methods
3. Crop-specific advice
4. Weather-based adjustments
5. Efficiency improvements

Format each recommendation as a clear, concise bullet point.`;

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });
        
        if (!response.ok) {
            throw new Error('Gemini API request failed');
        }
        
        const data = await response.json();
        const aiText = data.candidates[0].content.parts[0].text;
        
        // Parse AI response into array of recommendations
        const recommendations = aiText
            .split('\n')
            .filter(line => line.trim().length > 0)
            .filter(line => line.match(/^\d+\.|\*|-|•/))
            .map(line => line.replace(/^\d+\.\s*|\*\s*|-\s*|•\s*/, '').trim());
        
        console.log('AI recommendations received:', recommendations);
        return recommendations;
        
    } catch (error) {
        console.error('Error fetching Gemini recommendations:', error);
        // Return fallback recommendations if API fails
        return generateRecommendations(crop, waterDemand, temp, humidity, rain, 75);
    }
}

// ==========================================
// MAIN CALCULATION FUNCTION
// ==========================================
function calculateWater() {
    const crop = document.getElementById("crop").value;
    const area = Number(document.getElementById("area").value);
    const areaUnit = document.getElementById("areaUnit").value;
    const temp = Number(document.getElementById("temp").value);
    const humidity = Number(document.getElementById("humidity").value);
    const rain = Number(document.getElementById("rain").value);
    
    // Validation
    if (area <= 0) {
        alert("⚠️ Please enter a valid land area!");
        return;
    }
    
    if (temp < -50 || temp > 60) {
        alert("⚠️ Please enter a realistic temperature (-50°C to 60°C)!");
        return;
    }
    
    if (humidity < 0 || humidity > 100) {
        alert("⚠️ Humidity must be between 0% and 100%!");
        return;
    }
    
    // Convert area to acres
    let areaInAcres = area;
    if (areaUnit === "Bigha") {
        areaInAcres = area * 0.625;
    } else if (areaUnit === "Hectares") {
        areaInAcres = area * 2.471;
    }
    
    // Crop water coefficients
    const kcValues = {
        "Wheat": 0.85, "Rice": 1.20, "Maize": 1.00,
        "Sugarcane": 1.25, "Cotton": 0.95, "Millet": 0.70,
        "Sorghum": 0.75, "Potato": 1.10, "Soybean": 0.90,
        "Groundnut": 0.85, "Sunflower": 0.95
    };
    
    const kc = kcValues[crop] || 1;
    const base = temp * 0.2 + (100 - humidity) * 0.1 - rain * 0.3;
    let waterPerDay = Math.max(0, base * kc);
    
    // Calculate totals
    const totalWaterMM = waterPerDay * areaInAcres;
    const cubicMeters = Math.round(totalWaterMM * 102.79);
    const liters = Math.round(totalWaterMM * 102790);
    
    // Calculate efficiency
    const efficiency = Math.min(100, Math.max(0, 100 - (waterPerDay * 5)));
    
    // Display results
    document.getElementById("dailyReq").textContent = waterPerDay.toFixed(2) + " mm/day";
    document.getElementById("totalVolume").textContent = (cubicMeters / 1000).toFixed(1) + " K m³";
    document.getElementById("cubicMeters").textContent = cubicMeters.toLocaleString() + " m³";
    document.getElementById("liters").textContent = (liters / 1000).toFixed(0) + " K L";
    
    // Animate efficiency bar
    setTimeout(() => {
        document.getElementById("efficiencyFill").style.width = efficiency + "%";
        document.getElementById("efficiencyPercent").textContent = efficiency.toFixed(0) + "%";
    }, 100);
    
    // Show loading state for recommendations
    document.getElementById("recList").innerHTML = '<li class="rec-item">🤖 Generating recommendations...</li>';
    
    // Get AI recommendations (you can uncomment this when APIs are configured)
    // getGeminiRecommendations(crop, waterPerDay, temp, humidity, rain, area, areaUnit)
    //     .then(recommendations => {
    //         const recList = document.getElementById("recList");
    //         recList.innerHTML = recommendations.map(rec => `<li class="rec-item">${rec}</li>`).join('');
    //     });
    
    // For now, use fallback recommendations
    const recommendations = generateRecommendations(crop, waterPerDay, temp, humidity, rain, efficiency);
    const recList = document.getElementById("recList");
    recList.innerHTML = recommendations.map(rec => `<li class="rec-item">${rec}</li>`).join('');
    
    // Show results
    document.getElementById("results").classList.add("active");
    document.getElementById("results").scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ==========================================
// FALLBACK RECOMMENDATIONS (if API fails)
// ==========================================
function generateRecommendations(crop, waterDemand, temp, humidity, rain, efficiency) {
    const recs = [];
    
    if (efficiency > 80) {
        recs.push("Excellent water efficiency! Your irrigation parameters are well-optimized.");
    } else if (efficiency > 60) {
        recs.push("Good water efficiency. Consider fine-tuning irrigation timing for better results.");
    } else {
        recs.push("Water efficiency can be improved. Review your irrigation schedule and methods.");
    }
    
    if (waterDemand < 3) {
        recs.push("Low water demand detected. Drip irrigation systems recommended for maximum efficiency.");
    } else if (waterDemand < 6) {
        recs.push("Moderate water demand. Sprinkler irrigation or center pivot systems are suitable.");
    } else {
        recs.push("High water demand. Consider flood irrigation or advanced pivot systems with monitoring.");
    }
    
    if (temp > 35) {
        recs.push("High temperature alert: Schedule irrigation during early morning (5-7 AM) or late evening (7-9 PM) to minimize evaporation losses.");
    } else if (temp > 30) {
        recs.push("Warm conditions: Monitor soil moisture levels twice daily and adjust irrigation as needed.");
    }
    
    if (humidity < 40) {
        recs.push("Low humidity detected: Increase irrigation frequency by 15-20% and consider mulching to retain soil moisture.");
    } else if (humidity > 80) {
        recs.push("High humidity conditions: Reduce irrigation frequency to prevent waterlogging and fungal diseases.");
    }
    
    if (rain > 10) {
        recs.push("Significant rainfall detected: Reduce irrigation by 40-60% for the next 2-3 days and monitor soil saturation.");
    } else if (rain > 5) {
        recs.push("Recent rainfall: Decrease today's irrigation by 25-30% to optimize water usage.");
    }
    
    // Crop-specific recommendations
    const cropTips = {
        "Rice": "Maintain 2-5 cm standing water during vegetative stage. Consider alternate wetting and drying (AWD) method.",
        "Wheat": "Critical stages: Crown root initiation, tillering, and grain filling require consistent moisture.",
        "Sugarcane": "High water consumer. Ensure adequate irrigation during formative and grand growth phases.",
        "Cotton": "Deficit irrigation during vegetative stage can improve yield. Increase water during flowering.",
        "Potato": "Maintain consistent moisture. Water stress during tuber formation reduces yield significantly.",
        "Maize": "Critical water needs during tasseling and silking stages. Ensure 25-30mm water weekly.",
    };
    
    if (cropTips[crop]) {
        recs.push(cropTips[crop]);
    }
    
    return recs;
}

// ==========================================
// AUTO-FETCH WEATHER ON PAGE LOAD (Optional)
// ==========================================
// Uncomment the line below to automatically fetch weather data when page loads
// window.addEventListener('load', () => fetchWeatherData('Dehradun'));

// ==========================================
// ADD BUTTON TO FETCH WEATHER MANUALLY
// ==========================================
// You can add this button to your HTML:
// <button onclick="fetchWeatherData('Dehradun')">🌤️ Fetch Current Weather</button>