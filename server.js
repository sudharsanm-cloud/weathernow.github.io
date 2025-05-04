// Weather Alert Server for sending scheduled weather reports
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Configure Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY');

// In-memory storage for user profiles (in a real app, use a database)
const userProfiles = [];

// Configure nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your.email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
    }
});

// API endpoint to register a user for weather alerts
app.post('/api/register', (req, res) => {
    const profile = req.body;
    
    // Validate required fields
    if (!profile.name || !profile.email || !profile.location || !profile.alertTypes || !profile.time) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if user already exists, update if so
    const existingUserIndex = userProfiles.findIndex(user => user.email === profile.email);
    if (existingUserIndex !== -1) {
        userProfiles[existingUserIndex] = profile;
    } else {
        userProfiles.push(profile);
    }
    
    // Schedule weather alerts for the user
    scheduleWeatherAlerts(profile);
    
    res.status(200).json({ message: 'Successfully registered for weather alerts' });
});

// Function to schedule weather alerts based on user preferences
function scheduleWeatherAlerts(profile) {
    const { frequency, time, email, name, location, alertTypes } = profile;
    
    // Parse time for cron schedule
    const [hours, minutes] = time.split(':');
    
    // Build cron schedule based on frequency
    let cronSchedule;
    switch (frequency) {
        case 'daily':
            cronSchedule = `${minutes} ${hours} * * *`;
            break;
        case 'weekly':
            cronSchedule = `${minutes} ${hours} * * 1`; // Every Monday
            break;
        case 'monthly':
            cronSchedule = `${minutes} ${hours} 1 * *`; // 1st day of month
            break;
        default:
            cronSchedule = `${minutes} ${hours} * * *`; // Default to daily
    }
    
    // Schedule the task
    const task = cron.schedule(cronSchedule, async () => {
        try {
            // Generate weather report
            const report = await generateWeatherReport(location, alertTypes);
            
            // Summarize with Gemini AI
            const summary = await summarizeWithGemini(report);
            
            // Send email with the weather report
            await sendWeatherEmail(email, name, location, summary);
            
            console.log(`Weather alert sent to ${email} for ${location}`);
        } catch (error) {
            console.error(`Error sending weather alert to ${email}:`, error);
        }
    });
    
    // Store the task reference (for cancellation if needed)
    profile.taskRef = task;
}

// Function to generate a weather report
async function generateWeatherReport(location, alertTypes) {
    try {
        const apiKey = '0f8cacece5430d3f059184b3291c35a1';
        
        // First validate the location
        const validationResponse = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric`
        );
        
        // If we got here, location is valid, now get the forecast
        const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/forecast?q=${location}&appid=${apiKey}&units=metric`
        );
        
        const data = response.data;
        const currentWeather = data.list[0];
        
        // Create a report based on the alert types
        let report = `Weather Report for ${location}\n\n`;
        
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
        
        // Add forecast for the next few periods
        report += 'Upcoming Forecast:\n';
        for (let i = 1; i <= 3; i++) {
            const forecast = data.list[i];
            const date = new Date(forecast.dt * 1000);
            report += `${date.toLocaleTimeString()} - ${forecast.weather[0].description}, ${Math.round(forecast.main.temp)}°C\n`;
        }
        
        return report;
    } catch (error) {
        console.error('Error generating weather report:', error);
        let errorMsg = `Error: Unable to fetch weather data for ${location}`;
        
        // Add more specific error message if available
        if (error.response) {
            if (error.response.status === 404) {
                errorMsg += `. City "${location}" not found. Please try a different city name or format (e.g., "London,UK").`;
            } else {
                errorMsg += `. API error: ${error.response.status} - ${error.response.statusText}`;
            }
        } else if (error.request) {
            errorMsg += '. Network error - Could not reach weather service.';
        } else {
            errorMsg += `: ${error.message}`;
        }
        
        return errorMsg;
    }
}

// Function to summarize weather report using Gemini AI
async function summarizeWithGemini(weatherReport) {
    // If the weather report contains an error, don't try to summarize it
    if (weatherReport.startsWith('Error:')) {
        return weatherReport;
    }
    
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        
        const prompt = `
        Summarize the following weather report in a concise, friendly, and engaging way. 
        Include the most important information and any notable weather conditions. and also provide suggestion for the day.
        Weather Report:
        ${weatherReport}
        `;
        
        const result = await model.generateContent(prompt);
        const summary = result.response.text();
        
        return summary;
    } catch (error) {
        console.error('Error summarizing with Gemini:', error);
        // Fall back to the original report if Gemini fails
        return weatherReport;
    }
}

// Function to send weather email
async function sendWeatherEmail(email, name, location, weatherSummary) {
    const isGmail = email.toLowerCase().endsWith('@gmail.com');
    
    // Set up email options
    const mailOptions = {
        from: process.env.EMAIL_USER || 'your.email@gmail.com',
        to: email,
        subject: `Weather Alert for ${location}`,
        html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <h2 style="color: #303f9f;">Weather Alert</h2>
            <p>Hello ${name},</p>
            <p>Here's your personalized weather update for ${location}:</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 10px; margin: 20px 0;">
                ${weatherSummary.replace(/\n/g, '<br>')}
            </div>
            <p>Stay prepared!</p>
            <p>Your Weather App</p>
        </div>
        `
    };
    
    return new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                reject(error);
            } else {
                resolve(info);
            }
        });
    });
}

// Start the server
app.listen(PORT, () => {
    console.log(`Weather alert server running on port ${PORT}`);
    console.log(`- Email notifications enabled`);
}); 