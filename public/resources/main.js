let notification = null,
    notificationTimeout = null;

function closeNotification(){
    if(!notification)
        return;

    if(notificationTimeout){
        clearTimeout(notificationTimeout);
        notificationTimeout = null;
    }

    notification.classList.remove("show");
    setTimeout(() => {
        document.body.removeChild(notification);
        notification = null;
    }, 300);
}

function showNotification(message, alert = false){
    if(notification)
        return;

    notification = document.createElement("div");
    notification.className = "--notification";
    notification.innerText = message;

    if(alert)
        notification.innerHTML = '<svg viewBox="0 0 24 24"><path d="M11.148 4.374c0.073-0.123 0.185-0.242 0.334-0.332 0.236-0.143 0.506-0.178 0.756-0.116s0.474 0.216 0.614 0.448l8.466 14.133c0.070 0.12 0.119 0.268 0.128 0.434-0.015 0.368-0.119 0.591-0.283 0.759-0.18 0.184-0.427 0.298-0.693 0.301l-16.937-0.001c-0.152-0.001-0.321-0.041-0.481-0.134-0.239-0.138-0.399-0.359-0.466-0.607s-0.038-0.519 0.092-0.745zM9.432 3.346l-8.47 14.14c-0.422 0.731-0.506 1.55-0.308 2.29s0.68 1.408 1.398 1.822c0.464 0.268 0.976 0.4 1.475 0.402h16.943c0.839-0.009 1.587-0.354 2.123-0.902s0.864-1.303 0.855-2.131c-0.006-0.536-0.153-1.044-0.406-1.474l-8.474-14.147c-0.432-0.713-1.11-1.181-1.854-1.363s-1.561-0.081-2.269 0.349c-0.429 0.26-0.775 0.615-1.012 1.014zM11 9v4c0 0.552 0.448 1 1 1s1-0.448 1-1v-4c0-0.552-0.448-1-1-1s-1 0.448-1 1zM12 18c0.552 0 1-0.448 1-1s-0.448-1-1-1-1 0.448-1 1 0.448 1 1 1z"></path></svg>' + notification.innerHTML;

    notification.addEventListener("click", closeNotification);
    notificationTimeout = setTimeout(() => {
        closeNotification();
    }, 5000);

    document.body.appendChild(notification);
    setTimeout(() => {
        notification.classList.add("show");
    }, 50);
}

function ajax(url, method, data, json = false){
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open(method, url, true);

        if(json)
            xhr.setRequestHeader("Content-Type", "application/json");

        xhr.onreadystatechange = function(){
            if(xhr.readyState == 4 && xhr.status >= 200 && xhr.status < 300){
                let response = xhr.responseText;

                if(json)
                    response = JSON.parse(response);    

                resolve(response, xhr.status);
            }
            else if(xhr.readyState == 4){
                let response = xhr.responseText;

                if(json)
                    response = JSON.parse(response);    

                reject(response, xhr.status);
            }
        }

        if(typeof data === "undefined")
            xhr.send();
        else
            xhr.send(data);
    });
}

let dialog = null,
    dialogOverlay;

function openDialog(content){
    if(dialog)
        return;

    let dialogContent = document.createElement("div");
    dialogContent.className = "content";
    dialogContent.appendChild(content);
    dialog = document.createElement("div");
    dialogOverlay = document.createElement("div");
    dialog.appendChild(dialogContent);
    dialog.className = "--dialog";
    dialogOverlay.className = "--dialog-overlay";

    dialogOverlay.addEventListener("click", closeDialog);

    document.body.appendChild(dialog);
    document.body.appendChild(dialogOverlay);
}

function closeDialog(){
    if(!dialog)
        return;

    document.body.removeChild(dialog);
    document.body.removeChild(dialogOverlay);
    dialog = null;
    dialogContent = null;
}

function checkUsername(value){
    if(!((new RegExp("^[A-Za-z0-9]+$")).test(value))){
        showNotification("Numele de utilizator poate să conțină doar litere și cifre", true);
        return false;
    }
    else if(value.length < 4 || value.length > 15){
        showNotification("Numele de utilizator trebuie să fie între 6 și 30 de caractere", true);
        return false;
    }
    
    return true;
}

