const WEB_APP_URL = "https://script.google.com/macros/s/AKfycby8CsE0f7vm6eXdCPYBG83KEjByFHvkxiV_ICJMyglBR7g6m3MwmM64WfLbfN5_pQ4z0A/exec";

// Admin Login Credentials
const ADMIN_CREDENTIALS = {
  'ADMIN001': { name: 'System Admin', role: 'Administrator' },
  'ADMIN002': { name: 'HR Manager', role: 'HR' }
};

// Global variables
let currentAdmin = null;
let allEmployees = [];
let allAttendance = [];
let allTasks = [];

// Initialize admin dashboard
async function initAdminDashboard() {
  try {
    // Load all data
    await loadAdminData();
    
    // Update statistics
    updateStatistics();
    
    // Render employee table
    renderEmployeeTable();
    
    // Initialize charts
    initCharts();
    
    console.log('Admin dashboard initialized successfully');
  } catch (error) {
    console.error('Error initializing admin dashboard:', error);
    alert('Failed to load admin data. Please try again.');
  }
}

// Load all data from Google Sheets
async function loadAdminData() {
  try {
    // Load employees
    const employeesData = await fetchData("Employees");
    allEmployees = employeesData.map(row => ({
      id: row[0],
      name: row[1],
      email: row[2],
      department: row[3],
      position: row[4],
      status: row[5] || 'Active'
    }));

    // Load attendance
    const attendanceData = await fetchData("Attendance");
    allAttendance = attendanceData.map(row => ({
      userId: row[0],
      date: row[1],
      checkIn: row[2],
      checkOut: row[3],
      status: row[4] || 'Absent'
    }));

    // Load tasks
    const tasksData = await fetchData("Tasks");
    allTasks = tasksData.map(row => ({
      taskId: row[0],
      userId: row[1],
      title: row[2],
      status: row[3],
      lastUpdated: row[4]
    }));

    console.log('Data loaded:', {
      employees: allEmployees.length,
      attendance: allAttendance.length,
      tasks: allTasks.length
    });
  } catch (error) {
    console.error('Error loading data:', error);
    throw error;
  }
}

