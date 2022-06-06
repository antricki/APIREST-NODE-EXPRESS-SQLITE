// Create express app
var express = require("express")
var app = express()
// Conexión a la base de datos
var db = require("./database.js")
var md5= require('md5')
var bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
// HTTPS
const fs = require('fs');
const https = require('https');
const { restart } = require("nodemon");
// Puerto HTTPS
const PORT = 8443;
const clau = 'hola'
const cookieparser = require("cookie-parser")
app.use(cookieparser())

https.createServer({
    key: fs.readFileSync('my_cert.key'),
    cert: fs.readFileSync('my_cert.crt')
  }, app).listen(PORT, function(){
    console.log("Servidor HTTPS Antonio escoltant a l'adreça https://localhost:%PORT%".replace("%PORT%",PORT))
  });
  app.get("/", (req, res, next) => {
    res.json({"message":"Ok"})
 });

function generartoken (usuari) {
    return jwt.sign({
        name: usuari.name,
        email: usuari.email,
        id: usuari.id,
    }, clau, {expiresIn: '3h'});
}

function autenticarusuari(req, res, next){
    const token = req.cookies['AuthToken']
    if (token) {
        jwt.verify(token, clau, (err, user) => { // Verifiquem el token passant-li la nostra clau secreta.
            if (err) { // Si dona error, el token és invalid
                return res.sendStatus(403); 
            }
            req.user = user;
            next();
        });
    } else { // Si va per aci és perque no s'ha trobat el token o ve buida. Per tant ha de fer login
        res.json({"message":"Has de loguejar-te per accedir ací"})
        }
};
  //app.get('/', function(req, res){

//    console.log('Hello, I am foo.');
//  });
// Server port
//var HTTP_PORT = 9000 Comentamos esta linea ya que estamos accediendo por otro puerto
// Start server
//app.listen(HTTP_PORT, () => {
//    console.log("Servidor escoltant a l'adreça http://localhost:%PORT%".replace("%PORT%",HTTP_PORT))
//});
//Root endpoint



// Insert here other API endpoints
app.get("/api/users", (req, res, next) => {
    var sql = "select * from user"
    var params = []
    db.all(sql, params, (err, rows) => {
        if (err) {
          res.status(400).json({"error":err.message});
          return;
        }
        res.json({
            "message":"success",
            "data":rows
        })
      });
});

// Comrrobar per ID
app.get("/api/user/:id", (req, res, next) => {
    var sql = "select * from user where id = " + req.params.id
    db.get(sql, (err, row) => {
        if (err) {
          res.status(400).json({"error":err.message});
        }else{
            res.json({
                "message":"success",
                "data":row
            })
        }
      });
});
       
// REGISTRAR usuario 
app.post("/api/user/", (req, res, next) => {
    var errors=[]
    if (!req.body.password){
        errors.push("No password specified");
    }
    if (!req.body.email){
        errors.push("No email specified");
    }
    if (errors.length){
        res.status(400).json({"error":errors.join(",")});
        return;
    }
    var data = {
        name: req.body.name,
        email: req.body.email,
        password : md5(req.body.password)
    }
    var sql ='INSERT INTO user (name, email, password) VALUES (?,?,?)'
    var params =[data.name, data.email, data.password]
    db.run(sql, params, function (err, result) {
        if (err){
            res.status(400).json({"error": err.message})
            return;
        }
        res.json({
            "message": "success",
            "data": data,
            "id" : this.lastID
        })
    });
})

// LOGIN usuario POSTMAN
app.post("/api/autenticar/", (req, res, next) => {
   
    var sql ="SELECT email FROM user WHERE email=? AND password=?"
    db.get(sql,[req.body.email, md5(req.body.password)],(err, user) => {
        if (err) {
          res.status(400).json({"error":err.message});
        }else{
            if (user){
                const authToken = generartoken(user);
                res.cookie('AuthToken', authToken);
                res.json({
                    "message":"success"
                })
            }else{
                res.json({
                    "message":"contrasenya invàlida o no existeix l'usuari"
                })
            }  
        }
    });
})

app.get('/api/protegit', autenticarusuari, (req, res) => { // Sola poden accedir el autenticats, mentre el token siga valid
    res.json({
        "message":"Ets un usuari autenticat"
    })
});

// Actualizar usuario por ID
app.patch("/api/user/:id", (req, res, next) => {
    var data = {
        name: req.body.name,
        email: req.body.email,
        password : req.body.password ? md5(req.body.password) : null
    }
    db.run(
        `UPDATE user set 
           name = COALESCE(?,name), 
           email = COALESCE(?,email), 
           password = COALESCE(?,password) 
           WHERE id = ?`,
        [data.name, data.email, data.password, req.params.id],
        function (err, result) {
            if (err){
                res.status(400).json({"error": res.message})
                return;
            }
            res.json({
                message: "success",
                data: data,
                changes: this.changes
            })
    });
})

//Eliminación de usuarios
app.delete("/api/user/:id", (req, res, next) => {
    db.run(
        'DELETE FROM user WHERE id = ?',
        req.params.id,
        function (err, result) {
            if (err){
                res.status(400).json({"error": res.message})
                return;
            }
            res.json({"message":"deleted", changes: this.changes})
    });
})

// Default response for any other request
app.use(function (req, res) {
    res.status(404).json({ "error": "Invalid endpoint" });
});