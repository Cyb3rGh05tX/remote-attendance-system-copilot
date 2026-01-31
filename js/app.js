const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwO7rRBaZT_PvPDNVd7HHyTvldn9n3abxFYikvJ_pHoILH27XDWO6hZb88HOH8Xw-Tr/exec";

let currentUser = null;

async function login() {
  const userID = document.getElementById("userID").value;
  const res = await fetch(WEB_APP_URL + "?sheet=Users");
  const users = await res.json();

  const user = users.find(u => u[0] === userID);
  if(user) {
    currentUser = user;
    document.getElementById("empName").innerText = user[1];
    document.getElementById("employeeArea").style.display = "block";
  } else {
    alert("Invalid User ID");
  }
}

async function checkIn() {
  const date = new Date().toISOString();
  const payload = [currentUser[0], date, date, ""];
  await fetch(WEB_APP_URL + "?sheet=Attendance", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  alert("Check-In recorded");
}

async function checkOut() {
  const date = new Date().toISOString();
  const payload = [currentUser[0], date, "", date];
  await fetch(WEB_APP_URL + "?sheet=Attendance", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  alert("Check-Out recorded");
}

async function updateTask() {
  const taskTitle = document.getElementById("taskTitle").value;
  const taskStatus = document.getElementById("taskStatus").value;
  const date = new Date().toISOString();

  const payload = ["task_" + Date.now(), currentUser[0], taskTitle, taskStatus, date];
  await fetch(WEB_APP_URL + "?sheet=Tasks", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  alert("Task updated");
}