function checkPassword(value){
    if(value.length < 6 || value.length > 30){
        showNotification("Parola trebuie să fie între 6 și 30 de caractere", true);
        return false;
    }

    return true;
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

function forumCreatePost(){
    let title = document.querySelector(".forum--create input").value,
        content = document.querySelector(".forum--create textarea").value,
        language = document.querySelector(".forum--create select").value;
    
    if(title == "" && content == "")
        return;
    else if(title.length < 4 || title.length > 60){
        showNotification("Titlul trebuie să fie între 4 și 60 de caractere.", true);
        return;
    }
    else if(content.length < 6 || content.length > 200){
        showNotification("Conținutul trebuie să fie între 6 și 200 de caractere", true);
        return;
    }

    let data = JSON.stringify({title: title, content: content, language: parseInt(language)});

    ajax("/api/create-post", "POST", data, true).then(response => {
        if("redirect" in response)
            location.href = response.redirect;
        else
            showNotification("Postare creata!");
    }).catch(response => {
        if("message" in response)
            showNotification(response.message, true);
    });
}

function forumCreateComment(){
    let content = document.querySelector(".comment--create textarea").value,
        postid = document.querySelector(".comment--create textarea").getAttribute("data-post");

    if(content == "" || postid == null || postid == "" || postid != parseInt(postid))
        return;
    else if(content.length < 6 || content.length > 200){
        showNotification("Conținutul trebuie să fie între 6 și 200 de caractere", true);
        return;
    }

    let data = JSON.stringify({content: content, postid: postid});

    ajax("/api/create-comment", "POST", data, true).then(response => {
        if("redirect" in response){
            location.href = response.redirect;
            location.reload();
        }
        else
            showNotification("Comentariu creat!");
        
        document.querySelector(".comment--create textarea").value = "";
    }).catch(response => {
        if("message" in response)
            showNotification(response.message, true);
    });
}

function forumTextareaInput(e){
    let target = e.target;
    target.style.height = "5px";
    target.style.height = target.scrollHeight + "px";
}

function forumSelectTag(e){
    let target = e.target;

    while(true){
        if(target == e.currentTarget)
            return;
        else if(target.getAttribute("data-language") || target.getAttribute("data-language-clear")){
            let elements = e.currentTarget.querySelectorAll("div[data-language]");
            for(let i = 0; i < elements.length; i++)
                elements[i].classList.remove("selected");
            
            if(!target.getAttribute("data-language-clear"))
                target.classList.add("selected");

            return;
        }
        else
            target = target.parentNode;
    }
}

function forumGetLimbaje(element){
    ajax("/api/get-languages", "GET", null, true).then(response => {
        let languages = response.languages;

        for(let i in languages){
            let div = document.createElement("div");
            div.setAttribute("data-language", i);
            div.classList.add(languages[i][1]);
            div.innerHTML = languages[i][0];
            element.appendChild(div);

            if(parseInt(getQuery("language")) == parseInt(i))
                div.classList.add("selected");
        }

        let clear = document.createElement("div");
        clear.setAttribute("data-language-clear", "true");
        clear.innerHTML = "Clear";
        element.appendChild(clear);
    }).catch(response => {
        showNotification("A apărut o eroare", true);
    });

    element.addEventListener("click", forumSelectTag);
}

function forumSearchEvent(e){
    let target = e.target,
        value = target.value,
        rows = target.parentNode.parentNode.querySelectorAll(".rows div"),
        language = null,
        queries = [];

    for(let i = 0; i < rows.length; i++)
        if(rows[i].getAttribute("data-language") && rows[i].classList.contains("selected"))
            language = rows[i].getAttribute("data-language");

    if(e.key == "Enter"){
        if(value.length == 0 && language == null)
            return;

        if(value.length != 0)
            queries.push("search=" + encodeURIComponent(value));
        
        if(language != null)
            queries.push("language=" + encodeURIComponent(language));

        location.href = "/forum?" + queries.join("&");
    }
}

function forumSearchDialog(){
    let content = document.createElement("div"),
        searchBar = getQuery("search") || "";

    content.className = "forum--search--module";
    content.innerHTML = `
        <div class="input">
            <svg viewBox="0 0 24 24"><path d="M16.041 15.856c-0.034 0.026-0.067 0.055-0.099 0.087s-0.060 0.064-0.087 0.099c-1.258 1.213-2.969 1.958-4.855 1.958-1.933 0-3.682-0.782-4.95-2.050s-2.050-3.017-2.050-4.95 0.782-3.682 2.050-4.95 3.017-2.050 4.95-2.050 3.682 0.782 4.95 2.050 2.050 3.017 2.050 4.95c0 1.886-0.745 3.597-1.959 4.856zM21.707 20.293l-3.675-3.675c1.231-1.54 1.968-3.493 1.968-5.618 0-2.485-1.008-4.736-2.636-6.364s-3.879-2.636-6.364-2.636-4.736 1.008-6.364 2.636-2.636 3.879-2.636 6.364 1.008 4.736 2.636 6.364 3.879 2.636 6.364 2.636c2.125 0 4.078-0.737 5.618-1.968l3.675 3.675c0.391 0.391 1.024 0.391 1.414 0s0.391-1.024 0-1.414z"></path></svg>
            <input type="text" placeholder="Introduceți termenul dorit..." value="${searchBar}">
        </div>
        <div class="list">
            <p>... și selectare după limbaj</p>
            <div class="rows"></div>
        </div>
    `;

    content.querySelector("input").addEventListener("keyup", forumSearchEvent);
    forumGetLimbaje(content.querySelector(".rows"));
    openDialog(content);
}

function forumRulesDialog(){
    let content = document.createElement("div");
    content.className = "forum--rules--module";
    content.innerHTML = `
        <ul>
            <li>fără discuții politice</li>
            <li>în rest liber la orice</li>
        </ul>
    `;
    openDialog(content);
}

function forumFormatDialog(){
    let content = document.createElement("div");
    content.className = "forum--format--module";
    content.innerHTML = `
        <p>Poți folosi aceste tag-uri pentru a formata textul din postările pe care le creezi astfel:</p>
        <ul>
            <li><b>[caption=Exemplu]</b> - pentru a introduce un text de mărime mică ce va semnifica o legendă</li>
            <li><b>[big=Exemplu]</b> - va afișa un text de mărime mare, ce va reprezenta un subtitlu</li>
            <li><b>[img=URL]</b> - va afișa o imagine, se introduce URL-ul imaginii</li>
            <li><b>[youtube=videoID]</b> - va afișa un videolip YouTube, se introduce DOAR ID-ul videoclipului</li>
        </ul>
    `;
    openDialog(content);
}

function forumPage(){
    let createPostButton = document.querySelector(".forum--create button"),
        createPostTextarea = document.querySelector(".forum--create textarea"),
        searchButton = document.querySelector(".forum--side .search"),
        rulesButton = document.querySelector(".forum--side .rules"),
        formatButton = document.querySelector(".forum--side .format");
    
    if(createPostButton)
        createPostButton.addEventListener("click", forumCreatePost);
    if(createPostTextarea)
        createPostTextarea.addEventListener("input", forumTextareaInput);

    searchButton.addEventListener("click", forumSearchDialog);
    rulesButton.addEventListener("click", forumRulesDialog);
    formatButton.addEventListener("click", forumFormatDialog);
}

function forumDeleteElement(e){
    let target = e.target;

    while(true){
        if(target == e.currentTarget)
            return;
        else if(target.getAttribute("data-post-delete") || target.getAttribute("data-comment-delete"))
            break;
        else
            target = target.parentNode;
    }

    let post = target.getAttribute("data-post-delete"),
        comment = target.getAttribute("data-comment-delete");
    
    if(post && parseInt(post) == post){
        ajax("/api/delete-post", "POST", JSON.stringify({id: post}), true).then(response => {
            if(response.redirect)
                location.href = response.redirect;
            else if(response.message)
                showNotification(response.message);
        }).catch(response => {
            if(response.message)
                showNotification(response.message, true);
        });
    }
    else if(comment && parseInt(comment) == comment){
        ajax("/api/delete-comment", "POST", JSON.stringify({id: comment}), true).then(response => {
            console.log(response);
            if(response.redirect)
                location.href = response.redirect;
            else if(response.message)
                showNotification(response.message);
        }).catch(response => {
            if(response.message)
                showNotification(response.message, true);
        });
    }

}

function postPage(){
    let createCommentButton = document.querySelector(".comment--create button"),
        createCommentTextarea = document.querySelector(".comment--create textarea");

    if(createCommentButton)
        createCommentButton.addEventListener("click", forumCreateComment);
    if(createCommentTextarea)
        createCommentTextarea.addEventListener("input", forumTextareaInput);

    document.querySelector("main").addEventListener("click", forumDeleteElement);

    setTimeout(() => {
        if(location.hash != ""){
            let element = document.querySelector(location.hash);
            if(element)
                element.scrollIntoView();
        }
    }, 100);
}

let classTextareaElement,
    classRunButton,
    classLineCounter,
    classOutputElement;

function getClassTextarea(){
    return document.querySelector(".class--editor textarea");
}

function classClipboard(){
    let textarea = getClassTextarea(),
        tempTextarea = document.createElement("textarea");

    if(textarea.value.length == 0)
        return;

    tempTextarea.value = textarea.value;
    tempTextarea.style = "height:1px;width:1px;position:absolute;top:-999px;";
    document.body.appendChild(tempTextarea);
    tempTextarea.select();
    document.execCommand("copy");
    document.body.removeChild(tempTextarea);
    showNotification("Cod copiat în clipboard");
}

function classDownload(){
    let textarea = getClassTextarea();

    if(textarea.value.length == 0)
        return;

    let link = document.createElement("a"),
        file = new File([textarea.value], {type: "application/octet-stream"}),
        url = URL.createObjectURL(file);

    link.href = url;
    link.download = "cod.py";
    link.click();

    URL.revokeObjectURL(url);
    showNotification("Fișier descărcat.");
}

function classInsertTab(textarea){
    let start = textarea.selectionStart,
        end = textarea.selectionEnd,
        value = textarea.value,
        indent = "    ";

    textarea.value = value.substring(0, start) + indent + value.substring(end, value.length);
    textarea.selectionEnd = start + indent.length;
}

let classLastLineCount = -1;

function classTextareaValue(e){
    let target = e.target,
        lines = target.value.split("\n").length;

    if(target.value.length == 0)
        classRunButton.classList.add("disabled");
    else
        classRunButton.classList.remove("disabled");

    if(lines !== classLastLineCount){
        let text = "";

        for(let i = 0; i < lines; i++)
            text += i + 1 + "<br>";

        classLineCounter.innerHTML = text;
        classLastLineCount = lines;
    }
}

function classTextareaScroll(e){
    classLineCounter.style.top = "-" + e.target.scrollTop + "px";
}

function classKeyEvent(e){
    if(e.ctrlKey && e.code == "KeyS"){
        e.preventDefault();
    }

    if(e.code == "Tab"){
        e.preventDefault();
        if(classTextareaElement == document.activeElement){
            classInsertTab(classTextareaElement);
        }
    }
}

function classProcessOutput(output){
    output = output
    .replaceAll("\n", "<br>")
    .replaceAll("\t", "&nbsp;&nbsp;&nbsp;&nbsp;")
    .replace("__start__", "");

    classOutputElement.innerHTML = output;
}

let classCodeRunning = false;

function classRunCodeEvent(){
    if(classTextareaElement.value.length == 0 || classCodeRunning)
        return;

    classRunButton.classList.add("disabled");
    classCodeRunning = true;

    let data = JSON.stringify({code: classTextareaElement.value, lesson: classCurrentLesson});
    let request = new XMLHttpRequest();

    request.open("POST", "/api/post-solution", true);
    request.setRequestHeader("Content-Type", "application/json");
    request.onreadystatechange = function(){
        if(request.readyState == 3 || request.readyState == 4)
            classProcessOutput(request.responseText);

        if(request.readyState == 4){
            classRunButton.classList.remove("disabled");
            classCodeRunning = false;
        }
    }
    request.send(data);
}

function getQuery(name){
    let url = location.search.replace("?", ""),
        params = url.split("&");

    for(let i = 0; i < params.length; i++){
        params[i] = params[i].split("=");

        if(typeof name === "string" && params[i][0] == name && typeof params[i][1] !== "undefined")
            return params[i][1];
    }
}

let classCurrentLesson = null;

function classGetCurrentLesson(){
    let instructions = document.querySelector(".class--instructions"),
        nextButton = document.querySelector("header .navigation .next"),
        lesson = getQuery("lesson"),
        json = {};

    if(typeof lesson === "string")
        json.lesson = lesson;

    json = JSON.stringify(json);

    ajax("/api/get-lesson", "POST", json, true).then((response) => {
        if("guide" in response)
            instructions.innerHTML = response.guide;

        if("last" in response)
            nextButton.classList.add("disabled");
        else if("nextLesson" in response)
            nextButton.addEventListener("click", () => {
                location.href = "/class?lang=python&lesson=" + response.nextLesson;
            });
        
        if("currentLesson" in response)
            classCurrentLesson = response.currentLesson;
    }).catch((response) => {
        showNotification("A apărut o problemă la încărcarea corectă a paginii. Reîncărcare...", true);
        setTimeout(() => {
            location.href = "/class";
        }, 3000);
    });
}

function classPage(){
    let clipboard = document.querySelector("header .controls .clipboard"),
        download = document.querySelector("header .controls .download");

    classTextareaElement = getClassTextarea();
    classRunButton = document.querySelector("header .controls .run");
    classLineCounter = document.querySelector(".class--editor .line--counter");
    classOutputElement = document.querySelector(".class--output");

    clipboard.addEventListener("click", classClipboard);
    download.addEventListener("click", classDownload);
    document.addEventListener("keydown", classKeyEvent);
    classTextareaElement.addEventListener("input", classTextareaValue);
    classTextareaElement.addEventListener("scroll", classTextareaScroll);
    classTextareaValue({target: classTextareaElement});
    classRunButton.addEventListener("click", classRunCodeEvent);

    classGetCurrentLesson();
}

let loginPageType;

function loginSubmit(e){
    e.preventDefault();

    let inputs = document.querySelectorAll("input[name]"),
        submitObj = {},
        target = e.target;

    for(let i = 0; i < inputs.length; i++)
        submitObj[inputs[i].getAttribute("name")] = inputs[i].value;
    
    if(!checkUsername(inputs[0].value) || !checkPassword(inputs[1].value)){
        return;
    }
    else if(loginPageType === "register" && inputs[1].value !== inputs[2].value){
        showNotification("Cele două parole introduse nu se potrivesc", true);
        return;
    }

    submitObj = JSON.stringify(submitObj);

    ajax(target.action, target.method, submitObj, true).then(response => {
        if(response.redirect)
            location.href = response.redirect;
        else if(response.message)
            showNotification(response.message);
    }).catch(response => {
        if(response.message)
            showNotification(response.message, true);
    });
}

function authPage(){
    if(~location.href.indexOf("autentificare"))
        loginPageType = "login";
    else if(~location.href.indexOf("inregistrare"))
        loginPageType = "register";

    let form = document.querySelector(".login--page form");
    form.addEventListener("submit", loginSubmit);
}

function settingsSend(data){
    ajax("/api/change-setting", "POST", data, true).then(response => {
        if(response.redirect)
            location.href = response.redirect;
        else if(response.message)
            showNotification(response.message);
    }).catch(response => {
        if(response.message)
            showNotification(response.message, true);
    });
}

function settingsChangeUsername(e){
    let target = e.target,
        value = target.value;

    if(e.key == "Enter"){
        if(!checkUsername(value))
            return;

        let obj = JSON.stringify({type: "username", value: value});
        settingsSend(obj);
    }
}

function settingsChangePassword(){
    let password = document.querySelector("[name=password]"),
        password1 = document.querySelector("[name=password1]");

    if(!checkPassword(password.value))
        return;
    else if(password.value != password1.value){
        showNotification("Cele două parole introduse nu se potrivesc", true);
        return;
    }

    let obj = JSON.stringify({type: "password", value: password.value});
    settingsSend(obj);
}

function settingsChangePrivate(e){
    let target = e.currentTarget,
        obj = {type: "privateProfile", value: "on"};

    if(target.classList.contains("on")){
        obj.value = "off";
        target.classList.remove("on");
    }
    else
        target.classList.add("on");

    obj = JSON.stringify(obj);
    settingsSend(obj);
}

function settingsChangeDescription(){
    let target = document.querySelector("[name=description]"),
        value = target.value;

    if(value.length != 0 && value.length > 100){
        showNotification("Descrierea trebuie să fie de maxim 100 de caractere", true);
        return;
    }

    let obj = JSON.stringify({type: "description", value: value});
    settingsSend(obj);
}

function settingsChangePicture(e){
    let target = e.target,
        value = target.value;

    if(e.key == "Enter"){
        if(value.length != 0 && !checkURL(value)){
            showNotification("Introduceți un URL valid", true);    
            return;
        }

        let obj = JSON.stringify({type: "pictureURL", value: value});
        settingsSend(obj);
    }
}

function settingsChangeTwitter(e){
    let target = e.target,
        value = target.value;

    if(e.key == "Enter"){
        if(value.length != 0 && !((new RegExp("^@?([a-zA-Z0-9]{1,15})$")).test(value))){
            showNotification("Introduceți un nume de utilizator valid", true);
            return;
        }

        let obj = JSON.stringify({type: "twitterURL", value: value});
        settingsSend(obj);
    }
}

function settingsPage(){
    let username = document.querySelector("[name=username]"),
        passwordButton = document.querySelector("#change_pass"),
        privateSwitch = document.querySelector("#private"),
        description = document.querySelector("#change_desc"),
        pictureURL = document.querySelector("[name=pictureURL]"),
        twitterURL = document.querySelector("[name=twitter]");

    username.addEventListener("keyup", settingsChangeUsername);
    passwordButton.addEventListener("click", settingsChangePassword);
    privateSwitch.addEventListener("click", settingsChangePrivate);
    description.addEventListener("click", settingsChangeDescription);
    pictureURL.addEventListener("keyup", settingsChangePicture);
    twitterURL.addEventListener("keyup", settingsChangeTwitter);
}

function adminDeleteUser(id){
    let json = JSON.stringify({id: parseInt(id)});

    ajax("/api/delete-user", "POST", json, true).then(response => {
        if(response.redirect)
            location.href = response.redirect;
        else if(response.message)
            showNotification(repsonse.message);
    }).catch(response => {
        if(response.message)
            showNotification(response.message, true);
    });
}

function adminDeleteDialog(id){
    let content = document.createElement("div"),
        buttonOK = document.createElement("button"),
        buttonCancel = document.createElement("button"),
        para = document.createElement("p");

    content.className = "admin--delete--module";

    para.innerHTML = "Sigur doriți să ștergeți utilizatorul cu id-ul " + parseInt(id) + "?";
    buttonOK.className = "ok";
    buttonOK.innerHTML = "Sunt sigur";
    buttonCancel.innerHTML = "Anulează";

    buttonOK.addEventListener("click", () => {
        adminDeleteUser(id);
        closeDialog();
    });
    buttonCancel.addEventListener("click", closeDialog);
    
    content.appendChild(para);
    content.appendChild(buttonOK);
    content.appendChild(buttonCancel);

    openDialog(content);
}

function adminDeleteEvent(e){
    let target = e.target;

    while(true){
        if(target == e.currentTarget)
            return;
        else if(target.getAttribute("data-delete-user")){
            e.preventDefault();
            adminDeleteDialog(target.getAttribute("data-delete-user"));
            return;
        }
        else
            target = target.parentNode;
    }
}

function adminPage(){
    let list = document.querySelector(".list");

    list.addEventListener("click", adminDeleteEvent);
}

function dom(){

}

function load(){
    let body = document.body;

    if(body.classList.contains("forum--page"))
        forumPage();
    else if(body.classList.contains("post--page"))
        postPage();
    else if(body.classList.contains("class--page"))
        classPage();
    else if(body.classList.contains("login--page"))
        authPage();
    else if(body.classList.contains("settings--page"))
        settingsPage();
    else if(body.classList.contains("admin--page"))
        adminPage();
}

document.addEventListener("DOMContentLoaded", dom);
window.addEventListener("load", load);