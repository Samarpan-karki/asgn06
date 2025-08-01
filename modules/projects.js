require('dotenv').config();
require('pg');
const Sequelize = require('sequelize');

let sequelize = new Sequelize(
    process.env.PGDATABASE,
    process.env.PGUSER,
    process.env.PGPASSWORD,
    {
        host: process.env.PGHOST,
        dialect: 'postgres',
        port: 5432,
        dialectOptions: {
            ssl: { rejectUnauthorized: false }
        },

    }
);

const Sector = sequelize.define('Sector', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    sector_name: Sequelize.STRING
}, {
    timestamps: false
});

const Project = sequelize.define('Project', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: Sequelize.STRING,
    feature_img_url: Sequelize.STRING,
    summary_short: Sequelize.TEXT,
    intro_short: Sequelize.TEXT,
    impact: Sequelize.TEXT,
    original_source_url: Sequelize.STRING
}, {
    timestamps: false
});

Project.belongsTo(Sector, { foreignKey: 'sector_id' });

function initialize() {
    return sequelize.sync();
}

function getAllProjects() {
    return Project.findAll({
        include: [Sector]
    });
}

function getProjectById(projectId) {
    return new Promise((resolve, reject) => {
        Project.findAll({
            include: [Sector],
            where: { id: projectId }
        })
        .then(projects => {
            if (projects.length > 0) {
                resolve(projects[0]);
            } else {
                reject("Unable to find requested project");
            }
        })
        .catch(err => {
            reject(err);
        });
    });
}

function getProjectsBySector(sector) {
    return new Promise((resolve, reject) => {
        Project.findAll({
            include: [Sector],
            where: {
                '$Sector.sector_name$': {
                    [Sequelize.Op.iLike]: `%${sector}%`
                }
            }
        })
        .then(projects => {
            if (projects.length > 0) {
                resolve(projects);
            } else {
                reject("Unable to find requested projects");
            }
        })
        .catch(err => {
            reject(err);
        });
    });
}

function addProject(projectData) {
    return new Promise((resolve, reject) => {
        Project.create(projectData)
        .then(() => {
            resolve();
        })
        .catch(err => {
            reject(err.errors[0].message);
        });
    });
}

function getAllSectors() {
    return Sector.findAll();
}

function editProject(id, projectData) {
    return new Promise((resolve, reject) => {
        Project.update(projectData, {
            where: { id: id }
        })
        .then(() => {
            resolve();
        })
        .catch(err => {
            reject(err.errors[0].message);
        });
    });
}

function deleteProject(id) {
    return new Promise((resolve, reject) => {
        Project.destroy({
            where: { id: id }
        })
        .then(() => {
            resolve();
        })
        .catch(err => {
            reject(err.errors[0].message);
        });
    });
}

module.exports = { 
    initialize, 
    getAllProjects, 
    getProjectById, 
    getProjectsBySector,
    addProject,
    getAllSectors,
    editProject,
    deleteProject
};

