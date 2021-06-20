const utils = require("./utils"),
    spawn_process = require("child_process").spawn,
    fs = require("fs");

const errorCodes = {
    1: {status: 400, message: "Parameteri incorecți."},
    2: {status: 400, message: "Utilizator sau parolă greșită."},
    3: {status: 403, message: "Utilizatorul există deja, folosește alt nume."},
    4: {status: 500, message: "Eroare necunoscută."},
    5: {status: 403, message: "Deja logat."},
    6: {status: 403, message: "Nelogat."},
    7: {status: 403, message: "Conținut inexistent."},
    8: {status: 403, message: "Nu aveți dreptul de a șterge acest conținut."}
};

const inputConstants = {
    TITLE_MIN: 4,
    TITLE_MAX: 60,
    POST_MIN: 6,
    POST_MAX: 200,
    COMMENT_MIN: 6,
    COMMENT_MAX: 200,
    USERNAME_MIN: 4,
    USERNAME_MAX: 15,
    PASSWORD_MIN: 6,
    PASSWORD_MAX: 30
};

function checkLoginParams(user, pass){
    if(
        typeof user !== "string" || 
        typeof pass !== "string" || 
        user.length < inputConstants.USERNAME_MIN || 
        user.length > inputConstants.USERNAME_MAX || 
        !((new RegExp("^[A-Za-z0-9]+$")).test(user)) ||
        pass.length < inputConstants.PASSWORD_MIN || 
        pass.length > inputConstants.PASSWORD_MAX
    )
        return false;

    return true;
}

function APIError(res, code, redirect){
    let index = code in errorCodes ? code : 4,
        obj = {error: index, message: errorCodes[index].message};

    if(typeof redirect !== "undefined")
        obj.redirect = redirect;

    res.setHeader("Content-Type", "application/json");
    res.status(errorCodes[index].status).end(JSON.stringify(obj));
}

function APISuccess(message, redirect){
    let obj = {
        success: true
    };

    if(typeof message !== "undefined")
        obj.message = message;

    if(typeof redirect !== "undefined")
        obj.redirect = redirect;

    return JSON.stringify(obj);
}

function autentificare(req, res){
    if(!checkLoginParams(req.body.username, req.body.password)){
        APIError(res, 1);
        return;
    }
    else if(utils.checkLogged(req)){
        APIError(res, 5);
        return;
    }

    let db = utils.connectDB();

    db.get("SELECT * FROM Users WHERE username = ?", [req.body.username], (err, result) => {
        if(
            typeof result !== "undefined" && 
            result.username === req.body.username && 
            result.password === utils.encryptPassword(req.body.password)
        ){
            req.session.userid = result.userid;
            req.session.username = result.username;
            req.session.pictureURL = result.pictureURL;
            req.session.privilege = result.privilege;
            res.end(APISuccess(undefined, "/"));
        }
        else
            APIError(res, 2);
    });

    db.close();
}

function inregistrare(req, res){
    if(
        !checkLoginParams(req.body.username, req.body.password) || 
        !("confirm-password" in req.body) || 
        req.body.password !== req.body["confirm-password"]
    ){
        APIError(res, 1);
        return;
    }
    else if(utils.checkLogged(req)){
        APIError(res, 5);
        return;
    }

    let db = utils.connectDB();

    db.get("SELECT * FROM Users WHERE username = ?", [req.body.username], (err, result) => {
        if(typeof result === "undefined"){
            let time = utils.getDate();
            db.run("INSERT INTO Users (username, password, joinDate) VALUES (?, ?, ?)", [req.body.username, utils.encryptPassword(req.body.password), time], err2 => {
                if(err2){
                    console.log(err2);
                    APIError(res, 4);
                    return;
                }

                res.end(APISuccess(undefined, "/"));
            });
        }
        else
            APIError(res, 3);
    });

    db.close();
}

