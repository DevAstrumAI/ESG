# backend/app/routes/formal_report.py
from dotenv import load_dotenv
load_dotenv()  # ✅ This loads your .env file

from openai import OpenAI
from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth import get_current_user
from app.utils.firebase import get_db
from openai import OpenAI
import json
import os
from datetime import datetime

router = APIRouter()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
FISCAL_YEAR_START_MONTH = 6  # June

# ---------------------------------------------------------------------------
# Helper functions (copied from reports.py)
# ---------------------------------------------------------------------------

def fetch_scope_docs(company_id: str, scope: str, year: int, month: str | None) -> list[dict]:
    """Return all Firestore emission documents for the given scope filtered by year or month."""
    db = get_db()
    docs = db.collection("emissionData").document(company_id).collection(scope).stream()
    results = []
    for doc in docs:
        d = doc.to_dict()
        if month:
            if d.get("month") == month:
                results.append(d)
        else:
            month_value = d.get("month")
            if month_value and "-" in str(month_value):
                try:
                    y_str, m_str = str(month_value).split("-")
                    y_num = int(y_str)
                    m_num = int(m_str)
                    in_fiscal_year = (y_num == year and m_num >= FISCAL_YEAR_START_MONTH) or (y_num == year + 1 and m_num < FISCAL_YEAR_START_MONTH)
                    if in_fiscal_year:
                        results.append(d)
                except (ValueError, TypeError):
                    pass
            elif d.get("year") == year:
                results.append(d)
    return results

def aggregate_scope1(docs: list[dict]) -> dict:
    """Aggregate Scope 1 docs into category totals (kgCO2e)."""
    cats = {"mobile": 0.0, "stationary": 0.0, "refrigerants": 0.0, "fugitive": 0.0}
    for doc in docs:
        res = doc.get("results", {})
        for cat in cats:
            cats[cat] += (res.get(cat) or {}).get("totalKgCO2e", 0)
    cats["total"] = sum(cats.values())
    return cats

def aggregate_scope2(docs: list[dict]) -> dict:
    """Aggregate Scope 2 docs into category totals (kgCO2e)."""
    agg = {
        "electricity_location": 0.0,
        "electricity_market":   0.0,
        "heating":              0.0,
        "renewables":           0.0,
    }
    for doc in docs:
        res  = doc.get("results", {})
        elec = res.get("electricity") or {}
        agg["electricity_location"] += elec.get("locationBasedKgCO2e", 0)
        agg["electricity_market"]   += elec.get("marketBasedKgCO2e", 0)
        agg["heating"]              += (res.get("heating") or {}).get("totalKgCO2e", 0)
        agg["renewables"]           += (res.get("renewables") or {}).get("totalKgCO2e", 0)
    agg["total_location"] = agg["electricity_location"] + agg["heating"]
    agg["total_market"]   = agg["electricity_market"]   + agg["heating"]
    return agg

def get_company_id(uid: str) -> tuple[str, dict]:
    """Get company ID and data from Firestore."""
    db = get_db()
    user_doc = db.collection("users").document(uid).get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not found.")
    company_id = user_doc.to_dict().get("companyId")
    if not company_id:
        raise HTTPException(status_code=404, detail="No company linked to this user.")
    company_doc = db.collection("companies").document(company_id).get()
    if not company_doc.exists:
        raise HTTPException(status_code=404, detail="Company not found.")
    return company_id, company_doc.to_dict()

# ---------------------------------------------------------------------------
# Regional constants (same as in reports.py)
# ---------------------------------------------------------------------------

