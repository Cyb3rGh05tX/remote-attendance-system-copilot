// Configuration - Replace with your Web App URL
const API_URL = 'https://script.google.com/macros/s/AKfycbwO7rRBaZT_PvPDNVd7HHyTvldn9n3abxFYikvJ_pHoILH27XDWO6hZb88HOH8Xw-Tr/exec';

// Global state
let currentUser = null;
let weeklyChart = null;

// Utility Functions
function formatDate(isoString) {
    if (!isoString) return '--:--:--';
    try {
        const date = new Date(isoString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(',', '');
    } catch (e) {
        return '--:--:--';
    }
}

function formatTimeOnly(isoString) {
    if (!isoString) return '--:--';
    try {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    } catch (e) {
        return '--:--';
    }
}

function calculateHours(checkIn, checkOut) {
    if (!checkIn || !checkOut) return 'N/A';
    try {
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        const hours = (end - start) / (1000 * 60 * 60);
        return hours.toFixed(2) + 'h';
    } catch (e) {
        return 'N/A';
    }
}

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

// API Functions
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

// Login Functions
async function handleLogin() {
    const userId = document.getElementById('userId').value.trim().toUpperCase();
    
    if (!userId) {
        showAlert('Please enter your User ID', 'error');
        return;
    }
    
    const result = await callAPI('login', { userId });
    
    if (result.success) {
        currentUser = result.user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showAlert(`Welcome ${currentUser.name}!`, 'success');
        showDashboard();
    } else {
        showAlert(result.message || 'Invalid User ID', 'error');
    }
}

// Attendance Functions
async function checkIn() {
    if (!currentUser) return;
    
    const result = await callAPI('checkIn', {
        userId: currentUser.userId,
        name: currentUser.name
    });
    
    if (result.success) {
        const time = formatTimeOnly(result.time);
        showAlert(`✅ Checked in successfully at ${time}`);
        updateAttendanceDisplay();
        loadAttendanceHistory();
        loadWeeklyStats();
    } else {
        showAlert(result.message || 'Error checking in', 'error');
    }
}

async function checkOut() {
    if (!currentUser) return;
    
    const result = await callAPI('checkOut', {
        userId: currentUser.userId
    });
    
    if (result.success) {
        const time = formatTimeOnly(result.time);
        showAlert(`✅ Checked out successfully at ${time}`);
        updateAttendanceDisplay();
        loadAttendanceHistory();
        loadWeeklyStats();
    } else {
        showAlert(result.message || 'Error checking out', 'error');
    }
}

async function updateAttendanceDisplay() {
    if (!currentUser) return;
    
    const result = await callAPI('getAttendance', {
        userId: currentUser.userId,
        period: 'daily'
    });
    
    if (result.success && result.data.length > 0) {
        const today = result.data[0];
        const checkInTime = document.getElementById('checkInTime');
        const checkOutTime = document.getElementById('checkOutTime');
        const checkInBtn = document.getElementById('checkInBtn');
        const checkOutBtn = document.getElementById('checkOutBtn');
        
        checkInTime.textContent = formatTimeOnly(today.checkIn);
        checkOutTime.textContent = formatTimeOnly(today.checkOut);
        
        // Update button states
        checkInBtn.disabled = !!today.checkIn;
        checkOutBtn.disabled = !today.checkIn || !!today.checkOut;
        
        if (today.checkIn && !today.checkOut) {
            checkInBtn.innerHTML = '<i class="fas fa-check-circle"></i> Already Checked In';
            checkOutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Check Out';
        } else if (today.checkIn && today.checkOut) {
            checkInBtn.innerHTML = '<i class="fas fa-check-circle"></i> Already Checked In';
            checkOutBtn.innerHTML = '<i class="fas fa-check-circle"></i> Already Checked Out';
        } else {
            checkInBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Check In';
            checkOutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Check Out';
        }
    } else {
        // No attendance today
        document.getElementById('checkInTime').textContent = '--:--';
        document.getElementById('checkOutTime').textContent = '--:--';
        document.getElementById('checkInBtn').disabled = false;
        document.getElementById('checkOutBtn').disabled = true;
        document.getElementById('checkInBtn').innerHTML = '<i class="fas fa-sign-in-alt"></i> Check In';
        document.getElementById('checkOutBtn').innerHTML = '<i class="fas fa-sign-out-alt"></i> Check Out';
    }
}

// Task Functions
async function addTask() {
    if (!currentUser) return;
    
    const taskTitle = document.getElementById('taskTitle').value.trim();
    
    if (!taskTitle) {
        showAlert('Please enter a task title', 'error');
        return;
    }
    
    const result = await callAPI('addTask', {
        userId: currentUser.userId,
        name: currentUser.name,
        taskTitle: taskTitle,
        status: 'Not Started'
    });
    
    if (result.success) {
        showAlert(`✅ Task added: "${taskTitle}"`);
        document.getElementById('taskTitle').value = '';
        loadTasks();
        loadWeeklyStats();
    } else {
        showAlert(result.message || 'Error adding task', 'error');
    }
}

async function updateTaskStatus(taskId, status) {
    const result = await callAPI('updateTask', {
        taskId: taskId,
        status: status
    });
    
    if (result.success) {
        showAlert(`✅ Task status updated to ${status}`);
        loadTasks();
        loadWeeklyStats();
    } else {
        showAlert(result.message || 'Error updating task', 'error');
    }
}

async function loadTasks() {
    if (!currentUser) return;
    
    const result = await callAPI('getTasks', {
        userId: currentUser.userId
    });
    
    const taskList = document.getElementById('taskList');
    
    if (!result.success || !result.data || result.data.length === 0) {
        taskList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list fa-2x"></i>
                <p>No tasks yet. Add your first task!</p>
            </div>
        `;
        return;
    }
    
    taskList.innerHTML = '';
    
    result.data.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
    
    result.data.forEach(task => {
        const taskItem = document.createElement('div');
        taskItem.className = `task-item ${task.status.toLowerCase().replace(' ', '-')}`;
        
        taskItem.innerHTML = `
            <div class="task-header">
                <div class="task-title">${task.taskTitle}</div>
                <div class="task-status ${task.status.toLowerCase().replace(' ', '-')}">
                    ${task.status}
                </div>
            </div>
            <div class="task-footer">
                <div class="task-time">
                    <i class="far fa-clock"></i> 
                    Updated: ${formatDate(task.lastUpdated)}
                </div>
                <div class="status-actions">
                    ${task.status !== 'Not Started' ? 
                        `<button onclick="updateTaskStatus('${task.taskId}', 'Not Started')" class="btn btn-sm btn-outline">
                            <i class="fas fa-undo"></i> Reset
                        </button>` : ''}
                    ${task.status !== 'In Progress' ? 
                        `<button onclick="updateTaskStatus('${task.taskId}', 'In Progress')" class="btn btn-sm btn-warning">
                            <i class="fas fa-play"></i> Start
                        </button>` : ''}
                    ${task.status !== 'Completed' ? 
                        `<button onclick="updateTaskStatus('${task.taskId}', 'Completed')" class="btn btn-sm btn-success">
                            <i class="fas fa-check"></i> Complete
                        </button>` : ''}
                </div>
            </div>
        `;
        
        taskList.appendChild(taskItem);
    });
}

async function loadAttendanceHistory() {
    if (!currentUser) return;
    
    const result = await callAPI('getAttendance', {
        userId: currentUser.userId,
        period: 'weekly'
    });
    
    const tbody = document.querySelector('#attendanceHistory tbody');
    
    if (!result.success || !result.data || result.data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 20px;">
                    <i class="fas fa-history"></i> No attendance records found
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    
    // Sort by date descending
    result.data.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    result.data.slice(0, 7).forEach(record => { // Show last 7 records
        const row = document.createElement('tr');
        
        // Format date
        const date = new Date(record.date);
        const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${formatTimeOnly(record.checkIn)}</td>
            <td>${formatTimeOnly(record.checkOut)}</td>
            <td>${calculateHours(record.checkIn, record.checkOut)}</td>
        `;
        
        tbody.appendChild(row);
    });
}