function createPost(req, res){
    let title = req.body.title,
        content = req.body.content,
        language = req.body.language;

    if(
        typeof title !== "string" || 
        typeof content !== "string" || 
        typeof language !== "number" || 
        title.length < inputConstants.TITLE_MIN || 
        title.length > inputConstants.TITLE_MAX || 
        content.length < inputConstants.POST_MIN || 
        content.length > inputConstants.POST_MAX || 
        !(language in utils.postLanguages)
    ){
        APIError(res, 1);
        return;
    }
    else if(!utils.checkLogged(req)){
        APIError(res, 6);
        return;
    }

    let db = utils.connectDB();

    let postArray = [title, content, utils.getDate(), req.session.userid, language];

    db.run("INSERT INTO Posts (postTitle, postContent, postDate, userid, language) VALUES (?, ?, ?, ?, ?)", postArray, err => {
        db.get("SELECT last_insert_rowid() last", (err2, result) => {
            if(err || err2){
                console.log(err, err2);
                APIError(res, 4);
                return;
            }

            res.end(APISuccess(undefined, "/forum?post=" + result.last));
        });
    });

    db.close();
}

function createComment(req, res){
    let content = req.body.content,
        postid = req.body.postid;

    if(
        typeof content !== "string" || 
        content.length < inputConstants.COMMENT_MIN || 
        content.length > inputConstants.COMMENT_MAX ||
        postid != parseInt(postid)
    ){
        APIError(res, 1);
        return
    }
    else if(!utils.checkLogged(req)){
        APIError(res, 6);
        return;
    }

    let db = utils.connectDB();
    postid = parseInt(postid);

    db.get("SELECT * FROM Posts WHERE postid = ?", [postid], (err, result) => {
        if(typeof result === "undefined"){
            APIError(res, 7);
            return;
        }
        else{
            let comArray = [postid, req.session.userid, content, utils.getDate()];
            db.run("INSERT INTO Comments (postid, userid, comContent, comDate) VALUES (?, ?, ?, ?)", comArray, err2 => {
                if(err || err2){
                    console.log(err, err2);
                    APIError(res, 4);
                    return;
                }

                db.get("SELECT last_insert_rowid() last", (err3, result) => {
                    if("last" in result)
                        res.end(APISuccess(undefined, "/forum?post=" + postid + "#Comment_" + result.last));
                    else
                        res.end(APISuccess());
                });
            });
        }
    });

    db.close();
}

function getLesson(req, res){
    if(!utils.checkLogged(req)){
        APIError(res, 6);
        return;
    }

    let lessonNo = req.body.lesson,
        response = {};

    if(typeof lessonNo === "undefined"){
        APIError(res, 1);
        return;
    }

    fs.readFile("lessons/python.json", (err, data) => {
        if(err){
            APIError(res, 4);
            return;
        }

        data = utils.parseJSON(data);
        lessonNo = parseInt(lessonNo) - 1;

        if(lessonNo < 0 || lessonNo >= data.length)
            lessonNo = 0;
        
        fs.readFile(data[lessonNo].guide, (err, data2) => {
            if(err){
                APIError(res, 4);
                return;
            }

            response.guide = data2.toString();
            response.currentLesson = lessonNo + 1;
            response.success = true;

            if(lessonNo == data.length - 1)
                response.last = true;
            else
                response.nextLesson = lessonNo + 2;

            res.end(JSON.stringify(response));
        })
    });
}

function processKillRoutine(process, file_path, req){
    process.kill();
    fs.unlink(file_path, err => {});
    req.session.activeOperation = false;
    req.session.save();

    return true;
}

function postSolution(req, res){
    if(!utils.checkLogged(req)){
        APIError(res, 6);
        return;
    }

    if("activeOperation" in req.session && req.session.activeOperation == true){
        APIError(res);
        return;
    }

    console.log(req.session)
    
    if(!("code" in req.body) || !("lesson" in req.body)){
        APIError(res, 1);
        return;
    }

    res.header("transfer-encoding", "chunked");
    res.set("Content-Type", "text/json");
    res.writeHead(200);

    let random = utils.getRandomString(),
        random2 = utils.getRandomString(20),
        filename = "pyscript" + random;
        path = "compiler/",
        complete = path + filename + ".py";

    if(!fs.existsSync(path)){
        fs.mkdirSync(path);
    }

    fs.readFile("lessons/python.json", (err2, data) => {
        if(err2){
            res.end();
            console.log(err2);
            return;
        }

        let lessons = JSON.parse(data),
            currentLesson = parseInt(req.body.lesson) - 1;

        if(currentLesson < 0 || currentLesson >= lessons.length)
            currentLesson = 0;

        let py = fs.readFileSync("lessons/template.py", {encoding: "utf-8"}),
            code = req.body.code;

        code = code.replace(/__globals__/g, "").replace(/__subclasses__/g, "");
        py = py.replace(/%rand%/g, random2).replace(/%list%/g, JSON.stringify(lessons[currentLesson].modules));
        py = py.replace("%code%", code);

        fs.writeFile(complete, py, err => {
            if(err){
                if(!res.finished)
                    res.end();
                
                console.log(err);
                return;
            }
    
            req.session.activeOperation = true;
            req.session.save();
    
            const process = spawn_process("python3", ["-B", "-u", path + "env_run.py", filename]);
            let hadError = false;
            
            res.write("__start__");
    
            let processTimeout = setTimeout(() => {
                hadError = processKillRoutine(process, complete, req);
                res.end("\n<span class=\"error\">Timeout</span>");
            }, 10000); // 10 sec
    
            process.stdout.on("data", data => {
                data = data.toString();
                data = utils.escapeHTML(data);
                res.write(data);
            });
    
            process.stderr.on("data", data => {
                hadError = true;
                data = data.toString();
                data = utils.escapeHTML(data);
                res.write("<span class=\"error\">" + data + "</span>");
            });
    
            req.on("close", err => {
                clearTimeout(processTimeout);
                hadError = processKillRoutine(process, complete, req);
            });
    
            process.on("close", code => {
                req.session.activeOperation = false;
                req.session.save();
                clearTimeout(processTimeout);
                fs.unlink(complete, err => {});
                res.end();
            });
        });
    });
}

function deletePost(req, res){
    if(!utils.checkLogged(req)){
        APIError(res, 6);
        return;
    }

    if(!("id" in req.body)){
        APIError(res, 1);
        return;
    }

    let id = parseInt(req.body.id),
        db = utils.connectDB();

    db.get("SELECT * FROM Posts WHERE postid = ?", [id], (err, result) => {
        if(err || typeof result === "undefined"){
            APIError(res, 7);
            return;
        }

        if(result.userid != req.session.userid && req.session.privilege == 2){
            APIError(res, 8);
            return;
        }

        db.run("DELETE FROM Comments WHERE postid = ?", [id], err => {});

        db.run("DELETE FROM Posts WHERE postid = ?", [id], err => {
            if(err){
                console.error(err);
                APIError(res);
                return;
            }

            res.end(APISuccess("Postare ștearsă cu succes.", "/forum"));
            
        });
    });

    db.close();
}

function deleteComment(req, res){
    if(!utils.checkLogged(req)){
        APIError(res, 6);
        return;
    }

    if(!("id" in req.body)){
        APIError(res, 1);
        return;
    }

    let id = parseInt(req.body.id),
        db = utils.connectDB();

    db.get("SELECT * FROM Comments WHERE comid = ?", [id], (err, result) => {
        if(err || typeof result === "undefined"){
            APIError(res, 7);
            return;
        }

        if(result.userid != req.session.userid && req.session.privilege == 2){
            APIError(res, 8);
            return;
        }

        db.run("DELETE FROM Comments WHERE comid = ?", [id], err => {
            if(err){
                APIError(res);
                return;
            }

            res.end(APISuccess("Comentariu șters cu succes.", "/forum?post=" + result.postid));
        });
    });
    
    db.close();
}

function setSetting(req, res, db, column, value, message){
    db.run("UPDATE Users SET " + column + " = ? WHERE userid = ?", [value, req.session.userid], err => {
        if(err){
            APIError(res);
            return;
        }

        res.end(APISuccess(message));
    });
}

