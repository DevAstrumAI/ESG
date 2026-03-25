"""
Location resolver for emission factors.
Maps country/city combinations to the correct Firestore path.
This allows easy addition of new locations in the future.
"""

from typing import Dict, Optional, Tuple

# Define region mapping for countries
COUNTRY_REGION_MAP = {
    # Middle East
    "uae": "middle-east",
    "saudi-arabia": "middle-east",
    "saudi": "middle-east",
    "qatar": "middle-east",
    "kuwait": "middle-east",
    "bahrain": "middle-east",
    "oman": "middle-east",
    "jordan": "middle-east",
    "lebanon": "middle-east",
    
    # Asia Pacific
    "singapore": "asia-pacific",
    "malaysia": "asia-pacific",
    "thailand": "asia-pacific",
    "indonesia": "asia-pacific",
    "vietnam": "asia-pacific",
    "philippines": "asia-pacific",
    
    # Add more regions as needed
    # "europe": "europe",
    # "north-america": "north-america",
}

# City to country mapping (for cities that are in different countries)
# This helps when users just provide city name
CITY_COUNTRY_MAP = {
    "riyadh": "saudi-arabia",
    "jeddah": "saudi-arabia",
    "dammam": "saudi-arabia",
    "dubai": "uae",
    "abu-dhabi": "uae",
    "sharjah": "uae",
    "singapore": "singapore",
}

# Map country codes to full names (for display)
COUNTRY_DISPLAY_NAMES = {
    "uae": "United Arab Emirates",
    "saudi-arabia": "Saudi Arabia",
    "singapore": "Singapore",
    "qatar": "Qatar",
    "kuwait": "Kuwait",
}

# City display names
CITY_DISPLAY_NAMES = {
    "riyadh": "Riyadh",
    "jeddah": "Jeddah",
    "dammam": "Dammam",
    "dubai": "Dubai",
    "abu-dhabi": "Abu Dhabi",
    "sharjah": "Sharjah",
    "singapore": "Singapore",
}


def resolve_location(country: str, city: str = None) -> Tuple[str, str, str]:
    """
    Resolve country and city to region, normalized country, and normalized city.
    
    Args:
        country: Country name (e.g., "uae", "saudi-arabia", "singapore")
        city: City name (optional, will use default if not provided)
    
    Returns:
        Tuple of (region, normalized_country, normalized_city)
    """
    # Normalize inputs
    country = country.lower().strip()
    if city:
        city = city.lower().strip()
    
    # Get region from country mapping
    region = COUNTRY_REGION_MAP.get(country, "middle-east")  # Default to middle-east
    
    # If city not provided, try to get default city for country
    if not city:
        # Default cities by country
        default_cities = {
            "uae": "dubai",
            "saudi-arabia": "riyadh",
            "singapore": "singapore",
        }
        city = default_cities.get(country, country)
    
    return region, country, city


def get_country_display_name(country: str) -> str:
    """Get display name for a country."""
    return COUNTRY_DISPLAY_NAMES.get(country, country.replace("-", " ").title())


def get_city_display_name(city: str) -> str:
    """Get display name for a city."""
    return CITY_DISPLAY_NAMES.get(city, city.replace("-", " ").title())


def get_available_locations() -> Dict[str, any]:
    """
    Get all available locations with their data.
    This can be extended as you add more data.
    """
    return {
        "uae": {
            "displayName": "United Arab Emirates",
            "region": "middle-east",
            "cities": ["dubai", "abu-dhabi", "sharjah"]
        },
        "saudi-arabia": {
            "displayName": "Saudi Arabia",
            "region": "middle-east", 
            "cities": ["riyadh", "jeddah", "dammam"]
        },
        "singapore": {
            "displayName": "Singapore",
            "region": "asia-pacific",
            "cities": ["singapore"]
        },
        # Add more locations here as you add data
    }