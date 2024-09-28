const textarea = document.getElementById("text-zone");
const div = document.getElementById("text-zone-div");
const btn_send = document.getElementById("envoie-btn");
const messageContainer = document.getElementById("msg-discu");
const innnn = document.getElementById("msg222");

const btn_deco = document.getElementById("deco");

const userList = document.getElementById("liste-chat");
const btn_open_user_liste = document.getElementById("userList");
const btn_close_user_liste = document.getElementById("closeUserListe");

textarea.addEventListener("input", () => {
  const ligne = textarea.value.split("\n").length;
  if (ligne <= 5) {
    //augmente le nombre de ligne avec les retour a la ligne de l'utilisateur
    textarea.rows = ligne + 1;
    //augmente
    div.style.height = ligne * 3 + ligne + 5 + "%";
    btn_send.style.marginTop = ligne + 1 + "%";
  } else {
    div.style.height = "20%";
    btn_send.style.marginTop = "8%";
  }
});

const sendMessage = () => {
  let msgContain = textarea.value;
  if (msgContain == "") return;

  let newMsg = document.createElement("div");
  newMsg.classList.add("evoyer");
  newMsg.innerHTML = `<p>${msgContain}</p>`;

  messageContainer.appendChild(newMsg);
  messageContainer.scrollTop = messageContainer.scrollHeight;
  div.style.height = "10%";
  textarea.value = "";
  innnn.value = msgContain;
};

const openUserListe = () => {
  userList.classList.add("active");
};

const closeUserListe = () => {
  userList.classList.remove("active");
};

const deconnection = () => {
  window.location.href = "../connexion";
};

btn_send.addEventListener("click", sendMessage);

btn_deco.addEventListener("click", deconnection);

if (btn_open_user_liste) {
btn_open_user_liste.addEventListener("click", openUserListe);
}
if (btn_close_user_liste) {
  btn_close_user_liste.addEventListener("click", closeUserListe);
}


window.addEventListener("load", function (event) {
  messageContainer.scrollTop = messageContainer.scrollHeight;
});
// Optionnel : Permettre l'envoi avec la touche "Entrée" et de
// Gérer l'événement keydown pour le textarea
textarea.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    if (event.ctrlKey) {
      // Si Ctrl + Entrée est pressé, insérer un retour à la ligne
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      // Insérer un retour à la ligne
      textarea.value =
        textarea.value.substring(0, start) +
        "\n" +
        textarea.value.substring(end);
      // Réinitialiser la position du curseur
      textarea.selectionStart = textarea.selectionEnd = start + 1;
      event.preventDefault(); // Empêche l'envoi du message
    } else {
      // Si Entrée est pressé sans Ctrl, envoyer le message
      // Si Entrée est pressé sans Ctrl, soumettre le formulaire
      const form = textarea.closest("form");
      sendMessage();
      if (form) {
        form.submit(); // Soumet le formulaire
      }
      event.preventDefault(); // Empêche le comportement par défaut de la touche Entrée dans les champs de texte
    }
  }
});
