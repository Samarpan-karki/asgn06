/********************************************************************************
*  WEB322 – Assignment 06
* 
*  I declare that this assignment is my own work in accordance with Seneca's
*  Academic Integrity Policy:
* 
*  https://www.senecapolytechnic.ca/about/policies/academic-integrity-policy.html
* 
*  Name: Haein Lee Student ID: 182583237 Date: _______________
*
*  Published URL: _____________________
*
********************************************************************************/

const express = require('express');
const path = require('path'); 
const projectData = require("./modules/projects");
const authData = require('./modules/auth-service'); 
const clientSessions = require('client-sessions'); 

const app = express();
const HTTP_PORT = process.env.PORT || 8080;

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.use(clientSessions({
    cookieName: "session",
    secret: "your_secret_key_here_change_this_to_something_more_secure",
    duration: 24 * 60 * 60 * 1000, 
    activeDuration: 1000 * 60 * 5 
}));

app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});

function ensureLogin(req, res, next) {
    if (!req.session.user) {
        res.redirect('/login');
    } else {
        next();
    }
}

app.get('/', function(req, res){
    res.render("home", {page: "/"});
});

app.get('/about', function(req, res){
    res.render("about", {page: "/about"});
});

app.get('/solutions/projects', function(req, res){
    if (req.query.sector) {
        projectData.getProjectsBySector(req.query.sector)
            .then(function(projects){
                if (projects.length > 0) {
                    res.render("projects", {projects: projects, page: "/solutions/projects"});
                } else {
                    res.status(404).render("404", {
                        message: `No projects found for sector: ${req.query.sector}`,
                        page: ""
                    });
                }
            })
            .catch(function(error){
                res.status(404).render("404", {
                    message: "Unable to retrieve projects for the specified sector",
                    page: ""
                });
            });
    } else {
        projectData.getAllProjects()
            .then(function(projects){
                res.render("projects", {projects: projects, page: "/solutions/projects"});
            })
            .catch(function(error){
                res.status(404).render("404", {
                    message: "Unable to retrieve projects",
                    page: ""
                });
            });
    }
});

app.get('/solutions/projects/:id', function(req, res){
    projectData.getProjectById(parseInt(req.params.id))
        .then(function(project){
            if (project) {
                res.render("project", {project: project, page: ""});
            } else {
                res.status(404).render("404", {
                    message: `Project with ID ${req.params.id} not found`,
                    page: ""
                });
            }
        })
        .catch(function(error){
            res.status(404).render("404", {
                message: "Unable to retrieve the requested project",
                page: ""
            });
        });
});

app.get('/solutions/addProject', ensureLogin, function(req, res){
    projectData.getAllSectors()
        .then(function(sectors){
            res.render("addProject", { sectors: sectors, page: "/solutions/addProject" });
        })
        .catch(function(err){
            res.render("500", { message: `I'm sorry, but we have encountered the following error: ${err}` });
        });
});

app.post('/solutions/addProject', ensureLogin, function(req, res){
    projectData.addProject(req.body)
        .then(function(){
            res.redirect("/solutions/projects");
        })
        .catch(function(err){
            res.render("500", { message: `I'm sorry, but we have encountered the following error: ${err}` });
        });
});

app.get('/solutions/editProject/:id', ensureLogin, function(req, res){
    Promise.all([
        projectData.getProjectById(parseInt(req.params.id)),
        projectData.getAllSectors()
    ])
    .then(function([project, sectors]){
        res.render("editProject", { sectors: sectors, project: project, page: "" });
    })
    .catch(function(err){
        res.status(404).render("404", { message: err });
    });
});

app.post('/solutions/editProject', ensureLogin, function(req, res){
    projectData.editProject(req.body.id, req.body)
        .then(function(){
            res.redirect("/solutions/projects");
        })
        .catch(function(err){
            res.render("500", { message: `I'm sorry, but we have encountered the following error: ${err}` });
        });
});

app.get('/solutions/deleteProject/:id', ensureLogin, function(req, res){
    projectData.deleteProject(parseInt(req.params.id))
        .then(function(){
            res.redirect("/solutions/projects");
        })
        .catch(function(err){
            res.render("500", { message: `I'm sorry, but we have encountered the following error: ${err}` });
        });
});

app.get('/login', (req, res) => {
    res.render('login', { errorMessage: "", userName: "", page: '/login' });
});

app.get('/register', (req, res) => {
    res.render('register', { 
        errorMessage: "", 
        successMessage: "", 
        userName: "", 
        page: '/register' 
    });
});

app.post('/register', (req, res) => {
    authData.registerUser(req.body)
        .then(() => {
            res.render('register', { 
                errorMessage: "", 
                successMessage: "User created", 
                userName: "",
                page: '/register'
            });
        })
        .catch(err => {
            res.render('register', { 
                errorMessage: err, 
                successMessage: "", 
                userName: req.body.userName,
                page: '/register'
            });
        });
});

app.post('/login', (req, res) => {
    req.body.userAgent = req.get('User-Agent');
    
    authData.checkUser(req.body)
        .then((user) => {
            req.session.user = {
                userName: user.userName,
                email: user.email,
                loginHistory: user.loginHistory
            };
            res.redirect('/solutions/projects');
        })
        .catch(err => {
            res.render('login', { 
                errorMessage: err, 
                userName: req.body.userName,
                page: '/login'
            });
        });
});

app.get('/logout', (req, res) => {
    req.session.reset();
    res.redirect('/');
});

app.get('/userHistory', ensureLogin, (req, res) => {
    res.render('userHistory', { page: '/userHistory' });
});

app.use((req, res) => {
    res.status(404).render("404", {
        message: "I'm sorry, we're unable to find what you're looking for",
        page: ""
    });
});

projectData.initialize()
    .then(authData.initialize)
    .then(function(){
        console.log("Database synchronized successfully!");
        app.listen(HTTP_PORT, function(){
            console.log("Server listening on: " + HTTP_PORT);
        });
    })
    .catch(function(err){
        console.error("Failed to synchronize database:", err);
    });