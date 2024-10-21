const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const fileUpload = require('express-fileupload');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const port = process.env.PORT || 4000;

const app = express();

// Set view engine
app.set('view engine', 'ejs');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(fileUpload());
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true
}));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log("MongoDB connected"))
  .catch(err => console.error(err));

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Schemas and Models
const studentSchema = new mongoose.Schema({
    name: String,
    regNumber: String,
    department: String,
    password: String
});

const instructorSchema = new mongoose.Schema({
    name: String,
    courseTitle: String,
    courseCode: String,
    fileTitle: String,
    filePath: String
});

const Student = mongoose.model('Student', studentSchema);
const Instructor = mongoose.model('Instructor', instructorSchema);

// Routes
// Index Page
app.get('/', (req, res) => {
    res.render('index');
});

// Student Registration
app.get('/student/register', (req, res) => {
    res.render('studentRegister');
});

app.post('/student/register', async (req, res) => {
    const { name, regNumber, department } = req.body;
    console.log(req.body.regNumber);
    const newStudent = new Student({ name, regNumber, department, password: regNumber });
    await newStudent.save();
    res.redirect('/student/login');
});


// Student Login
app.get('/student/login', (req, res) => {
    res.render('login', { role: 'Student' });
});

app.post('/student/login', async (req, res) => {
    const { regNumber, password } = req.body;

    console.log('Attempting to login with Registration Number:', regNumber); // Debug log for input

    try {
        const student = await Student.findOne({ regNumber });
        if (!student) {
            console.log('Login failed: Student not found.'); // Debug log
            return res.redirect('/student/login');  // Redirect back to login
        }

        console.log('Found student:', student); // Log found student object

        // Check if the entered password matches the registration number
        if (password === student.regNumber) { 
            req.session.studentId = student._id;  // Set the session
            console.log('Login successful:', student); // Debug log
            return res.redirect('/student/dashboard');  // Redirect to dashboard
        } else {
            console.log('Login failed: Incorrect password.'); // Debug log
            return res.redirect('/student/login');  // Redirect back to login
        }
    } catch (error) {
        console.error('Error during login:', error); // Debug log
        return res.redirect('/student/login'); // Redirect back to login on error
    }
});


// Student Dashboard
app.get('/student/dashboard', async (req, res) => {
    if (!req.session.studentId) return res.redirect('/student/login');
    const files = await Instructor.find({});
    res.render('studentDashboard', { files });
});

// Instructor Login
app.get('/instructor/login', (req, res) => {
    res.render('login', { role: 'Instructor' });
});

app.post('/instructor/login', (req, res) => {
    const { password } = req.body;
    
    console.log('Instructor login attempt with password:', password); // Debug log

    if (password === 'Mouau') {
        req.session.instructor = true; // Set the session
        console.log('Login successful for instructor.'); // Debug log
        return res.redirect('/instructorDashboard'); // Redirect to instructor dashboard
    } else {
        console.log('Login failed: Incorrect password.'); // Debug log
        return res.redirect('/instructor/login'); // Redirect back to login
    }
});


// Instructor Dashboard
app.get('/instructorDashboard', (req, res) => {
    if (!req.session.instructor) {
        console.log('Access denied: No active instructor session.'); // Debug log
        return res.redirect('/instructor/login'); // Redirect back to login if not logged in
    }
    
    res.render('instructorDashboard'); // Render the instructor dashboard view
});


app.post('/instructor/upload', async (req, res) => {
    if (!req.session.instructor) return res.redirect('/instructor/login');
    const { courseTitle, courseCode, fileTitle, instructorName } = req.body;
    const file = req.files.file;
    const filePath = path.join(__dirname, 'public/uploads', file.name);
    
    file.mv(filePath, async (err) => {
        if (err) return res.status(500).send(err);
        const newFile = new Instructor({ name: instructorName, courseTitle, courseCode, fileTitle, filePath: '/uploads/' + file.name });
        await newFile.save();
        res.redirect('/instructorDashboard');
    });
});

// File Download
app.get('/download/:id', async (req, res) => {
    const file = await Instructor.findById(req.params.id);
    res.download(path.join(__dirname, 'public', file.filePath));
});

// Start server
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })
