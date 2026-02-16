import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

const API_URL = 'http://localhost:8000'

// Client Component
function Clients({ onError }) {
  const [clients, setClients] = useState([])
  const [form, setForm] = useState({ name: '', address: '', phone: '', status: 'active' })
  const [showForm, setShowForm] = useState(false)
  
  // Sort and filter state
  const [sortField, setSortField] = useState('account_id')
  const [sortDir, setSortDir] = useState('asc')
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')

  const fetchClients = async () => {
    try {
      const res = await axios.get(`${API_URL}/clients`)
      setClients(res.data)
    } catch (e) { onError('Failed to fetch clients') }
  }

  useEffect(() => { fetchClients() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post(`${API_URL}/clients`, form)
      setForm({ name: '', address: '', phone: '', status: 'active' })
      setShowForm(false)
      fetchClients()
    } catch (e) { onError(e.response?.data?.detail || 'Failed to create client') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this client?')) return
    try {
      await axios.delete(`${API_URL}/clients/${id}`)
      fetchClients()
    } catch (e) { onError('Failed to delete client') }
  }

  const toggleStatus = async (client) => {
    const newStatus = client.status === 'active' ? 'inactive' : 'active'
    try {
      await axios.put(`${API_URL}/clients/${client.account_id}`, {
        name: client.name,
        address: client.address,
        phone: client.phone,
        status: newStatus
      })
      fetchClients()
    } catch (e) { onError('Failed to update client') }
  }

  // Sort and filter
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const filteredClients = clients
    .filter(c => !filterStatus || c.status === filterStatus)
    .filter(c => !search || 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.address.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
    )
    .sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]
      if (sortField === 'account_id') {
        aVal = parseInt(aVal)
        bVal = parseInt(bVal)
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="sort-icon">↕</span>
    return <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="section">
      <div className="section-header">
        <h2>Clients</h2>
        <button onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add Client'}</button>
      </div>
      {showForm && (
        <form onSubmit={handleSubmit} className="form">
          <input placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          <input placeholder="Address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} required />
          <input placeholder="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required />
          <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button type="submit">Create Client</button>
        </form>
      )}
      
      <div className="table-filters">
        <input 
          type="text" 
          placeholder="Search..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="search-input"
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {filteredClients.length === 0 ? (
        <p className="empty">No clients yet</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('account_id')}>ID <SortIcon field="account_id" /></th>
              <th onClick={() => handleSort('name')}>Name <SortIcon field="name" /></th>
              <th onClick={() => handleSort('address')}>Address <SortIcon field="address" /></th>
              <th onClick={() => handleSort('phone')}>Phone <SortIcon field="phone" /></th>
              <th onClick={() => handleSort('status')}>Status <SortIcon field="status" /></th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map(c => (
              <tr key={c.account_id} className={c.status === 'inactive' ? 'inactive-row' : ''}>
                <td>{c.account_id}</td>
                <td>{c.name}</td>
                <td>{c.address}</td>
                <td>{c.phone}</td>
                <td>
                  <span className={`status-badge ${c.status}`} onClick={() => toggleStatus(c)}>
                    {c.status}
                  </span>
                </td>
                <td>
                  <button className="delete" onClick={() => handleDelete(c.account_id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// Jobs Component

// Jobs Component
function Jobs({ onError }) {
  const [jobs, setJobs] = useState([])
  const [clients, setClients] = useState([])
  const [crews, setCrews] = useState([])
  const [inventory, setInventory] = useState([])
  const [form, setForm] = useState({ job_id: '', client_account_id: '', crew_id: '', address: '', scheduled_date: '', cost_estimate: '' })
  const [showForm, setShowForm] = useState(false)
  const [expandedJobs, setExpandedJobs] = useState({})
  
  const [sortField, setSortField] = useState('scheduled_date')
  const [sortDir, setSortDir] = useState('desc')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [search, setSearch] = useState('')

  const fetchJobs = async () => {
    try {
      const [jobsRes, clientsRes, crewsRes, inventoryRes] = await Promise.all([
        axios.get(`${API_URL}/jobs`),
        axios.get(`${API_URL}/clients`),
        axios.get(`${API_URL}/work-crews`),
        axios.get(`${API_URL}/inventory`)
      ])
      setJobs(jobsRes.data)
      setClients(clientsRes.data)
      setCrews(crewsRes.data)
      setInventory(inventoryRes.data)
    } catch (e) { onError('Failed to fetch jobs') }
  }

  useEffect(() => { fetchJobs() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post(`${API_URL}/jobs`, { 
        client_account_id: parseInt(form.client_account_id),
        crew_id: form.crew_id ? parseInt(form.crew_id) : null,
        cost_estimate: parseFloat(form.cost_estimate),
        address: form.address,
        scheduled_date: form.scheduled_date,
        job_id: form.job_id
      })
      setForm({ job_id: '', client_account_id: '', crew_id: '', address: '', scheduled_date: '', cost_estimate: '' })
      setShowForm(false)
      fetchJobs()
    } catch (e) { onError(e.response?.data?.detail || 'Failed to create job') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this job?')) return
    try {
      await axios.delete(`${API_URL}/jobs/${id}`)
      fetchJobs()
    } catch (e) { onError('Failed to delete job') }
  }

  const toggleJob = (jobId) => {
    setExpandedJobs(prev => ({ ...prev, [jobId]: !prev[jobId] }))
  }

  const getClientName = (cid) => {
    const c = clients.find(c => c.account_id === cid)
    return c ? c.name : 'Unknown'
  }

  const getCrewName = (cid) => {
    if (!cid) return '—'
    const crew = crews.find(c => c.crew_id === cid)
    return crew ? crew.name : 'Unknown'
  }

  const getJobInventory = (jobId) => {
    return inventory.filter(i => i.assigned_job_id === jobId)
  }

  const getInventoryTotal = (items) => {
    return items.reduce((sum, item) => sum + (item.cost * (1 + item.cost_markup/100)), 0)
  }

  const formatType = (t) => t ? t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '—'

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const filteredJobs = jobs
    .filter(j => !filterStatus || j.status === filterStatus)
    .filter(j => !filterClient || j.client_account_id === parseInt(filterClient))
    .filter(j => !search || 
      j.job_id.toLowerCase().includes(search.toLowerCase()) ||
      j.address.toLowerCase().includes(search.toLowerCase()) ||
      getClientName(j.client_account_id).toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]
      if (sortField === 'cost_estimate' || sortField === 'scheduled_date') {
        if (sortField === 'scheduled_date') {
          aVal = new Date(aVal)
          bVal = new Date(bVal)
        } else {
          aVal = parseFloat(aVal)
          bVal = parseFloat(bVal)
        }
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="sort-icon">↕</span>
    return <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="section">
      <div className="section-header">
        <h2>Jobs</h2>
        <button onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add Job'}</button>
      </div>
      {showForm && (
        <form onSubmit={handleSubmit} className="form">
          <input placeholder="Job ID" value={form.job_id} onChange={e => setForm({...form, job_id: e.target.value})} required />
          <select value={form.client_account_id} onChange={e => setForm({...form, client_account_id: e.target.value})} required>
            <option value="">Select Client</option>
            {clients.map(c => <option key={c.account_id} value={c.account_id}>{c.name}</option>)}
          </select>
          <select value={form.crew_id} onChange={e => setForm({...form, crew_id: e.target.value})}>
            <option value="">Select Crew</option>
            {crews.map(c => <option key={c.crew_id} value={c.crew_id}>{c.name}</option>)}
          </select>
          <input placeholder="Address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} required />
          <input type="date" value={form.scheduled_date} onChange={e => setForm({...form, scheduled_date: e.target.value})} required />
          <input type="number" step="0.01" placeholder="Cost Estimate" value={form.cost_estimate} onChange={e => setForm({...form, cost_estimate: e.target.value})} required />
          <button type="submit">Create Job</button>
        </form>
      )}
      
      <div className="table-filters">
        <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="search-input" />
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)}>
          <option value="">All Clients</option>
          {clients.map(c => <option key={c.account_id} value={c.account_id}>{c.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {filteredJobs.length === 0 ? (
        <p className="empty">No jobs yet</p>
      ) : (
        <div className="jobs-table">
          {filteredJobs.map(j => {
            const items = getJobInventory(j.job_id)
            const isExpanded = expandedJobs[j.job_id]
            const inventoryTotal = getInventoryTotal(items)
            
            return (
              <div key={j.job_id} className="job-expandable-card">
                <div className="job-main-row" onClick={() => toggleJob(j.job_id)}>
                  <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                  <span className="job-id">{j.job_id}</span>
                  <span className="job-client">{getClientName(j.client_account_id)}</span>
                  <span className="job-address">{j.address}</span>
                  <span className="job-date">{j.scheduled_date}</span>
                  <span className="job-cost">${j.cost_estimate?.toFixed(2) || '0.00'}</span>
                  <span className="job-crew">{getCrewName(j.crew_id)}</span>
                  <span className={`job-status ${j.status || 'scheduled'}`}>{j.status || 'scheduled'}</span>
                  <span className="job-inventory-total">Inv: ${inventoryTotal.toFixed(2)}</span>
                  <button className="delete" onClick={(e) => { e.stopPropagation(); handleDelete(j.job_id); }}>Delete</button>
                </div>
                {isExpanded && (
                  <div className="job-details">
                    <div className="job-details-info">
                      <p><strong>Client:</strong> {getClientName(j.client_account_id)}</p>
                      <p><strong>Address:</strong> {j.address}</p>
                      <p><strong>Scheduled:</strong> {j.scheduled_date}</p>
                      <p><strong>Estimate:</strong> ${j.cost_estimate?.toFixed(2) || '0.00'}</p>
                      <p><strong>Crew:</strong> {getCrewName(j.crew_id)}</p>
                      <p><strong>Status:</strong> {j.status || 'scheduled'}</p>
                      {j.actual_hours && (
                        <>
                          <p><strong>Actual Hours:</strong> {j.actual_hours}</p>
                          <p><strong>Actual Cost:</strong> ${j.actual_total_cost?.toFixed(2)}</p>
                        </>
                      )}
                    </div>
                    <div className="job-inventory">
                      <h4>Inventory ({items.length} items, ${inventoryTotal.toFixed(2)})</h4>
                      {items.length > 0 ? (
                        <table className="data-table small">
                          <thead>
                            <tr><th>ID</th><th>Type</th><th>Qty</th><th>Cost</th><th>Markup</th><th>Total</th></tr>
                          </thead>
                          <tbody>
                            {items.map(item => (
                              <tr key={item.item_id}>
                                <td>{item.item_id}</td>
                                <td>{formatType(item.type)}</td>
                                <td>{item.quantity}</td>
                                <td>${item.cost?.toFixed(2)}</td>
                                <td>{item.cost_markup}%</td>
                                <td>${(item.cost * (1 + item.cost_markup/100)).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="empty">No inventory assigned</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
function Inventory({ onError }) {
  const [items, setItems] = useState([])
  const [jobs, setJobs] = useState([])
  const [clients, setClients] = useState([])
  const [crews, setCrews] = useState([])
  const [form, setForm] = useState({ type: 'metal_tubing', quantity: '', cost: '', cost_markup: '', assigned_job_id: '' })
  const [showForm, setShowForm] = useState(false)
  const [selectedJob, setSelectedJob] = useState(null)
  
  // Sort and filter state
  const [sortField, setSortField] = useState('item_id')
  const [sortDir, setSortDir] = useState('asc')
  const [filterType, setFilterType] = useState('')
  const [filterJob, setFilterJob] = useState('')
  const [search, setSearch] = useState('')

  const fetchData = async () => {
    try {
      const [itemsRes, jobsRes, clientsRes, crewsRes] = await Promise.all([
        axios.get(`${API_URL}/inventory`),
        axios.get(`${API_URL}/jobs`),
        axios.get(`${API_URL}/clients`),
        axios.get(`${API_URL}/work-crews`)
      ])
      setItems(itemsRes.data)
      setJobs(jobsRes.data)
      setClients(clientsRes.data)
      setCrews(crewsRes.data)
    } catch (e) { onError('Failed to fetch inventory') }
  }

  useEffect(() => { fetchData() }, [])

  const getJobDetails = (jobId) => {
    return jobs.find(j => j.job_id === jobId)
  }

  const getClientName = (cid) => {
    const c = clients.find(c => c.account_id === cid)
    return c ? c.name : 'Unknown'
  }

  const getCrewName = (cid) => {
    if (!cid) return '—'
    const crew = crews.find(c => c.crew_id === cid)
    return crew ? crew.name : 'Unknown'
  }

  const getJobInventory = (jobId) => {
    return items.filter(i => i.assigned_job_id === jobId)
  }

  const getInventoryTotal = (jobItems) => {
    return jobItems.reduce((sum, item) => sum + (item.cost * (1 + item.cost_markup/100)), 0)
  }

  const formatType = (t) => t ? t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '—'

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post(`${API_URL}/inventory`, { 
        ...form, 
        quantity: parseInt(form.quantity),
        cost: parseFloat(form.cost),
        cost_markup: parseFloat(form.cost_markup),
        assigned_job_id: form.assigned_job_id || null
      })
      setForm({ type: 'metal_tubing', quantity: '', cost: '', cost_markup: '', assigned_job_id: '' })
      setShowForm(false)
      fetchData()
    } catch (e) { onError(e.response?.data?.detail || 'Failed to create item') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return
    try {
      await axios.delete(`${API_URL}/inventory/${id}`)
      fetchData()
    } catch (e) { onError('Failed to delete item') }
  }

  const handleAssign = async (item) => {
    const jobId = prompt('Enter Job ID to assign (or leave empty to unassign):', item.assigned_job_id || '')
    if (jobId === null) return
    try {
      await axios.put(`${API_URL}/inventory/${item.item_id}`, {
        ...item,
        assigned_job_id: jobId || null
      })
      fetchData()
    } catch (e) { onError(e.response?.data?.detail || 'Failed to assign job') }
  }

  // Sort and filter
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const filteredItems = items
    .filter(i => !filterType || i.type === filterType)
    .filter(i => !filterJob || (filterJob === '_unassigned' ? !i.assigned_job_id : i.assigned_job_id === filterJob))
    .filter(i => !search || String(i.item_id).includes(search) || i.type.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]
      if (sortField === 'cost' || sortField === 'cost_markup') {
        aVal = parseFloat(aVal)
        bVal = parseFloat(bVal)
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="sort-icon">↕</span>
    return <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="section">
      <div className="section-header">
        <h2>Inventory</h2>
        <button onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add Item'}</button>
      </div>
      {showForm && (
        <form onSubmit={handleSubmit} className="form">
          <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
            <option value="metal_tubing">Metal Tubing</option>
            <option value="metal_sheets">Metal Sheets</option>
            <option value="rebar">Rebar</option>
            <option value="powder_coating">Powder Coating</option>
          </select>
          <input type="number" placeholder="Quantity" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} required />
          <input type="number" step="0.01" placeholder="Cost" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} required />
          <input type="number" step="0.01" placeholder="Cost Markup %" value={form.cost_markup} onChange={e => setForm({...form, cost_markup: e.target.value})} required />
          <select value={form.assigned_job_id} onChange={e => setForm({...form, assigned_job_id: e.target.value})}>
            <option value="">Unassigned</option>
            {jobs.map(j => <option key={j.job_id} value={j.job_id}>{j.job_id}</option>)}
          </select>
          <button type="submit">Create Item</button>
        </form>
      )}
      
      <div className="table-filters">
        <input 
          type="text" 
          placeholder="Search..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="search-input"
        />
        <select value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          <option value="metal_tubing">Metal Tubing</option>
          <option value="metal_sheets">Metal Sheets</option>
          <option value="rebar">Rebar</option>
          <option value="powder_coating">Powder Coating</option>
        </select>
        <select value={filterJob} onChange={e => setFilterJob(e.target.value)}>
          <option value="">All Jobs</option>
          <option value="_unassigned">Unassigned</option>
          {jobs.map(j => <option key={j.job_id} value={j.job_id}>{j.job_id}</option>)}
        </select>
      </div>

      {filteredItems.length === 0 ? (
        <p className="empty">No inventory yet</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('item_id')}>Item ID <SortIcon field="item_id" /></th>
              <th onClick={() => handleSort('type')}>Type <SortIcon field="type" /></th>
              <th onClick={() => handleSort('quantity')}>Qty <SortIcon field="quantity" /></th>
              <th onClick={() => handleSort('cost')}>Cost <SortIcon field="cost" /></th>
              <th onClick={() => handleSort('cost_markup')}>Markup <SortIcon field="cost_markup" /></th>
              <th>Price</th>
              <th onClick={() => handleSort('assigned_job_id')}>Job <SortIcon field="assigned_job_id" /></th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(i => (
              <tr key={i.item_id}>
                <td>{i.item_id}</td>
                <td>{formatType(i.type)}</td>
                <td>{i.quantity}</td>
                <td>${i.cost.toFixed(2)}</td>
                <td>{i.cost_markup}%</td>
                <td>${(i.cost * (1 + i.cost_markup/100)).toFixed(2)}</td>
                <td>{i.assigned_job_id ? <span className="job-link" onMouseEnter={(e) => setSelectedJob(getJobDetails(i.assigned_job_id))} onMouseLeave={() => setSelectedJob(null)}>{i.assigned_job_id}</span> : '—'}</td>
                <td>
                  <button onClick={() => handleAssign(i)}>Assign</button>
                  <button className="delete" onClick={() => handleDelete(i.item_id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedJob && (
        <div className="job-tooltip" onMouseEnter={() => setSelectedJob(selectedJob)} onMouseLeave={() => setSelectedJob(null)}>
          <div className="tooltip-header">
            <strong>{selectedJob.job_id}</strong>
          </div>
          <div className="tooltip-body">
            <div className="job-details-info">
              <p><strong>Client:</strong> {getClientName(selectedJob.client_account_id)}</p>
              <p><strong>Address:</strong> {selectedJob.address}</p>
              <p><strong>Scheduled:</strong> {selectedJob.scheduled_date}</p>
              <p><strong>Estimate:</strong> ${selectedJob.cost_estimate?.toFixed(2) || '0.00'}</p>
              <p><strong>Crew:</strong> {getCrewName(selectedJob.crew_id)}</p>
              <p><strong>Status:</strong> {selectedJob.status || 'scheduled'}</p>
              {selectedJob.actual_hours && (
                <>
                  <p><strong>Actual Hours:</strong> {selectedJob.actual_hours}</p>
                  <p><strong>Actual Cost:</strong> ${selectedJob.actual_total_cost?.toFixed(2)}</p>
                </>
              )}
            </div>
            <hr />
            <div className="job-inventory">
              <h4>Inventory ({getJobInventory(selectedJob.job_id).length} items, ${getInventoryTotal(getJobInventory(selectedJob.job_id)).toFixed(2)})</h4>
              {(() => {
                const jobItems = getJobInventory(selectedJob.job_id)
                return jobItems.length > 0 ? (
                  <table className="data-table small">
                    <thead>
                      <tr><th>ID</th><th>Type</th><th>Qty</th><th>Cost</th><th>Markup</th><th>Total</th></tr>
                    </thead>
                    <tbody>
                      {jobItems.map(item => (
                        <tr key={item.item_id}>
                          <td>{item.item_id}</td>
                          <td>{formatType(item.type)}</td>
                          <td>{item.quantity}</td>
                          <td>${item.cost?.toFixed(2)}</td>
                          <td>{item.cost_markup}%</td>
                          <td>${(item.cost * (1 + item.cost_markup/100)).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="empty">No inventory assigned</p>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Reports Component
function Reports({ onError }) {
  const [selectedReport, setSelectedReport] = useState('')
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)

  const reports = [
    { id: 'low_materials', name: 'Low Materials Report', description: 'Materials where units held <= reorder threshold' },
    { id: 'inventory_value', name: 'Inventory Value Report', description: 'Total value of all inventory' },
    { id: 'active_clients', name: 'Active Clients', description: 'List of all active clients' },
    { id: 'pending_estimates', name: 'Pending Estimates', description: 'Estimates with pending status' },
    { id: 'job_schedule', name: 'Job Schedule', description: 'Scheduled jobs with assigned work crews' },
    { id: 'estimate_conversion', name: 'Estimate Conversion Rate', description: 'Accepted vs pending/rejected estimates' },
    { id: 'vendor_spend', name: 'Vendor Spend', description: 'Total spent per vendor for materials' },
    { id: 'crew_utilization', name: 'Crew Utilization', description: 'Jobs completed per crew' },
    { id: 'monthly_summary', name: 'Monthly Job Summary', description: 'Jobs and revenue by month' },
    { id: 'actual_vs_estimated', name: 'Actual vs Estimated', description: 'Compare actual costs to estimates' },
    { id: 'client_history', name: 'Client Job History', description: 'All jobs per client with details' },
  ]

  const runReport = async () => {
    if (!selectedReport) return
    setLoading(true)
    setReportData(null)

    try {
      if (selectedReport === 'low_materials') {
        const [materialsRes, typesRes, vendorsRes] = await Promise.all([
          axios.get(`${API_URL}/materials`),
          axios.get(`${API_URL}/material-types`),
          axios.get(`${API_URL}/vendors`)
        ])
        const typeMap = {}
        typesRes.data.forEach(t => { typeMap[t.type_id] = t.name })
        const vendorMap = {}
        vendorsRes.data.forEach(v => { vendorMap[v.vendor_id] = v.name })
        
        const lowMaterials = materialsRes.data.filter(m => m.units_held <= m.reorder_threshold)
        setReportData({
          title: 'Low Materials Report',
          columns: ['Material ID', 'Type', 'Description', 'Units Held', 'Reorder Threshold', 'Vendor'],
          rows: lowMaterials.map(m => ({
            'Material ID': m.material_id,
            'Type': typeMap[m.type_id] || 'Unknown',
            'Description': m.description || '—',
            'Units Held': m.units_held,
            'Reorder Threshold': m.reorder_threshold,
            'Vendor': m.vendor_id ? (vendorMap[m.vendor_id] || 'Unknown') : '—'
          })),
          summary: `Found ${lowMaterials.length} material(s) at or below reorder threshold`
        })
      } else if (selectedReport === 'inventory_value') {
        const [inventoryRes, itemsRes] = await Promise.all([
          axios.get(`${API_URL}/inventory`),
          axios.get(`${API_URL}/materials`)
        ])
        
        const inventoryTotal = inventoryRes.data.reduce((sum, i) => sum + (i.cost * i.quantity), 0)
        const materialsTotal = itemsRes.data.reduce((sum, m) => sum + (m.price_paid_per_unit * m.units_held), 0)
        
        setReportData({
          title: 'Inventory Value Report',
          columns: ['Category', 'Total Value'],
          rows: [
            { Category: 'Job Inventory', 'Total Value': `$${inventoryTotal.toFixed(2)}` },
            { Category: 'Materials Stock', 'Total Value': `$${materialsTotal.toFixed(2)}` },
            { Category: 'Combined Total', 'Total Value': `$${(inventoryTotal + materialsTotal).toFixed(2)}` }
          ],
          summary: ''
        })
      } else if (selectedReport === 'active_clients') {
        const clientsRes = await axios.get(`${API_URL}/clients`)
        const activeClients = clientsRes.data.filter(c => c.status === 'active')
        
        setReportData({
          title: 'Active Clients',
          columns: ['ID', 'Name', 'Phone', 'Address'],
          rows: activeClients.map(c => ({
            ID: c.account_id,
            Name: c.name,
            Phone: c.phone,
            Address: c.address
          })),
          summary: `Total active clients: ${activeClients.length}`
        })
      } else if (selectedReport === 'pending_estimates') {
        const [estimatesRes, clientsRes] = await Promise.all([
          axios.get(`${API_URL}/estimates`),
          axios.get(`${API_URL}/clients`)
        ])
        const clientMap = {}
        clientsRes.data.forEach(c => { clientMap[c.account_id] = c.name })
        
        const pending = estimatesRes.data.filter(e => e.status === 'pending')
        
        setReportData({
          title: 'Pending Estimates',
          columns: ['Estimate ID', 'Client', 'Total Cost', 'Scheduled Date'],
          rows: pending.map(e => ({
            'Estimate ID': e.estimate_id,
            'Client': clientMap[e.client_id] || 'Unknown',
            'Total Cost': `$${e.total_estimate_cost.toFixed(2)}`,
            'Scheduled Date': e.scheduled_date || '—'
          })),
          summary: `Total pending estimates: ${pending.length}`
        })
      } else if (selectedReport === 'job_schedule') {
        const [jobsRes, clientsRes, crewsRes] = await Promise.all([
          axios.get(`${API_URL}/jobs`),
          axios.get(`${API_URL}/clients`),
          axios.get(`${API_URL}/work-crews`)
        ])
        
        const clientMap = {}
        clientsRes.data.forEach(c => { clientMap[c.account_id] = c.name })
        
        const crewMap = {}
        crewsRes.data.forEach(c => { crewMap[c.crew_id] = c.name })
        
        // Sort jobs by scheduled date
        const sortedJobs = jobsRes.data.sort((a, b) => 
          new Date(a.scheduled_date) - new Date(b.scheduled_date)
        )
        
        setReportData({
          title: 'Job Schedule',
          columns: ['Date', 'Job ID', 'Client', 'Address', 'Crew', 'Cost'],
          rows: sortedJobs.map(j => ({
            'Date': j.scheduled_date,
            'Job ID': j.job_id,
            'Client': clientMap[j.client_account_id] || 'Unknown',
            'Address': j.address,
            'Crew': j.crew_id ? (crewMap[j.crew_id] || 'Unknown') : '—',
            'Cost': `$${j.cost_estimate.toFixed(2)}`
          })),
          summary: `Total scheduled jobs: ${sortedJobs.length}`
        })
      } else if (selectedReport === 'estimate_conversion') {
        const estimatesRes = await axios.get(`${API_URL}/estimates`)
        const totals = estimatesRes.data.reduce((acc, e) => {
          acc[e.status] = (acc[e.status] || 0) + 1
          acc.total_cost = (acc.total_cost || 0) + e.total_estimate_cost
          acc[e.status + '_cost'] = (acc[e.status + '_cost'] || 0) + e.total_estimate_cost
          return acc
        }, {})
        
        const total = estimatesRes.data.length
        const accepted = totals.accepted || 0
        const pending = totals.pending || 0
        const rejected = totals.rejected || 0
        
        setReportData({
          title: 'Estimate Conversion Rate',
          columns: ['Status', 'Count', 'Percentage', 'Total Value'],
          rows: [
            { Status: 'Accepted', Count: accepted, Percentage: total ? ((accepted/total)*100).toFixed(1) + '%' : '0%', 'Total Value': `$${(totals.accepted_cost || 0).toFixed(2)}` },
            { Status: 'Pending', Count: pending, Percentage: total ? ((pending/total)*100).toFixed(1) + '%' : '0%', 'Total Value': `$${(totals.pending_cost || 0).toFixed(2)}` },
            { Status: 'Rejected', Count: rejected, Percentage: total ? ((rejected/total)*100).toFixed(1) + '%' : '0%', 'Total Value': `$${(totals.rejected_cost || 0).toFixed(2)}` },
          ],
          summary: `Total Estimates: ${total} | Acceptance Rate: ${total ? ((accepted/total)*100).toFixed(1) : 0}%`
        })
      } else if (selectedReport === 'vendor_spend') {
        const [materialsRes, vendorsRes, typesRes] = await Promise.all([
          axios.get(`${API_URL}/materials`),
          axios.get(`${API_URL}/vendors`),
          axios.get(`${API_URL}/material-types`)
        ])
        
        const vendorMap = { 0: 'No Vendor' }
        vendorsRes.data.forEach(v => { vendorMap[v.vendor_id] = v.name })
        
        const spendByVendor = materialsRes.data.reduce((acc, m) => {
          const vid = m.vendor_id || 0
          if (!acc[vid]) {
            acc[vid] = { vendor: vendorMap[vid], totalCost: 0, totalUnits: 0 }
          }
          acc[vid].totalCost += m.price_paid_per_unit * m.units_held
          acc[vid].totalUnits += m.units_held
          return acc
        }, {})
        
        const rows = Object.values(spendByVendor)
          .sort((a, b) => b.totalCost - a.totalCost)
          .map(v => ({
            Vendor: v.vendor,
            'Total Units': v.totalUnits.toFixed(1),
            'Total Value': `$${v.totalCost.toFixed(2)}`
          }))
        
        const grandTotal = rows.reduce((sum, r) => sum + parseFloat(r['Total Value'].replace('$','')), 0)
        
        setReportData({
          title: 'Vendor Spend Report',
          columns: ['Vendor', 'Total Units', 'Total Value'],
          rows,
          summary: `Grand Total: $${grandTotal.toFixed(2)}`
        })
      } else if (selectedReport === 'crew_utilization') {
        const [jobsRes, crewsRes, clientsRes] = await Promise.all([
          axios.get(`${API_URL}/jobs`),
          axios.get(`${API_URL}/work-crews`),
          axios.get(`${API_URL}/clients`)
        ])
        
        const crewMap = { 0: 'Unassigned' }
        crewsRes.data.forEach(c => { crewMap[c.crew_id] = c.name })
        
        const clientMap = {}
        clientsRes.data.forEach(c => { clientMap[c.account_id] = c.name })
        
        const utilization = jobsRes.data.reduce((acc, j) => {
          const cid = j.crew_id || 0
          if (!acc[cid]) {
            acc[cid] = { crew: crewMap[cid], jobCount: 0, totalValue: 0 }
          }
          acc[cid].jobCount++
          acc[cid].totalValue += j.cost_estimate
          return acc
        }, {})
        
        const rows = Object.values(utilization)
          .sort((a, b) => b.jobCount - a.jobCount)
          .map(u => ({
            Crew: u.crew,
            'Jobs Assigned': u.jobCount,
            'Total Value': `$${u.totalValue.toFixed(2)}`
          }))
        
        setReportData({
          title: 'Crew Utilization',
          columns: ['Crew', 'Jobs Assigned', 'Total Value'],
          rows,
          summary: `Total Jobs: ${jobsRes.data.length}`
        })
      } else if (selectedReport === 'monthly_summary') {
        const [jobsRes, clientsRes] = await Promise.all([
          axios.get(`${API_URL}/jobs`),
          axios.get(`${API_URL}/clients`)
        ])
        
        const clientMap = {}
        clientsRes.data.forEach(c => { clientMap[c.account_id] = c.name })
        
        const monthly = jobsRes.data.reduce((acc, j) => {
          const month = j.scheduled_date.substring(0, 7) // YYYY-MM
          if (!acc[month]) {
            acc[month] = { month, jobCount: 0, totalEstimate: 0, totalActual: 0 }
          }
          acc[month].jobCount++
          acc[month].totalEstimate += j.cost_estimate
          acc[month].totalActual += j.actual_total_cost || 0
          return acc
        }, {})
        
        const rows = Object.values(monthly)
          .sort((a, b) => b.month.localeCompare(a.month))
          .slice(0, 12)
          .map(m => ({
            Month: m.month,
            Jobs: m.jobCount,
            'Est. Revenue': `$${m.totalEstimate.toFixed(2)}`,
            'Actual Revenue': m.totalActual ? `$${m.totalActual.toFixed(2)}` : '—',
          }))
        
        setReportData({
          title: 'Monthly Job Summary',
          columns: ['Month', 'Jobs', 'Est. Revenue', 'Actual Revenue'],
          rows,
          summary: ''
        })
      } else if (selectedReport === 'actual_vs_estimated') {
        const [jobsRes, clientsRes, crewsRes] = await Promise.all([
          axios.get(`${API_URL}/jobs`),
          axios.get(`${API_URL}/clients`),
          axios.get(`${API_URL}/work-crews`)
        ])
        
        const clientMap = {}
        clientsRes.data.forEach(c => { clientMap[c.account_id] = c.name })
        
        const crewMap = {}
        crewsRes.data.forEach(c => { crewMap[c.crew_id] = c.name })
        
        const jobsWithActuals = jobsRes.data.filter(j => j.actual_total_cost !== null)
        
        const rows = jobsWithActuals.map(j => {
          const variance = j.actual_total_cost - j.cost_estimate
          const variancePct = j.cost_estimate ? ((variance / j.cost_estimate) * 100).toFixed(1) : 0
          return {
            'Job ID': j.job_id,
            Client: clientMap[j.client_account_id] || 'Unknown',
            'Scheduled': j.scheduled_date,
            'Estimated': `$${j.cost_estimate.toFixed(2)}`,
            'Actual': `$${j.actual_total_cost.toFixed(2)}`,
            'Variance': `${variance >= 0 ? '+' : ''}${variance.toFixed(2)} (${variancePct}%)`
          }
        })
        
        const totalEst = jobsWithActuals.reduce((sum, j) => sum + j.cost_estimate, 0)
        const totalActual = jobsWithActuals.reduce((sum, j) => sum + (j.actual_total_cost || 0), 0)
        
        setReportData({
          title: 'Actual vs Estimated',
          columns: ['Job ID', 'Client', 'Scheduled', 'Estimated', 'Actual', 'Variance'],
          rows,
          summary: `Jobs with actuals: ${jobsWithActuals.length} | Total Estimated: $${totalEst.toFixed(2)} | Total Actual: $${totalActual.toFixed(2)}`
        })
      } else if (selectedReport === 'client_history') {
        const [clientsRes, jobsRes, estimatesRes] = await Promise.all([
          axios.get(`${API_URL}/clients`),
          axios.get(`${API_URL}/jobs`),
          axios.get(`${API_URL}/estimates`)
        ])
        
        const clientJobs = {}
        clientsRes.data.forEach(c => {
          clientJobs[c.account_id] = { 
            name: c.name, 
            jobs: [], 
            estimates: [],
            totalJobValue: 0 
          }
        })
        
        jobsRes.data.forEach(j => {
          if (clientJobs[j.client_account_id]) {
            clientJobs[j.client_account_id].jobs.push(j)
            clientJobs[j.client_account_id].totalJobValue += j.cost_estimate
          }
        })
        
        estimatesRes.data.forEach(e => {
          if (clientJobs[e.client_id]) {
            clientJobs[e.client_id].estimates.push(e)
          }
        })
        
        const rows = Object.values(clientJobs)
          .filter(c => c.jobs.length > 0 || c.estimates.length > 0)
          .sort((a, b) => b.totalJobValue - a.totalJobValue)
          .map(c => ({
            Client: c.name,
            'Total Jobs': c.jobs.length,
            'Total Estimates': c.estimates.length,
            'Job Value': `$${c.totalJobValue.toFixed(2)}`,
            'Last Job': c.jobs.length > 0 ? c.jobs.sort((a,b) => new Date(b.scheduled_date) - new Date(a.scheduled_date))[0].scheduled_date : '—'
          }))
        
        setReportData({
          title: 'Client Job History',
          columns: ['Client', 'Total Jobs', 'Total Estimates', 'Job Value', 'Last Job'],
          rows,
          summary: `Total Clients with History: ${rows.length}`
        })
      }
    } catch (e) {
      onError('Failed to run report')
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = () => {
    if (!reportData || reportData.rows.length === 0) return
    
    const headers = reportData.columns.join(',')
    const rows = reportData.rows.map(row => 
      reportData.columns.map(col => {
        const val = String(row[col] || '')
        // Escape quotes and wrap in quotes if contains comma
        return val.includes(',') ? `"${val.replace(/"/g, '""')}"` : val
      }).join(',')
    )
    
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportData.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="section">
      <div className="section-header">
        <h2>Reports</h2>
      </div>
      
      <div className="report-selector">
        <select value={selectedReport} onChange={e => { setSelectedReport(e.target.value); setReportData(null); }}>
          <option value="">Select a report...</option>
          {reports.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <button onClick={runReport} disabled={!selectedReport || loading}>
          {loading ? 'Running...' : 'Run Report'}
        </button>
      </div>

      {selectedReport && (
        <p className="report-desc">
          {reports.find(r => r.id === selectedReport)?.description}
        </p>
      )}

      {loading && <p className="empty">Loading...</p>}

      {reportData && !loading && (
        <div className="report-results">
          <div className="report-header">
            <h3>{reportData.title}</h3>
            <button className="export-btn" onClick={exportCSV}>Export CSV</button>
          </div>
          {reportData.rows.length === 0 ? (
            <p className="empty">No data found</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  {reportData.columns.map(col => <th key={col}>{col}</th>)}
                </tr>
              </thead>
              <tbody>
                {reportData.rows.map((row, idx) => (
                  <tr key={idx}>
                    {reportData.columns.map(col => (
                      <td key={col}>{row[col]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {reportData.summary && <p className="report-summary">{reportData.summary}</p>}
        </div>
      )}
    </div>
  )
}

// Dashboard Component
function Dashboard({ onError }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      const [clientsRes, jobsRes, estimatesRes, materialsRes, inventoryRes] = await Promise.all([
        axios.get(`${API_URL}/clients`),
        axios.get(`${API_URL}/jobs`),
        axios.get(`${API_URL}/estimates`),
        axios.get(`${API_URL}/materials`),
        axios.get(`${API_URL}/inventory`)
      ])

      const today = new Date().toISOString().split('T')[0]
      const clients = clientsRes.data
      const jobs = jobsRes.data
      const estimates = estimatesRes.data
      const materials = materialsRes.data
      const inventory = inventoryRes.data

      // Low stock items
      const lowStock = materials.filter(m => m.units_held <= m.reorder_threshold)
      
      // Pending estimates
      const pendingEstimates = estimates.filter(e => e.status === 'pending')
      
      // Today's jobs
      const todaysJobs = jobs.filter(j => j.scheduled_date === today)
      
      // Upcoming jobs (next 7 days)
      const upcomingJobs = jobs
        .filter(j => {
          const jobDate = new Date(j.scheduled_date)
          const now = new Date()
          const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          return jobDate >= now && jobDate <= weekFromNow
        })
        .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
        .slice(0, 5)

      // Active clients
      const activeClients = clients.filter(c => c.status === 'active').length

      // Job stats
      const totalJobValue = jobs.reduce((sum, j) => sum + j.cost_estimate, 0)
      
      // Materials value
      const materialsValue = materials.reduce((sum, m) => sum + (m.price_paid_per_unit * m.units_held), 0)

      setStats({
        activeClients,
        totalClients: clients.length,
        totalJobs: jobs.length,
        todaysJobs: todaysJobs.length,
        upcomingJobs: upcomingJobs.length,
        pendingEstimates: pendingEstimates.length,
        totalEstimates: estimates.length,
        lowStockCount: lowStock.length,
        lowStockItems: lowStock.slice(0, 5),
        todaysJobList: todaysJobs,
        upcomingJobList: upcomingJobs,
        totalJobValue,
        materialsValue,
        inventoryValue: inventory.reduce((sum, i) => sum + (i.cost * i.quantity), 0)
      })
    } catch (e) {
      onError('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="section"><p className="empty">Loading dashboard...</p></div>

  return (
    <div className="section dashboard">
      <h2>Dashboard</h2>
      
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.activeClients}</div>
          <div className="stat-label">Active Clients</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.todaysJobs}</div>
          <div className="stat-label">Today's Jobs</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.pendingEstimates}</div>
          <div className="stat-label">Pending Estimates</div>
        </div>
        <div className="stat-card alert">
          <div className="stat-value">{stats.lowStockCount}</div>
          <div className="stat-label">Low Stock Items</div>
        </div>
      </div>

      <div className="dashboard-sections">
        <div className="dashboard-section">
          <h3>📅 Today's Jobs</h3>
          {stats.todaysJobList.length === 0 ? (
            <p className="empty">No jobs scheduled for today</p>
          ) : (
            <ul className="job-list">
              {stats.todaysJobList.map(j => (
                <li key={j.job_id}>{j.job_id} - {j.address}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="dashboard-section">
          <h3>📅 Upcoming Jobs (Next 7 Days)</h3>
          {stats.upcomingJobList.length === 0 ? (
            <p className="empty">No upcoming jobs</p>
          ) : (
            <ul className="job-list">
              {stats.upcomingJobList.map(j => (
                <li key={j.job_id}>{j.scheduled_date} - {j.job_id}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="dashboard-section">
          <h3>⚠️ Low Stock Alerts</h3>
          {stats.lowStockItems.length === 0 ? (
            <p className="empty">All items are well stocked</p>
          ) : (
            <ul className="job-list">
              {stats.lowStockItems.map(m => (
                <li key={m.material_id}>ID #{m.material_id}: {m.units_held} / {m.reorder_threshold} threshold</li>
              ))}
            </ul>
          )}
        </div>

        <div className="dashboard-section">
          <h3>💰 Financial Summary</h3>
          <p><strong>Total Job Value:</strong> ${stats.totalJobValue.toFixed(2)}</p>
          <p><strong>Materials Value:</strong> ${stats.materialsValue.toFixed(2)}</p>
          <p><strong>Inventory Value:</strong> ${stats.inventoryValue.toFixed(2)}</p>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [tab, setTab] = useState('clients')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [error])

  return (
    <div className="app">
      <header>
        <h1>🐕 Jax and Pete's Inventory Tracker</h1>
      </header>
      <nav>
        <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>Dashboard</button>
        <button className={tab === 'clients' ? 'active' : ''} onClick={() => setTab('clients')}>Clients</button>
        <button className={tab === 'jobs' ? 'active' : ''} onClick={() => setTab('jobs')}>Jobs</button>
        <button className={tab === 'inventory' ? 'active' : ''} onClick={() => setTab('inventory')}>Inventory</button>
        <button className={tab === 'reports' ? 'active' : ''} onClick={() => setTab('reports')}>Reports</button>
      </nav>
      {error && <div className="error">{error}</div>}
      {tab === 'dashboard' && <Dashboard onError={setError} />}
      {tab === 'clients' && <Clients onError={setError} />}
      {tab === 'jobs' && <Jobs onError={setError} />}
      {tab === 'inventory' && <Inventory onError={setError} />}
      {tab === 'reports' && <Reports onError={setError} />}
    </div>
  )
}

export default App
