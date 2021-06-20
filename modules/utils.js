const fs = require("fs"),
    sqlite = require("sqlite3"),
    crypto = require("crypto");

const databaseName = "./database.db";

let layout;
fs.readFile("views/layout.ejs", (err, data) => {
    if(err)
        throw err;

    layout = data.toString();
});

function staticPage(res, name){
    return new Promise((resolve, reject) => {
        fs.readFile("static/" + name, (err, data) => {
            if(err)
                res.status(500).render("error", {code: 500});
            else
                res.send(layout.replace("<%- body %>", data));
        });
    });
}

function checkDB(db){
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS Users (
            userid INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            privilege INTEGER DEFAULT 2,
            privateProfile INTEGER,
            pictureURL TEXT,
            joinDate INTEGER,
            lastOnline INTEGER,
            description TEXT,
            twitterUser TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS Posts (
            postid INTEGER PRIMARY KEY AUTOINCREMENT,
            postTitle TEXT NOT NULL,
            postContent TEXT NOT NULL,
            postDate INTEGER NOT NULL,
            userid INTEGER NOT NULL,
            language INTEGER,
            FOREIGN KEY (userid) REFERENCES Users(userid)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS Comments (
            comid INTEGER PRIMARY KEY AUTOINCREMENT,
            postid INTEGER NOT NULL,
            userid INTEGER NOT NULL,
            comContent TEXT NOT NULL,
            comDate INTEGER NOT NULL,
            FOREIGN KEY (postid) REFERENCES Posts(postid),
            FOREIGN KEY (userid) REFERENCES Users(userid)
        )`);

        db.run("INSERT INTO Users (userid, username, password, privateProfile, privilege) VALUES (1, 'king', '" + encryptPassword("kingadmin") + "', 1, 0)", err => {});
        db.run("INSERT INTO Users (userid, username, password, privilege) VALUES (2, 'moderator', '" + encryptPassword("123456") + "', 1)", err => {});
        db.run("INSERT INTO Users (userid, username, password) VALUES (3, 'user', '" + encryptPassword("123456") + "')", err => {});
    });
}

function connectDB(req){
    let db = new sqlite.Database(databaseName);

    checkDB(db);

    if(typeof req !== "undefined" && checkLogged(req)){
        db.run("UPDATE Users SET lastOnline = ? WHERE userid = ?", [getDate(), req.session.userid]);
    }

    return db;
}

function encryptPassword(pass){
    let hash = crypto.createHash("sha256").update(pass).digest("hex");
    return hash;
}

function checkLogged(req){
    return "username" in req.session;
}

const postLanguages = {
    0: ["General", "general"],
    1: ["Python", "python"],
    2: ["JavaScript", "javascript"],
    3: ["C/C++", "cplusplus"]
};

function generalRoute(req, res, callback, needsToBeLogged = true){
    if(checkLogged(req) !== needsToBeLogged)
        res.redirect("/");
    else if(typeof callback === "function")
        callback();
}

function escapeHTML(text){
    return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function profilePicture(obj){
    if(typeof obj === "string" && obj != "")
        return "<img src=\"" + escapeHTML(obj) + "\" alt=\"Imagine de profil\">";
    else
        return '<svg viewBox="0 0 28 28"><path d="M14 0c7.734 0 14 6.266 14 14 0 7.688-6.234 14-14 14-7.75 0-14-6.297-14-14 0-7.734 6.266-14 14-14zM23.672 21.109c1.453-2 2.328-4.453 2.328-7.109 0-6.609-5.391-12-12-12s-12 5.391-12 12c0 2.656 0.875 5.109 2.328 7.109 0.562-2.797 1.922-5.109 4.781-5.109 1.266 1.234 2.984 2 4.891 2s3.625-0.766 4.891-2c2.859 0 4.219 2.312 4.781 5.109zM20 11c0-3.313-2.688-6-6-6s-6 2.688-6 6 2.688 6 6 6 6-2.688 6-6z"></path></svg>';
}

function getDate(){
    //returns unix timestamp in seconds
    return parseInt(Date.now() / 1000);
}

function getTimePassed(date, online = false){
    let current = getDate(),
        difference = current - date;
    
    let minutes = 60,
        hours = minutes * 60,
        days = hours * 24,
        months = days * 30,
        years = days * 365,
        now = "acum ";

    if(online === true && difference < 60 * 2) // 2 minutes
        return true;
    
    if(difference < 60){
        return now + "mai puțin de 1 minut";
    }
    else if(difference < hours){
        let dif = parseInt(difference / minutes);
        return now + dif + (dif == 1 ? " minut" : " minute");
    }
    else if(difference < days){
        let dif = parseInt(difference / hours);
        return now + dif + (dif == 1 ? " oră" : " ore");
    }
    else if(difference < months){
        let dif = parseInt(difference / days);
        return now + dif + (dif == 1 ? " zi" : " zile");
    }
    else if(difference < years){
        let dif = parseInt(difference / months);
        return now + dif + (dif == 1 ? " lună" : " luni");
    }
    else{
        let dif = parseInt(difference / years);
        return now + dif + (dif == 1 ? " an" : " ani"); 
    }
}

function getRandomString(length = 10){
    return Array(length).fill(0).map(x => Math.random().toString(36).charAt(2)).join('');
}

function parseJSON(json){
    try{
        json = JSON.parse(json);
        return json;
    }
    catch{
        return null;
    }
}

function checkURL(value){
    let url;

    try{
        url = new URL(value);
    }
    catch{
        return false;
    }

    return url.protocol === "http:" || url.protocol === "https:";
}

function bbcodes(value){
    let text = value.replace(/\$/g, "$="),
        codes = [],
        pattern = /\[.*?\]/g,
        matches;

    while(matches = text.match(pattern)){
        let repl = "$!" + codes.length + ";";
        codes.push(matches[0].replace("$=", "$"));
        text = text.replace(matches[0], repl);
    }

    for(let i = 0; i < codes.length; i++){
        let current = codes[i].replace(/\[|\]/g, "").split("=");

        if(current.length != 2)
            continue;

        if(current[0] == "caption"){
            codes[i] = '<center><span class="small">' + escapeHTML(current[1]) + '</span></center>';
        }
        else if(current[0] == "big"){
            codes[i] = '<span class="big">' + escapeHTML(current[1]) + '</span>';
        }
        else if(current[0] == "img"){
            codes[i] = '<center><img class="img" src="' + escapeHTML(current[1]) + '" alt="Imagine utilizator"></center>';
        }
        else if(current[0] == "youtube"){
            codes[i] = '<center><iframe class="youtube" width="560" height="315" src="https://www.youtube.com/embed/' + escapeHTML(current[1]) + '" frameborder="0" allowfullscreen></iframe></center>';
        }
    }

    text = escapeHTML(text);

    for(let i = 0; i < codes.length; i++){
        let repl = "$!" + i + ";";
        text = text.replace(repl, codes[i])
    }

    text = text.replace(/\$\=/g, "$");

    return text;
}

const collection = {
    staticPage: staticPage,
    connectDB: connectDB,
    encryptPassword: encryptPassword,
    checkLogged: checkLogged,
    postLanguages: postLanguages,
    generalRoute: generalRoute,
    escapeHTML: escapeHTML,
    profilePicture: profilePicture,
    getDate: getDate,
    getTimePassed: getTimePassed,
    getRandomString: getRandomString,
    parseJSON: parseJSON,
    checkURL: checkURL,
    bbcodes: bbcodes
};

module.exports = collection;