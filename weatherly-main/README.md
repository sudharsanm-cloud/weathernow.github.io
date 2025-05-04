# Advanced Weather App with Alerts

This advanced weather application provides real-time weather information and allows users to set up personalized weather alerts delivered to their email.

![Weather App Screenshot](screenshot.jpg)

## Features

- Current weather conditions display
- 4-day weather forecast
- Search for weather by location
- Personalized weather alerts via email
- Customizable alert types (temperature, humidity, wind speed)
- Configurable alert frequency (daily, weekly, monthly)
- Weather reports summarized using Google's Gemini AI

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Gmail account for sending emails (or other email service)
- Google Generative AI API key (for Gemini)

### Installation

1. Clone or download this repository
2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables:
   - Create a `.env` file in the root directory with the following variables:
   ```
   EMAIL_USER=your.email@gmail.com
   EMAIL_PASS=your-app-password
   GEMINI_API_KEY=your-gemini-api-key
   ```

   Note: For Gmail, you need to generate an "App Password". See [Google's instructions](https://support.google.com/accounts/answer/185833) for details.

4. Start the server:
   ```
   npm start
   ```

5. Open `index.html` in your browser to use the application

### Setting Up Google's Gemini AI

1. Sign up for Google AI Studio at [https://makersuite.google.com/](https://makersuite.google.com/)
2. Create an API key
3. Add the API key to your `.env` file as `GEMINI_API_KEY`

## Usage

### View Weather Information

1. Open the main page (`index.html`)
2. The default location's weather is displayed
3. Click "Search Location" to view weather for a different location

### Set Up Weather Alerts

1. Click "Set Weather Alerts" on the main page
2. Fill in your name, email, and location
3. Select the weather alert types you're interested in
4. Choose your preferred alert frequency and time
5. Click "Save Profile"
6. You'll receive weather alerts at your specified frequency and time

## How It Works

1. The frontend collects user preferences and sends them to the server
2. The server schedules tasks using node-cron based on user preferences
3. At the scheduled time, the server:
   - Fetches weather data from OpenWeatherMap API
   - Generates a weather report based on selected alert types
   - Uses Google's Gemini AI to summarize the report in a friendly way
   - Sends the summarized report to the user's email

## Technologies Used

- HTML, CSS, JavaScript
- OpenWeatherMap API
- Node.js with Express
- node-cron for scheduling
- Nodemailer for sending emails
- Google's Gemini AI for report summarization

## License

This project is open source and available under the MIT License.
