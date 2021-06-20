const express = require("express"),
      expressLayouts = require("express-ejs-layouts"),
      bodyParser = require("body-parser"),
      cookieParser = require("cookie-parser"),
      session = require("express-session"),
      utils = require("./modules/utils"),
      apis = require("./modules/apis"),
      fs = require("fs"),
      app = express(),
      port = 7890;

app.set("view engine", "ejs");
app.use(expressLayouts);
app.use(express.static("public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: "PW Tema Secret",
    cookie: { expires: new Date(Date.now() + (30 * 86400 * 1000)) }
}));

app.locals.utils = utils;

//paths
app.get("/", (req, res) => {
    if(utils.checkLogged(req)){
        let db = utils.connectDB(req);

        fs.readFile("lessons/python.json", (err, result) => {
            let json = utils.parseJSON(result),
                progress = 0;

            res.render("courses", {user: req.session, list: json, progress: progress});
        });

        db.close();
    }
    else
        utils.staticPage(res, "index.html");
});

app.get("/autentificare", (req, res) => utils.generalRoute(req, res, () => res.render("autentificare"), false));
app.get("/inregistrare", (req, res) => utils.generalRoute(req, res, () => res.render("autentificare", {pageType: "register"}), false));

app.get("/forum", (req, res) => {
    if(!utils.checkLogged(req)){
        res.redirect("/");
        return;
    }
 
    let post = req.query.post,
        search = req.query.search,
        tag = req.query.language,
        db = utils.connectDB(req);

    if(typeof search !== "undefined" && typeof tag !== "undefined"){
        db.all(`SELECT *, (SELECT COUNT(Comments.comid) FROM Comments WHERE Posts.postid = Comments.postid) comCount FROM Posts 
        INNER JOIN Users ON Posts.userid = Users.userid WHERE postTitle LIKE ? AND language = ? ORDER BY postDate DESC`, ["%" + search + "%", parseInt(tag)], (err, result) => {
            res.render("forum", {languages: utils.postLanguages, user: req.session, posts: result, search: true});
        });
    }
    if(typeof search !== "undefined"){
        db.all(`SELECT *, (SELECT COUNT(Comments.comid) FROM Comments WHERE Posts.postid = Comments.postid) comCount FROM Posts 
        INNER JOIN Users ON Posts.userid = Users.userid WHERE postTitle LIKE ? ORDER BY postDate DESC`, ["%" + search + "%"], (err, result) => {
            res.render("forum", {languages: utils.postLanguages, user: req.session, posts: result, search: true});
        });
    }
    else if(typeof tag !== "undefined"){
        db.all(`SELECT *, (SELECT COUNT(Comments.comid) FROM Comments WHERE Posts.postid = Comments.postid) comCount FROM Posts 
        INNER JOIN Users ON Posts.userid = Users.userid WHERE language = ? ORDER BY postDate DESC`, [parseInt(tag)], (err, result) => {
            res.render("forum", {languages: utils.postLanguages, user: req.session, posts: result, search: true});
        });
    }
    else if(typeof post === "undefined" || post != parseInt(post)){
        db.all(`SELECT *, (SELECT COUNT(Comments.comid) FROM Comments WHERE Posts.postid = Comments.postid) comCount FROM Posts 
        INNER JOIN Users ON Posts.userid = Users.userid ORDER BY postDate DESC`, (err, result) => {
            res.render("forum", {languages: utils.postLanguages, user: req.session, posts: result});
        });
    }
    else{
        db.serialize(() => {
            let postData,
                postContent,
                stop = false;
            db.get("SELECT * FROM Posts INNER JOIN Users ON Posts.userid = Users.userid WHERE postid = ?", [parseInt(post)], (err, result) => {
                if(typeof result === "undefined"){
                    res.status(404).render("error", {code: 404});
                    stop = true;
                    return;
                }

                postData = result;
                postContent = utils.bbcodes(result.postContent);
            });

            if(stop)
                return;

            db.all("SELECT * FROM Comments INNER JOIN Users ON Comments.userid = Users.userid WHERE postid = ?", [parseInt(post)], (err, result) => {
                res.render("post", {user: req.session, post: postData, comments: result, postContent: postContent});
            });
        });
    }

    db.close();
});

app.get("/user", (req, res) => {
    if(!utils.checkLogged(req)){
        res.redirect("/");
        return;
    }

    let userid = req.query.id;

    if(typeof userid === "undefined" || userid != parseInt(userid))
        userid = req.session.userid;
    else
        userid = parseInt(userid);

    let db = utils.connectDB(req);

    db.get("SELECT * FROM Users WHERE userid = ?", [userid], (err, result) => {
        if(typeof result === "undefined"){
            res.status(404).render("error", {code: 404});
            return;
        }

        let private = false,
            selfUser = result.userid === req.session.userid;

        if(result.privateProfile && req.session.privilege == 2 && !selfUser)
            private = true;

        db.all("SELECT *, (SELECT COUNT(comid) FROM Comments WHERE Posts.postid = Comments.postid) comCount FROM Posts WHERE userid = ? ORDER BY postDate DESC", [userid], (err2, result2) => {
            res.render("user", {user: req.session, profile: result, posts: result2, private: private, selfUser: selfUser});
        });
    });

    db.close();
});

app.get("/class", (req, res) => {
    if(!utils.checkLogged(req)){
        res.redirect("/");
        return;
    }

    let db = utils.connectDB(req);
    db.close();

    utils.staticPage(res, "class.html");
});

app.get("/settings", (req, res) => {
    if(!utils.checkLogged(req)){
        res.redirect("/");
        return;
    }

    let db = utils.connectDB(req),
        settings = {};

    db.get("SELECT * FROM Users WHERE userid = ?", [req.session.userid], (err, result) => {
        if(typeof result === "undefined")
            res.status(500).render("error", {code: 500});
        else
            res.render("settings", {user: req.session, settings: result});
    });

    db.close();
});

app.get("/admin", (req, res) => {
    if(!utils.checkLogged(req) || req.session.privilege != 0){
        res.redirect("/");
        return;
    }

    let db = utils.connectDB(req);

    db.all("SELECT * FROM Users", (err, result) => {
        if(err){
            res.status(500).render("error", {code: 500});
            return;
        }

        res.render("admin", {user: req.session, users: result});
    });

    db.close();
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
});

//APIs
app.post("/api/autentificare", (req, res) => apis.autentificare(req, res));
app.post("/api/inregistrare", (req, res) => apis.inregistrare(req, res));
app.post("/api/create-post", (req, res) => apis.createPost(req, res));
app.post("/api/create-comment", (req, res) => apis.createComment(req, res));
app.post("/api/get-lesson", (req, res) => apis.getLesson(req, res));
app.post("/api/post-solution", (req, res) => apis.postSolution(req, res));
app.post("/api/delete-post", (req, res) => apis.deletePost(req, res));
app.post("/api/delete-comment", (req, res) => apis.deleteComment(req, res));
app.post("/api/change-setting", (req, res) => apis.changeSetting(req, res));
app.get("/api/get-languages", (req, res) => apis.getLanguages(req, res));
app.post("/api/delete-user", (req, res) => apis.deleteUser(req, res));

app.use((req, res) => res.status(404).render("error", {code: 404}));

app.listen(port, _ => console.log(`Serverul rulează la adresa https://localhost:${port}`));