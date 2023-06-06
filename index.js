const {
    Console
} = require("console");
const {
    ipcRenderer
} = require("electron");
const electron = require("electron");
const fs = require("fs");
const uuid = require("uuid");

const {
    app,
    BrowserWindow,
    Menu,
    ipcMain
} = electron;
let HotelsWindow;
let createWindow;
let listWindow;
let allHotels = [];
let allReservations = [];
let primaryDisplay;
let height;
let width;

//reading restaurants from DB
fs.readFile("db.json", (err, jsonHotels) => {
    if (!err) {
        const oldHotels = JSON.parse(jsonHotels);
        allHotels = oldHotels;
    }
});
fs.readFile("reservations.json", (err, jsonReservations) => {
    if (!err) {
        const oldRes = JSON.parse(jsonReservations);
        allReservations = oldRes;
    }
});
//initial window maker
app.on("ready", () => {
    // We cannot require the screen module until the app is ready.
    const {
        screen
    } = require('electron')

    // Create a window that fills the screen's available work area.
    primaryDisplay = screen.getPrimaryDisplay()
    width = primaryDisplay.workAreaSize.width;
    height = primaryDisplay.workAreaSize.height;
    HotelsWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false

        },
        height: height,
        width: width,
        title: "Table Reservation"
    });
    HotelsWindow.loadURL(`file://${__dirname}/mainScreen.html`);

    const mainMenu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(mainMenu);
});

//when mainscreen requests available hotel list
ipcMain.on("hotel:request:list", event => {
    HotelsWindow.webContents.send("hotel:response:list",
        allHotels);
});

//creating reservation window
ipcMain.on("reservation:create", (event, reservationId) => {

    createWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        width: width,
        height: height,
        title: "Create New Reservation at Hotel iD - " + reservationId
    });
    //the create IPC request brings the reservation ID, which I can send to the next window
    allHotels.forEach(hotel => {
        if (reservationId == hotel.id) {
            createWindow.webContents.send("hotel:response",
                hotel);
        }
    });


    const mainMenu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(mainMenu);
    createWindow.loadURL(`file://${__dirname}/newReservation.html`);
    createWindow.on("closed", () => (createWindow = null));
});

//When booking the reservation
ipcMain.on("reservation:save", (event, reservation) => {
    reservation["id"] = uuid();
    allReservations.push(reservation);
    saveReservation(reservation);
    HotelsWindow.reload();

});
const saveReservation = (reservation) => {

    const jsonAppointments = JSON.stringify(allReservations);
    fs.writeFileSync("reservations.json", jsonAppointments);

    allHotels.forEach(hotel => {
        if (hotel.id == reservation.Hotel_Id) {
            hotel.availableTables = hotel.availableTables - 1;

        }
    })
    const dbJson = JSON.stringify(allHotels);
    fs.writeFileSync("db.json", dbJson);
    createWindow.close();
    createWindow = null;
};


//creating all reservations window
const listWindowCreator = () => {

    listWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        title: "All Reservations"
    });

    listWindow.setMenu(null);
    listWindow.loadURL(`file://${__dirname}/list.html`);
    listWindow.on("closed", () => (listWindow = null));
    const mainMenu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(mainMenu);

};
//requesting a list of all reservations from DB
ipcMain.on("reservations:request:list", event => {
    listWindow.webContents.send("reservations:response:list",
        allReservations);
});
//marking reservation as done
ipcMain.on("reservation:done", (event, id, Hotel_Id) => {
    allHotels.forEach(hotel => {
        if (hotel.id == Hotel_Id) {
            hotel.availableTables = hotel.availableTables + 1;

        }
    })
    const dbJson = JSON.stringify(allHotels);
    fs.writeFileSync("db.json", dbJson);
    allReservations.forEach(reservation => {
        if (reservation.id === id) allReservations.splice(allReservations.indexOf(reservation), 1);
    });
    const jsonAppointments = JSON.stringify(allReservations);
    fs.writeFileSync("reservations.json", jsonAppointments);
    listWindow.reload();
    HotelsWindow.reload();
});


//global menu template
const menuTemplate = [{
        label: "File",
        submenu: [{
                label: "All Reservations",
                click() {
                    listWindowCreator();
                }
            },
            {
                label: "Quit",
                accelerator: process.platform === "darwin" ? "Command+Q" : "Ctrl+Q",
                click() {
                    app.quit();
                }
            }
        ]
    },
    {
        label: "View",
        submenu: [{
            role: "reload"
        }, {
            role: "toggledevtools"
        }]
    }
];