// Importações do Firebase (usando os mesmos links CDN do seu firebase.js)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// Configuração do Firebase (mesma configuração do seu firebase.js)
const firebaseConfig = {
    apiKey: "AIzaSyCfldHP45hJ5E2QjLEdAykMpU8xXhsE6c4",
    authDomain: "ficha-investigador.firebaseapp.com",
    projectId: "ficha-investigador",
    storageBucket: "ficha-investigador.firebasestorage.app",
    messagingSenderId: "95176340074",
    appId: "1:95176340074:web:1141312cfdc0217d525013",
    measurementId: "G-WPW58L9BRB"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Elementos do DOM
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessageDiv = document.getElementById('errorMessage');
const registerLink = document.querySelector('.register-link a'); // Seleciona o link de registro

// Função para exibir mensagens de erro
function displayError(message) {
    errorMessageDiv.textContent = message;
    errorMessageDiv.style.display = 'block';
}

// Função para limpar mensagens de erro
function clearError() {
    errorMessageDiv.textContent = '';
    errorMessageDiv.style.display = 'none';
}

// Função para criar personagem após login bem-sucedido
function createCharacter() {
    // Adapte aqui: pode ser abrir modal, redirecionar, ou lógica própria
    window.location.href = "create.html"; // Exemplo
}

// Event Listener para o formulário de login
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Previne o comportamento padrão do formulário
        clearError();

        const email = emailInput.value;
        const password = passwordInput.value;

        if (!email || !password) {
            displayError("Por favor, preencha o email e a senha.");
            return;
        }

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            // Login bem-sucedido
            console.log("Usuário logado:", userCredential.user);
            createCharacter(); // Chama a função de criação de personagem ao invés de redirecionar
        } catch (error) {
            console.error("Erro no login:", error);
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                displayError("Email ou senha inválidos.");
            } else if (error.code === 'auth/invalid-email') {
                displayError("Formato de email inválido.");
            }
            else {
                displayError("Ocorreu um erro ao tentar fazer login. Tente novamente.");
            }
        }
    });
}

// Event Listener para o link de registro
if (registerLink) {
    registerLink.addEventListener('click', async (e) => {
        e.preventDefault(); // Previne a navegação padrão do link
        clearError();

        const email = emailInput.value;
        const password = passwordInput.value;

        if (!email || !password) {
            displayError("Por favor, preencha o email e a senha para se registrar.");
            return;
        }
        if (password.length < 6) {
            displayError("A senha deve ter pelo menos 6 caracteres.");
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            // Registro bem-sucedido
            console.log("Usuário registrado:", userCredential.user);
            // Após o registro, o usuário já está logado. Redireciona para a página principal.
            // A ficha será criada/carregada pelo firebase.js em index.html
            window.location.href = "create.html";
        } catch (error) {
            console.error("Erro no registro:", error);
            if (error.code === 'auth/email-already-in-use') {
                displayError("Este email já está em uso. Tente fazer login ou use outro email.");
            } else if (error.code === 'auth/invalid-email') {
                displayError("Formato de email inválido.");
            } else if (error.code === 'auth/weak-password') {
                displayError("Senha muito fraca. Use uma senha mais forte.");
            } else {
                displayError("Ocorreu um erro ao tentar registrar. Tente novamente.");
            }
        }
    });
}