function changeSetting(req, res){
    if(!utils.checkLogged(req)){
        APIError(res, 6);
        return;
    }

    if(!("type" in req.body) || !("value" in req.body)){
        APIError(res, 1);
        return;
    }

    let type = req.body.type,
        value = req.body.value,
        db = utils.connectDB();

    if(type == "username"){

        if(!checkLoginParams(value, "parola XD")){
            APIError(res, 1);
            return;
        }
        
        db.get("SELECT * FROM Users WHERE username = ?", [value], (err, result) => {
            if(typeof result !== "undefined"){
                APIError(res, 3);
                return;
            }

            req.session.username = value;
            setSetting(req, res, db, "username", value, "Nume de utilizator schimbat cu succes");
        });

    }
    else if(type == "password"){
        if(!checkLoginParams("usernameXD", value)){
            APIError(res, 1);
            return;
        }

        let hashed = utils.encryptPassword(value);

        setSetting(req, res, db, "password", hashed, "Parolă schimbată cu succes");
    }
    else if(type == "privateProfile"){
        if(value != "on" && value != "off"){
            APIError(res, 1);
            return;
        }

        let actual = null;

        if(value == "on")
            actual = 1;

        setSetting(req, res, db, "privateProfile", actual, "Starea profilului schimbată cu succes");
    }
    else if(type == "description"){
        if(value.length > 100){
            APIError(res, 1);
            return;
        }

        setSetting(req, res, db, "description", value, "Descriere schimbată cu succes");
    }
    else if(type == "pictureURL"){
        if(value.length != 0 && (value.length > 100 || !utils.checkURL(value))){
            APIError(res, 1);
            return;
        }

        req.session.pictureURL = value;
        setSetting(req, res, db, "pictureURL", value, "Imagine de profil schimbată cu succes");
    }
    else if(type == "twitterURL"){
        if(value.length != 0 && !((new RegExp("^@?([a-zA-Z0-9]{1,15})$")).test(value))){
            APIError(res, 1);
            return;
        }

        value = value.replace("@", "");

        setSetting(req, res, db, "twitterUser", value, "Username twitter schimbat cu succes");
    }
    else{
        APIError(res, 1);
        return;
    }

    db.close();
}

function getLanguages(req, res){
    if(!utils.checkLogged(req)){
        APIError(res, 6);
        return;
    }

    res.end(JSON.stringify({success: true, languages: utils.postLanguages}));
}

function deleteUser(req, res){
    if(!utils.checkLogged(req)){
        APIError(res, 6);
        return;
    }

    if(!("id" in req.body)){
        APIError(res, 1);
        return;
    }

    if(req.session.privilege != 0){
        APIError(res, 8);
        return;
    }

    let db = utils.connectDB(),
        id = parseInt(req.body.id);

    db.get("SELECT * FROM Users WHERE userid = ?", [id], (err, result) => {
        if(typeof result === "undefined"){
            APIError(res, 7);
            return;
        }

        if(result.privilege === 0){
            APIError(res, 8);
            return;
        }

        db.serialize(() => {
            db.each("SELECT * FROM Posts WHERE userid = ?", [id], (res, result) => {
                db.run("DELETE FROM Comments WHERE postid = ?", [result.postid], err => {});
                db.run("DELETE FROM Posts WHERE postid = ?", [result.postid], err => {});
            })
        
            db.run("DELETE FROM Comments WHERE userid = ?", [id], err => {});
            db.run("DELETE FROM Users WHERE userid = ?", [id], err => {});
    
            db.close();

            res.end(APISuccess("Utilizator șters cu succes.", "/admin"));
        });
    });

}

const collection = {
    autentificare: autentificare,
    inregistrare: inregistrare,
    createPost: createPost,
    createComment: createComment,
    getLesson: getLesson,
    postSolution: postSolution,
    deletePost: deletePost,
    deleteComment: deleteComment,
    changeSetting: changeSetting,
    getLanguages: getLanguages,
    deleteUser: deleteUser
};

module.exports = collection;