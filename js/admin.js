// Configuration - Same API URL
const API_URL = 'https://script.google.com/macros/s/AKfycbwO7rRBaZT_PvPDNVd7HHyTvldn9n3abxFYikvJ_pHoILH27XDWO6hZb88HOH8Xw-Tr/exec';

// Global state
let currentUser = null;
let charts = {
    attendanceChart: null,
    tasksChart: null
};
let allEmployees = [];

// Utility Functions
function showAlert(message, type = 'success') {
    const alertDiv = document.getElementById('alert');
    alertDiv.textContent = message;
    alertDiv.className = `alert alert-${type}`;
    alertDiv.style.display = 'block';
    
    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 5000);
}

function showLoading(show = true) {
    const loadingDiv = document.getElementById('loading');
    loadingDiv.style.display = show ? 'block' : 'none';
}

async function callAPI(action, params = {}) {
    const url = new URL(API_URL);
    url.searchParams.append('action', action);
    
    Object.keys(params).forEach(key => {
        url.searchParams.append(key, params[key]);
    });
    
    try {
        showLoading(true);
        const response = await fetch(url.toString());
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API Error:', error);
        showAlert('Connection error. Please try again.', 'error');
        return { success: false, message: 'Network error' };
    } finally {
        showLoading(false);
    }
}

// Initialize Admin Dashboard
async function initAdmin() {
    const savedUser = localStorage.getItem('currentUser');
    if (!savedUser) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        currentUser = JSON.parse(savedUser);
        if (currentUser.role !== 'admin') {
            window.location.href = 'index.html';
            return;
        }
    } catch (e) {
        window.location.href = 'index.html';
        return;
    }
    
    document.getElementById('adminName').textContent = currentUser.name;
    
    // Load initial data
    await loadEmployees();
    await loadData();
    
    // Event listeners for filters
    document.getElementById('periodFilter').addEventListener('change', loadData);
    document.getElementById('employeeFilter').addEventListener('change', loadData);
    
    // Auto-refresh every 5 minutes
    setInterval(loadData, 300000);
}

// Load employees for filter
async function loadEmployees() {
    // In a real system, you would get this from API
    // For now, we'll use demo employees
    allEmployees = [
        { userId: 'EMP001', name: 'John Doe' },
        { userId: 'EMP002', name: 'Jane Smith' }
    ];
    
    const filter = document.getElementById('employeeFilter');
    filter.innerHTML = '<option value="all">All Employees</option>';
    
    allEmployees.forEach(emp => {
        const option = document.createElement('option');
        option.value = emp.userId;
        option.textContent = `${emp.userId} - ${emp.name}`;
        filter.appendChild(option);
    });
}

// Load all data
async function loadData() {
    const period = document.getElementById('periodFilter').value;
    const employeeId = document.getElementById('employeeFilter').value;
    
    await Promise.all([
        loadAttendanceData(period, employeeId),
        loadTasksData(employeeId)
    ]);
}

// Load attendance data
async function loadAttendanceData(period, employeeId = 'all') {
    let attendanceResult;
    
    if (employeeId === 'all') {
        attendanceResult = await callAPI('getAllAttendance', { period });
    } else {
        attendanceResult = await callAPI('getAttendance', { 
            userId: employeeId,
            period: period
        });
    }
    
    if (attendanceResult.success) {
        updateAttendanceStats(attendanceResult.data);
        updateAttendanceChart(attendanceResult.data);
        updateAttendanceTable(attendanceResult.data);
    }
}

// Load tasks data
async function loadTasksData(employeeId = 'all') {
    let tasksResult;
    
    if (employeeId === 'all') {
        tasksResult = await callAPI('getAllTasks');
    } else {
        tasksResult = await callAPI('getTasks', { userId: employeeId });
    }
    
    if (tasksResult.success) {
        updateTasksStats(tasksResult.data);
        updateTasksChart(tasksResult.data);
        updateTasksTable(tasksResult.data);
    }
}

// Update attendance statistics
function updateAttendanceStats(attendanceData) {
    const statsDiv = document.getElementById('attendanceStats');
    
    if (!attendanceData || attendanceData.length === 0) {
        statsDiv.innerHTML = '<p>No attendance data available</p>';
        return;
    }
    
    let totalHours = 0;
    let presentEmployees = new Set();
    let totalCheckIns = 0;
    
    attendanceData.forEach(record => {
        if (record.checkIn) {
            presentEmployees.add(record.userId);
            totalCheckIns++;
            
            if (record.checkOut) {
                const hours = (new Date(record.checkOut) - new Date(record.checkIn)) / (1000 * 60 * 60);
                totalHours += hours;
            }
        }
    });
    
    const avgHours = totalCheckIns > 0 ? totalHours / totalCheckIns : 0;
    
    statsDiv.innerHTML = `
        <div class
