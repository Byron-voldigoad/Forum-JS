const fs = require("fs");
const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const session = require("express-session");
const http = require("http");
const socketIo = require('socket.io'); // Utilisation de socket.io pour la communication en temps réel
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server); // Initialisation de socket.io pour gérer les connexions en temps réel

// Configuration de la connexion à MySQL
const db = mysql.createConnection({
  host: "localhost",
  user: "root", // Remplacer par votre nom d'utilisateur MySQL
  password: "", // Remplacer par votre mot de passe MySQL
  database: "forum", // Remplacer par le nom de votre base de données
  // Si vous utilisez SSL pour une base de données distante, vous pouvez activer cette option :
  // ssl: {
  //   ca: fs.readFileSync('chemin/vers/votre/ca.pem')
  // }
});

// Connexion à la base de données
db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log("Connecté à la base de données MySQL");
});

// Middleware
app.set("view engine", "ejs"); // Utilisation de EJS comme moteur de rendu pour les vues
app.use(bodyParser.urlencoded({ extended: true })); // Parser les données des formulaires
app.use(express.static("public")); // Servir des fichiers statiques (CSS, images, etc.)

// Middleware de session
app.use(
  session({
    secret: "votre_clé_secrète", // Remplacer par une clé secrète pour les sessions
    resave: false, // Ne pas réenregistrer la session si elle n'est pas modifiée
    saveUninitialized: true, // Sauvegarder une session même si elle n'est pas initialisée
    cookie: { secure: false }, // 'false' pour HTTP, 'true' pour HTTPS en production
  })
);

// Middleware global pour initialiser des variables
app.use((req, res, next) => {
  res.locals.message = ""; // Initialiser le message d'erreur à vide
  next();
});

// Socket.io - Gestion des connexions en temps réel
io.on("connection", (socket) => {
  console.log("Un utilisateur est connecté");

  socket.on("disconnect", () => {
    console.log("Un utilisateur s'est déconnecté");
  });
});

// Routes
app.get("/", (req, res) => {
  res.render("login"); // Page de connexion par défaut
});

// Route pour afficher le formulaire de connexion
app.get("/connexion", (req, res) => {
  res.render("connexion"); // Affiche la page de connexion
});

// Gestion de la connexion de l'utilisateur
app.post("/connexion", (req, res) => {
  const { email, pwd } = req.body;
  const query = "SELECT * FROM utilisateurs WHERE email = ? AND pwd = ?";

  db.query(query, [email, pwd], (err, results) => {
    if (err) {
      console.log("Erreur lors de la connexion :", err);
      return res.render("connexion", { message: "Erreur lors de la connexion." });
    }

    if (results.length > 0) {
      // Utilisateur trouvé
      const utilisateur = results[0];
      // Stocker les informations de l'utilisateur dans la session
      req.session.user = {
        id: utilisateur.id_utilisateur,
        nom: utilisateur.nom_utilisateur,
        prenom: utilisateur.prenom_utilisateur,
        email: utilisateur.Email,
      };
      res.redirect("/utilisateurs"); // Rediriger vers la page des utilisateurs
    } else {
      // Utilisateur non trouvé
      res.render("connexion", { message: "Email ou mot de passe incorrect." });
    }
  });
});

// Route pour afficher les utilisateurs et les messages
app.get("/utilisateurs", (req, res) => {
  // Vérification de l'authentification
  if (!req.session.user) {
    return res.redirect("/connexion"); // Rediriger vers la page de connexion si non connecté
  }
  const query = "SELECT * FROM utilisateurs";
  db.query(query, (err, utilisateurs) => {
    if (err) {
      return res.status(500).send("Erreur lors de la récupération des utilisateurs.");
    }

    // Récupération des messages
    const messageQuery = "SELECT * FROM users_message";
    db.query(messageQuery, (err, messages) => {
      if (err) {
        return res.status(500).send("Erreur lors de la récupération des messages.");
      }
      // Affichage des utilisateurs et des messages
      res.render("index", { utilisateurs, user: req.session.user, messages });
    });
  });
});

// Route pour soumettre un message
app.post("/utilisateur", (req, res) => {
  const { id_emeteur, msg } = req.body;

  if (!id_emeteur || !msg) {
    return res.status(400).json({ error: "Données manquantes" });
  }

  // Récupération des informations de l'utilisateur émetteur
  const queryUser = "SELECT * FROM utilisateurs WHERE id_utilisateur = ?";
  db.query(queryUser, [id_emeteur], (err, results) => {
    if (err || results.length === 0) {
      console.log("Erreur lors de la récupération de l'utilisateur :", err);
      return res.status(500).json({ error: "Erreur lors de la récupération de l'utilisateur." });
    }

    const { nom_utilisateur, prenom_utilisateur } = results[0];

    // Insertion du message dans la base de données
    const queryMessage = "INSERT INTO message (id_emeteur, msg) VALUES (?, ?)";
    db.query(queryMessage, [id_emeteur, msg], (err) => {
      if (err) {
        console.log("Erreur lors de l'insertion du message :", err);
        return res.status(500).json({ error: "Erreur lors de l'insertion du message." });
      }

      // Diffusion du message à tous les utilisateurs connectés
      io.emit("nouveauMessage", { id_emeteur, nom_utilisateur, prenom_utilisateur, msg });

      // Redirection après l'envoi du message
      res.redirect("/utilisateurs");
    });
  });
});

// Route pour la soumission du formulaire d'inscription
app.post("/submit", (req, res) => {
  const { nom, prenom, pwd1, pwd2, email } = req.body;
  let errorMessage = "Erreur lors de la soumission du formulaire.";

  // Validation des mots de passe
  if (!pwd1 || pwd1.length <= 3) {
    errorMessage += " Votre mot de passe doit contenir au moins 4 caractères.";
    return res.render("login", { message: errorMessage });
  }

  if (pwd1 !== pwd2) {
    errorMessage += " Les deux mots de passe sont différents.";
    return res.render("login", { message: errorMessage });
  }

  // Insertion de l'utilisateur dans la base de données
  const query = "INSERT INTO utilisateurs (nom_utilisateur, prenom_utilisateur, pwd, Email) VALUES (?, ?, ?, ?)";
  db.query(query, [nom, prenom, pwd1, email], (err, results) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        errorMessage += " Un utilisateur avec cet email existe déjà.";
      } else if (err.code === "ER_BAD_NULL_ERROR") {
        errorMessage += " Un ou plusieurs champs requis sont manquants.";
      } else {
        errorMessage += err.message;
      }
      return res.render("login", { message: errorMessage });
    }

    const successMessage = "Utilisateur ajouté avec succès !";
    res.render("login", { message: successMessage });
  });
});

// Démarrer le serveur
server.listen(3000, () => {
  console.log("Serveur démarré sur http://localhost:3000");
});