// Fetch data from Google Sheets
async function fetchData(sheetName) {
  try {
    const res = await fetch(`${WEB_APP_URL}?sheet=${sheetName}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error(`Error fetching ${sheetName}:`, error);
    throw error;
  }
}

// Update statistics
function updateStatistics() {
  const today = new Date().toISOString().split('T')[0];
  
  // Total employees
  document.getElementById('totalEmployees').textContent = allEmployees.length;
  
  // Present today
  const presentToday = allAttendance.filter(record => 
    record.date === today && record.checkIn
  ).length;
  document.getElementById('presentToday').textContent = presentToday;
  
  // Absent today
  const absentToday = allEmployees.length - presentToday;
  document.getElementById('absentToday').textContent = absentToday;
  
  // Calculate late arrivals (check-in after 9:30 AM)
  const lateArrivals = allAttendance.filter(record => {
    if (!record.checkIn) return false;
    const checkInTime = new Date(record.date + 'T' + record.checkIn);
    return checkInTime.getHours() > 9 || 
           (checkInTime.getHours() === 9 && checkInTime.getMinutes() > 30);
  }).length;
  
  // Update additional stats if elements exist
  const lateCountElement = document.getElementById('lateToday');
  if (lateCountElement) {
    lateCountElement.textContent = lateArrivals;
  }
}

// Render employee table
function renderEmployeeTable() {
  const tableBody = document.getElementById('adminTableBody');
  if (!tableBody) return;
  
  tableBody.innerHTML = '';
  
  if (allEmployees.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 30px;">
          No employee data available
        </td>
      </tr>
    `;
    return;
  }
  
  allEmployees.forEach(employee => {
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = allAttendance.find(record => 
      record.userId === employee.id && record.date === today
    );
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${employee.id}</td>
      <td>${employee.name}</td>
      <td>${employee.department}</td>
      <td>${employee.position}</td>
      <td>${todayAttendance?.checkIn || '--:--'}</td>
      <td>${todayAttendance?.checkOut || '--:--'}</td>
      <td>
        <span class="status-badge ${employee.status === 'Active' ? 'active' : 'inactive'}">
          ${employee.status}
        </span>
      </td>
      <td>
        <button class="btn-action" onclick="viewEmployeeDetails('${employee.id}')" title="View Details">
          <i class="fas fa-eye"></i>
        </button>
        <button class="btn-action edit" onclick="editEmployee('${employee.id}')" title="Edit">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn-action delete" onclick="deleteEmployee('${employee.id}')" title="Delete">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

// Initialize charts
function initCharts() {
  // Attendance chart
  const attendanceCtx = document.getElementById('attendanceChart');
  if (attendanceCtx) {
    const last7Days = Array.from({length: 7}, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();
    
    const attendanceData = last7Days.map(date => {
      return allAttendance.filter(record => record.date === date && record.checkIn).length;
    });
    
    new Chart(attendanceCtx, {
      type: 'line',
      data: {
        labels: last7Days.map(date => new Date(date).toLocaleDateString('en-US', { 
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        })),
        datasets: [{
          label: 'Daily Attendance',
          data: attendanceData,
          borderColor: '#4b6cb7',
          backgroundColor: 'rgba(75, 108, 183, 0.1)',
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: allEmployees.length,
            title: {
              display: true,
              text: 'Number of Employees'
            }
          }
        }
      }
    });
  }
  
  // Department distribution chart
  const deptCtx = document.getElementById('departmentChart');
  if (deptCtx) {
    const deptCount = {};
    allEmployees.forEach(emp => {
      deptCount[emp.department] = (deptCount[emp.department] || 0) + 1;
    });
    
    new Chart(deptCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(deptCount),
        datasets: [{
          data: Object.values(deptCount),
          backgroundColor: [
            '#4b6cb7', '#2ecc71', '#e74c3c', '#f39c12',
            '#9b59b6', '#3498db', '#1abc9c', '#34495e'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    });
  }
}

// Add new employee (modal-based)
function addEmployee() {
  const modalHtml = `
    <div id="addEmployeeModal" class="modal" style="display: block;">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Add New Employee</h3>
          <span class="close-modal" onclick="closeModal()">&times;</span>
        </div>
        <div class="modal-body">
          <form id="employeeForm">
            <div class="form-group">
              <label for="empId">Employee ID *</label>
              <input type="text" id="empId" required>
            </div>
            <div class="form-group">
              <label for="empName">Full Name *</label>
              <input type="text" id="empName" required>
            </div>
            <div class="form-group">
              <label for="empEmail">Email *</label>
              <input type="email" id="empEmail" required>
            </div>
            <div class="form-group">
              <label for="empDept">Department *</label>
              <select id="empDept" required>
                <option value="">Select Department</option>
                <option value="IT">IT</option>
                <option value="HR">HR</option>
                <option value="Finance">Finance</option>
                <option value="Marketing">Marketing</option>
                <option value="Sales">Sales</option>
                <option value="Operations">Operations</option>
              </select>
            </div>
            <div class="form-group">
              <label for="empPosition">Position *</label>
              <input type="text" id="empPosition" required>
            </div>
            <div class="form-group">
              <label for="empStatus">Status</label>
              <select id="empStatus">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="On Leave">On Leave</option>
              </select>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="saveEmployee()">Save Employee</button>
        </div>
      </div>
    </div>
  `;
  
  // Add modal to page
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHtml;
  document.body.appendChild(modalContainer);
  
  // Add modal styles
  addModalStyles();
}

// Save employee to Google Sheets
async function saveEmployee() {
  try {
    const employeeData = {
      id: document.getElementById('empId').value,
      name: document.getElementById('empName').value,
      email: document.getElementById('empEmail').value,
      department: document.getElementById('empDept').value,
      position: document.getElementById('empPosition').value,
      status: document.getElementById('empStatus').value
    };
    
    // Validate required fields
    if (!employeeData.id || !employeeData.name || !employeeData.email || 
        !employeeData.department || !employeeData.position) {
      alert('Please fill all required fields');
      return;
    }
    
    // Check if employee ID already exists
    if (allEmployees.some(emp => emp.id === employeeData.id)) {
      alert('Employee ID already exists. Please use a different ID.');
      return;
    }
    
    // Save to Google Sheets
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'addEmployee',
        data: employeeData
      })
    });
    
    if (response.ok) {
      alert('Employee added successfully!');
      closeModal();
      await loadAdminData();
      renderEmployeeTable();
      updateStatistics();
    } else {
      throw new Error('Failed to save employee');
    }
  } catch (error) {
    console.error('Error saving employee:', error);
    alert('Failed to add employee. Please try again.');
  }
}

// View employee details
function viewEmployeeDetails(employeeId) {
  const employee = allEmployees.find(emp => emp.id === employeeId);
  const attendance = allAttendance.filter(record => record.userId === employeeId);
  const tasks = allTasks.filter(task => task.userId === employeeId);
  
  const detailsHtml = `
    <div id="employeeDetailsModal" class="modal" style="display: block;">
      <div class="modal-content" style="max-width: 800px;">
        <div class="modal-header">
          <h3>Employee Details: ${employee.name}</h3>
          <span class="close-modal" onclick="closeModal()">&times;</span>
        </div>
        <div class="modal-body">
          <div class="details-grid">
            <div class="detail-card">
              <h4>Basic Information</h4>
              <p><strong>ID:</strong> ${employee.id}</p>
              <p><strong>Name:</strong> ${employee.name}</p>
              <p><strong>Email:</strong> ${employee.email}</p>
              <p><strong>Department:</strong> ${employee.department}</p>
              <p><strong>Position:</strong> ${employee.position}</p>
              <p><strong>Status:</strong> <span class="status-badge ${employee.status === 'Active' ? 'active' : 'inactive'}">${employee.status}</span></p>
            </div>
            
            <div class="detail-card">
              <h4>Attendance Summary (Last 7 Days)</h4>
              ${generateAttendanceSummary(employeeId)}
            </div>
          </div>
          
          <div class="detail-card">
            <h4>Recent Tasks</h4>
            ${generateTasksTable(tasks)}
          </div>
          
          <div class="detail-card">
            <h4>Recent Attendance</h4>
            ${generateAttendanceTable(attendance)}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="closeModal()">Close</button>
        </div>
      </div>
    </div>
  `;
  
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = detailsHtml;
  document.body.appendChild(modalContainer);
  addModalStyles();
}

// Generate attendance summary
function generateAttendanceSummary(employeeId) {
  const last7Days = Array.from({length: 7}, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();
  
  let summary = '<div class="attendance-summary">';
  last7Days.forEach(date => {
    const record = allAttendance.find(rec => rec.userId === employeeId && rec.date === date);
    const present = record && record.checkIn;
    summary += `
      <div class="day-status ${present ? 'present' : 'absent'}">
        <span>${new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
        <span>${present ? '✓' : '✗'}</span>
      </div>
    `;
  });
  summary += '</div>';
  return summary;
}

// Generate tasks table
function generateTasksTable(tasks) {
  if (tasks.length === 0) return '<p>No tasks found</p>';
  
  let table = '<table class="details-table"><thead><tr><th>Task</th><th>Status</th><th>Last Updated</th></tr></thead><tbody>';
  tasks.slice(0, 5).forEach(task => {
    table += `
      <tr>
        <td>${task.title}</td>
        <td><span class="task-status ${task.status.toLowerCase().replace(' ', '-')}">${task.status}</span></td>
        <td>${new Date(task.lastUpdated).toLocaleDateString()}</td>
      </tr>
    `;
  });
  table += '</tbody></table>';
  return table;
}

// Generate attendance table
function generateAttendanceTable(attendance) {
  if (attendance.length === 0) return '<p>No attendance records</p>';
  
  let table = '<table class="details-table"><thead><tr><th>Date</th><th>Check-In</th><th>Check-Out</th><th>Status</th></tr></thead><tbody>';
  attendance.slice(0, 10).forEach(record => {
    table += `
      <tr>
        <td>${new Date(record.date).toLocaleDateString()}</td>
        <td>${record.checkIn || '--:--'}</td>
        <td>${record.checkOut || '--:--'}</td>
        <td><span class="status-badge ${record.status === 'Present' ? 'active' : 'inactive'}">${record.status}</span></td>
      </tr>
    `;
  });
  table += '</tbody></table>';
  return table;
}

// Edit employee
function editEmployee(employeeId) {
  const employee = allEmployees.find(emp => emp.id === employeeId);
  if (!employee) {
    alert('Employee not found');
    return;
  }
  
  const modalHtml = `
    <div id="editEmployeeModal" class="modal" style="display: block;">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Edit Employee: ${employee.name}</h3>
          <span class="close-modal" onclick="closeModal()">&times;</span>
        </div>
        <div class="modal-body">
          <form id="editEmployeeForm">
            <div class="form-group">
              <label for="editEmpId">Employee ID</label>
              <input type="text" id="editEmpId" value="${employee.id}" readonly>
            </div>
            <div class="form-group">
              <label for="editEmpName">Full Name *</label>
              <input type="text" id="editEmpName" value="${employee.name}" required>
            </div>
            <div class="form-group">
              <label for="editEmpEmail">Email *</label>
              <input type="email" id="editEmpEmail" value="${employee.email}" required>
            </div>
            <div class="form-group">
              <label for="editEmpDept">Department *</label>
              <select id="editEmpDept" required>
                <option value="IT" ${employee.department === 'IT' ? 'selected' : ''}>IT</option>
                <option value="HR" ${employee.department === 'HR' ? 'selected' : ''}>HR</option>
                <option value="Finance" ${employee.department === 'Finance' ? 'selected' : ''}>Finance</option>
                <option value="Marketing" ${employee.department === 'Marketing' ? 'selected' : ''}>Marketing</option>
                <option value="Sales" ${employee.department === 'Sales' ? 'selected' : ''}>Sales</option>
                <option value="Operations" ${employee.department === 'Operations' ? 'selected' : ''}>Operations</option>
              </select>
            </div>
            <div class="form-group">
              <label for="editEmpPosition">Position *</label>
              <input type="text" id="editEmpPosition" value="${employee.position}" required>
            </div>
            <div class="form-group">
              <label for="editEmpStatus">Status</label>
              <select id="editEmpStatus">
                <option value="Active" ${employee.status === 'Active' ? 'selected' : ''}>Active</option>
                <option value="Inactive" ${employee.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                <option value="On Leave" ${employee.status === 'On Leave' ? 'selected' : ''}>On Leave</option>
              </select>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="updateEmployee('${employeeId}')">Update</button>
        </div>
      </div>
    </div>
  `;
  
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHtml;
  document.body.appendChild(modalContainer);
  addModalStyles();
}

// Update employee
async function updateEmployee(employeeId) {
  try {
    const employeeData = {
      id: employeeId,
      name: document.getElementById('editEmpName').value,
      email: document.getElementById('editEmpEmail').value,
      department: document.getElementById('editEmpDept').value,
      position: document.getElementById('editEmpPosition').value,
      status: document.getElementById('editEmpStatus').value
    };
    
    // Validate required fields
    if (!employeeData.name || !employeeData.email || 
        !employeeData.department || !employeeData.position) {
      alert('Please fill all required fields');
      return;
    }
    
    // Update in Google Sheets
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'updateEmployee',
        data: employeeData
      })
    });
    
    if (response.ok) {
      alert('Employee updated successfully!');
      closeModal();
      await loadAdminData();
      renderEmployeeTable();
      updateStatistics();
    } else {
      throw new Error('Failed to update employee');
    }
  } catch (error) {
    console.error('Error updating employee:', error);
    alert('Failed to update employee. Please try again.');
  }
}

