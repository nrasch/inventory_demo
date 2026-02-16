from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
import sqlite3
import os
from contextlib import contextmanager

app = FastAPI(title="Metal Fabrication Inventory API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "https://dapper-kitsune-d5bc74.netlify.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup - use absolute path
DB_NAME = os.path.join(os.path.dirname(os.path.abspath(__file__)), "inventory.db")

@contextmanager
def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS clients (
                account_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                address TEXT NOT NULL,
                phone TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active'
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                job_id TEXT PRIMARY KEY,
                client_account_id INTEGER NOT NULL,
                crew_id INTEGER,
                address TEXT NOT NULL,
                scheduled_date TEXT NOT NULL,
                cost_estimate REAL NOT NULL,
                actual_hours REAL,
                actual_hourly_rate REAL,
                actual_materials_cost REAL,
                actual_total_cost REAL,
                status TEXT DEFAULT 'scheduled',
                FOREIGN KEY (client_account_id) REFERENCES clients(account_id),
                FOREIGN KEY (crew_id) REFERENCES work_crews(crew_id)
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS inventory (
                item_id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                cost REAL NOT NULL,
                cost_markup REAL NOT NULL,
                assigned_job_id TEXT,
                FOREIGN KEY (assigned_job_id) REFERENCES jobs(job_id)
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS estimates (
                estimate_id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                estimated_hours REAL DEFAULT 0,
                estimated_hourly_rate REAL DEFAULT 0,
                total_materials_cost REAL DEFAULT 0,
                total_hourly_cost REAL DEFAULT 0,
                total_estimate_cost REAL DEFAULT 0,
                scheduled_date TEXT,
                date_created TEXT NOT NULL,
                date_updated TEXT NOT NULL,
                FOREIGN KEY (client_id) REFERENCES clients(account_id)
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS estimate_materials (
                material_id INTEGER PRIMARY KEY AUTOINCREMENT,
                estimate_id INTEGER NOT NULL,
                description TEXT NOT NULL,
                quantity REAL DEFAULT 1,
                unit_cost REAL DEFAULT 0,
                total_cost REAL DEFAULT 0,
                FOREIGN KEY (estimate_id) REFERENCES estimates(estimate_id) ON DELETE CASCADE
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS material_types (
                type_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS vendors (
                vendor_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                notes TEXT,
                contact_name TEXT,
                phone TEXT,
                email TEXT,
                address TEXT
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS materials (
                material_id INTEGER PRIMARY KEY AUTOINCREMENT,
                type_id INTEGER NOT NULL,
                vendor_id INTEGER,
                price_paid_per_unit REAL DEFAULT 0,
                units_held REAL DEFAULT 0,
                client_price_per_unit REAL DEFAULT 0,
                reorder_threshold REAL DEFAULT 0,
                description TEXT,
                FOREIGN KEY (type_id) REFERENCES material_types(type_id),
                FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id)
            )
        """)
        # Seed some default material types
        cursor.execute("INSERT OR IGNORE INTO material_types (name) VALUES ('Metal Tubing')")
        cursor.execute("INSERT OR IGNORE INTO material_types (name) VALUES ('Metal Sheets')")
        cursor.execute("INSERT OR IGNORE INTO material_types (name) VALUES ('Rebar')")
        cursor.execute("INSERT OR IGNORE INTO material_types (name) VALUES ('Powder Coating')")
        cursor.execute("INSERT OR IGNORE INTO material_types (name) VALUES ('Hardware')")
        cursor.execute("INSERT OR IGNORE INTO material_types (name) VALUES (' Consumables')")
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS employees (
                employee_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT,
                status TEXT NOT NULL DEFAULT 'active',
                role TEXT
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS work_crews (
                crew_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active'
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS crew_members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                crew_id INTEGER NOT NULL,
                employee_id INTEGER NOT NULL,
                FOREIGN KEY (crew_id) REFERENCES work_crews(crew_id) ON DELETE CASCADE,
                FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
            )
        """)
        conn.commit()

# Pydantic models
class ClientCreate(BaseModel):
    name: str
    address: str
    phone: str
    status: str = "active"

class Client(BaseModel):
    account_id: int
    name: str
    address: str
    phone: str
    status: str

class Job(BaseModel):
    job_id: str
    client_account_id: int
    crew_id: Optional[int] = None
    address: str
    scheduled_date: str
    cost_estimate: float
    actual_hours: Optional[float] = None
    actual_hourly_rate: Optional[float] = None
    actual_materials_cost: Optional[float] = None
    actual_total_cost: Optional[float] = None
    status: str = "scheduled"

class InventoryItem(BaseModel):
    item_id: Optional[int] = None
    type: str
    quantity: int
    cost: float
    cost_markup: float
    assigned_job_id: Optional[str] = None

class EstimateMaterialCreate(BaseModel):
    description: str
    quantity: float = 1
    unit_cost: float = 0

class EstimateMaterial(BaseModel):
    material_id: int
    estimate_id: int
    description: str
    quantity: float
    unit_cost: float
    total_cost: float

class EstimateCreate(BaseModel):
    client_id: int
    status: str = "pending"
    estimated_hours: float = 0
    estimated_hourly_rate: float = 0
    scheduled_date: Optional[str] = None

class Estimate(BaseModel):
    estimate_id: int
    client_id: int
    status: str
    estimated_hours: float
    estimated_hourly_rate: float
    total_materials_cost: float
    total_hourly_cost: float
    total_estimate_cost: float
    scheduled_date: Optional[str]
    date_created: str
    date_updated: str
    materials: List[EstimateMaterial] = []

class MaterialType(BaseModel):
    type_id: int
    name: str

class MaterialTypeCreate(BaseModel):
    name: str

class Vendor(BaseModel):
    vendor_id: int
    name: str
    status: str
    notes: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

class VendorCreate(BaseModel):
    name: str
    status: str = "active"
    notes: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

class MaterialCreate(BaseModel):
    type_id: int
    vendor_id: Optional[int] = None
    price_paid_per_unit: float = 0
    units_held: float = 0
    client_price_per_unit: float = 0
    reorder_threshold: float = 0
    description: Optional[str] = None

class Material(BaseModel):
    material_id: int
    type_id: int
    vendor_id: Optional[int] = None
    price_paid_per_unit: float
    units_held: float
    client_price_per_unit: float
    reorder_threshold: float
    description: Optional[str] = None

class Employee(BaseModel):
    employee_id: int
    name: str
    phone: Optional[str] = None
    status: str
    role: Optional[str] = None

class EmployeeCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    status: str = "active"
    role: Optional[str] = None

class WorkCrew(BaseModel):
    crew_id: int
    name: str
    status: str
    members: List[Employee] = []

class WorkCrewCreate(BaseModel):
    name: str
    status: str = "active"
    member_ids: List[int] = []

class WorkCrewSimple(BaseModel):
    crew_id: int
    name: str
    status: str

# Client endpoints
@app.post("/clients", response_model=Client)
def create_client(client: ClientCreate):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO clients (name, address, phone, status) VALUES (?, ?, ?, ?)",
            (client.name, client.address, client.phone, client.status)
        )
        client_id = cursor.lastrowid
        conn.commit()
        cursor.execute("SELECT * FROM clients WHERE account_id = ?", (client_id,))
        row = cursor.fetchone()
        return dict(row)

@app.get("/clients", response_model=List[Client])
def get_clients():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM clients")
        return [dict(row) for row in cursor.fetchall()]

@app.get("/clients/{account_id}")
def get_client(account_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM clients WHERE account_id = ?", (account_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Client not found")
        return dict(row)

@app.delete("/clients/{account_id}")
def delete_client(account_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM clients WHERE account_id = ?", (account_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Client not found")
        conn.commit()
    return {"message": "Client deleted"}

@app.put("/clients/{account_id}")
def update_client(account_id: int, client: ClientCreate):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE clients SET name=?, address=?, phone=?, status=? WHERE account_id=?",
            (client.name, client.address, client.phone, client.status, account_id)
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Client not found")
        conn.commit()
        cursor.execute("SELECT * FROM clients WHERE account_id = ?", (account_id,))
        row = cursor.fetchone()
        return dict(row)

# Job endpoints
@app.post("/jobs")
def create_job(job: Job):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM clients WHERE account_id = ?", (job.client_account_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=400, detail="Client not found")
        
        if job.crew_id:
            cursor.execute("SELECT * FROM work_crews WHERE crew_id = ?", (job.crew_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=400, detail="Work crew not found")
        
        try:
            cursor.execute(
                "INSERT INTO jobs VALUES (?, ?, ?, ?, ?, ?)",
                (job.job_id, job.client_account_id, job.crew_id, job.address, job.scheduled_date, job.cost_estimate)
            )
            conn.commit()
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=400, detail="Job already exists")
    return job

@app.get("/jobs", response_model=List[Job])
def get_jobs():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM jobs ORDER BY scheduled_date DESC")
        return [dict(row) for row in cursor.fetchall()]

@app.get("/jobs/{job_id}")
def get_job(job_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM jobs WHERE job_id = ?", (job_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Job not found")
        return dict(row)

@app.get("/jobs/client/{client_account_id}")
def get_client_jobs(client_account_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM jobs WHERE client_account_id = ?", (client_account_id,))
        return [dict(row) for row in cursor.fetchall()]

@app.delete("/jobs/{job_id}")
def delete_job(job_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        # Unassign inventory from this job first
        cursor.execute("UPDATE inventory SET assigned_job_id = NULL WHERE assigned_job_id = ?", (job_id,))
        cursor.execute("DELETE FROM jobs WHERE job_id = ?", (job_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Job not found")
        conn.commit()
    return {"message": "Job deleted"}

@app.put("/jobs/{job_id}")
def update_job(job_id: str, job: Job):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM clients WHERE account_id = ?", (job.client_account_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=400, detail="Client not found")
        
        if job.crew_id:
            cursor.execute("SELECT * FROM work_crews WHERE crew_id = ?", (job.crew_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=400, detail="Work crew not found")
        
        # Calculate actual total if provided
        actual_total = job.actual_total_cost
        if job.actual_hours is not None and job.actual_hourly_rate is not None:
            hourly_cost = job.actual_hours * job.actual_hourly_rate
            materials_cost = job.actual_materials_cost or 0
            actual_total = hourly_cost + materials_cost
        
        cursor.execute(
            """UPDATE jobs SET client_account_id=?, crew_id=?, address=?, scheduled_date=?, 
               cost_estimate=?, actual_hours=?, actual_hourly_rate=?, actual_materials_cost=?, 
               actual_total_cost=?, status=? WHERE job_id=?""",
            (job.client_account_id, job.crew_id, job.address, job.scheduled_date, job.cost_estimate,
             job.actual_hours, job.actual_hourly_rate, job.actual_materials_cost, actual_total, 
             job.status, job_id)
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Job not found")
        conn.commit()
        cursor.execute("SELECT * FROM jobs WHERE job_id = ?", (job_id,))
        return dict(cursor.fetchone())

# Inventory endpoints
@app.post("/inventory", response_model=InventoryItem)
def create_inventory(item: InventoryItem):
    with get_db() as conn:
        cursor = conn.cursor()
        if item.assigned_job_id:
            cursor.execute("SELECT * FROM jobs WHERE job_id = ?", (item.assigned_job_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=400, detail="Job not found")
        
        cursor.execute(
            "INSERT INTO inventory (type, quantity, cost, cost_markup, assigned_job_id) VALUES (?, ?, ?, ?, ?)",
            (item.type, item.quantity, item.cost, item.cost_markup, item.assigned_job_id)
        )
        item_id = cursor.lastrowid
        conn.commit()
        
        cursor.execute("SELECT * FROM inventory WHERE item_id = ?", (item_id,))
        return dict(cursor.fetchone())

@app.get("/inventory", response_model=List[InventoryItem])
def get_inventory():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM inventory")
        return [dict(row) for row in cursor.fetchall()]

@app.get("/inventory/{item_id}")
def get_inventory_item(item_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM inventory WHERE item_id = ?", (item_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Item not found")
        return dict(row)

@app.get("/inventory/job/{job_id}")
def get_job_inventory(job_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM inventory WHERE assigned_job_id = ?", (job_id,))
        return [dict(row) for row in cursor.fetchall()]

@app.put("/inventory/{item_id}")
def update_inventory(item_id: int, item: InventoryItem):
    with get_db() as conn:
        cursor = conn.cursor()
        if item.assigned_job_id:
            cursor.execute("SELECT * FROM jobs WHERE job_id = ?", (item.assigned_job_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=400, detail="Job not found")
        cursor.execute(
            "UPDATE inventory SET type=?, quantity=?, cost=?, cost_markup=?, assigned_job_id=? WHERE item_id=?",
            (item.type, item.quantity, item.cost, item.cost_markup, item.assigned_job_id, item_id)
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Item not found")
        conn.commit()
        cursor.execute("SELECT * FROM inventory WHERE item_id = ?", (item_id,))
        return dict(cursor.fetchone())

@app.delete("/inventory/{item_id}")
def delete_inventory(item_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM inventory WHERE item_id = ?", (item_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Item not found")
        conn.commit()
    return {"message": "Item deleted"}

# Estimate endpoints
@app.post("/estimates", response_model=Estimate)
def create_estimate(estimate: EstimateCreate):
    with get_db() as conn:
        cursor = conn.cursor()
        # Verify client exists
        cursor.execute("SELECT * FROM clients WHERE account_id = ?", (estimate.client_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=400, detail="Client not found")
        
        now = datetime.now().isoformat()
        total_hourly = estimate.estimated_hours * estimate.estimated_hourly_rate
        
        cursor.execute(
            """INSERT INTO estimates (client_id, status, estimated_hours, estimated_hourly_rate, 
               total_materials_cost, total_hourly_cost, total_estimate_cost, scheduled_date, date_created, date_updated)
               VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?)""",
            (estimate.client_id, estimate.status, estimate.estimated_hours, estimate.estimated_hourly_rate,
             total_hourly, total_hourly, estimate.scheduled_date, now, now)
        )
        estimate_id = cursor.lastrowid
        conn.commit()
        
        cursor.execute("SELECT * FROM estimates WHERE estimate_id = ?", (estimate_id,))
        row = cursor.fetchone()
        result = dict(row)
        result['materials'] = []
        return result

@app.get("/estimates", response_model=List[Estimate])
def get_estimates():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM estimates ORDER BY estimate_id DESC")
        estimates = []
        for row in cursor.fetchall():
            est = dict(row)
            cursor.execute("SELECT * FROM estimate_materials WHERE estimate_id = ?", (est['estimate_id'],))
            est['materials'] = [dict(m) for m in cursor.fetchall()]
            estimates.append(est)
        return estimates

@app.get("/estimates/{estimate_id}")
def get_estimate(estimate_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM estimates WHERE estimate_id = ?", (estimate_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Estimate not found")
        est = dict(row)
        cursor.execute("SELECT * FROM estimate_materials WHERE estimate_id = ?", (estimate_id,))
        est['materials'] = [dict(m) for m in cursor.fetchall()]
        return est

@app.put("/estimates/{estimate_id}")
def update_estimate(estimate_id: int, estimate: EstimateCreate):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM clients WHERE account_id = ?", (estimate.client_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=400, detail="Client not found")
        
        now = datetime.now().isoformat()
        total_hourly = estimate.estimated_hours * estimate.estimated_hourly_rate
        
        # Get current materials total
        cursor.execute("SELECT SUM(total_cost) as mat_total FROM estimate_materials WHERE estimate_id = ?", (estimate_id,))
        mat_result = cursor.fetchone()
        total_materials = mat_result['mat_total'] if mat_result['mat_total'] else 0
        total_estimate = total_materials + total_hourly
        
        cursor.execute(
            """UPDATE estimates SET client_id=?, status=?, estimated_hours=?, estimated_hourly_rate=?,
               total_materials_cost=?, total_hourly_cost=?, total_estimate_cost=?, scheduled_date=?, date_updated=?
               WHERE estimate_id=?""",
            (estimate.client_id, estimate.status, estimate.estimated_hours, estimate.estimated_hourly_rate,
             total_materials, total_hourly, total_estimate, estimate.scheduled_date, now, estimate_id)
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Estimate not found")
        conn.commit()
        
        cursor.execute("SELECT * FROM estimates WHERE estimate_id = ?", (estimate_id,))
        row = cursor.fetchone()
        est = dict(row)
        cursor.execute("SELECT * FROM estimate_materials WHERE estimate_id = ?", (estimate_id,))
        est['materials'] = [dict(m) for m in cursor.fetchall()]
        return est

@app.delete("/estimates/{estimate_id}")
def delete_estimate(estimate_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM estimate_materials WHERE estimate_id = ?", (estimate_id,))
        cursor.execute("DELETE FROM estimates WHERE estimate_id = ?", (estimate_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Estimate not found")
        conn.commit()
    return {"message": "Estimate deleted"}

# Estimate Materials endpoints
@app.post("/estimates/{estimate_id}/materials")
def add_estimate_material(estimate_id: int, material: EstimateMaterialCreate):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM estimates WHERE estimate_id = ?", (estimate_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Estimate not found")
        
        total_cost = material.quantity * material.unit_cost
        
        cursor.execute(
            "INSERT INTO estimate_materials (estimate_id, description, quantity, unit_cost, total_cost) VALUES (?, ?, ?, ?, ?)",
            (estimate_id, material.description, material.quantity, material.unit_cost, total_cost)
        )
        material_id = cursor.lastrowid
        
        # Update estimate totals
        cursor.execute("SELECT SUM(total_cost) as mat_total FROM estimate_materials WHERE estimate_id = ?", (estimate_id,))
        mat_result = cursor.fetchone()
        total_materials = mat_result['mat_total'] if mat_result['mat_total'] else 0
        
        cursor.execute("SELECT estimated_hours, estimated_hourly_rate FROM estimates WHERE estimate_id = ?", (estimate_id,))
        est = cursor.fetchone()
        total_hourly = (est['estimated_hours'] or 0) * (est['estimated_hourly_rate'] or 0)
        
        now = datetime.now().isoformat()
        cursor.execute(
            "UPDATE estimates SET total_materials_cost=?, total_estimate_cost=?, date_updated=? WHERE estimate_id=?",
            (total_materials, total_materials + total_hourly, now, estimate_id)
        )
        
        conn.commit()
        cursor.execute("SELECT * FROM estimate_materials WHERE material_id = ?", (material_id,))
        return dict(cursor.fetchone())

@app.delete("/estimates/{estimate_id}/materials/{material_id}")
def delete_estimate_material(estimate_id: int, material_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM estimate_materials WHERE material_id = ? AND estimate_id = ?", (material_id, estimate_id))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Material not found")
        
        # Update estimate totals
        cursor.execute("SELECT SUM(total_cost) as mat_total FROM estimate_materials WHERE estimate_id = ?", (estimate_id,))
        mat_result = cursor.fetchone()
        total_materials = mat_result['mat_total'] if mat_result['mat_total'] else 0
        
        cursor.execute("SELECT estimated_hours, estimated_hourly_rate FROM estimates WHERE estimate_id = ?", (estimate_id,))
        est = cursor.fetchone()
        total_hourly = (est['estimated_hours'] or 0) * (est['estimated_hourly_rate'] or 0)
        
        now = datetime.now().isoformat()
        cursor.execute(
            "UPDATE estimates SET total_materials_cost=?, total_estimate_cost=?, date_updated=? WHERE estimate_id=?",
            (total_materials, total_materials + total_hourly, now, estimate_id)
        )
        
        conn.commit()
    return {"message": "Material deleted"}

# Material Types endpoints
@app.post("/material-types", response_model=MaterialType)
def create_material_type(mt: MaterialTypeCreate):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO material_types (name) VALUES (?)", (mt.name,))
        type_id = cursor.lastrowid
        conn.commit()
        cursor.execute("SELECT * FROM material_types WHERE type_id = ?", (type_id,))
        return dict(cursor.fetchone())

@app.get("/material-types", response_model=List[MaterialType])
def get_material_types():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM material_types ORDER BY name")
        return [dict(row) for row in cursor.fetchall()]

@app.delete("/material-types/{type_id}")
def delete_material_type(type_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM material_types WHERE type_id = ?", (type_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Material type not found")
        conn.commit()
    return {"message": "Material type deleted"}

# Vendor endpoints
@app.post("/vendors", response_model=Vendor)
def create_vendor(vendor: VendorCreate):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO vendors (name, status, notes, contact_name, phone, email, address) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (vendor.name, vendor.status, vendor.notes, vendor.contact_name, vendor.phone, vendor.email, vendor.address)
        )
        vendor_id = cursor.lastrowid
        conn.commit()
        cursor.execute("SELECT * FROM vendors WHERE vendor_id = ?", (vendor_id,))
        return dict(cursor.fetchone())

@app.get("/vendors", response_model=List[Vendor])
def get_vendors():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM vendors ORDER BY name")
        return [dict(row) for row in cursor.fetchall()]

@app.get("/vendors/{vendor_id}")
def get_vendor(vendor_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM vendors WHERE vendor_id = ?", (vendor_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Vendor not found")
        return dict(row)

@app.put("/vendors/{vendor_id}")
def update_vendor(vendor_id: int, vendor: VendorCreate):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE vendors SET name=?, status=?, notes=?, contact_name=?, phone=?, email=?, address=? WHERE vendor_id=?",
            (vendor.name, vendor.status, vendor.notes, vendor.contact_name, vendor.phone, vendor.email, vendor.address, vendor_id)
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Vendor not found")
        conn.commit()
        cursor.execute("SELECT * FROM vendors WHERE vendor_id = ?", (vendor_id,))
        return dict(cursor.fetchone())

@app.delete("/vendors/{vendor_id}")
def delete_vendor(vendor_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM vendors WHERE vendor_id = ?", (vendor_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Vendor not found")
        conn.commit()
    return {"message": "Vendor deleted"}

# Materials endpoints
@app.post("/materials", response_model=Material)
def create_material(material: MaterialCreate):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM material_types WHERE type_id = ?", (material.type_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=400, detail="Material type not found")
        if material.vendor_id:
            cursor.execute("SELECT * FROM vendors WHERE vendor_id = ?", (material.vendor_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=400, detail="Vendor not found")
        
        cursor.execute(
            """INSERT INTO materials (type_id, vendor_id, price_paid_per_unit, units_held, 
               client_price_per_unit, reorder_threshold, description)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (material.type_id, material.vendor_id, material.price_paid_per_unit, material.units_held,
             material.client_price_per_unit, material.reorder_threshold, material.description)
        )
        material_id = cursor.lastrowid
        conn.commit()
        cursor.execute("SELECT * FROM materials WHERE material_id = ?", (material_id,))
        return dict(cursor.fetchone())

@app.get("/materials", response_model=List[Material])
def get_materials():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM materials ORDER BY material_id")
        return [dict(row) for row in cursor.fetchall()]

@app.get("/materials/{material_id}")
def get_material(material_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM materials WHERE material_id = ?", (material_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Material not found")
        return dict(row)

@app.put("/materials/{material_id}")
def update_material(material_id: int, material: MaterialCreate):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM material_types WHERE type_id = ?", (material.type_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=400, detail="Material type not found")
        if material.vendor_id:
            cursor.execute("SELECT * FROM vendors WHERE vendor_id = ?", (material.vendor_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=400, detail="Vendor not found")
        
        cursor.execute(
            """UPDATE materials SET type_id=?, vendor_id=?, price_paid_per_unit=?, units_held=?,
               client_price_per_unit=?, reorder_threshold=?, description=? WHERE material_id=?""",
            (material.type_id, material.vendor_id, material.price_paid_per_unit, material.units_held,
             material.client_price_per_unit, material.reorder_threshold, material.description, material_id)
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Material not found")
        conn.commit()
        cursor.execute("SELECT * FROM materials WHERE material_id = ?", (material_id,))
        return dict(cursor.fetchone())

@app.delete("/materials/{material_id}")
def delete_material(material_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM materials WHERE material_id = ?", (material_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Material not found")
        conn.commit()
    return {"message": "Material deleted"}

# Employee endpoints
@app.post("/employees", response_model=Employee)
def create_employee(employee: EmployeeCreate):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO employees (name, phone, status, role) VALUES (?, ?, ?, ?)",
            (employee.name, employee.phone, employee.status, employee.role)
        )
        emp_id = cursor.lastrowid
        conn.commit()
        cursor.execute("SELECT * FROM employees WHERE employee_id = ?", (emp_id,))
        return dict(cursor.fetchone())

@app.get("/employees", response_model=List[Employee])
def get_employees():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM employees ORDER BY name")
        return [dict(row) for row in cursor.fetchall()]

@app.delete("/employees/{employee_id}")
def delete_employee(employee_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM employees WHERE employee_id = ?", (employee_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Employee not found")
        conn.commit()
    return {"message": "Employee deleted"}

# Work Crew endpoints
@app.post("/work-crews", response_model=WorkCrew)
def create_work_crew(crew: WorkCrewCreate):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO work_crews (name, status) VALUES (?, ?)",
            (crew.name, crew.status)
        )
        crew_id = cursor.lastrowid
        
        for emp_id in crew.member_ids:
            cursor.execute("INSERT INTO crew_members (crew_id, employee_id) VALUES (?, ?)", (crew_id, emp_id))
        
        conn.commit()
        
        # Get crew with members
        cursor.execute("SELECT * FROM work_crews WHERE crew_id = ?", (crew_id,))
        result = dict(cursor.fetchone())
        cursor.execute("""
            SELECT e.* FROM employees e
            JOIN crew_members cm ON e.employee_id = cm.employee_id
            WHERE cm.crew_id = ?
        """, (crew_id,))
        result['members'] = [dict(row) for row in cursor.fetchall()]
        return result

@app.get("/work-crews", response_model=List[WorkCrew])
def get_work_crews():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM work_crews ORDER BY name")
        crews = []
        for row in cursor.fetchall():
            crew = dict(row)
            cursor.execute("""
                SELECT e.* FROM employees e
                JOIN crew_members cm ON e.employee_id = cm.employee_id
                WHERE cm.crew_id = ?
            """, (crew['crew_id'],))
            crew['members'] = [dict(row) for row in cursor.fetchall()]
            crews.append(crew)
        return crews

@app.get("/work-crews/{crew_id}")
def get_work_crew(crew_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM work_crews WHERE crew_id = ?", (crew_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Work crew not found")
        crew = dict(row)
        cursor.execute("""
            SELECT e.* FROM employees e
            JOIN crew_members cm ON e.employee_id = cm.employee_id
            WHERE cm.crew_id = ?
        """, (crew_id,))
        crew['members'] = [dict(row) for row in cursor.fetchall()]
        return crew

@app.delete("/work-crews/{crew_id}")
def delete_work_crew(crew_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM work_crews WHERE crew_id = ?", (crew_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Work crew not found")
        conn.commit()
    return {"message": "Work crew deleted"}

# Convert estimate to job
@app.post("/estimates/{estimate_id}/convert-to-job")
def convert_estimate_to_job(estimate_id: int, job_data: Job):
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Get the estimate
        cursor.execute("SELECT * FROM estimates WHERE estimate_id = ?", (estimate_id,))
        estimate = cursor.fetchone()
        if not estimate:
            raise HTTPException(status_code=404, detail="Estimate not found")
        
        if estimate['status'] != 'accepted':
            raise HTTPException(status_code=400, detail="Only accepted estimates can be converted to jobs")
        
        # Check if job_id already exists
        cursor.execute("SELECT * FROM jobs WHERE job_id = ?", (job_data.job_id,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Job ID already exists")
        
        # Create the job
        cursor.execute(
            """INSERT INTO jobs (job_id, client_account_id, crew_id, address, scheduled_date, cost_estimate)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (job_data.job_id, estimate['client_account_id'], job_data.crew_id, 
             job_data.address, job_data.scheduled_date, estimate['total_estimate_cost'])
        )
        conn.commit()
        
        cursor.execute("SELECT * FROM jobs WHERE job_id = ?", (job_data.job_id,))
        return dict(cursor.fetchone())

if __name__ == "__main__":
    import uvicorn
    init_db()
    uvicorn.run(app, host="0.0.0.0", port=8000)
