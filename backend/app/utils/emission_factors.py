from firebase_admin import firestore
from typing import Dict, Any, Optional, List
from datetime import datetime

db = firestore.client()

def get_emission_factors(country: str, city: str, scope: str) -> Optional[Dict[str, Any]]:
    """
    Fetch emission factors for a specific country, city, and scope.
    
    Args:
        country: Country name (e.g., 'saudi-arabia', 'uae', 'singapore')
        city: City name (e.g., 'riyadh', 'dubai', 'singapore')
        scope: 'scope1' or 'scope2'
    
    Returns:
        Dictionary of emission factors or None if not found
    """
    # Determine region based on country
    if country in ['saudi-arabia', 'uae', 'qatar', 'kuwait', 'bahrain', 'oman']:
        region = 'middle-east'
    elif country in ['singapore', 'malaysia', 'thailand', 'indonesia', 'vietnam']:
        region = 'asia-pacific'
    else:
        # Default to asia-pacific for other countries
        region = 'asia-pacific'
    
    doc_path = f"emissionFactors/regions/{region}/countries/{country}/cities/city_data/{city}/{scope}/factors"
    
    try:
        doc_ref = db.document(doc_path)
        doc = doc_ref.get()
        
        if doc.exists:
            return doc.to_dict()
        else:
            print(f"Warning: No emission factors found for {country}/{city}/{scope}")
            return None
    except Exception as e:
        print(f"Error fetching emission factors: {e}")
        return None

def get_emission_factor(country: str, city: str, scope: str, factor_key: str) -> Optional[Dict[str, Any]]:
    """
    Fetch a single emission factor.
    
    Args:
        country: Country name
        city: City name
        scope: 'scope1' or 'scope2'
        factor_key: The factor key (e.g., 'petrol_car', 'grid_average')
    
    Returns:
        Factor data or None if not found
    """
    factors = get_emission_factors(country, city, scope)
    if factors and factor_key in factors:
        return factors[factor_key]
    return None

def get_all_emission_factors(country: str, city: str) -> Dict[str, Any]:
    """
    Fetch both scope1 and scope2 emission factors for a city.
    
    Returns:
        Dictionary with 'scope1' and 'scope2' keys
    """
    return {
        'scope1': get_emission_factors(country, city, 'scope1'),
        'scope2': get_emission_factors(country, city, 'scope2')
    }