// Delete employee
async function deleteEmployee(employeeId) {
  if (!confirm(`Are you sure you want to delete employee ${employeeId}? This action cannot be undone.`)) {
    return;
  }
  
  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'deleteEmployee',
        employeeId: employeeId
      })
    });
    
    if (response.ok) {
      alert('Employee deleted successfully!');
      await loadAdminData();
      renderEmployeeTable();
      updateStatistics();
    } else {
      throw new Error('Failed to delete employee');
    }
  } catch (error) {
    console.error('Error deleting employee:', error);
    alert('Failed to delete employee. Please try again.');
  }
}

// Generate report
async function generateReport() {
  try {
    // Create CSV content
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // Employee data
    csvContent += 'Employee Report\n';
    csvContent += 'Employee ID,Name,Email,Department,Position,Status\n';
    allEmployees.forEach(emp => {
      csvContent += `${emp.id},${emp.name},${emp.email},${emp.department},${emp.position},${emp.status}\n`;
    });
    
    // Attendance data
    csvContent += '\nAttendance Report\n';
    csvContent += 'Employee ID,Date,Check-In,Check-Out,Status\n';
    allAttendance.forEach(record => {
      csvContent += `${record.userId},${record.date},${record.checkIn || ''},${record.checkOut || ''},${record.status}\n`;
    });
    
    // Task data
    csvContent += '\nTask Report\n';
    csvContent += 'Task ID,Employee ID,Task Title,Status,Last Updated\n';
    allTasks.forEach(task => {
      csvContent += `${task.taskId},${task.userId},${task.title},${task.status},${task.lastUpdated}\n`;
    });
    
    // Download CSV
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error generating report:', error);
    alert('Failed to generate report. Please try again.');
  }
}

