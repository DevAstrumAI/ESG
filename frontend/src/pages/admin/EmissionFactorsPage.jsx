import { useState, useEffect } from "react";
import Card from "../../components/ui/Card";
import PrimaryButton from "../../components/ui/PrimaryButton";
import InputField from "../../components/ui/InputField";
import SelectDropdown from "../../components/ui/SelectDropdown";
import { FiEdit2, FiTrash2, FiPlus, FiSave, FiX, FiRefreshCw } from "react-icons/fi";

// API Base URL - from environment variable
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function EmissionFactorsPage() {
  const [factors, setFactors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [cities, setCities] = useState([]);
  const [categories, setCategories] = useState({
    scope1: ["mobile", "stationary", "fugitive", "refrigerants"],
    scope2: ["electricity", "heating", "cooling", "renewableCertificates"]
  });
  
  const [formData, setFormData] = useState({
    category: "",
    factor_name: "",
    value: "",
    unit: ""
  });

  // Filter states
  const [filters, setFilters] = useState({
    region: "middle-east",
    country: "uae",
    city: "",
    scope: "scope1",
    category: "",
    year: 2026
  });

  const regions = [{ label: "Middle East", value: "middle-east" }];
  const countries = [
    { label: "UAE", value: "uae" },
    { label: "Saudi Arabia", value: "saudi-arabia" },
    { label: "Qatar", value: "qatar" }
  ];
  const scopes = [
    { label: "Scope 1", value: "scope1" },
    { label: "Scope 2", value: "scope2" }
  ];
  const years = [2023, 2024, 2025, 2026];

  // Fetch cities based on selected country
  const fetchCities = async () => {
  try {
    alert(`1. Fetching cities for: ${filters.country}`);
    
    const url = `${API_URL}/api/admin/cities?region=${filters.region}&country=${filters.country}`;
    alert(`2. Calling URL: ${url}`);
    
    const response = await fetch(url);
    alert(`3. Response status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      alert(`4. Data received: ${JSON.stringify(data)}`);
      setCities(data.cities || []);
      alert(`5. Cities set to: ${data.cities?.length || 0} items`);
    } else {
      alert(`4. Error: ${response.status}`);
    }
  } catch (err) {
    alert(`❌ Error: ${err.message}`);
  }
};
  

  // Fetch factors from backend
  const fetchFactors = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('region', filters.region);
      queryParams.append('country', filters.country);
      if (filters.city) queryParams.append('city', filters.city);
      if (filters.scope) queryParams.append('scope', filters.scope);
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.year) queryParams.append('year', filters.year);
      
      const response = await fetch(`${API_URL}/api/admin/factors?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch factors: ${response.status}`);
      }
      
      const data = await response.json();
      setFactors(data.factors || []);
    } catch (err) {
      console.error("Error fetching factors:", err);
      setError(err.message);
      setFactors([]);
    } finally {
      setLoading(false);
    }
  };

  // Load cities when country changes
  useEffect(() => {
    if (filters.country) {
      fetchCities();
    }
  }, [filters.country]);

  // Load factors when filters change
  useEffect(() => {
    fetchFactors();
  }, [filters]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!filters.city) {
      alert("Please select a city first");
      return;
    }
    
    if (!filters.scope) {
      alert("Please select a scope");
      return;
    }
    
    try {
      const factorData = {
        region: filters.region,
        country: filters.country,
        city: filters.city,
        scope: filters.scope,
        category: formData.category,
        factor_name: formData.factor_name || formData.category,
        value: parseFloat(formData.value),
        unit: formData.unit,
        source: "Manual Entry",
        year: filters.year
      };
      
      const url = editingId 
        ? `${API_URL}/api/admin/factors/${editingId}`
        : `${API_URL}/api/admin/factors`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(factorData),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${editingId ? 'update' : 'add'} factor`);
      }

      fetchFactors();
      resetForm();
    } catch (err) {
      console.error("Error saving factor:", err);
      alert(`Error: ${err.message}`);
    }
  };

  const handleEdit = (factor) => {
    setEditingId(factor.id);
    setFormData({
      category: factor.category,
      factor_name: factor.factor_name || factor.category,
      value: factor.value.toString(),
      unit: factor.unit
    });
    
    // Set filters to match the factor's location
    setFilters({
      ...filters,
      region: factor.region,
      country: factor.country,
      city: factor.city,
      scope: factor.scope,
      category: factor.category
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this factor?")) return;
    
    try {
      const response = await fetch(`${API_URL}/api/admin/factors/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete factor');
      }

      fetchFactors();
    } catch (err) {
      console.error("Error deleting factor:", err);
      alert(`Error: ${err.message}`);
    }
  };

  const resetForm = () => {
    setFormData({ category: "", factor_name: "", value: "", unit: "" });
    setEditingId(null);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    // Reset city when country changes
    if (key === 'country') {
      setFilters(prev => ({ ...prev, city: "" }));
    }
  };

  // Get available categories based on selected scope
  const availableCategories = filters.scope ? categories[filters.scope] : [];

  return (
    <div style={{ padding: "32px", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#1F2937", margin: "0 0 8px 0" }}>
          Emission Factors Admin
        </h1>
        <p style={{ fontSize: "16px", color: "#6B7280", margin: 0 }}>
          Manage emission factors by region, country, city, and scope
        </p>
      </div>

      {/* Filters Bar */}
      <div style={{ 
        background: "white", 
        borderRadius: "16px", 
        border: "1px solid #E5E7EB",
        marginBottom: "24px",
        padding: "20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <FiRefreshCw size={18} color="#059669" />
          <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#1F2937", margin: 0 }}>Filter Factors</h3>
        </div>
        
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(4, 1fr)", 
          gap: "16px"
        }}>
          <SelectDropdown
            label="Region"
            value={filters.region}
            onChange={(e) => handleFilterChange('region', e.target.value)}
            options={regions}
          />
          
          <SelectDropdown
            label="Country"
            value={filters.country}
            onChange={(e) => handleFilterChange('country', e.target.value)}
            options={countries}
          />
          
          <SelectDropdown
            label="City"
            value={filters.city}
            onChange={(e) => handleFilterChange('city', e.target.value)}
            options={[
              { label: "Select City", value: "" },
              ...cities.map(c => ({ label: c.name, value: c.id }))
            ]}
          />
          
          <SelectDropdown
            label="Scope"
            value={filters.scope}
            onChange={(e) => handleFilterChange('scope', e.target.value)}
            options={scopes}
          />
          
          <SelectDropdown
            label="Category"
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            options={[
              { label: "All Categories", value: "" },
              ...availableCategories.map(c => ({ label: c.charAt(0).toUpperCase() + c.slice(1), value: c }))
            ]}
          />
          
          <SelectDropdown
            label="Year"
            value={filters.year}
            onChange={(e) => handleFilterChange('year', parseInt(e.target.value))}
            options={years.map(y => ({ label: y.toString(), value: y }))}
          />
        </div>
      </div>

      {/* Form Card */}
      <div style={{ 
        background: "white", 
        borderRadius: "16px", 
        border: "1px solid #E5E7EB",
        marginBottom: "32px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
      }}>
        <div style={{ padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
            <div style={{ width: "4px", height: "24px", background: "#059669", borderRadius: "4px" }}></div>
            <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#1F2937", margin: 0 }}>
              {editingId ? "Edit Factor" : "Add New Factor"}
            </h2>
          </div>

          {!filters.city && (
            <div style={{ 
              padding: "12px", 
              background: "#FEF3C7", 
              borderRadius: "8px", 
              marginBottom: "16px",
              color: "#92400E"
            }}>
              ⚠️ Please select a city above before adding factors
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(4, 1fr)", 
              gap: "16px",
              marginBottom: "24px"
            }}>
              <div>
                <SelectDropdown
                  label="Category"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  options={availableCategories.map(c => ({ label: c.charAt(0).toUpperCase() + c.slice(1), value: c }))}
                  required
                />
              </div>
              
              <div>
                <InputField
                  label="Factor Name"
                  value={formData.factor_name}
                  onChange={(e) => setFormData({...formData, factor_name: e.target.value})}
                  placeholder="e.g., dieselCar, naturalGas"
                  required
                />
              </div>
              
              <div>
                <InputField
                  label="Value"
                  type="number"
                  step="0.001"
                  value={formData.value}
                  onChange={(e) => setFormData({...formData, value: e.target.value})}
                  placeholder="0.233"
                  required
                />
              </div>
              
              <div>
                <InputField
                  label="Unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  placeholder="kgCO₂e/kWh"
                  required
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <PrimaryButton 
                type="submit" 
                style={{ padding: "10px 20px" }}
                disabled={!filters.city}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {editingId ? <FiSave size={18} /> : <FiPlus size={18} />}
                  {editingId ? "Update Factor" : "Add Factor"}
                </span>
              </PrimaryButton>
              {editingId && (
                <button 
                  onClick={resetForm}
                  style={{
                    padding: "10px 20px",
                    background: "white",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    color: "#4B5563",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  <FiX size={18} />
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Table Card */}
      <div style={{ 
        background: "white", 
        borderRadius: "16px", 
        border: "1px solid #E5E7EB",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
      }}>
        <div style={{ overflowX: "auto" }}>
          {loading ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#6B7280" }}>
              Loading factors...
            </div>
          ) : error ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#EF4444" }}>
              Error: {error}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                <tr>
                  <th style={{ padding: "16px 20px", fontSize: "13px", fontWeight: "600", color: "#4B5563" }}>City</th>
                  <th style={{ padding: "16px 20px", fontSize: "13px", fontWeight: "600", color: "#4B5563" }}>Scope</th>
                  <th style={{ padding: "16px 20px", fontSize: "13px", fontWeight: "600", color: "#4B5563" }}>Category</th>
                  <th style={{ padding: "16px 20px", fontSize: "13px", fontWeight: "600", color: "#4B5563" }}>Factor</th>
                  <th style={{ padding: "16px 20px", fontSize: "13px", fontWeight: "600", color: "#4B5563" }}>Value</th>
                  <th style={{ padding: "16px 20px", fontSize: "13px", fontWeight: "600", color: "#4B5563" }}>Unit</th>
                  <th style={{ padding: "16px 20px", fontSize: "13px", fontWeight: "600", color: "#4B5563" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {factors.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: "60px", textAlign: "center", color: "#6B7280" }}>
                      No factors found. Select a city and add one above!
                    </td>
                  </tr>
                ) : (
                  factors.map((f, index) => (
                    <tr key={f.id} style={{ 
                      borderBottom: index < factors.length - 1 ? "1px solid #F3F4F6" : "none",
                      transition: "background 0.2s"
                    }}>
                      <td style={{ padding: "16px 20px" }}>{f.city}</td>
                      <td style={{ padding: "16px 20px" }}>{f.scope}</td>
                      <td style={{ padding: "16px 20px" }}>
                        <span style={{
                          display: "inline-block",
                          padding: "4px 12px",
                          background: "#F0FDF4",
                          color: "#059669",
                          borderRadius: "20px",
                          fontSize: "13px",
                          fontWeight: "500"
                        }}>
                          {f.category}
                        </span>
                      </td>
                      <td style={{ padding: "16px 20px", fontWeight: "500" }}>{f.factor_name}</td>
                      <td style={{ padding: "16px 20px" }}>{f.value}</td>
                      <td style={{ padding: "16px 20px", color: "#6B7280" }}>{f.unit}</td>
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button 
                            onClick={() => handleEdit(f)}
                            style={{
                              padding: "6px",
                              background: "none",
                              border: "none",
                              borderRadius: "6px",
                              color: "#3B82F6",
                              cursor: "pointer"
                            }}
                          >
                            <FiEdit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(f.id)}
                            style={{
                              padding: "6px",
                              background: "none",
                              border: "none",
                              borderRadius: "6px",
                              color: "#EF4444",
                              cursor: "pointer"
                            }}
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Footer */}
        <div style={{ 
          background: "#F9FAFB", 
          padding: "12px 20px", 
          borderTop: "1px solid #E5E7EB",
          fontSize: "13px",
          color: "#6B7280",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span>Total {factors.length} emission factors</span>
          <button 
            onClick={fetchFactors}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 8px",
              background: "white",
              border: "1px solid #E5E7EB",
              borderRadius: "4px",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            <FiRefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>
    </div>
  );
}