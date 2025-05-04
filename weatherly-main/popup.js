const apiKey = 'YOUR_OPENWEATHERMAP_API_KEY';
const city = 'New York'; // Or make it dynamic based on user input

fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`)
  .then(response => response.json())
  .then(data => {
    document.getElementById('weather').innerHTML = `
      <h3>${data.name}</h3>
      <p>${data.weather[0].description}</p>
      <p>${data.main.temp}°C</p>
    `;
  })
  .catch(error => {
    document.getElementById('weather').innerHTML = "Failed to load weather.";
  });