// Load all attendance data
async function loadAllAttendance() {
  try {
    await loadAdminData();
    renderEmployeeTable();
    updateStatistics();
    alert('Data refreshed successfully!');
  } catch (error) {
    console.error('Error refreshing data:', error);
    alert('Failed to refresh data. Please try again.');
  }
}

// Close modal
function closeModal() {
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => modal.remove());
}

// Add modal styles
function addModalStyles() {
  if (document.getElementById('modal-styles')) return;
  
  const styles = `
    <style id="modal-styles">
      .modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      }
      
      .modal-content {
        background-color: white;
        border-radius: 10px;
        width: 90%;
        max-width: 500px;
        max-height: 90vh;
        overflow-y: auto;
        animation: modalFadeIn 0.3s;
      }
      
      @keyframes modalFadeIn {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid #eee;
      }
      
      .modal-header h3 {
        margin: 0;
        color: #333;
      }
      
      .close-modal {
        font-size: 24px;
        cursor: pointer;
        color: #666;
      }
      
      .close-modal:hover {
        color: #333;
      }
      
      .modal-body {
        padding: 20px;
      }
      
      .modal-footer {
        padding: 15px 20px;
        border-top: 1px solid #eee;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }
      
      .form-group {
        margin-bottom: 15px;
      }
      
      .form-group label {
        display: block;
        margin-bottom: 5px;
        font-weight: 500;
        color: #333;
      }
      
      .form-group input,
      .form-group select {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 5px;
        font-size: 14px;
      }
      
      .btn-secondary {
        background-color: #6c757d;
        color: white;
        padding: 10px 20px;
        border: none;
        border-radius: 5px;
        cursor: pointer;
      }
      
      .btn-action {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 14px;
        margin: 0 3px;
        color: #4b6cb7;
      }
      
      .btn-action.edit {
        color: #f39c12;
      }
      
      .btn-action.delete {
        color: #e74c3c;
      }
      
      .status-badge {
        padding: 3px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
      }
      
      .status-badge.active {
        background-color: #d4edda;
        color: #155724;
      }
      
      .status-badge.inactive {
        background-color: #f8d7da;
        color: #721c24;
      }
      
      .details-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        margin-bottom: 20px;
      }
      
      .detail-card {
        background-color: #f8f9fa;
        padding: 15px;
        border-radius: 8px;
        border-left: 4px solid #4b6cb7;
      }
      
      .detail-card h4 {
        margin-top: 0;
        margin-bottom: 15px;
        color: #333;
      }
      
      .details-table {
        width: 100%;
        border-collapse: collapse;
      }
      
      .details-table th,
      .details-table td {
        padding: 8px;
        text-align: left;
        border-bottom: 1px solid #ddd;
      }
      
      .details-table th {
        background-color: #f8f9fa;
        font-weight: 600;
      }
      
      .attendance-summary {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      
      .day-status {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 8px;
        border-radius: 5px;
        min-width: 50px;
      }
      
      .day-status.present {
        background-color: #d4edda;
        color: #155724;
      }
      
      .day-status.absent {
        background-color: #f8d7da;
        color: #721c24;
      }
      
      .task-status {
        padding: 3px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
      }
      
      .task-status.not-started {
        background-color: #e74c3c;
        color: white;
      }
      
      .task-status.in-progress {
        background-color: #f39c12;
        color: white;
      }
      
      .task-status.completed {
        background-color: #27ae60;
        color: white;
      }
    </style>
  `;
  
  document.head.insertAdjacentHTML('beforeend', styles);
}

// Admin login function (to be called from main HTML)
function adminLogin(adminId) {
  if (ADMIN_CREDENTIALS[adminId]) {
    currentAdmin = ADMIN_CREDENTIALS[adminId];
    
    // Hide login, show admin dashboard
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('adminArea').style.display = 'block';
    
    // Initialize admin dashboard
    initAdminDashboard();
    
    return true;
  } else {
    alert('Invalid Admin ID');
    return false;
  }
}

// Make functions available globally
window.adminLogin = adminLogin;
window.initAdminDashboard = initAdminDashboard;
window.addEmployee = addEmployee;
window.editEmployee = editEmployee;
window.deleteEmployee = deleteEmployee;
window.viewEmployeeDetails = viewEmployeeDetails;
window.generateReport = generateReport;
window.loadAllAttendance = loadAllAttendance;
window.closeModal = closeModal;
window.saveEmployee = saveEmployee;
window.updateEmployee = updateEmployee;