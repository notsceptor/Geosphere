# Geosphere Setup Guide

Welcome to Geosphere, a prototype web application for exploring city locations and weather data. Follow the steps below to set up and run the application on your local machine.

## Prerequisites

Make sure you have the following installed on your system:

- Python
- Pip (Python package installer)

## Step 1: Install Required Python Modules

Open a command prompt (CMD) in the Geosphere folder (the one you downloaded and extracted) and install the required Python modules using the following commands:

```bash
pip install flask[async]
pip install httpx
pip install wtforms
pip install sqlite3
pip install email-validator
```

Replace "flask" with each of the module names listed above, and make sure to run these commands within the Geosphere folder.

## Step 2: Run the Application

To start the Geosphere application, run the following command in the CMD from the Geosphere folder:

```bash
py main.py
```

Wait for the application to boot. Once it's ready, open your preferred web browser (Chrome, Edge, or Firefox) and navigate to [http://127.0.0.1:5000/dashboard](http://127.0.0.1:5000/dashboard).

## Step 3: Login to the Page

Use the following credentials to log in:

- **Username:** admin
- **Password:** admin

Explore Geosphere using the features available, such as the city search menu, settings menu, favorites menu, and log out option.

If you're searching for a city with a shared name, specify the country code in the search query (e.g., "London, GB" for London in the United Kingdom).

## Additional Information

- The "How to Use" menu on the far right provides basic guidance on accessing the page.
- Explore the settings menu, favorites menu, and log-out features in the bottom right corner.
- Geosphere is a prototype, and if it were a full-stack web application, it would be hosted on a live URL rather than a local-host Py file.

Thank you for testing our Geosphere prototype! We hope you enjoy exploring the world with our application. If you encounter any issues, feel free to reach out for support. Cheers!
