import pandas as pd
import numpy as np

# Set the random seed for reproducibility
np.random.seed(42)

# Define the date range for the last 30 days starting from March 1, 2024
dates = pd.date_range("2024-01-01", periods=365)

# Define commodity price ranges (low, high) for each commodity
commodities = {
    'Tomato': (8, 25),
    'Potato': (12, 30),
    'Pulses': (60, 100),
    'Onion': (10, 20),
    'Rice': (30, 55),
    'Wheat': (25, 45),
    'Sugar': (35, 65)
}

# Initialize data dictionary to store the generated data
data = {
    'Date': [],
    'Commodity': [],
    'Price': [],
    'Temperature': [],
    'Rainfall': [],
}

# Generate data for each commodity over the given dates
for commodity, (low, high) in commodities.items():
    for date in dates:
        data['Date'].append(date)
        data['Commodity'].append(commodity)
        data['Price'].append(np.random.randint(low, high))  # Random price within the given range
        data['Temperature'].append(np.random.randint(25, 38))  # Random temperature between 25°C and 38°C
        data['Rainfall'].append(np.random.randint(0, 15))  # Random rainfall between 0 and 15 mm

# Create a DataFrame from the generated data
df = pd.DataFrame(data)

# Save the DataFrame to a CSV file
df.to_csv('commodity_prices.csv', index=False)

# Print success message
print("✅ Clean data generated")