REGIONAL_REGULATORY_CONTEXT = {
    "UAE": {
        "framework": "UAE Net Zero 2050 Strategic Initiative",
        "regulation": "UAE Cabinet Decision No. 37 of 2021 on Waste Management",
        "carbon_price_usd": 0,
        "reporting_standard": "GHG Protocol Corporate Standard / ISO 14064-1",
        "currency": "AED",
        "regulator": "UAE Ministry of Climate Change and Environment (MOCCAE)",
    },
    "Singapore": {
        "framework": "Singapore Green Plan 2030",
        "regulation": "Carbon Pricing Act 2018 (amended 2022)",
        "carbon_price_usd": 25,
        "reporting_standard": "GHG Protocol Corporate Standard / ISO 14064-1",
        "currency": "SGD",
        "regulator": "National Environment Agency (NEA)",
    },
    "Saudi Arabia": {
        "framework": "Saudi Vision 2030 / Saudi Green Initiative",
        "regulation": "Saudi Arabia NDC – 278 MtCO2e reduction by 2030",
        "carbon_price_usd": 0,
        "reporting_standard": "GHG Protocol Corporate Standard / TCFD",
        "currency": "SAR",
        "regulator": "Saudi Arabia's Presidency of Meteorology and Environment (PME)",
    },
}

BOUNDARY_METHODS = {
    "operational_control": "The organization has consolidated all emission sources over which it has operational control.",
    "equity_share": "Emissions are consolidated based on the organization's equity share in each operation.",
    "financial_control": "The organization consolidates emission sources over which it exercises financial control.",
}

# ---------------------------------------------------------------------------
# OpenAI prompt builder
# ---------------------------------------------------------------------------

def build_formal_prompt(company: dict, s1: dict, s2: dict, region_ctx: dict, reporting_year: int) -> str:
    def t(kg): return round(kg / 1000, 2)
    scope1_total_t = t(s1["total"])
    scope2_location_t = t(s2["total_location"])
    scope2_market_t = t(s2["total_market"])
    grand_total_t = scope1_total_t + scope2_location_t

    scope1_breakdown = {
        "Mobile Combustion": t(s1["mobile"]),
        "Stationary Combustion": t(s1["stationary"]),
        "Refrigerant Leakage": t(s1["refrigerants"]),
        "Fugitive Emissions": t(s1["fugitive"]),
    }
    scope2_breakdown = {
        "Electricity (Location-based)": t(s2["electricity_location"]),
        "Electricity (Market-based)": t(s2["electricity_market"]),
        "Heating & Cooling": t(s2["heating"]),
    }

    return f"""
You are a senior sustainability consultant writing a formal GHG Emissions Inventory Report 
for submission to a government regulatory body.

Company: {company.get('name')}
Industry: {company.get('industry')}
Region: {company.get('region')}
Reporting Year: {reporting_year}
Regulatory Framework: {region_ctx['framework']}
Applicable Regulation: {region_ctx['regulation']}
Reporting Standard: {region_ctx['reporting_standard']}
Regulator: {region_ctx['regulator']}

Emissions Data (tCO2e):
- Total Scope 1: {scope1_total_t:.2f}
- Total Scope 2 Location-Based: {scope2_location_t:.2f}
- Total Scope 2 Market-Based: {scope2_market_t:.2f}
- Combined Total (Location-Based): {grand_total_t:.2f}

Scope 1 Breakdown:
{json.dumps(scope1_breakdown, indent=2)}

Scope 2 Breakdown:
{json.dumps(scope2_breakdown, indent=2)}

Write a formal GHG Inventory Report with the following sections. Use formal, regulatory-grade language.
Return ONLY a JSON object with these exact keys:

{{
  "executive_summary": "2-3 paragraph formal summary of the organization's GHG inventory, total emissions, and commitment to the regional framework",
  "organizational_boundary": "Formal description of the consolidation approach (operational control), legal entities included, and geographic scope",
  "operational_boundary": "Description of Scope 1 and Scope 2 sources included, exclusions if any, and rationale",
  "methodology": "Detailed methodology statement referencing GHG Protocol, emission factor sources, calculation approach, and any assumptions",
  "scope1_narrative": "Formal narrative describing Scope 1 emission sources, quantities, and significance",
  "scope2_narrative": "Formal narrative describing Scope 2 emission sources, both location-based and market-based, and reporting approach",
  "data_quality": "Statement on data quality, uncertainty, completeness, and any limitations or estimation methods used",
  "regulatory_alignment": "How this report aligns with the specific regional regulation and framework cited above",
  "reduction_targets": "Formal reduction target commitments referencing SBTi or NDC alignment, with baseline year and target year",
  "assurance_statement": "Third-party assurance recommendation paragraph and internal verification statement",
  "glossary": {{
    "GHG": "Greenhouse Gas",
    "tCO2e": "Tonnes of Carbon Dioxide Equivalent",
    "Scope 1": "Direct emissions from owned or controlled sources",
    "Scope 2": "Indirect emissions from purchased energy",
    "SBTi": "Science Based Targets initiative",
    "GHG Protocol": "Greenhouse Gas Protocol Corporate Standard"
  }}
}}
"""

# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/generate-formal")
async def generate_formal_report(
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate a formal GHG inventory report for regulatory submission.
    Request body: { "year": 2026 } (optional, defaults to previous year)
    """
    uid = current_user.get("uid")
    try:
        # 1. Get company ID and data
        company_id, company_data = get_company_id(uid)

        # 2. Determine reporting year
        year = body.get("year", datetime.now().year - 1)

        # 3. Fetch emissions data for that year (annual, no month)
        s1_docs = fetch_scope_docs(company_id, "scope1", year, None)
        s2_docs = fetch_scope_docs(company_id, "scope2", year, None)
        s1 = aggregate_scope1(s1_docs)
        s2 = aggregate_scope2(s2_docs)

        if s1["total"] == 0 and s2["total_location"] == 0:
            raise HTTPException(
                status_code=404,
                detail=f"No emission data found for year {year}. Please submit Scope 1 and Scope 2 data first."
            )

        # 4. Get region (use company's region, fallback to UAE)
        region = company_data.get("region", "UAE")
        region_ctx = REGIONAL_REGULATORY_CONTEXT.get(region, REGIONAL_REGULATORY_CONTEXT["UAE"])

        # 5. Build prompt and call OpenAI
        prompt = build_formal_prompt(company_data, s1, s2, region_ctx, year)

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a certified GHG accounting expert and sustainability reporting specialist. "
                        "You write formal, precise, regulatory-grade ESG reports. "
                        "Return only valid JSON. No markdown, no preamble."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=3000,
        )

        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        report_content = json.loads(raw)

        # 6. Build full report payload
        formal_report = {
            "company": {
                "name": company_data.get("name"),
                "industry": company_data.get("industry"),
                "region": region,
                "country": company_data.get("country"),
                "city": company_data.get("city"),
            },
            "reporting_year": year,
            "generated_at": datetime.utcnow().isoformat(),
            "reporting_standard": region_ctx["reporting_standard"],
            "regulator": region_ctx["regulator"],
            "regulatory_framework": region_ctx["framework"],
            "boundary_method": "operational_control",
            "boundary_description": BOUNDARY_METHODS["operational_control"],
            "emissions_summary": {
                "scope1_total": round(s1["total"] / 1000, 2),
                "scope2_location_total": round(s2["total_location"] / 1000, 2),
                "scope2_market_total": round(s2["total_market"] / 1000, 2),
                "grand_total": round((s1["total"] + s2["total_location"]) / 1000, 2),
                "scope1_breakdown": {
                    "Mobile Combustion": round(s1["mobile"] / 1000, 2),
                    "Stationary Combustion": round(s1["stationary"] / 1000, 2),
                    "Refrigerant Leakage": round(s1["refrigerants"] / 1000, 2),
                    "Fugitive Emissions": round(s1["fugitive"] / 1000, 2),
                },
                "scope2_breakdown": {
                    "Electricity (Location-based)": round(s2["electricity_location"] / 1000, 2),
                    "Electricity (Market-based)": round(s2["electricity_market"] / 1000, 2),
                    "Heating & Cooling": round(s2["heating"] / 1000, 2),
                },
            },
            "report_sections": report_content,
            "glossary": report_content.get("glossary", {}),
        }

        # 7. Optional: save to Firestore (uncomment if needed)
        # db = get_db()
        # db.collection("formalReports").document(company_id).collection("reports").add(
        #     {**formal_report, "createdAt": datetime.utcnow()}
        # )

        return {"success": True, "report": formal_report}

    except HTTPException:
        raise
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))