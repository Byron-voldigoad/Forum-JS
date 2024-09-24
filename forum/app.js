// app.js
const fs = require('fs'); // Importer le module fs pour lire les fichiers
const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const session = require("express-session");
const app = express();
require('dotenv').config();

// // Configuration de la connexion à MySQL
// const db = mysql.createConnection({
//   host: "localhost",
//   user: "root", // Remplacez par votre nom d'utilisateur MySQL
//   password: "", // Remplacez par votre mot de passe MySQL
//   database: "forum", // Remplacez par le nom de votre base de données
// });




// Créer une connexion à la base de données MySQL a DBeaver-aiven
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT,
  ssl: { 
    ca: fs.readFileSync('C:/Users/RAY/Downloads/ca.pem')
  }
});

// Connexion à la base de données
db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log("Connecté à la base de données MySQL");
});




// Middleware
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Routes
app.get("/", (req, res) => {
  res.render("login");
});






// Middleware pour définir des variables globales
app.use((req, res, next) => {
  res.locals.message = ""; // Initialisez avec une valeur vide
  next();
});

// Route pour afficher le formulaire de connexion
app.get('/connexion', (req, res) => {
  res.render('connexion'); // Rend la page de connexion
});



// Configuration du middleware de session
app.use(session({
  secret: process.env.DB_PASSWORD, // Remplacez par une clé secrète unique
  resave: false, // Ne pas réenregistrer la session si elle n'est pas modifiée
  saveUninitialized: true, // Sauvegarder une session même si elle n'est pas initialisée
  cookie: { secure: false } // 'false' pour HTTP (dev), 'true' pour HTTPS en production
}));

// Route pour afficher les utilisateurs
app.get("/utilisateurs", (req, res) => {
   // Vérifier si l'utilisateur est connecté
   if (!req.session.user) {
    return res.redirect("/connexion"); // Rediriger vers la page de connexion si non connecté
  }
  const query = "SELECT * FROM utilisateurs";

  db.query(query, (err, utilisateurs) => {
    if (err) {
      return res.status(500).send("Erreur lors de la récupération des utilisateurs.");
    }

    // Récupérer tous les messages
    const messageQuery = "SELECT * FROM message";
    db.query(messageQuery, (err, messages) => {
      if (err) {
        return res.status(500).send("Erreur lors de la récupération des messages.");
      }
      // Passez les utilisateurs et les messages à la vue
      res.render("index", { utilisateurs,user: req.session.user, messages });
    });
  });
});

app.post("/utilisateur", (req, res) => {
  const { id_emeteur, msg } = req.body;
  console.log(req.body); // Vérifiez les données reçues
  if (!id_emeteur || !msg) {
    console.log(req.body); // Vérifiez les données reçues
  }

  const query = "INSERT INTO message (id_emeteur, msg) VALUES (?, ?)";
  db.query(query, [id_emeteur, msg], (err, results) => {
    if (err) {
      console.log("Erreur lors de l'insertion dans la base de données :", err);
      return res.status(500).json({ error: "Erreur lors de l'insertion dans la base de données." });
    }

    console.log("Insertion réussie");
  });
});

// app.get("/utilisateurs", (req, res) => {
//   // Vérifier si l'utilisateur est connecté
//   if (!req.session.user) {
//     return res.redirect("/connexion"); // Rediriger vers la page de connexion si non connecté
//   }

//   // Récupérer tous les utilisateurs
//   db.query("SELECT * FROM utilisateurs", (err, utilisateurs) => {
//     if (err) {
//       console.log("Erreur lors de la récupération des utilisateurs :", err);
//       return res.render("index", { message: "Erreur lors de la récupération des utilisateurs." });
//     }

//     // Rendre la page avec la liste des utilisateurs
//     res.render("index", { utilisateurs, user: req.session.user }); // Passer les données à la vue
//   });
// });

// Gérer la connexion
app.post("/connexion", (req, res) => {
  const { email, pwd } = req.body;
  const query = "SELECT * FROM utilisateurs WHERE email = ? AND pwd = ?";

  db.query(query, [email, pwd], (err, results) => {
    if (err) {
      console.log("Erreur :", err);
      return res.render("connexion", { message: "Erreur lors de la connexion." });
    }

    if (results.length > 0) {
      // Utilisateur trouvé
      const utilisateur = results[0];
      
      // Stocker les informations de l'utilisateur dans la session
      req.session.user = {
        id: utilisateur.id_utilisateur, // Remplacez par la colonne correspondant à l'ID de l'utilisateur
        nom: utilisateur.nom_utilisateur,
        prenom: utilisateur.prenom_utilisateur,
        email: utilisateur.Email
      };

      res.redirect("/utilisateurs");
      // Récupérer tous les utilisateurs avant de rediriger vers la page des utilisateurs
      // db.query("SELECT * FROM utilisateurs", (err, utilisateurs) => {
      //   if (err) {
      //     console.log("Erreur lors de la récupération des utilisateurs :", err);
      //     return res.render("index", { message: "Erreur lors de la récupération des utilisateurs." });
      //   }

      //   // Rendre la page avec la liste des utilisateurs
      //   res.render("index", { utilisateurs, user: req.session.user }); // Passer les données à la vue
        
      // });
      
    } else {
      // Utilisateur non trouvé
      res.render("connexion", { message: "Email ou mot de passe incorrect." });
    }
  });
});

// Route pour traiter la soumission du formulaire
app.post("/submit", (req, res) => {
  const { nom, prenom, pwd1,pwd2, email } = req.body;
  let errorMessage = "Erreur lors de la soumission du formulaire.";
  //verification du pwd
  if(!pwd1 || pwd1.length  <= 3 ){
    errorMessage += "Votre mot de passe doit contenir au moins 4 caracteres"
    return res.render("login", { message: errorMessage });
  }

  if(pwd1 !== pwd2){
    errorMessage += "Les deux mot de passe sont different"
    return res.render("login", { message: errorMessage });
  }
    const query = "INSERT INTO utilisateurs (nom_utilisateur, prenom_utilisateur, pwd, Email) VALUES (?, ?, ?, ?)";
 
    db.query(query, [nom, prenom, pwd1, email], (err, results) => {
      if (err) {
        
        
        if (err.code === 'ER_DUP_ENTRY') {
          errorMessage += " Un utilisateur avec cet email existe déjà.";
        } else if (err.code === 'ER_BAD_NULL_ERROR') {
          errorMessage += " Un ou plusieurs champs requis sont manquants.";
        } else {
          errorMessage += err.message;
        }
        const url = "/login";
        // Passer le message d'erreur à la vue
        return res.render("login", { message: errorMessage });
      }
  
      const successMessage = "Utilisateur ajouté avec succès !";
      
      // Passer le message de succès à la vue
      res.render("login", { message: successMessage });
    });
 
});







// Démarrer le serveur
app.listen(3000, () => {
  console.log("Serveur démarré sur http://localhost:3000");

});