// DOM Elements
const profileForm = document.getElementById('profileForm');
const notification = document.getElementById('notification');

// API endpoint
const API_URL = 'http://localhost:3000/api/register';

// Check if there's saved profile data
document.addEventListener('DOMContentLoaded', () => {
    const savedProfile = localStorage.getItem('weatherProfile');
    
    if (savedProfile) {
        const profileData = JSON.parse(savedProfile);
        
        // Populate form with saved data
        document.getElementById('name').value = profileData.name || '';
        document.getElementById('email').value = profileData.email || '';
        document.getElementById('location').value = profileData.location || '';
        document.getElementById('frequency').value = profileData.frequency || 'daily';
        document.getElementById('time').value = profileData.time || '08:00';
        
        // Set alert types checkboxes
        if (profileData.alertTypes) {
            const alertTypes = profileData.alertTypes;
            document.getElementById('temperature').checked = alertTypes.includes('temperature');
            document.getElementById('humidity').checked = alertTypes.includes('humidity');
            document.getElementById('windSpeed').checked = alertTypes.includes('windSpeed');
        }
    }
});

// Handle form submission
profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Get form values
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const location = document.getElementById('location').value;
    const frequency = document.getElementById('frequency').value;
    const time = document.getElementById('time').value;
    
    // Validate location first
    try {
        // Check if location is valid by making a test API call
        const isValidLocation = await validateLocation(location);
        if (!isValidLocation) {
            showNotification(`"${location}" seems to be invalid or not found. Please try a different city name or add country code (e.g., "London,UK")`, 'error');
            return;
        }
    } catch (error) {
        showNotification('Could not validate location. Please check your internet connection and try again.', 'error');
        return;
    }
    
    // Get selected alert types
    const alertTypesElements = document.querySelectorAll('input[name="alertTypes"]:checked');
    const alertTypes = Array.from(alertTypesElements).map(el => el.value);
    
    // Create profile object
    const profileData = {
        name,
        email,
        location,
        frequency,
        time,
        alertTypes,
        lastUpdated: new Date().toISOString()
    };
    
    // Save to localStorage
    localStorage.setItem('weatherProfile', JSON.stringify(profileData));
    
    try {
        // First generate a sample report to show the user
        const sampleReport = await generateWeatherReport(location, alertTypes);
        
        // If report shows an error, stop the submission process
        if (sampleReport.includes('Error: Unable to fetch weather data')) {
            showNotification(`Could not generate weather report for "${location}". Please try a different city name.`, 'error');
            return;
        }
        
        // Send to server API
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(profileData),
        });
        
        if (response.ok) {
            // Get the response data
            const data = await response.json();
            
            // Show success notification
            showNotification('Profile saved! Weather alerts will be sent to your email.');
            
            // Show a preview of what the weather alert will look like
            setTimeout(() => {
                showWeatherPreview(profileData, sampleReport);
            }, 1500);
        } else {
            // If server returns an error
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to register for alerts');
        }
    } catch (error) {
        console.error('Error:', error);
        
        // Show error notification, but still save to localStorage
        showNotification('Profile saved locally, but server registration failed. Weather alerts may not be sent.', 'error');
    }
});

// Function to validate if a location exists in OpenWeatherMap API
async function validateLocation(location) {
    try {
        const apiKey = '0f8cacece5430d3f059184b3291c35a1';
        const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric`;
        
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        // If the API returns a 200 status and valid data, the location is valid
        return response.ok && data.main && data.weather;
    } catch (error) {
        console.error('Error validating location:', error);
        return false;
    }
}

// Show notification function
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.querySelector('p').textContent = message;
    
    // Set notification color based on type
    if (type === 'error') {
        notification.style.backgroundColor = '#f44336';
    } else {
        notification.style.backgroundColor = '#4caf50';
    }
    
    notification.classList.add('show');
    
    // Hide notification after 5 seconds for errors, 3 seconds for success
    setTimeout(() => {
        notification.classList.remove('show');
    }, type === 'error' ? 5000 : 3000);
}

// Function to show a preview of what the weather alert will look like
function showWeatherPreview(profileData, weatherReport) {
    // Create a modal element for the preview
    const modal = document.createElement('div');
    modal.classList.add('preview-modal');
    
    // Create the content for the modal
    modal.innerHTML = `
        <div class="preview-content">
            <h2>Your Weather Alert Preview</h2>
            <p>Hello ${profileData.name},</p>
            <p>Here's a preview of your personalized weather alert for ${profileData.location}:</p>
            <div class="preview-report">
                ${weatherReport.replace(/\n/g, '<br>')}
            </div>
            <p>You'll receive alerts ${profileData.frequency} at ${profileData.time}</p>
            <button class="close-preview">Close Preview</button>
        </div>
    `;
    
    // Add the modal to the body
    document.body.appendChild(modal);
    
    // Add event listener to close the modal
    modal.querySelector('.close-preview').addEventListener('click', () => {
        modal.remove();
    });
    
    // Also close when clicking outside the content
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Function to generate a weather report for testing
function generateWeatherReport(location, alertTypes) {
    return new Promise((resolve) => {
        const apiKey = '0f8cacece5430d3f059184b3291c35a1';
        const apiUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${location}&appid=${apiKey}&units=metric`;
        
        fetch(apiUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`City "${location}" not found. Please try a different city name or format (e.g., "London,UK").`);
                }
                return response.json();
            })
            .then(data => {
                // Create a report based on the alert types
                let report = `Weather Report for ${location}\n\n`;
                
                const currentWeather = data.list[0];
                
                if (alertTypes.includes('temperature')) {
                    report += `Temperature: ${Math.round(currentWeather.main.temp)}°C\n`;
                    report += `Feels like: ${Math.round(currentWeather.main.feels_like)}°C\n`;
                    report += `Min: ${Math.round(currentWeather.main.temp_min)}°C, Max: ${Math.round(currentWeather.main.temp_max)}°C\n\n`;
                }
                
                if (alertTypes.includes('humidity')) {
                    report += `Humidity: ${currentWeather.main.humidity}%\n\n`;
                }
                
                if (alertTypes.includes('windSpeed')) {
                    report += `Wind Speed: ${currentWeather.wind.speed} km/h\n`;
                    report += `Wind Direction: ${currentWeather.wind.deg}°\n\n`;
                }
                
                report += `Weather Condition: ${currentWeather.weather[0].description}\n`;
                report += `Forecast: ${data.list[1].weather[0].description} later\n\n`;
                
                // Add a note about Gemini summarization in the real emails
                report += "Note: In the actual email alerts, this report will be summarized using Google's Gemini AI for a more concise and friendly format.";
                
                resolve(report);
            })
            .catch(error => {
                console.error('Error generating weather report:', error);
                resolve(`Error: Unable to fetch weather data for ${location}. ${error.message}`);
            });
    });
} 