# Metal Fabrication Inventory

A FastAPI + React app to track customers, jobs, and metal inventory.

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
```
API runs at http://localhost:8000

### Frontend
```bash
cd frontend
npm run dev
```
UI runs at http://localhost:5173

## API Endpoints

### Clients
- `GET /clients` - List all clients
- `POST /clients` - Create client
- `GET /clients/{account_id}` - Get client
- `DELETE /clients/{account_id}` - Delete client

### Jobs
- `GET /jobs` - List all jobs
- `POST /jobs` - Create job
- `GET /jobs/{job_id}` - Get job
- `GET /jobs/client/{client_account_id}` - Get jobs for client
- `DELETE /jobs/{job_id}` - Delete job

### Inventory
- `GET /inventory` - List all items
- `POST /inventory` - Create item
- `GET /inventory/{item_id}` - Get item
- `GET /inventory/job/{job_id}` - Get items for job
- `PUT /inventory/{item_id}` - Update item (assign job)
- `DELETE /inventory/{item_id}` - Delete item

## Data Models

**Client:** account_id, name, address, phone

**Job:** job_id, client_account_id, address, scheduled_date, cost_estimate

**Inventory:** item_id, type (metal_tubing|metal_sheets|rebar|powder_coating), quantity, cost, cost_markup, assigned_job_id
