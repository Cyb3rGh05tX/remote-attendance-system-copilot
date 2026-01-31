const WEB_APP_URL = "YOUR_GOOGLE_SCRIPT_WEBAPP_URL_HERE";

async function fetchData(sheetName) {
  const res = await fetch(WEB_APP_URL + "?sheet=" + sheetName);
  return await res.json();
}

async function initDashboard() {
  const attendance = await fetchData("Attendance");
  const tasks = await fetchData("Tasks");

  // Attendance: count check-ins per employee
  const attendanceMap = {};
  attendance.forEach(row => {
    const user = row[0];
    if(!attendanceMap[user]) attendanceMap[user] = 0;
    if(row[2]) attendanceMap[user]++; // check-in exists
  });

  const labels = Object.keys(attendanceMap);
  const data = Object.values(attendanceMap);

  new Chart(document.getElementById("attendanceChart"), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Number of Check-Ins',
        data: data,
        backgroundColor: 'rgba(75, 192, 192, 0.6)'
      }]
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true } }
    }
  });

  // Tasks: count status
  const statusCount = { "Not Started": 0, "In Progress": 0, "Completed": 0 };
  tasks.forEach(row => {
    const status = row[3];
    if(statusCount[status] !== undefined) statusCount[status]++;
  });

  new Chart(document.getElementById("taskChart"), {
    type: 'pie',
    data: {
      labels: Object.keys(statusCount),
      datasets: [{
        data: Object.values(statusCount),
        backgroundColor: ['#FF6384','#36A2EB','#FFCE56']
      }]
    },
    options: {
      responsive: true
    }
  });
}

initDashboard();
