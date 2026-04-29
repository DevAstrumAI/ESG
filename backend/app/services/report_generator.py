# backend/app/services/report_generator.py
import os
from openai import OpenAI
from typing import Dict, Any, List
from datetime import datetime

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def generate_emissions_report(
    emissions_data: Dict[str, Any],
    company_name: str,
    year: int,
    period: str = "yearly",
    target_reduction: float = 50,
    target_year: int = 2030
) -> Dict[str, Any]:
    """
    Generate a comprehensive AI-powered emissions report.
    """
    
    # Extract data
    scope1_total = emissions_data.get("scope1", {}).get("totalKgCO2e", 0) / 1000
    scope2_location = emissions_data.get("scope2", {}).get("locationBasedKgCO2e", 0) / 1000
    scope2_market = emissions_data.get("scope2", {}).get("marketBasedKgCO2e", 0) / 1000
    
    # Scope 1 Breakdown
    mobile = emissions_data.get("scope1", {}).get("breakdown", {}).get("mobile", 0) / 1000
    stationary = emissions_data.get("scope1", {}).get("breakdown", {}).get("stationary", 0) / 1000
    refrigerants = emissions_data.get("scope1", {}).get("breakdown", {}).get("refrigerants", 0) / 1000
    fugitive = emissions_data.get("scope1", {}).get("breakdown", {}).get("fugitive", 0) / 1000
    
    # Scope 2 Breakdown
    electricity = emissions_data.get("scope2", {}).get("breakdown", {}).get("electricity", 0) / 1000
    heating = emissions_data.get("scope2", {}).get("breakdown", {}).get("heating", 0) / 1000
    
    # Calculate percentages
    total = scope1_total + scope2_location
    mobile_pct = (mobile / total * 100) if total > 0 else 0
    stationary_pct = (stationary / total * 100) if total > 0 else 0
    refrigerants_pct = (refrigerants / total * 100) if total > 0 else 0
    fugitive_pct = (fugitive / total * 100) if total > 0 else 0
    electricity_pct = (electricity / total * 100) if total > 0 else 0
    heating_pct = (heating / total * 100) if total > 0 else 0
    
    # Calculate required reduction per year
    years_left = target_year - year
    reduction_needed_per_year = target_reduction / years_left if years_left > 0 else 0
    current_reduction = 0  # This would come from baseline comparison
    
    # Build prompt for OpenAI
    prompt = f"""
You are a senior ESG sustainability expert. Generate a comprehensive emissions report for {company_name} for the year {year}.

## EMISSIONS DATA:

### Total Emissions
- **Total Emissions**: {total:.2f} tonnes CO₂e
- **Scope 1**: {scope1_total:.2f} tonnes CO₂e ({ (scope1_total/total*100) if total>0 else 0:.1f}%)
- **Scope 2 (Location-based)**: {scope2_location:.2f} tonnes CO₂e ({ (scope2_location/total*100) if total>0 else 0:.1f}%)
- **Scope 2 (Market-based)**: {scope2_market:.2f} tonnes CO₂e

### Detailed Breakdown by Category:
1. **Mobile Combustion**: {mobile:.2f} tonnes CO₂e ({mobile_pct:.1f}%)
2. **Stationary Combustion**: {stationary:.2f} tonnes CO₂e ({stationary_pct:.1f}%)
3. **Refrigerants**: {refrigerants:.2f} tonnes CO₂e ({refrigerants_pct:.1f}%)
4. **Fugitive Emissions**: {fugitive:.2f} tonnes CO₂e ({fugitive_pct:.1f}%)
5. **Purchased Electricity**: {electricity:.2f} tonnes CO₂e ({electricity_pct:.1f}%)
6. **Heating & Cooling**: {heating:.2f} tonnes CO₂e ({heating_pct:.1f}%)

### Target Information:
- **Reduction Target**: {target_reduction}% by {target_year}
- **Years Remaining**: {years_left}
- **Annual Reduction Needed**: {reduction_needed_per_year:.1f}% per year

---

## REPORT REQUIREMENTS:

### 1. EXECUTIVE SUMMARY
Write a concise 3-4 sentence summary highlighting key findings.

### 2. DETAILED EMISSIONS BREAKDOWN
Create a detailed analysis of emissions by category. For each major category (Mobile, Stationary, Refrigerants, Fugitive, Electricity, Heating), explain:
- Current emissions level
- What this represents (e.g., largest contributor)
- Potential sources within this category

### 3. VISUAL DATA REPRESENTATION (Text-based)
Create ASCII/character-based pie chart and bar chart showing the emissions distribution. Use simple formatting that can be displayed in text.

### 4. RECOMMENDATIONS TO REDUCE EMISSIONS
Provide specific, actionable recommendations for each category:
- **Mobile Combustion**: Suggest fleet electrification, route optimization, driver training
- **Stationary Combustion**: Recommend equipment upgrades, energy efficiency, fuel switching
- **Refrigerants**: Propose leak detection programs, low-GWP alternatives, maintenance schedules
- **Fugitive Emissions**: Suggest inspection programs, equipment replacement, methane capture
- **Electricity**: Recommend renewable energy procurement, solar installation, energy efficiency
- **Heating & Cooling**: Propose insulation improvements, heat pump installation, HVAC upgrades

### 5. QUARTERLY ACTION PLAN
Create a quarterly breakdown for the next 4 quarters with specific actions:
- **Q1 (Jan-Mar)**: Immediate actions, baseline measurements
- **Q2 (Apr-Jun)**: Implementation of quick wins
- **Q3 (Jul-Sep)**: Major initiatives launch
- **Q4 (Oct-Dec)**: Review, measurement, planning for next year

### 6. MONTHLY PROGRESS STEPS
Create a 12-month timeline with specific monthly milestones:
- Month 1-3: Assessment and planning
- Month 4-6: Implementation phase 1
- Month 7-9: Implementation phase 2
- Month 10-12: Monitoring and optimization

### 7. COST-BENEFIT ANALYSIS
For the top 3 recommended actions, estimate:
- Implementation cost (Low/Medium/High)
- Expected emissions reduction
- Payback period
- ROI potential

### 8. SUSTAINABILITY METRICS
Include:
- Emissions intensity (tCO₂e per employee, tCO₂e per revenue unit)
- Year-over-year comparison (if available)
- Benchmark against industry average

### 9. GLOSSARY OF TERMS
Explain key terms used in the report.

---

Format the report professionally with clear section headings. Use bullet points where appropriate. Make the recommendations practical and actionable.
"""
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a senior ESG sustainability expert providing professional, data-driven emissions analysis and actionable recommendations."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2500
        )
        
        report_content = response.choices[0].message.content
        
        # Parse into sections
        sections = parse_report_sections(report_content)
        
        # Generate visual data (pie chart in text)
        visual_data = generate_visual_representation({
            "Mobile": mobile, "Stationary": stationary, "Refrigerants": refrigerants,
            "Fugitive": fugitive, "Electricity": electricity, "Heating": heating
        })
        
        return {
            "success": True,
            "report": report_content,
            "sections": sections,
            "visuals": visual_data,
            "metadata": {
                "company": company_name,
                "year": year,
                "period": period,
                "total_emissions": total,
                "target_reduction": target_reduction,
                "target_year": target_year,
                "generated_at": datetime.now().isoformat()
            }
        }
        
    except Exception as e:
        print(f"OpenAI API error: {e}")
        return {
            "success": False,
            "error": str(e)
        }

