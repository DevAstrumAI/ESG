from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.middleware.auth import get_current_user
from app.models.company import CompanyCreate, CompanyUpdate
from app.utils.firebase import get_db
from datetime import datetime
import uuid
import io
import csv
from fastapi.responses import StreamingResponse

router = APIRouter(tags=["Companies"])


def _norm(v):
    return str(v or "").strip().lower()


def _safe_float(v, default=0.0):
    try:
        if v is None or v == "":
            return float(default)
        return float(v)
    except (TypeError, ValueError):
        return float(default)


def _month_in_fiscal(month_str: str, fiscal_start_year: int) -> bool:
    try:
        y, m = map(int, str(month_str).split("-"))
    except Exception:
        return False
    if m >= 6:
        return y == fiscal_start_year
    return y == (fiscal_start_year + 1)


def _iter_fiscal_months(fiscal_start_year: int):
    for idx in range(12):
        month_num = ((6 - 1 + idx) % 12) + 1
        year_num = fiscal_start_year if month_num >= 6 else fiscal_start_year + 1
        yield f"{year_num}-{month_num:02d}"


def _parse_mobile_activity(entry: dict):
    litres = _safe_float(entry.get("litresConsumed"), 0)
    km = _safe_float(entry.get("distanceKm"), 0)
    qty = km if km > 0 else litres
    unit = "km" if km > 0 else "litres"
    vehicles = _safe_float(
        entry.get("vehicleCount")
        or entry.get("count")
        or entry.get("vehicle_count")
        or entry.get("vehicles")
        or entry.get("numberOfVehicles")
        or 0,
        0,
    )
    if vehicles <= 0 and qty > 0:
        vehicles = 1.0
    return qty, unit, vehicles


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_company(
    company_data: CompanyCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new company and link it to the current user.
    Called when the user completes the company setup wizard.
    """
    db = get_db()
    uid = current_user.get("uid")

    try:
        # Check if user already has a company
        user_doc = db.collection("users").document(uid).get()
        if not user_doc.exists:
            raise HTTPException(status_code=404, detail="User profile not found.")

        user_data = user_doc.to_dict()
        if user_data.get("companyId"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User already has a company. Use PUT to update it.",
            )

        # Generate company ID
        company_id = str(uuid.uuid4())

        # Save company to Firestore
        db.collection("companies").document(company_id).set({
            "basicInfo": {
                "name": company_data.name,
                "description": company_data.description or "",
                "logo": company_data.logo or "",
                "industry": company_data.industry,
                "employees": company_data.employees,
                "branchEmployees": company_data.branchEmployees or [],
                "revenue": company_data.revenue,
                "region": company_data.region,
                "fiscalYear": company_data.fiscalYear,
            },
            "locations": [loc.dict() for loc in company_data.locations],
            "createdAt": datetime.utcnow().isoformat(),
            "updatedAt": datetime.utcnow().isoformat(),
        })

        # Link company to user
        db.collection("users").document(uid).update({"companyId": company_id})

        # Create default settings for the company
        db.collection("settings").document(company_id).set({
            "companyId": company_id,
            "reportingPreferences": {
                "defaultYear": company_data.fiscalYear,
                "defaultPeriod": "monthly",
                "currency": "USD",
                "distanceUnit": "km",
                "fuelUnit": "liters",
            },
            "notificationSettings": {
                "emailReports": True,
                "reminders": True,
            },
            "factorSource": "UAE MoCCaE",
            "updatedAt": datetime.utcnow().isoformat(),
        })

        return {
            "message": "Company created successfully.",
            "companyId": company_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create company: {str(e)}")


@router.get("/me")
async def get_my_company(current_user: dict = Depends(get_current_user)):
    """
    Fetch the current user's company data.
    Used to load the dashboard and company settings.
    """
    db = get_db()
    uid = current_user.get("uid")

    try:
        # Get user to find companyId
        user_doc = db.collection("users").document(uid).get()
        if not user_doc.exists:
            raise HTTPException(status_code=404, detail="User profile not found.")

        company_id = user_doc.to_dict().get("companyId")
        if not company_id:
            raise HTTPException(
                status_code=404,
                detail="No company found. Please complete the company setup.",
            )

        # Get company data
        company_doc = db.collection("companies").document(company_id).get()
        if not company_doc.exists:
            raise HTTPException(status_code=404, detail="Company data not found.")

        return {
            "companyId": company_id,
            "company": company_doc.to_dict(),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch company: {str(e)}")


@router.put("/me")
async def update_my_company(
    company_data: CompanyUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update the current user's company info, locations, or fiscal year.
    """
    db = get_db()
    uid = current_user.get("uid")

    try:
        # Get companyId from user profile
        user_doc = db.collection("users").document(uid).get()
        if not user_doc.exists:
            raise HTTPException(status_code=404, detail="User profile not found.")

        company_id = user_doc.to_dict().get("companyId")
        if not company_id:
            raise HTTPException(status_code=404, detail="No company found.")

        # Build update payload — only include fields that were provided
        update_data = {"updatedAt": datetime.utcnow().isoformat()}

        if company_data.name is not None:
            update_data["basicInfo.name"] = company_data.name
        if company_data.description is not None:
            update_data["basicInfo.description"] = company_data.description
        if company_data.logo is not None:
            update_data["basicInfo.logo"] = company_data.logo
        if company_data.industry is not None:
            update_data["basicInfo.industry"] = company_data.industry
        if company_data.employees is not None:
            update_data["basicInfo.employees"] = company_data.employees
        if company_data.branchEmployees is not None:
            update_data["basicInfo.branchEmployees"] = company_data.branchEmployees
        if company_data.revenue is not None:
            update_data["basicInfo.revenue"] = company_data.revenue
        if company_data.region is not None:
            update_data["basicInfo.region"] = company_data.region
        if company_data.fiscalYear is not None:
            update_data["basicInfo.fiscalYear"] = company_data.fiscalYear
        if company_data.locations is not None:
            update_data["locations"] = [loc.dict() for loc in company_data.locations]

        company_ref = db.collection("companies").document(company_id)
        company_ref.update(update_data)
        updated_doc = company_ref.get()

        return {
            "message": "Company updated successfully.",
            "company": updated_doc.to_dict() if updated_doc.exists else None,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update company: {str(e)}")


@router.get("/region-transition-export")
async def export_region_transition_csv(
    years: int = Query(5, ge=1, le=5),
    current_user: dict = Depends(get_current_user),
):
    """
    Export up to past 5 fiscal years of detailed emissions + summaries + intensity rows
    for all branch locations. Used before region-model downsizing in setup summary.
    """
    db = get_db()
    uid = current_user.get("uid")

    user_doc = db.collection("users").document(uid).get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User profile not found.")
    company_id = user_doc.to_dict().get("companyId")
    if not company_id:
        raise HTTPException(status_code=404, detail="No company found.")

    company_doc = db.collection("companies").document(company_id).get()
    if not company_doc.exists:
        raise HTTPException(status_code=404, detail="Company not found.")
    company_data = company_doc.to_dict() or {}
    basic = company_data.get("basicInfo") or {}
    locations = company_data.get("locations") or []
    branch_employees = basic.get("branchEmployees") or []

    # Build branch roster from configured locations.
    branch_rows = []
    for loc in locations:
        branch_rows.append(
            {
                "region": _norm(loc.get("region")),
                "country": _norm(loc.get("country")),
                "city": _norm(loc.get("city")),
                "branch": _norm(loc.get("branch")),
            }
        )
    if not branch_rows:
        branch_rows = [{"region": _norm(basic.get("region")), "country": "", "city": "", "branch": ""}]

    # Pull scope docs once.
    s1_docs = [doc.to_dict() or {} for doc in db.collection("emissionData").document(company_id).collection("scope1").stream()]
    s2_docs = [doc.to_dict() or {} for doc in db.collection("emissionData").document(company_id).collection("scope2").stream()]

    def _fiscal_start_from_month(month_str: str):
        try:
            y, m = map(int, str(month_str).split("-"))
        except Exception:
            return None
        return y if m >= 6 else y - 1

    # Export only years that actually have data (up to requested `years`).
    all_docs = [*s1_docs, *s2_docs]
    available_fiscal_years = sorted(
        {
            fy
            for d in all_docs
            for fy in [_fiscal_start_from_month(str(d.get("month") or ""))]
            if fy is not None
        }
    )
    if not available_fiscal_years:
        raise HTTPException(status_code=404, detail="No historical emissions data available to export.")
    selected_fiscal_years = available_fiscal_years[-years:]
    selected_months = {m for fy in selected_fiscal_years for m in _iter_fiscal_months(fy)}
    s1_docs = [d for d in s1_docs if str(d.get("month") or "") in selected_months]
    s2_docs = [d for d in s2_docs if str(d.get("month") or "") in selected_months]

    def loc_key(region, country, city, branch, month):
        return f"{_norm(region)}|{_norm(country)}|{_norm(city)}|{_norm(branch)}|{month}"

    s1_by_key = {}
    for d in s1_docs:
        k = loc_key(d.get("region"), d.get("country"), d.get("city"), d.get("branch"), d.get("month"))
        s1_by_key[k] = d
    s2_by_key = {}
    for d in s2_docs:
        k = loc_key(d.get("region"), d.get("country"), d.get("city"), d.get("branch"), d.get("month"))
        s2_by_key[k] = d

    # Include locations that existed historically in docs, not only current company location list.
    existing_location_keys = set()
    for d in [*s1_docs, *s2_docs]:
        existing_location_keys.add(
            (
                _norm(d.get("region")),
                _norm(d.get("country")),
                _norm(d.get("city")),
                _norm(d.get("branch")),
            )
        )
    for r, c, t, b in existing_location_keys:
        if not any(
            _norm(x.get("region")) == r
            and _norm(x.get("country")) == c
            and _norm(x.get("city")) == t
            and _norm(x.get("branch")) == b
            for x in branch_rows
        ):
            branch_rows.append({"region": r, "country": c, "city": t, "branch": b})

    def employee_count_for(loc):
        for row in branch_employees:
            if (
                _norm(row.get("region")) == _norm(loc.get("region"))
                and _norm(row.get("country")) == _norm(loc.get("country"))
                and _norm(row.get("city")) == _norm(loc.get("city"))
                and _norm(row.get("branch")) == _norm(loc.get("branch"))
            ):
                return _safe_float(row.get("employees"), 0)
        return 0.0

    output = io.StringIO()
    fieldnames = [
        "section",
        "fiscal_year",
        "month",
        "region",
        "country",
        "city",
        "branch",
        "scope",
        "category",
        "source",
        "quantity",
        "unit",
        "vehicle_count",
        "kgco2e",
        "scope1_total_kg",
        "scope2_location_kg",
        "scope2_market_kg",
        "combined_total_kg",
        "employee_count",
        "per_employee_kg",
        "monthly_vehicle_count",
        "per_vehicle_kg",
    ]
    rows_out = []
    ordered_months = [m for fy in selected_fiscal_years for m in _iter_fiscal_months(fy)]
    for loc in branch_rows:
        employees = employee_count_for(loc)
        for month in ordered_months:
            fiscal_year = int(month[:4]) if int(month[5:7]) >= 6 else int(month[:4]) - 1
            key = loc_key(loc["region"], loc["country"], loc["city"], loc["branch"], month)
            s1 = s1_by_key.get(key) or {}
            s2 = s2_by_key.get(key) or {}
            s1_results = s1.get("results") or {}
            s2_results = s2.get("results") or {}
            raw1 = s1.get("rawData") or {}
            raw2 = s2.get("rawData") or {}

            scope1_total = _safe_float(s1_results.get("totalKgCO2e"), 0)
            scope2_loc = _safe_float(s2_results.get("locationBasedKgCO2e"), 0)
            scope2_mkt = _safe_float(s2_results.get("marketBasedKgCO2e"), 0)
            combined = scope1_total + scope2_loc

            monthly_vehicle_count = 0.0
            for e in raw1.get("mobile") or []:
                _, _, vehicles = _parse_mobile_activity(e or {})
                monthly_vehicle_count += vehicles

            has_raw = bool(
                (raw1.get("mobile") or [])
                or (raw1.get("stationary") or [])
                or (raw1.get("refrigerants") or [])
                or (raw1.get("fugitive") or [])
                or (raw2.get("electricity") or [])
                or (raw2.get("heating") or [])
                or (raw2.get("renewables") or [])
            )
            has_totals = (scope1_total > 0) or (scope2_loc > 0) or (scope2_mkt > 0)
            if not has_raw and not has_totals:
                continue

            per_employee = (combined / employees) if employees > 0 else 0.0
            per_vehicle = (combined / monthly_vehicle_count) if monthly_vehicle_count > 0 else 0.0

            def write_raw_rows(scope_name, category, entries, qty_key, unit_default):
                written = 0
                for entry in entries or []:
                    qty = entry.get(qty_key)
                    unit = unit_default
                    vcount = ""
                    if category == "mobile":
                        qty, unit, vcount = _parse_mobile_activity(entry or {})
                    rows_out.append({
                        "section": "raw_entry",
                        "fiscal_year": f"{fiscal_year}-{fiscal_year + 1}",
                        "month": month,
                        "region": loc["region"],
                        "country": loc["country"],
                        "city": loc["city"],
                        "branch": loc["branch"],
                        "scope": scope_name,
                        "category": category,
                        "source": entry.get("fuelType") or entry.get("refrigerantType") or entry.get("sourceType") or entry.get("energyType") or "",
                        "quantity": qty if qty is not None else "",
                        "unit": unit,
                        "vehicle_count": vcount,
                        "kgco2e": entry.get("kgCO2e") or "",
                        "scope1_total_kg": "",
                        "scope2_location_kg": "",
                        "scope2_market_kg": "",
                        "combined_total_kg": "",
                        "employee_count": "",
                        "per_employee_kg": "",
                        "monthly_vehicle_count": "",
                        "per_vehicle_kg": "",
                    })
                    written += 1
                return written

            data_written = 0
            data_written += write_raw_rows("scope1", "mobile", raw1.get("mobile"), "litresConsumed", "litres")
            data_written += write_raw_rows("scope1", "stationary", raw1.get("stationary"), "consumption", "")
            data_written += write_raw_rows("scope1", "refrigerants", raw1.get("refrigerants"), "leakageKg", "kg")
            data_written += write_raw_rows("scope1", "fugitive", raw1.get("fugitive"), "emissionKg", "kg")
            data_written += write_raw_rows("scope2", "electricity", raw2.get("electricity"), "consumptionKwh", "kWh")
            data_written += write_raw_rows("scope2", "heating", raw2.get("heating"), "consumptionKwh", "kWh")
            data_written += write_raw_rows("scope2", "renewables", raw2.get("renewables"), "generationKwh", "kWh")

            rows_out.append({
                "section": "scope_summary",
                "fiscal_year": f"{fiscal_year}-{fiscal_year + 1}",
                "month": month,
                "region": loc["region"],
                "country": loc["country"],
                "city": loc["city"],
                "branch": loc["branch"],
                "scope": "scope1+scope2",
                "category": "monthly_total",
                "source": "",
                "quantity": "",
                "unit": "",
                "vehicle_count": "",
                "kgco2e": "",
                "scope1_total_kg": round(scope1_total, 4),
                "scope2_location_kg": round(scope2_loc, 4),
                "scope2_market_kg": round(scope2_mkt, 4),
                "combined_total_kg": round(combined, 4),
                "employee_count": "",
                "per_employee_kg": "",
                "monthly_vehicle_count": "",
                "per_vehicle_kg": "",
            })

            rows_out.append({
                "section": "intensity",
                "fiscal_year": f"{fiscal_year}-{fiscal_year + 1}",
                "month": month,
                "region": loc["region"],
                "country": loc["country"],
                "city": loc["city"],
                "branch": loc["branch"],
                "scope": "scope1+scope2",
                "category": "intensity",
                "source": "",
                "quantity": "",
                "unit": "kgCO2e",
                "vehicle_count": "",
                "kgco2e": "",
                "scope1_total_kg": "",
                "scope2_location_kg": "",
                "scope2_market_kg": "",
                "combined_total_kg": round(combined, 4),
                "employee_count": round(employees, 4),
                "per_employee_kg": round(per_employee, 6),
                "monthly_vehicle_count": round(monthly_vehicle_count, 4),
                "per_vehicle_kg": round(per_vehicle, 6),
            })

    if not rows_out:
        raise HTTPException(status_code=404, detail="No non-empty data rows found for the selected export window.")

    section_rank = {"scope_summary": 0, "intensity": 1, "raw_entry": 2}
    rows_out.sort(
        key=lambda r: (
            section_rank.get(str(r.get("section") or ""), 9),
            str(r.get("fiscal_year") or ""),
            str(r.get("month") or ""),
            str(r.get("region") or ""),
            str(r.get("country") or ""),
            str(r.get("city") or ""),
            str(r.get("branch") or ""),
            str(r.get("scope") or ""),
            str(r.get("category") or ""),
            str(r.get("source") or ""),
        )
    )

    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows_out)

    content = output.getvalue()
    output.close()
    filename = f"region_transition_export_{len(selected_fiscal_years)}y.csv"
    return StreamingResponse(
        iter([content]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )