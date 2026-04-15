// src/components/dashboard/DashboardCharts/EmissionsTrendLine.jsx
import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { useEmissionStore } from "../../../store/emissionStore";
import { useAuthStore } from "../../../store/authStore";
import { FiTrendingUp, FiTrendingDown } from "react-icons/fi";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";

export default function EmissionsTrendLine() {
  const token = useAuthStore((s) => s.token);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sparklineData, setSparklineData] = useState({
    mobile: [],
    stationary: [],
    refrigerants: [],
    fugitive: [],
    electricity: { location: [], market: [] }
  });
  const [trends, setTrends] = useState({});
  const [activeSparkline, setActiveSparkline] = useState(null);

  useEffect(() => {
    if (token) {
      fetchSparklineData();
    }
  }, [token]);

  const getLast6Months = () => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        name: date.toLocaleString('default', { month: 'short' }),
        fullDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      });
    }
    return months;
  };

  const calculatePercentageChange = (data) => {
    if (data.length < 2) return null;
    const valuesWithData = data.filter(d => d.value > 0);
    if (valuesWithData.length < 2) return null;
    
    const firstValue = valuesWithData[0].value;
    const lastValue = valuesWithData[valuesWithData.length - 1].value;
    if (firstValue === 0) return null;
    const change = ((lastValue - firstValue) / firstValue) * 100;
    return {
      percent: Math.abs(change).toFixed(1),
      direction: change >= 0 ? 'up' : 'down',
      color: change >= 0 ? '#EF4444' : '#10B981'
    };
  };

  const loadFallbackData = () => {
    const scope1Results = useEmissionStore.getState().scope1Results;
    const scope2Results = useEmissionStore.getState().scope2Results;
    
    const months = getLast6Months();
    const hasData = (scope1Results?.total?.kgCO2e > 0) || (scope2Results?.total?.kgCO2e > 0);
    
    const mobileData = months.map((month, index) => ({
      month: month.name,
      value: hasData && index === months.length - 1 ? (scope1Results?.mobile?.kgCO2e || 0) / 1000 : 0,
      fullDate: month.fullDate
    }));
    
    const stationaryData = months.map((month, index) => ({
      month: month.name,
      value: hasData && index === months.length - 1 ? (scope1Results?.stationary?.kgCO2e || 0) / 1000 : 0,
      fullDate: month.fullDate
    }));
    
    const refrigerantsData = months.map((month, index) => ({
      month: month.name,
      value: hasData && index === months.length - 1 ? (scope1Results?.refrigerants?.kgCO2e || 0) / 1000 : 0,
      fullDate: month.fullDate
    }));
    
    const fugitiveData = months.map((month, index) => ({
      month: month.name,
      value: hasData && index === months.length - 1 ? (scope1Results?.fugitive?.kgCO2e || 0) / 1000 : 0,
      fullDate: month.fullDate
    }));
    
    const electricityLocationData = months.map((month, index) => ({
      month: month.name,
      value: hasData && index === months.length - 1 ? (scope2Results?.electricity?.locationBasedKgCO2e || 0) / 1000 : 0,
      fullDate: month.fullDate
    }));
    
    const electricityMarketData = months.map((month, index) => ({
      month: month.name,
      value: hasData && index === months.length - 1 ? (scope2Results?.electricity?.marketBasedKgCO2e || 0) / 1000 : 0,
      fullDate: month.fullDate
    }));
    
    setSparklineData({
      mobile: mobileData,
      stationary: stationaryData,
      refrigerants: refrigerantsData,
      fugitive: fugitiveData,
      electricity: {
        location: electricityLocationData,
        market: electricityMarketData
      }
    });
    
    const calculatedTrends = {
      mobile: calculatePercentageChange(mobileData),
      stationary: calculatePercentageChange(stationaryData),
      refrigerants: calculatePercentageChange(refrigerantsData),
      fugitive: calculatePercentageChange(fugitiveData),
      electricityLocation: calculatePercentageChange(electricityLocationData),
      electricityMarket: calculatePercentageChange(electricityMarketData)
    };
    
    setTrends(calculatedTrends);
  };

  const fetchSparklineData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/emissions/sparkline-data`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch sparkline data");
      }

      const data = await response.json();
      const months = getLast6Months();
      
      const mobileData = months.map(month => ({
        month: month.name,
        value: (data.mobile?.[month.fullDate] || 0) / 1000,
        fullDate: month.fullDate
      }));
      
      const stationaryData = months.map(month => ({
        month: month.name,
        value: (data.stationary?.[month.fullDate] || 0) / 1000,
        fullDate: month.fullDate
      }));
      
      const refrigerantsData = months.map(month => ({
        month: month.name,
        value: (data.refrigerants?.[month.fullDate] || 0) / 1000,
        fullDate: month.fullDate
      }));
      
      const fugitiveData = months.map(month => ({
        month: month.name,
        value: (data.fugitive?.[month.fullDate] || 0) / 1000,
        fullDate: month.fullDate
      }));
      
      const electricityLocationData = months.map(month => ({
        month: month.name,
        value: (data.electricityLocation?.[month.fullDate] || 0) / 1000,
        fullDate: month.fullDate
      }));
      
      const electricityMarketData = months.map(month => ({
        month: month.name,
        value: (data.electricityMarket?.[month.fullDate] || 0) / 1000,
        fullDate: month.fullDate
      }));
      
      setSparklineData({
        mobile: mobileData,
        stationary: stationaryData,
        refrigerants: refrigerantsData,
        fugitive: fugitiveData,
        electricity: {
          location: electricityLocationData,
          market: electricityMarketData
        }
      });
      
      const calculatedTrends = {
        mobile: calculatePercentageChange(mobileData),
        stationary: calculatePercentageChange(stationaryData),
        refrigerants: calculatePercentageChange(refrigerantsData),
        fugitive: calculatePercentageChange(fugitiveData),
        electricityLocation: calculatePercentageChange(electricityLocationData),
        electricityMarket: calculatePercentageChange(electricityMarketData)
      };
      
      setTrends(calculatedTrends);
      
    } catch (err) {
      console.error("Error fetching sparkline data:", err);
      loadFallbackData();
    } finally {
      setLoading(false);
    }
  };

  const SparklineCard = ({ title, data, trend, icon, color, isElectricity = false, marketData = null }) => {
    const lastValue = data.length > 0 ? data[data.length - 1].value : 0;
    const maxValue = Math.max(...data.map(d => d.value), 0.1);
    
    return (
      <div 
        className="sparkline-card"
        onMouseEnter={() => setActiveSparkline(title)}
        onMouseLeave={() => setActiveSparkline(null)}
      >
        <div className="sparkline-header">
          <div className="sparkline-title">
            {icon}
            <span>{title}</span>
          </div>
          <div className="sparkline-stats">
            <span className="sparkline-value">{lastValue.toFixed(2)} tCO₂e</span>
            {trend && (
              <span className={`sparkline-trend ${trend.direction}`}>
                {trend.direction === 'up' ? <FiTrendingUp size={10} /> : <FiTrendingDown size={10} />}
                {trend.percent}%
              </span>
            )}
          </div>
        </div>
        
        <div className="sparkline-chart">
          <ResponsiveContainer width="100%" height={60}>
            <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide={true} domain={[0, maxValue * 1.1]} />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="sparkline-tooltip">
                        <div className="tooltip-month">{payload[0].payload.month}</div>
                        <div className="tooltip-value">{payload[0].value.toFixed(2)} tCO₂e</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={{ r: 3, fill: color }}
                activeDot={{ r: 5 }}
              />
              {isElectricity && marketData && (
                <Line
                  type="monotone"
                  dataKey="value"
                  data={marketData}
                  stroke={color}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3, fill: color }}
                  activeDot={{ r: 5 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {activeSparkline === title && (
          <div className="sparkline-insight">
            {trend && trend.direction === 'up' ? (
              <span>↑ {trend.percent}% increase over last 6 months</span>
            ) : trend && trend.direction === 'down' ? (
              <span>↓ {trend.percent}% reduction over last 6 months</span>
            ) : (
              <span>Stable or no significant trend</span>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="sparklines-container">
        <div className="loading-state">Loading category trends...</div>
        <style jsx>{`
          .sparklines-container {
            padding: 16px;
            text-align: center;
            color: #6B7280;
          }
          .loading-state {
            padding: 40px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="sparklines-container">
      <div className="sparklines-grid">
        <SparklineCard
          title="Mobile Combustion"
          data={sparklineData.mobile}
          trend={trends.mobile}
          icon={<FiTrendingUp size={14} />}
          color="#3B82F6"
        />
        
        <SparklineCard
          title="Stationary Combustion"
          data={sparklineData.stationary}
          trend={trends.stationary}
          icon={<FiTrendingUp size={14} />}
          color="#F59E0B"
        />
        
        <SparklineCard
          title="Refrigerants"
          data={sparklineData.refrigerants}
          trend={trends.refrigerants}
          icon={<FiTrendingUp size={14} />}
          color="#06B6D4"
        />
        
        <SparklineCard
          title="Fugitive Emissions"
          data={sparklineData.fugitive}
          trend={trends.fugitive}
          icon={<FiTrendingUp size={14} />}
          color="#EF4444"
        />
        
        <SparklineCard
          title="Electricity"
          data={sparklineData.electricity.location}
          marketData={sparklineData.electricity.market}
          trend={trends.electricityLocation}
          icon={<FiTrendingUp size={14} />}
          color="#8B5CF6"
          isElectricity={true}
        />
      </div>
      
      <div className="sparklines-note">
        <span className="solid-line">—</span> Location-based &nbsp;&nbsp;
        <span className="dashed-line">- - -</span> Market-based
      </div>

      <style jsx>{`
        .sparklines-container {
          padding: 8px;
        }
        
        .sparklines-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }
        
        .sparkline-card {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 16px;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        
        .sparkline-card:hover {
          border-color: #2E7D64;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        
        .sparkline-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        
        .sparkline-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
        }
        
        .sparkline-stats {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .sparkline-value {
          font-size: 14px;
          font-weight: 700;
          color: #1B4D3E;
        }
        
        .sparkline-trend {
          display: flex;
          align-items: center;
          gap: 2px;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 12px;
        }
        
        .sparkline-trend.up {
          background: #FEE2E2;
          color: #DC2626;
        }
        
        .sparkline-trend.down {
          background: #D1FAE5;
          color: #059669;
        }
        
        .sparkline-chart {
          height: 60px;
          width: 100%;
        }
        
        .sparkline-insight {
          margin-top: 12px;
          padding-top: 8px;
          border-top: 1px solid #E5E7EB;
          font-size: 11px;
          color: #6B7280;
          text-align: center;
        }
        
        .sparklines-note {
          margin-top: 16px;
          padding: 8px 12px;
          background: #F9FAFB;
          border-radius: 6px;
          font-size: 11px;
          color: #6B7280;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }
        
        .solid-line {
          color: #8B5CF6;
          font-weight: bold;
        }
        
        .dashed-line {
          color: #8B5CF6;
          font-weight: bold;
          text-decoration: underline;
          text-decoration-style: dotted;
        }
        
        .sparkline-tooltip {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .tooltip-month {
          font-weight: 600;
          color: #1B4D3E;
          margin-bottom: 4px;
        }
        
        .tooltip-value {
          color: #6B7280;
        }
        
        @media (max-width: 768px) {
          .sparklines-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}