def generate_visual_representation(data: Dict[str, float]) -> Dict[str, str]:
    """Generate text-based visual representations."""
    
    # Sort data by value
    sorted_items = sorted(data.items(), key=lambda x: x[1], reverse=True)
    
    # Create simple bar chart
    max_value = max(data.values()) if data.values() else 1
    bar_chart = []
    for name, value in sorted_items:
        if value > 0:
            bar_length = int((value / max_value) * 30)
            bars = "█" * bar_length
            bar_chart.append(f"{name:15} | {bars} {value:.1f} tCO₂e")
    kks
    # Create simple pie chart representation
    total = sum(data.values())
    pie_chart = []
    for name, value in sorted_items:
        if value > 0:
            percentage = (value / total * 100) if total > 0 else 0
            pie_chart.append(f"{name:15} {percentage:5.1f}% {'●' * int(percentage/5)}")
    
    return {
        "bar_chart": "\n".join(bar_chart),
        "pie_chart": "\n".join(pie_chart)
    }

def parse_report_sections(content: str) -> Dict[str, str]:
    """Parse OpenAI response into sections."""
    sections = {}
    current_section = None
    current_content = []
    
    section_markers = {
        "EXECUTIVE SUMMARY": "executive_summary",
        "DETAILED EMISSIONS BREAKDOWN": "detailed_breakdown",
        "VISUAL DATA REPRESENTATION": "visuals",
        "RECOMMENDATIONS": "recommendations",
        "QUARTERLY ACTION PLAN": "quarterly_plan",
        "MONTHLY PROGRESS STEPS": "monthly_plan",
        "COST-BENEFIT ANALYSIS": "cost_benefit",
        "SUSTAINABILITY METRICS": "metrics",
        "GLOSSARY": "glossary"
    }
    
    for line in content.split('\n'):
        line_stripped = line.strip()
        
        # Check for section headers
        matched = False
        for marker, section_key in section_markers.items():
            if line_stripped.startswith(marker) or line_stripped.upper().startswith(marker):
                if current_section:
                    sections[current_section] = '\n'.join(current_content).strip()
                current_section = section_key
                current_content = []
                matched = True
                break
        
        if not matched and current_section:
            current_content.append(line)
    
    if current_section:
        sections[current_section] = '\n'.join(current_content).strip()
    
    return sections