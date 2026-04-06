// src/pages/admin/EmissionFactorsPage.jsx
import { useState, useEffect } from "react";
import Card from "../../components/ui/Card";
import PrimaryButton from "../../components/ui/PrimaryButton";
import InputField from "../../components/ui/InputField";
import SelectDropdown from "../../components/ui/SelectDropdown";
import { FiEdit2, FiTrash2, FiPlus, FiSave, FiX, FiRefreshCw, FiSearch, FiFilter, FiDownload } from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";


const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";

export default function EmissionFactorsPage() {
  const [factors, setFactors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [cities, setCities] = useState([]);
  const [showFilters, setShowFilters] = useState(true);
  const [successMessage, setSuccessMessage] = useState(null);
  const token = useAuthStore((state) => state.token);

  
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

  const [filters, setFilters] = useState({
    region: "middle-east",
    country: "uae",
    city: "",
    scope: "scope1",
    category: "",
    year: new Date().getFullYear()
  });

  const regions = [
    { label: "🌍 Middle East", value: "middle-east" },
    { label: "🌏 Asia Pacific", value: "asia-pacific" },
    { label: "🇪🇺 Europe", value: "eu" },
    { label: "🇬🇧 United Kingdom", value: "uk" },
    { label: "🇺🇸 United States", value: "us" }
  ];

  const countriesByRegion = {
    "middle-east": [
      { label: "🇦🇪 UAE", value: "uae" },
      { label: "🇸🇦 Saudi Arabia", value: "saudi-arabia" },
      { label: "🇶🇦 Qatar", value: "qatar" }
    ],
    "asia-pacific": [
      { label: "🇸🇬 Singapore", value: "singapore" },
      { label: "🇲🇾 Malaysia", value: "malaysia" },
      { label: "🇮🇩 Indonesia", value: "indonesia" },
      { label: "🇹🇭 Thailand", value: "thailand" }
    ],
    "eu": [
      { label: "🇩🇪 Germany", value: "germany" },
      { label: "🇫🇷 France", value: "france" },
      { label: "🇮🇹 Italy", value: "italy" },
      { label: "🇪🇸 Spain", value: "spain" }
    ],
    "uk": [{ label: "🇬🇧 United Kingdom", value: "uk" }],
    "us": [{ label: "🇺🇸 United States", value: "us" }]
  };

  const scopes = [
    { label: "Scope 1", value: "scope1" },
    { label: "Scope 2", value: "scope2" }
  ];
  
  const years = [2023, 2024, 2025, 2026, 2027];

  const fetchCities = async () => {
    try {
      const url = `${API_URL}/api/admin/cities?region=${filters.region}&country=${filters.country}`;
      console.log("Fetching cities from:", url);
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        console.log("Cities received:", data);
        setCities(data.cities || []);
      } else {
        console.error("Failed to fetch cities:", response.status);
        setCities([]);
      }
    } catch (err) {
      console.error("Error fetching cities:", err);
      setCities([]);
    }
  };

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
      
      const url = `${API_URL}/api/admin/factors?${queryParams}`;
      console.log("Fetching factors from:", url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch factors: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Factors received:", data);
      setFactors(data.factors || []);
    } catch (err) {
      console.error("Error fetching factors:", err);
      setError(err.message);
      setFactors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (filters.country) {
      fetchCities();
    }
  }, [filters.country]);

  useEffect(() => {
    fetchFactors();
  }, [filters]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!filters.city) {
      alert("Please select a city first");
      return;
    }
    
    if (!formData.category) {
      alert("Please select a category");
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
        source: "Admin",
        year: filters.year
      };
      
      console.log("Saving factor:", factorData);
      
      const url = `${API_URL}/api/admin/factors`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(factorData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add factor: ${response.status} - ${errorText}`);
      }

      setSuccessMessage(`Factor added successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
      
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
      factor_name: factor.factor_name,
      value: factor.value.toString(),
      unit: factor.unit
    });
    
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
      const url = `${API_URL}/api/admin/factors/${id}`;
      console.log("Deleting factor:", url);
      const response = await fetch(url, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete factor');
      }

      setSuccessMessage("Factor deleted successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
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
    if (key === 'country') {
      setFilters(prev => ({ ...prev, city: "" }));
    }
  };

  const exportToCSV = () => {
    if (factors.length === 0) {
      alert("No data to export");
      return;
    }
    
    const headers = ["City", "Scope", "Category", "Factor Name", "Value", "Unit", "Year"];
    const csvData = factors.map(f => [
      f.city,
      f.scope,
      f.category,
      f.factor_name,
      f.value,
      f.unit,
      f.year
    ]);
    
    const csvContent = [headers, ...csvData].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emission_factors_${filters.country}_${filters.year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const availableCategories = filters.scope ? categories[filters.scope] : [];
  const availableCountries = countriesByRegion[filters.region] || [];

  const getCityName = (cityId) => {
    const city = cities.find(c => c.id === cityId);
    return city ? city.name : cityId;
  };

  return (
    <div style={{ padding: "32px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#1B4D3E", margin: "0 0 8px 0" }}>
            Emission Factors Admin
          </h1>
          <p style={{ fontSize: "16px", color: "#4A5568", margin: 0 }}>
            Manage emission factors by region, country, city, and scope
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button 
            onClick={exportToCSV}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              background: "white",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              color: "#2E7D64",
              fontWeight: "500",
              cursor: "pointer"
            }}
          >
            <FiDownload size={16} /> Export CSV
          </button>
          <button 
            onClick={fetchFactors}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              background: "#2E7D64",
              border: "none",
              borderRadius: "8px",
              color: "white",
              fontWeight: "500",
              cursor: "pointer"
            }}
          >
            <FiRefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div style={{
          background: "#D1FAE5",
          border: "1px solid #10B981",
          color: "#065F46",
          padding: "12px 20px",
          borderRadius: "8px",
          marginBottom: "24px"
        }}>
          ✅ {successMessage}
        </div>
      )}

      {/* Filters Bar */}
      <Card style={{ marginBottom: "24px", padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <FiFilter size={18} color="#2E7D64" />
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#1B4D3E", margin: 0 }}>Filters</h3>
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280" }}
          >
            {showFilters ? "Hide" : "Show"}
          </button>
        </div>
        
        {showFilters && (
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", 
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
              options={availableCountries}
            />
            
            <SelectDropdown
              label="City"
              value={filters.city}
              onChange={(e) => handleFilterChange('city', e.target.value)}
              options={[
                { label: "All Cities", value: "" },
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
        )}
      </Card>

      {/* Add/Edit Form */}
      <Card style={{ marginBottom: "32px", padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <div style={{ width: "4px", height: "24px", background: "#2E7D64", borderRadius: "4px" }}></div>
          <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#1B4D3E", margin: 0 }}>
            {editingId ? "✏️ Edit Factor" : "➕ Add New Factor"}
          </h2>
        </div>

        {!filters.city && (
          <div style={{ 
            padding: "12px", 
            background: "#FEF3C7", 
            borderRadius: "8px", 
            marginBottom: "16px",
            color: "#92400E",
            fontSize: "14px"
          }}>
            ⚠️ Please select a city above before adding factors
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
            gap: "20px",
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
                placeholder="e.g., diesel_car, natural_gas"
                required
              />
            </div>
            
            <div>
              <InputField
                label="Value"
                type="number"
                step="0.0001"
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
                placeholder="kg CO₂e / unit"
                required
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <PrimaryButton 
              type="submit" 
              disabled={!filters.city}
              style={{ padding: "10px 24px", background: "#2E7D64" }}
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
                  padding: "10px 24px",
                  background: "white",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  color: "#4A5568",
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
      </Card>

      {/* Data Table */}
      <Card style={{ overflow: "hidden", padding: 0 }}>
        <div style={{ overflowX: "auto" }}>
          {loading ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#6B7280" }}>
              <div style={{ width: "40px", height: "40px", border: "3px solid #E5E7EB", borderTopColor: "#2E7D64", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
              Loading emission factors...
            </div>
          ) : error ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#DC2626" }}>
              ❌ Error: {error}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#F8FAF8", borderBottom: "1px solid #E5E7EB" }}>
                <tr>
                  <th style={{ padding: "16px 20px", fontSize: "12px", fontWeight: "600", color: "#4A5568", textAlign: "left" }}>City</th>
                  <th style={{ padding: "16px 20px", fontSize: "12px", fontWeight: "600", color: "#4A5568", textAlign: "left" }}>Scope</th>
                  <th style={{ padding: "16px 20px", fontSize: "12px", fontWeight: "600", color: "#4A5568", textAlign: "left" }}>Category</th>
                  <th style={{ padding: "16px 20px", fontSize: "12px", fontWeight: "600", color: "#4A5568", textAlign: "left" }}>Factor</th>
                  <th style={{ padding: "16px 20px", fontSize: "12px", fontWeight: "600", color: "#4A5568", textAlign: "left" }}>Value</th>
                  <th style={{ padding: "16px 20px", fontSize: "12px", fontWeight: "600", color: "#4A5568", textAlign: "left" }}>Unit</th>
                  <th style={{ padding: "16px 20px", fontSize: "12px", fontWeight: "600", color: "#4A5568", textAlign: "left" }}>Year</th>
                  <th style={{ padding: "16px 20px", fontSize: "12px", fontWeight: "600", color: "#4A5568", textAlign: "left" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {factors.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ padding: "60px", textAlign: "center", color: "#9CA3AF" }}>
                      <FiSearch size={32} style={{ marginBottom: "12px", opacity: 0.5 }} />
                      <p>No factors found</p>
                      <span style={{ fontSize: "13px" }}>Select a city and add emission factors above</span>
                    </td>
                  </tr>
                ) : (
                  factors.map((f, index) => (
                    <tr key={f.id} style={{ 
                      borderBottom: index < factors.length - 1 ? "1px solid #F3F4F6" : "none"
                    }}>
                      <td style={{ padding: "14px 20px", fontSize: "14px" }}>{f.city}</td>
                      <td style={{ padding: "14px 20px", fontSize: "14px", textTransform: "capitalize" }}>{f.scope}</td>
                      <td style={{ padding: "14px 20px", fontSize: "14px" }}>
                        <span style={{
                          display: "inline-block",
                          padding: "4px 12px",
                          background: "#E8F0EA",
                          color: "#2E7D64",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "500"
                        }}>
                          {f.category}
                        </span>
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: "14px", fontWeight: "500" }}>{f.factor_name}</td>
                      <td style={{ padding: "14px 20px", fontSize: "14px", fontFamily: "monospace" }}>{f.value}</td>
                      <td style={{ padding: "14px 20px", fontSize: "14px", color: "#6B7280" }}>{f.unit}</td>
                      <td style={{ padding: "14px 20px", fontSize: "14px" }}>{f.year}</td>
                      <td style={{ padding: "14px 20px" }}>
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
                            title="Edit"
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
                            title="Delete"
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
        
        <div style={{ 
          background: "#F8FAF8", 
          padding: "12px 20px", 
          borderTop: "1px solid #E5E7EB",
          fontSize: "13px",
          color: "#6B7280",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span>📊 Total {factors.length} emission factors</span>
          <div style={{ display: "flex", gap: "16px" }}>
            <span>🌍 {filters.region}</span>
            <span>📍 {filters.country}</span>
            {filters.city && <span>🏙️ {getCityName(filters.city)}</span>}
          </div>
        </div>
      </Card>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}