async function loadWeeklyStats() {
    if (!currentUser) return;
    
    const result = await callAPI('getAttendance', {
        userId: currentUser.userId,
        period: 'weekly'
    });
    
    if (result.success && result.data) {
        // Calculate weekly hours
        let totalHours = 0;
        let daysPresent = 0;
        
        result.data.forEach(record => {
            if (record.checkIn && record.checkOut) {
                const hours = (new Date(record.checkOut) - new Date(record.checkIn)) / (1000 * 60 * 60);
                totalHours += hours;
                daysPresent++;
            }
        });
        
        // Update stats display
        const statsDiv = document.getElementById('weeklyStats');
        statsDiv.innerHTML = `
            <div class="stat-item">
                <i class="fas fa-calendar-week"></i>
                <div>
                    <strong>${daysPresent}</strong>
                    <small>Days Present</small>
                </div>
            </div>
            <div class="stat-item">
                <i class="fas fa-clock"></i>
                <div>
                    <strong>${totalHours.toFixed(1)}</strong>
                    <small>Total Hours</small>
                </div>
            </div>
            <div class="stat-item">
                <i class="fas fa-chart-line"></i>
                <div>
                    <strong>${(totalHours / daysPresent || 0).toFixed(1)}</strong>
                    <small>Avg Hours/Day</small>
                </div>
            </div>
        `;
        
        // Update weekly chart
        updateWeeklyChart(result.data);
    }
}

