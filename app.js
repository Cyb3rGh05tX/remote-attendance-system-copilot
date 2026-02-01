const WEB_APP_URL = "https://script.google.com/macros/s/AKfycby8CsE0f7vm6eXdCPYBG83KEjByFHvkxiV_ICJMyglBR7g6m3MwmM64WfLbfN5_pQ4z0A/exec";

let currentUser = null;

// Page load হওয়ার সাথে সাথে চেক করবে আগে থেকে Login করা আছে কি না
window.onload = function() {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        displayUI(currentUser);
    }
};

async function login() {
    const userID = document.getElementById("userID").value;
    if (!userID) return alert("Please enter User ID");

    try {
        const res = await fetch(WEB_APP_URL + "?sheet=Users");
        const users = await res.json();

        const user = users.find(u => u[0] === userID);
        if (user) {
            currentUser = user;
            // LocalStorage এ ডাটা সেভ করা হচ্ছে
            localStorage.setItem("currentUser", JSON.stringify(user));
            displayUI(user);
        } else {
            alert("Invalid User ID");
        }
    } catch (error) {
        console.error("Login Error:", error);
        alert("Server error, please try again.");
    }
}

// UI আপডেট করার Common Function
function displayUI(user) {
    document.getElementById("empName").innerText = user[1];
    document.getElementById("employeeArea").style.display = "block";
    
    // Login section হাইড করে দেয়া ভালো যাতে ডাবল লগইন না হয়
    const loginSection = document.getElementById("loginSection"); 
    if(loginSection) loginSection.style.display = "none";
}

// Logout ফাংশন (এটি কল করলে ডাটা মুছে যাবে)
function logout() {
    localStorage.removeItem("currentUser");
    location.reload(); // পেজ রিফ্রেশ করে আগের অবস্থায় ফিরিয়ে নেওয়া
}

async function checkIn() {
    if (!currentUser) return alert("Please login first");
    const date = new Date().toLocaleString();
    const payload = [currentUser[0], date, date, ""];
    
    await postData("Attendance", payload);
    alert("Check-In recorded at " + date);
}

async function checkOut() {
    if (!currentUser) return alert("Please login first");
    const date = new Date().toLocaleString();
    const payload = [currentUser[0], date, "", date];
    
    await postData("Attendance", payload);
    alert("Check-Out recorded at " + date);
}

async function updateTask() {
    if (!currentUser) return alert("Please login first");
    const taskTitle = document.getElementById("taskTitle").value;
    const taskStatus = document.getElementById("taskStatus").value;
    const date = new Date().toLocaleString();

    const payload = ["task_" + Date.now(), currentUser[0], taskTitle, taskStatus, date];
    
    await postData("Tasks", payload);
    alert("Task updated successfully");
}

// Fetch POST এর জন্য একটি Common Helper Function
async function postData(sheetName, data) {
    try {
        await fetch(WEB_APP_URL + "?sheet=" + sheetName, {
            method: "POST",
            body: JSON.stringify(data)
        });
    } catch (error) {
        console.error("Post Error:", error);
    }
}