function updateWeeklyChart(attendanceData) {
    const ctx = document.getElementById('weeklyChart').getContext('2d');
    
    // Prepare data for last 7 days
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const dailyHours = new Array(7).fill(0);
    
    attendanceData.forEach(record => {
        if (record.checkIn && record.checkOut) {
            const date = new Date(record.date);
            const dayDiff = Math.floor((today - date) / (1000 * 60 * 60 * 24));
            if (dayDiff >= 0 && dayDiff < 7) {
                const hours = (new Date(record.checkOut) - new Date(record.checkIn)) / (1000 * 60 * 60);
                dailyHours[6 - dayDiff] += hours;
            }
        }
    });
    
    if (weeklyChart) {
        weeklyChart.destroy();
    }
    
    weeklyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: days,
            datasets: [{
                label: 'Daily Hours',
                data: dailyHours,
                borderColor: 'rgba(67, 97, 238, 1)',
                backgroundColor: 'rgba(67, 97, 238, 0.2)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Hours'
                    }
                }
            }
        }
    });
}

// UI Navigation
function showDashboard() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userIdDisplay').textContent = currentUser.userId;
    
    // Show admin button if user is admin
    if (currentUser.role === 'admin') {
        document.getElementById('adminBtn').style.display = 'inline-block';
    }
    
    // Update current date
    const today = new Date();
    document.getElementById('todayDate').textContent = today.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Update current time every second
    function updateCurrentTime() {
        const now = new Date();
        document.getElementById('currentTime').textContent = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    
    // Load initial data
    updateAttendanceDisplay();
    loadTasks();
    loadAttendanceHistory();
    loadWeeklyStats();
}

function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('loginPage').style.display = 'block';
    document.getElementById('userId').value = '';
    
    if (weeklyChart) {
        weeklyChart.destroy();
        weeklyChart = null;
    }
}

function goToAdmin() {
    window.location.href = 'admin.html';
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            if (currentUser.role === 'admin') {
                // Don't auto-redirect to admin, let user choose
                showDashboard();
            } else {
                showDashboard();
            }
        } catch (e) {
            localStorage.removeItem('currentUser');
        }
    }
    
    // Event Listeners
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('userId').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    document.getElementById('checkInBtn').addEventListener('click', checkIn);
    document.getElementById('checkOutBtn').addEventListener('click', checkOut);
    document.getElementById('addTaskBtn').addEventListener('click', addTask);
    document.getElementById('taskTitle').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });
    
    // Auto-refresh every minute
    setInterval(() => {
        if (currentUser) {
            updateAttendanceDisplay();
        }
    }, 60000);
});
